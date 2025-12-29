import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="pb-20">
      {/* 1. Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1519644473771-e45d361c9bb8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Lingerie Hero"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
          <span className="inline-block text-white/80 font-light tracking-widest text-sm mb-6 uppercase">
            Bộ sưu tập Xuân Hè 2024
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-light mb-6 leading-tight">
            Vẻ đẹp
            <br />
            <span className="italic">Quyến rũ</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Khám phá những thiết kế nội y tinh tế, chất liệu lụa cao cấp
            <br />
            Đem lại sự thoải mái tuyệt đối và tôn vinh vẻ đẹp của phái đẹp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/san-pham"
              className="ck-button inline-flex items-center justify-center gap-2 bg-white text-black dark:bg-white dark:text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition group"
            >
              Khám phá ngay
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/bai-viet"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-medium hover:bg-white hover:text-black transition"
            >
              Góc tư vấn
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-0.5 h-10 bg-white/50 mx-auto"></div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="bg-white dark:bg-gray-950 py-20 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-gray-900 dark:text-white">
              Danh mục nổi bật
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Lựa chọn hoàn hảo cho mọi khoảnh khắc đặc biệt
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Áo lót */}
            <Link href="/san-pham?category=ao-lot" className="group block">
              <div className="relative aspect-3/4 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1578915446522-f40d855e2418?q=80&w=2070&auto=format&fit=crop"
                  alt="Áo lót"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-2xl font-light mb-2">Áo lót</h3>
                  <span className="text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 block">
                    Khám phá ngay →
                  </span>
                </div>
              </div>
            </Link>

            {/* Đồ ngủ */}
            <Link href="/san-pham?category=do-ngu" className="group block">
              <div className="relative aspect-3/4 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=2070&auto=format&fit=crop"
                  alt="Đồ ngủ"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-2xl font-light mb-2">Đồ ngủ</h3>
                  <span className="text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 block">
                    Khám phá ngay →
                  </span>
                </div>
              </div>
            </Link>

            {/* Bộ nội y */}
            <Link href="/san-pham?category=bo-noi-y" className="group block">
              <div className="relative aspect-3/4 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop"
                  alt="Bộ nội y"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-2xl font-light mb-2">Bộ nội y</h3>
                  <span className="text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 block">
                    Khám phá ngay →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Best Sellers */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-gray-900 dark:text-white">
              Sản phẩm bán chạy
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Những thiết kế được yêu thích nhất
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Product 1 */}
            <div className="group">
              <div className="relative aspect-3/4 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop"
                  alt="Product"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-4 left-4 bg-white text-black dark:bg-gray-100 dark:text-gray-900 text-xs px-3 py-1 font-medium shadow-sm">
                  Best Seller
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition mb-2">
                Áo lót ren đen
              </h3>
              <p className="text-lg font-light text-gray-900 dark:text-gray-300">
                890.000₫
              </p>
            </div>

            {/* Product 2 */}
            <div className="group">
              <div className="relative aspect-3/4 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1591080876847-e0815b4e8c08?q=80&w=2070&auto=format&fit=crop"
                  alt="Product"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition mb-2">
                Quần lót ren
              </h3>
              <p className="text-lg font-light text-gray-900 dark:text-gray-300">
                450.000₫
              </p>
            </div>

            {/* Product 3 */}
            <div className="group">
              <div className="relative aspect-3/4 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1578915446522-f40d855e2418?q=80&w=2070&auto=format&fit=crop"
                  alt="Product"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-4 left-4 bg-white text-rose-600 dark:bg-gray-100 dark:text-gray-900 text-xs px-3 py-1 font-medium shadow-sm">
                  -30%
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition mb-2">
                Đồ ngủ lụa
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-lg font-light text-gray-900 dark:text-gray-300">
                  1.200.000₫
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                  1.500.000₫
                </p>
              </div>
            </div>

            {/* Product 4 */}
            <div className="group">
              <div className="relative aspect-3/4 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-lg mb-4">
                <Image
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop"
                  alt="Product"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-4 left-4 bg-white text-black dark:bg-gray-100 dark:text-gray-900 text-xs px-3 py-1 font-medium shadow-sm">
                  New
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition mb-2">
                Bộ nội y trắng
              </h3>
              <p className="text-lg font-light text-gray-900 dark:text-gray-300">
                1.580.000₫
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-2 border-2 border-black dark:border-white text-black dark:text-white px-8 py-3 rounded-full hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition"
            >
              Xem tất cả sản phẩm
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Brand Story */}
      <section className="bg-white dark:bg-gray-950 py-20 transition-colors">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif font-light mb-6 text-gray-900 dark:text-white">
                Vẻ đẹp từ sự
                <br />
                <span className="italic">tự tin</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Tại Lingerie Shop, chúng tôi tin rằng vẻ đẹp thực sự đến từ sự
                tự tin. Mỗi thiết kế được tạo ra để không chỉ tôn vinh đường
                cong cơ thể mà còn mang lại cảm giác thoải mái và tự tin tuyệt
                đối.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Với chất liệu cao cấp và thiết kế tinh tế, chúng tôi cam kết
                mang đến những sản phẩm nội y hoàn hảo cho mọi phụ nữ Việt.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-gray-900 dark:text-gray-100 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                Tìm hiểu thêm về chúng tôi
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="relative aspect-4/5 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop"
                alt="Brand Story"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Reviews */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-gray-900 dark:text-white">
              Khách hàng nói gì
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Những chia sẻ chân thành từ khách hàng
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Review 1 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg transition-colors">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &quot;Chất lượng sản phẩm tuyệt vời, vải rất mềm và thoải mái.
                Mình sẽ ủng hộ shop dài dài!&quot;
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                - Minh Anh
              </p>
            </div>

            {/* Review 2 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg transition-colors">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &quot;Thiết kế rất sang trọng, mặc lên cảm thấy tự tin hơn hẳn.
                Đóng gói cẩn thận, giao hàng nhanh.&quot;
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                - Thu Trang
              </p>
            </div>

            {/* Review 3 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg transition-colors">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                &quot;Shop tư vấn rất nhiệt tình, sản phẩm đúng như mô tả. Chắc
                chắn sẽ quay lại mua tiếp.&quot;
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                - Hồng Nhung
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
