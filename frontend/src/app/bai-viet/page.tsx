"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, User, ArrowRight, Search, Filter } from "lucide-react";

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Mock blog posts data
  const blogPosts = [
    {
      id: 1,
      slug: "cach-chon-do-lot-phu-hop-voi-co-the",
      title: "Cách chọn đồ lót phù hợp với cơ thể",
      excerpt: "Bí quyết chọn nội y vừa vặn, thoải mái và tôn lên vóc dáng của bạn. Hướng dẫn chi tiết theo từng loại cơ thể khác nhau.",
      image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
      author: "Nguyễn Thị Mai",
      date: "15/12/2024",
      readTime: "5 phút đọc",
      category: "Bí quyết thời trang",
      featured: true
    },
    {
      id: 2,
      slug: "chat-lieu-do-lot-cao-cap",
      title: "Các chất liệu đồ lót cao cấp bạn nên biết",
      excerpt: "Khám phá những chất liệu nội y cao cấp như ren, lụa, modal... và ưu điểm của từng loại trong việc chăm sóc làn da.",
      image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
      author: "Trần Hoàng Nam",
      date: "12/12/2024",
      readTime: "7 phút đọc",
      category: "Chất liệu",
      featured: false
    },
    {
      id: 3,
      slug: "bao-quan-do-lot-dung-cach",
      title: "Bảo quản đồ lót đúng cách để bền đẹp",
      excerpt: "Hướng dẫn chi tiết cách giặt, phơi và bảo quản nội y để sản phẩm luôn bền đẹp và giữ được form dáng.",
      image: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop",
      author: "Lê Thu An",
      date: "10/12/2024",
      readTime: "4 phút đọc",
      category: "Chăm sóc",
      featured: false
    },
    {
      id: 4,
      slug: "xu-huong-do-lot-2025",
      title: "Xu hướng đồ lót 2025: Đừng bỏ lỡ!",
      excerpt: "Cập nhật những xu hướng nội y mới nhất năm 2025: màu sắc, kiểu dáng và chất liệu đang thịnh hành.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
      author: "Nguyễn Thị Mai",
      date: "08/12/2024",
      readTime: "6 phút đọc",
      category: "Xu hướng",
      featured: true
    },
    {
      id: 5,
      slug: "do-lot-cho-phu-nu-mang-thai",
      title: "Đồ lót cho phụ nữ mang thai: Thoải mái và an toàn",
      excerpt: "Gợi ý những mẫu nội y phù hợp cho bà bầu, giúp mẹ bầu luôn thoải mái trong suốt thai kỳ.",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop",
      author: "Trần Hoàng Nam",
      date: "05/12/2024",
      readTime: "8 phút đọc",
      category: "Đặc biệt",
      featured: false
    },
    {
      id: 6,
      slug: "size-do-lot-chuan-nhat",
      title: "Cách đo size đồ lót chuẩn nhất",
      excerpt: "Hướng dẫn chi tiết cách đo vòng ngực và size áo ngực chính xác để chọn được sản phẩm phù hợp.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332c1ca?q=80&w=2070&auto=format&fit=crop",
      author: "Lê Thu An",
      date: "03/12/2024",
      readTime: "5 phút đọc",
      category: "Hướng dẫn",
      featured: false
    }
  ];

  const categories = [
    { id: "all", name: "Tất cả" },
    { id: "bi-quyet", name: "Bí quyết thời trang" },
    { id: "chat-lieu", name: "Chất liệu" },
    { id: "cham-soc", name: "Chăm sóc" },
    { id: "xu-huong", name: "Xu hướng" },
    { id: "dac-biet", name: "Đặc biệt" },
    { id: "huong-dan", name: "Hướng dẫn" }
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" ||
                           post.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = blogPosts.filter(post => post.featured);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-light mb-4">Tin tức & Bài viết</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Cập nhật kiến thức, bí quyết và xu hướng mới nhất về nội y để luôn tự tin và quyến rũ.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-light mb-6">Bài viết nổi bật</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredPosts.map(post => (
              <article key={post.id} className="group cursor-pointer">
                <Link href={`/bai-viet/${post.slug}`}>
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden mb-4">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition duration-300"></div>
                    <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1 rounded-full text-sm">
                      Nổi bật
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-xl font-medium group-hover:text-rose-600 transition">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {post.author}
                      </span>
                      <span className="text-rose-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                        Đọc thêm
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* All Posts */}
      <section>
        <h2 className="text-2xl font-serif font-light mb-6">
          {selectedCategory === "all" ? "Tất cả bài viết" : categories.find(c => c.id === selectedCategory)?.name}
        </h2>
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <article key={post.id} className="group cursor-pointer">
                <Link href={`/bai-viet/${post.slug}`}>
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden mb-4">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition duration-300"></div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                      {post.category}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium group-hover:text-rose-600 transition line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {post.author}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Không tìm thấy bài viết nào phù hợp.</p>
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-serif font-light mb-4">
          Đăng ký nhận tin
        </h2>
        <p className="text-gray-600 mb-6">
          Nhận thông tin về sản phẩm mới, khuyến mãi và các bài viết hữu ích hàng tuần
        </p>
        <form className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Email của bạn"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            className="ck-button px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition"
          >
            Đăng ký
          </button>
        </form>
      </section>
    </div>
  );
}