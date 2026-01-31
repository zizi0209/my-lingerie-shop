 ---
 sidebar_position: 1
 ---
 
 # API Reference
 
 Welcome to the Lingerie Shop API Reference documentation. This section provides detailed information about all available API endpoints.
 
 ## Base URL
 
 ```
 Development: http://localhost:5000/api
 Production: https://your-domain.com/api
 ```
 
 ## Authentication
 
 Most API endpoints require authentication using JWT (JSON Web Tokens). Include the token in the Authorization header:
 
 ```http
 Authorization: Bearer <your-jwt-token>
 ```
 
 ### Getting a Token
 
 ```javascript
 // Login request
 const response = await fetch('http://localhost:5000/api/users/login', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
     email: 'user@example.com',
     password: 'password123'
   })
 });
 
 const { token } = await response.json();
 ```
 
 ## Response Format
 
 All API responses follow a consistent format:
 
 ### Success Response
 
 ```json
 {
   "success": true,
   "data": {
     // Response data
   }
 }
 ```
 
 ### Error Response
 
 ```json
 {
   "success": false,
   "error": "Error message here"
 }
 ```
 
 ## HTTP Status Codes
 
 | Status Code | Description |
 |-------------|-------------|
 | 200 | OK - Request successful |
 | 201 | Created - Resource created |
 | 400 | Bad Request - Invalid input |
 | 401 | Unauthorized - Missing/invalid token |
 | 403 | Forbidden - Insufficient permissions |
 | 404 | Not Found - Resource not found |
 | 500 | Internal Server Error |
 
 ## Rate Limiting
 
 API requests are rate-limited to prevent abuse:
 - **Public endpoints**: 100 requests per 15 minutes
 - **Authenticated endpoints**: 500 requests per 15 minutes
 
 Rate limit headers are included in responses:
 
 ```http
 X-RateLimit-Limit: 100
 X-RateLimit-Remaining: 95
 X-RateLimit-Reset: 1640000000
 ```
 
 ## Pagination
 
 List endpoints support pagination using query parameters:
 
 ```
 GET /api/products?page=1&limit=20
 ```
 
 Response includes pagination metadata:
 
 ```json
 {
   "success": true,
   "data": [...],
   "pagination": {
     "page": 1,
     "limit": 20,
     "total": 100,
     "pages": 5
   }
 }
 ```
 
 ## Next Steps
 
 - [Products API](./products) - Product management endpoints
 - [Orders API](./orders) - Order processing endpoints
 - [Size System API](./size-system) - Advanced size system features
 - [Dashboard API](./dashboard) - Analytics and reporting
