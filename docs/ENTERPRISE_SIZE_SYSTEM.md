# Enterprise Size System Architecture

## 1. DATABASE SCHEMA

### 1.1. Core Tables

```prisma
// ============================================
// REGION & LOCATION MANAGEMENT
// ============================================

model Region {
  id          String   @id @default(cuid())
  code        String   @unique // "US", "UK", "EU", "FR", "AU", "JP", "VN"
  name        String   // "United States", "United Kingdom"
  currency    String   // "USD", "GBP", "EUR"
  isActive    Boolean  @default(true)
  priority    Int      @default(0) // Display order

  sizeStandards  SizeStandard[]
  regionalSizes  RegionalSize[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([code, isActive])
}

// ============================================
// SIZE STANDARD DEFINITIONS
// ============================================

model SizeStandard {
  id          String   @id @default(cuid())
  code        String   @unique // "US_BRA", "UK_PANTY", "EU_SHAPEWEAR"
  region      Region   @relation(fields: [regionId], references: [id])
  regionId    String

  category    String   // "bra", "panty", "shapewear", "sleepwear"
  name        String   // "US Bra Size Standard"
  description String?

  // Measurement units
  lengthUnit  String   @default("in") // "in", "cm"
  weightUnit  String   @default("lb") // "lb", "kg"

  // Size chart metadata
  chartVersion String  @default("1.0")
  chartUrl    String?  // Link to official size chart image

  sizes       RegionalSize[]
  conversions SizeConversion[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([regionId, category])
  @@index([code, category])
}

// ============================================
// REGIONAL SIZE DEFINITIONS
// ============================================

model RegionalSize {
  id          String   @id @default(cuid())

  // Universal Internal Code (UIC)
  universalCode String @unique // "UIC_BRA_34C", "UIC_PANTY_M"

  // Region-specific display
  region      Region   @relation(fields: [regionId], references: [id])
  regionId    String
  standard    SizeStandard @relation(fields: [standardId], references: [id])
  standardId  String

  // Display information
  displaySize String   // "34C", "M", "75C"
  sortOrder   Int      // For display ordering

  // Measurements (JSON for flexibility)
  measurements Json    // See measurement schema below

  // Product mapping
  productSizes ProductSize[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([standardId, displaySize])
  @@index([universalCode, regionId])
  @@index([standardId, sortOrder])
}

// ============================================
// SIZE CONVERSION MATRIX
// ============================================

model SizeConversion {
  id          String   @id @default(cuid())

  // Source size
  fromStandard SizeStandard @relation(fields: [fromStandardId], references: [id], name: "FromStandard")
  fromStandardId String
  fromSize    String   // "34C"

  // Target size
  toStandard  SizeStandard @relation(fields: [toStandardId], references: [id], name: "ToStandard")
  toStandardId String
  toSize      String   // "75C"

  // Conversion metadata
  confidence  Float    @default(1.0) // 0-1, accuracy level
  notes       String?  // "Approximate conversion"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([fromStandardId, fromSize, toStandardId])
  @@index([fromStandardId, toStandardId])
}

// ============================================
// PRODUCT SIZE MAPPING
// ============================================

model ProductSize {
  id          String   @id @default(cuid())

  product     Product  @relation(fields: [productId], references: [id])
  productId   String

  regionalSize RegionalSize @relation(fields: [regionalSizeId], references: [id])
  regionalSizeId String

  // Inventory per region-size
  stock       Int      @default(0)
  sku         String   @unique

  // Pricing can vary by region
  priceModifier Float  @default(0) // +/- from base price

  isAvailable Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([productId, regionalSizeId])
  @@index([productId, isAvailable])
  @@index([regionalSizeId, stock])
}
```

## 2. MEASUREMENT JSON SCHEMA

### 2.1. Bra Measurements

```typescript
interface BraMeasurements {
  bandSize: {
    value: number;      // 34
    unit: "in" | "cm";  // inches
    min?: number;       // 33
    max?: number;       // 35
  };
  cupSize: {
    value: string;      // "C"
    letterCode: string; // "C" (US) vs "E" (EU for DD)
    volume: number;     // Standardized cup volume
  };
  underBust: {
    min: number;        // 30
    max: number;        // 32
    unit: "in" | "cm";
  };
  bust: {
    min: number;        // 36
    max: number;        // 38
    unit: "in" | "cm";
  };
  cupDepth?: number;    // Advanced fit metric
  wireWidth?: number;   // Wire fit
}
```

### 2.2. Panty Measurements

```typescript
interface PantyMeasurements {
  size: {
    value: string;      // "M", "L"
    numeric?: number;   // EU uses 38, 40, 42
  };
  waist: {
    min: number;        // 28
    max: number;        // 30
    unit: "in" | "cm";
  };
  hip: {
    min: number;        // 36
    max: number;        // 38
    unit: "in" | "cm";
  };
  rise?: {             // High-waist, mid-rise, low-rise
    value: number;
    unit: "in" | "cm";
  };
}
```

### 2.3. Shapewear Measurements

