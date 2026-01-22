# TODO - Lingerie Shop Dashboard

> **Trạng thái dự án:** Dashboard đang phát triển  
> **Ngày cập nhật:** 2026-01-02  
> **Mục tiêu:** Hoàn thiện Admin Dashboard & CMS động cho trang chủ

---

## 📊 TỔNG QUAN DỰ ÁN

### ✅ Đã hoàn thành (80%)
- [x] Database Schema (SystemConfig, PageSection, AuditLog)
- [x] Backend API: Products, Orders, Categories, Posts, Users, Roles
- [x] SystemConfig API (GET/PUT /api/admin/system-config)
- [x] PageSection Controller & Routes (CRUD complete)
- [x] Dashboard Layout với Sidebar, Theme, Language
- [x] Settings Page UI (5 tabs: General, Orders, Payment, Notifications, Integrations)
- [x] HomeComponent Page UI (placeholder)
- [x] Authentication & Authorization (requireAdmin middleware)
- [x] Rate Limiter & Audit Log

### ❌ Cần hoàn thiện (20%)
- [ ] **Backend:** Mount PageSection routes vào Admin
- [ ] **Backend:** Seed PageSection data mẫu
- [ ] **Frontend:** Test & debug Settings page
- [ ] **Frontend:** Kết nối HomeComponent với API
- [ ] **Frontend:** Xây dựng CMS Editor cho PageSection
- [ ] **Frontend:** Render PageSection động ở homepage
- [ ] **Testing:** E2E test cho Dashboard

---

## 🎯 ROADMAP THEO THỨ TỰ ƯU TIÊN

### **PHASE 1: Hoàn thiện Settings Page** ⚡ URGENT - 🚀 IN PROGRESS
> Thời gian: 0.5 ngày | Mục tiêu: Settings page hoạt động 100%  
> **Test Guide:** `test-settings-page.md`  
> **Full Checklist:** `PHASE1_TEST_CHECKLIST.md`

#### 1.1. Test Settings Page trên trình duyệt
- [x] **Khởi động dev servers** ✅
  - Backend: Port 5000 (PID 5596) ✅
  - Frontend: Port 3000 (PID 9480) ✅

- [x] **Pre-test checks** ✅
  - [x] Created frontend/.env.local with API_URL
  - [x] TypeScript check Frontend: PASSED
  - [x] TypeScript check Backend: PASSED
  - [x] Backend health check: OK
  - [x] Database seeded with admin user

- [ ] **Kiểm tra các chức năng** 👈 **BẠN Ở ĐÂY**
  - [ ] Truy cập: http://localhost:3000/dashboard/settings
  - [ ] Đăng nhập: (check backend/.env for ADMIN_EMAIL & ADMIN_PASSWORD)
  - [ ] Test Tab "Chung": Upload logo, điền thông tin shop
  - [ ] Test Tab "Đơn hàng": Nhập phí ship, ngưỡng freeship
  - [ ] Test Tab "Thanh toán": Điền thông tin ngân hàng
  - [ ] Test Tab "Thông báo": Toggle on/off, nhập email nhận thông báo
  - [ ] Test Tab "Tích hợp": Nhập Pixel IDs, upload OG Image, điền SEO
  - [ ] Click "Lưu thay đổi" → Kiểm tra console có lỗi không
  - [ ] F5 reload → Xem data có giữ nguyên không

- [ ] **Debug nếu có lỗi**
  - [ ] Check network tab: API `/admin/system-config` response 200?
  - [ ] Check console: TypeScript errors?
  - [ ] Check backend logs: Prisma query có lỗi không?

#### 1.2. Fix bugs nếu phát hiện
- [ ] Xử lý lỗi upload ảnh (nếu có)
- [ ] Xử lý lỗi validation (nếu có)
- [ ] Xử lý lỗi CORS (nếu có)
- [ ] Update error messages cho user-friendly

#### 1.3. Tối ưu UX
- [ ] Loading state khi save
- [ ] Toast notification khi save thành công/thất bại
- [ ] Confirm dialog trước khi rời trang nếu có thay đổi chưa lưu

**✅ Hoàn thành khi:** Settings page lưu & load data thành công, không có lỗi.

---

### **PHASE 2: Backend - Mount PageSection Routes** ⚡ URGENT
> Thời gian: 0.5 ngày | Mục tiêu: API PageSection hoạt động cho Admin

