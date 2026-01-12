import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const router = express.Router();

/**
 * GET /api/admin/dashboard/stats
 * Get overview statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      visibleProducts,
      totalOrders,
      pendingOrders,
      revenueResult,
      recentOrders
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: { deletedAt: null }
      }),
      
      // Active users
      prisma.user.count({
        where: { 
          deletedAt: null,
          isActive: true
        }
      }),
      
      // Total products
      prisma.product.count({
        where: { deletedAt: null }
      }),
      
      // Visible products
      prisma.product.count({
        where: { 
          deletedAt: null,
          isVisible: true
        }
      }),
      
      // Total orders
      prisma.order.count(),
      
      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      
      // Total revenue (delivered orders)
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'DELIVERED' }
      }),
      
      // Recent orders (last 10)
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        products: {
          total: totalProducts,
          visible: visibleProducts,
          hidden: totalProducts - visibleProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: totalOrders - pendingOrders
        },
        revenue: {
          total: revenueResult._sum.totalAmount || 0,
          currency: 'VND'
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thống kê dashboard' 
    });
  }
});

/**
 * GET /api/admin/dashboard/analytics
 * Get analytics data (orders, revenue by time)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7days' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [
      ordersByStatus,
      revenueByDay,
      topProducts
    ] = await Promise.all([
      // Orders grouped by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Revenue by day (simplified - just get orders)
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'DELIVERED'
        },
        select: {
          totalAmount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }),
      
      // Top selling products - get all order items to calculate actual revenue
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: startDate },
            status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] }
          }
        },
        select: {
          productId: true,
          quantity: true,
          price: true
        }
      })
    ]);

    // Aggregate top products from order items
    const productStatsMap = new Map<number, { totalSold: number; totalRevenue: number; orderCount: Set<number> }>();
    
    topProducts.forEach(item => {
      const existing = productStatsMap.get(item.productId);
      const itemRevenue = item.price * item.quantity; // price is unit price, multiply by quantity
      
      if (existing) {
        existing.totalSold += item.quantity;
        existing.totalRevenue += itemRevenue;
      } else {
        productStatsMap.set(item.productId, {
          totalSold: item.quantity,
          totalRevenue: itemRevenue,
          orderCount: new Set()
        });
      }
    });

    // Get product details
    const productIds = Array.from(productStatsMap.keys());
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, salePrice: true }
    });

    // Build top products array sorted by total sold
    const topProductsWithDetails = Array.from(productStatsMap.entries())
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          productName: product?.name || 'Unknown',
          price: product?.salePrice || product?.price || 0,
          totalSold: stats.totalSold,
          orderCount: stats.totalSold, // Use totalSold as a proxy
          totalRevenue: stats.totalRevenue
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        revenueByDay,
        topProducts: topProductsWithDetails
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy dữ liệu analytics' 
    });
  }
});

/**
 * GET /api/admin/dashboard/recent-activities
 * Get recent ADMIN system activities (không bao gồm user thông thường)
 * Chỉ lấy các hành động quan trọng: thay đổi config, quản lý user, sản phẩm, đơn hàng
 */
router.get('/recent-activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Các action quan trọng cần theo dõi từ Admin/Mod
    const importantActions = [
      // User Management
      'UPDATE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 
      'UNLOCK_USER_ACCOUNT', 'DELETE_USER', 'LOCK_USER', 'CHANGE_ROLE',
      // Product Management  
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'UPDATE_PRODUCT_PRICE', 'UPDATE_PRODUCT_STOCK',
      // Order Management
      'UPDATE_ORDER_STATUS', 'CANCEL_ORDER', 'REFUND_ORDER',
      // Category Management
      'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
      // System Config
      'UPDATE_SYSTEM_CONFIG', 'DELETE_SYSTEM_CONFIG', 'UPDATE_SETTINGS',
      // Media
      'DELETE_MEDIA',
      // Security (Critical)
      'LOGIN_FAILED', 'PASSWORD_CHANGE', 'UPDATE_PERMISSIONS'
    ];

    const activities = await prisma.auditLog.findMany({
      where: {
        OR: [
          // Lấy các action quan trọng
          { action: { in: importantActions } },
          // Hoặc bất kỳ action nào có severity WARNING/CRITICAL
          { severity: { in: ['WARNING', 'CRITICAL'] } }
        ],
        // Chỉ lấy từ Admin/Mod (có role không phải USER)
        user: {
          role: { NOT: { name: 'USER' } }
        }
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy hoạt động gần đây' 
    });
  }
});

