import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// =============================================
// ADMIN: CRUD COUPONS
// =============================================

// Get all coupons (Admin)
export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, couponType, isActive, campaignId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { code: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (couponType) where.couponType = String(couponType);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (campaignId) where.campaignId = Number(campaignId);

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: { id: true, name: true },
          },
          _count: {
            select: { userCoupons: true, usageHistory: true },
          },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      success: true,
      data: coupons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all coupons error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách mã giảm giá!' });
  }
};

// Get coupon by ID (Admin)
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id: Number(id) },
      include: {
        campaign: true,
        _count: {
          select: { userCoupons: true, usageHistory: true },
        },
      },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Không tìm thấy mã giảm giá!' });
    }

    res.json({ success: true, data: coupon });
  } catch (error) {
    console.error('Get coupon by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin mã giảm giá!' });
  }
};

// Create coupon (Admin)
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      quantity,
      maxUsagePerUser,
      couponType,
      isSystem,
      isPublic,
      conditions,
      startDate,
      endDate,
      campaignId,
      isActive,
    } = req.body;

    // Validate required fields
    if (!code || !name || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc!' });
    }

    // Check code exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return res.status(400).json({ error: 'Mã giảm giá đã tồn tại!' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue: Number(discountValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrderValue: minOrderValue ? Number(minOrderValue) : null,
        quantity: quantity ? Number(quantity) : null,
        maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : 1,
        couponType: couponType || 'PUBLIC',
        isSystem: isSystem || false,
        isPublic: isPublic !== false,
        conditions: conditions || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        campaignId: campaignId ? Number(campaignId) : null,
        isActive: isActive !== false,
      },
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo mã giảm giá!' });
  }
};

// Update coupon (Admin)
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      quantity,
      maxUsagePerUser,
      couponType,
      isSystem,
      isPublic,
      conditions,
      startDate,
      endDate,
      campaignId,
      isActive,
    } = req.body;

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCoupon) {
      return res.status(404).json({ error: 'Không tìm thấy mã giảm giá!' });
    }

    // Check code unique if changed
    if (code && code.toUpperCase() !== existingCoupon.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (codeExists) {
        return res.status(400).json({ error: 'Mã giảm giá đã tồn tại!' });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: Number(id) },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(maxDiscount !== undefined && { maxDiscount: maxDiscount ? Number(maxDiscount) : null }),
        ...(minOrderValue !== undefined && { minOrderValue: minOrderValue ? Number(minOrderValue) : null }),
        ...(quantity !== undefined && { quantity: quantity ? Number(quantity) : null }),
        ...(maxUsagePerUser !== undefined && { maxUsagePerUser: Number(maxUsagePerUser) }),
        ...(couponType && { couponType }),
        ...(isSystem !== undefined && { isSystem }),
        ...(isPublic !== undefined && { isPublic }),
        ...(conditions !== undefined && { conditions }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(campaignId !== undefined && { campaignId: campaignId ? Number(campaignId) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: coupon });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật mã giảm giá!' });
  }
};

// Delete coupon (Admin)
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { usageHistory: true } } },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Không tìm thấy mã giảm giá!' });
    }

    // If coupon has been used, soft delete by setting isActive = false
    if (coupon._count.usageHistory > 0) {
      await prisma.coupon.update({
        where: { id: Number(id) },
        data: { isActive: false },
      });
      return res.json({ success: true, message: 'Đã vô hiệu hóa mã giảm giá!' });
    }

    // Hard delete if never used
    await prisma.coupon.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: 'Đã xóa mã giảm giá!' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa mã giảm giá!' });
  }
};

// Get coupon usage history (Admin)
export const getCouponUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [usages, total] = await Promise.all([
      prisma.couponUsage.findMany({
        where: { couponId: Number(id) },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.couponUsage.count({ where: { couponId: Number(id) } }),
    ]);

    res.json({
      success: true,
      data: usages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get coupon usage error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy lịch sử sử dụng!' });
  }
};

// Generate private coupon for specific user (Admin)
export const generatePrivateCoupon = async (req: Request, res: Response) => {
  try {
    const { userId, discountType, discountValue, maxDiscount, minOrderValue, expiresInDays, reason } = req.body;

    if (!userId || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc!' });
    }

    // Generate unique code
    const randomCode = `PRIV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const coupon = await prisma.coupon.create({
      data: {
        code: randomCode,
        name: reason || 'Mã giảm giá riêng',
        description: `Mã riêng cho user #${userId}`,
        discountType,
        discountValue: Number(discountValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minOrderValue: minOrderValue ? Number(minOrderValue) : null,
        quantity: 1,
        maxUsagePerUser: 1,
        couponType: 'PRIVATE',
        isSystem: true,
        isPublic: false,
        isActive: true,
        endDate: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
      },
    });

    // Auto add to user's wallet
    await prisma.userCoupon.create({
      data: {
        userId: Number(userId),
        couponId: coupon.id,
        status: 'AVAILABLE',
        expiresAt: coupon.endDate,
        source: 'SYSTEM',
      },
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Generate private coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo mã giảm giá riêng!' });
  }
};

// =============================================
// ADMIN: CRUD CAMPAIGNS
// =============================================

// Get all campaigns
export const getAllCampaigns = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { coupons: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all campaigns error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách chiến dịch!' });
  }
};

// Get campaign by ID
export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(id) },
      include: {
        coupons: {
          select: {
            id: true,
            code: true,
            name: true,
            discountType: true,
            discountValue: true,
            isActive: true,
            usedCount: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch!' });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin chiến dịch!' });
  }
};