#### 2.1. Mount PageSection routes
- [ ] **File:** `backend/src/routes/admin/index.ts`
  ```typescript
  import pageSectionRoutes from '../pageSectionRoutes';
  
  // Thêm vào router
  router.use('/page-sections', pageSectionRoutes);
  ```

- [ ] **Test API:**
  ```bash
  # GET all sections (cần admin token)
  curl -X GET http://localhost:3000/api/admin/page-sections \
    -H "Authorization: Bearer ADMIN_TOKEN"
  
  # Expected: 200 OK, trả về array (có thể rỗng)
  ```

#### 2.2. Thêm Audit Log cho PageSection
- [ ] **File:** `backend/src/utils/constants.ts`
  ```typescript
  export const AuditActions = {
    // ... existing actions
    CREATE_PAGE_SECTION: 'CREATE_PAGE_SECTION',
    UPDATE_PAGE_SECTION: 'UPDATE_PAGE_SECTION',
    DELETE_PAGE_SECTION: 'DELETE_PAGE_SECTION',
    TOGGLE_PAGE_SECTION_VISIBILITY: 'TOGGLE_PAGE_SECTION_VISIBILITY'
  } as const;
  ```

- [ ] **File:** `backend/src/controllers/pageSectionController.ts`
  - [ ] Thêm `import { auditLog } from '../utils/auditLog';`
  - [ ] Thêm audit log vào `createPageSection`
  - [ ] Thêm audit log vào `updatePageSection`
  - [ ] Thêm audit log vào `deletePageSection`
  - [ ] Severity: `CRITICAL` cho DELETE, `INFO` cho create/update

#### 2.3. Seed PageSection data mẫu
- [ ] **File:** `backend/prisma/seedPageSections.ts` (NEW)
  ```typescript
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  async function main() {
    console.log('🌱 Seeding PageSections...');

    await prisma.pageSection.createMany({
      data: [
        {
          code: 'hero-banner',
          name: 'Banner Chính Trang Chủ',
          isVisible: true,
          order: 1,
          content: {
            type: 'hero-banner',
            title: 'Berry Silk - Nội Y Cao Cấp',
            subtitle: 'Ưu đãi đến 50% cho thành viên mới',
            backgroundImage: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
            buttonText: 'Khám phá ngay',
            buttonLink: '/san-pham',
            textPosition: 'center'
          }
        },
        {
          code: 'featured-products',
          name: 'Sản phẩm nổi bật',
          isVisible: true,
          order: 2,
          content: {
            type: 'featured-products',
            title: 'Sản phẩm nổi bật',
            productIds: [],
            layout: 'grid-4'
          }
        },
        {
          code: 'promotion-slider',
          name: 'Slider Khuyến Mãi',
          isVisible: true,
          order: 3,
          content: {
            type: 'promotion-slider',
            autoplay: true,
            interval: 5000,
            slides: [
              {
                image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
                title: 'Giảm 30% Collection Mùa Hè',
                link: '/collections/summer'
              },
              {
                image: 'https://images.unsplash.com/photo-1445205170230-053b83016050',
                title: 'Miễn phí vận chuyển cho đơn >500k',
                link: '/san-pham'
              }
            ]
          }
        },
        {
          code: 'instagram-feed',
          name: 'Instagram Feed',
          isVisible: false,
          order: 4,
          content: {
            type: 'instagram-feed',
            username: 'berrysilk_lingerie',
            displayCount: 6,
            title: 'Follow Us @berrysilk_lingerie'
          }
        }
      ],
      skipDuplicates: true
    });

    console.log('✅ PageSections seeded successfully!');
  }

  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  ```

- [ ] **Update:** `backend/package.json`
  ```json
  {
    "scripts": {
      "seed": "tsx prisma/seed.ts",
      "seed:sections": "tsx prisma/seedPageSections.ts"
    }
  }
  ```

- [ ] **Run seed:**
  ```bash
  cd backend
  npm run seed:sections
  ```

#### 2.4. Tạo Public API cho Frontend
- [ ] **File:** `backend/src/routes/pageSectionRoutes.ts`
  - [ ] Đảm bảo route `GET /` và `GET /code/:code` là PUBLIC (không cần auth)
  - [ ] Filter: Chỉ trả về sections có `isVisible: true`
  - [ ] Sort: Theo field `order` tăng dần