/**
 * GET /api/admin/dashboard/live-feed
 * Get business events: đơn hàng mới, review xấu, yêu cầu quan trọng từ khách hàng
 */
router.get('/live-feed', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Lấy đơn hàng mới trong 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [recentOrders, lowRatingReviews] = await Promise.all([
      // Đơn hàng mới
      prisma.order.findMany({
        where: {
          createdAt: { gte: oneDayAgo }
        },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      }),
      
      // Review xấu (1-2 sao) trong 7 ngày
      prisma.review.findMany({
        where: {
          rating: { lte: 2 },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          product: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // Combine và sort theo thời gian
    const feed = [
      ...recentOrders.map(order => ({
        type: 'NEW_ORDER' as const,
        id: `order-${order.id}`,
        title: `Đơn hàng mới #${order.orderNumber}`,
        description: `${order.user?.name || 'Khách'} đặt đơn ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}`,
        severity: 'INFO' as const,
        createdAt: order.createdAt,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, amount: order.totalAmount }
      })),
      ...lowRatingReviews.map(review => ({
        type: 'LOW_RATING_REVIEW' as const,
        id: `review-${review.id}`,
        title: `Review ${review.rating} sao`,
        description: `${review.user?.name || 'Khách'} đánh giá "${review.product?.name}" - "${review.content?.slice(0, 50) || 'Không có nội dung'}..."`,
        severity: review.rating === 1 ? 'CRITICAL' as const : 'WARNING' as const,
        createdAt: review.createdAt,
        metadata: { reviewId: review.id, productId: review.product?.id, rating: review.rating }
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, Number(limit));

    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    console.error('Live feed error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy live feed' 
    });
  }
});

/**
 * GET /api/admin/dashboard/carts
 * Get all carts for admin tracking
 * - Default: only show carts with items (hide empty carts)
 * - Stats are calculated globally across ALL carts
 */
router.get('/carts', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Define abandoned threshold (1 hour without updates)
    const abandonedThreshold = new Date(Date.now() - 60 * 60 * 1000);

    // First, get GLOBAL stats from ALL carts (not just current page)
    const allCartsForStats = await prisma.cart.findMany({
      select: {
        id: true,
        updatedAt: true,
        lastAbandonedAt: true,
        recoveredCount: true,
        items: {
          select: {
            quantity: true,
            product: { select: { price: true, salePrice: true } },
            variant: { select: { price: true } },
          },
        },
      },
    });

    // Calculate global stats (only carts with items)
    let globalActiveCarts = 0;        // Giỏ hàng hoạt động (chưa từng bị bỏ rơi)
    let globalAbandonedCarts = 0;     // Giỏ hàng bỏ rơi (hiện tại)
    let globalAbandonedValue = 0;
    let globalRecoveredCarts = 0;     // Giỏ hàng đã phục hồi (từng bỏ rơi, nay hoạt động lại)
    let cartsWithItems = 0;

    allCartsForStats.forEach((cart) => {
      // Bỏ qua cart trống - không tính vào stats
      if (cart.items.length === 0) return;

      cartsWithItems++;
      const cartValue = cart.items.reduce((sum, item) => {
        const price = item.variant?.price || item.product.salePrice || item.product.price;
        return sum + price * item.quantity;
      }, 0);

      const isCurrentlyAbandoned = cart.updatedAt < abandonedThreshold;
      const wasEverAbandoned = cart.lastAbandonedAt !== null || cart.recoveredCount > 0;

      if (isCurrentlyAbandoned) {
        // Hiện tại đang bị bỏ rơi
        globalAbandonedCarts++;
        globalAbandonedValue += cartValue;
      } else if (wasEverAbandoned) {
        // Từng bị bỏ rơi nhưng đã quay lại → Recovered
        globalRecoveredCarts++;
      } else {
        // Chưa từng bị bỏ rơi → Active mới
        globalActiveCarts++;
      }
    });

    // Build where clause for filtering by status
    let statusWhere: Prisma.CartWhereInput = {};
    
    if (status === 'abandoned') {
      // Hiện tại đang bị bỏ rơi (>1h không hoạt động)
      statusWhere = {
        updatedAt: { lt: abandonedThreshold },
        items: { some: {} },
      };
    } else if (status === 'active') {
      // Hoạt động gần đây VÀ chưa từng bị bỏ rơi
      statusWhere = {
        updatedAt: { gte: abandonedThreshold },
        items: { some: {} },
        lastAbandonedAt: null,
        recoveredCount: 0,
      };
    } else if (status === 'recovered') {
      // Từng bị bỏ rơi nhưng đã quay lại hoạt động
      statusWhere = {
        updatedAt: { gte: abandonedThreshold },
        items: { some: {} },
        OR: [
          { lastAbandonedAt: { not: null } },
          { recoveredCount: { gt: 0 } },
        ],
      };
    } else {
      // Default: only show carts with items
      statusWhere = {
        items: { some: {} },
      };
    }

    // Get paginated carts with full data
    const [carts, total] = await Promise.all([
      prisma.cart.findMany({
        where: statusWhere,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  salePrice: true,
                  images: { take: 1, select: { url: true } },
                },
              },
              variant: {
                select: {
                  id: true,
                  size: true,
                  colorName: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      prisma.cart.count({ where: statusWhere }),
    ]);

    // Calculate cart values and determine status for display
    const cartsWithStats = carts.map((cart) => {
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = cart.items.reduce((sum, item) => {
        const price = item.variant?.price || item.product.salePrice || item.product.price;
        return sum + price * item.quantity;
      }, 0);

      // Determine status based on new logic
      let cartStatus: 'active' | 'abandoned' | 'empty' | 'recovered' = 'active';
      if (cart.items.length === 0) {
        cartStatus = 'empty';
      } else if (cart.updatedAt < abandonedThreshold) {
        cartStatus = 'abandoned';
      } else if (cart.lastAbandonedAt !== null || cart.recoveredCount > 0) {
        cartStatus = 'recovered';
      }

      return {
        id: cart.id,
        sessionId: cart.sessionId,
        user: cart.user,
        totalItems,
        totalValue,
        status: cartStatus,
        items: cart.items,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        lastAbandonedAt: cart.lastAbandonedAt,
        recoveredCount: cart.recoveredCount,
      };
    });

    res.json({
      success: true,
      data: cartsWithStats,
      stats: {
        totalCarts: cartsWithItems,
        activeCarts: globalActiveCarts,
        abandonedCarts: globalAbandonedCarts,
        abandonedValue: globalAbandonedValue,
        recoveredCarts: globalRecoveredCarts,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get carts error:', error);
    res.status(500).json({
      error: 'Lỗi khi lấy danh sách giỏ hàng',
    });
  }
});

/**
 * DELETE /api/admin/dashboard/carts/cleanup
 * Xóa tất cả cart trống (không có items) để tối ưu database
 */
router.delete('/carts/cleanup', async (req, res) => {
  try {
    // Tìm tất cả cart không có items
    const emptyCartIds = await prisma.cart.findMany({
      where: {
        items: { none: {} },
      },
      select: { id: true },
    });

    if (emptyCartIds.length === 0) {
      return res.json({
        success: true,
        message: 'Không có giỏ hàng trống cần xóa',
        deletedCount: 0,
      });
    }

    // Xóa các cart trống
    const result = await prisma.cart.deleteMany({
      where: {
        id: { in: emptyCartIds.map(c => c.id) },
      },
    });

    res.json({
      success: true,
      message: `Đã xóa ${result.count} giỏ hàng trống`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Cleanup carts error:', error);
    res.status(500).json({
      error: 'Lỗi khi dọn dẹp giỏ hàng trống',
    });
  }
});

export default router;
