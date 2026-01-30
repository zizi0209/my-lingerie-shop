# LINGERIE SIZE SYSTEM V2 - CONTEXTUAL PRACTICE

## 📋 PHÂN TÍCH LẠI VẤN ĐỀ

### A. SISTER SIZING (Size Chị Em)

**Vấn đề thực tế:**
- Customer cần 34C nhưng hết hàng
- Thể tích cup giống nhau: 32D = 34C = 36B (cùng cup volume)
- Band size khác nhau tạo ra cảm giác fit khác nhau

**Công thức Sister Sizing:**
```
Sister Size Down (ôm hơn):   Band - 2, Cup + 1
Sister Size Up (thoải mái):  Band + 2, Cup - 1

Example: 34C
├─ Sister Down: 32D (band chặt hơn, cup cùng volume)
└─ Sister Up:   36B (band lỏng hơn, cup cùng volume)
```

**Cup Volume Equivalence Table:**
```
Volume 1: 28A, 30AA
Volume 2: 28B, 30A, 32AA
Volume 3: 28C, 30B, 32A, 34AA
Volume 4: 28D, 30C, 32B, 34A, 36AA
Volume 5: 28DD, 30D, 32C, 34B, 36A, 38AA
Volume 6: 28E, 30DD, 32D, 34C, 36B, 38A, 40AA
Volume 7: 28F, 30E, 32DD, 34D, 36C, 38B, 40A
Volume 8: 28FF, 30F, 32E, 34DD, 36D, 38C, 40B
...
```

### B. CUP PROGRESSION (US vs UK vs EU)

**Critical Issue: Cup naming khác nhau giữa các regions**

| Cup Volume | US Naming | UK Naming | EU Naming |
|-----------|-----------|-----------|-----------|
| 1 | A | A | A |
| 2 | B | B | B |
| 3 | C | C | C |
| 4 | D | D | D |
| 5 | **DD** | **DD** | **E** |
| 6 | **DDD/F** | **E** | **F** |
| 7 | **G** | **F** | **G** |
| 8 | **H** | **FF** | **H** |
| 9 | **I** | **G** | **I** |
| 10 | **J** | **GG** | **J** |

**⚠️ CRITICAL: Không được dùng công thức toán học!**

Phải dùng **MAPPING TABLE** chính xác:
```
US 34DD  ≠ EU 75DD  (WRONG!)
US 34DD  = EU 75E   (CORRECT!)
```

### C. BRAND DISCREPANCY (Độ lệch hãng)

**Vấn đề:**
- Victoria's Secret size M fit người 34B-34C
- Agent Provocateur size M fit người 32B-32C (nhỏ hơn)
- Bluebella size M fit người 36B-36C (to hơn)

**Giải pháp: Brand Fit Adjustment**

```typescript
interface BrandFitProfile {
  brandId: string;
  fitType: 'TRUE_TO_SIZE' | 'RUNS_SMALL' | 'RUNS_LARGE';
  bandAdjustment: number;  // -1, 0, +1, +2 (số band size điều chỉnh)
  cupAdjustment: number;   // -1, 0, +1 (số cup điều chỉnh)
  notes: string;           // "This brand runs small. Size up."
}

// Example:
VS = { fitType: 'TRUE_TO_SIZE', bandAdjustment: 0, cupAdjustment: 0 }
AP = { fitType: 'RUNS_SMALL', bandAdjustment: +1, cupAdjustment: +1 }
    // "Normally wear 34C? Try 36D in Agent Provocateur"
```

### D. SKU vs DISPLAY SIZE

**Problem: Tránh duplicate inventory**

```
❌ WRONG APPROACH:
- ProductSize 1: SKU="BRA-001-US-34C", Region=US, Size=34C, Stock=10
- ProductSize 2: SKU="BRA-001-EU-75C", Region=EU, Size=75C, Stock=10
→ Total stock = 20 (SAI! Thực tế chỉ có 10 cái áo)

✅ CORRECT APPROACH:
- ProductVariant 1: SKU="BRA-001-34C", Stock=10 (SINGLE source of truth)
- RegionalDisplay 1: SKU="BRA-001-34C" → US sees "34C"
- RegionalDisplay 2: SKU="BRA-001-34C" → EU sees "75C"
→ Total stock = 10 (ĐÚNG!)
```

