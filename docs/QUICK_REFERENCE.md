# 🚀 QUICK REFERENCE - LINGERIE SIZE SYSTEM V2

## One-Page Cheat Sheet for Developers

---

## 📦 INSTALLATION (5 MINUTES)

```bash
# 1. Install dependencies
cd backend
npm install ioredis zod
npm install -D @types/jest @types/supertest jest ts-jest supertest

# 2. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 3. Add to .env
echo "REDIS_URL=redis://localhost:6379" >> .env

# 4. Run migration
npx prisma migrate dev --name add_lingerie_size_system_v2
npx prisma generate

# 5. Seed data
curl -X POST http://localhost:5000/api/sizes/seed-cup-progression

# 6. Run tests
npm test
```

---

## 🔧 KEY SERVICES

### 1. Sister Sizing
```typescript
import { sisterSizingService } from './services/sister-sizing.service';

// Get sister sizes
const sisters = await sisterSizingService.getSisterSizes({
  universalCode: 'UIC_BRA_BAND86_CUPVOL6'
});
// Returns: { original: 34C, sisterDown: 32D, sisterUp: 36B }

// Get alternatives when out of stock
const alternatives = await sisterSizingService.getAvailableSisterSizes({
  productId: 123,
  requestedSize: '34C',
  regionCode: 'US'
});
// Returns: { isAvailable: false, alternatives: [...] }
```

### 2. Cup Progression
```typescript
import { cupProgressionService } from './services/cup-progression.service';

// Convert cup letter
const result = await cupProgressionService.convertCupLetter({
  fromRegion: 'US',
  toRegion: 'EU',
  cupLetter: 'DD'
});
// Returns: { toCupLetter: 'E', cupVolume: 6 }

// Get cup volume
const volume = cupProgressionService.getCupVolume('US', 'DD'); // 6

// Get cup letter
const letter = cupProgressionService.getCupLetter('EU', 6); // 'E'
```

### 3. Brand Fit
```typescript
import { brandFitService } from './services/brand-fit.service';

// Adjust size for brand
const adjustment = await brandFitService.adjustSizeForBrand({
  brandId: 'brand_ap',
  userNormalSize: '34C',
  regionCode: 'US'
});
// Returns: { recommendedSize: '36D', fitNote: 'Size up...' }

// Submit feedback
await brandFitService.submitFitFeedback({
  brandId: 'brand_ap',
  productId: 123,
  normalSize: '34C',
  boughtSize: '36D',
  fitRating: 3
});
```

---

## 🌐 API ENDPOINTS (17 TOTAL)

### Sister Sizing (5)
```bash
GET    /api/sizes/sister/:uic
GET    /api/products/:id/sizes/alternatives?requestedSize=34C&regionCode=US
GET    /api/sizes/sister-family/:uic?regionCode=US
POST   /api/sizes/sister/accept { recommendationId }
GET    /api/sizes/sister/stats?from=2026-01-01&to=2026-01-31
```

### Cup Progression (3)
```bash
POST   /api/sizes/cup/convert { fromRegion, toRegion, cupLetter }
GET    /api/sizes/cup/progression/US
GET    /api/sizes/cup/matrix/6
```

### Brand Fit (6)
```bash
POST   /api/brands/fit/adjust { brandId, userNormalSize, regionCode }
GET    /api/brands/:brandId/fit
GET    /api/brands/fit/all
POST   /api/brands/fit/feedback { brandId, productId, normalSize, boughtSize, fitRating }
GET    /api/brands/:brandId/fit/stats
GET    /api/brands/:brandId/fit/suggested-adjustment
```

---

## 🧪 TESTING COMMANDS

```bash
# All tests (88 tests)
npm test

# Coverage report
npm run test:coverage

# Specific test file
npm test -- sister-sizing.service.test.ts

# Specific test case
npm test -- -t "should convert US DD to EU E"

# Watch mode
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm test -- e2e.test.ts
```

---

## 🎯 CRITICAL RULES

