import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Ngưỡng abandoned: 1 giờ không hoạt động
const ABANDONED_THRESHOLD_MS = 60 * 60 * 1000;

// Helper: Check và update trạng thái recovered nếu cart từng bị abandoned
const checkAndUpdateRecoveredStatus = async (cartId: number) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: {
      updatedAt: true,
      lastAbandonedAt: true,
      recoveredCount: true,
      items: { select: { id: true } },
    },
  });

  if (!cart || cart.items.length === 0) return;

  const abandonedThreshold = new Date(Date.now() - ABANDONED_THRESHOLD_MS);
  const wasAbandoned = cart.updatedAt < abandonedThreshold;

  if (wasAbandoned) {
    // Cart đang ở trạng thái abandoned, user quay lại → mark as recovered
    await prisma.cart.update({
      where: { id: cartId },
      data: {
        lastAbandonedAt: cart.updatedAt, // Lưu lại thời điểm abandoned
        recoveredCount: { increment: 1 },
      },
    });
  }
};

// Tính discount amount dựa vào coupon
const calculateDiscount = (coupon: {
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
}, orderTotal: number): number => {
  if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
    return 0;
  }

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = (orderTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === 'FIXED_AMOUNT') {
    discount = coupon.discountValue;
  }

  return Math.min(discount, orderTotal);
};

// Get cart by userId or sessionId
export const getCart = async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = req.query;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'userId hoặc sessionId là bắt buộc!' });
    }

    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (sessionId) where.sessionId = String(sessionId);

    const cartInclude = {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              salePrice: true,
              images: {
                take: 1,
                select: { url: true },
              },
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              size: true,
              colorId: true,
              color: { select: { id: true, name: true, hexCode: true } },
              stock: true,
              price: true,
              salePrice: true,
            },
          },
        },
      },
      discountCoupon: {
        select: {
          id: true,
          code: true,
          name: true,
          discountType: true,
          discountValue: true,
          maxDiscount: true,
          minOrderValue: true,
        },
      },
      shippingCoupon: {
        select: {
          id: true,
          code: true,
          name: true,
          discountType: true,
          discountValue: true,
        },
      },
    };

    let cart = await prisma.cart.findFirst({
      where,
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId ? Number(userId) : null,
          sessionId: sessionId ? String(sessionId) : null,
        },
        include: cartInclude,
      });
    }

    // Calculate discount if coupon applied
    let discountAmount = 0;
    if (cart.discountCoupon) {
      const subtotal = cart.items.reduce((sum: number, item) => {
        const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
        return sum + price * item.quantity;
      }, 0);
      discountAmount = calculateDiscount(cart.discountCoupon, subtotal);
    }

    res.json({
      success: true,
      data: {
        id: cart.id,
        userId: cart.userId,
        sessionId: cart.sessionId,
        discountCouponCode: cart.discountCouponCode,
        discountCouponId: cart.discountCouponId,
        shippingCouponCode: cart.shippingCouponCode,
        shippingCouponId: cart.shippingCouponId,
        usePoints: cart.usePoints,
        items: cart.items,
        discountCoupon: cart.discountCoupon,
        shippingCoupon: cart.shippingCoupon,
        discountAmount,
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy giỏ hàng!' });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const { cartId, productId, variantId, quantity = 1 } = req.body;

    if (!cartId || !productId) {
      return res.status(400).json({ error: 'cartId và productId là bắt buộc!' });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: Number(cartId) },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    // Check nếu cart từng bị abandoned và user quay lại
    await checkAndUpdateRecoveredStatus(Number(cartId));

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: Number(cartId),
        productId: Number(productId),
        variantId: variantId ? Number(variantId) : null,
      },
    });

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: Number(quantity) } },
        include: {
          product: true,
          variant: true,
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: Number(cartId),
          productId: Number(productId),
          variantId: variantId ? Number(variantId) : null,
          quantity: Number(quantity),
        },
        include: {
          product: true,
          variant: true,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: cartItem,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Lỗi khi thêm sản phẩm vào giỏ hàng!' });
  }
};

