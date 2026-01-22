# Hướng Dẫn Sử Dụng API Service Cho Dashboard

## Tổng Quan

Dashboard đã được setup để làm việc với API Backend thông qua JWT Authentication. Tất cả các API calls được xử lý qua service layer với automatic token management.

## Cấu Trúc Files

```
frontend/src/
├── lib/
│   └── api.ts              # API Service với JWT authentication
└── hooks/
    └── useApi.ts           # React Hooks cho API calls
```

## Setup Môi Trường

Tạo file `.env.local` trong thư mục `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Sử Dụng API Service

### 1. Authentication

```typescript
import { useAuth } from '@/hooks/useApi';

function LoginForm() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password123');
    
    if (result) {
      // Login thành công, token được lưu tự động
      console.log('User:', result.user);
    }
  };

  return (
    <button onClick={handleLogin} disabled={loading}>
      {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
    </button>
  );
}
```

### 2. Fetch Data với Custom Hook

```typescript
import { useProducts } from '@/hooks/useApi';
import { useEffect } from 'react';

function ProductList() {
  const { data, loading, error, getProducts } = useProducts();

  useEffect(() => {
    getProducts();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### 3. Create/Update/Delete Operations

```typescript
import { useProducts } from '@/hooks/useApi';

function ProductManager() {
  const { createProduct, updateProduct, deleteProduct } = useProducts();

  const handleCreate = async () => {
    await createProduct({
      name: 'New Product',
      price: 29.99,
      categoryId: 1
    });
  };

  const handleUpdate = async (id: number) => {
    await updateProduct(id, {
      name: 'Updated Name'
    });
  };

  const handleDelete = async (id: number) => {
    await deleteProduct(id);
  };

  return (
    <>
      <button onClick={handleCreate}>Create</button>
      <button onClick={() => handleUpdate(1)}>Update</button>
      <button onClick={() => handleDelete(1)}>Delete</button>
    </>
  );
}
```

### 4. Upload Files

```typescript
import { api } from '@/lib/api';

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'product');

  try {
    const result = await api.uploadFile('/media/upload', formData);
    console.log('Uploaded:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### 5. Sử Dụng API Trực Tiếp

```typescript
import { api } from '@/lib/api';

// GET request
const data = await api.get('/categories');

// POST request
const newItem = await api.post('/categories', { name: 'New Category' });

// PUT request
const updated = await api.put('/categories/1', { name: 'Updated' });

// DELETE request
await api.delete('/categories/1');

// Public endpoint (không cần token)
const publicData = await api.get('/public/data', false);
```

## Available Hooks

### useAuth()
- `login(email, password)` - Đăng nhập
- `register(email, password, name?)` - Đăng ký
- `logout()` - Đăng xuất
- `isAuthenticated` - Kiểm tra đã đăng nhập chưa

### useCategories()
- `getCategories()` - Lấy tất cả categories
- `getCategoryById(id)` - Lấy category theo ID
- `createCategory(data)` - Tạo category mới
- `updateCategory(id, data)` - Cập nhật category
- `deleteCategory(id)` - Xóa category

### useProducts()
- `getProducts()` - Lấy tất cả products
- `getProductById(id)` - Lấy product theo ID
- `createProduct(data)` - Tạo product mới
- `updateProduct(id, data)` - Cập nhật product
- `deleteProduct(id)` - Xóa product

### usePosts()
- `getPosts()` - Lấy tất cả posts
- `getPostById(id)` - Lấy post theo ID
- `createPost(data)` - Tạo post mới
- `updatePost(id, data)` - Cập nhật post
- `deletePost(id)` - Xóa post

### useOrders()
- `getOrders()` - Lấy tất cả orders
- `getOrderById(id)` - Lấy order theo ID
- `updateOrderStatus(id, status)` - Cập nhật trạng thái order

### useUsers()
- `getUsers()` - Lấy tất cả users
- `getUserById(id)` - Lấy user theo ID
- `updateUser(id, data)` - Cập nhật user
- `deleteUser(id)` - Xóa user

## Error Handling

```typescript
import { useProducts } from '@/hooks/useApi';

function ProductList() {
  const { data, error, getProducts } = useProducts();

  useEffect(() => {
    getProducts();
  }, []);

  // Xử lý lỗi authentication
  if (error?.message.includes('Phiên đăng nhập')) {
    // Redirect to login
    router.push('/login');
  }

  // Xử lý lỗi khác
  if (error) {
    return <div className="text-red-500">{error.message}</div>;
  }

  return <div>{/* ... */}</div>;
}
```

## Token Management

Token được quản lý tự động:
- Lưu vào `localStorage` khi login/register thành công
- Tự động gửi trong header `Authorization: Bearer <token>`
- Tự động xóa khi gặp lỗi 401/403
- Có thể check bằng `api.isAuthenticated()`

## Dark Mode Support

Tất cả các trang dashboard đã được update để hỗ trợ dark mode:

✅ **Marketing Pages:**
- Posts (Bài viết)
- Post Categories (Danh mục bài viết)
- Home Component (Layout trang chủ)

✅ **System Pages:**
- Users (Quản lý nhân viên)
- Roles (Vai trò & quyền hạn)

✅ **Other Pages:**
- Customers (Khách hàng)
- Settings (Cài đặt)

Dark mode tự động chuyển đổi dựa vào theme context.

## Best Practices

1. **Luôn handle loading state:**
   ```typescript
   if (loading) return <LoadingSpinner />;
   ```

2. **Luôn handle error state:**
   ```typescript
   if (error) return <ErrorMessage error={error} />;
   ```

3. **Sử dụng useEffect cho initial data fetch:**
   ```typescript
   useEffect(() => {
     getData();
   }, []);
   ```

4. **Kiểm tra authentication trước khi render:**
   ```typescript
   if (!api.isAuthenticated()) {
     return <Navigate to="/login" />;
   }
   ```

5. **Cleanup và refetch khi cần:**
   ```typescript
   const handleDelete = async (id: number) => {
     await deleteProduct(id);
     getProducts(); // Refresh list
   };
   ```

## Testing API

Có thể test API bằng Postman collection có sẵn:
- `Lingerie_Shop_API.postman_collection.json`
- `Lingerie_Shop_Environment.postman_environment.json`

## Troubleshooting

### Token hết hạn
- Token có thời hạn 7 ngày (config trong backend)
- Khi hết hạn, user cần đăng nhập lại
- API service sẽ tự động xóa token và throw error

### CORS Issues
Backend đã config CORS cho:
- `http://localhost:3000`
- `http://localhost:5000`
- Vercel domain (nếu deploy)

### API URL không đúng
Kiểm tra file `.env.local` có đúng URL backend không.