```typescript
interface ShapewearMeasurements {
  size: string;
  bust?: BustMeasurement;
  waist: WaistMeasurement;
  hip: HipMeasurement;
  thigh?: ThighMeasurement;
  compressionLevel: "light" | "medium" | "firm" | "extra-firm";
  bodyType?: "hourglass" | "pear" | "apple" | "rectangle" | "inverted-triangle";
}
```

## 3. BUSINESS LOGIC LAYERS

### 3.1. Size Resolution Service

```typescript
// apps/backend/src/services/size-resolution.service.ts

export class SizeResolutionService {
  /**
   * Get available sizes for a product based on user's location
   */
  async getProductSizes(params: {
    productId: string;
    regionCode: string;
    includeConversions?: boolean;
  }): Promise<ProductSizeResponse> {
    // 1. Detect user's region from IP/setting
    // 2. Get product's available sizes
    // 3. Filter by region
    // 4. Optionally include size conversions
    // 5. Return sorted by sortOrder
  }

  /**
   * Convert size between regions
   */
  async convertSize(params: {
    fromRegion: string;
    toRegion: string;
    size: string;
    category: string;
  }): Promise<SizeConversionResult> {
    // Use SizeConversion table
    // Return best match with confidence level
  }

  /**
   * Find best size match based on measurements
   */
  async recommendSize(params: {
    measurements: UserMeasurements;
    productId: string;
    regionCode: string;
  }): Promise<SizeRecommendation> {
    // Machine learning model integration
    // Returns size + fit confidence
  }
}
```

### 3.2. Region Detection Service

```typescript
// apps/backend/src/services/region-detection.service.ts

export class RegionDetectionService {
  async detectRegion(req: Request): Promise<string> {
    // Priority order:
    // 1. User's saved preference (from profile)
    // 2. Session/cookie preference
    // 3. Accept-Language header
    // 4. IP geolocation (GeoIP2, CloudFlare)
    // 5. Default to US

    return regionCode;
  }

  async getUserPreferredUnits(userId: string): Promise<{
    length: "in" | "cm";
    weight: "lb" | "kg";
  }> {
    // Return user's measurement preferences
  }
}
```

## 4. FRONTEND IMPLEMENTATION

### 4.1. Size Selector Component

```tsx
// apps/frontend/src/components/product/SizeSelector.tsx

interface SizeSelectorProps {
  productId: string;
  currentRegion: string;
  onSizeSelect: (sizeId: string) => void;
  showConversions?: boolean;
}

export function SizeSelector({
  productId,
  currentRegion,
  onSizeSelect,
  showConversions = true
}: SizeSelectorProps) {
  const { data: sizes } = useProductSizes(productId, currentRegion);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  return (
    <div className="size-selector">
      {/* Region switcher */}
      <RegionSwitcher
        current={currentRegion}
        onChange={handleRegionChange}
      />

      {/* Size buttons */}
      <div className="size-grid">
        {sizes?.map(size => (
          <SizeButton
            key={size.id}
            size={size}
            isSelected={selectedSize === size.id}
            isAvailable={size.stock > 0}
            onClick={() => handleSizeSelect(size)}
          />
        ))}
      </div>

      {/* Size chart modal */}
      <button onClick={() => setShowSizeChart(true)}>
        View Size Chart
      </button>

      {showConversions && selectedSize && (
        <SizeConversionTable size={selectedSize} />
      )}
    </div>
  );
}
```

### 4.2. Size Chart Modal

```tsx
// apps/frontend/src/components/product/SizeChartModal.tsx

export function SizeChartModal({
  productCategory,
  currentRegion,
  userMeasurements
}: SizeChartModalProps) {
  return (
    <Modal>
      <Tabs>
        <Tab label="Size Guide">
          <MeasurementGuide category={productCategory} />
        </Tab>

        <Tab label="Size Chart">
          <InteractiveSizeChart
            region={currentRegion}
            category={productCategory}
            highlightRecommended={userMeasurements}
          />
        </Tab>

        <Tab label="Fit Finder">
          <FitFinderForm
            onSubmit={handleFitFinderSubmit}
          />
        </Tab>

        <Tab label="Conversions">
          <RegionalConversionTable
            category={productCategory}
            regions={['US', 'UK', 'EU', 'FR', 'AU', 'JP']}
          />
        </Tab>
      </Tabs>
    </Modal>
  );
}
```

## 5. API ENDPOINTS

### 5.1. Size Management API

```typescript
// GET /api/products/:productId/sizes
// Query: ?region=US&includeConversions=true
interface GetProductSizesResponse {
  productId: string;
  region: string;
  sizes: {
    id: string;
    displaySize: string;
    universalCode: string;
    stock: number;
    measurements: BraMeasurements | PantyMeasurements;
    conversions?: {
      region: string;
      size: string;
      confidence: number;
    }[];
  }[];
}

// POST /api/size-finder/recommend
interface SizeRecommendationRequest {
  productId: string;
  measurements: UserMeasurements;
  region?: string;
}

interface SizeRecommendationResponse {
  recommendedSize: string;
  confidence: number; // 0-1
  alternativeSizes: string[];
  fitNotes: string[];
}

// GET /api/size-standards/:category/conversions
// Returns full conversion matrix for a category
```