// Update cart item quantity and/or variant
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, variantId } = req.body;

    if (quantity !== undefined && quantity < 1) {
      return res.status(400).json({ error: 'Số lượng phải lớn hơn 0!' });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(id) },
      include: { cart: true }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng!' });
    }

    // Check nếu cart từng bị abandoned và user quay lại
    await checkAndUpdateRecoveredStatus(cartItem.cartId);

    // If changing variant, check if new variant exists and has stock
    if (variantId !== undefined) {
      const newVariant = await prisma.productVariant.findUnique({
        where: { id: Number(variantId) }
      });

      if (!newVariant) {
        return res.status(404).json({ error: 'Không tìm thấy phân loại sản phẩm!' });
      }

      if (newVariant.productId !== cartItem.productId) {
        return res.status(400).json({ error: 'Phân loại không thuộc sản phẩm này!' });
      }

      const requestedQty = quantity || cartItem.quantity;
      if (newVariant.stock < requestedQty) {
        return res.status(400).json({ error: `Chỉ còn ${newVariant.stock} sản phẩm trong kho!` });
      }

      // Check if same variant already exists in cart (merge if so)
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cartItem.cartId,
          productId: cartItem.productId,
          variantId: Number(variantId),
          id: { not: cartItem.id }
        }
      });

      if (existingItem) {
        // Merge: add quantity to existing item and delete current
        const newQuantity = Math.min(existingItem.quantity + (quantity || cartItem.quantity), newVariant.stock);
        
        await prisma.$transaction([
          prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity }
          }),
          prisma.cartItem.delete({
            where: { id: cartItem.id }
          })
        ]);

        const mergedItem = await prisma.cartItem.findUnique({
          where: { id: existingItem.id },
          include: {
            product: {
              include: { images: { take: 1 } }
            },
            variant: true
          }
        });

        return res.json({
          success: true,
          data: mergedItem,
          merged: true
        });
      }
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: Number(id) },
      data: {
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(variantId !== undefined && { variantId: Number(variantId) })
      },
      include: {
        product: {
          include: { images: { take: 1 } }
        },
        variant: true,
      },
    });

    res.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật giỏ hàng!' });
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(id) },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ hàng!' });
    }

    await prisma.cartItem.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng!',
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa sản phẩm khỏi giỏ hàng!' });
  }
};

// Clear cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cart = await prisma.cart.findUnique({
      where: { id: Number(id) },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa tất cả sản phẩm khỏi giỏ hàng!',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa giỏ hàng!' });
  }
};

// =============================================
// VOUCHER STACKING: Tam giác giảm giá
// Cho phép: 1 Mã giảm giá + 1 Mã Ship + Điểm tích lũy
// =============================================

// Helper: Validate coupon
const validateCoupon = async (code: string, subtotal: number, category: 'DISCOUNT' | 'SHIPPING') => {
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      category,
      startDate: { lte: new Date() },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
  });

  if (!coupon) {
    return { error: 'Mã không hợp lệ hoặc đã hết hạn!' };
  }

  // Check min order value
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    const needed = coupon.minOrderValue - subtotal;
    return { 
      error: `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}₫`,
      suggestion: `Mua thêm ${needed.toLocaleString('vi-VN')}₫ để dùng mã này`,
    };
  }

  // Check quantity
  if (coupon.quantity !== null && coupon.usedCount >= coupon.quantity) {
    return { error: 'Mã đã hết lượt sử dụng!' };
  }

  return { coupon };
};

// Apply DISCOUNT coupon (mã giảm giá đơn hàng)
export const applyDiscountCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã giảm giá!' });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: { select: { price: true, salePrice: true } },
            variant: { select: { price: true, salePrice: true } },
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const result = await validateCoupon(code, subtotal, 'DISCOUNT');
    if (result.error) {
      return res.status(400).json({ error: result.error, suggestion: result.suggestion });
    }

    const coupon = result.coupon!;
    const discountAmount = calculateDiscount(coupon, subtotal);

    await prisma.cart.update({
      where: { id: Number(id) },
      data: {
        discountCouponId: coupon.id,
        discountCouponCode: coupon.code,
      },
    });

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
        },
        discountAmount,
      },
      message: 'Áp dụng mã giảm giá thành công!',
    });
  } catch (error) {
    console.error('Apply discount coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi áp dụng mã giảm giá!' });
  }
};