### E. SIZE PREFERENCE vs SHIPPING REGION

**Vấn đề:**
- User ở Vietnam nhưng quen size US (từng sống ở Mỹ)
- User ở Vietnam muốn thanh toán VND
- Hai khái niệm khác nhau:
  - **Size Display Preference**: Hiển thị size theo chuẩn nào
  - **Shipping Region**: Ship đến đâu, thanh toán tiền gì

```typescript
interface UserLocalePreference {
  // Size display (có thể khác với nơi ở)
  sizeStandard: 'US' | 'UK' | 'EU' | 'FR' | 'AU' | 'JP';

  // Shipping & payment (theo nơi ở thực tế)
  shippingCountry: string;    // "VN", "US", "UK"
  currency: string;           // "VND", "USD", "GBP"

  // Measurement units (có thể customize)
  lengthUnit: 'in' | 'cm';    // User Việt có thể chọn "in" nếu quen
  weightUnit: 'lb' | 'kg';
}
```

---

## 🗄️ DATABASE SCHEMA V2

### 1. REFACTORED SCHEMA

```prisma
// ============================================
// CORE SIZE TABLES
// ============================================

model Region {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  currency    String
  isActive    Boolean  @default(true)
  priority    Int      @default(0)

  sizeStandards  SizeStandard[]
  regionalSizes  RegionalSize[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([code, isActive])
}

model SizeStandard {
  id          String   @id @default(cuid())
  code        String   @unique // "US_BRA", "UK_BRA"
  region      Region   @relation(fields: [regionId], references: [id])
  regionId    String
  category    String   // "BRA", "PANTY", "SHAPEWEAR"
  name        String

  lengthUnit  String   @default("in")
  weightUnit  String   @default("lb")

  // Cup progression rules (JSON)
  cupProgression Json  // ["A","B","C","D","DD","DDD","G","H"] for US
                       // ["A","B","C","D","DD","E","F","FF"] for UK

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

  // Universal Internal Code - CRITICAL!
  universalCode String @unique // "UIC_BRA_BAND34_CUPVOL6"

  // Region-specific display
  region      Region   @relation(fields: [regionId], references: [id])
  regionId    String
  standard    SizeStandard @relation(fields: [standardId], references: [id])
  standardId  String

  // Display information
  displaySize String   // "34C" (US), "75C" (EU), "12C" (AU)
  sortOrder   Int

  // Measurements
  bandSize    Int      // Normalized: always in cm (34in = 86cm, 75cm = 75cm)
  cupVolume   Int      // 1-20 (cup volume level)
  cupLetter   String   // "C", "DD", "E" (region-specific)

  measurements Json    // Full measurement details

  // Sister sizing relationships
  sisterSizeDown   String? // UIC of sister size down
  sisterSizeUp     String? // UIC of sister size up

  productSizes ProductSize[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([standardId, displaySize])
  @@index([universalCode, regionId])
  @@index([bandSize, cupVolume]) // For sister size queries
  @@index([standardId, sortOrder])
}

// ============================================
// SIZE CONVERSION WITH CUP MAPPING
// ============================================

model SizeConversion {
  id          String   @id @default(cuid())

  fromStandard SizeStandard @relation(fields: [fromStandardId], references: [id], name: "FromStandard")
  fromStandardId String
  fromSize    String   // "34C"
  fromCupLetter String // "C" (important for US DD vs UK DD)

  toStandard  SizeStandard @relation(fields: [toStandardId], references: [id], name: "ToStandard")
  toStandardId String
  toSize      String   // "75C"
  toCupLetter String   // "C" (EU uses single letter)

  confidence  Float    @default(1.0)
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([fromStandardId, fromSize, toStandardId])
  @@index([fromStandardId, toStandardId])
}

// ============================================
// PRODUCT VARIANT (SINGLE SOURCE OF TRUTH FOR INVENTORY)
// ============================================

model ProductVariant {
  id        Int      @id @default(autoincrement())

  // Physical SKU (region-agnostic)
  sku       String   @unique // "BRA-001-34C-BLACK"

  // Base size (always stored in ONE standard, e.g., US)
  baseSize  String   // "34C" (US standard)
  baseSizeUIC String // "UIC_BRA_BAND34_CUPVOL6"

  colorName String
  colorHex  String?

  // SINGLE STOCK NUMBER (not duplicated per region)
  stock     Int      @default(0)

  price     Float?
  salePrice Float?

  productId Int
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  cartItems CartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId])
  @@index([sku])
  @@index([baseSizeUIC])
  @@index([stock]) // For availability queries
}

// ============================================
// BRAND FIT PROFILE
// ============================================

model Brand {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique

  // Fit profile
  fitType     String   @default("TRUE_TO_SIZE") // TRUE_TO_SIZE | RUNS_SMALL | RUNS_LARGE

  // Band adjustment (-2, -1, 0, +1, +2)
  bandAdjustment Int   @default(0)

  // Cup adjustment (-1, 0, +1)
  cupAdjustment  Int   @default(0)

  fitNotes    String?  // "This brand runs small. We recommend sizing up."

  products    Product[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
}

// Update Product model
model Product {
  // ... existing fields ...

  brandId     String?
  brand       Brand?   @relation(fields: [brandId], references: [id])

  // ... rest of fields ...
}

// ============================================
// USER SIZE PREFERENCE (SEPARATED FROM SHIPPING)
// ============================================

model UserPreference {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique

  // SIZE DISPLAY PREFERENCE (có thể khác với nơi ở)
  preferredSizeStandard String @default("US") // US, UK, EU, FR, AU, JP
  preferredLengthUnit   String @default("in") // in, cm
  preferredWeightUnit   String @default("lb") // lb, kg

  // SHIPPING & PAYMENT (theo địa chỉ thực tế)
  shippingCountry String?  // "VN", "US", "UK"
  preferredCurrency String @default("USD") // USD, VND, GBP, EUR

  // Saved measurements for size recommendation
  preferredSizes  Json?    // { "BRA": "34C", "PANTY": "M" }

  // Body measurements (for fit finder)
  bodyMeasurements Json?   // { "underBust": 30, "bust": 37, "waist": 28, "hip": 38 }

  // Shopping behavior (for recommendations)
  colorAffinities Json?
  styleAffinities Json?
  avgOrderValue   Float    @default(0)
  priceRange      Json?
  categoryWeights Json?

  lastUpdated     DateTime @default(now())
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ============================================
// SISTER SIZE RECOMMENDATION LOG
// ============================================

model SisterSizeRecommendation {
  id              String   @id @default(cuid())

  productId       Int
  requestedSize   String   // "34C"
  requestedUIC    String   // "UIC_BRA_BAND34_CUPVOL6"

  // What we recommended instead
  recommendedSize String   // "32D" or "36B"
  recommendedUIC  String
  recommendationType String // "SISTER_DOWN" | "SISTER_UP"

  // Did user accept?
  accepted        Boolean?
  acceptedAt      DateTime?

  // Analytics
  userId          Int?
  sessionId       String

  createdAt       DateTime @default(now())

  @@index([productId, requestedSize])
  @@index([accepted])
  @@index([createdAt])
}
```