// Create campaign
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, startDate, endDate, isActive } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc!' });
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existingSlug = await prisma.campaign.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      return res.status(400).json({ error: 'Slug đã tồn tại!' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        slug: finalSlug,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
      },
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo chiến dịch!' });
  }
};

// Update campaign
export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, startDate, endDate, isActive } = req.body;

    const existing = await prisma.campaign.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch!' });
    }

    // Check slug unique if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.campaign.findUnique({
        where: { slug },
      });
      if (slugExists) {
        return res.status(400).json({ error: 'Slug đã tồn tại!' });
      }
    }

    const campaign = await prisma.campaign.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật chiến dịch!' });
  }
};

// Delete campaign
export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { coupons: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch!' });
    }

    if (campaign._count.coupons > 0) {
      return res.status(400).json({ 
        error: 'Không thể xóa chiến dịch đang có mã giảm giá! Hãy xóa mã trước hoặc vô hiệu hóa chiến dịch.' 
      });
    }

    await prisma.campaign.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: 'Đã xóa chiến dịch!' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa chiến dịch!' });
  }
};

// =============================================
// ADMIN: CRUD POINT REWARDS
// =============================================

// Get all point rewards
export const getAllPointRewards = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [rewards, total] = await Promise.all([
      prisma.pointReward.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { pointCost: 'asc' },
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.pointReward.count({ where }),
    ]);

    res.json({
      success: true,
      data: rewards,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all point rewards error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách quà!' });
  }
};

// Get point reward by ID
export const getPointRewardById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reward = await prisma.pointReward.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { redemptions: true } },
      },
    });

    if (!reward) {
      return res.status(404).json({ error: 'Không tìm thấy quà!' });
    }

    res.json({ success: true, data: reward });
  } catch (error) {
    console.error('Get point reward by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin quà!' });
  }
};

// Create point reward
export const createPointReward = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      pointCost,
      rewardType,
      couponId,
      discountValue,
      discountType,
      quantity,
      maxPerUser,
      isActive,
      startDate,
      endDate,
    } = req.body;

    if (!name || !pointCost || !rewardType) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc!' });
    }

    const reward = await prisma.pointReward.create({
      data: {
        name,
        description,
        pointCost: Number(pointCost),
        rewardType,
        couponId: couponId ? Number(couponId) : null,
        discountValue: discountValue ? Number(discountValue) : null,
        discountType: discountType || null,
        quantity: quantity ? Number(quantity) : null,
        maxPerUser: maxPerUser ? Number(maxPerUser) : null,
        isActive: isActive !== false,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    console.error('Create point reward error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo quà!' });
  }
};

// Update point reward
export const updatePointReward = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      pointCost,
      rewardType,
      couponId,
      discountValue,
      discountType,
      quantity,
      maxPerUser,
      isActive,
      startDate,
      endDate,
    } = req.body;

    const existing = await prisma.pointReward.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy quà!' });
    }

    const reward = await prisma.pointReward.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(pointCost !== undefined && { pointCost: Number(pointCost) }),
        ...(rewardType && { rewardType }),
        ...(couponId !== undefined && { couponId: couponId ? Number(couponId) : null }),
        ...(discountValue !== undefined && { discountValue: discountValue ? Number(discountValue) : null }),
        ...(discountType !== undefined && { discountType }),
        ...(quantity !== undefined && { quantity: quantity ? Number(quantity) : null }),
        ...(maxPerUser !== undefined && { maxPerUser: maxPerUser ? Number(maxPerUser) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    res.json({ success: true, data: reward });
  } catch (error) {
    console.error('Update point reward error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật quà!' });
  }
};

// Delete point reward
export const deletePointReward = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reward = await prisma.pointReward.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!reward) {
      return res.status(404).json({ error: 'Không tìm thấy quà!' });
    }

    if (reward._count.redemptions > 0) {
      await prisma.pointReward.update({
        where: { id: Number(id) },
        data: { isActive: false },
      });
      return res.json({ success: true, message: 'Đã vô hiệu hóa quà!' });
    }

    await prisma.pointReward.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: 'Đã xóa quà!' });
  } catch (error) {
    console.error('Delete point reward error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa quà!' });
  }
};
