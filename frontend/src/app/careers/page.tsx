import Link from "next/link";
import { MapPin, Clock, ArrowRight, Star, Heart, Zap } from "lucide-react";

export const metadata = {
  title: "Tuyển dụng | Lingerie Shop",
  description: "Gia nhập đội ngũ Lingerie Shop - Nơi bạn có thể phát triển sự nghiệp và đam mê trong ngành thời trang",
};

const jobOpenings = [
  {
    id: "1",
    title: "Content Creator (Fashion Focus)",
    department: "Marketing",
    location: "TP. Hồ Chí Minh",
    type: "Full-time",
    description: "Xây dựng nội dung hình ảnh và video cho các chiến dịch ra mắt sản phẩm mới.",
  },
  {
    id: "2",
    title: "Tư vấn bán hàng cao cấp",
    department: "Retail",
    location: "TP. Hà Nội",
    type: "Full-time/Part-time",
    description: "Trực tiếp hỗ trợ khách hàng lựa chọn sản phẩm phù hợp tại cửa hàng.",
  },
  {
    id: "3",
    title: "Customer Experience Specialist",
    department: "Support",
    location: "Remote/Hybrid",
    type: "Full-time",
    description: "Giải quyết các thắc mắc và đảm bảo hành trình mua sắm của khách hàng luôn tuyệt vời.",
  },
];

export default function CareersPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen">
      {/* Hero */}
      <div className="bg-primary-900 text-white py-24 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-serif italic mb-6">Đồng hành cùng sự quyến rũ</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Chúng tôi đang tìm kiếm những mảnh ghép sáng tạo, nhiệt huyết để cùng Lingerie Shop 
            viết tiếp câu chuyện tôn vinh vẻ đẹp phụ nữ.
          </p>
        </div>
      </div>

      {/* Values */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mb-6">
              <Star className="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Tôn trọng sự khác biệt</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mọi ý tưởng đều được lắng nghe và trân trọng trong môi trường làm việc cởi mở.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mb-6">
              <Heart className="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Đam mê cái đẹp</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chúng tôi không chỉ bán sản phẩm, chúng tôi lan tỏa nghệ thuật và sự tự tin.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mb-6">
              <Zap className="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Cơ hội phát triển</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Lộ trình thăng tiến rõ ràng cùng các khóa đào tạo chuyên sâu về thời trang.
            </p>
          </div>
        </div>
      </section>

      {/* Job List */}
      <section className="bg-gray-100 dark:bg-gray-900 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-serif italic mb-12 text-center text-gray-900 dark:text-white">
            Vị trí đang tìm kiếm
          </h2>
          <div className="space-y-6">
            {jobOpenings.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                      {job.department}
                    </span>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={16} /> {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} /> {job.type}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/contact"
                    className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold group-hover:translate-x-1 transition-transform whitespace-nowrap"
                  >
                    Ứng tuyển ngay <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-serif italic mb-6 text-gray-900 dark:text-white">
          Chưa thấy vị trí phù hợp?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Gửi CV cho chúng tôi tại{" "}
          <span className="font-bold text-primary-600 dark:text-primary-400">careers@lingerieshop.vn</span>
        </p>
        <Link
          href="/contact"
          className="inline-block border-2 border-primary-500 text-primary-600 dark:text-primary-400 px-10 py-3 rounded-full font-bold bg-transparent hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:text-primary-700 dark:hover:text-primary-300 transition-all"
        >
          Gửi CV tiềm năng
        </Link>
      </section>
    </div>
  );
}
