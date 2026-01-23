# Sửa Lỗi SESSION_EXPIRED Trong Console

## Vấn Đề

Khi truy cập `/dashboard`, console hiển thị lỗi `SESSION_EXPIRED` gây nhiễu và khó debug.

## Nguyên Nhân

1. **Trong `api.ts`**: Khi gặp lỗi 401/403, code throw error với message `'SESSION_EXPIRED'` và đánh dấu `silent: true` để không hiện thông báo cho user
2. **Vấn đề**: Mặc dù error được đánh dấu silent, nhưng `console.error('API Error:', error)` vẫn in ra console ở dòng 169
3. **Trong `DashboardGuard.tsx`**: Catch error nhưng không phân biệt loại error, dẫn đến xử lý không chính xác
4. **WishlistContext**: Gọi API ngay khi mount và không xử lý error tốt
5. **ReAuthModal**: Không xử lý error message rõ ràng

## Giải Pháp

### 1. Sửa `frontend/src/lib/api.ts`

**Trước:**
```typescript
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

**Sau:**
```typescript
} catch (error) {
  // Không log silent errors (SESSION_EXPIRED) để tránh nhiễu console
  const isSilent = error instanceof Error && (error as Error & { silent?: boolean }).silent;
  if (!isSilent) {
    console.error('API Error:', error);
  }
  throw error;
}
```

### 2. Cải thiện `frontend/src/components/auth/DashboardGuard.tsx`

#### a. Trong `checkDashboardAuth()`

**Trước:**
```typescript
} catch {
  // Lỗi, hiển thị modal
  setShowReAuthModal(true);
}
```

**Sau:**
```typescript
} catch (error) {
  // Chỉ hiển thị modal nếu là lỗi SESSION_EXPIRED
  const isSessionError = error instanceof Error && error.message === 'SESSION_EXPIRED';
  if (isSessionError) {
    setShowReAuthModal(true);
  } else {
    // Lỗi khác, log và redirect
    console.error('Dashboard auth check failed:', error);
    router.replace("/");
  }
}
```

#### b. Trong refresh interval

**Trước:**
```typescript
api.get("/auth/check-dashboard-auth").catch(() => {
  // If fails, show re-auth modal
  setIsDashboardAuth(false);
  setShowReAuthModal(true);
});
```

**Sau:**
```typescript
api.get("/auth/check-dashboard-auth").catch((error) => {
  // Chỉ xử lý nếu là lỗi session
  const isSessionError = error instanceof Error && error.message === 'SESSION_EXPIRED';
  if (isSessionError) {
    setIsDashboardAuth(false);
    setShowReAuthModal(true);
  }
});
```

### 3. Cải thiện `frontend/src/context/WishlistContext.tsx`

**Trước:**
```typescript
const data = await res.json();
if (data.success) {
  setItems(data.data);
}
} catch (err) {
  console.error("Fetch wishlist error:", err);
}
```

**Sau:**
```typescript
// Chỉ xử lý nếu response OK
if (!res.ok) {
  // Không log lỗi 401/403 - đây là trường hợp bình thường khi chưa auth
  if (res.status !== 401 && res.status !== 403) {
    console.error("Fetch wishlist error:", res.status);
  }
  setItems([]);
  return;
}

const data = await res.json();
if (data.success) {
  setItems(data.data);
}
} catch (err) {
  // Silent fail - không log error
  setItems([]);
}
```

### 4. Cải thiện `frontend/src/components/auth/ReAuthModal.tsx`

**Trước:**
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : "Lỗi không xác định";
  setError(message);
}
```

**Sau:**
```typescript
} catch (err) {
  // Xử lý error message
  if (err instanceof Error) {
    if (err.message === 'SESSION_EXPIRED') {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      setError("Mật khẩu không đúng");
    } else {
      setError(err.message);
    }
  } else {
    setError("Lỗi không xác định");
  }
}
```

## Kết Quả

✅ Console không còn hiển thị lỗi `SESSION_EXPIRED` khi truy cập dashboard
✅ Silent errors không bị log ra console
✅ Chỉ log errors thực sự cần debug
✅ Xử lý chính xác từng loại error (session expired vs network error)
✅ UX tốt hơn - không gây nhiễu cho developer khi debug
✅ Wishlist không log lỗi 401/403 khi chưa authenticated
✅ ReAuthModal hiển thị error message rõ ràng hơn

## Về Các Lỗi HTTP 401/403 Trong Network Tab

Các lỗi HTTP như:
- `403 Forbidden` từ `/api/auth/check-dashboard-auth`
- `401 Unauthorized` từ `/api/auth/verify-password`
- `401 Unauthorized` từ `/api/auth/refresh`

**Đây KHÔNG phải là lỗi** mà là hành vi bình thường của ứng dụng:

1. **403 từ check-dashboard-auth**: Xảy ra khi user chưa xác thực dashboard - đúng như thiết kế
2. **401 từ verify-password**: Xảy ra khi nhập sai mật khẩu - đúng như thiết kế
3. **401 từ refresh**: Xảy ra khi refresh token hết hạn - đúng như thiết kế

Browser hiển thị các request này trong Network tab để developer có thể debug, nhưng chúng không phải là lỗi cần sửa. Application đã xử lý đúng các trường hợp này.

## Cách Test

1. Truy cập `/dashboard` khi chưa đăng nhập
2. Truy cập `/dashboard` khi đã đăng nhập nhưng chưa xác thực dashboard
3. Kiểm tra console - không còn thấy lỗi `SESSION_EXPIRED`
4. Modal re-auth vẫn hiển thị đúng khi cần
5. Network tab vẫn hiển thị HTTP errors nhưng console sạch sẽ

## Files Đã Sửa

- `frontend/src/lib/api.ts` - Không log silent errors
- `frontend/src/components/auth/DashboardGuard.tsx` - Xử lý error chính xác hơn
- `frontend/src/context/WishlistContext.tsx` - Không log lỗi 401/403
- `frontend/src/components/auth/ReAuthModal.tsx` - Error message rõ ràng hơn
