import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

// Constants for order status filtering
// Doanh thu = Tất cả đơn hàng trừ CANCELLED và REFUNDED
const REVENUE_VALID_STATUSES = {
  notIn: ['CANCELLED', 'REFUNDED']
};

// Đơn hàng thành công (để tính conversion, top products, etc.)
const SUCCESS_ORDER_STATUSES = {
  in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
};

/**
 * GET /api/admin/analytics/overview
 * Real-time overview statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [
      todayPageViews,
      yesterdayPageViews,
      todayProductViews,
      todayOrders,
      todayRevenue,
      todayCartAdds,
      totalCarts,
      abandonedCarts,
      activeSessionsCount
    ] = await Promise.all([
      // Today's page views
      prisma.pageView.count({
        where: { createdAt: { gte: todayStart } }
      }),
      // Yesterday's page views (for comparison)
      prisma.pageView.count({
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart }
        }
      }),
      // Today's product views
      prisma.productView.count({
        where: { createdAt: { gte: todayStart } }
      }),
      // Today's orders (exclude cancelled/refunded)
      prisma.order.count({
        where: { 
          createdAt: { gte: todayStart },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      // Today's revenue (exclude cancelled/refunded)
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: todayStart },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      // Today's add to cart events
      prisma.cartEvent.count({
        where: {
          createdAt: { gte: todayStart },
          event: 'ADD_TO_CART'
        }
      }),
      // Total carts with items
      prisma.cart.count({
        where: { items: { some: {} } }
      }),
      // Abandoned carts (updated > 1 hour ago, has items)
      prisma.cart.count({
        where: {
          updatedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) },
          items: { some: {} }
        }
      }),
      // Active sessions in last 15 minutes
      prisma.pageView.groupBy({
        by: ['sessionId'],
        where: {
          createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) }
        }
      })
    ]);

    // Calculate metrics
    const trafficChange = yesterdayPageViews > 0
      ? Math.round(((todayPageViews - yesterdayPageViews) / yesterdayPageViews) * 100)
      : 0;

    const conversionRate = todayProductViews > 0
      ? Math.round((todayOrders / todayProductViews) * 10000) / 100
      : 0;

    const averageOrderValue = todayOrders > 0
      ? Math.round((todayRevenue._sum.totalAmount || 0) / todayOrders)
      : 0;

    const cartAbandonmentRate = totalCarts > 0
      ? Math.round((abandonedCarts / totalCarts) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        todayTraffic: todayPageViews,
        trafficChange,
        productViews: todayProductViews,
        conversionRate,
        todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        averageOrderValue,
        cartAbandonmentRate,
        activeUsers: activeSessionsCount.length,
        cartAddsToday: todayCartAdds
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê tổng quan' });
  }
});

/**
 * GET /api/admin/analytics/funnel
 * Sales funnel visualization data
 */
router.get('/funnel', async (req, res) => {
  try {
    const { period = '7days' } = req.query;

    // Calculate date range
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
      productViews,
      addToCartEvents,
      checkoutEvents,
      completedOrders
    ] = await Promise.all([
      // Total product views
      prisma.productView.count({
        where: { createdAt: { gte: startDate } }
      }),
      // Add to cart events
      prisma.cartEvent.count({
        where: {
          createdAt: { gte: startDate },
          event: 'ADD_TO_CART'
        }
      }),
      // Checkout started events
      prisma.cartEvent.count({
        where: {
          createdAt: { gte: startDate },
          event: { in: ['CHECKOUT_STARTED', 'CHECKOUT_INIT', 'INITIATE_CHECKOUT'] }
        }
      }),
      // Completed orders
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      })
    ]);

    // Calculate rates
    const viewToCartRate = productViews > 0 ? Math.round((addToCartEvents / productViews) * 10000) / 100 : 0;
    const cartToCheckoutRate = addToCartEvents > 0 ? Math.round((checkoutEvents / addToCartEvents) * 10000) / 100 : 0;
    const checkoutToPurchaseRate = checkoutEvents > 0 ? Math.round((completedOrders / checkoutEvents) * 10000) / 100 : 0;
    const overallConversionRate = productViews > 0 ? Math.round((completedOrders / productViews) * 10000) / 100 : 0;

    // Generate insights
    const insights: string[] = [];
    
    if (viewToCartRate < 10) {
      insights.push('⚠️ Tỉ lệ View → Cart thấp (<10%). Cân nhắc cải thiện hình ảnh sản phẩm hoặc giá cả.');
    }
    if (cartToCheckoutRate < 25 && addToCartEvents > 50) {
      insights.push('⚠️ Nhiều khách bỏ giỏ hàng. Kiểm tra phí ship hoặc đơn giản hóa thanh toán.');
    }
    if (checkoutToPurchaseRate < 50 && checkoutEvents > 20) {
      insights.push('⚠️ Tỉ lệ hoàn thành thanh toán thấp. Kiểm tra lỗi thanh toán hoặc UX checkout.');
    }
    if (overallConversionRate > 3) {
      insights.push('✅ Tỉ lệ chuyển đổi tốt! Duy trì chiến lược hiện tại.');
    }

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        funnel: {
          views: productViews,
          addToCart: addToCartEvents,
          viewToCartRate,
          checkout: checkoutEvents,
          cartToCheckoutRate,
          purchase: completedOrders,
          checkoutToPurchaseRate,
          overallConversionRate
        },
        insights
      }
    });
  } catch (error) {
    console.error('Analytics funnel error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy dữ liệu phễu chuyển đổi' });
  }
});

