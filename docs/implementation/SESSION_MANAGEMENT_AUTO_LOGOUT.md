# 🔐 Session Management - Auto-Logout Implementation

**Date:** 2026-01-25
**Status:** ✅ **IMPLEMENTED**

---

## 📋 Overview

Hệ thống tự động logout user khi session hết hạn và hiển thị thông báo rõ ràng bằng Sonner toast.

---

## ⏱️ Token Expiration Times

### Access Tokens (JWT)
| User Type | Expiration Time | Value (ms) |
|-----------|-----------------|------------|
| **Regular User** | 1 hour | 3,600,000 |
| **Admin** | 15 minutes | 900,000 |

### Refresh Tokens (httpOnly Cookie)
| User Type | Expiration Time | Value (ms) |
|-----------|-----------------|------------|
| **Regular User** | 30 days | 2,592,000,000 |
| **Admin** | 24 hours | 86,400,000 |

### Dashboard Auth Cookie
- **Expiration:** 4 hours
- **Auto-refresh:** Every 30 minutes (via DashboardGuard)

**Configuration Location:** `backend/src/config/auth.ts`

---

## 🔄 Auto-Logout Flow

### 1. **Token Expiration Detection**

**Frontend** (`frontend/src/lib/api.ts`):
- Checks token expiry before each request (line 127)
- Auto-refreshes if token expires in < 5 minutes
- On 401/403 response: attempts one token refresh
- If refresh fails: throws SESSION_EXPIRED

**Backend** (`backend/src/middleware/auth.ts`):
- Validates JWT on protected endpoints
- Returns 403 if token invalid/expired
- Returns 401 if token not provided

---

### 2. **Custom Event Dispatch**

When session expires, `api.ts` dispatches a custom event:

```typescript
// frontend/src/lib/api.ts (lines 160-172, 178-190)
window.dispatchEvent(new CustomEvent('session-expired', {
  detail: {
    message: 'SESSION_EXPIRED',
    reason: 'Token refresh failed' // or 'Unauthorized access'
  }
}));
```

**Trigger Locations:**
1. **Line 160-172**: When token refresh fails after 401 response
2. **Line 178-190**: When 401/403 received on protected endpoint

---

### 3. **Global Event Listener**

**AuthContext** (`frontend/src/context/AuthContext.tsx`) listens for session-expired events:

```typescript
// Lines 142-163
useEffect(() => {
  const handleSessionExpired = (event: Event) => {
    // Show Sonner toast
    toast.error('Phiên đăng nhập đã hết hạn', {
      description: 'Vui lòng đăng nhập lại để tiếp tục.',
      duration: 5000,
    });

    // Clear session and logout
    logout();
  };

  window.addEventListener('session-expired', handleSessionExpired);

  return () => {
    window.removeEventListener('session-expired', handleSessionExpired);
  };
}, [logout]);
```

**Actions on session expiry:**
1. ✅ Show Sonner error toast (5 seconds)
2. ✅ Call `logout()` to clear tokens
3. ✅ Clear NextAuth session
4. ✅ Redirect to home page (`/`)

---

### 4. **Logout Implementation**

```typescript
// frontend/src/context/AuthContext.tsx (lines 234-249)
const logout = useCallback(async () => {
  // 1. Logout from NextAuth
  await signOut({ redirect: false });

  // 2. Clear backend JWT from localStorage
  api.removeToken();

  // 3. Clear AuthContext state
  setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  });

  // 4. Redirect to home
  router.push('/');
}, [router]);
```

---

## 🎨 Sonner Toast Configuration

**Global Configuration** (`frontend/src/components/layout/Providers.tsx`):

```tsx
<Toaster position="top-right" expand={false} richColors />
```

**Session Expiry Toast:**
```typescript
toast.error('Phiên đăng nhập đã hết hạn', {
  description: 'Vui lòng đăng nhập lại để tiếp tục.',
  duration: 5000, // 5 seconds
});
```

**Styling:**
- Position: Top-right corner
- Type: Error (red color with richColors)
- Duration: 5 seconds
- Includes description text

---

## 🧪 Testing

### **Method 1: Browser Console Test**

1. Login to the application
2. Open browser console (F12)
3. Load test script:
   ```javascript
   // Copy content from frontend/test-session-expiration.js
   ```
4. Run test:
   ```javascript
   testSessionExpired(); // Direct event trigger
   // OR
   forceTokenExpiration(); // Force token expiry
   // OR
   simulateUnauthorized(); // Remove token
   ```

### **Method 2: Wait for Real Expiration**

**Admin users:**
- Login to `/admin/login`
- Wait 15 minutes (access token expires)
- Make any API call (e.g., refresh page, click dashboard link)
- Should see toast + auto-logout

**Regular users:**
- Login to `/login-register`
- Wait 1 hour (access token expires)
- Make any API call
- Should see toast + auto-logout

### **Method 3: Manual Token Manipulation**

**In Browser Console:**
```javascript
// Set token to expired time
localStorage.setItem('tokenExpiresAt', String(Date.now() - 1000));

// Next API call will trigger SESSION_EXPIRED
```

---

## 🚨 Special Cases

### **Dashboard Re-Authentication**

**Location:** `frontend/src/components/auth/DashboardGuard.tsx`

Admin dashboard has **special handling** for session expiration:
- Shows **ReAuthModal** instead of auto-logout
- Allows admin to re-enter password without losing work
- Dashboard auth cookie: 4 hours validity
- Auto-refreshes every 30 minutes

**Why different?**
- Admin users often have unsaved work in dashboard
- Re-auth modal prevents data loss
- More user-friendly for long admin sessions

### **Silent Errors**

SESSION_EXPIRED errors are marked as `silent: true` in api.ts to:
- Prevent console error logging
- Avoid duplicate error messages
- Let global handler manage notification

---

## 📁 File Changes Summary

| File | Changes | Lines |
|------|---------|-------|
| `frontend/src/lib/api.ts` | Added custom event dispatch | 160-172, 178-190 |
| `frontend/src/context/AuthContext.tsx` | Added session-expired listener + toast | 142-163 |
| `frontend/src/context/AuthContext.tsx` | Updated logout to redirect home | 234-249 |
| `frontend/test-session-expiration.js` | Created test utilities | New file |

---

## ✅ Verification Checklist

- [x] Custom event dispatched on SESSION_EXPIRED
- [x] Global event listener in AuthContext
- [x] Sonner toast shows on session expiry
- [x] Auto-logout clears all tokens
- [x] Redirect to home page after logout
- [x] Dashboard keeps special re-auth flow
- [x] Test script created for manual testing
- [x] Documentation completed

---

## 🔮 Future Enhancements

1. **Session Timeout Warning:**
   - Show warning toast 2 minutes before expiration
   - Allow user to extend session

2. **Activity-Based Session Extension:**
   - Extend session on user activity (mouse move, keyboard input)
   - Keep admin sessions alive during active use

3. **Remember Last Page:**
   - Save current page before logout
   - Redirect back after login

4. **Session Countdown Timer:**
   - Display remaining session time in UI
   - Visual indicator for admins

---

**Implementation Complete:** ✅ 2026-01-25
**Tested:** Ready for production deployment
