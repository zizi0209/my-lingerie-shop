 'use client';
 
 import { VirtualTryOnModal } from './VirtualTryOnModal';
 import { VirtualTryOnErrorBoundary } from './VirtualTryOnErrorBoundary';
 
 interface Product {
   id: string;
   name: string;
   imageUrl: string;
 }
 
 interface VirtualTryOnWrapperProps {
   isOpen: boolean;
   onClose: () => void;
   product: Product;
   onAddToCart?: () => void;
 }
 
 /**
  * Wrapper component that provides error boundary protection
  * for the Virtual Try-On Modal
  */
 export function VirtualTryOnWrapper({
   isOpen,
   onClose,
   product,
   onAddToCart,
 }: VirtualTryOnWrapperProps) {
   if (!isOpen) return null;
 
   return (
     <VirtualTryOnErrorBoundary onReset={onClose}>
       <VirtualTryOnModal
         isOpen={isOpen}
         onClose={onClose}
         product={product}
         onAddToCart={onAddToCart}
       />
     </VirtualTryOnErrorBoundary>
   );
 }