/**
 * GET /api/admin/analytics/size-distribution
 * Size distribution analysis for lingerie products
 */
router.get('/size-distribution', async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get order items with variant info
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      },
      select: {
        quantity: true,
        price: true,
        variant: true
      }
    });

    // Aggregate by size
    const sizeMap = new Map<string, { count: number; revenue: number }>();
    const colorMap = new Map<string, { count: number; revenue: number }>();

    orderItems.forEach(item => {
      const variantStr = item.variant as string | null;
      if (variantStr) {
        // Parse variant string (format: "Size: 34B, Color: Đỏ" or JSON)
        let size = 'Unknown';
        let color = 'Unknown';

        try {
          // Try JSON parse first
          const variantObj = JSON.parse(variantStr);
          size = variantObj.size || variantObj.Size || 'Unknown';
          color = variantObj.color || variantObj.colorName || variantObj.Color || 'Unknown';
        } catch {
          // Parse string format
          const sizeMatch = variantStr.match(/size[:\s]*([^,]+)/i);
          const colorMatch = variantStr.match(/(?:color|màu)[:\s]*([^,]+)/i);
          if (sizeMatch) size = sizeMatch[1].trim();
          if (colorMatch) color = colorMatch[1].trim();
        }

        // Aggregate size
        const sizeData = sizeMap.get(size) || { count: 0, revenue: 0 };
        sizeData.count += item.quantity;
        sizeData.revenue += item.price * item.quantity;
        sizeMap.set(size, sizeData);

        // Aggregate color
        const colorData = colorMap.get(color) || { count: 0, revenue: 0 };
        colorData.count += item.quantity;
        colorData.revenue += item.price * item.quantity;
        colorMap.set(color, colorData);
      }
    });

    // Convert to arrays and calculate percentages
    const totalSold = Array.from(sizeMap.values()).reduce((sum, d) => sum + d.count, 0);
    const totalRevenue = Array.from(sizeMap.values()).reduce((sum, d) => sum + d.revenue, 0);

    const sizes = Array.from(sizeMap.entries())
      .map(([size, data]) => ({
        size,
        count: data.count,
        percentage: totalSold > 0 ? Math.round((data.count / totalSold) * 100) : 0,
        revenue: data.revenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const colors = Array.from(colorMap.entries())
      .map(([color, data]) => ({
        color,
        count: data.count,
        percentage: totalSold > 0 ? Math.round((data.count / totalSold) * 100) : 0,
        revenue: data.revenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        period,
        totalSold,
        totalRevenue,
        sizes,
        colors,
        topSize: sizes[0]?.size || 'N/A',
        topColor: colors[0]?.color || 'N/A'
      }
    });
  } catch (error) {
    console.error('Size distribution error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy phân bố size' });
  }
});

/**
 * GET /api/admin/analytics/search-keywords
 * Top search keywords analysis
 */
router.get('/search-keywords', async (req, res) => {
  try {
    const { period = '7days', limit = 20 } = req.query;

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
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get search logs grouped by keyword
    const searchStats = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: { createdAt: { gte: startDate } },
      _count: { keyword: true },
      _avg: { results: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: Number(limit)
    });

    // Get keywords with no results (opportunities)
    const noResultKeywords = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: {
        createdAt: { gte: startDate },
        results: 0
      },
      _count: { keyword: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: 10
    });

    const topKeywords = searchStats.map(s => ({
      keyword: s.keyword,
      count: s._count.keyword,
      avgResults: Math.round(s._avg.results || 0),
      hasProducts: (s._avg.results || 0) > 0
    }));

    const opportunities = noResultKeywords.map(s => ({
      keyword: s.keyword,
      searchCount: s._count.keyword
    }));

    res.json({
      success: true,
      data: {
        period,
        topKeywords,
        opportunities,
        totalSearches: searchStats.reduce((sum, s) => sum + s._count.keyword, 0)
      }
    });
  } catch (error) {
    console.error('Search keywords error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê từ khóa' });
  }
});

/**
 * GET /api/admin/analytics/high-view-no-buy
 * Products with high views but no purchases (abandoned products)
 */
