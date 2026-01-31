 ---
 sidebar_position: 1
 ---
 
 # API Reference
 
 My Lingerie Shop API là RESTful API được xây dựng với Express.js và TypeScript.
 
 ## Base URL
 
 ```
 Production: https://my-lingerie-shop-production.up.railway.app
 Development: http://localhost:3001
 ```
 
 ## Authentication
 
 API sử dụng **Session-based Authentication** với cookie.
 
 ### Login
 
 ```http
 POST /api/auth/login
 Content-Type: application/json
 
 {
   "email": "admin@example.com",
   "password": "admin123"
 }
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "user": {
     "id": "uuid",
     "email": "admin@example.com",
     "role": "ADMIN"
   }
 }
 ```
 
 ### Session Cookie
 
 Sau khi login, server sẽ set cookie `connect.sid` cho client. Cookie này sẽ được tự động gửi kèm mọi request tiếp theo.
 
 ## Rate Limiting
 
 API có giới hạn request để tránh abuse:
 
 - **General**: 100 requests / 15 phút
 - **Auth**: 5 requests / 15 phút
 
 ## Response Format
 
 ### Success Response
 
 ```json
 {
   "success": true,
   "data": { ... }
 }
 ```
 
 ### Error Response
 
 ```json
 {
   "success": false,
   "error": "Error message",
   "code": "ERROR_CODE"
 }
 ```
 
 ## HTTP Status Codes
 
 | Code | Meaning |
 |------|---------|
 | 200 | Success |
 | 201 | Created |
 | 400 | Bad Request |
 | 401 | Unauthorized |
 | 403 | Forbidden |
 | 404 | Not Found |
 | 429 | Too Many Requests |
 | 500 | Internal Server Error |
 
 ## Endpoints
 
 ### Products
 - [GET /api/products](./endpoints/products#list-products)
 - [POST /api/products](./endpoints/products#create-product)
 - [GET /api/products/:id](./endpoints/products#get-product)
 - [PUT /api/products/:id](./endpoints/products#update-product)
 - [DELETE /api/products/:id](./endpoints/products#delete-product)
 
 ### Orders
 - [GET /api/orders](./endpoints/orders#list-orders)
 - [POST /api/orders](./endpoints/orders#create-order)
 - [GET /api/orders/:id](./endpoints/orders#get-order)
 
 ### Size System
 - [POST /api/size-system/recommend](./endpoints/size-system#get-recommendations)
 - [GET /api/size-system/sister-sizes](./endpoints/size-system#get-sister-sizes)
 
 ## Examples
 
 Xem thêm ví dụ chi tiết tại [Postman Collection](https://github.com/zizi0209/my-lingerie-shop/blob/master/Lingerie_Shop_API.postman_collection.json)
