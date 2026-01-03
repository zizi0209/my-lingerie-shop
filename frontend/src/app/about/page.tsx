import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Leaf, Package, Heart, Shield, Scissors } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-white dark:bg-gray-950">
      {/* ===== PHẦN 1: HERO SECTION ===== */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1616002411355-49593fd89721?q=80&w=1920&auto=format&fit=crop"
            alt="Lingerie Shop - Nâng niu vẻ đẹp"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/50 to-black/70" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/70 mb-4 md:mb-6">
            Lingerie Shop
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light mb-6 md:mb-8 leading-tight">
            Hơn cả nội y,
            <span className="block mt-2">đó là <em className="text-primary-300">sự tự tin</em> của bạn</span>
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-8 md:mb-10 font-light leading-relaxed">
            Chúng tôi tin rằng mỗi người phụ nữ đều xứng đáng cảm thấy tự tin và quyến rũ. 
            Lingerie Shop ra đời để nâng niu vẻ đẹp nguyên bản của bạn.
          </p>
          <Link
            href="/san-pham"
            className="ck-button inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 md:px-8 md:py-4 rounded-full font-medium hover:bg-gray-100 transition group"
          >
            Khám phá bộ sưu tập
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Scroll indicator - giống trang chủ */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-0.5 h-10 bg-white/50 mx-auto" />
        </div>
      </section>

      {/* ===== PHẦN 2: BRAND STORY ===== */}
      <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
            {/* Image */}
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop"
                  alt="Câu chuyện thương hiệu"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-2xl -z-10" />
            </div>

            {/* Content */}
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
                Câu chuyện của chúng tôi
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white leading-tight">
                Bắt đầu từ một
                <span className="block text-primary-500">niềm tin</span>
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  <span className="text-gray-900 dark:text-white font-medium">Năm 2020</span>, giữa lúc thị trường nội y 
                  tràn ngập hàng giá rẻ kém chất lượng, chúng tôi nhận ra phụ nữ Việt cần một lựa chọn khác biệt — 
                  những sản phẩm nội y vừa vặn với hình thể Á Đông nhưng vẫn mang nét quyến rũ hiện đại.
                </p>
                <p>
                  Từ một studio nhỏ với 3 nhà thiết kế đam mê, Lingerie Shop đã trở thành thương hiệu được 
                  <span className="text-gray-900 dark:text-white font-medium"> hơn 50.000 phụ nữ</span> tin tưởng. 
                  Mỗi sản phẩm ra đời đều mang theo sứ mệnh: giúp bạn yêu cơ thể mình hơn mỗi ngày.
                </p>
                <p className="text-gray-900 dark:text-white italic font-serif text-lg">
                  "Chúng tôi không chỉ bán nội y, chúng tôi bán sự tự tin."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PHẦN 3: CRAFTSMANSHIP ===== */}
      <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
              Cam kết chất lượng
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white">
              Tỉ mỉ trong từng đường kim
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Chúng tôi hiểu rằng nội y chạm trực tiếp vào làn da nhạy cảm nhất của bạn. 
              Vì vậy, mỗi sản phẩm đều được chọn lọc và kiểm định nghiêm ngặt.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: "Ren cao cấp",
                desc: "Ren Pháp (French Lace) mềm mại, không gây ngứa, giữ form sau nhiều lần giặt"
              },
              {
                icon: Heart,
                title: "Lụa tơ tằm",
                desc: "100% Silk tự nhiên, thoáng mát mùa hè, ấm áp mùa đông"
              },
              {
                icon: Scissors,
                title: "Đường may Seamless",
                desc: "Công nghệ may không hằn, thoải mái tối đa dưới mọi trang phục"
              },
              {
                icon: Shield,
                title: "Gọng mềm Soft-wire",
                desc: "Nâng đỡ hoàn hảo mà không gây khó chịu hay hằn da"
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PHẦN 4: CORE VALUES ===== */}
      <section className="py-20 md:py-28 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-400 mb-4">
              Giá trị cốt lõi
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6">
              Những điều chúng tôi tin tưởng
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Body Positivity */}
            <div className="text-center p-8">
              <div className="text-5xl mb-6">💖</div>
              <h3 className="text-xl font-medium mb-4">Body Positivity</h3>
              <p className="text-gray-400 leading-relaxed">
                Chúng tôi tôn vinh mọi đường cong. Từ size XS đến XXL, mọi cơ thể đều đẹp và xứng đáng được nâng niu.
              </p>
            </div>

            {/* Sustainability */}
            <div className="text-center p-8 border-x border-gray-800">
              <div className="text-5xl mb-6">🌿</div>
              <h3 className="text-xl font-medium mb-4">Sustainability</h3>
              <p className="text-gray-400 leading-relaxed">
                Bao bì từ giấy tái chế, túi vải thay vì túi nhựa. Chúng tôi cam kết giảm thiểu tác động môi trường.
              </p>
            </div>

            {/* Privacy */}
            <div className="text-center p-8">
              <div className="text-5xl mb-6">📦</div>
              <h3 className="text-xl font-medium mb-4">Discrete Packaging</h3>
              <p className="text-gray-400 leading-relaxed">
                Đóng gói kín đáo, không ghi tên sản phẩm bên ngoài. Sự riêng tư của bạn là ưu tiên hàng đầu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PHẦN 5: STATS & TEAM ===== */}
      <section className="py-20 md:py-28 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-20">
            {[
              { number: "50,000+", label: "Khách hàng hài lòng" },
              { number: "200+", label: "Mẫu thiết kế độc quyền" },
              { number: "4.9/5", label: "Đánh giá trung bình" },
              { number: "3", label: "Cửa hàng vật lý" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-light mb-2 text-gray-900 dark:text-white">
                  {stat.number}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Team */}
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
              Đội ngũ
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-light mb-6 text-gray-900 dark:text-white">
              Những người đứng sau Lingerie Shop
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Đội ngũ thiết kế và tư vấn viên tận tâm, luôn sẵn sàng giúp bạn tìm được sản phẩm phù hợp nhất.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Nguyễn Minh Anh",
                role: "Founder & Creative Director",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop"
              },
              {
                name: "Trần Thu Hà",
                role: "Head of Design",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop"
              },
              {
                name: "Lê Hoàng Yến",
                role: "Customer Experience Lead",
                image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop"
              }
            ].map((member, index) => (
              <div key={index} className="text-center group">
                <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PHẦN 6: SOCIAL PROOF ===== */}
      <section className="py-16 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-500 mb-4">
              Được tin tưởng bởi
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-light text-gray-900 dark:text-white">
              Báo chí & Đối tác
            </h2>
          </div>

          {/* Media logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-16 opacity-60">
            {["Elle", "Đẹp", "VnExpress", "Harper's Bazaar", "Vogue VN"].map((name, index) => (
              <span 
                key={index} 
                className="text-xl md:text-2xl font-serif text-gray-400 dark:text-gray-500"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Testimonial */}
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl font-serif font-light text-gray-700 dark:text-gray-300 italic mb-6">
              "Lingerie Shop là một trong những thương hiệu nội y Việt hiếm hoi hiểu được vóc dáng và nhu cầu của phụ nữ châu Á. 
              Chất lượng sản phẩm ngang tầm các thương hiệu quốc tế."
            </blockquote>
            <p className="text-gray-500 dark:text-gray-400">
              — <span className="font-medium">Elle Vietnam</span>, Tháng 10/2024
            </p>
          </div>
        </div>
      </section>

      {/* ===== PHẦN 7: CTA ===== */}
      <section className="py-20 md:py-28 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-6">
            Bạn đã sẵn sàng tìm kiếm
            <span className="block mt-2 text-primary-300">bộ nội y hoàn hảo?</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-10">
            Hãy để chúng tôi giúp bạn tìm được sản phẩm vừa vặn, thoải mái và tôn lên vẻ đẹp riêng của bạn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/san-pham"
              className="ck-button inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition group"
            >
              Khám phá bộ sưu tập
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition"
            >
              Tư vấn chọn Size
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
