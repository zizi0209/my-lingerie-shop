import Link from "next/link";
import { RefreshCcw, ShieldCheck, AlertCircle, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Chính sách đổi trả | Lingerie Shop",
  description: "Chính sách đổi trả sản phẩm tại Lingerie Shop - Đảm bảo quyền lợi khách hàng",
};

export default function PolicyPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif italic mb-4 text-gray-900 dark:text-white">
            Chính sách đổi trả & Hoàn tiền
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Cập nhật lần cuối: 15/01/2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 dark:!bg-slate-800 dark:!border-slate-700">
            <RefreshCcw className="text-emerald-600 dark:text-emerald-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:!text-white">Đổi hàng trong 7 ngày</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:!text-slate-300">
              Bạn có thể đổi size hoặc đổi mẫu trong vòng 7 ngày kể từ ngày nhận hàng 
              nếu sản phẩm không vừa hoặc bạn muốn thay đổi phong cách.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-blue-50 border border-blue-200 dark:!bg-slate-800 dark:!border-slate-700">
            <ShieldCheck className="text-blue-600 dark:text-blue-400 mb-4" size={32} />
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:!text-white">Sản phẩm lỗi</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:!text-slate-300">
              Miễn phí đổi trả 100% đối với các sản phẩm có lỗi từ nhà sản xuất 
              (rách vải, lỗi đường may, sai màu sắc so với mô tả).
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              1. Điều kiện đổi trả
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>Sản phẩm còn nguyên tem mác, chưa qua sử dụng, chưa qua giặt ủi.</li>
              <li>Sản phẩm không có mùi lạ (nước hoa, cơ thể, khói thuốc...).</li>
              <li>Có hóa đơn mua hàng đi kèm (bản giấy hoặc điện tử).</li>
              <li>
                <strong className="text-gray-900 dark:text-white">Lưu ý:</strong> Vì lý do vệ sinh, 
                chúng tôi không hỗ trợ đổi trả đối với các sản phẩm quần lót (panties) 
                và các bộ có kèm quần lót trừ trường hợp lỗi kỹ thuật.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif border-b border-gray-200 dark:border-gray-700 pb-2 mb-6 italic text-gray-900 dark:text-white">
              2. Quy trình đổi hàng
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Liên hệ với chúng tôi</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Gọi hotline 1900 xxxx hoặc nhắn tin qua Fanpage/Zalo kèm mã đơn hàng và hình ảnh sản phẩm.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Xác nhận yêu cầu</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Nhân viên sẽ kiểm tra và xác nhận yêu cầu của bạn trong vòng 24h làm việc.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Gửi hàng về kho</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Bạn gửi hàng qua đơn vị vận chuyển hoặc chúng tôi sẽ cho shipper đến lấy tận nơi (có tính phí tùy trường hợp).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
            <div className="flex gap-4">
              <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-200">Quan trọng về Hoàn tiền</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Hoàn tiền chỉ áp dụng cho trường hợp sản phẩm lỗi mà Lingerie Shop không còn hàng để đổi cho khách. 
                  Tiền sẽ được hoàn về tài khoản ngân hàng của quý khách trong 3-5 ngày làm việc sau khi chúng tôi nhận lại hàng.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-20 p-10 bg-gray-900 dark:bg-gray-800 text-white rounded-3xl text-center">
          <HelpCircle className="mx-auto mb-4 text-gray-400" size={40} />
          <h2 className="text-2xl font-serif italic mb-4">Bạn vẫn còn thắc mắc?</h2>
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            Đừng ngần ngại liên hệ với đội ngũ hỗ trợ khách hàng của chúng tôi để được giải đáp chi tiết nhất.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-primary-600 hover:bg-primary-500 px-8 py-3 rounded-full font-bold transition-colors"
          >
            Chat với chúng tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
