import Link from "next/link";

export default function Home() {
  return (
    <div className="pb-20">
      {/* 1. Hero Section (Banner) */}
      <section className="relative h-[600px] w-full bg-rose-50 flex items-center">
        {/* Sau này thay bằng thẻ <Image> background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-80"></div>

        <div className="container mx-auto px-4 relative z-10 text-center md:text-left">
          <span className="text-rose-600 font-bold tracking-widest uppercase mb-4 block">
            Bộ sưu tập mới 2024
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6">
            Vẻ đẹp <br />
            <span className="text-rose-500 italic">Quyến rũ</span> từ bên trong
          </h1>
          <p className="text-gray-700 max-w-lg mb-8 text-lg">
            Khám phá những thiết kế nội y tinh tế, chất liệu lụa cao cấp đem lại
            sự thoải mái tuyệt đối cho phái đẹp.
          </p>
          <Link
            href="/san-pham"
            className="inline-block bg-rose-600 text-white px-8 py-3 rounded-full font-medium hover:bg-rose-700 transition transform hover:scale-105 shadow-lg"
          >
            Mua sắm ngay
          </Link>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-serif font-bold text-center mb-12">
          Danh mục yêu thích
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Item 1 */}
          <div className="group cursor-pointer relative overflow-hidden rounded-lg aspect-[3/4]">
            <div className="absolute inset-0 bg-gray-200"></div>{" "}
            {/* Placeholder ảnh */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-xl font-bold">Áo lót ren</h3>
              <span className="text-sm underline opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 block mt-2">
                Xem ngay
              </span>
            </div>
          </div>
          {/* Item 2 & 3 tương tự... copy ra */}
        </div>
      </section>
    </div>
  );
}
