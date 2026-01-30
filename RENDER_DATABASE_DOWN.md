# Render Database Connection Error - CRITICAL

## Vấn đề
Database PostgreSQL trên Render không thể kết nối:
```
Can't reach database server at `dpg-d5lkccumcj7s73bf62t0-a.singapore-postgres.render.com:5432`
```

## Nguyên nhân có thể
1. **Free tier database bị pause** - Render free databases tự động pause sau 90 ngày không hoạt động
2. **Database instance đang restart**
3. **Network connectivity issues**
4. **Database đã bị xóa hoặc suspended**

## Cách khắc phục

### Bước 1: Kiểm tra Render Dashboard
1. Login vào https://dashboard.render.com
2. Vào **Databases** section
3. Tìm database: `dpg-d5lkccumcj7s73bf62t0-a`
4. Kiểm tra status:
   - ✅ **Active** - Database đang chạy
   - ⚠️ **Suspended** - Database bị pause (free tier)
   - ❌ **Failed** - Database lỗi

### Bước 2: Khởi động lại Database (nếu bị pause)
- Click vào database
- Click **Resume** hoặc **Restart**
- Chờ 2-3 phút để database khởi động

### Bước 3: Lấy connection string mới
1. Vào database settings
2. Copy **External Database URL**
3. Update vào file `.env`:
   ```
   DATABASE_URL="<new-connection-string-here>"
   ```

### Bước 4: Restart backend
```bash
cd backend
bun src/server.ts
```

## Nếu database không thể khôi phục

### Option A: Tạo database mới trên Render
1. Tạo PostgreSQL database mới
2. Copy connection string
3. Update `.env`
4. Run migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Option B: Chuyển sang Supabase (RECOMMENDED)
1. Tạo account tại https://supabase.com
2. Tạo new project (chọn region Singapore)
3. Lấy connection string từ Settings > Database
4. Update `.env`
5. Run migrations

### Option C: Chuyển sang Neon Database
1. Tạo account tại https://neon.tech
2. Tạo new project
3. Lấy connection string
4. Update `.env`
5. Run migrations

## Lỗi phụ cần sửa

### Express trust proxy warning
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

**Sửa trong `backend/src/server.ts`:**
```typescript
const app = express();

// Add this line BEFORE other middleware
app.set('trust proxy', 1); // Trust first proxy (Render proxy)

// Then continue with other middleware
app.use(helmet(...));
app.use(cors(...));
```

## Kiểm tra sau khi sửa
```bash
# Test connection
curl http://localhost:5000/api/public/config

# Expected result:
{"success":true,"data":{"store_name":"Admin Panel","primary_color":"#f43f5e"}}
```

## Contact Render Support
Nếu database bị suspend vĩnh viễn:
- Email: support@render.com
- Dashboard > Support > New Ticket
- Describe: "PostgreSQL database can't connect - dpg-d5lkccumcj7s73bf62t0-a"