router.get('/high-view-no-buy', async (req, res) => {
  try {
    const { period = '7days', minViews = 20 } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get product views count
    const productViews = await prisma.productView.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: startDate } },
      _count: { productId: true },
      having: { productId: { _count: { gte: Number(minViews) } } },
      orderBy: { _count: { productId: 'desc' } }
    });

    const productIds = productViews.map(pv => pv.productId);

    // Get sales for these products
    const sales = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      },
      _sum: { quantity: true }
    });

    const salesMap = new Map(sales.map(s => [s.productId, s._sum.quantity || 0]));

    // Filter products with views but no/low sales
    const abandonedProductIds = productViews
      .filter(pv => (salesMap.get(pv.productId) || 0) === 0)
      .slice(0, 10)
      .map(pv => pv.productId);

    // Get product details
    const products = await prisma.product.findMany({
      where: { id: { in: abandonedProductIds } },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        images: { take: 1, select: { url: true } },
        variants: {
          where: { stock: { gt: 0 } },
          select: { size: true, stock: true }
        }
      }
    });

    const viewsMap = new Map(productViews.map(pv => [pv.productId, pv._count.productId]));

    // Analyze possible reasons
    const abandonedProducts = products.map(p => {
      const views = viewsMap.get(p.id) || 0;
      const possibleReasons: string[] = [];

      // Check if out of popular sizes
      const availableSizes = p.variants.map(v => v.size);
      const popularSizes = ['S', 'M', '34B', '36B', '34C', '36C'];
      const missingPopularSizes = popularSizes.filter(s => !availableSizes.includes(s));
      if (missingPopularSizes.length > 3) {
        possibleReasons.push('Hết size phổ biến');
      }

      // Check price
      const price = p.salePrice || p.price;
      if (price > 500000) {
        possibleReasons.push('Giá cao (>500k)');
      }

      // Default reason
      if (possibleReasons.length === 0) {
        possibleReasons.push('Cần xem xét thêm');
      }

      return {
        id: p.id,
        name: p.name,
        price: p.salePrice || p.price,
        image: p.images[0]?.url,
        views,
        sold: 0,
        availableSizes: availableSizes.slice(0, 5),
        possibleReasons
      };
    }).sort((a, b) => b.views - a.views);

    res.json({
      success: true,
      data: {
        period,
        products: abandonedProducts,
        totalAbandoned: abandonedProducts.length
      }
    });
  } catch (error) {
    console.error('High view no buy error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm bị bỏ quên' });
  }
});

/**
 * GET /api/admin/analytics/traffic-by-hour
 * Traffic distribution by hour of day
 */
router.get('/traffic-by-hour', async (req, res) => {
  try {
    const { period = '7days' } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const pageViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true }
    });

    // Group by hour
    const hourlyData: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyData[i] = 0;

    pageViews.forEach(pv => {
      const hour = new Date(pv.createdAt).getHours();
      hourlyData[hour]++;
    });

    const trafficByHour = Object.entries(hourlyData).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      views: count
    }));

    res.json({
      success: true,
      data: {
        period,
        trafficByHour,
        peakHour: trafficByHour.reduce((max, h) => h.views > max.views ? h : max, trafficByHour[0])
      }
    });
  } catch (error) {
    console.error('Traffic by hour error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy traffic theo giờ' });
  }
});

/**
 * GET /api/admin/analytics/abandoned-carts
 * Detailed abandoned cart analysis
 */
router.get('/abandoned-carts', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const now = new Date();
    const abandonedThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lt: abandonedThreshold },
        items: { some: {} }
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                salePrice: true,
                images: { take: 1, select: { url: true } }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: Number(limit)
    });

    const cartsWithValue = abandonedCarts.map(cart => {
      const totalValue = cart.items.reduce((sum, item) => {
        const price = item.product.salePrice || item.product.price;
        return sum + (price * item.quantity);
      }, 0);

      return {
        id: cart.id,
        user: cart.user,
        itemCount: cart.items.length,
        totalValue,
        lastUpdated: cart.updatedAt,
        topItems: cart.items.slice(0, 3).map(item => ({
          name: item.product.name,
          image: item.product.images[0]?.url,
          quantity: item.quantity
        }))
      };
    });

    const totalAbandonedValue = cartsWithValue.reduce((sum, c) => sum + c.totalValue, 0);

    res.json({
      success: true,
      data: {
        carts: cartsWithValue,
        totalAbandoned: cartsWithValue.length,
        totalAbandonedValue
      }
    });
  } catch (error) {
    console.error('Abandoned carts error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy giỏ hàng bị bỏ' });
  }
});

/**
 * GET /api/admin/analytics/size-heatmap
 * Size distribution heatmap by category
 */
router.get('/size-heatmap', async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get order items with product category
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      },
      select: {
        quantity: true,
        price: true,
        variant: true,
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Build heatmap: category x size
    const heatmapData = new Map<string, Map<string, { count: number; revenue: number }>>();
    const allSizes = new Set<string>();
    const categoryNames = new Map<string, string>();

    orderItems.forEach(item => {
      const categoryId = item.product.category?.id?.toString() || 'uncategorized';
      const categoryName = item.product.category?.name || 'Chưa phân loại';
      categoryNames.set(categoryId, categoryName);

      let size = 'Unknown';
      const variantStr = item.variant as string | null;
      if (variantStr) {
        try {
          const variantObj = JSON.parse(variantStr);
          size = variantObj.size || variantObj.Size || 'Unknown';
        } catch {
          const sizeMatch = variantStr.match(/size[:\s]*([^,]+)/i);
          if (sizeMatch) size = sizeMatch[1].trim();
        }
      }

      allSizes.add(size);

      if (!heatmapData.has(categoryId)) {
        heatmapData.set(categoryId, new Map());
      }
      const categoryData = heatmapData.get(categoryId)!;
      const sizeData = categoryData.get(size) || { count: 0, revenue: 0 };
      sizeData.count += item.quantity;
      sizeData.revenue += item.price * item.quantity;
      categoryData.set(size, sizeData);
    });

    // Convert to array format for frontend
    const sizes = Array.from(allSizes).sort();
    const categories = Array.from(heatmapData.entries()).map(([catId, sizeMap]) => {
      const sizeData: Record<string, { count: number; revenue: number }> = {};
      let totalCount = 0;
      
      sizes.forEach(size => {
        const data = sizeMap.get(size) || { count: 0, revenue: 0 };
        sizeData[size] = data;
        totalCount += data.count;
      });

      return {
        categoryId: catId,
        categoryName: categoryNames.get(catId) || 'Unknown',
        totalSold: totalCount,
        sizes: sizeData
      };
    }).sort((a, b) => b.totalSold - a.totalSold);

    // Find max value for heatmap intensity
    let maxCount = 0;
    categories.forEach(cat => {
      Object.values(cat.sizes).forEach(s => {
        if (s.count > maxCount) maxCount = s.count;
      });
    });

    res.json({
      success: true,
      data: {
        period,
        sizes,
        categories,
        maxCount
      }
    });
  } catch (error) {
    console.error('Size heatmap error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy heatmap size' });
  }
});

