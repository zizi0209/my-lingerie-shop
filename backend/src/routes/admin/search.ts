import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

// ==========================================
// SYNONYMS CRUD
// ==========================================

// GET /api/admin/search/synonyms - List all synonyms
router.get('/synonyms', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const searchValue = typeof search === 'string'
      ? search
      : Array.isArray(search)
        ? (typeof search[0] === 'string' ? search[0] : undefined)
        : undefined;
    const skip = (Number(page) - 1) * Number(limit);

    const where = searchValue
      ? {
          OR: [
            { word: { contains: searchValue, mode: 'insensitive' as const } },
            { synonym: { contains: searchValue, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [synonyms, total] = await Promise.all([
      prisma.searchSynonym.findMany({
        where,
        orderBy: { hitCount: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.searchSynonym.count({ where }),
    ]);

    res.json({
      success: true,
      data: synonyms,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get synonyms error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy danh sách từ đồng nghĩa' });
  }
});

// POST /api/admin/search/synonyms - Create synonym
router.post('/synonyms', async (req, res) => {
  try {
    const { word, synonym } = req.body;

    if (!word || !synonym) {
      return res.status(400).json({ success: false, error: 'Từ gốc và từ đồng nghĩa là bắt buộc' });
    }

    // Check if word already exists
    const existing = await prisma.searchSynonym.findUnique({
      where: { word: word.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Từ này đã tồn tại' });
    }

    const newSynonym = await prisma.searchSynonym.create({
      data: {
        word: word.toLowerCase().trim(),
        synonym: synonym.trim(),
      },
    });

    res.status(201).json({ success: true, data: newSynonym });
  } catch (error) {
    console.error('Create synonym error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi tạo từ đồng nghĩa' });
  }
});

// PUT /api/admin/search/synonyms/:id - Update synonym
router.put('/synonyms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { word, synonym, isActive } = req.body;

    const existing = await prisma.searchSynonym.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy từ đồng nghĩa' });
    }

    // Check for duplicate word if changing
    if (word && word.toLowerCase().trim() !== existing.word) {
      const duplicate = await prisma.searchSynonym.findUnique({
        where: { word: word.toLowerCase().trim() },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Từ này đã tồn tại' });
      }
    }

    const updated = await prisma.searchSynonym.update({
      where: { id: Number(id) },
      data: {
        ...(word && { word: word.toLowerCase().trim() }),
        ...(synonym && { synonym: synonym.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update synonym error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật từ đồng nghĩa' });
  }
});

// DELETE /api/admin/search/synonyms/:id - Delete synonym
router.delete('/synonyms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.searchSynonym.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: 'Đã xóa từ đồng nghĩa' });
  } catch (error) {
    console.error('Delete synonym error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi xóa từ đồng nghĩa' });
  }
});

// ==========================================
// KEYWORDS CRUD
// ==========================================

// GET /api/admin/search/keywords - List all keywords
router.get('/keywords', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [keywords, total] = await Promise.all([
      prisma.searchKeyword.findMany({
        orderBy: { order: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.searchKeyword.count(),
    ]);

    res.json({
      success: true,
      data: keywords,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get keywords error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy danh sách từ khóa' });
  }
});

// POST /api/admin/search/keywords - Create keyword
router.post('/keywords', async (req, res) => {
  try {
    const { keyword, type, config, displayName, icon, order, isPinned } = req.body;

    if (!keyword || !type || !displayName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Từ khóa, loại và tên hiển thị là bắt buộc' 
      });
    }

    // Check if keyword already exists
    const existing = await prisma.searchKeyword.findUnique({
      where: { keyword: keyword.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Từ khóa này đã tồn tại' });
    }

    const newKeyword = await prisma.searchKeyword.create({
      data: {
        keyword: keyword.toLowerCase().trim(),
        type,
        config: config || {},
        displayName,
        icon,
        order: order || 0,
        isPinned: isPinned || false,
      },
    });

    res.status(201).json({ success: true, data: newKeyword });
  } catch (error) {
    console.error('Create keyword error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi tạo từ khóa' });
  }
});

// PUT /api/admin/search/keywords/:id - Update keyword
router.put('/keywords/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, type, config, displayName, icon, order, isActive, isPinned } = req.body;

    const existing = await prisma.searchKeyword.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy từ khóa' });
    }

    // Check for duplicate keyword if changing
    if (keyword && keyword.toLowerCase().trim() !== existing.keyword) {
      const duplicate = await prisma.searchKeyword.findUnique({
        where: { keyword: keyword.toLowerCase().trim() },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Từ khóa này đã tồn tại' });
      }
    }

    const updated = await prisma.searchKeyword.update({
      where: { id: Number(id) },
      data: {
        ...(keyword && { keyword: keyword.toLowerCase().trim() }),
        ...(type && { type }),
        ...(config && { config }),
        ...(displayName && { displayName }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(isPinned !== undefined && { isPinned }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update keyword error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật từ khóa' });
  }
});

// DELETE /api/admin/search/keywords/:id - Delete keyword
router.delete('/keywords/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.searchKeyword.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true, message: 'Đã xóa từ khóa' });
  } catch (error) {
    console.error('Delete keyword error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi xóa từ khóa' });
  }
});

// ==========================================
// SEARCH ANALYTICS
// ==========================================

// GET /api/admin/search/analytics - Search statistics
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Top searched keywords
    const topKeywords = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: { createdAt: { gte: daysAgo } },
      _count: { keyword: true },
      _avg: { results: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: 20,
    });

    // Keywords with no results (potential synonyms to add)
    const noResultKeywords = await prisma.searchLog.groupBy({
      by: ['keyword'],
      where: {
        createdAt: { gte: daysAgo },
        results: 0,
      },
      _count: { keyword: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: 10,
    });

    // Total searches
    const totalSearches = await prisma.searchLog.count({
      where: { createdAt: { gte: daysAgo } },
    });

    // Searches per day
    const searchesPerDay = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "SearchLog"
      WHERE "createdAt" >= ${daysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    // Synonym usage stats
    const topSynonyms = await prisma.searchSynonym.findMany({
      where: { hitCount: { gt: 0 } },
      orderBy: { hitCount: 'desc' },
      take: 10,
      select: { word: true, synonym: true, hitCount: true },
    });

    res.json({
      success: true,
      data: {
        totalSearches,
        topKeywords: topKeywords.map((k) => ({
          keyword: k.keyword,
          count: k._count.keyword,
          avgResults: Math.round(k._avg.results || 0),
        })),
        noResultKeywords: noResultKeywords.map((k) => ({
          keyword: k.keyword,
          count: k._count.keyword,
        })),
        searchesPerDay,
        topSynonyms,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy thống kê' });
  }
});

export default router;
