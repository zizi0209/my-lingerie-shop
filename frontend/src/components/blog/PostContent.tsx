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
  const [products, setProducts] = useState<ProductOnPost[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch manual linked products
        const linkedResponse = await fetch(`${baseUrl}/product-posts/posts/${postId}/products`);
        const linkedData = await linkedResponse.json();
        if (linkedData.success) {
          setProducts(linkedData.data);
        }

        // Fetch auto-recommended products
        const recommendedResponse = await fetch(`${baseUrl}/product-posts/posts/${postId}/recommended?limit=6`);
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
    // Group products by display type for easier rendering
    const inlineProducts = products.filter((p) => p.displayType === 'inline-card');
    const sidebarProducts = products.filter((p) => p.displayType === 'sidebar');
    const collectionProducts = products.filter((p) => p.displayType === 'end-collection');

    // Nếu không có products, render content bình thường
    if (products.length === 0) {
      return (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }}
        />
      );
    }

    // Parse content thành array of paragraphs và inject products
    const paragraphs = content.split(/<\/p>|<\/h[1-6]>|<\/blockquote>|<\/ul>|<\/ol>/);
    const contentParts: ReactElement[] = [];
    let productIndex = 0;

    paragraphs.forEach((para, index) => {
      if (para.trim()) {
        // Render paragraph
        contentParts.push(
          <div
            key={`para-${index}`}
            dangerouslySetInnerHTML={{ __html: sanitizeForPublic(para + '</p>') }}
          />
        );

        // Inject inline product nếu có (mỗi 3 paragraphs)
        if (
          index > 0 &&
          index % 3 === 0 &&
          productIndex < inlineProducts.length
        ) {
          const productData = inlineProducts[productIndex];
          contentParts.push(
            <ProductCardInPost
              key={`product-${productData.productId}`}
              product={productData.product}
              displayType={productData.displayType}
              customNote={productData.customNote}
            />
          );
          productIndex++;
        }
      }
    });

    return (
      <div className={className}>
        {/* Sidebar products (sticky) */}
        {sidebarProducts.length > 0 && (
          <div className="lg:float-right lg:ml-6 lg:mb-6 lg:w-80 space-y-4">
            {sidebarProducts.map((productData) => (
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

        {/* Main content with inline products */}
        <div>{contentParts}</div>

        {/* Collection products at the end */}
        {(collectionProducts.length > 0 || recommendedProducts.length > 0) && (
          <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Sản phẩm được đề xuất
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Các sản phẩm liên quan đến nội dung bài viết này
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Manual linked products (hiển thị trước) */}
              {collectionProducts.map((productData) => (
                <ProductCardInPost
                  key={`collection-${productData.productId}`}
                  product={productData.product}
                  displayType={productData.displayType}
                  customNote={productData.customNote}
                />
              ))}
              
              {/* Auto-recommended products (hiển thị sau) */}
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