## 6. ADMIN PANEL FEATURES

### 6.1. Size Management Dashboard

```typescript
// Required admin features:

1. **Size Standard Management**
   - Create/edit regional size standards
   - Upload size chart images
   - Define measurement ranges
   - Set conversion rules

2. **Bulk Size Operations**
   - Import sizes from CSV/Excel
   - Bulk update measurements
   - Clone size sets across regions
   - Audit log for changes

3. **Conversion Matrix Editor**
   - Visual matrix editor
   - Confidence scoring
   - Bulk conversion rules
   - Test conversion accuracy

4. **Product Size Assignment**
   - Assign sizes to products
   - Manage stock per size
   - Region availability toggle
   - Size-specific pricing

5. **Analytics Dashboard**
   - Most purchased sizes per region
   - Size chart view rates
   - Fit finder usage
   - Return rates by size
```

## 7. PERFORMANCE OPTIMIZATIONS

### 7.1. Caching Strategy

```typescript
// Redis caching layers:

1. **Region Data Cache** (TTL: 1 day)
   - Key: `region:${regionCode}`
   - Value: Full region config

2. **Size Standard Cache** (TTL: 6 hours)
   - Key: `size-standard:${category}:${regionCode}`
   - Value: Size chart data

3. **Product Sizes Cache** (TTL: 5 minutes)
   - Key: `product-sizes:${productId}:${regionCode}`
   - Value: Available sizes array
   - Invalidate on stock change

4. **Conversion Matrix Cache** (TTL: 1 day)
   - Key: `size-conversion:${fromRegion}:${toRegion}:${category}`
   - Value: Full conversion table
```

### 7.2. Database Indexing

```sql
-- Critical indexes for performance

CREATE INDEX idx_product_size_lookup
ON ProductSize(productId, regionalSizeId, isAvailable);

CREATE INDEX idx_regional_size_display
ON RegionalSize(standardId, sortOrder);

CREATE INDEX idx_size_conversion_matrix
ON SizeConversion(fromStandardId, toStandardId, fromSize);

-- Partial index for available stock
CREATE INDEX idx_available_stock
ON ProductSize(regionalSizeId)
WHERE isAvailable = true AND stock > 0;
```

## 8. TESTING STRATEGY

### 8.1. Unit Tests

```typescript
describe('SizeResolutionService', () => {
  it('should convert US 34C to UK 34C', async () => {
    const result = await sizeService.convertSize({
      fromRegion: 'US',
      toRegion: 'UK',
      size: '34C',
      category: 'bra'
    });

    expect(result.toSize).toBe('34C');
    expect(result.confidence).toBeGreaterThan(0.95);
  });

  it('should convert US 36DD to EU 80E', async () => {
    const result = await sizeService.convertSize({
      fromRegion: 'US',
      toRegion: 'EU',
      size: '36DD',
      category: 'bra'
    });

    expect(result.toSize).toBe('80E');
  });
});
```

### 8.2. Integration Tests

```typescript
describe('Product Size API', () => {
  it('should return sizes in user region', async () => {
    const response = await request(app)
      .get('/api/products/prod_123/sizes')
      .set('Accept-Language', 'en-GB')
      .query({ region: 'UK' });

    expect(response.body.sizes).toHaveProperty('displaySize');
    expect(response.body.sizes[0].measurements.bandSize.unit).toBe('in');
  });
});
```

## 9. MIGRATION STRATEGY

### 9.1. Phased Rollout

```yaml
Phase 1: Database Schema (Week 1)
  - Create new tables
  - Migrate existing size data
  - Validate data integrity

Phase 2: Backend Services (Week 2)
  - Implement SizeResolutionService
  - Build API endpoints
  - Add caching layer

Phase 3: Frontend Components (Week 3)
  - Size selector component
  - Size chart modal
  - Region switcher

Phase 4: Admin Panel (Week 4)
  - Size management UI
  - Conversion matrix editor
  - Analytics dashboard

Phase 5: Testing & QA (Week 5)
  - End-to-end testing
  - Performance testing
  - User acceptance testing

Phase 6: Production Deploy (Week 6)
  - Feature flag rollout
  - Monitor metrics
  - Collect user feedback
```

## 10. COMPLIANCE & STANDARDS

### 10.1. Size Standard References

- **US**: ASTM D6960 (Women's Intimate Apparel)
- **UK**: BS EN 13402 (Size designation of clothes)
- **EU**: EN 13402-3 (Body measurements and intervals)
- **ISO**: ISO/TR 10652 (Standard sizing systems for clothes)

### 10.2. Accessibility Requirements

- WCAG 2.1 AA compliance for size selectors
- Keyboard navigation support
- Screen reader compatibility
- Color contrast for size availability indicators

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Owner**: Engineering Team
**Review Cycle**: Quarterly
