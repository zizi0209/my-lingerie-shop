import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /wishlist - Lấy danh sách yêu thích của user
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;

    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { take: 1 },
            category: { select: { name: true, slug: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: items.map(item => ({
        id: item.id,
        productId: item.productId,
        addedAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          salePrice: item.product.salePrice,
          image: item.product.images[0]?.url || null,
          category: item.product.category,
          isVisible: item.product.isVisible,
        }
      }))
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách yêu thích!' });
  }
};

// POST /wishlist - Thêm sản phẩm vào wishlist
export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Thiếu productId!' });
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Sản phẩm đã có trong danh sách yêu thích!' });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId,
        productId: Number(productId)
      },
      include: {
        product: {
          include: {
            images: { take: 1 }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Đã thêm vào danh sách yêu thích!',
      data: {
        id: item.id,
        productId: item.productId,
        addedAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          salePrice: item.product.salePrice,
          image: item.product.images[0]?.url || null,
        }
      }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Lỗi khi thêm vào danh sách yêu thích!' });
  }
};

// DELETE /wishlist/:productId - Xóa sản phẩm khỏi wishlist
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;
    const { productId } = req.params;

    const item = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Sản phẩm không có trong danh sách yêu thích!' });
    }

    await prisma.wishlistItem.delete({
      where: { id: item.id }
    });

    res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích!'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa khỏi danh sách yêu thích!' });
  }
};

// GET /wishlist/check/:productId - Kiểm tra sản phẩm có trong wishlist không
export const checkInWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;
    const { productId } = req.params;

    const item = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    res.json({
      success: true,
      data: {
        isInWishlist: !!item
      }
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ error: 'Lỗi khi kiểm tra danh sách yêu thích!' });
  }
};

// POST /wishlist/toggle - Toggle (thêm/xóa) sản phẩm trong wishlist
export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Thiếu productId!' });
    }

    // Check if exists
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    if (existing) {
      // Remove
      await prisma.wishlistItem.delete({
        where: { id: existing.id }
      });

      return res.json({
        success: true,
        data: { isInWishlist: false },
        message: 'Đã xóa khỏi danh sách yêu thích!'
      });
    } else {
      // Check product exists
      const product = await prisma.product.findUnique({
        where: { id: Number(productId) }
      });

      if (!product) {
        return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
      }

      // Add
      await prisma.wishlistItem.create({
        data: {
          userId,
          productId: Number(productId)
        }
      });

      return res.json({
        success: true,
        data: { isInWishlist: true },
        message: 'Đã thêm vào danh sách yêu thích!'
      });
    }
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật danh sách yêu thích!' });
  }
};
