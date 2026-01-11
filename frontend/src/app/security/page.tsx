import { Lock, Eye, Database, FileCheck } from "lucide-react";

export const metadata = {
  title: "Bảo mật thông tin | Lingerie Shop",
  description: "Chính sách bảo mật thông tin khách hàng tại Lingerie Shop",
};

export default function SecurityPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-4xl font-serif italic mb-4 text-gray-900 dark:text-white">
            Chính sách bảo mật thông tin
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Sự an tâm của bạn là cam kết của chúng tôi</p>
        </div>

        <div className="space-y-16">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-200 dark:border-gray-700 pb-12">
            <div className="col-span-1">
              <h2 className="text-xl font-serif italic mb-4 text-gray-900 dark:text-white">Tổng quan</h2>
            </div>
            <div className="col-span-2 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              <p>
                Lingerie Shop tôn trọng quyền riêng tư và cam kết bảo vệ thông tin cá nhân của quý khách hàng. 
                Tài liệu này mô tả cách chúng tôi thu thập, sử dụng và bảo mật dữ liệu của bạn khi truy cập 
                và mua sắm tại hệ thống website của chúng tôi.
              </p>
              <p>
                Bằng việc sử dụng website, bạn đã đồng ý với các điều khoản được quy định trong chính sách này.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-200 dark:border-gray-700 pb-12">
            <div className="col-span-1">
              <h2 className="text-xl font-serif italic mb-4 text-gray-900 dark:text-white">Thu thập dữ liệu</h2>
            </div>
            <div className="col-span-2 space-y-6">
              <div className="flex gap-4">
                <Eye className="text-primary-600 dark:text-primary-400 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-sm uppercase text-gray-900 dark:text-white">
                    Thông tin cung cấp trực tiếp
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Tên, địa chỉ, số điện thoại, email và các thông tin cần thiết để xử lý đơn hàng.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Database className="text-primary-600 dark:text-primary-400 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-sm uppercase text-gray-900 dark:text-white">Dữ liệu tự động</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Địa chỉ IP, loại trình duyệt, các trang đã xem và hành vi tương tác trên website thông qua Cookies.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-200 dark:border-gray-700 pb-12">
            <div className="col-span-1">
              <h2 className="text-xl font-serif italic mb-4 text-gray-900 dark:text-white">Sử dụng thông tin</h2>
            </div>
            <div className="col-span-2">
              <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full mt-1.5"></div>
                  Xác nhận và xử lý các đơn hàng bạn đã đặt.
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full mt-1.5"></div>
                  Gửi thông báo về tiến độ vận chuyển và các cập nhật quan trọng.
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full mt-1.5"></div>
                  Cải thiện trải nghiệm người dùng và cá nhân hóa các gợi ý sản phẩm.
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full mt-1.5"></div>
                  Gửi bản tin khuyến mãi (nếu bạn đã đăng ký nhận tin).
                </li>
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-200 dark:border-gray-700 pb-12">
            <div className="col-span-1">
              <h2 className="text-xl font-serif italic mb-4 text-gray-900 dark:text-white">Cam kết bảo mật</h2>
            </div>
            <div className="col-span-2 space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4 text-primary-600 dark:text-primary-400">
                  <FileCheck size={20} />
                  <span className="font-bold uppercase text-xs tracking-widest">Tiêu chuẩn mã hóa</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Toàn bộ dữ liệu truyền tải giữa thiết bị của bạn và máy chủ Lingerie Shop đều được bảo vệ 
                  bởi công nghệ mã hóa SSL 256-bit. Thông tin thanh toán trực tuyến (nếu có) được xử lý 
                  bởi các cổng thanh toán uy tín và chúng tôi không lưu trữ thông tin thẻ tín dụng của khách hàng.
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                * Chúng tôi cam kết không bán, chia sẻ hay trao đổi dữ liệu cá nhân của bạn cho bất kỳ 
                bên thứ ba nào vì mục đích thương mại mà không có sự đồng ý của bạn.
              </p>
            </div>
          </section>

          <section className="text-center pt-10">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Bạn có quyền yêu cầu truy cập, sửa đổi hoặc xóa bỏ dữ liệu cá nhân của mình bất kỳ lúc nào.
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Mọi yêu cầu hỗ trợ vui lòng gửi về:{" "}
              <span className="text-primary-600 dark:text-primary-400">privacy@lingerieshop.vn</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
