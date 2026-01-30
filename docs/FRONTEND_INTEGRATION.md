# 🎨 SIZE SYSTEM V2 - FRONTEND COMPONENTS

## ✅ CREATED COMPONENTS

### 1. **Type Definitions**
**File:** `frontend/src/types/size-system-v2.ts`

Complete TypeScript types for:
- Sister Sizing types
- Cup Progression types
- Brand Fit types
- UI component props
- API response types
- Region preferences

### 2. **API Client**
**File:** `frontend/src/lib/sizeSystemApi.ts`

API client with functions for:
- `getSisterSizes()` - Get sister sizes
- `getAvailableSisterSizes()` - Check alternatives when out of stock
- `acceptSisterSizeRecommendation()` - Track recommendation acceptance
- `convertCupLetter()` - Convert cup between regions
- `getCupProgression()` - Get cup progression for region
- `getCupConversionMatrix()` - Get conversion matrix
- `getBrandFitAdjustment()` - Get recommended size for brand
- `getBrandFitProfile()` - Get brand fit profile
- `submitBrandFitFeedback()` - Submit fit feedback
- `getBrandFitStats()` - Get brand fit statistics

### 3. **UI Components**

#### **SisterSizeAlert**
**File:** `frontend/src/components/product/SisterSizeAlert.tsx`

Shows when requested size is out of stock, displays sister size alternatives.

**Props:**
```typescript
{
  productId: number;
  requestedSize: string;
  regionCode: RegionCode;
  onSizeSelect: (size: string, universalCode: string) => void;
}
```

**Features:**
- Automatic sister size lookup
- Stock availability
- Fit notes (tighter/looser band)
- "What is sister sizing?" explanation
- Tracks recommendation acceptance

#### **BrandFitNotice**
**File:** `frontend/src/components/product/BrandFitNotice.tsx`

Displays brand fit warning and size recommendation.

**Props:**
```typescript
{
  brandId: string;
  userNormalSize?: string;
  regionCode: RegionCode;
  onSizeRecommended?: (recommendedSize: string) => void;
}
```

**Features:**
- RUNS_SMALL / RUNS_LARGE indicators
- Recommended size based on brand fit
- Confidence score
- Visual fit indicators

#### **RegionSwitcher**
**File:** `frontend/src/components/product/RegionSwitcher.tsx`

Region selector dropdown for switching between size standards.

**Props:**
```typescript
{
  currentRegion: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  availableRegions?: RegionCode[];
}
```

**Features:**
- Dropdown with all regions (US, UK, EU, FR, AU, JP, VN)
- Shows unit system (imperial/metric)
- Saves preference

#### **SizeChartConversion**
**File:** `frontend/src/components/product/SizeChartConversion.tsx`

International size conversion table for Size Guide Modal.

**Props:**
```typescript
{
  selectedSize?: string;
  regionCode: RegionCode;
}
```

**Features:**
- Shows US, UK, EU, FR equivalents
- Highlights selected size
- Cup progression explanation
- Common conversion mistakes guide

---

## 📍 HOW TO INTEGRATE

### 1. **Product Detail Page**

Add sister sizing and brand fit to your product page:

```tsx
// pages/products/[slug].tsx or app/products/[slug]/page.tsx

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
    <div>
      {/* Product Info */}
      <h1>{product.name}</h1>
      <p>${product.price}</p>

      {/* Region Switcher */}
      <RegionSwitcher
        currentRegion={regionCode}
        onRegionChange={setRegionCode}
        className="mb-4"
      />

      {/* Brand Fit Notice */}
      {product.brandId && (
        <BrandFitNotice
          brandId={product.brandId}
          userNormalSize={selectedSize}
          regionCode={regionCode}
          onSizeRecommended={(recommendedSize) => {
            console.log('Recommended size:', recommendedSize);
          }}
          className="mb-4"
        />
      )}

      {/* Size Selector */}
      <div className="mb-4">
        <label>Select Size:</label>
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          <option value="">Choose size</option>
          {product.sizes.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* Sister Size Alert (shows when selected size is out of stock) */}
      {selectedSize && (
        <SisterSizeAlert
          productId={product.id}
          requestedSize={selectedSize}
          regionCode={regionCode}
          onSizeSelect={(size, universalCode) => {
            setSelectedSize(size);
            console.log('User selected sister size:', size);
          }}
          className="mb-4"
        />
      )}

      {/* Add to Cart Button */}
      <button>Add to Cart</button>
    </div>
  );
}
```