### ❌ DON'T USE MATH FOR CUP CONVERSION!
```typescript
// ❌ WRONG
const euCup = usCup === 'DD' ? 'E' : usCup; // MATH!

// ✅ CORRECT
const CUP_PROGRESSIONS = {
  US: ['A','B','C','D','DD','DDD','G','H'],
  EU: ['A','B','C','D','E','F','G','H']
};
const volume = CUP_PROGRESSIONS.US.indexOf('DD'); // 5
const euCup = CUP_PROGRESSIONS.EU[volume]; // 'E'
```

### ✅ SISTER SIZING FORMULA
```
Sister Down: Band -5cm (≈2 inches), Same cup volume
Sister Up:   Band +5cm (≈2 inches), Same cup volume

Example: 34C (86cm band, volume 6)
- Sister Down: 32D (81cm band, volume 6)
- Sister Up:   36B (91cm band, volume 6)
```

### ✅ BRAND FIT ADJUSTMENTS
```
TRUE_TO_SIZE:  No adjustment
RUNS_SMALL:    +1 band, +1 cup (size up)
RUNS_LARGE:    -1 band, 0 cup (size down)

Example: Agent Provocateur (RUNS_SMALL)
User wears: 34C → Recommend: 36D
```

---

## 📊 DATABASE SCHEMA (Key Tables)

```sql
-- Core tables
Region             -- US, UK, EU, FR, AU, JP, VN
SizeStandard       -- US_BRA, UK_BRA, EU_BRA
RegionalSize       -- 34C (US), 75C (EU) - linked by UIC
SizeConversion     -- US DD → EU E mappings
Brand              -- Fit profiles
ProductVariant     -- Single inventory source

-- Analytics tables
SisterSizeRecommendation  -- Track sister size usage
BrandFitFeedback          -- User fit ratings
CupProgressionMap         -- Cup letter mappings
```

---

## 🔍 DEBUGGING TIPS

### Redis Not Connected
```bash
# Check Redis
redis-cli ping  # Should return PONG

# Restart Redis
docker restart redis
```

### Tests Failing
```bash
# Clear cache
redis-cli FLUSHALL

# Reset database
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

### API Errors
```bash
# Check logs
tail -f backend/logs/app.log

# Test endpoint manually
curl http://localhost:5000/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6

# Check Redis cache
redis-cli KEYS "sister-sizes:*"
```

---

## 📈 PERFORMANCE

### Cache Strategy
```typescript
// Sister sizes: 1 hour
await redis.setex('sister-sizes:UIC', 3600, data);

// Cup conversions: 24 hours
await redis.setex('cup-conversion:US:EU:DD', 86400, data);

// Brand fit: 1 hour
await redis.setex('brand-fit:brandId:34C', 3600, data);
```

### Invalidation
```typescript
// Clear cache after admin changes
await sisterSizingService.invalidateCache(uic);
await cupProgressionService.invalidateCache();
await brandFitService.invalidateCache(brandId);
```

---

## 🐛 COMMON ERRORS

| Error | Cause | Fix |
|-------|-------|-----|
| `P1001: Can't reach database` | DB not running | `docker start postgres` |
| `ECONNREFUSED 127.0.0.1:6379` | Redis not running | `docker start redis` |
| `Size not found` | Invalid UIC | Check `RegionalSize` table |
| `Invalid cup letter` | Wrong region/cup | Use `isValidCupLetter()` |
| `Brand not found` | Invalid brandId | Check `Brand` table |

---

## 📚 RESOURCES

- **Full Docs**: `docs/LINGERIE_SIZE_SYSTEM_V2.md`
- **Deployment**: `docs/SIZE_SYSTEM_V2_DEPLOYMENT.md`
- **QA Guide**: `docs/QA_TESTING_GUIDE.md`
- **Implementation**: `docs/IMPLEMENTATION_COMPLETE.md`

---

## ✅ CHECKLIST

- [ ] Redis running
- [ ] Migration completed
- [ ] Cup progressions seeded
- [ ] All tests passing (88/88)
- [ ] Coverage ≥ 70%
- [ ] API endpoints working
- [ ] Cache configured
- [ ] Routes registered in app

---

**Version**: 2.0.0
**Status**: Production Ready ✅
**Last Updated**: 2026-01-26
