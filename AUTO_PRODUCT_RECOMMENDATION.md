# Tính năng Tự động Gợi ý Sản phẩm Liên quan (Auto Product Recommendation)

## 📝 Tổng quan

Tính năng này tự động gợi ý sản phẩm liên quan dựa trên nội dung bài viết, giúp tăng conversion rate mà không cần liên kết thủ công mỗi bài.

## ✨ Tính năng chính

### 1. **Tự động phân tích nội dung**
- Trích xuất keywords từ title và content của bài viết
- Match với category của bài viết
- Tìm sản phẩm phù hợp từ database

### 2. **Thuật toán gợi ý thông minh**
- **Ưu tiên 1**: Match theo category (PostCategory ↔ ProductCategory)
- **Ưu tiên 2**: Match theo keywords trong title/content
- **Ưu tiên 3**: Fallback về sản phẩm featured nếu không tìm thấy

### 3. **Từ khóa được hỗ trợ**
```typescript
const keywords = [
  // Loại sản phẩm
  'nội y', 'áo lót', 'áo ngực', 'quần lót', 'đồ lót', 'bra', 'lingerie',
  
  // Chất liệu
  'ren', 'lụa', 'cotton', 'lace', 'satin', 'silk',
  
  // Kiểu dáng
  'sexy', 'bikini', 'thong', 'brief', 'boxer', 'push-up', 'bralette',
  'bodysuit', 'corset', 'babydoll', 'chemise', 'teddy',
  
  // Đồ ngủ
  'pajama', 'pyjama', 'ngủ', 'mặc nhà', 'sleepwear',
  
  // Thể thao
  'sport', 'thể thao', 'yoga', 'gym',
  
  // Đặc biệt
  'nursing', 'bầu', 'cho con bú', 'maternity',
];
```

### 4. **Loại trừ sản phẩm trùng lặp**
- Tự động loại bỏ sản phẩm đã được liên kết thủ công
- Không hiển thị sản phẩm bị ẩn hoặc đã xóa
- Chỉ hiển thị sản phẩm visible và active

## 🎯 Ví dụ thực tế

### Bài viết: "Xu hướng nội y xuân hè 2025"

**Keywords được phát hiện:**
- "nội y"
- "xuân hè"
- Category: "Xu hướng thời trang"

**Sản phẩm được gợi ý:**
1. Set nội y ren cao cấp (match: "nội y", "ren")
2. Áo lót không gọng (match: "nội y", category)
3. Quần lót bikini (match: "nội y", "bikini")
4. Bộ đồ lót cotton (match: "nội y", "cotton")
5. Push-up bralette (match: "nội y", "push-up")
6. Bodysuit sexy (match: "nội y", "sexy")

### Bài viết: "Hướng dẫn chọn đồ ngủ thoải mái"

**Keywords được phát hiện:**
- "đồ ngủ"
- "ngủ"
- "thoải mái"

**Sản phẩm được gợi ý:**
1. Bộ pyjama lụa (match: "pyjama", "lụa")
2. Đồ ngủ cotton mát mẻ (match: "ngủ", "cotton")
3. Áo ngủ mặc nhà (match: "ngủ", "mặc nhà")

## 🚀 API Endpoint

### GET `/api/product-posts/posts/:postId/recommended`

