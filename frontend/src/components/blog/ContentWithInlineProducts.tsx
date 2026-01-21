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
 
     const fragments: Array<{ type: 'html' | 'product'; content: string | number }> = [];
     let lastIndex = 0;
     const bodyHTML = doc.body.innerHTML;
 
     productNodes.forEach((node) => {
       const productId = Number(node.getAttribute('data-product-id'));
       const nodeHTML = (node as Element).outerHTML;
       const nodeIndex = bodyHTML.indexOf(nodeHTML, lastIndex);
 
       if (nodeIndex !== -1 && productMap.has(productId)) {
         if (nodeIndex > lastIndex) {
           fragments.push({
             type: 'html',
             content: bodyHTML.substring(lastIndex, nodeIndex),
           });
         }
 
         fragments.push({
           type: 'product',
           content: productId,
         });
 
         lastIndex = nodeIndex + nodeHTML.length;
       }
     });
 
     if (lastIndex < bodyHTML.length) {
       fragments.push({
         type: 'html',
         content: bodyHTML.substring(lastIndex),
       });
     }
 
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
           } else {
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
           }
         })}
       </>
     );
   }, [content, products, onRemove]);
 
   return renderedContent;
 }
