'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Gift, ShoppingBag, Clock } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link xác nhận không hợp lệ');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/newsletter/verify/${token}`);
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Xác nhận thành công!');
          if (data.couponCode) {
            setCouponCode(data.couponCode);
          }
        } else {
          if (data.expired) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
          setMessage(data.message || 'Có lỗi xảy ra');
        }
      } catch {
        setStatus('error');
        setMessage('Không thể kết nối server');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto text-brand-accent animate-spin" />
            <h1 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">
              Đang xác nhận...
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-white" />
              <h1 className="text-2xl font-bold mt-4 text-white">
                Xác nhận thành công!
              </h1>
            </div>
            
            <div className="p-8">
              {couponCode && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6 text-center border-2 border-dashed border-brand-accent">
                  <Gift className="w-8 h-8 mx-auto text-brand-accent mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Mã giảm giá của bạn
                  </p>
                  <p className="text-3xl font-bold text-brand-accent tracking-widest">
                    {couponCode}
                  </p>
                  <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Giảm 50.000đ</strong> cho đơn từ 399.000đ</p>
                    <p>Mã đã được gửi vào email của bạn</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Chỉ áp dụng với email đã đăng ký</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Mỗi mã chỉ sử dụng được 1 lần</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Dành cho khách hàng mới</span>
                </p>
              </div>

              <Link
                href="/san-pham"
                className="flex items-center justify-center gap-2 w-full py-4 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-bold transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                Mua sắm ngay
              </Link>
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <Clock className="w-16 h-16 mx-auto text-amber-500" />
            <h1 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">
              Link đã hết hạn
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
              {message}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-bold transition-colors"
            >
              Đăng ký lại
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="text-xl font-bold mt-6 text-gray-900 dark:text-white">
              Có lỗi xảy ra
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
              {message}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-bold transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsletterVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
