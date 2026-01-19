'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, Calendar, Eye, TrendingUp, ExternalLink, Sparkles } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  thumbnail?: string;
  publishedAt: string;
  views: number;
  category: {
    name: string;
    slug: string;
  };
}

interface RelatedPostsProps {
  productId: number;
  className?: string;
}

export default function RelatedPosts({ productId, className = '' }: RelatedPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`${baseUrl}/product-posts/products/${productId}/posts`);
        const data = await response.json();
        if (data.success) {
          setPosts(data.data.map((item: any) => item.post).filter(Boolean));
        }
      } catch (error) {
        console.error('Error fetching related posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [productId, baseUrl]);

  // Track click for analytics
  const handlePostClick = (post: Post) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'related_post_click_from_product', {
        post_id: post.id,
        post_title: post.title,
        product_id: productId,
      });
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <section className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              Bài viết liên quan
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Khám phá cách sử dụng và phối đồ cho sản phẩm này
            </p>
          </div>
        </div>
        {posts.length > 3 && (
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
          >
            <span>Xem tất cả</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.slice(0, 6).map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            onClick={() => handlePostClick(post)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 overflow-hidden">
              {post.thumbnail ? (
                <Image
                  src={post.thumbnail}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Category badge */}
              <div className="absolute top-3 left-3">
                <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full text-xs font-bold text-purple-600 dark:text-purple-400 shadow-lg">
                  {post.category.name}
                </div>
              </div>

              {/* Views */}
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{post.views}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:gap-3 transition-all">
                  <span>Đọc ngay</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Hover effect gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Link>
        ))}
      </div>

      {/* View all link for mobile */}
      {posts.length > 3 && (
        <div className="mt-6 text-center md:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/50"
          >
            <span>Xem tất cả bài viết</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
