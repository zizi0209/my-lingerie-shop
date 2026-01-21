 'use client';
 
 import { useState } from 'react';
 import Link from 'next/link';
 import Image from 'next/image';
 import { ShoppingBag, Tag, TrendingUp, ExternalLink, X } from 'lucide-react';
 import { trackContentCommerce } from '@/lib/tracking';
 
 interface Product {
   id: number;
   name: string;
   slug: string;
   price: number;
   salePrice?: number;
   images: { url: string }[];
   category: { name: string; slug: string };
 }
 
 interface ProductCardInPostProps {
   product: Product;
   displayType: 'inline-card' | 'sidebar' | 'end-collection';
   customNote?: string;
   className?: string;
   onRemove?: (productId: number) => void;
 }
 
 export default function ProductCardInPost({
   product,
   displayType,
   customNote,
   className = '',
   onRemove,
 }: ProductCardInPostProps) {
   const [imageLoading, setImageLoading] = useState(true);
 
   const formatPrice = (price: number) => {
     return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
   };
 
   const discount = product.salePrice
     ? Math.round(((product.price - product.salePrice) / product.price) * 100)
     : 0;
 
   const handleClick = () => {
     trackContentCommerce({
       event: 'product_click_from_post',
       productId: product.id,
       productSlug: product.slug,
       displayType,
     });
   };
 
   const handleRemoveClick = (e: React.MouseEvent) => {
     e.preventDefault();
     e.stopPropagation();
     if (onRemove) {
       onRemove(product.id);
     }
   };
 
   if (displayType === 'inline-card') {
     return (
       <div className={`my-8 ${className}`}>
         <Link
           href={`/san-pham/${product.slug}`}
           onClick={handleClick}
           className="block group relative overflow-hidden rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/10"
         >
           <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
             {onRemove && (
               <button
                 type="button"
                 onClick={handleRemoveClick}
                 className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                 title="Xóa sản phẩm"
               >
                 <X className="w-4 h-4" />
               </button>
             )}
             <div className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-lg group-hover:scale-110 transition-transform">
               <ExternalLink className="w-4 h-4 text-rose-500" />
             </div>
           </div>
 
           {customNote && (
             <div className="absolute top-3 left-3 z-10 max-w-[60%]">
               <div className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium rounded-full shadow-lg">
                 💡 {customNote}
               </div>
             </div>
           )}
 
           <div className="flex gap-4 p-5">
             <div className="relative w-32 h-32 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
               {product.images[0] && (
                 <Image
                   src={product.images[0].url}
                   alt={product.name}
                   fill
                   sizes="128px"
                   className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
                     imageLoading ? 'blur-sm' : 'blur-0'
                   }`}
                   onLoadingComplete={() => setImageLoading(false)}
                 />
               )}
               {discount > 0 && (
                 <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                   -{discount}%
                 </div>
               )}
             </div>
 
             <div className="flex-1 flex flex-col justify-between min-w-0">
               <div>
                 <div className="flex items-center gap-2 mb-2">
                   <Tag className="w-3.5 h-3.5 text-rose-500" />
                   <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                     {product.category.name}
                   </span>
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                   {product.name}
                 </h3>
               </div>
 
               <div className="flex items-end justify-between gap-3">
                 <div className="flex items-baseline gap-2">
                   {product.salePrice ? (
                     <>
                       <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                         {formatPrice(product.salePrice)}
                       </span>
                       <span className="text-sm text-slate-400 line-through">
                         {formatPrice(product.price)}
                       </span>
                     </>
                   ) : (
                     <span className="text-2xl font-black text-slate-900 dark:text-white">
                       {formatPrice(product.price)}
                     </span>
                   )}
                 </div>
 
                 <div className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg group-hover:bg-rose-700 transition-colors shadow-lg group-hover:shadow-rose-500/50">
                   <ShoppingBag className="w-4 h-4" />
                   <span>Xem ngay</span>
                 </div>
               </div>
             </div>
           </div>
 
           <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-pink-500/5 pointer-events-none" />
         </Link>
       </div>
     );
   }
 
   if (displayType === 'sidebar') {
     return (
       <div className={`mb-4 ${className}`}>
         <Link
           href={`/san-pham/${product.slug}`}
           onClick={handleClick}
           className="block group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-lg transition-all duration-300"
         >
           {customNote && (
             <div className="absolute top-2 left-2 right-2 z-10">
               <div className="px-2 py-1 bg-rose-500 text-white text-xs font-medium rounded-md shadow-md text-center truncate">
                 💡 {customNote}
               </div>
             </div>
           )}
 
           <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800">
             {product.images[0] && (
               <Image
                 src={product.images[0].url}
                 alt={product.name}
                 fill
                 sizes="280px"
                 className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
                   imageLoading ? 'blur-sm' : 'blur-0'
                 }`}
                 onLoadingComplete={() => setImageLoading(false)}
               />
             )}
             {discount > 0 && (
               <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                 -{discount}%
               </div>
             )}
             {onRemove && (
               <button
                 type="button"
                 onClick={handleRemoveClick}
                 className="absolute top-2 left-2 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors z-20"
                 title="Xóa sản phẩm"
               >
                 <X className="w-3.5 h-3.5" />
               </button>
             )}
           </div>
 
           <div className="p-3">
             <div className="flex items-center gap-1.5 mb-1.5">
               <Tag className="w-3 h-3 text-rose-500" />
               <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                 {product.category.name}
               </span>
             </div>
 
             <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
               {product.name}
             </h3>
 
             <div className="flex flex-col gap-1 mb-3">
               {product.salePrice ? (
                 <>
                   <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                     {formatPrice(product.salePrice)}
                   </span>
                   <span className="text-xs text-slate-400 line-through">
                     {formatPrice(product.price)}
                   </span>
                 </>
               ) : (
                 <span className="text-lg font-black text-slate-900 dark:text-white">
                   {formatPrice(product.price)}
                 </span>
               )}
             </div>
 
             <div className="flex items-center justify-center gap-2 w-full py-2 bg-rose-600 text-white text-xs font-bold rounded-lg group-hover:bg-rose-700 transition-colors">
               <ShoppingBag className="w-3.5 h-3.5" />
               <span>Xem ngay</span>
             </div>
           </div>
         </Link>
       </div>
     );
   }
 
   return (
     <div className={className}>
       <Link
         href={`/san-pham/${product.slug}`}
         onClick={handleClick}
         className="block group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300"
       >
         {customNote && (
           <div className="absolute top-3 left-3 right-3 z-10">
             <div className="px-2.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium rounded-lg shadow-lg text-center">
               💡 {customNote}
             </div>
           </div>
         )}
 
         <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800">
           {product.images[0] && (
             <Image
               src={product.images[0].url}
               alt={product.name}
               fill
               sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
               className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
                 imageLoading ? 'blur-sm' : 'blur-0'
               }`}
               onLoadingComplete={() => setImageLoading(false)}
             />
           )}
           {discount > 0 && (
             <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
               -{discount}%
             </div>
           )}
           {onRemove && (
             <button
               type="button"
               onClick={handleRemoveClick}
               className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors z-20"
               title="Xóa sản phẩm"
             >
               <X className="w-4 h-4" />
             </button>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
         </div>
 
         <div className="p-4">
           <div className="flex items-center gap-2 mb-2">
             <Tag className="w-3.5 h-3.5 text-rose-500" />
             <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
               {product.category.name}
             </span>
             {product.salePrice && (
               <TrendingUp className="w-3.5 h-3.5 text-green-500 ml-auto" />
             )}
           </div>
 
           <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug">
             {product.name}
           </h3>
 
           <div className="flex items-baseline gap-2 mb-4">
             {product.salePrice ? (
               <>
                 <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                   {formatPrice(product.salePrice)}
                 </span>
                 <span className="text-sm text-slate-400 line-through">
                   {formatPrice(product.price)}
                 </span>
               </>
             ) : (
               <span className="text-xl font-black text-slate-900 dark:text-white">
                 {formatPrice(product.price)}
               </span>
             )}
           </div>
 
           <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-600 text-white text-sm font-bold rounded-lg group-hover:bg-rose-700 transition-colors shadow-lg group-hover:shadow-rose-500/50">
             <ShoppingBag className="w-4 h-4" />
             <span>Xem ngay</span>
           </div>
         </div>
       </Link>
     </div>
   );
 }
