import Link from "next/link";
import { FileText, Shield, Scale, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Điều khoản sử dụng | Lingerie Shop",
  description: "Điều khoản và điều kiện sử dụng dịch vụ tại Lingerie Shop",
};

export default function DieuKhoanPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif italic mb-4 text-gray-900 dark:text-white">
            Điều khoản sử dụng
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 15/01/2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-slate-800 dark:border-slate-700">
            <FileText className="text-blue-600 dark:text-blue-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Điều khoản chung</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Bằng việc truy cập và sử dụng website, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định tại đây.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-slate-800 dark:border-slate-700">
            <Shield className="text-emerald-600 dark:text-emerald-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Bảo mật thông tin</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn theo chính sách bảo mật nghiêm ngặt.
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              1. Điều kiện sử dụng
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>Bạn phải đủ 18 tuổi hoặc có sự đồng ý của phụ huynh/người giám hộ để sử dụng dịch vụ.</li>
              <li>Thông tin đăng ký tài khoản phải chính xác và đầy đủ.</li>
              <li>Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình.</li>
              <li>Không được sử dụng website cho các mục đích bất hợp pháp.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              2. Quyền sở hữu trí tuệ
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>Tất cả nội dung trên website (hình ảnh, văn bản, logo, thiết kế) thuộc quyền sở hữu của Lingerie Shop.</li>
              <li>Không được sao chép, phân phối hoặc sử dụng nội dung mà không có sự cho phép bằng văn bản.</li>
              <li>Các nhãn hiệu và logo của bên thứ ba thuộc quyền sở hữu của chủ sở hữu tương ứng.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              3. Quy định đặt hàng
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>Giá sản phẩm có thể thay đổi mà không cần thông báo trước.</li>
              <li>Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong trường hợp nghi ngờ gian lận.</li>
              <li>Đơn hàng chỉ được xác nhận khi bạn nhận được email/SMS xác nhận từ chúng tôi.</li>
              <li>Trong trường hợp hết hàng, chúng tôi sẽ liên hệ để hoàn tiền hoặc đổi sản phẩm.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              4. Chính sách bảo mật
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>Thông tin cá nhân của bạn được mã hóa và bảo vệ an toàn.</li>
              <li>Chúng tôi không bán hoặc chia sẻ thông tin cá nhân cho bên thứ ba.</li>
              <li>Thông tin thanh toán được xử lý qua các cổng thanh toán uy tín.</li>
              <li>Bạn có quyền yêu cầu xóa tài khoản và dữ liệu cá nhân bất cứ lúc nào.</li>
            </ul>
          </section>

          <section className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
            <div className="flex gap-4">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-200">Giới hạn trách nhiệm</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Lingerie Shop không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc sử dụng 
                  website hoặc không thể truy cập website. Chúng tôi có quyền sửa đổi điều khoản này 
                  bất cứ lúc nào mà không cần thông báo trước.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              5. Liên hệ
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Nếu bạn có bất kỳ câu hỏi nào về điều khoản sử dụng, vui lòng liên hệ:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Email:</strong> support@lingerieshop.vn</li>
              <li><strong>Hotline:</strong> 1900 xxxx (8:00 - 22:00)</li>
              <li><strong>Địa chỉ:</strong> TP. Hồ Chí Minh, Việt Nam</li>
            </ul>
          </section>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/policy"
            className="inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-6 py-3 rounded-full font-medium transition-colors text-gray-900 dark:text-white"
          >
            <Scale size={18} />
            Chính sách đổi trả
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-full font-medium transition-colors"
          >
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </div>
  );
}
