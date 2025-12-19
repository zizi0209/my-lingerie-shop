"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, User, ArrowLeft, Share2, Heart, MessageCircle, Bookmark } from "lucide-react";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Mock data - Trong thực tế sẽ fetch từ API dựa trên slug
  const mockPosts: any = {
    "cach-chon-do-lot-phu-hop-voi-co-the": {
      id: 1,
      slug: "cach-chon-do-lot-phu-hop-voi-co-the",
      title: "Cách chọn đồ lót phù hợp với cơ thể",
      excerpt: "Bí quyết chọn nội y vừa vặn, thoải mái và tôn lên vóc dáng của bạn. Hướng dẫn chi tiết theo từng loại cơ thể khác nhau.",
      image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
      author: {
        name: "Nguyễn Thị Mai",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b332c1ca?q=80&w=400&auto=format&fit=crop",
        bio: "Chuyên gia tư vấn nội y với 10 năm kinh nghiệm"
      },
      date: "15/12/2024",
      readTime: "5 phút đọc",
      category: "Bí quyết thời trang",
      content: `
        <p>Việc chọn đồ lót phù hợp không chỉ giúp bạn cảm thấy thoải mái mà còn ảnh hưởng đến sức khỏe và sự tự tin. Dưới đây là hướng dẫn chi tiết để chọn nội y hoàn hảo cho từng loại cơ thể.</p>

        <h2>1. Xác định đúng size</h2>
        <p>Điều quan trọng nhất khi chọn đồ lót là xác định đúng size. Đối với áo ngực, bạn cần đo hai số liệu:</p>
        <ul>
          <li>Vòng ngực: Đo ngay dưới ngực, thẳng ngang lưng</li>
          <li>Vòng ngực trên: Đo qua phần đầy nhất của ngực</li>
        </ul>
        <p>Size áo ngực được tính bằng cách lấy vòng ngực trên trừ đi vòng ngực dưới. Ví dụ: vòng ngực dưới 75cm, vòng ngực trên 90cm thì size của bạn là 75B.</p>

        <h2>2. Chọn theo dáng người</h2>

        <h3>Người có ngực nhỏ</h3>
        <p>Nên chọn:</p>
        <ul>
          <li>Ao ngực có gọng nâng để tạo độ phồng</li>
          <li>Loại có đệm mút mỏng hoặc dày tùy thích</li>
          <li>Màu sắc sáng và họa tiết để tạo cảm giác đầy đặn</li>
        </ul>

        <h3>Người có ngực lớn</h3>
        <p>Nên chọn:</p>
        <ul>
          <li>Ao ngực không gọng hoặc gọng thép chắc chắn</li>
          <li>Quai ngực rộng để分担 trọng lượng</li>
          <li>Chất liệu co giãn tốt và thoáng khí</li>
        </ul>

        <h2>3. Chất liệu quan trọng</h2>
        <p>Chất liệu quyết định độ thoải mái và sức khỏe:</p>
        <ul>
          <li><strong>Cotton:</strong> Thoáng khí, thấm hút mồ hôi tốt</li>
          <li><strong>Ren:</strong> Đẹp, quyến rũ nhưng cần chọn loại ren mềm</li>
          <li><strong>Lụa:</strong> Mượt mà, sang trọng</li>
          <li><strong>Modal:</strong> Co giãn tốt, mềm mại như cotton</li>
        </ul>

        <h2>4. Màu sắc phù hợp</h2>
        <p>Chọn màu đồ lót dựa trên:</p>
        <ul>
          <li>Màu da: Màu nude, be, hồng nhạt phù hợp với mọi làn da</li>
          <li>Màu quần áo: Màu trắng hoặc nude khi mặc áo sáng màu</li>
          <li>Cá tính: Đen, đỏ, tím cho sự quyến rũ và bí ẩn</li>
        </ul>

        <h2>5. Thay đổi định kỳ</h2>
        <p>Đồ lót cần được thay mới sau 6-12 tháng sử dụng vì:</p>
        <ul>
          <li>Độ đàn hồi giảm theo thời gian</li>
          <li>Vệ sinh và sức khỏe</li>
          <li>Cập nhật kiểu dáng mới</li>
        </ul>

        <p>Hy vọng những chia sẻ trên sẽ giúp bạn chọn được đồ lót phù hợp nhất. Đừng ngần ngại hỏi nhân viên tư vấn tại Lingerie Shop để được hỗ trợ chi tiết hơn!</p>
      `,
      tags: ["size", "chất liệu", "màu sắc", "dáng người"]
    },
    "chat-lieu-do-lot-cao-cap": {
      id: 2,
      slug: "chat-lieu-do-lot-cao-cap",
      title: "Các chất liệu đồ lót cao cấp bạn nên biết",
      excerpt: "Khám phá những chất liệu nội y cao cấp như ren, lụa, modal... và ưu điểm của từng loại trong việc chăm sóc làn da.",
      image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
      author: {
        name: "Trần Hoàng Nam",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop",
        bio: "Giám đốc sáng tạo, chuyên gia về chất liệu vải"
      },
      date: "12/12/2024",
      readTime: "7 phút đọc",
      category: "Chất liệu",
      content: `
        <p>Chất liệu quyết định đến 90% độ thoải mái và chất lượng của đồ lót. Hãy cùng khám phá những chất liệu cao cấp nhất trong ngành nội y.</p>

        <h2>1. Ren Pháp (French Lace)</h2>
        <p>Được mệnh danh là "nữ hoàng của các loại ren", ren Pháp nổi bật với:</p>
        <ul>
          <li>Đường ren tinh xảo, hoa văn sắc nét</li>
          <li>Chất liệu mềm mại, không gây cào xước da</li>
          <li>Độ bền cao, giữ form sau nhiều lần giặt</li>
          <li>Thẩm mỹ sang trọng, quyến rũ</li>
        </ul>

        <h2>2. Lụa Mulberry</h2>
        <p>Loại lụa cao cấp nhất từ tơ tằm con tằm dâu:</p>
        <ul>
          <li>Bề mặt mượt mà, trượt trên da</li>
          <li>Khả năng điều hòa nhiệt độ</li>
          <li>Chống khuẩn tự nhiên</li>
          <li>Bền màu, không bị xù lông</li>
        </ul>

        <h2>3. Modal từ gỗ sồi</h2>
        <p>Sợi tổng hợp từ bột gỗ tự nhiên:</p>
        <ul>
          <li>Mềm hơn cotton 50%</li>
          <li>Khả năng thấm hút vượt trội</li>
          <li>Không nhăn, dễ chăm sóc</li>
          <li>Thân thiện với môi trường</li>
        </ul>

        <h2>4. Microfiber cao cấp</h2>
        <p>Sợi tổng hợp siêu mảnh:</p>
        <ul>
          <li>Nhẹ như không</li>
          <li>Khô nhanh</li>
          <li>Giữ form hoàn hảo</li>
          <li>Chống bám bụi</li>
        </ul>

        <p>Chọn đúng chất liệu sẽ giúp bạn cảm thấy thoải mái cả ngày dài. Hãy đến Lingerie Shop để trải nghiệm trực tiếp các chất liệu cao cấp này!</p>
      `,
      tags: ["ren", "lụa", "modal", "microfiber"]
    }
  };

  const allRelatedPosts = [
    {
      id: 3,
      slug: "bao-quan-do-lot-dung-cach",
      title: "Bảo quản đồ lót đúng cách để bền đẹp",
      image: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop",
      date: "10/12/2024",
      readTime: "4 phút đọc"
    },
    {
      id: 4,
      slug: "xu-huong-do-lot-2025",
      title: "Xu hướng đồ lót 2025: Đừng bỏ lỡ!",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
      date: "08/12/2024",
      readTime: "6 phút đọc"
    },
    {
      id: 5,
      slug: "size-do-lot-chuan-nhat",
      title: "Cách đo size đồ lót chuẩn nhất",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332c1ca?q=80&w=2070&auto=format&fit=crop",
      date: "03/12/2024",
      readTime: "5 phút đọc"
    }
  ];

  useEffect(() => {
    // Fetch post data based on slug
    const postData = mockPosts[params.slug as keyof typeof mockPosts];
    if (postData) {
      setPost(postData);
      setRelatedPosts(allRelatedPosts);
    }
  }, [params.slug]);

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Bài viết không tồn tại</h1>
          <Link href="/bai-viet" className="text-rose-600 hover:text-rose-700">
            ← Quay lại danh sách bài viết
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/bai-viet"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại bài viết
      </Link>

      <article className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-light mb-6">
            {post.title}
          </h1>

          <p className="text-xl text-gray-600 mb-6">{post.excerpt}</p>

          {/* Author Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="relative w-12 h-12 rounded-full overflow-hidden">
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{post.author.name}</h3>
              <p className="text-sm text-gray-600">{post.author.bio}</p>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-8">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Social Actions */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isLiked
                ? 'bg-rose-100 text-rose-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>Thích</span>
          </button>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isBookmarked
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>Lưu lại</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
            <Share2 className="w-5 h-5" />
            <span>Chia sẻ</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
            <MessageCircle className="w-5 h-5" />
            <span>Bình luận</span>
          </button>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        <div className="mb-12 pb-12 border-b">
          <h3 className="text-lg font-medium mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related Posts */}
        <section>
          <h3 className="text-2xl font-serif font-light mb-6">Bài viết liên quan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map(relatedPost => (
              <article key={relatedPost.id} className="group cursor-pointer">
                <Link href={`/bai-viet/${relatedPost.slug}`}>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4">
                    <Image
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <h4 className="font-medium group-hover:text-rose-600 transition line-clamp-2">
                    {relatedPost.title}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {relatedPost.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {relatedPost.readTime}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-serif font-light mb-4">
            Khám phá bộ sưu tập nội y cao cấp
          </h3>
          <p className="text-gray-600 mb-6">
            Áp dụng kiến thức từ bài viết để chọn được sản phẩm hoàn hảo cho bạn
          </p>
          <Link
            href="/san-pham"
            className="ck-button inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-900 transition"
          >
            Xem sản phẩm
          </Link>
        </div>
      </article>
    </div>
  );
}