/**
 * GET /api/admin/analytics/color-trends
 * Color trends over time
 */
router.get('/color-trends', async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    const now = new Date();
    let startDate: Date;
    let interval: 'day' | 'week';
    
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        interval = 'week';
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
    }

    // Get order items with dates
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      },
      select: {
        quantity: true,
        variant: true,
        order: {
          select: { createdAt: true }
        }
      }
    });

    // Aggregate by color and time period
    const colorTrends = new Map<string, Map<string, number>>();
    const allPeriods = new Set<string>();

    orderItems.forEach(item => {
      let color = 'Unknown';
      const variantStr = item.variant as string | null;
      if (variantStr) {
        try {
          const variantObj = JSON.parse(variantStr);
          color = variantObj.color || variantObj.colorName || variantObj.Color || 'Unknown';
        } catch {
          const colorMatch = variantStr.match(/(?:color|màu)[:\s]*([^,]+)/i);
          if (colorMatch) color = colorMatch[1].trim();
        }
      }

      const date = new Date(item.order.createdAt);
      let periodKey: string;
      if (interval === 'day') {
        periodKey = `${date.getDate()}/${date.getMonth() + 1}`;
      } else {
        const weekNum = Math.ceil((date.getDate()) / 7);
        periodKey = `Tuần ${weekNum}/${date.getMonth() + 1}`;
      }

      allPeriods.add(periodKey);

      if (!colorTrends.has(color)) {
        colorTrends.set(color, new Map());
      }
      const colorData = colorTrends.get(color)!;
      colorData.set(periodKey, (colorData.get(periodKey) || 0) + item.quantity);
    });

    // Get top colors and format data
    const colorTotals = Array.from(colorTrends.entries())
      .map(([color, periodMap]) => ({
        color,
        total: Array.from(periodMap.values()).reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const topColors = colorTotals.map(c => c.color);
    const periods = Array.from(allPeriods).sort((a, b) => {
      // Sort by date
      const [dayA, monthA] = a.replace('Tuần ', '').split('/').map(Number);
      const [dayB, monthB] = b.replace('Tuần ', '').split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });

    // Format for chart
    const trendData = periods.map(p => {
      const dataPoint: Record<string, string | number> = { period: p };
      topColors.forEach(color => {
        dataPoint[color] = colorTrends.get(color)?.get(p) || 0;
      });
      return dataPoint;
    });

    // Calculate color comparison with previous period
    const currentTotal = colorTotals.reduce((sum, c) => sum + c.total, 0);
    const colorStats = colorTotals.map(c => ({
      color: c.color,
      count: c.total,
      percentage: currentTotal > 0 ? Math.round((c.total / currentTotal) * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        period,
        topColors,
        trendData,
        colorStats
      }
    });
  } catch (error) {
    console.error('Color trends error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy xu hướng màu sắc' });
  }
});

/**
 * GET /api/admin/analytics/return-by-size
 * Return/cancellation rate by size
 */
router.get('/return-by-size', async (req, res) => {
  try {
    const { period = '90days' } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Get all order items in period
    const allOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate }
        }
      },
      select: {
        quantity: true,
        variant: true,
        order: {
          select: { status: true }
        }
      }
    });

    // Aggregate by size
    const sizeStats = new Map<string, { total: number; cancelled: number; returned: number }>();

    allOrderItems.forEach(item => {
      let size = 'Unknown';
      const variantStr = item.variant as string | null;
      if (variantStr) {
        try {
          const variantObj = JSON.parse(variantStr);
          size = variantObj.size || variantObj.Size || 'Unknown';
        } catch {
          const sizeMatch = variantStr.match(/size[:\s]*([^,]+)/i);
          if (sizeMatch) size = sizeMatch[1].trim();
        }
      }

      const stats = sizeStats.get(size) || { total: 0, cancelled: 0, returned: 0 };
      stats.total += item.quantity;

      if (item.order.status === 'CANCELLED') {
        stats.cancelled += item.quantity;
      }
      // Note: Add RETURNED status check if you have it
      if (item.order.status === 'RETURNED' || item.order.status === 'REFUNDED') {
        stats.returned += item.quantity;
      }

      sizeStats.set(size, stats);
    });

    // Calculate rates and format
    const sizeData = Array.from(sizeStats.entries())
      .map(([size, stats]) => ({
        size,
        totalSold: stats.total,
        cancelled: stats.cancelled,
        returned: stats.returned,
        cancelRate: stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0,
        returnRate: stats.total > 0 ? Math.round((stats.returned / stats.total) * 100) : 0,
        problemRate: stats.total > 0 ? Math.round(((stats.cancelled + stats.returned) / stats.total) * 100) : 0
      }))
      .filter(s => s.totalSold >= 5) // Only show sizes with enough data
      .sort((a, b) => b.problemRate - a.problemRate);

    // Identify problematic sizes
    const problematicSizes = sizeData
      .filter(s => s.problemRate > 15) // More than 15% problem rate
      .map(s => ({
        size: s.size,
        rate: s.problemRate,
        suggestion: s.returnRate > s.cancelRate 
          ? 'Kiểm tra bảng size guide hoặc form sản phẩm'
          : 'Kiểm tra hình ảnh và mô tả sản phẩm'
      }));

    res.json({
      success: true,
      data: {
        period,
        sizeData,
        problematicSizes,
        insights: problematicSizes.length > 0 
          ? [`⚠️ Có ${problematicSizes.length} size có tỉ lệ hủy/trả cao. Cần xem xét lại.`]
          : ['✅ Tất cả size đều có tỉ lệ hủy/trả ở mức chấp nhận được.']
      }
    });
  } catch (error) {
    console.error('Return by size error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê hoàn trả theo size' });
  }
});