**✅ Hoàn thành khi:** API trả về data mẫu, audit log hoạt động.

---

### **PHASE 3: Frontend - PageSection Management UI** 🎨 HIGH PRIORITY
> Thời gian: 1 ngày | Mục tiêu: Dashboard quản lý PageSection

#### 3.1. Cập nhật HomeComponent.tsx
- [ ] **File:** `frontend/src/components/dashboard/pages/HomeComponent.tsx`
  - [ ] Fetch API: `GET /api/admin/page-sections`
  - [ ] Hiển thị danh sách sections với data thật
  - [ ] Drag & Drop reorder (dùng `@dnd-kit/core` hoặc `react-beautiful-dnd`)
  - [ ] Toggle visibility (PUT API)
  - [ ] Button "Edit" mở modal
  - [ ] Button "Delete" với confirm dialog

#### 3.2. Tạo Modal Editor
- [ ] **Component:** `frontend/src/components/dashboard/components/PageSectionModal.tsx`
  - [ ] Form fields: `code`, `name`, `isVisible`, `order`
  - [ ] Content Editor theo type:
    - [ ] Type `hero-banner`: Form (title, subtitle, image, button)
    - [ ] Type `featured-products`: Product selector (multi-select)
    - [ ] Type `promotion-slider`: Slides array editor
    - [ ] Type `instagram-feed`: Input (username, displayCount)
  - [ ] JSON fallback textarea cho advanced users

#### 3.3. API Integration
- [ ] Implement create: `POST /api/admin/page-sections`
- [ ] Implement update: `PUT /api/admin/page-sections/:id`
- [ ] Implement delete: `DELETE /api/admin/page-sections/:id`
- [ ] Implement reorder: Batch update `order` field

#### 3.4. UX Enhancements
- [ ] Loading states
- [ ] Error handling & toast notifications
- [ ] Optimistic UI updates
- [ ] Undo/Redo (optional)

**✅ Hoàn thành khi:** Admin có thể CRUD PageSection từ Dashboard.

---

### **PHASE 4: Frontend - Render CMS động ở Homepage** 🚀 HIGH PRIORITY
> Thời gian: 1 ngày | Mục tiêu: Homepage render sections từ CMS

#### 4.1. Tạo PageSectionRenderer
- [ ] **Component:** `frontend/src/components/cms/PageSectionRenderer.tsx`
  ```typescript
  import HeroBanner from './sections/HeroBanner';
  import FeaturedProducts from './sections/FeaturedProducts';
  import PromotionSlider from './sections/PromotionSlider';
  import InstagramFeed from './sections/InstagramFeed';

  const SECTION_COMPONENTS = {
    'hero-banner': HeroBanner,
    'featured-products': FeaturedProducts,
    'promotion-slider': PromotionSlider,
    'instagram-feed': InstagramFeed,
  };

  export function PageSectionRenderer({ section }) {
    const Component = SECTION_COMPONENTS[section.content?.type];
    
    if (!Component) {
      console.warn(`Unknown section type: ${section.content?.type}`);
      return null;
    }
    
    return <Component data={section.content} />;
  }
  ```

#### 4.2. Tạo Section Components
- [ ] **HeroBanner.tsx**
  - [ ] Full-width banner với background image
  - [ ] Text overlay (title, subtitle)
  - [ ] CTA button
  - [ ] Responsive (mobile: stack, desktop: overlay)

- [ ] **FeaturedProducts.tsx**
  - [ ] Fetch products by IDs
  - [ ] Grid layout (4 columns desktop, 2 mobile)
  - [ ] Product card với image, name, price
  - [ ] Link to product detail

- [ ] **PromotionSlider.tsx**
  - [ ] Carousel với autoplay
  - [ ] Navigation arrows
  - [ ] Dots indicators
  - [ ] Responsive

- [ ] **InstagramFeed.tsx**
  - [ ] Grid 3x2 (6 ảnh)
  - [ ] Mock data hoặc tích hợp Instagram API (optional)
  - [ ] Link to Instagram profile