// Apply SHIPPING coupon (mã freeship/giảm ship)
export const applyShippingCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Vui lòng nhập mã vận chuyển!' });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: { select: { price: true, salePrice: true } },
            variant: { select: { price: true, salePrice: true } },
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const result = await validateCoupon(code, subtotal, 'SHIPPING');
    if (result.error) {
      return res.status(400).json({ error: result.error, suggestion: result.suggestion });
    }

    const coupon = result.coupon!;

    await prisma.cart.update({
      where: { id: Number(id) },
      data: {
        shippingCouponId: coupon.id,
        shippingCouponCode: coupon.code,
      },
    });

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
      },
      message: 'Áp dụng mã vận chuyển thành công!',
    });
  } catch (error) {
    console.error('Apply shipping coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi áp dụng mã vận chuyển!' });
  }
};

// Remove discount coupon
export const removeDiscountCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.cart.update({
      where: { id: Number(id) },
      data: {
        discountCouponId: null,
        discountCouponCode: null,
      },
    });

    res.json({ success: true, message: 'Đã gỡ mã giảm giá!' });
  } catch (error) {
    console.error('Remove discount coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi gỡ mã giảm giá!' });
  }
};

// Remove shipping coupon
export const removeShippingCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.cart.update({
      where: { id: Number(id) },
      data: {
        shippingCouponId: null,
        shippingCouponCode: null,
      },
    });

    res.json({ success: true, message: 'Đã gỡ mã vận chuyển!' });
  } catch (error) {
    console.error('Remove shipping coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi gỡ mã vận chuyển!' });
  }
};

// Update points usage
export const updatePointsUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points } = req.body;
    const userId = (req as Request & { user?: { id: number } }).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng điểm!' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    const requestedPoints = Math.max(0, Number(points) || 0);
    const usePoints = Math.min(requestedPoints, user.pointBalance);

    await prisma.cart.update({
      where: { id: Number(id) },
      data: { usePoints },
    });

    res.json({
      success: true,
      data: {
        usePoints,
        pointsDiscount: usePoints * 10, // 100 điểm = 1,000đ => 1 điểm = 10đ
      },
      message: usePoints > 0 ? `Sử dụng ${usePoints} điểm` : 'Đã hủy sử dụng điểm',
    });
  } catch (error) {
    console.error('Update points usage error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật điểm!' });
  }
};

// Calculate cart total with all discounts
export const calculateCartTotal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shippingFee = 30000 } = req.body;

    const cart = await prisma.cart.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: { select: { price: true, salePrice: true } },
            variant: { select: { price: true, salePrice: true } },
          },
        },
        discountCoupon: true,
        shippingCoupon: true,
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    // STEP 1: Subtotal (tiền hàng)
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    // STEP 2: Discount amount (mã giảm giá - chỉ tính trên subtotal)
    let discountAmount = 0;
    if (cart.discountCoupon) {
      discountAmount = calculateDiscount(cart.discountCoupon, subtotal);
    }
    const subtotalAfterDiscount = subtotal - discountAmount;

    // STEP 3: Add shipping fee
    const actualShippingFee = Number(shippingFee);
    const totalBeforeShippingDiscount = subtotalAfterDiscount + actualShippingFee;

    // STEP 4: Shipping discount (mã ship - chỉ trừ tối đa = phí ship)
    let shippingDiscount = 0;
    if (cart.shippingCoupon) {
      if (cart.shippingCoupon.discountType === 'FREE_SHIPPING') {
        shippingDiscount = actualShippingFee;
      } else if (cart.shippingCoupon.discountType === 'FIXED_AMOUNT') {
        shippingDiscount = Math.min(cart.shippingCoupon.discountValue, actualShippingFee);
      } else if (cart.shippingCoupon.discountType === 'PERCENTAGE') {
        shippingDiscount = Math.min(
          (actualShippingFee * cart.shippingCoupon.discountValue) / 100,
          actualShippingFee
        );
      }
    }
    const totalAfterVouchers = totalBeforeShippingDiscount - shippingDiscount;

    // STEP 5: Points discount (100 điểm = 1,000đ)
    const pointsDiscount = (cart.usePoints || 0) * 10;
    const grandTotal = Math.max(0, totalAfterVouchers - pointsDiscount);

    res.json({
      success: true,
      data: {
        itemCount: cart.items.length,
        subtotal,
        discountCoupon: cart.discountCoupon ? {
          code: cart.discountCoupon.code,
          name: cart.discountCoupon.name,
        } : null,
        discountAmount,
        shippingFee: actualShippingFee,
        shippingCoupon: cart.shippingCoupon ? {
          code: cart.shippingCoupon.code,
          name: cart.shippingCoupon.name,
        } : null,
        shippingDiscount,
        usePoints: cart.usePoints || 0,
        pointsDiscount,
        grandTotal,
      },
    });
  } catch (error) {
    console.error('Calculate cart total error:', error);
    res.status(500).json({ error: 'Lỗi khi tính tổng giỏ hàng!' });
  }
};

