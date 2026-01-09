import express from 'express';
import {
  // Coupons
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
  generatePrivateCoupon,
  // Campaigns
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // Point Rewards
  getAllPointRewards,
  getPointRewardById,
  createPointReward,
  updatePointReward,
  deletePointReward,
} from '../controllers/couponController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// =============================================
// ADMIN ROUTES - Coupons
// =============================================
router.get('/admin/coupons', authenticateToken, isAdmin, getAllCoupons);
router.get('/admin/coupons/:id', authenticateToken, isAdmin, getCouponById);
router.post('/admin/coupons', authenticateToken, isAdmin, createCoupon);
router.put('/admin/coupons/:id', authenticateToken, isAdmin, updateCoupon);
router.delete('/admin/coupons/:id', authenticateToken, isAdmin, deleteCoupon);
router.get('/admin/coupons/:id/usage', authenticateToken, isAdmin, getCouponUsage);
router.post('/admin/coupons/generate-private', authenticateToken, isAdmin, generatePrivateCoupon);

// =============================================
// ADMIN ROUTES - Campaigns
// =============================================
router.get('/admin/campaigns', authenticateToken, isAdmin, getAllCampaigns);
router.get('/admin/campaigns/:id', authenticateToken, isAdmin, getCampaignById);
router.post('/admin/campaigns', authenticateToken, isAdmin, createCampaign);
router.put('/admin/campaigns/:id', authenticateToken, isAdmin, updateCampaign);
router.delete('/admin/campaigns/:id', authenticateToken, isAdmin, deleteCampaign);

// =============================================
// ADMIN ROUTES - Point Rewards
// =============================================
router.get('/admin/rewards', authenticateToken, isAdmin, getAllPointRewards);
router.get('/admin/rewards/:id', authenticateToken, isAdmin, getPointRewardById);
router.post('/admin/rewards', authenticateToken, isAdmin, createPointReward);
router.put('/admin/rewards/:id', authenticateToken, isAdmin, updatePointReward);
router.delete('/admin/rewards/:id', authenticateToken, isAdmin, deletePointReward);

export default router;
