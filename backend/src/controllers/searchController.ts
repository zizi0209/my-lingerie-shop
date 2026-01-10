import { Request, Response } from 'express';
import {
  smartSearch,
  getPopularKeywords,
  getSearchSuggestions,
} from '../services/searchService';

// Smart search endpoint
export const search = async (req: Request, res: Response) => {
  try {
    const {
      q,
      page = 1,
      limit = 20,
      categoryId,
      minPrice,
      maxPrice,
      colors,
      sizes,
      sortBy,
    } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Từ khóa tìm kiếm là bắt buộc',
      });
    }

    // Parse colors and sizes from comma-separated string
    const colorList = colors
      ? String(colors).split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;
    const sizeList = sizes
      ? String(sizes).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await smartSearch(q, {
      page: Number(page),
      limit: Number(limit),
      categoryId: categoryId ? Number(categoryId) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      colors: colorList,
      sizes: sizeList,
      sortBy: sortBy ? String(sortBy) : undefined,
      // userId and sessionId can be extracted from auth middleware if needed
    });

    res.json({
      success: true,
      data: result.products,
      filters: result.filters,
      meta: result.meta,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi tìm kiếm sản phẩm',
    });
  }
};

// Get popular keywords
export const popularKeywords = async (_req: Request, res: Response) => {
  try {
    const keywords = await getPopularKeywords();
    res.json({
      success: true,
      data: keywords,
    });
  } catch (error) {
    console.error('Popular keywords error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy từ khóa phổ biến',
    });
  }
};

// Search suggestions (autocomplete)
export const suggestions = async (req: Request, res: Response) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        data: { products: [], categories: [] },
      });
    }

    const result = await getSearchSuggestions(q, Number(limit));
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy gợi ý tìm kiếm',
    });
  }
};