/**
 * GET /api/admin/analytics/product-performance
 * Product performance matrix (views, cart, purchase)
 */
router.get('/product-performance', async (req, res) => {
  try {
    const { period = '7days', limit = 20 } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get product views
    const productViews = await prisma.productView.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: startDate } },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: Number(limit) * 2
    });

    const productIds = productViews.map(pv => pv.productId);

    // Get cart adds
    const cartAdds = await prisma.cartEvent.groupBy({
      by: ['productId'],
      where: {
        createdAt: { gte: startDate },
        event: 'ADD_TO_CART',
        productId: { in: productIds }
      },
      _count: { productId: true }
    });

    // Get purchases
    const purchases = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      },
      _sum: { quantity: true }
    });

    // Get product details
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        images: { take: 1, select: { url: true } }
      }
    });

    // Build maps
    const viewsMap = new Map(productViews.map(pv => [pv.productId, pv._count.productId]));
    const cartMap = new Map(cartAdds.map(ca => [ca.productId, ca._count.productId]));
    const purchaseMap = new Map(purchases.map(p => [p.productId, p._sum.quantity || 0]));
    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate performance scores
    const performance = productIds
      .map(id => {
        const product = productMap.get(id);
        const views = viewsMap.get(id) || 0;
        const carts = cartMap.get(id) || 0;
        const sold = purchaseMap.get(id) || 0;

        const viewToCartRate = views > 0 ? (carts / views) * 100 : 0;
        const cartToPurchaseRate = carts > 0 ? (sold / carts) * 100 : 0;
        
        // Performance score: weighted average
        const score = viewToCartRate * 0.4 + cartToPurchaseRate * 0.6;

        return {
          id,
          name: product?.name || 'Unknown',
          image: product?.images[0]?.url,
          price: product?.salePrice || product?.price || 0,
          views,
          carts,
          sold,
          viewToCartRate: Math.round(viewToCartRate * 10) / 10,
          cartToPurchaseRate: Math.round(cartToPurchaseRate * 10) / 10,
          score: Math.round(score * 10) / 10,
          status: score > 30 ? 'excellent' : score > 15 ? 'good' : score > 5 ? 'average' : 'needs_attention'
        };
      })
      .filter(p => p.views > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        period,
        products: performance,
        summary: {
          totalProducts: performance.length,
          excellent: performance.filter(p => p.status === 'excellent').length,
          needsAttention: performance.filter(p => p.status === 'needs_attention').length
        }
      }
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy hiệu suất sản phẩm' });
  }
});

/**
 * GET /api/admin/analytics/recommendation-effectiveness
 * Measure effectiveness of recommendation system
 */
