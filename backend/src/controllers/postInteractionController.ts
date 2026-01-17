import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Like/Unlike a post
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const post = await prisma.post.findFirst({
      where: { id: Number(postId), deletedAt: null, isPublished: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: Number(postId), userId } },
    });

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.postLike.delete({ where: { id: existingLike.id } }),
        prisma.post.update({
          where: { id: Number(postId) },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);

      return res.json({
        success: true,
        data: { isLiked: false, likeCount: post.likeCount - 1 },
        message: 'Đã bỏ thích bài viết',
      });
    } else {
      // Like
      await prisma.$transaction([
        prisma.postLike.create({ data: { postId: Number(postId), userId } }),
        prisma.post.update({
          where: { id: Number(postId) },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      return res.json({
        success: true,
        data: { isLiked: true, likeCount: post.likeCount + 1 },
        message: 'Đã thích bài viết',
      });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Lỗi khi thích bài viết!' });
  }
};

// Bookmark/Unbookmark a post
export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const post = await prisma.post.findFirst({
      where: { id: Number(postId), deletedAt: null, isPublished: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    const existingBookmark = await prisma.postBookmark.findUnique({
      where: { postId_userId: { postId: Number(postId), userId } },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.postBookmark.delete({ where: { id: existingBookmark.id } });

      return res.json({
        success: true,
        data: { isBookmarked: false },
        message: 'Đã bỏ lưu bài viết',
      });
    } else {
      // Add bookmark
      await prisma.postBookmark.create({ data: { postId: Number(postId), userId } });

      return res.json({
        success: true,
        data: { isBookmarked: true },
        message: 'Đã lưu bài viết',
      });
    }
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ error: 'Lỗi khi lưu bài viết!' });
  }
};

// Get user's bookmarked posts
export const getBookmarkedPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!userId) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập!' });
    }

    const [bookmarks, total] = await Promise.all([
      prisma.postBookmark.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              thumbnail: true,
              views: true,
              likeCount: true,
              publishedAt: true,
              createdAt: true,
              category: {
                select: { id: true, name: true, slug: true },
              },
              author: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      }),
      prisma.postBookmark.count({ where: { userId } }),
    ]);

    // Filter out deleted/unpublished posts
    const validBookmarks = bookmarks.filter(
      (b) => b.post && !('deletedAt' in b.post && b.post.deletedAt)
    );

    res.json({
      success: true,
      data: validBookmarks.map((b) => ({
        bookmarkId: b.id,
        bookmarkedAt: b.createdAt,
        ...b.post,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get bookmarked posts error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách bài viết đã lưu!' });
  }
};

// Get like/bookmark status for a post (for logged-in user)
export const getPostInteractionStatus = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    const post = await prisma.post.findFirst({
      where: { id: Number(postId), deletedAt: null },
      select: { likeCount: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      const [like, bookmark] = await Promise.all([
        prisma.postLike.findUnique({
          where: { postId_userId: { postId: Number(postId), userId } },
        }),
        prisma.postBookmark.findUnique({
          where: { postId_userId: { postId: Number(postId), userId } },
        }),
      ]);

      isLiked = !!like;
      isBookmarked = !!bookmark;
    }

    res.json({
      success: true,
      data: {
        isLiked,
        isBookmarked,
        likeCount: post.likeCount,
      },
    });
  } catch (error) {
    console.error('Get post interaction status error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy trạng thái tương tác!' });
  }
};
