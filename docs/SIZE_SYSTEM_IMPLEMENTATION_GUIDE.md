# ENTERPRISE SIZE SYSTEM - IMPLEMENTATION GUIDE

## 📋 OVERVIEW

Hệ thống quản lý size đa vùng miền (multi-regional sizing) cho Lingerie eCommerce, tuân thủ Enterprise Standards và Best Practices.

## 🎯 KEY FEATURES

1. **Multi-Regional Support**: US, UK, EU, FR, AU, JP, VN
2. **Automatic Size Conversion**: Convert between regional standards
3. **Smart Region Detection**: IP-based, language-based, user preference
4. **Size Recommendation Engine**: AI-powered fit recommendations
5. **Performance Optimized**: Redis caching, database indexing
6. **Admin Management**: Full CRUD for sizes, conversions, standards

## 📚 IMPLEMENTATION STEPS

### STEP 1: Database Migration

```bash
# 1. Navigate to backend folder
cd backend

# 2. Run Prisma migration
npx prisma migrate dev --name add_enterprise_size_system

# 3. Generate Prisma Client
npx prisma generate

# 4. Seed initial data (already in migration.sql)
# Data includes: 7 regions, size standards, sample sizes, conversions
```

### STEP 2: Install Dependencies

```bash
# Backend dependencies
npm install geoip-lite ioredis zod

# Types
npm install -D @types/geoip-lite @types/ioredis
```

### STEP 3: Environment Variables

Add to `.env`:

```env
# Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: CloudFlare IP geolocation (more accurate than geoip-lite)
CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev/geoip
```

### STEP 4: Register Routes

In `backend/src/index.ts` or `app.ts`:

```typescript
import sizeSystemRoutes from './routes/size-system.routes';

// Register routes
app.use('/api', sizeSystemRoutes);
```

### STEP 5: Frontend Integration

#### 5.1. Create Region Context

```tsx
// frontend/src/contexts/RegionContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Region {
  code: string;
  name: string;
  currency: string;
  lengthUnit: 'in' | 'cm';
  weightUnit: 'lb' | 'kg';
}

interface RegionContextType {
  currentRegion: Region;
  setRegion: (code: string) => void;
  availableRegions: Region[];
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [currentRegion, setCurrentRegion] = useState<Region>({
    code: 'US',
    name: 'United States',
    currency: 'USD',
    lengthUnit: 'in',
    weightUnit: 'lb',
  });
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);

  useEffect(() => {
    // Fetch regions from API
    fetch('/api/regions')
      .then((res) => res.json())
      .then((data) => {
        setAvailableRegions(data.data.regions);
        setCurrentRegion(data.data.current);
      });
  }, []);

  const setRegion = async (code: string) => {
    // Update backend preference
    await fetch('/api/users/me/region', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionCode: code }),
    });

    // Update local state
    const region = availableRegions.find((r) => r.code === code);
    if (region) {
      setCurrentRegion(region);
    }
  };

  return (
    <RegionContext.Provider value={{ currentRegion, setRegion, availableRegions }}>
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

#### 5.2. Region Switcher Component

```tsx
// frontend/src/components/RegionSwitcher.tsx

import { useRegion } from '../contexts/RegionContext';