router.get('/recommendation-effectiveness', async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get recommendation clicks
    const [
      totalClicks,
      clicksByAlgorithm,
      purchasedFromRec,
      viewsBySource
    ] = await Promise.all([
      // Total clicks on recommendations
      prisma.recommendationClick.count({
        where: { createdAt: { gte: startDate } }
      }),
      // Clicks grouped by algorithm
      prisma.recommendationClick.groupBy({
        by: ['algorithm'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      }),
      // Purchases from recommendations
      prisma.recommendationClick.count({
        where: {
          createdAt: { gte: startDate },
          purchased: true
        }
      }),
      // Product views by source
      prisma.productView.groupBy({
        by: ['source'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true }
      })
    ]);

    // Calculate revenue from recommendations
    const purchasedRecs = await prisma.recommendationClick.findMany({
      where: {
        createdAt: { gte: startDate },
        purchased: true
      },
      select: { productId: true }
    });

    const purchasedProductIds = purchasedRecs.map(r => r.productId);
    
    let revenueFromRec = 0;
    if (purchasedProductIds.length > 0) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          productId: { in: purchasedProductIds },
          order: {
            createdAt: { gte: startDate },
            status: REVENUE_VALID_STATUSES
          }
        },
        select: { price: true, quantity: true }
      });
      revenueFromRec = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Total revenue for comparison
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: startDate },
        status: REVENUE_VALID_STATUSES
      }
    });

    // Format algorithm stats
    const algorithmStats = clicksByAlgorithm.map(a => ({
      algorithm: a.algorithm,
      clicks: a._count.id,
      label: getAlgorithmLabel(a.algorithm)
    })).sort((a, b) => b.clicks - a.clicks);

    // Format source stats
    const sourceStats = viewsBySource
      .filter(s => s.source)
      .map(s => ({
        source: s.source || 'unknown',
        views: s._count.id,
        label: getSourceLabel(s.source || '')
      }))
      .sort((a, b) => b.views - a.views);

    // Calculate CTR and conversion rates
    const totalViews = sourceStats.reduce((sum, s) => sum + s.views, 0);
    const recViews = sourceStats.find(s => s.source === 'recommendation')?.views || 0;
    const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 10000) / 100 : 0;
    const conversionRate = totalClicks > 0 ? Math.round((purchasedFromRec / totalClicks) * 10000) / 100 : 0;
    const revenueContribution = (totalRevenue._sum.totalAmount || 0) > 0
      ? Math.round((revenueFromRec / (totalRevenue._sum.totalAmount || 1)) * 10000) / 100
      : 0;

    // Generate insights
    const insights: string[] = [];
    if (ctr > 5) {
      insights.push('✅ CTR của recommendation tốt (>5%). Khách hàng quan tâm đến gợi ý.');
    } else if (ctr < 2) {
      insights.push('⚠️ CTR thấp (<2%). Cân nhắc cải thiện vị trí hiển thị hoặc thuật toán gợi ý.');
    }
    if (conversionRate > 10) {
      insights.push('✅ Tỉ lệ mua từ recommendation cao (>10%).');
    }
    if (revenueContribution > 15) {
      insights.push(`🎯 ${revenueContribution}% doanh thu đến từ recommendation - Rất hiệu quả!`);
    }

    res.json({
      success: true,
      data: {
        period,
        overview: {
          totalClicks,
          purchasedFromRec,
          ctr,
          conversionRate,
          revenueFromRec,
          revenueContribution,
          recViews
        },
        algorithmStats,
        sourceStats,
        insights
      }
    });
  } catch (error) {
    console.error('Recommendation effectiveness error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy hiệu quả recommendation' });
  }
});

/**
 * GET /api/admin/analytics/co-viewed-products
 * Products frequently viewed together (for combo suggestions)
 */
router.get('/co-viewed-products', async (req, res) => {
  try {
    const { period = '30days', minCoViews = 5 } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all product views grouped by session
    const productViews = await prisma.productView.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        sessionId: true,
        productId: true
      },
      orderBy: { sessionId: 'asc' }
    });

    // Group by session
    const sessionProducts = new Map<string, Set<number>>();
    productViews.forEach(pv => {
      if (!sessionProducts.has(pv.sessionId)) {
        sessionProducts.set(pv.sessionId, new Set());
      }
      sessionProducts.get(pv.sessionId)!.add(pv.productId);
    });

    // Count co-views (products viewed in the same session)
    const coViewCounts = new Map<string, number>();
    
    sessionProducts.forEach(productSet => {
      const products = Array.from(productSet);
      if (products.length < 2) return;
      
      // Create pairs
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const key = [products[i], products[j]].sort((a, b) => a - b).join('-');
          coViewCounts.set(key, (coViewCounts.get(key) || 0) + 1);
        }
      }
    });

    // Filter by minimum co-views and get top pairs
    const topPairs = Array.from(coViewCounts.entries())
      .filter(([, count]) => count >= Number(minCoViews))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    // Get product details
    const allProductIds = new Set<number>();
    topPairs.forEach(([key]) => {
      const [id1, id2] = key.split('-').map(Number);
      allProductIds.add(id1);
      allProductIds.add(id2);
    });

    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true } }
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Format pairs with product info
    const coViewedPairs = topPairs.map(([key, count]) => {
      const [id1, id2] = key.split('-').map(Number);
      const p1 = productMap.get(id1);
      const p2 = productMap.get(id2);

      return {
        coViewCount: count,
        product1: p1 ? {
          id: p1.id,
          name: p1.name,
          price: p1.salePrice || p1.price,
          image: p1.images[0]?.url,
          category: p1.category?.name
        } : null,
        product2: p2 ? {
          id: p2.id,
          name: p2.name,
          price: p2.salePrice || p2.price,
          image: p2.images[0]?.url,
          category: p2.category?.name
        } : null,
        comboSuggestion: p1 && p2 ? `${p1.name} + ${p2.name}` : null,
        comboPotentialPrice: p1 && p2 ? (p1.salePrice || p1.price) + (p2.salePrice || p2.price) : 0
      };
    }).filter(pair => pair.product1 && pair.product2);

    // Insights for combo creation
    const insights: string[] = [];
    if (coViewedPairs.length > 0) {
      const topPair = coViewedPairs[0];
      insights.push(`💡 Cặp sản phẩm hay được xem cùng nhất: "${topPair.product1?.name}" & "${topPair.product2?.name}" (${topPair.coViewCount} sessions)`);
      
      // Check if same category pairs exist
      const sameCatPairs = coViewedPairs.filter(p => 
        p.product1?.category === p.product2?.category
      );
      if (sameCatPairs.length > 3) {
        insights.push(`📦 Có ${sameCatPairs.length} cặp cùng danh mục - Cơ hội tạo bundle deal.`);
      }
    }

    res.json({
      success: true,
      data: {
        period,
        totalPairs: coViewedPairs.length,
        pairs: coViewedPairs,
        insights
      }
    });
  } catch (error) {
    console.error('Co-viewed products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm xem cùng' });
  }
});