// Get available vouchers for cart (phân loại)
export const getAvailableVouchers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user?: { id: number } }).user?.id;

    const cart = await prisma.cart.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: { select: { price: true, salePrice: true } },
            variant: { select: { price: true, salePrice: true } },
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Không tìm thấy giỏ hàng!' });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const now = new Date();

    // Get public vouchers
    const publicVouchers = await prisma.coupon.findMany({
      where: {
        isActive: true,
        isPublic: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        discountType: true,
        discountValue: true,
        maxDiscount: true,
        minOrderValue: true,
        endDate: true,
      },
    });

    // Get user's wallet vouchers if logged in
    let walletVouchers: typeof publicVouchers = [];
    if (userId) {
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
              category: true,
              discountType: true,
              discountValue: true,
              maxDiscount: true,
              minOrderValue: true,
              endDate: true,
              isActive: true,
            },
          },
        },
      });
      walletVouchers = userCoupons
        .filter(uc => uc.coupon.isActive)
        .map(uc => uc.coupon);
    }

    // Combine and dedupe
    const allVouchersMap = new Map<number, typeof publicVouchers[0]>();
    [...publicVouchers, ...walletVouchers].forEach(v => allVouchersMap.set(v.id, v));
    const allVouchers = Array.from(allVouchersMap.values());

    // Separate by category and check eligibility
    const discountVouchers = allVouchers
      .filter(v => v.category === 'DISCOUNT')
      .map(v => ({
        ...v,
        eligible: !v.minOrderValue || subtotal >= v.minOrderValue,
        amountNeeded: v.minOrderValue ? Math.max(0, v.minOrderValue - subtotal) : 0,
        discountAmount: !v.minOrderValue || subtotal >= v.minOrderValue
          ? calculateDiscount(v, subtotal)
          : 0,
      }))
      .sort((a, b) => b.discountAmount - a.discountAmount);

    const shippingVouchers = allVouchers
      .filter(v => v.category === 'SHIPPING')
      .map(v => ({
        ...v,
        eligible: !v.minOrderValue || subtotal >= v.minOrderValue,
        amountNeeded: v.minOrderValue ? Math.max(0, v.minOrderValue - subtotal) : 0,
      }))
      .sort((a, b) => (b.discountValue || 0) - (a.discountValue || 0));

    res.json({
      success: true,
      data: {
        subtotal,
        discountVouchers,
        shippingVouchers,
      },
    });
  } catch (error) {
    console.error('Get available vouchers error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách mã!' });
  }
};

// Legacy: Apply coupon (backward compatible - auto detect category)
export const applyCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Mã giảm giá là bắt buộc!' });
    }

    // Find coupon to detect category
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!coupon) {
      return res.status(400).json({ error: 'Mã không hợp lệ hoặc đã hết hạn!' });
    }

    // Redirect to appropriate handler based on category
    if (coupon.category === 'SHIPPING') {
      return applyShippingCoupon(req, res);
    } else {
      return applyDiscountCoupon(req, res);
    }
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi áp dụng mã!' });
  }
};

// Legacy: Remove coupon (backward compatible)
export const removeCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.cart.update({
      where: { id: Number(id) },
      data: {
        discountCouponId: null,
        discountCouponCode: null,
        shippingCouponId: null,
        shippingCouponCode: null,
      },
    });

    res.json({ success: true, message: 'Đã gỡ tất cả mã giảm giá!' });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ error: 'Lỗi khi gỡ mã!' });
  }
};
