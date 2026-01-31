 ---
 sidebar_position: 4
 ---
 
 # Size System API
 
 Advanced lingerie size system with sister sizing, regional conversions, and smart recommendations.
 
 ## Features Overview
 
 - **Sister Sizing**: Find alternative sizes with the same cup volume
 - **Regional Conversions**: Convert between US, UK, EU, FR, AU, JP sizing
 - **Brand Fit Adjustments**: Account for brands that run small/large
 - **Cup Progression**: Understand cup size relationships across regions
 
 ## Sister Sizing API
 
 ### Get Sister Sizes
 
 Find alternative bra sizes with the same cup volume.
 
 ```http
 GET /api/sizes/sister/:universalCode
 ```
 
 **Example Request:**
 
 ```bash
 curl http://localhost:5000/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "requestedSize": {
       "universalCode": "UIC_BRA_BAND86_CUPVOL6",
       "displaySize": "34C",
       "bandSize": 86,
       "cupVolume": 6
     },
     "sisterSizes": [
       {
         "universalCode": "UIC_BRA_BAND81_CUPVOL6",
         "displaySize": "32D",
         "bandSize": 81,
         "cupVolume": 6,
         "relationship": "TIGHTER_BAND",
         "description": "Band will be snugger, same cup volume"
       },
       {
         "universalCode": "UIC_BRA_BAND91_CUPVOL6",
         "displaySize": "36B",
         "bandSize": 91,
         "cupVolume": 6,
         "relationship": "LOOSER_BAND",
         "description": "Band will be more relaxed, same cup volume"
       }
     ]
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function getSisterSizes(universalCode) {
   const response = await fetch(
     `http://localhost:5000/api/sizes/sister/${universalCode}`
   );
   const result = await response.json();
   return result.data;
 }
 
 // Usage
 const sisters = await getSisterSizes('UIC_BRA_BAND86_CUPVOL6');
 console.log('Original:', sisters.requestedSize.displaySize); // "34C"
 console.log('Tighter band:', sisters.sisterSizes[0].displaySize); // "32D"
 console.log('Looser band:', sisters.sisterSizes[1].displaySize); // "36B"
 ```
 
 ## Product Size Alternatives
 
 ### Get Available Alternatives
 
 Get sister sizes for a specific product, filtered by stock availability.
 
 ```http
 GET /api/products/:productId/sizes/alternatives
 ```
 
 **Query Parameters:**
 
 | Parameter | Type | Required | Description |
 |-----------|------|----------|-------------|
 | `requestedSize` | string | Yes | Size code (e.g., "34C") |
 | `regionCode` | string | Yes | Region (US, UK, EU, etc.) |
 
 **Example Request:**
 
 ```bash
 curl "http://localhost:5000/api/products/1/sizes/alternatives?requestedSize=34C&regionCode=US"
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "requestedSize": "34C",
     "isAvailable": false,
     "alternatives": [
       {
         "size": "32D",
         "universalCode": "UIC_BRA_BAND81_CUPVOL6",
         "stock": 5,
         "isAvailable": true,
         "relationship": "TIGHTER_BAND",
         "recommendation": "Try this if you prefer a snugger fit"
       },
       {
         "size": "36B",
         "universalCode": "UIC_BRA_BAND91_CUPVOL6",
         "stock": 3,
         "isAvailable": true,
         "relationship": "LOOSER_BAND",
         "recommendation": "Try this if you prefer a more relaxed fit"
       }
     ]
   }
 }
 ```
 
 ### React Component Example
 
 ```tsx
 import { useState, useEffect } from 'react';
 
 function SizeAlternatives({ productId, requestedSize, regionCode }) {
   const [alternatives, setAlternatives] = useState(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     async function fetchAlternatives() {
       const response = await fetch(
         `/api/products/${productId}/sizes/alternatives?` +
         `requestedSize=${requestedSize}&regionCode=${regionCode}`
       );
       const result = await response.json();
       setAlternatives(result.data);
       setLoading(false);
     }
 
     fetchAlternatives();
   }, [productId, requestedSize, regionCode]);
 
   if (loading) return <div>Loading alternatives...</div>;
   if (!alternatives?.isAvailable && alternatives?.alternatives.length === 0) {
     return <div>No alternatives available</div>;
   }
 
   return (
     <div className="size-alternatives">
       <h3>Size {requestedSize} is out of stock</h3>
       <p>Try these sister sizes with the same cup volume:</p>
       
       {alternatives.alternatives.map((alt) => (
         <div key={alt.universalCode} className="alternative-option">
           <h4>{alt.size}</h4>
           <p>{alt.recommendation}</p>
           <p>Stock: {alt.stock} available</p>
           <button onClick={() => selectSize(alt.size)}>
             Select {alt.size}
           </button>
         </div>
       ))}
     </div>
   );
 }
 ```
 
 ## Cup Size Conversion
 
 ### Convert Cup Between Regions
 
 Convert cup sizes between different regional standards.
 
 ```http
 POST /api/sizes/cup/convert
 Content-Type: application/json
 ```
 
 **Request Body:**
 
 ```json
 {
   "fromRegion": "US",
   "toRegion": "EU",
   "cupLetter": "DD"
 }
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "fromRegion": "US",
     "fromCupLetter": "DD",
     "toRegion": "EU",
     "toCupLetter": "E",
     "cupVolume": 6,
     "note": "US DD equals EU E (not DD)"
   }
 }
 ```
 
 ### Get Cup Conversion Matrix
 
 Get all regional cup conversions for a specific cup volume.
 
 ```http
 GET /api/sizes/cup/matrix/:cupVolume
 ```
 
 **Example Request:**
 
 ```bash
 curl http://localhost:5000/api/sizes/cup/matrix/6
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "cupVolume": 6,
     "conversions": {
       "US": "DD",
       "UK": "DD",
       "EU": "E",
       "FR": "E",
       "AU": "DD",
       "JP": "E"
     },
     "note": "Different regions use different letter progressions"
   }
 }
 ```
 
 ### JavaScript Example: Regional Converter
 
 ```javascript
 async function convertCupSize(fromRegion, toRegion, cupLetter) {
   const response = await fetch('http://localhost:5000/api/sizes/cup/convert', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ fromRegion, toRegion, cupLetter })
   });
   
   const result = await response.json();
   return result.data;
 }
 
 // Usage
 const conversion = await convertCupSize('US', 'EU', 'DD');
 console.log(`US ${conversion.fromCupLetter} = EU ${conversion.toCupLetter}`);
 // Output: "US DD = EU E"
 ```
 
 ## Brand Fit Adjustments
 
 ### Get Brand Fit Recommendation
 
 Get size recommendations accounting for brand-specific fit characteristics.
 
 ```http
 POST /api/brands/fit/adjust
 Content-Type: application/json
 ```
 
 **Request Body:**
 
 ```json
 {
   "brandId": "brand_ap",
   "userNormalSize": "34C",
   "regionCode": "US"
 }
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "brand": {
       "id": "brand_ap",
       "name": "Agent Provocateur"
     },
     "userNormalSize": "34C",
     "recommendedSize": "36D",
     "adjustments": [
       {
         "type": "BAND",
         "direction": "UP",
         "amount": 1,
         "reason": "This brand runs small in the band"
       },
       {
         "type": "CUP",
         "direction": "UP",
         "amount": 1,
         "reason": "This brand runs small in the cup"
       }
     ],
     "confidence": 0.89,
     "basedOnReviews": 127
   }
 }
 ```
 
 ### React Component Example
 
 ```tsx
 function BrandFitNotice({ brandId, userNormalSize, regionCode }) {
   const [fitData, setFitData] = useState(null);
 
   useEffect(() => {
     async function fetchFitData() {
       const response = await fetch('/api/brands/fit/adjust', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ brandId, userNormalSize, regionCode })
       });
       const result = await response.json();
       setFitData(result.data);
     }
 
     fetchFitData();
   }, [brandId, userNormalSize, regionCode]);
 
   if (!fitData) return null;
 
   return (
     <div className="brand-fit-notice">
       <h3>Brand Fit Notice</h3>
       <p>Normally wear {fitData.userNormalSize}?</p>
       <p className="recommendation">
         We recommend: <strong>{fitData.recommendedSize}</strong>
       </p>
       <ul>
         {fitData.adjustments.map((adj, idx) => (
           <li key={idx}>{adj.reason}</li>
         ))}
       </ul>
       <p className="confidence">
         Based on {fitData.basedOnReviews} customer reviews 
         ({Math.round(fitData.confidence * 100)}% confidence)
       </p>
     </div>
   );
 }
 ```
 
 ## Complete Integration Example
 
 ### Product Page with Size System
 
 ```tsx
 import { useState, useEffect } from 'react';
 
 function ProductPage({ productId }) {
   const [selectedSize, setSelectedSize] = useState(null);
   const [sizeInfo, setSizeInfo] = useState(null);
   const [regionCode, setRegionCode] = useState('US');
 
   // Handle size selection
   async function handleSizeSelect(size) {
     setSelectedSize(size);
 
     // Check if size is available and get alternatives
     const response = await fetch(
       `/api/products/${productId}/sizes/alternatives?` +
       `requestedSize=${size}&regionCode=${regionCode}`
     );
     const result = await response.json();
     setSizeInfo(result.data);
   }
 
   return (
     <div className="product-page">
       {/* Region selector */}
       <select value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
         <option value="US">United States</option>
         <option value="UK">United Kingdom</option>
         <option value="EU">Europe</option>
       </select>
 
       {/* Size selector */}
       <div className="size-selector">
         <button onClick={() => handleSizeSelect('32C')}>32C</button>
         <button onClick={() => handleSizeSelect('34C')}>34C</button>
         <button onClick={() => handleSizeSelect('36C')}>36C</button>
       </div>
 
       {/* Show alternatives if size is out of stock */}
       {sizeInfo && !sizeInfo.isAvailable && (
         <div className="size-alternatives">
           <p>Size {selectedSize} is out of stock</p>
           <p>Try these sister sizes:</p>
           {sizeInfo.alternatives.map((alt) => (
             <div key={alt.universalCode}>
               <strong>{alt.size}</strong> - {alt.recommendation}
               <br />
               Stock: {alt.stock}
               <button onClick={() => handleSizeSelect(alt.size)}>
                 Select
               </button>
             </div>
           ))}
         </div>
       )}
 
       {/* Add to cart */}
       <button 
         disabled={!sizeInfo?.isAvailable}
         onClick={() => addToCart(productId, selectedSize)}
       >
         Add to Cart
       </button>
     </div>
   );
 }
 ```
 
 ## Understanding the System
 
 ### What is Sister Sizing?
 
 Sister sizing refers to bra sizes that have the same cup volume but different band sizes:
 
 - **34C** has the same cup volume as **32D** (tighter band) and **36B** (looser band)
 - The cup volume stays constant while the band size changes
 
 ### Cup Volume Calculation
 
 Cup volume is calculated as:
 ```
 Cup Volume = (Cup Letter Position) + (Band Size Increment)
 ```
 
 For US sizing:
 - 32D = Cup D (4) + Band 32
 - 34C = Cup C (3) + Band 34
 - 36B = Cup B (2) + Band 36
 
 All equal cup volume 6.
 
 ### Regional Cup Progressions
 
 Different regions use different cup letter progressions:
 
 | Volume | US/UK/AU | EU/FR/JP |
 |--------|----------|----------|
 | 4 | B | B |
 | 5 | C | C |
 | 6 | D | D |
 | 7 | DD | E |
 | 8 | DDD/E | F |
 | 9 | F | G |
 
 **Important:** US DD ≠ EU DD. Always use the conversion API!
 
 ## Testing
 
 ### Unit Tests
 
 ```javascript
 describe('Sister Sizing', () => {
   it('should find sister sizes with same cup volume', async () => {
     const response = await request(app)
       .get('/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6');
 
     expect(response.body.data.sisterSizes).toHaveLength(2);
     expect(response.body.data.sisterSizes[0].displaySize).toBe('32D');
     expect(response.body.data.sisterSizes[1].displaySize).toBe('36B');
   });
 
   it('should convert US DD to EU E', async () => {
     const response = await request(app)
       .post('/api/sizes/cup/convert')
       .send({ fromRegion: 'US', toRegion: 'EU', cupLetter: 'DD' });
 
     expect(response.body.data.toCupLetter).toBe('E');
   });
 });
 ```
 
 ## Error Handling
 
 ### Invalid Size Code
 
 ```json
 {
   "success": false,
   "error": "Invalid universal size code format"
 }
 ```
 
 ### Size Not Found
 
 ```json
 {
   "success": false,
   "error": "Size not found: 34C"
 }
 ```
 
 ### No Alternatives Available
 
 ```json
 {
   "success": true,
   "data": {
     "requestedSize": "34C",
     "isAvailable": false,
     "alternatives": []
   }
 }
 ```