/**
 * GET /api/admin/analytics/bought-together
 * Products frequently bought together
 */
router.get('/bought-together', async (req, res) => {
  try {
    const { period = '90days', minCoBuys = 2 } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Get orders with multiple items
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: REVENUE_VALID_STATUSES
      },
      select: {
        id: true,
        items: {
          select: { productId: true }
        }
      }
    });

    // Count co-purchases
    const coBuysCounts = new Map<string, number>();

    orders.forEach(order => {
      const productIds = [...new Set(order.items.map(i => i.productId))];
      if (productIds.length < 2) return;

      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const key = [productIds[i], productIds[j]].sort((a, b) => a - b).join('-');
          coBuysCounts.set(key, (coBuysCounts.get(key) || 0) + 1);
        }
      }
    });

    // Get top pairs
    const topPairs = Array.from(coBuysCounts.entries())
      .filter(([, count]) => count >= Number(minCoBuys))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);

    // Get product details
    const allProductIds = new Set<number>();
    topPairs.forEach(([key]) => {
      const [id1, id2] = key.split('-').map(Number);
      allProductIds.add(id1);
      allProductIds.add(id2);
    });

    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true } }
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    const boughtTogetherPairs = topPairs.map(([key, count]) => {
      const [id1, id2] = key.split('-').map(Number);
      const p1 = productMap.get(id1);
      const p2 = productMap.get(id2);

      const totalPrice = (p1?.salePrice || p1?.price || 0) + (p2?.salePrice || p2?.price || 0);
      const suggestedBundlePrice = Math.round(totalPrice * 0.9); // 10% discount suggestion

      return {
        coBuyCount: count,
        product1: p1 ? {
          id: p1.id,
          name: p1.name,
          price: p1.salePrice || p1.price,
          image: p1.images[0]?.url,
          category: p1.category?.name
        } : null,
        product2: p2 ? {
          id: p2.id,
          name: p2.name,
          price: p2.salePrice || p2.price,
          image: p2.images[0]?.url,
          category: p2.category?.name
        } : null,
        bundleSuggestion: {
          originalPrice: totalPrice,
          suggestedPrice: suggestedBundlePrice,
          discount: 10
        }
      };
    }).filter(pair => pair.product1 && pair.product2);

    res.json({
      success: true,
      data: {
        period,
        totalPairs: boughtTogetherPairs.length,
        pairs: boughtTogetherPairs,
        insights: boughtTogetherPairs.length > 0 
          ? [`🛒 Top combo được mua cùng: "${boughtTogetherPairs[0].product1?.name}" & "${boughtTogetherPairs[0].product2?.name}" (${boughtTogetherPairs[0].coBuyCount} đơn)`]
          : ['Chưa đủ dữ liệu để phân tích combo']
      }
    });
  } catch (error) {
    console.error('Bought together error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm mua cùng' });
  }
});

/**
 * GET /api/admin/analytics/traffic-sources
 * Analyze traffic by source (how users find products)
 */
router.get('/traffic-sources', async (req, res) => {
  try {
    const { period = '7days' } = req.query;

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
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get views by source
    const viewsBySource = await prisma.productView.groupBy({
      by: ['source'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    });

    // Get purchases by source (through tracking)
    const ordersFromRec = await prisma.recommendationClick.count({
      where: {
        createdAt: { gte: startDate },
        purchased: true
      }
    });

    const totalViews = viewsBySource.reduce((sum, v) => sum + v._count.id, 0);
    
    const sources = viewsBySource.map(v => ({
      source: v.source || 'direct',
      label: getSourceLabel(v.source || 'direct'),
      views: v._count.id,
      percentage: totalViews > 0 ? Math.round((v._count.id / totalViews) * 100) : 0
    })).sort((a, b) => b.views - a.views);

    // Add "unknown" for null sources
    const unknownViews = sources.find(s => s.source === 'direct')?.views || 0;

    res.json({
      success: true,
      data: {
        period,
        totalViews,
        sources,
        ordersFromRec,
        insights: [
          sources[0] ? `📊 Nguồn traffic chính: ${sources[0].label} (${sources[0].percentage}%)` : 'Chưa có dữ liệu traffic'
        ]
      }
    });
  } catch (error) {
    console.error('Traffic sources error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy nguồn traffic' });
  }
});

// Helper functions
function getAlgorithmLabel(algorithm: string): string {
  const labels: Record<string, string> = {
    'similar': 'Sản phẩm tương tự',
    'trending': 'Đang thịnh hành',
    'recently_viewed': 'Đã xem gần đây',
    'bought_together': 'Mua cùng nhau',
    'personalized': 'Gợi ý cá nhân',
    'category': 'Cùng danh mục'
  };
  return labels[algorithm] || algorithm;
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'direct': 'Truy cập trực tiếp',
    'search': 'Từ tìm kiếm',
    'recommendation': 'Từ gợi ý',
    'category': 'Từ danh mục',
    'homepage': 'Từ trang chủ',
    'cart': 'Từ giỏ hàng',
    'unknown': 'Không xác định'
  };
  return labels[source] || source;
}

