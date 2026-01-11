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
      
      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _count: { productId: true },
        _sum: { quantity: true },
        orderBy: {
          _sum: { quantity: 'desc' }
        },
        take: 10
      })
    ]);

    // Get product details for top products
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true }
    });

    const topProductsWithDetails = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        price: product?.price || 0,
        totalSold: item._sum.quantity || 0,
        orderCount: item._count.productId
      };
    });

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
 * Get recent system activities
 */
router.get('/recent-activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const activities = await prisma.auditLog.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
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
 * GET /api/admin/dashboard/carts
 * Get all carts for admin tracking
 * - Default: only show carts with items (hide empty carts)
 * - Stats are calculated globally across ALL carts
 */
router.get('/carts', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, includeEmpty = 'false' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const showEmpty = includeEmpty === 'true';

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

    // Calculate global stats
    let globalActiveCarts = 0;        // Giỏ hàng hoạt động (chưa từng bị bỏ rơi)
    let globalAbandonedCarts = 0;     // Giỏ hàng bỏ rơi (hiện tại)
    let globalAbandonedValue = 0;
    let globalEmptyCarts = 0;
    let globalRecoveredCarts = 0;     // Giỏ hàng đã phục hồi (từng bỏ rơi, nay hoạt động lại)

    allCartsForStats.forEach((cart) => {
      if (cart.items.length === 0) {
        globalEmptyCarts++;
      } else {
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
    } else if (status === 'empty') {
      statusWhere = {
        items: { none: {} },
      };
    } else if (!showEmpty) {
      // Default: only show carts with items (hide empty carts)
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
        totalCarts: allCartsForStats.length,
        activeCarts: globalActiveCarts,
        abandonedCarts: globalAbandonedCarts,
        abandonedValue: globalAbandonedValue,
        emptyCarts: globalEmptyCarts,
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

export default router;
