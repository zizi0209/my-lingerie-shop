"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Calendar, Eye, Heart, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface BookmarkedPost {
  bookmarkId: number;
  bookmarkedAt: string;
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  views: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  author: {
    id: number;
    name: string | null;
    avatar: string | null;
  };
}

interface BookmarksResponse {
  success: boolean;
  data: BookmarkedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function SavedPostsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login-register?redirect=/tai-khoan/bai-viet-da-luu");
      return;
    }

    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        const res = await api.get<BookmarksResponse>("/posts/me/bookmarks");
        if (res.success) {
          setPosts(res.data);
        }
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookmarks();
    }
  }, [user, authLoading, router]);

  const handleRemoveBookmark = async (postId: number) => {
    setRemoving(postId);
    try {
      await api.post(`/posts/${postId}/bookmark`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Error removing bookmark:", err);
    } finally {
      setRemoving(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="w-6 h-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-serif font-light text-gray-900 dark:text-white">
          Bài viết đã lưu
        </h1>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Chưa có bài viết nào được lưu
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Lưu lại những bài viết hay để đọc sau nhé!
          </p>
          <Link
            href="/bai-viet"
            className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
          >
            Khám phá bài viết
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex gap-4"
            >
              {/* Thumbnail */}
              <Link
                href={`/bai-viet/${post.slug}`}
                className="relative w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0"
              >
                {post.thumbnail ? (
                  <Image
                    src={post.thumbnail}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bookmark className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/bai-viet?category=${post.category.id}`}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {post.category.name}
                    </Link>
                    <Link href={`/bai-viet/${post.slug}`}>
                      <h3 className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition line-clamp-2 mt-1">
                        {post.title}
                      </h3>
                    </Link>
                    {post.excerpt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 hidden md:block">
                        {post.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveBookmark(post.id)}
                    disabled={removing === post.id}
                    className="p-2 text-gray-400 hover:text-red-500 transition shrink-0"
                    title="Bỏ lưu"
                  >
                    {removing === post.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.publishedAt || post.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {post.likeCount}
                  </span>
                  <span className="text-gray-400">
                    Đã lưu {formatDate(post.bookmarkedAt)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
