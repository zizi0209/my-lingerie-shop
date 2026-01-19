import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/about-stats
 * Public endpoint: Get real statistics for About page
 * - Satisfied customers (from delivered orders)
 * - Design collection (from visible products)
 * - Average rating (from reviews)
 * - Physical stores (from config or hardcoded)
 */
router.get('/', async (req, res) => {
  try {
    const [
      deliveredOrdersCount,
      visibleProductsCount,
      reviewStats,
      storesConfig
    ] = await Promise.all([
      // Số khách hàng hài lòng = số đơn hàng đã giao thành công
      prisma.order.count({
        where: { status: 'DELIVERED' }
      }),

      // Số mẫu thiết kế = số sản phẩm đang hiển thị
      prisma.product.count({
        where: {
          deletedAt: null,
          isVisible: true
        }
      }),

      // Đánh giá trung bình từ reviews
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
        where: {
          status: 'APPROVED' // Chỉ tính reviews đã duyệt
        }
      }),

      // Số cửa hàng vật lý (từ system config)
      prisma.systemConfig.findUnique({
        where: { key: 'physical_stores_count' }
      })
    ]);

    // Parse số cửa hàng từ config hoặc mặc định 3
    const physicalStoresCount = storesConfig?.value 
      ? parseInt(storesConfig.value as string, 10) 
      : 3;

    // Round average rating to 1 decimal
    const averageRating = reviewStats._avg.rating 
      ? Math.round(reviewStats._avg.rating * 10) / 10 
      : 4.9;

    res.json({
      success: true,
      data: {
        satisfiedCustomers: {
          number: deliveredOrdersCount,
          suffix: '+',
          label: 'Khách hàng hài lòng'
        },
        designCollection: {
          number: visibleProductsCount,
          suffix: '+',
          label: 'Mẫu thiết kế độc quyền'
        },
        averageRating: {
          number: averageRating,
          suffix: '/5',
          label: 'Đánh giá trung bình',
          decimals: 1
        },
        physicalStores: {
          number: physicalStoresCount,
          suffix: '',
          label: 'Cửa hàng vật lý'
        }
      }
    });
  } catch (error) {
    console.error('About stats error:', error);
    res.status(500).json({
      error: 'Lỗi khi lấy số liệu thống kê'
    });
  }
});

export default router;
