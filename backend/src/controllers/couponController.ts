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

// =============================================
// USER: PUBLIC VOUCHERS & WALLET
// =============================================

// Get public vouchers (can be collected)
export const getPublicVouchers = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const vouchers = await prisma.coupon.findMany({
      where: {
        isActive: true,
        isPublic: true,
        isSystem: false,
        startDate: { lte: now },
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
        quantity: true,
        usedCount: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ success: true, data: vouchers });
  } catch (error) {
    console.error('Get public vouchers error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách voucher!' });
  }
};

// Get user's voucher wallet
export const getMyVouchers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const now = new Date();

    const userCoupons = await prisma.userCoupon.findMany({
      where: {
        userId,
        status: 'AVAILABLE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
      include: {
        coupon: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            discountType: true,
            discountValue: true,
            maxDiscount: true,
            minOrderValue: true,
            couponType: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out inactive coupons
    const validCoupons = userCoupons.filter(uc => uc.coupon.isActive);

    res.json({ success: true, data: validCoupons });
  } catch (error) {
    console.error('Get my vouchers error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy ví voucher!' });
  }
};

// Collect (save) a public voucher to wallet
export const collectVoucher = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const { code } = req.params;
    const now = new Date();

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Không tìm thấy mã giảm giá!' });
    }

    // Validate coupon
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết hiệu lực!' });
    }

    if (!coupon.isPublic && coupon.couponType !== 'NEW_USER') {
      return res.status(400).json({ error: 'Mã giảm giá không công khai!' });
    }

    if (coupon.startDate > now) {
      return res.status(400).json({ error: 'Mã giảm giá chưa bắt đầu!' });
    }

    if (coupon.endDate && coupon.endDate < now) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết hạn!' });
    }

    // Check quantity
    if (coupon.quantity !== null && coupon.usedCount >= coupon.quantity) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng!' });
    }

    // Check if already collected
    const existing = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: { userId, couponId: coupon.id },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Bạn đã lưu mã này rồi!' });
    }

    // Calculate expiry for user (use coupon endDate or 30 days from now)
    const expiresAt = coupon.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create user coupon
    const userCoupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponId: coupon.id,
        status: 'AVAILABLE',
        expiresAt,
        source: 'COLLECTED',
      },
      include: {
        coupon: {
          select: {
            code: true,
            name: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Đã lưu mã giảm giá vào ví!',
      data: userCoupon,
    });
  } catch (error) {
    console.error('Collect voucher error:', error);
    res.status(500).json({ error: 'Lỗi khi lưu mã giảm giá!' });
  }
};

// Validate voucher for checkout
export const validateVoucher = async (req: Request, res: Response) => {
  try {
    const { code, orderTotal } = req.body;
    const userId = (req as any).user?.id;
    const now = new Date();

    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã giảm giá!' });
    }

    // Find coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Mã giảm giá không tồn tại!' });
    }

    // Basic validation
    if (!coupon.isActive) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết hiệu lực!' });
    }

    if (coupon.startDate > now) {
      return res.status(400).json({ error: 'Mã giảm giá chưa bắt đầu!' });
    }

    if (coupon.endDate && coupon.endDate < now) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết hạn!' });
    }

    // Check quantity
    if (coupon.quantity !== null && coupon.usedCount >= coupon.quantity) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết lượt!' });
    }

    // Check min order value
    if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
      return res.status(400).json({
        error: `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ`,
      });
    }

    // Check user-specific usage if logged in
    if (userId) {
      const usageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });

      if (usageCount >= coupon.maxUsagePerUser) {
        return res.status(400).json({ error: 'Bạn đã sử dụng hết lượt cho mã này!' });
      }

      // Check private coupon - must be in user's wallet
      if (coupon.couponType === 'PRIVATE' || coupon.couponType === 'NEW_USER') {
        const userCoupon = await prisma.userCoupon.findUnique({
          where: { userId_couponId: { userId, couponId: coupon.id } },
        });

        if (!userCoupon || userCoupon.status !== 'AVAILABLE') {
          return res.status(400).json({ error: 'Mã giảm giá không có trong ví của bạn!' });
        }
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'FREE_SHIPPING') {
      discountAmount = 0; // Handled separately in checkout
    }

    // Don't discount more than order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        discountAmount: Math.round(discountAmount),
        finalTotal: Math.round(orderTotal - discountAmount),
      },
    });
  } catch (error) {
    console.error('Validate voucher error:', error);
    res.status(500).json({ error: 'Lỗi khi kiểm tra mã giảm giá!' });
  }
};

// Get user's points info
export const getMyPoints = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pointBalance: true,
        totalSpent: true,
        memberTier: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user!' });
    }

    // Get recent point history
    const history = await prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        balance: user.pointBalance,
        totalSpent: user.totalSpent,
        tier: user.memberTier,
        history,
      },
    });
  } catch (error) {
    console.error('Get my points error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin điểm!' });
  }
};

// Get available rewards for user
export const getAvailableRewards = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const rewards = await prisma.pointReward.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      orderBy: { pointCost: 'asc' },
    });

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Get available rewards error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách quà!' });
  }
};

