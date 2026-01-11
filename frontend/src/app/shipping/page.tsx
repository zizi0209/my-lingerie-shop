import Image from "next/image";
import { Truck, Globe, Clock, PackageCheck } from "lucide-react";

export const metadata = {
  title: "Chính sách vận chuyển | Lingerie Shop",
  description: "Thông tin về chính sách vận chuyển và giao hàng tại Lingerie Shop",
};

export default function ShippingPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif italic mb-4 text-gray-900 dark:text-white">
            Chính sách vận chuyển
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Giao hàng nhanh chóng - Đóng gói bảo mật</p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: <Truck />, label: "Giao hàng toàn quốc" },
            { icon: <Clock />, label: "Giao hỏa tốc 2h" },
            { icon: <PackageCheck />, label: "Đóng gói tinh tế" },
            { icon: <Globe />, label: "Theo dõi đơn hàng" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-800 rounded-2xl text-center"
            >
              <div className="text-primary-600 dark:text-primary-400 mb-3">{item.icon}</div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              Thời gian & Phí vận chuyển
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-700 dark:bg-primary-900 text-white text-sm">
                    <th className="p-4 rounded-tl-xl font-bold">Khu vực</th>
                    <th className="p-4 font-bold">Thời gian dự kiến</th>
                    <th className="p-4 rounded-tr-xl font-bold">Phí vận chuyển</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">Nội thành (TP.HCM / Hà Nội)</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">1 - 2 ngày làm việc</td>
                    <td className="p-4 font-bold text-primary-600 dark:text-primary-400">25.000 VNĐ</td>
                  </tr>
                  <tr className="bg-white dark:bg-gray-900">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">Giao hỏa tốc (Nội thành)</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">Trong vòng 2 giờ</td>
                    <td className="p-4 font-bold text-primary-600 dark:text-primary-400">Theo giá Grab/Ahamove</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">Ngoại thành / Các tỉnh</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">3 - 5 ngày làm việc</td>
                    <td className="p-4 font-bold text-primary-600 dark:text-primary-400">35.000 VNĐ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-primary-600 dark:text-primary-400 font-bold">
              * MIỄN PHÍ VẬN CHUYỂN cho tất cả đơn hàng từ 500.000 VNĐ trở lên.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              Chính sách đóng gói
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl">
              <div className="md:w-1/3 relative aspect-square w-full max-w-[200px]">
                <Image
                  src="https://images.unsplash.com/photo-1549462980-6a620041847c?w=400&auto=format&fit=crop"
                  fill
                  className="rounded-2xl shadow-lg object-cover"
                  alt="Packaging"
                />
              </div>
              <div className="md:w-2/3 space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quyền riêng tư là ưu tiên</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Chúng tôi hiểu rằng nội y là sản phẩm nhạy cảm. Vì thế, tất cả các đơn hàng tại Lingerie Shop đều được:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-2 text-gray-600 dark:text-gray-300">
                  <li>Sử dụng hộp carton không in ấn logo nhãn hiệu bên ngoài.</li>
                  <li>Tên sản phẩm trên vận đơn được thay thế bằng "Quần áo thời trang" hoặc "Phụ kiện".</li>
                  <li>Sản phẩm bên trong được bọc giấy nến cao cấp và đính nơ tinh tế.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              Những điều cần lưu ý
            </h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 text-sm space-y-2">
              <li>
                Thời gian giao hàng có thể lâu hơn dự kiến trong các đợt Sale lớn, lễ tết 
                hoặc điều kiện thời tiết bất khả kháng.
              </li>
              <li>
                Quý khách vui lòng kiểm tra kỹ tình trạng gói hàng trước khi nhận từ shipper. 
                Nếu hộp bị rách, ướt hoặc có dấu hiệu bị khui, vui lòng từ chối nhận và liên hệ hotline ngay lập tức.
              </li>
              <li>
                Chúng tôi hiện chưa hỗ trợ giao hàng quốc tế. Mọi cập nhật mới nhất sẽ được thông báo trên website.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
