 ---
 sidebar_position: 2
 ---
 
 # Products API
 
 Complete API reference for product management.
 
 ## Endpoints Overview
 
 | Method | Endpoint | Auth | Description |
 |--------|----------|------|-------------|
 | GET | `/api/products` | No | Get all products |
 | GET | `/api/products/:id` | No | Get product by ID |
 | POST | `/api/products` | Yes | Create product |
 | PUT | `/api/products/:id` | Yes | Update product |
 | DELETE | `/api/products/:id` | Yes | Delete product |
 
 ## Get All Products
 
 Retrieve a paginated list of products with optional filtering.
 
 ```http
 GET /api/products?page=1&limit=20&category=lingerie&search=lace
 ```
 
 ### Query Parameters
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `page` | number | 1 | Page number |
 | `limit` | number | 20 | Items per page |
 | `category` | string | - | Filter by category slug |
 | `search` | string | - | Search by name/description |
 | `minPrice` | number | - | Minimum price filter |
 | `maxPrice` | number | - | Maximum price filter |
 | `featured` | boolean | - | Filter featured products |
 | `inStock` | boolean | - | Filter in-stock products |
 | `sortBy` | string | createdAt | Sort field |
 | `sortOrder` | string | desc | Sort order (asc/desc) |
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": [
     {
       "id": 1,
       "name": "Luxury Lace Bra",
       "slug": "luxury-lace-bra",
       "description": "Beautiful lace bra with perfect fit",
       "price": 59.99,
       "salePrice": 49.99,
       "stock": 50,
       "featured": true,
       "images": [
         {
           "id": 1,
           "url": "https://res.cloudinary.com/.../image.jpg",
           "altText": "Lace Bra Front View",
           "isPrimary": true
         }
       ],
       "category": {
         "id": 1,
         "name": "Bras",
         "slug": "bras"
       },
       "variants": [
         {
           "id": 1,
           "name": "Size",
           "value": "34C",
           "stock": 10
         }
       ],
       "createdAt": "2024-01-01T00:00:00Z",
       "updatedAt": "2024-01-01T00:00:00Z"
     }
   ],
   "pagination": {
     "page": 1,
     "limit": 20,
     "total": 100,
     "pages": 5
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function getProducts(filters = {}) {
   const params = new URLSearchParams({
     page: filters.page || 1,
     limit: filters.limit || 20,
     ...filters
   });
 
   const response = await fetch(
     `http://localhost:5000/api/products?${params}`
   );
   const result = await response.json();
   return result.data;
 }
 
 // Usage examples
 const allProducts = await getProducts();
 const braProducts = await getProducts({ category: 'bras' });
 const searchResults = await getProducts({ search: 'lace', page: 1 });
 const affordableProducts = await getProducts({ 
   maxPrice: 50, 
   inStock: true 
 });
 ```
 
 ### React Hook Example
 
 ```tsx
 import { useState, useEffect } from 'react';
 
 function useProducts(filters = {}) {
   const [products, setProducts] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
 
   useEffect(() => {
     async function fetchProducts() {
       try {
         setLoading(true);
         const params = new URLSearchParams(filters);
         const response = await fetch(`/api/products?${params}`);
         const result = await response.json();
         
         if (result.success) {
           setProducts(result.data);
         } else {
           setError(result.error);
         }
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
     }
 
     fetchProducts();
   }, [JSON.stringify(filters)]);
 
   return { products, loading, error };
 }
 
 // Usage in component
 function ProductList() {
   const { products, loading, error } = useProducts({ 
     category: 'bras',
     featured: true 
   });
 
   if (loading) return <div>Loading...</div>;
   if (error) return <div>Error: {error}</div>;
 
   return (
     <div>
       {products.map(product => (
         <ProductCard key={product.id} product={product} />
       ))}
     </div>
   );
 }
 ```
 
 ## Get Product by ID
 
 Retrieve detailed information about a specific product.
 
 ```http
 GET /api/products/:id
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 1,
     "name": "Luxury Lace Bra",
     "slug": "luxury-lace-bra",
     "description": "Beautiful lace bra with perfect fit",
     "longDescription": "Detailed product description with HTML...",
     "price": 59.99,
     "salePrice": 49.99,
     "stock": 50,
     "sku": "BRA-001",
     "featured": true,
     "images": [...],
     "category": {...},
     "variants": [...],
     "specifications": {
       "material": "Lace, Cotton",
       "care": "Hand wash only",
       "origin": "Made in Italy"
     },
     "tags": ["luxury", "lace", "comfortable"],
     "relatedProducts": [
       {
         "id": 2,
         "name": "Matching Panty",
         "price": 29.99,
         "image": "..."
       }
     ],
     "reviews": {
       "averageRating": 4.5,
       "totalReviews": 127,
       "summary": {...}
     },
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z"
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function getProduct(id) {
   const response = await fetch(`http://localhost:5000/api/products/${id}`);
   const result = await response.json();
   
   if (!result.success) {
     throw new Error(result.error);
   }
   
   return result.data;
 }
 
 // Usage
 const product = await getProduct(1);
 console.log(product.name); // "Luxury Lace Bra"
 console.log(product.price); // 59.99
 ```
 
 ## Create Product
 
 Create a new product. Requires authentication with admin privileges.
 
 ```http
 POST /api/products
 Authorization: Bearer <token>
 Content-Type: application/json
 ```
 
 ### Request Body
 
 ```json
 {
   "name": "New Luxury Bra",
   "slug": "new-luxury-bra",
   "description": "Short description",
   "longDescription": "<p>Detailed HTML description</p>",
   "price": 79.99,
   "salePrice": 69.99,
   "stock": 100,
   "sku": "BRA-002",
   "categoryId": 1,
   "featured": true,
   "images": [
     {
       "url": "https://res.cloudinary.com/.../image.jpg",
       "altText": "Product image",
       "isPrimary": true
     }
   ],
   "variants": [
     {
       "name": "Size",
       "value": "32B",
       "stock": 20
     },
     {
       "name": "Size",
       "value": "34C",
       "stock": 30
     }
   ],
   "specifications": {
     "material": "Lace",
     "care": "Hand wash"
   },
   "tags": ["luxury", "new-arrival"]
 }
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 2,
     "name": "New Luxury Bra",
     "slug": "new-luxury-bra",
     ...
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function createProduct(productData, token) {
   const response = await fetch('http://localhost:5000/api/products', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify(productData)
   });
 
   const result = await response.json();
   
   if (!result.success) {
     throw new Error(result.error);
   }
   
   return result.data;
 }
 
 // Usage
 const newProduct = await createProduct({
   name: "Satin Nightgown",
   price: 89.99,
   categoryId: 3,
   stock: 50
 }, authToken);
 ```
 
 ## Update Product
 
 Update an existing product. Requires authentication.
 
 ```http
 PUT /api/products/:id
 Authorization: Bearer <token>
 Content-Type: application/json
 ```
 
 ### Request Body
 
 All fields are optional. Only include fields you want to update:
 
 ```json
 {
   "name": "Updated Product Name",
   "price": 89.99,
   "salePrice": 79.99,
   "stock": 75,
   "featured": false
 }
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "data": {
     "id": 1,
     "name": "Updated Product Name",
     "price": 89.99,
     ...
   }
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function updateProduct(id, updates, token) {
   const response = await fetch(`http://localhost:5000/api/products/${id}`, {
     method: 'PUT',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify(updates)
   });
 
   const result = await response.json();
   return result.data;
 }
 
 // Usage
 const updated = await updateProduct(1, {
   price: 99.99,
   stock: 150
 }, authToken);
 ```
 
 ## Delete Product
 
 Delete a product. Requires authentication with admin privileges.
 
 ```http
 DELETE /api/products/:id
 Authorization: Bearer <token>
 ```
 
 ### Response
 
 ```json
 {
   "success": true,
   "message": "Product deleted successfully"
 }
 ```
 
 ### JavaScript Example
 
 ```javascript
 async function deleteProduct(id, token) {
   const response = await fetch(`http://localhost:5000/api/products/${id}`, {
     method: 'DELETE',
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
 
   const result = await response.json();
   
   if (!result.success) {
     throw new Error(result.error);
   }
   
   return result;
 }
 
 // Usage
 await deleteProduct(1, authToken);
 console.log('Product deleted');
 ```
 
 ## Product Images
 
 ### Upload Product Image
 
 ```http
 POST /api/media/upload
 Authorization: Bearer <token>
 Content-Type: multipart/form-data
 ```
 
 ```javascript
 async function uploadProductImage(file, token) {
   const formData = new FormData();
   formData.append('file', file);
   formData.append('type', 'product');
 
   const response = await fetch('http://localhost:5000/api/media/upload', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`
     },
     body: formData
   });
 
   const result = await response.json();
   return result.data.url; // Cloudinary URL
 }
 
 // Usage
 const imageUrl = await uploadProductImage(fileInput.files[0], token);
 ```
 
 ## Complete Example: Product CRUD
 
 ```javascript
 class ProductService {
   constructor(apiUrl, token) {
     this.apiUrl = apiUrl;
     this.token = token;
   }
 
   async getAll(filters = {}) {
     const params = new URLSearchParams(filters);
     const response = await fetch(`${this.apiUrl}/products?${params}`);
     const result = await response.json();
     return result.data;
   }
 
   async getById(id) {
     const response = await fetch(`${this.apiUrl}/products/${id}`);
     const result = await response.json();
     return result.data;
   }
 
   async create(productData) {
     const response = await fetch(`${this.apiUrl}/products`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.token}`
       },
       body: JSON.stringify(productData)
     });
     const result = await response.json();
     return result.data;
   }
 
   async update(id, updates) {
     const response = await fetch(`${this.apiUrl}/products/${id}`, {
       method: 'PUT',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${this.token}`
       },
       body: JSON.stringify(updates)
     });
     const result = await response.json();
     return result.data;
   }
 
   async delete(id) {
     const response = await fetch(`${this.apiUrl}/products/${id}`, {
       method: 'DELETE',
       headers: {
         'Authorization': `Bearer ${this.token}`
       }
     });
     return await response.json();
   }
 }
 
 // Usage
 const productService = new ProductService('http://localhost:5000/api', token);
 
 // Get all products
 const products = await productService.getAll({ category: 'bras' });
 
 // Get single product
 const product = await productService.getById(1);
 
 // Create product
 const newProduct = await productService.create({
   name: "New Bra",
   price: 59.99,
   categoryId: 1
 });
 
 // Update product
 const updated = await productService.update(1, { price: 69.99 });
 
 // Delete product
 await productService.delete(1);
 ```
 
 ## Error Responses
 
 ### 400 Bad Request
 
 ```json
 {
   "success": false,
   "error": "Validation error: name is required"
 }
 ```
 
 ### 404 Not Found
 
 ```json
 {
   "success": false,
   "error": "Product not found"
 }
 ```
 
 ### 401 Unauthorized
 
 ```json
 {
   "success": false,
   "error": "Authentication required"
 }
 ```
 
 ### 403 Forbidden
 
 ```json
 {
   "success": false,
   "error": "Insufficient permissions"
 }
 ```
