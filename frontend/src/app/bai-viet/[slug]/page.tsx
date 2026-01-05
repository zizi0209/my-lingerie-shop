"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Share2,
  Heart,
  Bookmark,
  Eye,
  Loader2,
  Facebook,
  Twitter,
} from "lucide-react";

interface Author {
  id: number;
  name: string | null;
  avatar: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  content: string;
  author: Author;
  category: Category;
  views: number;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${baseUrl}/posts/slug/${resolvedParams.slug}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Không tìm thấy bài viết");
          return;
        }

        setPost(data.data);

        // Fetch related posts from same category
        const relatedRes = await fetch(
          `${baseUrl}/posts?categoryId=${data.data.category.id}&limit=3&isPublished=true`
        );
        const relatedData = await relatedRes.json();
        if (relatedData.success) {
          setRelatedPosts(
            relatedData.data.filter((p: Post) => p.id !== data.data.id).slice(0, 3)
          );
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        setError("Có lỗi xảy ra khi tải bài viết");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [baseUrl, resolvedParams.slug]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} phút đọc`;
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post?.title || "";

    switch (platform) {
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        alert("Đã sao chép link!");
        break;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-medium mb-4 text-gray-900 dark:text-white">
          {error || "Bài viết không tồn tại"}
        </h1>
        <Link
          href="/bai-viet"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài viết
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/bai-viet"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại bài viết
      </Link>

      <article className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link
              href={`/bai-viet?category=${post.category.id}`}
              className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full hover:bg-primary-200 dark:hover:bg-primary-900/50 transition"
            >
              {post.category.name}
            </Link>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {estimateReadTime(post.content)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views} lượt xem
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">{post.excerpt}</p>
          )}

          {/* Author Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name || "Author"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {post.author.name || "Ẩn danh"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tác giả</p>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.thumbnail && (
          <div className="relative aspect-video rounded-lg overflow-hidden mb-8">
            <Image src={post.thumbnail} alt={post.title} fill className="object-cover" />
          </div>
        )}

        {/* Social Actions */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isLiked
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span>Thích</span>
          </button>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isBookmarked
                ? "bg-black dark:bg-white text-white dark:text-black"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
            <span>Lưu lại</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500 dark:text-gray-400">Chia sẻ:</span>
            <button
              onClick={() => handleShare("facebook")}
              className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
              title="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleShare("twitter")}
              className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-900/50 transition"
              title="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleShare("copy")}
              className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Sao chép link"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none mb-12
            prose-headings:font-serif prose-headings:font-light
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-li:text-gray-700 dark:prose-li:text-gray-300
            prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags / Category */}
        <div className="mb-12 pb-12 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Danh mục</h3>
          <Link
            href={`/bai-viet?category=${post.category.id}`}
            className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {post.category.name}
          </Link>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section>
            <h3 className="text-2xl font-serif font-light mb-6 text-gray-900 dark:text-white">
              Bài viết liên quan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <article key={relatedPost.id} className="group cursor-pointer">
                  <Link href={`/bai-viet/${relatedPost.slug}`}>
                    <div className="relative aspect-4/3 rounded-lg overflow-hidden mb-4">
                      {relatedPost.thumbnail ? (
                        <Image
                          src={relatedPost.thumbnail}
                          alt={relatedPost.title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image</span>
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition line-clamp-2">
                      {relatedPost.title}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(relatedPost.publishedAt || relatedPost.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {relatedPost.views}
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-serif font-light mb-4 text-gray-900 dark:text-white">
            Khám phá bộ sưu tập nội y cao cấp
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Áp dụng kiến thức từ bài viết để chọn được sản phẩm hoàn hảo cho bạn
          </p>
          <Link
            href="/san-pham"
            className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
          >
            Xem sản phẩm
          </Link>
        </div>
      </article>
    </div>
  );
}
