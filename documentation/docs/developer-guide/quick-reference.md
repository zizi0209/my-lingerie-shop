 ---
 sidebar_position: 2
 ---
 
 # Quick Reference
 
 One-page cheat sheet for developers working with the Lingerie Size System V2.
 
 ## 📦 Quick Setup (5 Minutes)
 
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
 
 ## 🔧 Core Services
 
 ### Sister Sizing Service
 
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
 
 ### Cup Progression Service
 
 ```typescript
 import { cupProgressionService } from './services/cup-progression.service';
 
 // Convert cup letter between regions
 const result = await cupProgressionService.convertCupLetter({
   fromRegion: 'US',
   toRegion: 'EU',
   cupLetter: 'DD'
 });
 // Returns: { toCupLetter: 'E', cupVolume: 6 }
 
 // Get cup volume
 const volume = cupProgressionService.getCupVolume('US', 'DD'); // 6
 
 // Get cup letter from volume
 const letter = cupProgressionService.getCupLetter('EU', 6); // 'E'
 ```
 
 ### Brand Fit Service
 
 ```typescript
 import { brandFitService } from './services/brand-fit.service';
 
 // Adjust size for brand fit
 const adjustment = await brandFitService.adjustSizeForBrand({
   brandId: 'brand_ap',
   userNormalSize: '34C',
   regionCode: 'US'
 });
 // Returns: { recommendedSize: '36D', fitNote: 'Size up...' }
 
 // Submit fit feedback
 await brandFitService.submitFitFeedback({
   brandId: 'brand_ap',
   productId: 123,
   normalSize: '34C',
   boughtSize: '36D',
   fitRating: 3
 });
 ```
 
 ## 🌐 API Endpoints (17 Total)
 
 ### Sister Sizing Endpoints (5)
 
 ```bash
 # Get sister sizes for a Universal Item Code
 GET /api/sizes/sister/:uic
 
 # Get available alternatives for out-of-stock size
 GET /api/products/:id/sizes/alternatives?requestedSize=34C&regionCode=US
 
 # Get all sizes in same cup volume family
 GET /api/sizes/sister-family/:uic?regionCode=US
 
 # Mark recommendation as accepted
 POST /api/sizes/sister/accept
 Body: { recommendationId: "rec_123" }
 
 # Get recommendation statistics
 GET /api/sizes/sister/stats?from=2026-01-01&to=2026-01-31
 ```
 
 ### Cup Progression Endpoints (3)
 
 ```bash
 # Convert cup letter between regions
 POST /api/sizes/cup/convert
 Body: { fromRegion: "US", toRegion: "EU", cupLetter: "DD" }
 
 # Get cup progression for a region
 GET /api/sizes/cup/progression/US
 
 # Get conversion matrix for cup volume
 GET /api/sizes/cup/matrix/6
 ```
 
 ### Brand Fit Endpoints (6)
 
 ```bash
 # Get size adjustment for brand
 POST /api/brands/fit/adjust
 Body: { brandId: "brand_ap", userNormalSize: "34C", regionCode: "US" }
 
 # Get brand fit profile
 GET /api/brands/:brandId/fit
 
 # Get all brand fit profiles
 GET /api/brands/fit/all
 
 # Submit fit feedback
 POST /api/brands/fit/feedback
 Body: { brandId, productId, normalSize, boughtSize, fitRating }
 
 # Get brand fit statistics
 GET /api/brands/:brandId/fit/stats
 
 # Get suggested adjustment based on feedback
 GET /api/brands/:brandId/fit/suggested-adjustment
 ```
 
 ## 🧪 Testing Commands
 
 ```bash
 # Run all tests (88 tests)
 npm test
 
 # Generate coverage report
 npm run test:coverage
 
 # Run specific test file
 npm test -- sister-sizing.service.test.ts
 
 # Run specific test case
 npm test -- -t "should convert US DD to EU E"
 
 # Watch mode for development
 npm run test:watch
 
 # Unit tests only
 npm run test:unit
 
 # Integration tests
 npm run test:integration
 
 # E2E tests
 npm test -- e2e.test.ts
 ```
 
 ## 🎯 Critical Rules
 
 ### ❌ DON'T Use Math for Cup Conversion!
 
 ```typescript
 // ❌ WRONG - Mathematical conversion
 const euCup = usCup === 'DD' ? 'E' : usCup;
 
 // ✅ CORRECT - Lookup table
 const CUP_PROGRESSIONS = {
   US: ['A','B','C','D','DD','DDD','G','H'],
   EU: ['A','B','C','D','E','F','G','H']
 };
 const volume = CUP_PROGRESSIONS.US.indexOf('DD'); // 5
 const euCup = CUP_PROGRESSIONS.EU[volume]; // 'E'
 ```
 
 **Why?** Cup progressions differ by region. US uses DD, DDD while UK uses E, F, FF. Math will fail!
 
 ### ✅ Sister Sizing Formula
 
 ```
 Sister Down: Band -5cm (≈2 inches), Same cup volume
 Sister Up:   Band +5cm (≈2 inches), Same cup volume
 
 Example: 34C (86cm band, volume 6)
 - Sister Down: 32D (81cm band, volume 6)
 - Sister Up:   36B (91cm band, volume 6)
 ```
 
 ### ✅ Brand Fit Adjustments
 
 ```
 TRUE_TO_SIZE:  No adjustment
 RUNS_SMALL:    +1 band, +1 cup (size up)
 RUNS_LARGE:    -1 band, 0 cup (size down)
 
 Example: Agent Provocateur (RUNS_SMALL)
 User wears: 34C → Recommend: 36D
 ```
 
 ## 📊 Database Schema (Key Tables)
 
 ```sql
 -- Core Configuration
 Region             -- US, UK, EU, FR, AU, JP, VN
 SizeStandard       -- US_BRA, UK_BRA, EU_BRA
 
 -- Size Data
 RegionalSize       -- 34C (US), 75C (EU) - linked by UIC
 SizeConversion     -- US DD → EU E mappings
 
 -- Product & Brand
 Brand              -- Fit profiles (TRUE_TO_SIZE, RUNS_SMALL, etc.)
 ProductVariant     -- Single inventory source
 
 -- Analytics
 SisterSizeRecommendation  -- Track sister size usage
 BrandFitFeedback          -- User fit ratings
 CupProgressionMap         -- Cup letter mappings
 ```
 
 ## 🔍 Debugging Tips
 
 ### Redis Connection Issues
 
 ```bash
 # Check if Redis is running
 redis-cli ping  # Should return PONG
 
 # Restart Redis container
 docker restart redis
 
 # Check Redis logs
 docker logs redis
 ```
 
 ### Test Failures
 
 ```bash
 # Clear Redis cache
 redis-cli FLUSHALL
 
 # Reset database to clean state
 npx prisma migrate reset
 
 # Re-run migrations
 npx prisma migrate dev
 
 # Regenerate Prisma Client
 npx prisma generate
 ```
 
 ### API Errors
 
 ```bash
 # Check application logs
 tail -f backend/logs/app.log
 
 # Test endpoint manually
 curl http://localhost:5000/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6
 
 # Check what's in Redis cache
 redis-cli KEYS "sister-sizes:*"
 redis-cli GET "sister-sizes:UIC_BRA_BAND86_CUPVOL6"
 ```
 
 ## 📈 Performance & Caching
 
 ### Cache Strategy
 
 ```typescript
 // Sister sizes: Cache for 1 hour
 await redis.setex('sister-sizes:UIC', 3600, JSON.stringify(data));
 
 // Cup conversions: Cache for 24 hours (rarely changes)
 await redis.setex('cup-conversion:US:EU:DD', 86400, JSON.stringify(data));
 
 // Brand fit: Cache for 1 hour
 await redis.setex('brand-fit:brandId:34C', 3600, JSON.stringify(data));
 ```
 
 ### Cache Invalidation
 
 ```typescript
 // Clear cache after admin changes
 await sisterSizingService.invalidateCache(uic);
 await cupProgressionService.invalidateCache();
 await brandFitService.invalidateCache(brandId);
 ```
 
 ## 🐛 Common Errors & Solutions
 
 | Error | Cause | Fix |
 |-------|-------|-----|
 | `P1001: Can't reach database` | PostgreSQL not running | `docker start postgres` |
 | `ECONNREFUSED 127.0.0.1:6379` | Redis not running | `docker start redis` |
 | `Size not found` | Invalid Universal Item Code | Check `RegionalSize` table |
 | `Invalid cup letter` | Wrong region/cup combination | Use `isValidCupLetter()` first |
 | `Brand not found` | Invalid brandId | Check `Brand` table |
 | `P2002: Unique constraint` | Duplicate entry | Check for existing record |
 
 ## ✅ Production Checklist
 
 Before deploying to production:
 
 - [ ] Redis is running and configured
 - [ ] Database migrations completed
 - [ ] Cup progressions seeded
 - [ ] All tests passing (88/88)
 - [ ] Test coverage ≥ 70%
 - [ ] All API endpoints responding
 - [ ] Cache strategy configured
 - [ ] Routes registered in Express app
 - [ ] Environment variables set
 - [ ] Error monitoring configured
 
 ## 📚 Related Documentation
 
 - [Size System Features](./features/size-system) - Detailed feature documentation
 - [Size System API](../api-reference/size-system) - Complete API reference
 - [Testing Guide](./testing/qa-guide) - QA testing procedures
 - [Architecture Overview](./architecture/overview) - System architecture
 
 ---
 
 **Version**: 2.0.0  
 **Status**: ✅ Production Ready  
 **Last Updated**: 2026-01-31
