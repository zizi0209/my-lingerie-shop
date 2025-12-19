// frontend/src/components/layout/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Cột 1: Giới thiệu */}
        <div>
          <h3 className="text-2xl font-serif font-bold text-rose-400 mb-4">
            LINGERIE
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tôn vinh vẻ đẹp quyến rũ của phụ nữ Việt với những thiết kế nội y
            cao cấp, tinh tế và thoải mái nhất.
          </p>
        </div>

        {/* Cột 2: Liên kết */}
        <div>
          <h4 className="font-bold mb-4">Về chúng tôi</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link href="/about">Câu chuyện thương hiệu</Link>
            </li>
            <li>
              <Link href="/contact">Liên hệ</Link>
            </li>
            <li>
              <Link href="/careers">Tuyển dụng</Link>
            </li>
          </ul>
        </div>

        {/* Cột 3: Chính sách */}
        <div>
          <h4 className="font-bold mb-4">Chính sách</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <Link href="/policy">Chính sách đổi trả</Link>
            </li>
            <li>
              <Link href="/shipping">Chính sách vận chuyển</Link>
            </li>
            <li>
              <Link href="/security">Bảo mật thông tin</Link>
            </li>
          </ul>
        </div>

        {/* Cột 4: Đăng ký */}
        <div>
          <h4 className="font-bold mb-4">Đăng ký nhận tin</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email của bạn..."
              className="bg-gray-800 border-none text-sm px-4 py-2 w-full rounded focus:ring-1 focus:ring-rose-500"
            />
            <button className="bg-rose-600 px-4 py-2 rounded text-sm hover:bg-rose-700">
              Gửi
            </button>
          </div>
        </div>
      </div>
      <div className="text-center text-gray-600 text-xs mt-12 pt-8 border-t border-gray-800">
        © 2024 My Lingerie Shop. All rights reserved.
      </div>
    </footer>
  );
}
