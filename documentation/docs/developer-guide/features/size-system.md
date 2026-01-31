 ---
 sidebar_position: 2
 ---
 
 # Size System V2
 
 Enterprise-grade lingerie size recommendation system với Sister Sizing và Brand Fit Adjustment.
 
 ## 📋 Overview
 
 Size System V2 bao gồm 3 core components:
 
 1. **Sister Sizing** - Gợi ý size thay thế khi out of stock
 2. **Cup Progression** - Convert size giữa US/UK/EU
 3. **Brand Fit Adjustment** - Điều chỉnh theo brand fit profile
 
 ## 🗄️ Database Schema
 
 ### Core Tables
 
 ```prisma
 model SisterSize {
   id              String   @id @default(uuid())
   originalBand    Int      // 34
   originalCup     String   // "C"
   sisterBand      Int      // 32
   sisterCup       String   // "D"
   cupVolume       Int      // 6
   direction       String   // "UP" | "DOWN"
   createdAt       DateTime @default(now())
 }
 
 model CupProgression {
   id              String   @id @default(uuid())
   cupSize         String   // "DD"
   cupOrder        Int      // 5
   regionCode      String   // "US" | "UK" | "EU"
   createdAt       DateTime @default(now())
   
   @@unique([cupSize, regionCode])
 }
 
 model BrandFit {
   id              String   @id @default(uuid())
   brandId         String
   fitType         String   // "TRUE_TO_SIZE" | "RUNS_SMALL" | "RUNS_LARGE"
   bandAdjustment  Int      // -1, 0, +1, +2
   cupAdjustment   Int      // -1, 0, +1
   notes           String?
   brand           Brand    @relation(fields: [brandId], references: [id])
   
   @@unique([brandId])
 }
 ```
 
 ## 🔧 Core Algorithm
 
 ### Sister Sizing Formula
 
 ```typescript
 // Calculate cup volume
 cupVolume = cupOrder + (band - 28) / 2
 
 // Example: 34C
 cupOrder("C") = 3
 cupVolume = 3 + (34 - 28) / 2 = 3 + 3 = 6
 
 // Find sister sizes with same volume
 // 32D: 4 + (32 - 28) / 2 = 4 + 2 = 6 ✅
 // 36B: 2 + (36 - 28) / 2 = 2 + 4 = 6 ✅
 ```
 
 ### Size Conversion
 
 ```typescript
 // US 34DD → EU ?
 
 // Step 1: Band conversion
 US/UK band = EU band - 30
 34 (US) = 34 + 30 = 75 (EU) ✅
 
 // Step 2: Cup conversion (MUST use mapping table!)
 cupOrder(DD, US) = 5
 findCup(order: 5, region: EU) = "E"
 
 // Result: US 34DD = EU 75E
 ```
 
 ## 🚀 API Endpoints
 
 ### POST /api/sizes/sister-sizes
 
 Find sister sizes for out-of-stock products.
 
 ```bash
 curl -X POST http://localhost:3001/api/sizes/sister-sizes \
   -H "Content-Type: application/json" \
   -d '{
     "band": 34,
     "cup": "C",
     "productId": "prod-123",
     "regionCode": "US"
   }'
 ```
 
 **Response:**
 ```json
 {
   "success": true,
   "data": {
     "originalSize": {
       "band": 34,
       "cup": "C",
       "available": false,
       "stock": 0
     },
     "sisterSizes": [
       {
         "band": 32,
         "cup": "D",
         "direction": "DOWN",
         "displaySize": "32D",
         "available": true,
         "stock": 5
       }
     ]
   }
 }
 ```
 
 ### GET /api/sizes/convert
 
 Convert size between regions.
 
 ```bash
 curl "http://localhost:3001/api/sizes/convert?size=34DD&from=US&to=EU"
 ```
 
 **Response:**
 ```json
 {
   "success": true,
   "data": {
     "originalSize": "34DD",
     "convertedSize": "75E",
     "fromRegion": "US",
     "toRegion": "EU"
   }
 }
 ```
 
 ## 🎨 Frontend Integration
 
 ### SisterSizeAlert Component
 
 ```tsx
 import SisterSizeAlert from '@/components/product/SisterSizeAlert';
 
 export default function ProductPage({ product }) {
   const [selectedSize, setSelectedSize] = useState('');
   
   return (
     <SisterSizeAlert
       productId={product.id}
       requestedSize={selectedSize}
       regionCode="US"
       onSizeSelect={(size) => setSelectedSize(size)}
     />
   );
 }
 ```
 
 ## 🧪 Testing
 
 ```bash
 # Run tests
 cd backend
 npm test -- sisterSizeService
 ```
 
 ## 📚 Learn More
 
 - [User Guide: Size System](../../user-guide/size-system/overview)
 - [API Reference: Size System](../../api-reference/endpoints/size-system)
 - [Complete Implementation](/docs/SIZE_SYSTEM_V2_README.md)
