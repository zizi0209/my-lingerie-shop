import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = String(status);
    if (userId) where.userId = Number(userId);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
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
                  slug: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách đơn hàng!' });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
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
                slug: true,
                price: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng!' });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin đơn hàng!' });
  }
};

// Get order by order number (public - for tracking)
export const getOrderByNumber = async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
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
                slug: true,
                price: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy đơn hàng với mã này!' 
      });
    }

    // Mask sensitive info for public access
    const maskedOrder = {
      ...order,
      shippingPhone: order.shippingPhone 
        ? order.shippingPhone.slice(0, 4) + '****' + order.shippingPhone.slice(-2)
        : null,
      user: order.user ? {
        name: order.user.name,
        email: order.user.email 
          ? order.user.email.split('@')[0].slice(0, 3) + '***@' + order.user.email.split('@')[1]
          : null,
      } : null,
      guestInfo: order.guestInfo ? {
        ...(order.guestInfo as Record<string, unknown>),
        phone: (order.guestInfo as Record<string, string>).phone 
          ? (order.guestInfo as Record<string, string>).phone.slice(0, 4) + '****' + (order.guestInfo as Record<string, string>).phone.slice(-2)
          : null,
        email: (order.guestInfo as Record<string, string>).email
          ? (order.guestInfo as Record<string, string>).email.split('@')[0].slice(0, 3) + '***@' + (order.guestInfo as Record<string, string>).email.split('@')[1]
          : null,
      } : null,
    };

    res.json({
      success: true,
      data: maskedOrder,
    });
  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin đơn hàng!' });
  }
};

// Create order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      guestInfo,
      orderNumber,
      shippingAddress,
      shippingCity,
      shippingPhone,
      shippingMethod,
      paymentMethod,
      totalAmount,
      shippingFee = 0,
      discount = 0,
      notes,
      items,
      // Coupon support
      couponCode,
      couponDiscount = 0,
    } = req.body;

    // Validate required fields
    if (!shippingAddress || !shippingPhone || !totalAmount || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc: shippingAddress, shippingPhone, totalAmount, items',
      });
    }

    // Generate order number if not provided
    const generatedOrderNumber =
      orderNumber || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if order number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber: generatedOrderNumber },
    });

    if (existingOrder) {
      return res.status(400).json({ error: 'Mã đơn hàng đã tồn tại!' });
    }

    // Validate products exist and have enough stock (if using variants)
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return res.status(404).json({
          error: `Không tìm thấy sản phẩm với ID: ${item.productId}`,
        });
      }
    }

    // Validate and process coupon if provided
    let validatedCouponCode: string | null = null;
    let validatedCouponDiscount = 0;
    let couponId: number | null = null;

    if (couponCode && userId) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        validatedCouponCode = coupon.code;
        validatedCouponDiscount = Number(couponDiscount) || 0;
        couponId = coupon.id;
      }
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber: generatedOrderNumber,
        userId: userId ? Number(userId) : null,
        guestInfo: guestInfo || null,
        shippingAddress,
        shippingCity: shippingCity || null,
        shippingPhone,
        shippingMethod: shippingMethod || null,
        paymentMethod: paymentMethod || 'COD',
        totalAmount: Number(totalAmount),
        shippingFee: Number(shippingFee),
        discount: Number(discount) + validatedCouponDiscount,
        couponCode: validatedCouponCode,
        couponDiscount: validatedCouponDiscount,
        notes: notes || null,
        status: 'PENDING',
        items: {
          create: items.map((item: unknown) => {
            const orderItem = item as { productId: number; quantity: number; price: number; variant?: string };
            return {
              productId: Number(orderItem.productId),
              quantity: Number(orderItem.quantity),
              price: Number(orderItem.price),
              variant: orderItem.variant || null,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update coupon usage if coupon was applied
    if (couponId && userId) {
      try {
        // Update UserCoupon status
        await prisma.userCoupon.updateMany({
          where: {
            userId: Number(userId),
            couponId: couponId,
            status: 'AVAILABLE',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
            usedOrderId: order.id,
          },
        });

        // Increment coupon usedCount
        await prisma.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });

        // Record coupon usage
        await prisma.couponUsage.create({
          data: {
            couponId: couponId,
            userId: Number(userId),
            orderId: order.id,
            discountAmount: validatedCouponDiscount,
            orderTotal: Number(totalAmount),
          },
        });
      } catch (couponError) {
        // Log but don't fail the order
        console.error('Failed to update coupon usage:', couponError);
      }
    }

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo đơn hàng!' });
  }
};

// Update order
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      trackingNumber,
      shippingMethod,
      paymentStatus,
      paidAt,
      notes,
      cancelledAt,
    } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng!' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paidAt) updateData.paidAt = new Date(paidAt);
    if (notes !== undefined) updateData.notes = notes;
    if (cancelledAt) updateData.cancelledAt = new Date(cancelledAt);

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật đơn hàng!' });
  }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng!' });
    }

    if (existingOrder.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Đơn hàng đã bị hủy trước đó!' });
    }

    if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'SHIPPING') {
      return res.status(400).json({
        error: 'Không thể hủy đơn hàng đã hoàn thành hoặc đang giao!',
      });
    }

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Đã hủy đơn hàng thành công!',
      data: order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Lỗi khi hủy đơn hàng!' });
  }
};