#### 4.3. Tích hợp vào Homepage
- [ ] **File:** `frontend/src/app/page.tsx`
  ```typescript
  import { PageSectionRenderer } from '@/components/cms/PageSectionRenderer';

  export default async function HomePage() {
    const res = await fetch('http://localhost:3000/api/page-sections', {
      cache: 'no-store' // hoặc revalidate: 60
    });
    const { data: sections } = await res.json();
    
    return (
      <main>
        {sections.map((section) => (
          <PageSectionRenderer key={section.id} section={section} />
        ))}
      </main>
    );
  }
  ```

#### 4.4. Styling & Polish
- [ ] Consistent spacing giữa các sections
- [ ] Animations (fade-in khi scroll)
- [ ] Loading states
- [ ] Error boundaries

**✅ Hoàn thành khi:** Homepage hiển thị sections từ CMS, có thể chỉnh sửa từ Dashboard.

---

### **PHASE 5: Testing & Documentation** 📝 MEDIUM PRIORITY
> Thời gian: 0.5 ngày | Mục tiêu: Đảm bảo chất lượng

#### 5.1. Manual Testing
- [ ] Test Settings page: Lưu các config, F5 reload
- [ ] Test PageSection CRUD: Create, Edit, Delete, Reorder
- [ ] Test Homepage: Hiển thị sections, thay đổi visibility
- [ ] Test responsive: Mobile, Tablet, Desktop
- [ ] Test dark mode: Tất cả components hoạt động
- [ ] Test cross-browser: Chrome, Safari, Firefox

#### 5.2. E2E Tests (Optional)
- [ ] Playwright test cho Settings page
- [ ] Playwright test cho PageSection management
- [ ] Playwright test cho Homepage rendering

#### 5.3. Documentation
- [ ] **CMS_GUIDE.md:** Hướng dẫn sử dụng CMS cho Admin
  - [ ] Cách tạo/sửa/xóa sections
  - [ ] Các loại section và cấu trúc JSON
  - [ ] Best practices

- [ ] **SECTION_TYPES.md:** Danh sách loại Section và schema JSON
  ```markdown
  # Section Types
  
  ## 1. Hero Banner
  **Code:** `hero-banner`
  **JSON Schema:**
  ```json
  {
    "type": "hero-banner",
    "title": "string",
    "subtitle": "string",
    "backgroundImage": "string (URL)",
    "buttonText": "string",
    "buttonLink": "string",
    "textPosition": "center|left|right"
  }
  ```
  
  ## 2. Featured Products
  ...
  ```

- [ ] **Update AGENTS.md:** Thêm workflow quản lý CMS

**✅ Hoàn thành khi:** Tất cả features hoạt động ổn định, có docs đầy đủ.

---

### **PHASE 6: Advanced Features** 🌟 LOW PRIORITY (Nice to have)
> Thời gian: 1 ngày | Mục tiêu: Nâng cao trải nghiệm

#### 6.1. Preview Mode
- [ ] Button "Preview" trong Dashboard
- [ ] Mở modal/tab mới hiển thị homepage với data hiện tại
- [ ] Không cần publish, real-time preview

#### 6.2. Template Library
- [ ] Preset templates cho các loại shop:
  - [ ] Lingerie Shop (default)
  - [ ] Fashion Store
  - [ ] Electronics Shop
- [ ] Click "Apply Template" → Tự động tạo 5-7 sections mẫu

#### 6.3. Section Scheduling
- [ ] Thêm fields: `publishAt`, `expireAt` vào schema
- [ ] Cronjob tự động bật/tắt sections theo thời gian
- [ ] Use case: Banner flash sale chỉ hiện 12h-14h

#### 6.4. A/B Testing
- [ ] Duplicate section với variant
- [ ] Random hoặc split traffic 50/50
- [ ] Track conversion rate

#### 6.5. Analytics Integration
- [ ] Track section impressions (GTM)
- [ ] Track CTA clicks
- [ ] Dashboard hiển thị performance metrics

**✅ Hoàn thành khi:** Có ít nhất 2/5 features advanced.

---

## 🐛 BUG TRACKER

### Critical Bugs
- [ ] (Chưa phát hiện)

### High Priority Bugs
- [ ] (Chưa phát hiện)

### Low Priority Bugs
- [ ] (Chưa phát hiện)

---

## 📅 TIMELINE DỰ KIẾN

