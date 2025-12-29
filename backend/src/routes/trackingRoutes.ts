import express from 'express';
import {
  trackPageView,
  getPageViewAnalytics,
  trackProductView,
  getProductViewAnalytics,
  trackCartEvent,
  getCartEventAnalytics,
} from '../controllers/trackingController';

const router = express.Router();

// Page views
router.post('/page-views', trackPageView);
router.get('/page-views/analytics', getPageViewAnalytics);

// Product views
router.post('/product-views', trackProductView);
router.get('/product-views/analytics', getProductViewAnalytics);

// Cart events
router.post('/cart-events', trackCartEvent);
router.get('/cart-events/analytics', getCartEventAnalytics);

export default router;
