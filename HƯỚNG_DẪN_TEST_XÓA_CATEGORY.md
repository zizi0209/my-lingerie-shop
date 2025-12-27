# Hướng dẫn Test: Xóa Category có Sản phẩm (Error 400)

## Mục tiêu
Test case: Không thể xóa category nếu còn sản phẩm bên trong

---

## Cách 1: Dùng Prisma Studio (Nhanh nhất - GUI) ⭐

### Bước 1: Khởi động Prisma Studio
```bash
cd backend
npx prisma studio
```

Prisma Studio sẽ mở tại: `http://localhost:5555`

### Bước 2: Tạo Category
1. Click vào model **Category** ở sidebar trái
2. Click nút **Add record**
3. Điền thông tin:
   ```
   name: Áo lót ren
   slug: ao-lot-ren
   image: https://example.com/image.jpg
   ```
4. Click **Save 1 change**
5. **Lưu lại ID** của category vừa tạo (ví dụ: ID = 1)

### Bước 3: Tạo Product thuộc Category đó
1. Click vào model **Product** ở sidebar trái
2. Click nút **Add record**
3. Điền thông tin:
   ```
   name: Áo lót ren cao cấp
   slug: ao-lot-ren-cao-cap
   description: Áo lót ren đẹp
   price: 299000
   salePrice: 249000
   categoryId: 1          👈 Điền ID category vừa tạo ở bước 2
   isFeatured: true
   isVisible: true
   ```
4. Click **Save 1 change**

### Bước 4: Test API Xóa Category
Mở Postman và gửi request:

**URL:** `http://localhost:5000/api/categories/1`
**Method:** `DELETE`
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Kết quả mong đợi (400 Bad Request):**
```json
{
  "error": "Không thể xóa danh mục vì còn 1 sản phẩm!"
}
```

✅ **Success!** Bạn đã test được error case này.

---

## Cách 2: Dùng Seed Script (Tự động hóa)

### Bước 1: Tạo file seed
Tạo file `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // Tạo Category
  const category = await prisma.category.create({
    data: {
      name: 'Áo lót ren',
      slug: 'ao-lot-ren',
      image: 'https://example.com/ao-lot-ren.jpg',
    },
  });

  console.log('✅ Đã tạo category:', category);

  // Tạo Product thuộc category
  const product = await prisma.product.create({
    data: {
      name: 'Áo lót ren cao cấp',
      slug: 'ao-lot-ren-cao-cap',
      description: 'Áo lót ren đẹp, chất liệu mềm mại',
      price: 299000,
      salePrice: 249000,
      categoryId: category.id,
      isFeatured: true,
      isVisible: true,
    },
  });

  console.log('✅ Đã tạo product:', product);

  // Tạo thêm ProductImage
  await prisma.productImage.create({
    data: {
      url: 'https://example.com/product1.jpg',
      productId: product.id,
    },
  });

  // Tạo thêm ProductVariant
  await prisma.productVariant.createMany({
    data: [
      {
        size: 'M',
        color: 'Đỏ',
        stock: 10,
        productId: product.id,
      },
      {
        size: 'L',
        color: 'Đen',
        stock: 15,
        productId: product.id,
      },
    ],
  });

  console.log('✅ Seed hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Bước 2: Cập nhật package.json
Thêm vào `backend/package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Bước 3: Cài ts-node (nếu chưa có)
```bash
cd backend
npm install -D ts-node
```

### Bước 4: Chạy seed
```bash
npx prisma db seed
```

### Bước 5: Test API Xóa Category
Dùng Postman DELETE category như Cách 1.

---

## Cách 3: Tạo API Product (Đầy đủ nhất)

Nếu bạn muốn có API Product để test qua Postman, tôi có thể tạo API Product cho bạn.

**Ưu điểm:**
- Test hoàn chỉnh qua Postman
- Có thể tạo nhiều sản phẩm dễ dàng
- Chuẩn bị sẵn cho tương lai

**Nhược điểm:**
- Mất thời gian tạo API hơn

---

## So sánh các cách

| Cách | Tốc độ | Phù hợp khi |
|------|--------|-------------|
| **Cách 1: Prisma Studio** | ⚡ Nhanh nhất | Chỉ cần test 1 lần nhanh |
| **Cách 2: Seed Script** | ⚡⚡ Trung bình | Cần seed data nhiều lần |
| **Cách 3: API Product** | ⚡⚡⚡ Chậm nhất | Cần API Product cho dự án |

---

## Lưu ý

Sau khi test xong, nếu muốn reset database:

```bash
cd backend
npx prisma migrate reset
# Hoặc
npx prisma db push --force-reset
```

⚠️ **Cảnh báo:** Lệnh trên sẽ XÓA TOÀN BỘ dữ liệu!
