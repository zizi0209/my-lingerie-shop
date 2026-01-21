 'use client';
 
 import { useMemo, useState, useEffect } from 'react';
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
 
 interface Props {
   content: string;
   products: ProductOnPost[];
   onRemove?: (productId: number) => void;
 }
 
 export default function ContentWithInlineProducts({ content, products, onRemove }: Props) {
   const [embeddedProducts, setEmbeddedProducts] = useState<Map<number, Product>>(new Map());
   const [loadingProducts, setLoadingProducts] = useState<Set<number>>(new Set());
   const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

   // Fetch embedded products that are not in the products list
   useEffect(() => {
     const fetchEmbeddedProduct = async (productId: number) => {
       if (embeddedProducts.has(productId) || loadingProducts.has(productId)) {
         return;
       }

       setLoadingProducts(prev => new Set(prev).add(productId));

       try {
         const response = await fetch(`${baseUrl}/products/${productId}`);
         if (!response.ok) throw new Error('Product not found');
         
         const data = await response.json();
         const product = data.product || data.data || data;
         
         setEmbeddedProducts(prev => new Map(prev).set(productId, product));
       } catch (error) {
         console.error(`[ContentWithInlineProducts] Failed to fetch product ${productId}:`, error);
       } finally {
         setLoadingProducts(prev => {
           const next = new Set(prev);
           next.delete(productId);
           return next;
         });
       }
     };

     // Parse HTML to find embedded product IDs
     if (typeof window !== 'undefined') {
       const parser = new DOMParser();
       const doc = parser.parseFromString(content, 'text/html');
       const productNodes = doc.querySelectorAll('[data-product-id]');
       
       const productMap = new Map(products.map(p => [p.productId, p]));
       
       productNodes.forEach((node) => {
         const productId = Number(node.getAttribute('data-product-id'));
         // Only fetch if not in manual products list
         if (!productMap.has(productId)) {
           fetchEmbeddedProduct(productId);
         }
       });
     }
   }, [content, products, baseUrl, embeddedProducts, loadingProducts]);

   const renderedContent = useMemo(() => {
     if (typeof window === 'undefined') {
       return <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />;
     }
 
     const parser = new DOMParser();
     const doc = parser.parseFromString(content, 'text/html');
     const productNodes = doc.querySelectorAll('[data-product-id]');

     if (productNodes.length === 0) {
       return <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />;
     }
 
     const productMap = new Map(products.filter(p => p.displayType === 'inline-card').map(p => [p.productId, p]));
 
     const fragments: Array<{ type: 'html' | 'product' | 'embedded-product'; content: string | number | { productId: number; displayType: string; customNote?: string }; index: number }> = [];
     let lastIndex = 0;
     let fragmentIndex = 0;
     const bodyHTML = doc.body.innerHTML;
     const seenProductIds = new Set<number>();
 
     productNodes.forEach((node) => {
       const productId = Number(node.getAttribute('data-product-id'));
       const nodeHTML = (node as Element).outerHTML;
       const nodeIndex = bodyHTML.indexOf(nodeHTML, lastIndex);
 
       if (nodeIndex !== -1) {
         if (nodeIndex > lastIndex) {
           fragments.push({
             type: 'html',
             content: bodyHTML.substring(lastIndex, nodeIndex),
             index: fragmentIndex++,
           });
         }
 
         // Skip duplicate products
         if (seenProductIds.has(productId)) {
           lastIndex = nodeIndex + nodeHTML.length;
           return;
         }
         seenProductIds.add(productId);
 
         // Try to find product in manual products first
         if (productMap.has(productId)) {
           fragments.push({
             type: 'product',
             content: productId,
             index: fragmentIndex++,
           });
         } else {
           // Embedded product from HTML
           const displayType = node.getAttribute('data-display-type') || 'inline-card';
           const customNote = node.getAttribute('data-custom-note') || undefined;
           
           fragments.push({
             type: 'embedded-product',
             content: { productId, displayType, customNote },
             index: fragmentIndex++,
           });
         }
 
         lastIndex = nodeIndex + nodeHTML.length;
       }
     });
 
     if (lastIndex < bodyHTML.length) {
       fragments.push({
         type: 'html',
         content: bodyHTML.substring(lastIndex),
         index: fragmentIndex++,
       });
     }
 
     return (
       <>
         {fragments.map((fragment) => {
           if (fragment.type === 'html') {
             return (
               <div
                 key={`html-${fragment.index}`}
                 dangerouslySetInnerHTML={{ __html: sanitizeForPublic(fragment.content as string) }}
               />
             );
           } else if (fragment.type === 'product') {
             const productData = productMap.get(fragment.content as number);
             if (!productData) return null;
 
             return (
               <ProductCardInPost
                 key={`product-${fragment.content}-${fragment.index}`}
                 product={productData.product}
                 displayType={productData.displayType}
                 customNote={productData.customNote}
                 onRemove={onRemove}
               />
             );
           } else if (fragment.type === 'embedded-product') {
             const data = fragment.content as { productId: number; displayType: string; customNote?: string };
             const product = embeddedProducts.get(data.productId);
             const isLoading = loadingProducts.has(data.productId);

             if (isLoading) {
               return (
                 <div key={`loading-${data.productId}-${fragment.index}`} className="my-4 sm:my-6 lg:my-8">
                   <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 animate-pulse">
                     <div className="flex flex-col sm:flex-row items-start gap-3">
                       <div className="w-full sm:w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                       <div className="flex-1 w-full space-y-2">
                         <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                         <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                       </div>
                     </div>
                   </div>
                 </div>
               );
             }

             if (!product) {
               return (
                 <div key={`error-${data.productId}-${fragment.index}`} className="my-4 sm:my-6 lg:my-8">
                   <div className="border-2 border-dashed border-red-300 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                     <div className="text-center text-red-600 dark:text-red-400">
                       <div className="text-2xl mb-2">⚠️</div>
                       <div className="font-medium text-sm sm:text-base">Không tìm thấy sản phẩm #{data.productId}</div>
                       <div className="text-xs sm:text-sm mt-1 opacity-75">Sản phẩm có thể đã bị xóa hoặc không còn tồn tại</div>
                     </div>
                   </div>
                 </div>
               );
             }

             return (
               <ProductCardInPost
                 key={`embedded-${data.productId}-${fragment.index}`}
                 product={product}
                 displayType={data.displayType as 'inline-card' | 'sidebar' | 'end-collection'}
                 customNote={data.customNote}
                 onRemove={onRemove}
               />
             );
           }
           return null;
         })}
       </>
     );
   }, [content, products, onRemove, embeddedProducts, loadingProducts]);
 
   return renderedContent;
 }