| Phase | Thời gian | Hoàn thành dự kiến |
|-------|-----------|-------------------|
| Phase 1 | 0.5 ngày | 2026-01-03 |
| Phase 2 | 0.5 ngày | 2026-01-03 |
| Phase 3 | 1 ngày | 2026-01-04 |
| Phase 4 | 1 ngày | 2026-01-05 |
| Phase 5 | 0.5 ngày | 2026-01-05 |
| **Total** | **3.5 ngày** | **2026-01-05** |

---

## 📝 NOTES & DECISIONS

### Công nghệ đã chọn
- **Backend:** Express.js + Prisma + PostgreSQL
- **Frontend:** Next.js 14 (App Router) + React + TailwindCSS
- **Upload:** Cloudinary
- **DnD:** @dnd-kit/core (chọn vì lightweight, modern)
- **Image Compression:** sharp (backend)

### Quyết định thiết kế
- SystemConfig lưu flat key-value (dễ query, dễ cache)
- PageSection content lưu JSON (flexible, không cần thay đổi schema)
- Public API không cần auth (caching tốt hơn)
- Admin API có audit log (compliance)

### Trade-offs
- **Không dùng:** React Query → Giữ code đơn giản, dùng native fetch
- **Không dùng:** Form library (React Hook Form) → Form đơn giản, controlled components đủ
- **Không dùng:** State management (Redux) → Context API + local state đủ

---

## 🚨 BLOCKERS & RISKS

### Hiện tại
- Không có blockers

### Rủi ro tiềm ẩn
- **Risk:** Settings page có quá nhiều fields → UX phức tạp  
  **Mitigation:** Đã chia thành 5 tabs rõ ràng
  
- **Risk:** PageSection JSON schema không consistent  
  **Mitigation:** Tạo TypeScript types + validation với Zod

- **Risk:** Homepage load chậm nếu nhiều sections  
  **Mitigation:** Server-side render + revalidate cache 60s

---

## 💡 FUTURE IMPROVEMENTS

### Sau khi hoàn thành Phase 1-5
1. **Multi-language CMS:** PageSection hỗ trợ nội dung đa ngôn ngữ
2. **Version History:** Lưu lịch sử thay đổi PageSection, có thể rollback
3. **Permission System:** Phân quyền chi tiết cho từng section
4. **AI Content Generator:** GPT tạo nội dung banner/description
5. **Mobile App:** Admin app quản lý CMS trên điện thoại

---

## 🎯 SUCCESS METRICS

### Phase 1-2 hoàn thành khi:
- [ ] Settings page save & load thành công
- [ ] API `/admin/page-sections` trả về data mẫu
- [ ] Audit log ghi nhận mọi thay đổi

### Phase 3-4 hoàn thành khi:
- [ ] Admin CRUD PageSection từ Dashboard
- [ ] Homepage render sections từ CMS
- [ ] Không có TypeScript errors
- [ ] Responsive trên mobile/desktop

### Toàn bộ dự án hoàn thành khi:
- [ ] Admin có thể tự tùy chỉnh toàn bộ homepage mà không cần code
- [ ] Homepage load < 2s (Lighthouse score > 90)
- [ ] Tất cả features đã test, không có critical bugs
- [ ] Documentation đầy đủ

---

---

## 🚀 CURRENT STATUS (2026-01-02 18:25)

### ✅ Phase 1 Progress: 85% Complete

**Completed:**
- ✅ Backend server running (port 5000)
- ✅ Frontend server running (port 3000)
- ✅ Frontend .env.local created with correct API_URL
- ✅ TypeScript checks PASSED (both Frontend & Backend)
- ✅ Backend health check OK
- ✅ Database seeded with admin user
- ✅ Test documentation ready:
  - `test-settings-page.md` - Quick 15-min guide
  - `PHASE1_TEST_CHECKLIST.md` - Full 78 test cases

**Next Steps:**
1. 📱 **Mở browser:** http://localhost:3000/dashboard/settings
2. 🔐 **Đăng nhập:** Check `backend/.env` for ADMIN_EMAIL & ADMIN_PASSWORD
3. ✏️ **Test Settings page** theo guide `test-settings-page.md`
4. 🐛 **Report bugs** nếu phát hiện
5. ✅ **Update TODO.md** khi test xong

**Expected Result:**
- Settings page loads successfully
- All 5 tabs work
- Save button persists data to database
- F5 reload shows saved data
- No errors in browser console

---

**Cập nhật lần cuối:** 2026-01-02  
**Người maintain:** Droid AI + Development Team
