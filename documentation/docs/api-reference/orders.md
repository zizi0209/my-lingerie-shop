 ---
 sidebar_position: 3
 ---
 
 # Orders API
 
 Complete API reference for order management.
 
 ## Endpoints Overview
 
 | Method | Endpoint | Auth | Description |
 |--------|----------|------|-------------|
 | POST | `/api/orders` | No | Create new order |
 | GET | `/api/orders` | Yes | Get all orders |
 | GET | `/api/orders/:id` | Yes | Get order by ID |
 | PUT | `/api/orders/:id` | Yes | Update order |
 | PUT | `/api/orders/:id/cancel` | Yes | Cancel order |
 
 ## Create Order
 
 Create a new order. This endpoint is public and doesn't require authentication.
 
 ```http
 POST /api/orders
 Content-Type: application/json
 ```
 
 ### Request Body
 
 #### For Logged-in Users
 
 ```json
 {
   "userId": 1,
   "orderNumber": "ORD-2024-0001",
   "shippingAddress": "123 Main Street, District 1",
   "shippingCity": "Ho Chi Minh City",
   "shippingPhone": "0123456789",
   "shippingMethod": "Standard",
   "paymentMethod": "COD",
   "totalAmount": 500000,
   "shippingFee": 30000,
   "discount": 0,
   "notes": "Please deliver during business hours",
   "items": [
     {
       "productId": 1,
       "quantity": 2,
       "price": 200000,
       "variant": "Size M - White"
     },
     {
       "productId": 2,
       "quantity": 1,
       "price": 150000,
       "variant": "Size L - Black"
     }
   ]
 }
 ```
 
 #### For Guest Users
 
 ```json
 {
   "guestInfo": {
     "name": "John Doe",
     "email": "guest@example.com",
     "phone": "0987654321"
   },
   "shippingAddress": "456 Second Street, District 2",
   "shippingCity": "Ho Chi Minh City",
   "shippingPhone": "0987654321",
   "totalAmount": 300000,
   "items": [
     {
       "productId": 1,
       "quantity": 1,
       "price": 300000,
       "variant": "Size S - Red"
     }
   ]
 }
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 1,
     "orderNumber": "ORD-2024-0001",
     "userId": 1,
     "shippingAddress": "123 Main Street, District 1",
     "shippingCity": "Ho Chi Minh City",
     "shippingPhone": "0123456789",
     "totalAmount": 500000,
     "shippingFee": 30000,
     "status": "PENDING",
     "items": [
       {
         "id": 1,
         "productId": 1,
         "quantity": 2,
         "price": 200000,
         "variant": "Size M - White",
         "product": {
           "id": 1,
           "name": "Lace Bra",
           "slug": "lace-bra"
         }
       }
     ],
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z"
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function createOrder(orderData) {
   try {
     const response = await fetch('http://localhost:5000/api/orders', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify(orderData)
     });
 
     if (!response.ok) {
       throw new Error('Failed to create order');
     }
 
     const result = await response.json();
     console.log('Order created:', result.data);
     return result.data;
   } catch (error) {
     console.error('Error creating order:', error);
     throw error;
   }
 }
 
 // Usage
 const order = await createOrder({
   userId: 1,
   shippingAddress: "123 Main Street",
   shippingPhone: "0123456789",
   totalAmount: 500000,
   items: [
     { productId: 1, quantity: 2, price: 200000 }
   ]
 });
 ```
 
 ### cURL Example
 
 ```bash
 curl -X POST http://localhost:5000/api/orders \
   -H "Content-Type: application/json" \
   -d '{
     "userId": 1,
     "shippingAddress": "123 Main Street",
     "shippingPhone": "0123456789",
     "totalAmount": 500000,
     "items": [
       {
         "productId": 1,
         "quantity": 2,
         "price": 200000
       }
     ]
   }'
 ```
 
 ## Get All Orders
 
 Retrieve a paginated list of orders. Requires authentication.
 
 ```http
 GET /api/orders?page=1&limit=20&status=PENDING&userId=1
 Authorization: Bearer <token>
 ```
 
 ### Query Parameters
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `page` | number | 1 | Page number |
 | `limit` | number | 20 | Items per page |
 | `status` | string | - | Filter by status |
 | `userId` | number | - | Filter by user ID |
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": [
     {
       "id": 1,
       "orderNumber": "ORD-2024-0001",
       "status": "PENDING",
       "totalAmount": 500000,
       "user": {
         "id": 1,
         "name": "Admin User",
         "email": "admin@example.com"
       },
       "items": [
         {
           "id": 1,
           "quantity": 2,
           "price": 200000,
           "product": {
             "id": 1,
             "name": "Lace Bra"
           }
         }
       ],
       "createdAt": "2024-01-01T00:00:00Z"
     }
   ],
   "pagination": {
     "page": 1,
     "limit": 20,
     "total": 50,
     "pages": 3
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function getOrders(filters = {}) {
   const params = new URLSearchParams(filters);
   
   const response = await fetch(`http://localhost:5000/api/orders?${params}`, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
 
   const result = await response.json();
   return result.data;
 }
 
 // Usage
 const orders = await getOrders({ 
   page: 1, 
   limit: 20, 
   status: 'PENDING' 
 });
 ```
 
 ## Get Order by ID
 
 Retrieve detailed information about a specific order.
 
 ```http
 GET /api/orders/:id
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 1,
     "orderNumber": "ORD-2024-0001",
     "userId": 1,
     "shippingAddress": "123 Main Street, District 1",
     "shippingCity": "Ho Chi Minh City",
     "shippingPhone": "0123456789",
     "shippingMethod": "Standard",
     "trackingNumber": null,
     "paymentMethod": "COD",
     "paymentStatus": "PENDING",
     "totalAmount": 500000,
     "shippingFee": 30000,
     "discount": 0,
     "notes": "Please deliver during business hours",
     "status": "PENDING",
     "user": {
       "id": 1,
       "name": "Admin User",
       "email": "admin@example.com",
       "phone": "0123456789"
     },
     "items": [
       {
         "id": 1,
         "productId": 1,
         "quantity": 2,
         "price": 200000,
         "variant": "Size M - White",
         "product": {
           "id": 1,
           "name": "Lace Bra",
           "slug": "lace-bra",
           "price": 250000
         }
       }
     ],
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z",
     "cancelledAt": null
   }
 }
 ```
 
 ## Update Order
 
 Update order information. Requires authentication.
 
 ```http
 PUT /api/orders/:id
 Authorization: Bearer <token>
 Content-Type: application/json
 ```
 
 ### Request Body
 
 ```json
 {
   "status": "SHIPPING",
   "trackingNumber": "TRACK-123456",
   "paymentStatus": "PAID",
   "paidAt": "2024-01-02T00:00:00Z",
   "shippingMethod": "Express",
   "notes": "Updated delivery notes"
 }
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 1,
     "orderNumber": "ORD-2024-0001",
     "status": "SHIPPING",
     "trackingNumber": "TRACK-123456",
     "paymentStatus": "PAID",
     "updatedAt": "2024-01-02T00:00:00Z"
   }
 }
 ```
 
 ## Cancel Order
 
 Cancel an order. Cannot cancel orders that are already completed or in shipping.
 
 ```http
 PUT /api/orders/:id/cancel
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "message": "Order cancelled successfully",
   "data": {
     "id": 1,
     "orderNumber": "ORD-2024-0001",
     "status": "CANCELLED",
     "cancelledAt": "2024-01-02T00:00:00Z"
   }
 }
 ```
 
 ## Order Status Flow
 
 ```
 PENDING → CONFIRMED → SHIPPING → COMPLETED
    ↓
 CANCELLED
 ```
 
 ### Order Statuses
 
 - **PENDING**: Waiting for confirmation
 - **CONFIRMED**: Order confirmed
 - **SHIPPING**: Order is being delivered
 - **COMPLETED**: Order delivered successfully
 - **CANCELLED**: Order cancelled
 
 ### Payment Statuses
 
 - **PENDING**: Waiting for payment
 - **PAID**: Payment received
 - **REFUNDED**: Payment refunded
 
 ## Error Responses
 
 ### 400 Bad Request
 
 ```json
 {
   "success": false,
   "error": "Missing required fields: shippingAddress, shippingPhone"
 }
 ```
 
 ### 404 Not Found
 
 ```json
 {
   "success": false,
   "error": "Product with ID 999 not found"
 }
 ```
 
 ### 401 Unauthorized
 
 ```json
 {
   "success": false,
   "error": "Authentication required"
 }
 ```
 
 ## Complete Example: Order Checkout Flow
 
 ```javascript
 // 1. Create order
 const order = await fetch('http://localhost:5000/api/orders', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
     userId: 1,
     shippingAddress: "123 Main Street",
     shippingPhone: "0123456789",
     totalAmount: 500000,
     items: [
       { productId: 1, quantity: 2, price: 200000 }
     ]
   })
 });
 
 const { data: orderData } = await order.json();
 console.log('Order created:', orderData.orderNumber);
 
 // 2. Later: Admin updates order status
 const update = await fetch(`http://localhost:5000/api/orders/${orderData.id}`, {
   method: 'PUT',
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${adminToken}`
   },
   body: JSON.stringify({
     status: 'CONFIRMED',
     trackingNumber: 'TRACK-123456'
   })
 });
 
 // 3. Track order
 const tracking = await fetch(`http://localhost:5000/api/orders/${orderData.id}`, {
   headers: {
     'Authorization': `Bearer ${token}`
   }
 });
 
 const { data: orderDetails } = await tracking.json();
 console.log('Order status:', orderDetails.status);
 console.log('Tracking number:', orderDetails.trackingNumber);
 ```
