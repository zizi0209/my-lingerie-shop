 'use client';
 
 import { useMemo } from 'react';
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
   const renderedContent = useMemo(() => {
     console.log('[ContentWithInlineProducts] Rendering content:', {
       contentLength: content.length,
       contentPreview: content.substring(0, 200),
       productsCount: products.length,
       inlineProducts: products.filter(p => p.displayType === 'inline-card').length
     });

     if (typeof window === 'undefined') {
       return <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />;
     }
 
     const parser = new DOMParser();
     const doc = parser.parseFromString(content, 'text/html');
     const productNodes = doc.querySelectorAll('[data-product-id]');
 
     console.log('[ContentWithInlineProducts] Found product nodes:', productNodes.length);
     productNodes.forEach((node, idx) => {
       console.log(`[ContentWithInlineProducts] Node ${idx}:`, {
         productId: node.getAttribute('data-product-id'),
         displayType: node.getAttribute('data-display-type'),
         customNote: node.getAttribute('data-custom-note'),
         html: (node as Element).outerHTML
       });
     });

     if (productNodes.length === 0) {
       return <div dangerouslySetInnerHTML={{ __html: sanitizeForPublic(content) }} />;
     }
 
     const productMap = new Map(products.filter(p => p.displayType === 'inline-card').map(p => [p.productId, p]));
 
     const fragments: Array<{ type: 'html' | 'product' | 'embedded-product'; content: string | number | ProductOnPost }> = [];
     let lastIndex = 0;
     const bodyHTML = doc.body.innerHTML;
 
     productNodes.forEach((node) => {
       const productId = Number(node.getAttribute('data-product-id'));
       const nodeHTML = (node as Element).outerHTML;
       const nodeIndex = bodyHTML.indexOf(nodeHTML, lastIndex);
 
       if (nodeIndex !== -1) {
         if (nodeIndex > lastIndex) {
           fragments.push({
             type: 'html',
             content: bodyHTML.substring(lastIndex, nodeIndex),
           });
         }
 
         // Try to find product in manual products first
         if (productMap.has(productId)) {
           fragments.push({
             type: 'product',
             content: productId,
           });
         } else {
           // If not found in manual products, render as embedded product from HTML
           const displayType = (node.getAttribute('data-display-type') || 'inline-card') as 'inline-card' | 'sidebar' | 'end-collection';
           const customNote = node.getAttribute('data-custom-note') || undefined;
           
           const tempProduct: ProductOnPost = {
             productId,
             displayType,
             customNote,
             product: {
               id: productId,
               name: `Product ${productId}`,
               slug: `product-${productId}`,
               price: 0,
               images: [],
               category: { name: 'Loading...', slug: 'loading' }
             }
           };
 
           fragments.push({
             type: 'embedded-product',
             content: tempProduct,
           });
         }
 
         lastIndex = nodeIndex + nodeHTML.length;
       }
     });
 
     if (lastIndex < bodyHTML.length) {
       fragments.push({
         type: 'html',
         content: bodyHTML.substring(lastIndex),
       });
     }
 
     console.log('[ContentWithInlineProducts] Fragments:', fragments.map(f => ({ type: f.type, content: typeof f.content === 'object' ? 'object' : f.content })));
 
     return (
       <>
         {fragments.map((fragment, idx) => {
           if (fragment.type === 'html') {
             return (
               <div
                 key={`html-${idx}`}
                 dangerouslySetInnerHTML={{ __html: sanitizeForPublic(fragment.content as string) }}
               />
             );
           } else if (fragment.type === 'product') {
             const productData = productMap.get(fragment.content as number);
             if (!productData) return null;
 
             return (
               <ProductCardInPost
                 key={`product-inline-${fragment.content}`}
                 product={productData.product}
                 displayType={productData.displayType}
                 customNote={productData.customNote}
                 onRemove={onRemove}
               />
             );
           } else if (fragment.type === 'embedded-product') {
             const productData = fragment.content as ProductOnPost;
             return (
               <div key={`embedded-${productData.productId}`} className="embedded-product-placeholder">
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                   <div className="text-center text-slate-500 dark:text-slate-400">
                     <div className="text-2xl mb-2">🛍️</div>
                     <div className="font-medium">Embedded Product #{productData.productId}</div>
                     {productData.customNote && (
                       <div className="text-sm italic mt-1">&ldquo;{productData.customNote}&rdquo;</div>
                     )}
                     <div className="text-xs mt-2">Type: {productData.displayType}</div>
                   </div>
                 </div>
               </div>
             );
           }
           return null;
         })}
       </>
     );
   }, [content, products, onRemove]);
 
   return renderedContent;
 }
