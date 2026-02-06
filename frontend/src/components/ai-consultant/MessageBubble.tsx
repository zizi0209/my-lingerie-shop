 'use client';
 
 import { Message } from '@/hooks/useAIConsultant';
 import Link from 'next/link';
 
 interface MessageBubbleProps {
   message: Message;
 }
 
 export function MessageBubble({ message }: MessageBubbleProps) {
   const isUser = message.role === 'user';
 
   return (
     <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
       <div
         className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
           isUser
             ? 'bg-pink-500 text-white rounded-br-md'
             : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
         }`}
       >
         <p className="text-sm whitespace-pre-wrap">{message.content}</p>
         
         {message.suggestedProducts && message.suggestedProducts.length > 0 && (
           <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
               Sản phẩm gợi ý:
             </p>
             <div className="space-y-2">
               {message.suggestedProducts.map(product => (
                 <Link
                   key={product.id}
                   href={`/san-pham/${product.slug}`}
                   className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                 >
                   {product.imageUrl && (
                     <img
                       src={product.imageUrl}
                       alt={product.name}
                       className="w-10 h-10 object-cover rounded"
                     />
                   )}
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-medium truncate">{product.name}</p>
                     <p className="text-xs text-pink-500">
                       {product.price.toLocaleString('vi-VN')}đ
                     </p>
                   </div>
                 </Link>
               ))}
             </div>
           </div>
         )}
         
         <p className="text-[10px] opacity-60 mt-1">
           {message.timestamp.toLocaleTimeString('vi-VN', {
             hour: '2-digit',
             minute: '2-digit',
           })}
         </p>
       </div>
     </div>
   );
 }
