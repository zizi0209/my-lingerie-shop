 'use client';
 
 import { Component, ErrorInfo, ReactNode } from 'react';
 import { AlertTriangle, RefreshCw } from 'lucide-react';
 
 interface Props {
   children: ReactNode;
   fallback?: ReactNode;
   onReset?: () => void;
 }
 
 interface State {
   hasError: boolean;
   error: Error | null;
 }
 
 /**
  * Error Boundary for Virtual Try-On components
  * Catches and handles errors gracefully with user-friendly UI
  */
 export class VirtualTryOnErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
     super(props);
     this.state = { hasError: false, error: null };
   }
 
   static getDerivedStateFromError(error: Error): State {
     return { hasError: true, error };
   }
 
   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     console.error('[VirtualTryOn] Error caught by boundary:', error);
     console.error('[VirtualTryOn] Component stack:', errorInfo.componentStack);
   }
 
   handleReset = () => {
     this.setState({ hasError: false, error: null });
     this.props.onReset?.();
   };
 
   render() {
     if (this.state.hasError) {
       if (this.props.fallback) {
         return this.props.fallback;
       }
 
       return (
         <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
           <div className="flex items-start gap-3">
             <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
             <div className="flex-1">
               <h3 className="text-red-800 font-semibold mb-2">
                 Đã xảy ra lỗi
               </h3>
               <p className="text-red-600 text-sm mb-4">
                 Tính năng thử đồ ảo gặp sự cố. Vui lòng thử lại.
               </p>
               {this.state.error && (
                 <details className="mb-4">
                   <summary className="text-red-500 text-xs cursor-pointer hover:underline">
                     Chi tiết lỗi
                   </summary>
                   <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 overflow-auto max-h-32">
                     {this.state.error.message}
                   </pre>
                 </details>
               )}
               <button
                 type="button"
                 onClick={this.handleReset}
                 className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
               >
                 <RefreshCw className="w-4 h-4" />
                 Thử lại
               </button>
             </div>
           </div>
         </div>
       );
     }
 
     return this.props.children;
   }
 }