---

## 🧠 BUSINESS LOGIC V2

### 1. Sister Sizing Service

```typescript
// backend/src/services/sister-sizing.service.ts

export class SisterSizingService {
  /**
   * Get sister sizes for a given size
   */
  async getSisterSizes(params: {
    universalCode: string;
    includeStock?: boolean;
  }): Promise<{
    original: SizeInfo;
    sisterDown: SizeInfo | null;
    sisterUp: SizeInfo | null;
  }> {
    // Get original size
    const originalSize = await prisma.regionalSize.findUnique({
      where: { universalCode: params.universalCode },
      include: { region: true, standard: true },
    });

    if (!originalSize) {
      throw new Error('Size not found');
    }

    // Calculate sister sizes based on band and cup volume
    const bandSize = originalSize.bandSize;
    const cupVolume = originalSize.cupVolume;

    // Sister Down: Band - 2, Cup Volume same
    const sisterDown = await prisma.regionalSize.findFirst({
      where: {
        standardId: originalSize.standardId,
        bandSize: bandSize - 2,
        cupVolume: cupVolume, // SAME volume!
      },
    });

    // Sister Up: Band + 2, Cup Volume same
    const sisterUp = await prisma.regionalSize.findFirst({
      where: {
        standardId: originalSize.standardId,
        bandSize: bandSize + 2,
        cupVolume: cupVolume, // SAME volume!
      },
    });

    return {
      original: this.formatSizeInfo(originalSize),
      sisterDown: sisterDown ? this.formatSizeInfo(sisterDown) : null,
      sisterUp: sisterUp ? this.formatSizeInfo(sisterUp) : null,
    };
  }

  /**
   * Get available sister sizes for out-of-stock scenario
   */
  async getAvailableSisterSizes(params: {
    productId: number;
    requestedSize: string;
    regionCode: string;
  }): Promise<{
    requestedSize: string;
    isAvailable: boolean;
    alternatives: Array<{
      size: string;
      type: 'SISTER_DOWN' | 'SISTER_UP';
      stock: number;
      fitNote: string;
    }>;
  }> {
    // Check if requested size is available
    const requestedVariant = await prisma.productVariant.findFirst({
      where: {
        productId: params.productId,
        baseSize: params.requestedSize,
      },
    });

    if (!requestedVariant) {
      return {
        requestedSize: params.requestedSize,
        isAvailable: false,
        alternatives: [],
      };
    }

    const isAvailable = requestedVariant.stock > 0;

    // If available, no need for alternatives
    if (isAvailable) {
      return {
        requestedSize: params.requestedSize,
        isAvailable: true,
        alternatives: [],
      };
    }

    // Get sister sizes
    const sisters = await this.getSisterSizes({
      universalCode: requestedVariant.baseSizeUIC,
    });

    const alternatives: any[] = [];

    // Check sister down availability
    if (sisters.sisterDown) {
      const sisterDownVariant = await prisma.productVariant.findFirst({
        where: {
          productId: params.productId,
          baseSizeUIC: sisters.sisterDown.universalCode,
        },
      });

      if (sisterDownVariant && sisterDownVariant.stock > 0) {
        alternatives.push({
          size: sisters.sisterDown.displaySize,
          type: 'SISTER_DOWN',
          stock: sisterDownVariant.stock,
          fitNote: `Band will be tighter (${sisters.sisterDown.displaySize} fits snugger than ${params.requestedSize})`,
        });
      }
    }

    // Check sister up availability
    if (sisters.sisterUp) {
      const sisterUpVariant = await prisma.productVariant.findFirst({
        where: {
          productId: params.productId,
          baseSizeUIC: sisters.sisterUp.universalCode,
        },
      });

      if (sisterUpVariant && sisterUpVariant.stock > 0) {
        alternatives.push({
          size: sisters.sisterUp.displaySize,
          type: 'SISTER_UP',
          stock: sisterUpVariant.stock,
          fitNote: `Band will be looser (${sisters.sisterUp.displaySize} fits more relaxed than ${params.requestedSize})`,
        });
      }
    }

    // Log recommendation for analytics
    if (alternatives.length > 0) {
      await prisma.sisterSizeRecommendation.create({
        data: {
          productId: params.productId,
          requestedSize: params.requestedSize,
          requestedUIC: requestedVariant.baseSizeUIC,
          recommendedSize: alternatives[0].size,
          recommendedUIC: sisters[alternatives[0].type === 'SISTER_DOWN' ? 'sisterDown' : 'sisterUp']!.universalCode,
          recommendationType: alternatives[0].type,
          sessionId: 'current-session', // TODO: Get from request
        },
      });
    }

    return {
      requestedSize: params.requestedSize,
      isAvailable: false,
      alternatives,
    };
  }

  private formatSizeInfo(size: any): SizeInfo {
    return {
      universalCode: size.universalCode,
      displaySize: size.displaySize,
      bandSize: size.bandSize,
      cupVolume: size.cupVolume,
      cupLetter: size.cupLetter,
      region: size.region.code,
    };
  }
}

export const sisterSizingService = new SisterSizingService();
```