**Query Parameters:**
- `limit` (optional): Số lượng sản phẩm gợi ý (mặc định: 6)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Set nội y ren cao cấp",
      "slug": "set-noi-y-ren-cao-cap",
      "price": 450000,
      "salePrice": 350000,
      "images": [{ "url": "..." }],
      "category": { "name": "Nội y", "slug": "noi-y" }
    }
  ],
  "meta": {
    "postId": 123,
    "postTitle": "Xu hướng nội y xuân hè 2025",
    "postCategory": "Xu hướng thời trang",
    "matchedKeywords": ["nội y", "ren", "sexy"],
    "totalFound": 6
  }
}
```

## 🎨 UI/UX

### Hiển thị trên trang bài viết

**Cấu trúc:**
1. **Manual Linked Products** (hiển thị trước)
   - Sản phẩm được admin link thủ công qua dashboard
   - Có thể có customNote đặc biệt

2. **Auto-Recommended Products** (hiển thị sau)
   - Sản phẩm được gợi ý tự động bởi thuật toán
   - Không có customNote

**Layout:**
```
┌─────────────────────────────────────────────┐
│   📝 NỘI DUNG BÀI VIẾT                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│   🛍️ SẢN PHẨM ĐƯỢC ĐỀ XUẤT                 │
│   Các sản phẩm liên quan đến nội dung bài   │
│                                             │
│   ┌───────┐  ┌───────┐  ┌───────┐         │
│   │ SP 1  │  │ SP 2  │  │ SP 3  │         │
│   │Manual │  │Manual │  │Auto   │         │
│   └───────┘  └───────┘  └───────┘         │
│                                             │
│   ┌───────┐  ┌───────┐  ┌───────┐         │
│   │ SP 4  │  │ SP 5  │  │ SP 6  │         │
│   │Auto   │  │Auto   │  │Auto   │         │
│   └───────┘  └───────┘  └───────┘         │
└─────────────────────────────────────────────┘
```

## 🔧 Cấu hình

### Backend Controller
- File: `backend/src/controllers/productPostController.ts`
- Function: `getRecommendedProducts`

### Backend Route
- File: `backend/src/routes/productPostRoutes.ts`
- Route: `GET /posts/:postId/recommended`

### Frontend Component
- File: `frontend/src/components/blog/PostContent.tsx`
- Tự động fetch cả manual links + auto-recommended
- Merge và hiển thị trong grid layout

## 📊 Ưu điểm

1. **Tiết kiệm thời gian**
   - Không cần link thủ công mỗi bài viết
   - Tự động cập nhật khi có sản phẩm mới

2. **Tăng coverage**
   - Mọi bài viết đều có sản phẩm liên quan
   - Không bỏ sót cơ hội conversion

3. **Relevant & Smart**
   - Gợi ý dựa trên nội dung thực tế
   - Match chính xác theo keyword và category

4. **Kết hợp linh hoạt**
   - Vẫn giữ manual links cho sản phẩm đặc biệt
   - Auto-recommended bổ sung thêm options

## 🎯 Best Practices

### Khi nào dùng Manual Links?
✅ Sản phẩm được review chi tiết trong bài  
✅ Sản phẩm đặc biệt có promotion  
✅ Muốn hiển thị customNote đặc biệt

### Khi nào tin tưởng Auto-Recommend?
✅ Bài viết chung chung về trend  
✅ Bài viết hướng dẫn không focus vào 1 sản phẩm cụ thể  
✅ Muốn tăng độ phủ sản phẩm nhanh chóng

## 🐛 Troubleshooting

### Không có sản phẩm nào được gợi ý?
1. ✅ Check title/content có chứa keywords không?
2. ✅ Check PostCategory có match với ProductCategory không?
3. ✅ Check có sản phẩm visible trong database không?
4. ✅ Check API response trong Network tab

### Sản phẩm gợi ý không liên quan?
1. ✅ Thêm keywords mới vào danh sách keywords
2. ✅ Cải thiện category mapping
3. ✅ Viết title/content rõ ràng hơn với keywords

### Test API trực tiếp
```bash
# Get recommended products for post ID 1
curl http://localhost:5000/api/product-posts/posts/1/recommended?limit=6
```

## 📈 Metrics cần theo dõi

- **CTR (Click-Through Rate)**: Tỷ lệ click vào sản phẩm gợi ý
- **Conversion Rate**: Tỷ lệ mua hàng từ sản phẩm gợi ý
- **Relevance Score**: % sản phẩm gợi ý liên quan (feedback từ user)
- **Coverage**: % bài viết có sản phẩm gợi ý

## 🔄 Tương lai

### Cải thiện thuật toán
- [ ] Sử dụng AI/ML để semantic matching
- [ ] Học từ click history của users
- [ ] Personalization theo user preferences
- [ ] A/B testing để tối ưu thuật toán

### Tính năng mới
- [ ] Badge phân biệt Manual vs Auto
- [ ] Sorting theo relevance score
- [ ] Limit số lượng auto-recommended
- [ ] Admin setting: Enable/Disable auto-recommend per post