### 2. **Size Guide Modal**

Add conversion tab to your existing Size Guide Modal:

```tsx
// components/product/SizeGuideModal.tsx

import SizeChartConversion from '@/components/product/SizeChartConversion';

// Add to tabs array
const tabs = [
  { key: 'chart', label: 'Size Chart', icon: Ruler },
  { key: 'measure', label: 'How to Measure', icon: HelpCircle },
  { key: 'tips', label: 'Tips', icon: Lightbulb },
  { key: 'conversions', label: 'International', icon: Globe }, // NEW TAB
];

// Add to tab content
{activeTab === 'conversions' && (
  <SizeChartConversion
    selectedSize={selectedSize}
    regionCode={regionCode}
  />
)}
```

### 3. **Region Preference Context**

Create a context to persist region preference:

```tsx
// contexts/RegionContext.tsx

"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import type { RegionCode } from '@/types/size-system-v2';

interface RegionContextType {
  regionCode: RegionCode;
  setRegionCode: (region: RegionCode) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [regionCode, setRegionCodeState] = useState<RegionCode>('US');

  // Load from localStorage
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

Then wrap your app:

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

---

## 🧪 TESTING COMPONENTS

### 1. Test Sister Size Alert

```tsx
// Test with out-of-stock size
<SisterSizeAlert
  productId={1}
  requestedSize="34C"
  regionCode="US"
  onSizeSelect={(size, uic) => console.log(size, uic)}
/>
```

### 2. Test Brand Fit Notice

```tsx
// Test with RUNS_SMALL brand
<BrandFitNotice
  brandId="brand_ap" // Agent Provocateur
  userNormalSize="34C"
  regionCode="US"
  onSizeRecommended={(size) => console.log('Recommend:', size)}
/>
```

### 3. Test Region Switcher

```tsx
<RegionSwitcher
  currentRegion="US"
  onRegionChange={(region) => console.log('Changed to:', region)}
/>
```

---

## 🎯 NEXT STEPS

1. **Environment Variable**
   - Add `NEXT_PUBLIC_API_URL=http://localhost:5000` to `.env.local`

2. **Backend Connection**
   - Ensure backend is running on `http://localhost:5000`
   - Test API endpoints are accessible

3. **Styling**
   - Components use Tailwind CSS (already in your project)
   - Dark mode supported via `dark:` classes

4. **State Management**
   - Consider using Zustand or Redux for region preference if needed
   - Current implementation uses React Context

5. **Error Handling**
   - Add toast notifications for API errors
   - Implement retry logic for failed requests

6. **Analytics**
   - Track sister size acceptance rates
   - Track region switching
   - Track brand fit feedback

---

## 📊 COMPONENT FLOWCHART

```
┌─────────────────────┐
│  Product Page       │
└──────────┬──────────┘
           │
           ├──► RegionSwitcher (select region)
           │
           ├──► BrandFitNotice (if brand has fit profile)
           │    ├─► Fetches brand fit adjustment
           │    └─► Shows recommended size
           │
           ├──► Size Selector (user selects size)
           │
           └──► SisterSizeAlert (if size out of stock)
                ├─► Fetches sister sizes
                ├─► Shows alternatives
                └─► Tracks acceptance

┌─────────────────────┐
│ Size Guide Modal    │
└──────────┬──────────┘
           │
           ├──► Size Chart Tab
           ├──► Measurement Tab
           ├──► Tips Tab
           └──► Conversions Tab (NEW)
                └─► SizeChartConversion
                    ├─► Fetches conversion matrices
                    └─► Shows US/UK/EU equivalents
```

---

## ✅ FILES CREATED

1. `frontend/src/types/size-system-v2.ts` - TypeScript types
2. `frontend/src/lib/sizeSystemApi.ts` - API client
3. `frontend/src/components/product/SisterSizeAlert.tsx` - Sister size component
4. `frontend/src/components/product/BrandFitNotice.tsx` - Brand fit component
5. `frontend/src/components/product/RegionSwitcher.tsx` - Region switcher component
6. `frontend/src/components/product/SizeChartConversion.tsx` - Conversion table component
7. `docs/FRONTEND_INTEGRATION.md` - This guide

---

**Status:** ✅ Frontend components ready for integration
**Backend:** ✅ API ready (17 endpoints)
**Next:** Integrate components into product pages and size guide modal
