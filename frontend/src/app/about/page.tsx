import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart, Award, Users, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative h-[600px] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop"
            alt="About Hero"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-serif font-light mb-6">
            Vẻ đẹp từ sự
            <br />
            <span className="italic">tự tin</span>
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed">
            Lingerie Shop - Nơi vẻ đẹp và sự tự tin được tôn vinh
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm text-gray-500 uppercase tracking-wider mb-4 block">
              Câu chuyện của chúng tôi
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">
              Khởi đầu từ tình yêu
              <br />
              với vẻ đẹp Việt
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Lingerie Shop ra đời vào năm 2020 với sứ mệnh mang đến những sản phẩm nội y
                cao cấp, không chỉ đẹp về thiết kế mà còn vượt trội về chất lượng. Chúng tôi tin rằng
                mỗi người phụ nữ đều xứng đáng được cảm thấy tự tin và quyến rũ trong chính cơ thể của mình.
              </p>
              <p>
                Với hơn 4 năm phát triển, chúng tôi đã phục vụ hơn 50.000 khách hàng trên toàn quốc,
                nhận được những phản hồi tích cực và trở thành thương hiệu nội y được tín nhiệm.
              </p>
              <p>
                Mỗi sản phẩm tại Lingerie Shop đều được lựa chọn kỹ lưỡng từ những nhà cung cấp uy tín,
                đảm bảo chất liệu an toàn, thoải mái và thiết kế tinh tế, phù hợp với vóc dáng người Việt.
              </p>
            </div>
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 text-black hover:text-rose-600 transition font-medium mt-8"
            >
              Khám phá bộ sưu tập
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="relative aspect-4/5 rounded-lg overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop"
              alt="Brand Story"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">
              Giá trị cốt lõi
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Những nguyên tắc định hình nên Lingerie Shop
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Value 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Tâm huyết</h3>
              <p className="text-gray-600 text-sm">
                Mỗi sản phẩm đều là kết quả của quá trình nghiên cứu và lựa chọn kỹ lưỡng,
                đảm bảo mang lại trải nghiệm tốt nhất cho khách hàng.
              </p>
            </div>

            {/* Value 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Chất lượng</h3>
              <p className="text-gray-600 text-sm">
                Cam kết 100% sản phẩm chính hãng, chất liệu cao cấp,
                an toàn cho sức khỏe và bền đẹp theo thời gian.
              </p>
            </div>

            {/* Value 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Khách hàng</h3>
              <p className="text-gray-600 text-sm">
                Lấy khách hàng làm trung tâm, luôn lắng nghe và cải thiện
                để mang đến dịch vụ tốt nhất.
              </p>
            </div>

            {/* Value 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Sáng tạo</h3>
              <p className="text-gray-600 text-sm">
                Không ngừng cập nhật xu hướng mới nhất,
                mang đến những thiết kế độc đáo và thời thượng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">
            Đội ngũ của chúng tôi
          </h2>
          <p className="text-gray-600">
            Những người tâm huyết xây dựng Lingerie Shop
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Member 1 */}
          <div className="text-center">
            <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1494790108755-2616b332c1ca?q=80&w=400&auto=format&fit=crop"
                alt="CEO"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-xl font-medium mb-1">Nguyễn Thị Mai</h3>
            <p className="text-gray-600 mb-3">Nhà sáng lập & CEO</p>
            <p className="text-sm text-gray-500">
              Với hơn 10 năm kinh nghiệm trong ngành thời trang,
              chị Mai đã dẫn dắt Lingerie Shop trở thành thương hiệu uy tín.
            </p>
          </div>

          {/* Team Member 2 */}
          <div className="text-center">
            <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop"
                alt="Creative Director"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-xl font-medium mb-1">Trần Hoàng Nam</h3>
            <p className="text-gray-600 mb-3">Giám đốc Sáng tạo</p>
            <p className="text-sm text-gray-500">
              Chịu trách nhiệm về thiết kế và phát triển sản phẩm,
              đảm bảo tính độc đáo và thẩm mỹ cho từng mẫu mã.
            </p>
          </div>

          {/* Team Member 3 */}
          <div className="text-center">
            <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop"
                alt="Customer Service"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-xl font-medium mb-1">Lê Thu An</h3>
            <p className="text-gray-600 mb-3">Trưởng CSKH</p>
            <p className="text-sm text-gray-500">
              Đầu tư xây dựng đội ngũ chăm sóc khách hàng chuyên nghiệp,
                luôn sẵn sàng hỗ trợ 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4">
              Thành tựu nổi bật
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">50K+</div>
              <p className="text-gray-600">Khách hàng tin tưởng</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">500+</div>
              <p className="text-gray-600">Sản phẩm đa dạng</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">4.9/5</div>
              <p className="text-gray-600">Đánh giá trung bình</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">15</div>
              <p className="text-gray-600">Giải thưởng thiết kế</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-black text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-light mb-4">
            Hãy cùng chúng tôi viết tiếp câu chuyện
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Cảm ơn bạn đã đồng hành cùng Lingerie Shop.
            Hãy khám phá bộ sưu tập mới nhất và trải nghiệm sự khác biệt.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/san-pham"
              className="ck-button inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-lg hover:bg-gray-100 transition font-medium"
            >
              Khám phá ngay
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-white px-8 py-3 rounded-lg hover:bg-white hover:text-black transition font-medium"
            >
              Liên hệ chúng tôi
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}