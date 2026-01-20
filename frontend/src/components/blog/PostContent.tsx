'use client';

import { useEffect, useState, type ReactElement } from 'react';
import ProductCardInPost from './ProductCardInPost';
import { sanitizeForPublic } from '@/lib/sanitize';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string; slug: string };
}

interface PostContentProps {
  postId: number;
  content: string;
  className?: string;
}

export default function PostContent({ postId, content, className = '' }: PostContentProps) {
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch auto-recommended products
        const recommendedResponse = await fetch(`${baseUrl}/product-posts/posts/${postId}/recommended?limit=8`);
        const recommendedData = await recommendedResponse.json();
        if (recommendedData.success) {
          setRecommendedProducts(recommendedData.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [postId, baseUrl]);

  if (loading) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }}
      />
    );
  }

  // Parse HTML and inject ProductCardInPost components
  const renderContentWithProducts = () => {
    return (
      <div className={className}>
        {/* Main content */}
        <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />

        {/* Auto-recommended products at the end */}
        {recommendedProducts.length > 0 && (
          <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Sản phẩm được đề xuất
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Gợi ý tự động dựa trên nội dung bài viết
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedProducts.map((product) => (
                <ProductCardInPost
                  key={`recommended-${product.id}`}
                  product={product}
                  displayType="end-collection"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return renderContentWithProducts();
}