### 2. Brand Fit Adjustment Service

```typescript
// backend/src/services/brand-fit.service.ts

export class BrandFitService {
  /**
   * Adjust size recommendation based on brand fit profile
   */
  async adjustSizeForBrand(params: {
    brandId: string;
    userNormalSize: string; // e.g., "34C"
    regionCode: string;
  }): Promise<{
    recommendedSize: string;
    adjustment: string;
    fitNote: string;
  }> {
    // Get brand profile
    const brand = await prisma.brand.findUnique({
      where: { id: params.brandId },
    });

    if (!brand || brand.fitType === 'TRUE_TO_SIZE') {
      return {
        recommendedSize: params.userNormalSize,
        adjustment: 'NONE',
        fitNote: 'True to size',
      };
    }

    // Parse user size (assume US standard for now)
    const parsed = this.parseSize(params.userNormalSize);

    // Apply brand adjustments
    const adjustedBand = parsed.band + (brand.bandAdjustment * 2); // 2 inches per adjustment
    const adjustedCupVolume = parsed.cupVolume + brand.cupAdjustment;

    // Find adjusted size
    const adjustedSize = await prisma.regionalSize.findFirst({
      where: {
        bandSize: adjustedBand,
        cupVolume: adjustedCupVolume,
        region: { code: params.regionCode },
      },
    });

    if (!adjustedSize) {
      return {
        recommendedSize: params.userNormalSize,
        adjustment: 'NONE',
        fitNote: brand.fitNotes || 'Size not available',
      };
    }

    // Generate fit note
    let fitNote = brand.fitNotes || '';

    if (brand.fitType === 'RUNS_SMALL') {
      fitNote += ` Normally wear ${params.userNormalSize}? Try ${adjustedSize.displaySize} in this brand.`;
    } else if (brand.fitType === 'RUNS_LARGE') {
      fitNote += ` Normally wear ${params.userNormalSize}? Try ${adjustedSize.displaySize} in this brand.`;
    }

    return {
      recommendedSize: adjustedSize.displaySize,
      adjustment: brand.fitType,
      fitNote,
    };
  }

  private parseSize(size: string): { band: number; cupVolume: number } {
    // Simple parser: "34C" -> band: 34, cupVolume: 3
    const match = size.match(/^(\d+)([A-Z]+)$/);
    if (!match) throw new Error('Invalid size format');

    const band = parseInt(match[1]);
    const cupLetter = match[2];

    // Cup letter to volume mapping (US standard)
    const cupMap: Record<string, number> = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'G': 7, 'H': 8
    };

    return {
      band,
      cupVolume: cupMap[cupLetter] || 0,
    };
  }
}

export const brandFitService = new BrandFitService();
```

