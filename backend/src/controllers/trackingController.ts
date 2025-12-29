import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Track page view
export const trackPageView = async (req: Request, res: Response) => {
  try {
    const { path, userId, sessionId, ipAddress, userAgent, referer } = req.body;

    if (!path || !sessionId) {
      return res.status(400).json({ error: 'path và sessionId là bắt buộc!' });
    }

    const pageView = await prisma.pageView.create({
      data: {
        path,
        userId: userId ? Number(userId) : null,
        sessionId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        referer: referer || null,
      },
    });

    res.status(201).json({
      success: true,
      data: pageView,
    });
  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({ error: 'Lỗi khi tracking page view!' });
  }
};

// Get page view analytics
export const getPageViewAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, path, limit = 10 } = req.query;

    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: new Date(String(startDate)) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) };
    }
    if (path) {
      where.path = { contains: String(path) };
    }

    const [total, pageViews] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.groupBy({
        by: ['path'],
        where,
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: Number(limit),
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        topPages: pageViews.map((pv) => ({
          path: pv.path,
          views: pv._count.path,
        })),
      },
    });
  } catch (error) {
    console.error('Get page view analytics error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê page view!' });
  }
};

// Track product view
export const trackProductView = async (req: Request, res: Response) => {
  try {
    const { productId, userId, sessionId } = req.body;

    if (!productId || !sessionId) {
      return res.status(400).json({ error: 'productId và sessionId là bắt buộc!' });
    }

    const productView = await prisma.productView.create({
      data: {
        productId: Number(productId),
        userId: userId ? Number(userId) : null,
        sessionId,
      },
    });

    res.status(201).json({
      success: true,
      data: productView,
    });
  } catch (error) {
    console.error('Track product view error:', error);
    res.status(500).json({ error: 'Lỗi khi tracking product view!' });
  }
};

// Get product view analytics
export const getProductViewAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: new Date(String(startDate)) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) };
    }

    const [total, productViews] = await Promise.all([
      prisma.productView.count({ where }),
      prisma.productView.groupBy({
        by: ['productId'],
        where,
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: Number(limit),
      }),
    ]);

    const productIds = productViews.map((pv) => pv.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: { take: 1, select: { url: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    res.json({
      success: true,
      data: {
        total,
        topProducts: productViews.map((pv) => ({
          product: productMap.get(pv.productId),
          views: pv._count.productId,
        })),
      },
    });
  } catch (error) {
    console.error('Get product view analytics error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê product view!' });
  }
};

// Track cart event
export const trackCartEvent = async (req: Request, res: Response) => {
  try {
    const { event, cartId, productId, userId, sessionId, data } = req.body;

    if (!event || !sessionId) {
      return res.status(400).json({ error: 'event và sessionId là bắt buộc!' });
    }

    const cartEvent = await prisma.cartEvent.create({
      data: {
        event,
        cartId: cartId ? Number(cartId) : null,
        productId: productId ? Number(productId) : null,
        userId: userId ? Number(userId) : null,
        sessionId,
        data: data || null,
      },
    });

    res.status(201).json({
      success: true,
      data: cartEvent,
    });
  } catch (error) {
    console.error('Track cart event error:', error);
    res.status(500).json({ error: 'Lỗi khi tracking cart event!' });
  }
};

// Get cart event analytics
export const getCartEventAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, event } = req.query;

    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: new Date(String(startDate)) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) };
    }
    if (event) {
      where.event = String(event);
    }

    const [total, eventGroups] = await Promise.all([
      prisma.cartEvent.count({ where }),
      prisma.cartEvent.groupBy({
        by: ['event'],
        where,
        _count: { event: true },
        orderBy: { _count: { event: 'desc' } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        events: eventGroups.map((eg) => ({
          event: eg.event,
          count: eg._count.event,
        })),
      },
    });
  } catch (error) {
    console.error('Get cart event analytics error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê cart event!' });
  }
};