export function RegionSwitcher() {
  const { currentRegion, availableRegions, setRegion } = useRegion();

  return (
    <div className="region-switcher">
      <label>Region:</label>
      <select
        value={currentRegion.code}
        onChange={(e) => setRegion(e.target.value)}
      >
        {availableRegions.map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

#### 5.3. Size Selector Component

```tsx
// frontend/src/components/SizeSelector.tsx

import { useState, useEffect } from 'react';
import { useRegion } from '../contexts/RegionContext';

interface Size {
  id: string;
  displaySize: string;
  stock: number;
  isAvailable: boolean;
}

export function SizeSelector({ productId }: { productId: string }) {
  const { currentRegion } = useRegion();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/sizes?region=${currentRegion.code}`)
      .then((res) => res.json())
      .then((data) => setSizes(data.data.sizes));
  }, [productId, currentRegion.code]);

  return (
    <div className="size-selector">
      <h3>Select Size ({currentRegion.code})</h3>
      <div className="size-grid">
        {sizes.map((size) => (
          <button
            key={size.id}
            className={`size-button ${
              selectedSize === size.id ? 'selected' : ''
            } ${!size.isAvailable ? 'unavailable' : ''}`}
            onClick={() => size.isAvailable && setSelectedSize(size.id)}
            disabled={!size.isAvailable}
          >
            {size.displaySize}
            {!size.isAvailable && <span className="out-of-stock">Out of Stock</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### 5.4. Size Chart Modal

```tsx
// frontend/src/components/SizeChartModal.tsx

import { useState } from 'react';

export function SizeChartModal({
  category,
  region,
}: {
  category: string;
  region: string;
}) {
  const [matrix, setMatrix] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/size-standards/${category}/conversions`)
      .then((res) => res.json())
      .then((data) => setMatrix(data.data));
  }, [category]);

  if (!matrix) return <div>Loading...</div>;

  return (
    <div className="size-chart-modal">
      <h2>{category} Size Chart</h2>
      <table>
        <thead>
          <tr>
            {matrix.regions.map((r: any) => (
              <th key={r.code}>{r.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Render size conversion matrix */}
        </tbody>
      </table>
    </div>
  );
}
```

### STEP 6: Admin Panel Integration

#### 6.1. Size Management Dashboard

Create admin panel at `/admin/sizes` with following features:

1. **Region Management**
   - Add/edit/deactivate regions
   - Set regional currency, units

2. **Size Standard Management**
   - Create size standards per category per region
   - Upload size chart images
   - Define measurement ranges

3. **Size CRUD**
   - Add individual sizes
   - Bulk import from CSV/Excel
   - Edit measurements
   - Set display order

4. **Conversion Matrix Editor**
   - Visual matrix editor
   - Bulk conversion rules
   - Confidence scoring

5. **Product Size Assignment**
   - Assign sizes to products
   - Manage stock per size
   - Region availability toggle

#### 6.2. Sample Admin API Routes

```typescript
// backend/src/routes/admin/size-admin.routes.ts

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// Region management
router.get('/regions', getAllRegions);
router.post('/regions', createRegion);
router.put('/regions/:id', updateRegion);
router.delete('/regions/:id', deleteRegion);

// Size standard management
router.get('/size-standards', getAllStandards);
router.post('/size-standards', createStandard);
router.put('/size-standards/:id', updateStandard);
router.delete('/size-standards/:id', deleteStandard);

// Regional size management
router.get('/regional-sizes', getAllSizes);
router.post('/regional-sizes', createSize);
router.put('/regional-sizes/:id', updateSize);
router.delete('/regional-sizes/:id', deleteSize);
router.post('/regional-sizes/bulk-import', bulkImportSizes);

// Conversion management
router.get('/size-conversions', getAllConversions);
router.post('/size-conversions', createConversion);
router.put('/size-conversions/:id', updateConversion);
router.delete('/size-conversions/:id', deleteConversion);
router.post('/size-conversions/bulk-create', bulkCreateConversions);

// Product size assignment
router.get('/products/:productId/sizes', getProductSizes);
router.post('/products/:productId/sizes', assignSizeToProduct);
router.put('/product-sizes/:id', updateProductSize);
router.delete('/product-sizes/:id', removeProductSize);

export default router;
```

## 🧪 TESTING

### Unit Tests

```typescript
// backend/src/services/__tests__/size-resolution.service.test.ts

import { sizeResolutionService } from '../size-resolution.service';

describe('SizeResolutionService', () => {
  it('should convert US 34C to EU 75C', async () => {
    const result = await sizeResolutionService.convertSize({
      fromRegion: 'US',
      toRegion: 'EU',
      size: '34C',
      category: 'BRA',
    });

    expect(result).toEqual({
      fromRegion: 'US',
      fromSize: '34C',
      toRegion: 'EU',
      toSize: '75C',
      confidence: 1.0,
    });
  });

  it('should recommend correct size based on measurements', async () => {
    const result = await sizeResolutionService.recommendSize({
      productId: '1',
      regionCode: 'US',
      measurements: {
        category: 'BRA',
        measurements: {
          bandSize: { value: 34, unit: 'in' },
          cupSize: { value: 'C', letterCode: 'C', volume: 3 },
          underBust: { min: 30, max: 32, unit: 'in' },
          bust: { min: 37, max: 38, unit: 'in' },
        },
      },
    });

    expect(result?.recommendedSize).toBe('34C');
    expect(result?.confidence).toBeGreaterThan(0.9);
  });
});
```

### Integration Tests

```typescript
// backend/src/routes/__tests__/size-system.routes.test.ts

import request from 'supertest';
import app from '../../app';

describe('Size System API', () => {
  it('GET /api/products/:id/sizes should return sizes for region', async () => {
    const response = await request(app)
      .get('/api/products/1/sizes')
      .query({ region: 'US' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sizes).toBeInstanceOf(Array);
  });

  it('POST /api/size-finder/recommend should return recommendation', async () => {
    const response = await request(app)
      .post('/api/size-finder/recommend')
      .send({
        productId: '1',
        category: 'BRA',
        measurements: {
          bandSize: { value: 34, unit: 'in' },
          cupSize: { value: 'C', letterCode: 'C', volume: 3 },
          underBust: { min: 30, max: 32, unit: 'in' },
          bust: { min: 37, max: 38, unit: 'in' },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.recommendedSize).toBeDefined();
  });
});
```

## 📊 ANALYTICS & MONITORING

### Key Metrics to Track

```typescript
// backend/src/services/analytics/size-analytics.service.ts

export class SizeAnalyticsService {
  // Track size chart views
  async trackSizeChartView(productId: string, userId?: number) {
    // Log to analytics
  }

  // Track size conversions used
  async trackSizeConversion(fromRegion: string, toRegion: string) {
    // Log conversion usage
  }

  // Track fit finder usage
  async trackFitFinderUsage(category: string, recommended: string) {
    // Log fit finder results
  }

  // Analytics: Most popular sizes by region
  async getMostPopularSizes(region: string, category: string) {
    return prisma.productSize.groupBy({
      by: ['regionalSizeId'],
      where: {
        regionalSize: { regionId: region },
        product: { productType: category },
      },
      _sum: {
        stock: true,
      },
      orderBy: {
        _sum: {
          stock: 'desc',
        },
      },
      take: 10,
    });
  }

  // Analytics: Return rates by size
  async getReturnRatesBySize() {
    // Calculate return rates grouped by size
    // Helps identify sizing issues
  }
}
```

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Database migration applied
- [ ] Redis cache configured
- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] Routes registered
- [ ] Frontend components integrated
- [ ] Admin panel deployed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance tested (load testing)
- [ ] Analytics tracking configured
- [ ] Documentation updated
- [ ] Training materials for admin users

## 📖 BEST PRACTICES

1. **Always use Universal Codes**: Never hardcode regional sizes
2. **Cache Aggressively**: Size data changes infrequently
3. **Invalidate on Stock Change**: Clear cache when stock updates
4. **Monitor Conversion Accuracy**: Track user feedback on conversions
5. **A/B Test Size Recommendations**: Improve ML model over time
6. **Audit All Changes**: Log all admin modifications
7. **Backup Size Data**: Critical business data

## 🔒 SECURITY CONSIDERATIONS

1. **Admin Access Only**: Size management requires ADMIN role
2. **Audit Logging**: All size changes logged with user, IP, timestamp
3. **Input Validation**: Validate all measurements, sizes
4. **Rate Limiting**: Prevent abuse of conversion API
5. **CSRF Protection**: Protect admin endpoints

## 📚 REFERENCES

- ASTM D6960: Women's Intimate Apparel Size Standards
- BS EN 13402: Size designation of clothes
- ISO/TR 10652: Standard sizing systems for clothes

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Maintainer**: Engineering Team
