import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

    let cart = await prisma.cart.findFirst({
      where,
      include: {
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
                colorName: true,
                stock: true,
                price: true,
                salePrice: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId ? Number(userId) : null,
          sessionId: sessionId ? String(sessionId) : null,
        },
        include: {
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
                  colorName: true,
                  stock: true,
                  price: true,
                  salePrice: true,
                },
              },
            },
          },
        },
      });
    }

    res.json({
      success: true,
      data: cart,
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