/**
 * GET /api/admin/analytics/wishlist
 * Wishlist analytics - most wishlisted products
 */
router.get('/wishlist', async (req, res) => {
  try {
    const { period = '30days', limit = 20 } = req.query;

    const now = new Date();
    let startDate: Date;
    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get wishlist events from cart_events (add_to_wishlist, remove_from_wishlist)
    const [addEvents, removeEvents, totalWishlistAdds, totalWishlistRemoves] = await Promise.all([
      // Add to wishlist events grouped by product
      prisma.cartEvent.groupBy({
        by: ['productId'],
        where: {
          createdAt: { gte: startDate },
          event: 'add_to_wishlist',
          productId: { not: null }
        },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: Number(limit) * 2
      }),
      // Remove from wishlist events grouped by product
      prisma.cartEvent.groupBy({
        by: ['productId'],
        where: {
          createdAt: { gte: startDate },
          event: 'remove_from_wishlist',
          productId: { not: null }
        },
        _count: { productId: true }
      }),
      // Total add events
      prisma.cartEvent.count({
        where: {
          createdAt: { gte: startDate },
          event: 'add_to_wishlist'
        }
      }),
      // Total remove events
      prisma.cartEvent.count({
        where: {
          createdAt: { gte: startDate },
          event: 'remove_from_wishlist'
        }
      })
    ]);

    // Create maps
    const addMap = new Map(addEvents.map(e => [e.productId, e._count.productId]));
    const removeMap = new Map(removeEvents.map(e => [e.productId, e._count.productId]));

    // Get product IDs with most adds
    const productIds = addEvents
      .filter(e => e.productId !== null)
      .slice(0, Number(limit))
      .map(e => e.productId as number);

    // Get product details
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true } }
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate net wishlist score
    const wishlistedProducts = productIds.map(id => {
      const product = productMap.get(id);
      const adds = addMap.get(id) || 0;
      const removes = removeMap.get(id) || 0;
      const netScore = adds - removes;

      return {
        productId: id,
        name: product?.name || 'Unknown',
        slug: product?.slug,
        price: product?.salePrice || product?.price || 0,
        image: product?.images[0]?.url,
        category: product?.category?.name,
        adds,
        removes,
        netScore,
        retentionRate: adds > 0 ? Math.round(((adds - removes) / adds) * 100) : 0
      };
    })
    .filter(p => p.adds > 0)
    .sort((a, b) => b.netScore - a.netScore)
    .slice(0, Number(limit));

    // Get current total wishlist items across all users
    const currentTotalItems = await prisma.wishlistItem.count();

    // Generate insights
    const insights: string[] = [];
    if (wishlistedProducts.length > 0) {
      const topProduct = wishlistedProducts[0];
      insights.push(`❤️ Sản phẩm được yêu thích nhất: "${topProduct.name}" (${topProduct.netScore} lượt)`);
    }

    const avgRetention = wishlistedProducts.length > 0 
      ? Math.round(wishlistedProducts.reduce((sum, p) => sum + p.retentionRate, 0) / wishlistedProducts.length)
      : 0;
    
    if (avgRetention < 50) {
      insights.push('⚠️ Tỉ lệ giữ trong wishlist thấp. Khách có thể chờ giảm giá hoặc chưa quyết định.');
    } else if (avgRetention > 70) {
      insights.push('✅ Tỉ lệ giữ trong wishlist cao. Sản phẩm được quan tâm thực sự.');
    }

    // Check conversion - products in wishlist that were purchased
    const convertedFromWishlist = await prisma.orderItem.count({
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: startDate },
          status: REVENUE_VALID_STATUSES
        }
      }
    });

    const conversionRate = totalWishlistAdds > 0 
      ? Math.round((convertedFromWishlist / totalWishlistAdds) * 10000) / 100
      : 0;

    res.json({
      success: true,
      data: {
        period,
        overview: {
          totalAdds: totalWishlistAdds,
          totalRemoves: totalWishlistRemoves,
          netChange: totalWishlistAdds - totalWishlistRemoves,
          currentTotalItems,
          conversionRate
        },
        topProducts: wishlistedProducts,
        insights
      }
    });
  } catch (error) {
    console.error('Wishlist analytics error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê wishlist' });
  }
});

/**
 * GET /api/admin/analytics/low-stock
 * Get products/variants with low stock
 */
router.get('/low-stock', async (req, res) => {
  try {
    const { limit = 10, threshold = 5 } = req.query;

    // Get low stock variants
    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        stock: { lte: Number(threshold), gt: 0 },
        product: { isVisible: true }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: { take: 1, select: { url: true } }
          }
        }
      },
      orderBy: { stock: 'asc' },
      take: Number(limit)
    });

    const items = lowStockVariants.map(v => ({
      id: v.id,
      productId: v.product.id,
      name: v.product.name,
      size: v.size,
      color: v.colorName,
      stock: v.stock,
      image: v.product.images[0]?.url
    }));

    // Get out of stock count
    const outOfStockCount = await prisma.productVariant.count({
      where: {
        stock: 0,
        product: { isVisible: true }
      }
    });

    res.json({
      success: true,
      data: {
        items,
        outOfStockCount,
        lowStockCount: items.length
      }
    });
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách tồn kho thấp' });
  }
});

export default router;