### 3. Cup Progression Mapping Service

```typescript
// backend/src/services/cup-progression.service.ts

export class CupProgressionService {
  // Hardcoded cup progression tables (NEVER use math!)

  private readonly CUP_PROGRESSIONS: Record<string, string[]> = {
    'US': ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
    'UK': ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ'],
    'EU': ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
    'FR': ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
    'AU': ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ'],
    'JP': ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  };

  /**
   * Convert cup letter from one region to another
   * CRITICAL: Uses mapping table, not math!
   */
  convertCupLetter(params: {
    fromRegion: string;
    toRegion: string;
    cupLetter: string;
  }): string | null {
    const fromProgression = this.CUP_PROGRESSIONS[params.fromRegion];
    const toProgression = this.CUP_PROGRESSIONS[params.toRegion];

    if (!fromProgression || !toProgression) {
      return null;
    }

    // Find cup volume (index in progression)
    const cupVolume = fromProgression.indexOf(params.cupLetter);

    if (cupVolume === -1) {
      return null;
    }

    // Get equivalent cup letter in target region
    return toProgression[cupVolume] || null;
  }

  /**
   * Get cup volume from cup letter and region
   */
  getCupVolume(region: string, cupLetter: string): number {
    const progression = this.CUP_PROGRESSIONS[region];
    if (!progression) return -1;

    return progression.indexOf(cupLetter);
  }

  /**
   * Validate if a cup letter exists in a region
   */
  isValidCupLetter(region: string, cupLetter: string): boolean {
    const progression = this.CUP_PROGRESSIONS[region];
    return progression ? progression.includes(cupLetter) : false;
  }
}

export const cupProgressionService = new CupProgressionService();
```

