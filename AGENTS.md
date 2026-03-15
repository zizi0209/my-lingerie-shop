# AGENTS.md - Bộ Quy Tắc & Nguyên Tắc Vận Hành Hệ Thống

Tài liệu này định nghĩa các tiêu chuẩn cốt lõi, quy trình xử lý vấn đề và nguyên tắc kỹ thuật bắt buộc áp dụng trong toàn bộ dự án.

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

- **Ngôn ngữ:** Trả lời bằng Tiếng Việt có dấu.
- **Triết lý lập trình:**
  - KISS (Keep It Simple, Stupid), YAGNI (You Ain't Gonna Need It), DRY (Don't Repeat Yourself).
  - Convenient over Configuration & Explicit over Implicit.
  - Readability > Cleverness: Ưu tiên mã nguồn dễ đọc hơn là các kỹ thuật "thông minh" khó hiểu.
  - Correctness First: Đúng đắn trước, tối ưu sau.
  - Minimize Blast Radius: Giới hạn phạm vi ảnh hưởng của thay đổi.
- **Intentional I/O:**
  - Không gọi API, đọc/ghi DB hoặc lưu trữ dữ liệu trừ khi phục vụ mục đích hiện tại rõ ràng.
  - Băng thông, lưu trữ và I/O là chi phí thực tế. Dữ liệu không có người tiêu thụ là rác.

## 2. Tiêu Chuẩn Kỹ Thuật (Coding Standards)

- **TypeScript & ESLint**
  - KHÔNG dùng `any`: Sử dụng `unknown` kèm type guard hoặc Generic `<T>`.
  - Xử lý lỗi (Catch Error):
    ```typescript
    try {
      // code
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      alert(message); // Đảm bảo type safety
    }
    ```
- **Next.js Rules**
  - Sử dụng `<Link>` từ `next/link` thay vì `<a>` cho chuyển trang nội bộ.
  - Sử dụng `next/image` để tối ưu hóa hình ảnh.
- **Tailwind CSS (v4+)**
  - Dùng `bg-linear-to-*` thay vì `bg-gradient-to-*`.
  - Dùng `rounded-4xl` thay vì `rounded-[32px]`.
  - Ưu tiên utility classes có sẵn, hạn chế tối đa arbitrary values `[...]`.

## 3. Tối Ưu Hóa Database (7 Nguyên Tắc Vàng)

1. **Filter ở DB, không ở JS:** Không fetch ALL rồi mới filter/count bằng Javascript.
2. **Không N+1:** Tuyệt đối không gọi DB trong vòng lặp. Sử dụng batch load (`Promise.all()`) và dùng `Map` để truy xuất O(1).
3. **Luôn có Index:** Mọi filter/sort cần index. Compound index: equality trước, range/sort sau.
4. **Limit + Pagination:** Mặc định 20, tối đa 100-500. Ưu tiên cursor-based pagination.
5. **Chỉ lấy data cần thiết:** Select fields cụ thể (không `select *`), dùng projection.
6. **Load song song:** Dùng `Promise.all()` cho các truy vấn độc lập.
7. **Monitor trước deploy:** Ước lượng Records × Size × Requests/day. Theo dõi slow queries > 1s.

## 4. Problem-Solving Framework (DARE)

Khi gặp vấn đề phức tạp, áp dụng quy trình:

- **Bước 1: Decompose (Phân rã)**
  Vẽ Problem Graph, xác định ROOT CAUSE.
  Format:
  ```text
  ## Problem Graph
  1. [Main Problem] <- depends on 1.1, 1.2
     1.1 [Sub-problem] <- depends on 1.1.1
     1.1.1 [ROOT CAUSE] <- Giải quyết đầu tiên
  ```
- **Bước 2: Analyze (Phân tích)**
  Với mỗi sub-problem: Thought -> Action -> Observation.
- **Bước 3: Reflect (Phản tư)**
  Tự critique sau mỗi bước. Nếu lỗi thì backtrack và thử hướng khác.
- **Bước 4: Execute (Thực thi)**
  Giải quyết bottom-up từ ROOT CAUSE, validate từng bước.

## 5. Audit & Root Cause Protocol

Kích hoạt khi fix bug, lỗi, hoặc refactor. Phải trả lời ít nhất 5/8 câu hỏi (Bắt buộc #1, #3, #6, #8):

1. Triệu chứng quan sát được là gì (Expected vs Actual)?
2. Phạm vi ảnh hưởng?
3. Có tái hiện ổn định không? Điều kiện tái hiện tối thiểu?
4. Mốc thay đổi gần nhất (Commit/Config)?
5. Dữ liệu nào còn thiếu để kết luận?
6. Giả thuyết thay thế là gì?
7. Rủi ro nếu fix sai?
8. Tiêu chí Pass/Fail sau khi sửa?

## 6. UI/UX Design Guardrails (2026 Practical)

- **Clarity > Decoration:** Dễ hiểu quan trọng hơn đẹp.
- **Text Economy:** Rút gọn 50% số chữ nếu vẫn giữ nguyên nghĩa.
- **Responsive-first:** Thiết kế Mobile trước, scale lên Desktop sau.
- **Accessibility (WCAG 2.2 AA):** Focus-visible rõ ràng, contrast đủ, touch target tối thiểu 44x44px.
- **Consistency:** Sử dụng spacing scale nhất quán, ưu tiên pattern của Shadcn + Tailwind.
- **5-Second Rule:** Người dùng phải hiểu chức năng trong vòng 5 giây.

## 7. Ra Quyết Định & Tương Tác (Decision & AskUser)

- **Evidence over Opinion:** Mọi kết luận phải dựa trên bằng chứng (log, file path, line, history). Tách bạch giữa Quan sát (Observation) và Suy luận (Inference).
- **Chỉ dùng AskUser khi:** Quyết định ảnh hưởng đến Behavior, API, UX, Scope, Cost hoặc Risk.
- **Format đề xuất (Option):**
  - Option X (Recommend) — Confidence % (Lý do, tradeoff).
  - Option Y — Confidence % (Phù hợp khi...).

## 8. Quy Trình Làm Việc & Kiểm Tra (Workflow)

- **Trước khi thực hiện:** Pre-Audit -> Root Cause -> Proposal.
- **Kiểm tra lỗi (Verification):**
  - `bunx tsc --project frontend/tsconfig.json --noEmit`
  - `bunx tsc --project backend/tsconfig.json --noEmit`
  - `bunx oxlint --type-aware --type-check --fix`

  - bun --cwd backend run test:run
  - bun run --cwd ./backend build
  - bun run --cwd ./frontend build

Nếu backend deploy bằng Docker/Cloud Run/Railway Dockerfile thì thêm: (chạy lại /backend không phải tại /root)

  - docker build -t lingerie-backend-check .

- **Commit:** Sau khi kiểm tra xong, thực hiện git commit kèm theo `.factory/docs` (nếu có).
  **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP PUSH.**
- **Lưu ý về Bunx:** Nếu cache lỗi, xóa bằng: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\bunx-*` hoặc `bun install`.
