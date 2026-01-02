'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle } from 'lucide-react';

interface NewsletterContent {
  title?: string;
  subtitle?: string;
}

interface NewsletterProps {
  content: NewsletterContent;
}

export default function Newsletter({ content }: NewsletterProps) {
  const { title = 'Đăng ký nhận tin', subtitle = 'Nhận ưu đãi độc quyền' } = content;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSuccess(true);
    setEmail('');
  };

  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-12 md:py-20 transition-colors">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <Mail className="w-12 h-12 mx-auto mb-4 text-primary-500 dark:text-primary-400" />
        <h2 className="text-3xl md:text-4xl font-serif font-light mb-4 text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          {subtitle}
        </p>

        {success ? (
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>Đăng ký thành công!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn"
              className="flex-1 px-4 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Đăng ký'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