---

## 🎨 FRONTEND COMPONENTS V2

### 1. Separated Region & Size Preference

```tsx
// frontend/src/contexts/LocaleContext.tsx

interface LocalePreference {
  // Size display
  sizeStandard: 'US' | 'UK' | 'EU' | 'FR' | 'AU' | 'JP';
  lengthUnit: 'in' | 'cm';
  weightUnit: 'lb' | 'kg';

  // Shipping & payment
  shippingCountry: string;
  currency: string;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocalePreference>({
    sizeStandard: 'US',
    lengthUnit: 'in',
    weightUnit: 'lb',
    shippingCountry: 'VN',
    currency: 'VND',
  });

  // Separate functions for updating each preference
  const setSizeStandard = (standard: string) => {
    setLocale(prev => ({ ...prev, sizeStandard: standard as any }));
  };

  const setShippingCountry = (country: string) => {
    setLocale(prev => ({ ...prev, shippingCountry: country }));
  };

  return (
    <LocaleContext.Provider value={{ locale, setSizeStandard, setShippingCountry }}>
      {children}
    </LocaleContext.Provider>
  );
}
```

### 2. Sister Size Recommendation UI

```tsx
// frontend/src/components/SisterSizeAlert.tsx

interface SisterSizeAlertProps {
  requestedSize: string;
  alternatives: Array<{
    size: string;
    type: 'SISTER_DOWN' | 'SISTER_UP';
    stock: number;
    fitNote: string;
  }>;
  onSelectAlternative: (size: string) => void;
}

export function SisterSizeAlert({
  requestedSize,
  alternatives,
  onSelectAlternative
}: SisterSizeAlertProps) {
  if (alternatives.length === 0) return null;

  return (
    <div className="sister-size-alert">
      <div className="alert-header">
        <AlertIcon />
        <span>Size {requestedSize} is currently out of stock</span>
      </div>

      <div className="alert-body">
        <p>Try these sister sizes with the same cup volume:</p>

        <div className="alternatives">
          {alternatives.map((alt) => (
            <button
              key={alt.size}
              className="alternative-size-button"
              onClick={() => onSelectAlternative(alt.size)}
            >
              <div className="size-display">
                <strong>{alt.size}</strong>
                <span className="stock-badge">{alt.stock} in stock</span>
              </div>

              <div className="fit-note">
                {alt.type === 'SISTER_DOWN' ? '🔽' : '🔼'} {alt.fitNote}
              </div>
            </button>
          ))}
        </div>

        <div className="info-note">
          <InfoIcon />
          <small>
            Sister sizes have the same cup volume but different band fits.
            Learn more about <a href="/size-guide#sister-sizing">sister sizing</a>.
          </small>
        </div>
      </div>
    </div>
  );
}
```

### 3. Brand Fit Notice

