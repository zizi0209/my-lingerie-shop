import express from 'express';
import {
  getSimilarProducts,
  getRecentlyViewed,
  getTrendingProducts,
  getBoughtTogether,
  getPersonalizedRecommendations,
  trackRecommendationClick,
  getNewArrivals,
  getBestSellers
} from '../services/recommendationService';
import { ProductType } from '@prisma/client';

const router = express.Router();

/**
 * GET /api/recommendations/similar/:productId
 * Get similar products (content-based + personalized if logged in)
 */
router.get('/similar/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const limit = parseInt(req.query.limit as string) || 12;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const result = await getSimilarProducts(productId, limit, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Similar products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm tương tự' });
  }
});

/**
 * GET /api/recommendations/recently-viewed
 * Get recently viewed products
 */
router.get('/recently-viewed', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const products = await getRecentlyViewed(sessionId, userId, limit, excludeId);

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Recently viewed error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm đã xem' });
  }
});

/**
 * GET /api/recommendations/trending
 * Get trending products
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const productType = req.query.productType as ProductType | undefined;

    const products = await getTrendingProducts(limit, productType);

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Trending products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm trending' });
  }
});

/**
 * GET /api/recommendations/bought-together/:productId
 * Get frequently bought together products
 */
router.get('/bought-together/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const limit = parseInt(req.query.limit as string) || 5;

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const products = await getBoughtTogether(productId, limit);

    // Calculate bundle pricing
    const bundles = products.length >= 2 ? [{
      products,
      originalPrice: products.reduce((sum, p) => sum + (p.salePrice || p.price), 0),
      bundlePrice: Math.round(products.reduce((sum, p) => sum + (p.salePrice || p.price), 0) * 0.9),
      discount: 10
    }] : [];

    res.json({
      success: true,
      data: { products, bundles }
    });
  } catch (error) {
    console.error('Bought together error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm mua cùng' });
  }
});

/**
 * GET /api/recommendations/personalized
 * Get personalized recommendations for logged-in user
 */
router.get('/personalized', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 12;
    const excludeIdsStr = req.query.excludeIds as string;
    const excludeIds = excludeIdsStr 
      ? excludeIdsStr.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await getPersonalizedRecommendations(userId, limit, excludeIds);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy gợi ý cá nhân' });
  }
});

/**
 * GET /api/recommendations/new-arrivals
 * Get new arrival products
 */
router.get('/new-arrivals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const productType = req.query.productType as ProductType | undefined;

    const products = await getNewArrivals(limit, productType);

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('New arrivals error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm mới' });
  }
});

/**
 * GET /api/recommendations/best-sellers
 * Get best selling products
 */
router.get('/best-sellers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const days = parseInt(req.query.days as string) || 30;

    const products = await getBestSellers(limit, categoryId, days);

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm bán chạy' });
  }
});

/**
 * POST /api/recommendations/track-click
 * Track click on recommendation for analytics
 */
router.post('/track-click', async (req, res) => {
  try {
    const { productId, sourceProductId, algorithm, position, sectionType, sessionId, userId } = req.body;

    if (!productId || !algorithm || position === undefined || !sectionType || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await trackRecommendationClick({
      productId: parseInt(productId),
      sourceProductId: sourceProductId ? parseInt(sourceProductId) : undefined,
      algorithm,
      position: parseInt(position),
      sectionType,
      sessionId,
      userId: userId ? parseInt(userId) : undefined
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Lỗi khi track click' });
  }
});

/**
 * GET /api/recommendations/for-cart
 * Get recommendations based on cart items
 */
router.get('/for-cart', async (req, res) => {
  try {
    const productIdsStr = req.query.productIds as string;
    const limit = parseInt(req.query.limit as string) || 6;

    if (!productIdsStr) {
      return res.json({ success: true, data: { products: [] } });
    }

    const productIds = productIdsStr.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (productIds.length === 0) {
      return res.json({ success: true, data: { products: [] } });
    }

    // Get bought-together for each cart item
    const allSuggestions = await Promise.all(
      productIds.map(id => getBoughtTogether(id, 3))
    );

    // Merge and deduplicate
    const suggestionMap = new Map<number, { product: (typeof allSuggestions)[0][0]; totalConfidence: number }>();
    
    for (const suggestions of allSuggestions) {
      for (const suggestion of suggestions) {
        // Skip if already in cart
        if (productIds.includes(suggestion.id)) continue;
        
        const existing = suggestionMap.get(suggestion.id);
        if (existing) {
          existing.totalConfidence += suggestion.confidence;
        } else {
          suggestionMap.set(suggestion.id, { product: suggestion, totalConfidence: suggestion.confidence });
        }
      }
    }

    // Sort by total confidence
    const products = Array.from(suggestionMap.values())
      .sort((a, b) => b.totalConfidence - a.totalConfidence)
      .slice(0, limit)
      .map(s => s.product);

    res.json({
      success: true,
      data: { 
        products,
        message: 'Khách mua những sản phẩm này thường mua thêm:'
      }
    });
  } catch (error) {
    console.error('Cart recommendations error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy gợi ý cho giỏ hàng' });
  }
});

export default router;