// Redeem points for reward
export const redeemReward = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const { id } = req.params;
    const now = new Date();

    // Get user and reward
    const [user, reward] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.pointReward.findUnique({ where: { id: Number(id) } }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user!' });
    }

    if (!reward) {
      return res.status(404).json({ error: 'Không tìm thấy quà!' });
    }

    // Validate reward
    if (!reward.isActive) {
      return res.status(400).json({ error: 'Quà đã hết hiệu lực!' });
    }

    if (reward.startDate > now) {
      return res.status(400).json({ error: 'Quà chưa bắt đầu!' });
    }

    if (reward.endDate && reward.endDate < now) {
      return res.status(400).json({ error: 'Quà đã hết hạn!' });
    }

    // Check quantity
    if (reward.quantity !== null && reward.redeemedCount >= reward.quantity) {
      return res.status(400).json({ error: 'Quà đã hết!' });
    }

    // Check user's points
    if (user.pointBalance < reward.pointCost) {
      return res.status(400).json({
        error: `Bạn cần ${reward.pointCost} điểm, hiện có ${user.pointBalance} điểm`,
      });
    }

    // Check max per user
    if (reward.maxPerUser) {
      const userRedemptions = await prisma.rewardRedemption.count({
        where: { userId, rewardId: reward.id },
      });
      if (userRedemptions >= reward.maxPerUser) {
        return res.status(400).json({ error: 'Bạn đã đổi tối đa quà này!' });
      }
    }

    // Process redemption in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct points
      const newBalance = user.pointBalance - reward.pointCost;
      await tx.user.update({
        where: { id: userId },
        data: { pointBalance: newBalance },
      });

      // Create point history
      await tx.pointHistory.create({
        data: {
          userId,
          type: 'BURN',
          amount: -reward.pointCost,
          balance: newBalance,
          source: 'REDEEM',
          sourceId: String(reward.id),
          description: `Đổi quà: ${reward.name}`,
        },
      });

      // Update reward count
      await tx.pointReward.update({
        where: { id: reward.id },
        data: { redeemedCount: { increment: 1 } },
      });

      // Create redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: reward.id,
          pointSpent: reward.pointCost,
          resultType: reward.rewardType,
        },
      });

      // If reward type is DISCOUNT, create a coupon for user
      let userCoupon = null;
      if (reward.rewardType === 'DISCOUNT' && reward.discountValue) {
        // Create private coupon
        const couponCode = `RWD${Date.now().toString(36).toUpperCase()}`;
        const coupon = await tx.coupon.create({
          data: {
            code: couponCode,
            name: reward.name,
            description: `Đổi từ ${reward.pointCost} điểm`,
            discountType: reward.discountType || 'FIXED_AMOUNT',
            discountValue: reward.discountValue,
            quantity: 1,
            maxUsagePerUser: 1,
            couponType: 'PRIVATE',
            isSystem: true,
            isPublic: false,
            isActive: true,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });

        userCoupon = await tx.userCoupon.create({
          data: {
            userId,
            couponId: coupon.id,
            status: 'AVAILABLE',
            expiresAt: coupon.endDate,
            source: 'REWARD',
          },
          include: { coupon: true },
        });

        // Update redemption with result
        await tx.rewardRedemption.update({
          where: { id: redemption.id },
          data: { resultId: String(userCoupon.id) },
        });
      }

      return { redemption, userCoupon, newBalance };
    });

    res.json({
      success: true,
      message: 'Đổi quà thành công!',
      data: {
        pointsSpent: reward.pointCost,
        newBalance: result.newBalance,
        reward: reward.name,
        voucher: result.userCoupon?.coupon,
      },
    });
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({ error: 'Lỗi khi đổi quà!' });
  }
};

// Calculate points preview for checkout
const TIER_POINT_RATES: Record<string, number> = {
  BRONZE: 0.01,
  SILVER: 0.015,
  GOLD: 0.02,
  PLATINUM: 0.03,
};

export const calculatePointsPreview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { orderTotal } = req.body;

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({ error: 'Giá trị đơn hàng không hợp lệ!' });
    }

    // Guest users - show base rate
    if (!userId) {
      const basePoints = Math.floor(orderTotal / 100);
      return res.json({
        success: true,
        data: {
          pointsToEarn: basePoints,
          pointRate: 1,
          tier: null,
          isBirthdayMonth: false,
          message: 'Đăng nhập để tích điểm thưởng!',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { memberTier: true, birthday: true, pointBalance: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    let pointRate = TIER_POINT_RATES[user.memberTier || 'BRONZE'] || 0.01;
    let isBirthdayMonth = false;

    if (user.birthday) {
      const now = new Date();
      const birthday = new Date(user.birthday);
      if (now.getMonth() === birthday.getMonth()) {
        pointRate *= 2;
        isBirthdayMonth = true;
      }
    }

    const pointsToEarn = Math.floor((orderTotal / 100) * (pointRate / 0.01));

    res.json({
      success: true,
      data: {
        pointsToEarn,
        pointRate: pointRate * 100,
        tier: user.memberTier || 'BRONZE',
        currentPoints: user.pointBalance,
        isBirthdayMonth,
      },
    });
  } catch (error) {
    console.error('Calculate points preview error:', error);
    res.status(500).json({ error: 'Lỗi khi tính điểm!' });
  }
};