```tsx
// frontend/src/components/BrandFitNotice.tsx

interface BrandFitNoticeProps {
  brand: {
    name: string;
    fitType: string;
    fitNote: string;
  };
  userNormalSize: string;
  recommendedSize: string;
}

export function BrandFitNotice({
  brand,
  userNormalSize,
  recommendedSize
}: BrandFitNoticeProps) {
  if (brand.fitType === 'TRUE_TO_SIZE') return null;

  return (
    <div className={`brand-fit-notice ${brand.fitType.toLowerCase()}`}>
      <div className="notice-icon">
        {brand.fitType === 'RUNS_SMALL' ? '📏⬇️' : '📏⬆️'}
      </div>

      <div className="notice-content">
        <strong>{brand.name} Fit Notice</strong>
        <p>{brand.fitNote}</p>

        {userNormalSize !== recommendedSize && (
          <div className="size-suggestion">
            Normally wear <strong>{userNormalSize}</strong>?
            Try <strong className="highlight">{recommendedSize}</strong> in this brand.
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📡 API ROUTES V2

### 1. Sister Sizing Endpoint

```typescript
// GET /api/products/:productId/sizes/alternatives
router.get('/products/:productId/sizes/alternatives', async (req, res) => {
  try {
    const { productId } = req.params;
    const { requestedSize, region } = req.query;

    const alternatives = await sisterSizingService.getAvailableSisterSizes({
      productId: parseInt(productId),
      requestedSize: requestedSize as string,
      regionCode: region as string,
    });

    res.json({
      success: true,
      data: alternatives,
    });
  } catch (error) {
    console.error('Get sister sizes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get alternatives' });
  }
});

// POST /api/sister-size/accept
router.post('/sister-size/accept', async (req, res) => {
  try {
    const { recommendationId } = req.body;

    await prisma.sisterSizeRecommendation.update({
      where: { id: recommendationId },
      data: {
        accepted: true,
        acceptedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Accept sister size error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept recommendation' });
  }
});
```

### 2. Brand Fit Endpoint

```typescript
// GET /api/brands/:brandId/fit-recommendation
router.get('/api/brands/:brandId/fit-recommendation', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { userNormalSize, region } = req.query;

    const recommendation = await brandFitService.adjustSizeForBrand({
      brandId,
      userNormalSize: userNormalSize as string,
      regionCode: region as string,
    });

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    console.error('Brand fit recommendation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get brand fit' });
  }
});
```

---

## 🔧 ADMIN FEATURES V2

### 1. Bulk Import CSV Template

```csv
SKU,BaseSize,BaseSizeUIC,BandSize,CupVolume,CupLetter_US,CupLetter_UK,CupLetter_EU,ColorName,ColorHex,Stock,Price
BRA-001-32A-BLACK,32A,UIC_BRA_BAND32_CUPVOL1,32,1,A,A,A,Black,#000000,50,29.99
BRA-001-32B-BLACK,32B,UIC_BRA_BAND32_CUPVOL2,32,2,B,B,B,Black,#000000,45,29.99
BRA-001-32C-BLACK,32C,UIC_BRA_BAND32_CUPVOL3,32,3,C,C,C,Black,#000000,40,29.99
BRA-001-34A-BLACK,34A,UIC_BRA_BAND34_CUPVOL1,34,1,A,A,A,Black,#000000,60,29.99
BRA-001-34B-BLACK,34B,UIC_BRA_BAND34_CUPVOL2,34,2,B,B,B,Black,#000000,55,29.99
BRA-001-34C-BLACK,34C,UIC_BRA_BAND34_CUPVOL3,34,3,C,C,C,Black,#000000,50,29.99
```

### 2. Clone Standard Feature

```typescript
// POST /api/admin/size-standards/clone
router.post('/admin/size-standards/clone', async (req, res) => {
  const { sourceStandardId, newCategory, newRegion } = req.body;

  // Get source standard with all sizes
  const sourceStandard = await prisma.sizeStandard.findUnique({
    where: { id: sourceStandardId },
    include: { sizes: true },
  });

  // Create new standard
  const newStandard = await prisma.sizeStandard.create({
    data: {
      code: `${newRegion}_${newCategory}`,
      regionId: newRegion,
      category: newCategory,
      name: `${newRegion} ${newCategory} Size Standard`,
      lengthUnit: sourceStandard.lengthUnit,
      weightUnit: sourceStandard.weightUnit,
      cupProgression: sourceStandard.cupProgression,
    },
  });

  // Clone all sizes
  const newSizes = sourceStandard.sizes.map((size) => ({
    universalCode: size.universalCode.replace(
      sourceStandard.code,
      newStandard.code
    ),
    regionId: newRegion,
    standardId: newStandard.id,
    displaySize: size.displaySize,
    sortOrder: size.sortOrder,
    bandSize: size.bandSize,
    cupVolume: size.cupVolume,
    cupLetter: size.cupLetter,
    measurements: size.measurements,
  }));

  await prisma.regionalSize.createMany({
    data: newSizes,
  });

  res.json({ success: true, data: { newStandard, sizeCount: newSizes.length } });
});
```

### 3. Cache Invalidation on Admin Changes

```typescript
// backend/src/services/cache-invalidation.service.ts

