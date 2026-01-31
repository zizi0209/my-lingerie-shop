 ---
 sidebar_position: 3
 ---
 
 # Frontend Integration
 
 Guide for integrating the Size System V2 into your frontend application.
 
 ## Overview
 
 The frontend integration consists of:
 - TypeScript type definitions
 - API client library
 - React components for UI
 - Region preference management
 
 ## Setup
 
 ### 1. Environment Variables
 
 Add to `.env.local`:
 
 ```bash
 NEXT_PUBLIC_API_URL=http://localhost:5000
 # Or in production
 NEXT_PUBLIC_API_URL=https://your-api.railway.app
 ```
 
 ### 2. Required Files
 
 These files should already exist in your project:
 
 ```
 frontend/src/
 ├── types/
 │   └── size-system-v2.ts           # TypeScript types
 ├── lib/
 │   └── sizeSystemApi.ts            # API client
 └── components/product/
     ├── SisterSizeAlert.tsx         # Sister size component
     ├── BrandFitNotice.tsx          # Brand fit component
     ├── RegionSwitcher.tsx          # Region selector
     └── SizeChartConversion.tsx     # Conversion table
 ```
 
 ## Components
 
 ### SisterSizeAlert
 
 Shows alternative sizes when requested size is out of stock.
 
 **Usage:**
 
 ```tsx
 import SisterSizeAlert from '@/components/product/SisterSizeAlert';
 
 <SisterSizeAlert
   productId={product.id}
   requestedSize="34C"
   regionCode="US"
   onSizeSelect={(size, universalCode) => {
     console.log('Selected sister size:', size);
   }}
 />
 ```
 
 **Props:**
 
 ```typescript
 {
   productId: number;
   requestedSize: string;
   regionCode: RegionCode;
   onSizeSelect: (size: string, universalCode: string) => void;
   className?: string;
 }
 ```
 
 **Features:**
 - Automatically fetches sister sizes
 - Shows stock availability
 - Displays fit notes (tighter/looser band)
 - Tracks recommendation acceptance
 - "What is sister sizing?" explanation
 
 ### BrandFitNotice
 
 Displays brand fit warning and size recommendation.
 
 **Usage:**
 
 ```tsx
 import BrandFitNotice from '@/components/product/BrandFitNotice';
 
 <BrandFitNotice
   brandId="brand_ap"
   userNormalSize="34C"
   regionCode="US"
   onSizeRecommended={(recommendedSize) => {
     console.log('Recommended:', recommendedSize);
   }}
 />
 ```
 
 **Props:**
 
 ```typescript
 {
   brandId: string;
   userNormalSize?: string;
   regionCode: RegionCode;
   onSizeRecommended?: (recommendedSize: string) => void;
   className?: string;
 }
 ```
 
 **Features:**
 - Shows RUNS_SMALL / RUNS_LARGE indicators
 - Recommends adjusted size
 - Displays confidence score
 - Visual fit indicators
 
 ### RegionSwitcher
 
 Region selector dropdown for switching size standards.
 
 **Usage:**
 
 ```tsx
 import RegionSwitcher from '@/components/product/RegionSwitcher';
 
 <RegionSwitcher
   currentRegion="US"
   onRegionChange={(region) => setRegion(region)}
   availableRegions={['US', 'UK', 'EU']}
 />
 ```
 
 **Props:**
 
 ```typescript
 {
   currentRegion: RegionCode;
   onRegionChange: (region: RegionCode) => void;
   availableRegions?: RegionCode[];
   className?: string;
 }
 ```
 
 **Features:**
 - All regions supported (US, UK, EU, FR, AU, JP, VN)
 - Shows unit system (imperial/metric)
 - Persists preference
 
 ### SizeChartConversion
 
 International size conversion table.
 
 **Usage:**
 
 ```tsx
 import SizeChartConversion from '@/components/product/SizeChartConversion';
 
 <SizeChartConversion
   selectedSize="34C"
   regionCode="US"
 />
 ```
 
 **Props:**
 
 ```typescript
 {
   selectedSize?: string;
   regionCode: RegionCode;
   className?: string;
 }
 ```
 
 **Features:**
 - Shows US, UK, EU, FR equivalents
 - Highlights selected size
 - Cup progression explanation
 - Common conversion mistakes guide
 
 ## Integration Examples
 
 ### Product Detail Page
 
 Complete integration example:
 
 ```tsx
 "use client";
 
 import { useState } from 'react';
 import SisterSizeAlert from '@/components/product/SisterSizeAlert';
 import BrandFitNotice from '@/components/product/BrandFitNotice';
 import RegionSwitcher from '@/components/product/RegionSwitcher';
 import type { RegionCode } from '@/types/size-system-v2';
 
 export default function ProductPage({ product }) {
   const [selectedSize, setSelectedSize] = useState<string>('');
   const [regionCode, setRegionCode] = useState<RegionCode>('US');
 
   return (
     <div className="max-w-4xl mx-auto p-6">
       {/* Product Info */}
       <h1 className="text-3xl font-bold">{product.name}</h1>
       <p className="text-2xl text-gray-700 mt-2">${product.price}</p>
 
       {/* Region Switcher */}
       <div className="mt-6">
         <RegionSwitcher
           currentRegion={regionCode}
           onRegionChange={setRegionCode}
         />
       </div>
 
       {/* Brand Fit Notice */}
       {product.brandId && (
         <div className="mt-4">
           <BrandFitNotice
             brandId={product.brandId}
             userNormalSize={selectedSize}
             regionCode={regionCode}
             onSizeRecommended={(size) => {
               console.log('Brand recommends:', size);
             }}
           />
         </div>
       )}
 
       {/* Size Selector */}
       <div className="mt-6">
         <label className="block text-sm font-medium mb-2">
           Select Size
         </label>
         <select
           value={selectedSize}
           onChange={(e) => setSelectedSize(e.target.value)}
           className="w-full p-2 border rounded"
         >
           <option value="">Choose size</option>
           {product.sizes.map(size => (
             <option key={size} value={size}>{size}</option>
           ))}
         </select>
       </div>
 
       {/* Sister Size Alert */}
       {selectedSize && (
         <div className="mt-4">
           <SisterSizeAlert
             productId={product.id}
             requestedSize={selectedSize}
             regionCode={regionCode}
             onSizeSelect={(size, uic) => {
               setSelectedSize(size);
               console.log('Selected sister size:', size, uic);
             }}
           />
         </div>
       )}
 
       {/* Add to Cart */}
       <button
         disabled={!selectedSize}
         className="mt-6 w-full bg-blue-600 text-white py-3 rounded disabled:bg-gray-300"
       >
         Add to Cart
       </button>
     </div>
   );
 }
 ```
 
 ### Size Guide Modal
 
 Add conversion tab to existing size guide:
 
 ```tsx
 import { useState } from 'react';
 import SizeChartConversion from '@/components/product/SizeChartConversion';
 
 export default function SizeGuideModal({ isOpen, onClose, selectedSize, regionCode }) {
   const [activeTab, setActiveTab] = useState('chart');
 
   const tabs = [
     { key: 'chart', label: 'Size Chart' },
     { key: 'measure', label: 'How to Measure' },
     { key: 'tips', label: 'Tips' },
     { key: 'conversions', label: 'International' }, // NEW
   ];
 
   return (
     <div className={`modal ${isOpen ? 'open' : ''}`}>
       <div className="modal-content">
         <h2>Size Guide</h2>
 
         {/* Tabs */}
         <div className="tabs">
           {tabs.map(tab => (
             <button
               key={tab.key}
               onClick={() => setActiveTab(tab.key)}
               className={activeTab === tab.key ? 'active' : ''}
             >
               {tab.label}
             </button>
           ))}
         </div>
 
         {/* Tab Content */}
         <div className="tab-content">
           {activeTab === 'chart' && <div>Size Chart Content</div>}
           {activeTab === 'measure' && <div>Measurement Guide</div>}
           {activeTab === 'tips' && <div>Fitting Tips</div>}
           {activeTab === 'conversions' && (
             <SizeChartConversion
               selectedSize={selectedSize}
               regionCode={regionCode}
             />
           )}
         </div>
 
         <button onClick={onClose}>Close</button>
       </div>
     </div>
   );
 }
 ```
 
 ## Region Preference Context
 
 Persist user's region preference across the app:
 
 ```tsx
 // contexts/RegionContext.tsx
 
 "use client";
 
 import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 import type { RegionCode } from '@/types/size-system-v2';
 
 interface RegionContextType {
   regionCode: RegionCode;
   setRegionCode: (region: RegionCode) => void;
 }
 
 const RegionContext = createContext<RegionContextType | undefined>(undefined);
 
 export function RegionProvider({ children }: { children: ReactNode }) {
   const [regionCode, setRegionCodeState] = useState<RegionCode>('US');
 
   // Load from localStorage on mount
   useEffect(() => {
     const saved = localStorage.getItem('preferredRegion') as RegionCode;
     if (saved) {
       setRegionCodeState(saved);
     }
   }, []);
 
   const setRegionCode = (region: RegionCode) => {
     setRegionCodeState(region);
     localStorage.setItem('preferredRegion', region);
   };
 
   return (
     <RegionContext.Provider value={{ regionCode, setRegionCode }}>
       {children}
     </RegionContext.Provider>
   );
 }
 
 export function useRegion() {
   const context = useContext(RegionContext);
   if (!context) {
     throw new Error('useRegion must be used within RegionProvider');
   }
   return context;
 }
 ```
 
 **Wrap your app:**
 
 ```tsx
 // app/layout.tsx
 
 import { RegionProvider } from '@/contexts/RegionContext';
 
 export default function RootLayout({ children }) {
   return (
     <html>
       <body>
         <RegionProvider>
           {children}
         </RegionProvider>
       </body>
     </html>
   );
 }
 ```
 
 **Use in components:**
 
 ```tsx
 import { useRegion } from '@/contexts/RegionContext';
 
 function MyComponent() {
   const { regionCode, setRegionCode } = useRegion();
 
   return (
     <RegionSwitcher
       currentRegion={regionCode}
       onRegionChange={setRegionCode}
     />
   );
 }
 ```
 
 ## API Client Usage
 
 Direct API calls without components:
 
 ```typescript
 import * as sizeSystemApi from '@/lib/sizeSystemApi';
 
 // Get sister sizes
 const sisters = await sizeSystemApi.getSisterSizes('UIC_BRA_BAND86_CUPVOL6');
 
 // Convert cup letter
 const conversion = await sizeSystemApi.convertCupLetter('US', 'EU', 'DD');
 // Returns: { toCupLetter: 'E', cupVolume: 6 }
 
 // Get brand fit adjustment
 const fit = await sizeSystemApi.getBrandFitAdjustment('brand_ap', '34C', 'US');
 // Returns: { recommendedSize: '36D', fitNote: '...' }
 
 // Submit feedback
 await sizeSystemApi.submitBrandFitFeedback({
   brandId: 'brand_ap',
   productId: 123,
   normalSize: '34C',
   boughtSize: '36D',
   fitRating: 4,
   comment: 'Perfect fit!'
 });
 ```
 
 ## Component Flowchart
 
 ```
 Product Page
 ├── RegionSwitcher
 │   └── Updates region preference
 │
 ├── BrandFitNotice (if brand has fit profile)
 │   ├── Fetches brand fit adjustment
 │   └── Shows recommended size
 │
 ├── Size Selector
 │   └── User selects size
 │
 └── SisterSizeAlert (if size out of stock)
     ├── Fetches sister sizes
     ├── Shows alternatives
     └── Tracks acceptance
 
 Size Guide Modal
 └── SizeChartConversion Tab
     ├── Fetches conversion matrices
     └── Shows US/UK/EU equivalents
 ```
 
 ## Testing
 
 ### Test Sister Size Alert
 
 ```tsx
 // Out-of-stock size
 <SisterSizeAlert
   productId={1}
   requestedSize="34C"
   regionCode="US"
   onSizeSelect={(size, uic) => console.log(size, uic)}
 />
 ```
 
 ### Test Brand Fit Notice
 
 ```tsx
 // RUNS_SMALL brand
 <BrandFitNotice
   brandId="brand_ap" // Agent Provocateur
   userNormalSize="34C"
   regionCode="US"
   onSizeRecommended={(size) => console.log('Recommend:', size)}
 />
 ```
 
 ### Test Region Switcher
 
 ```tsx
 <RegionSwitcher
   currentRegion="US"
   onRegionChange={(region) => console.log('Changed to:', region)}
 />
 ```
 
 ## Styling
 
 Components use Tailwind CSS classes and support:
 - Custom className prop
 - Dark mode via `dark:` classes
 - Responsive design
 
 **Customize styles:**
 
 ```tsx
 <SisterSizeAlert
   className="my-custom-class bg-blue-50 dark:bg-blue-900"
   {...props}
 />
 ```
 
 ## Error Handling
 
 Components handle errors gracefully:
 
 ```tsx
 // Add toast notifications
 import { toast } from 'react-hot-toast';
 
 <SisterSizeAlert
   onError={(error) => {
     toast.error('Failed to load sister sizes');
     console.error(error);
   }}
   {...props}
 />
 ```
 
 ## Analytics
 
 Track user interactions:
 
 ```tsx
 <SisterSizeAlert
   onSizeSelect={(size, uic) => {
     // Track in analytics
     analytics.track('Sister Size Selected', {
       originalSize: requestedSize,
       selectedSize: size,
       productId: productId
     });
   }}
   {...props}
 />
 ```
 
 ## Related Documentation
 
 - [Size System API](../api-reference/size-system) - API reference
 - [Quick Reference](./quick-reference) - Developer cheat sheet
 - [Size System Features](./features/size-system) - Feature documentation
 
 ---
 
 **Status**: ✅ Ready for integration  
 **Backend**: ✅ All endpoints available  
 **Components**: ✅ Fully functional
