import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * GET /api/filters
 * Lấy tất cả filter options cho trang sản phẩm
 * Query params:
 * - categoryId: (optional) lọc theo danh mục
 */
export const getFilters = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;
    const categoryFilter = categoryId ? { categoryId: Number(categoryId) } : {};

    // 1. Lấy danh sách màu sắc từ bảng Color (có sản phẩm)
    let colorOptions: { id: number; name: string; hexCode: string | null; count: number }[] = [];
    
    // Lấy colors có sản phẩm trong category (nếu có)
    const productColors = await prisma.productColor.findMany({
      where: {
        product: {
          isVisible: true,
          deletedAt: null,
          ...categoryFilter,
        },
      },
      select: {
        colorId: true,
        color: {
          select: {
            id: true,
            name: true,
            hexCode: true,
            order: true,
          },
        },
      },
      distinct: ['colorId'],
    });

    // Map to unique colors
    const colorMap = new Map<number, { id: number; name: string; hexCode: string; order: number }>();
    productColors.forEach(pc => {
      if (!colorMap.has(pc.colorId)) {
        colorMap.set(pc.colorId, pc.color);
      }
    });

    colorOptions = Array.from(colorMap.values())
      .sort((a, b) => a.order - b.order)
      .map(c => ({
        id: c.id,
        name: c.name,
        hexCode: c.hexCode,
        count: 0,
      }));

    // 2. Lấy danh sách size từ ProductVariant
    const variantSizes = await prisma.productVariant.findMany({
      where: {
        stock: { gt: 0 }, // Chỉ lấy size còn hàng
        product: {
          isVisible: true,
          deletedAt: null,
          ...categoryFilter,
        },
      },
      select: {
        size: true,
      },
      distinct: ['size'],
    });

    // Sắp xếp size theo thứ tự logic
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '30A', '30B', '32A', '32B', '32C', '34A', '34B', '34C', '36A', '36B', '36C', '38B', '38C'];
    const sizeOptions = variantSizes
      .map(v => v.size)
      .sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    // 3. Lấy price range
    const priceStats = await prisma.product.aggregate({
      where: {
        isVisible: true,
        deletedAt: null,
        ...categoryFilter,
      },
      _min: { price: true },
      _max: { price: true },
    });

    // 4. Lấy các Attribute khác (không phải COLOR) cho danh mục
    let otherAttributes: {
      id: number;
      name: string;
      slug: string;
      type: string;
      values: { id: number; value: string; slug: string }[];
    }[] = [];

    if (categoryId) {
      const categoryAttrs = await prisma.categoryAttribute.findMany({
        where: { categoryId: Number(categoryId) },
        orderBy: { order: 'asc' },
        include: {
          attribute: {
            include: {
              values: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      otherAttributes = categoryAttrs
        .filter(ca => ca.attribute.type !== 'COLOR' && ca.attribute.isFilterable)
        .map(ca => ({
          id: ca.attribute.id,
          name: ca.attribute.name,
          slug: ca.attribute.slug,
          type: ca.attribute.type,
          values: ca.attribute.values.map(v => ({
            id: v.id,
            value: v.value,
            slug: v.slug,
          })),
        }));
    }

    res.json({
      success: true,
      data: {
        colors: colorOptions,
        sizes: sizeOptions,
        priceRange: {
          min: priceStats._min.price || 0,
          max: priceStats._max.price || 10000000,
        },
        attributes: otherAttributes,
      },
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy bộ lọc!' });
  }
};