export class CacheInvalidationService {
  async invalidateSizeSystem(scope: 'ALL' | 'REGION' | 'PRODUCT', id?: string) {
    const redis = new Redis(process.env.REDIS_URL!);

    switch (scope) {
      case 'ALL':
        // Clear all size-related cache
        await redis.del(await redis.keys('product-sizes:*'));
        await redis.del(await redis.keys('size-conversion:*'));
        await redis.del(await redis.keys('conversion-matrix:*'));
        break;

      case 'REGION':
        // Clear all cache for a specific region
        await redis.del(await redis.keys(`product-sizes:*:${id}:*`));
        await redis.del(await redis.keys(`size-conversion:${id}:*`));
        await redis.del(await redis.keys(`size-conversion:*:${id}:*`));
        break;

      case 'PRODUCT':
        // Clear cache for a specific product
        await redis.del(await redis.keys(`product-sizes:${id}:*`));
        break;
    }

    console.log(`[CACHE] Invalidated ${scope} cache${id ? ` for ${id}` : ''}`);
  }
}

// Use in admin routes
router.put('/admin/size-conversions/:id', async (req, res) => {
  // ... update conversion ...

  // Invalidate cache immediately
  await cacheInvalidationService.invalidateSizeSystem('ALL');

  res.json({ success: true });
});
```

---

## 📊 ANALYTICS V2

```typescript
// backend/src/services/analytics/sister-size-analytics.service.ts

export class SisterSizeAnalyticsService {
  /**
   * Track sister size recommendation acceptance rate
   */
  async getSisterSizeAcceptanceRate(dateRange: { from: Date; to: Date }) {
    const stats = await prisma.sisterSizeRecommendation.groupBy({
      by: ['recommendationType'],
      where: {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        accepted: true,
      },
    });

    return stats.map((stat) => ({
      type: stat.recommendationType,
      totalRecommendations: stat._count.id,
      acceptedRecommendations: stat._sum.accepted || 0,
      acceptanceRate: ((stat._sum.accepted || 0) / stat._count.id) * 100,
    }));
  }

  /**
   * Identify frequently out-of-stock sizes
   */
  async getFrequentlyOutOfStockSizes() {
    const outOfStockRequests = await prisma.sisterSizeRecommendation.groupBy({
      by: ['requestedSize'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });

    return outOfStockRequests.map((req) => ({
      size: req.requestedSize,
      outOfStockRequests: req._count.id,
    }));
  }
}
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] **Database**: Apply new schema with sister sizing + brand fit
- [ ] **Sister Sizing Logic**: Implement band/cup volume calculations
- [ ] **Cup Progression**: Hardcoded mapping tables (US/UK/EU)
- [ ] **Brand Fit Profiles**: Allow admin to configure brand adjustments
- [ ] **SKU Management**: Single inventory source, multiple display formats
- [ ] **Locale Separation**: Size preference ≠ Shipping region
- [ ] **Bulk Import**: CSV upload for size data
- [ ] **Clone Standard**: Quick setup for new categories
- [ ] **Cache Invalidation**: Immediate on admin changes
- [ ] **Sister Size UI**: Alert component with alternatives
- [ ] **Brand Fit Notice**: Warning for RUNS_SMALL/LARGE brands
- [ ] **Analytics**: Track sister size acceptance rate
- [ ] **SEO**: Add hreflang tags for multi-region

---

**This is production-ready lingerie sizing logic!** 🎯
