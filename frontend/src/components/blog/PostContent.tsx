'use client';

import { useEffect, useState } from 'react';
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

interface ProductOnPost {
  productId: number;
  displayType: 'inline-card' | 'sidebar' | 'end-collection';
  customNote?: string;
  product: Product;
}

interface PostContentProps {
  postId: number;
  content: string;
  className?: string;
}

export default function PostContent({ postId, content, className = '' }: PostContentProps) {
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [manualProducts, setManualProducts] = useState<ProductOnPost[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch manual linked products
        const linkedResponse = await fetch(`${baseUrl}/product-posts/posts/${postId}/products`);
        const linkedData = await linkedResponse.json();
        if (linkedData.success) {
          setManualProducts(linkedData.data);
        }

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
        {/* Sidebar products (sticky) */}
        {manualProducts.filter(p => p.displayType === 'sidebar').length > 0 && (
          <div className="lg:float-right lg:ml-6 lg:mb-6 lg:w-80 space-y-4">
            {manualProducts.filter(p => p.displayType === 'sidebar').map((productData) => (
              <div key={`sidebar-${productData.productId}`} className="lg:sticky lg:top-24">
                <ProductCardInPost
                  product={productData.product}
                  displayType={productData.displayType}
                  customNote={productData.customNote}
                />
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />

        {/* Inline products (after content) */}
        {manualProducts.filter(p => p.displayType === 'inline-card').map((productData) => (
          <ProductCardInPost
            key={`inline-${productData.productId}`}
            product={productData.product}
            displayType={productData.displayType}
            customNote={productData.customNote}
          />
        ))}

        {/* Manual collection products at the end */}
        {manualProducts.filter(p => p.displayType === 'end-collection').length > 0 && (
          <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Sản phẩm được đề xuất
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Các sản phẩm liên quan đến nội dung bài viết này
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {manualProducts.filter(p => p.displayType === 'end-collection').map((productData) => (
                <ProductCardInPost
                  key={`collection-${productData.productId}`}
                  product={productData.product}
                  displayType={productData.displayType}
                  customNote={productData.customNote}
                />
              ))}
            </div>
          </div>
        )}

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

