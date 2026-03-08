# System Instructions & Coding Guidelines

## 1. General Behavior & Workflow

- **Language:** Trả lời hoàn toàn bằng **Tiếng Việt**.
- **Approach:** Luôn chọn giải pháp **Best Practice**, **Approved**, và phù hợp ngữ cảnh (**Contextual**).
- **Git Workflow:**
  - Mọi thay đổi phải được kiểm tra (Verify) trước khi Commit.
  - ⛔ **CRITICAL:** Tuyệt đối **KHÔNG** được phép `push`. Chỉ tạo commit cục bộ.
- **QA & Issues:**
  - Gán nhãn vấn đề theo mức độ: `Critical`, `High`, `Medium`, `Low`.

## 2. Core Principles

Tuân thủ nghiêm ngặt các tư duy thiết kế sau:

### Design Philosophy

- **Convenience over Configuration:** Ưu tiên cấu hình mặc định hợp lý.
- **Explicit over Implicit:** Code tường minh, dễ hiểu, không "ma thuật".
- **DRY (Don't Repeat Yourself) > WET:** Tái sử dụng code hợp lý.
- **KISS & YAGNI:** Giữ đơn giản, không làm dư thừa.
- **Single Responsibility:** Một module/hàm chỉ làm một việc.
- **Readability > Cleverness:** Code dễ đọc quan trọng hơn code "thông minh" nhưng khó hiểu.

### Intentional I/O (Resource Management)

- **Cost Awareness:** Coi băng thông, lưu trữ và I/O là chi phí thực tế ($), không phải tài nguyên miễn phí.
- **Purpose Driven:** Không gọi API, DB hoặc lưu data nếu không phục vụ mục đích hiện tại rõ ràng.
- **No Waste:** Data không có consumer là rác (Waste). Không log/audit những thứ không ai dùng.

### Safety & Stability

- **Correctness First:** Code phải đúng trước khi tối ưu.
- **Minimize Blast Radius:** Hạn chế phạm vi ảnh hưởng của lỗi.
- **No Hidden Changes:** Mọi thay đổi phải rõ ràng.
- **Ask Before Assuming:** Nếu không chắc chắn, hãy hỏi lại hoặc verify.

## 3. Technology Stack Rules

### TypeScript / ESLint

- ⛔ **NO `any`:** Tuyệt đối không dùng `any`.
  - Thay thế bằng: `interface`, `type`, Generic `<T>`, hoặc `unknown` + Type Guard.
- **Error Handling:**
  ```typescript
  // ✅ BEST PRACTICE
  try {
    // ... logic
  } catch (err) {
    // Luôn kiểm tra instance của Error
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    alert(message);
  }
  ```

### Next.js Framework

- **Navigation:** Sử dụng `<Link>` từ `next/link` thay vì thẻ `<a>` cho internal links.
- **Images:** Sử dụng `next/image` để tận dụng optimization.

### Tailwind CSS (v4+)

- Dùng `bg-linear-to-*` (thay vì `bg-gradient-to-*`).
- Dùng `rounded-4xl` (thay vì `rounded-[32px]`).
- Ưu tiên **Utility Classes** có sẵn, hạn chế dùng arbitrary values `[value]`.

## 4. Database Optimization (7 Rules)

1.  **Filter tại DB:** Không fetch all rồi filter JS. Không dùng `.collect()` vô tội vạ.
2.  **No N+1 Problems:**
    - Không gọi DB trong vòng lặp.
    - Dùng `Promise.all()` hoặc `Map` (lookup O(1)) để xử lý batch.
3.  **Always Index:** Mọi field dùng filter/sort phải có index. Ưu tiên Selectivity cao.
4.  **Limit & Pagination:** Mặc định limit 20 (max 100-500). Ưu tiên cursor-based pagination.
5.  **Select Required Fields:** Chỉ `SELECT` cột cần thiết (Projection). Không `SELECT *`.
6.  **Parallel Loading:** Dùng `Promise.all()` cho các query độc lập.
7.  **Monitor:** Cảnh báo các query > 1s. Tính toán: Records × Size × Requests/day.

## 5. Problem-Solving Framework (DARE)

Khi giải quyết vấn đề phức tạp, áp dụng quy trình và format sau:

1.  **D**ecompose: Vẽ đồ thị vấn đề, tìm Root Cause.
2.  **A**nalyze: Thought -> Action -> Observation.
3.  **R**eflect: Tự phản biện (Critique) sau mỗi bước.
4.  **E**xecute: Giải quyết từ dưới lên (Bottom-up).

**Output Format:**

```markdown
## Problem Graph

1. [Main] <- depends on 1.1, 1.2
   1.1 [Sub] <- depends on 1.1.1
   1.1.1 [ROOT CAUSE] <- Solve first

## Execution (with reflection)

1. Solving 1.1.1...
   - Thought: ...
   - Action: ...
   - Reflection: ✓ Valid / ✗ Retry

## 6. Spec Mode Rules

Khi ở chế độ Spec (read-only planning):

- Bắt buộc dùng DARE framework: Decompose → Analyze → Reflect → Execute plan.
- Dùng AskUser để làm rõ mọi điểm mơ hồ TRƯỚC khi chốt spec; không đoán requirement.Đưa ra Option khi ASK USER với các (Recommend) ,... và lý do rõ ràng giúp người dùng dễ chọn và dễ hiểu lý do, feynman nếu thấy phức tạp.
- Plan phải chi tiết từng bước (step-by-step actionable), đủ để implement xong trong 1 lần — KHÔNG chia phase/giai đoạn.
- Mỗi bước ghi rõ: file nào, thay đổi gì, logic cụ thể; ai đọc plan cũng tự implement được.
- Ưu tiên full implement > incremental; nếu scope quá lớn thì AskUser để user quyết cắt scope, không tự ý chia phase.
- Cuối spec phải có phần chốt lại thật dễ hiểu cho User, trình bài checklist, Best practice ra
- Tự WebSearch và đọc kỹ codebase để đưa ra Best Practice với dự án cho User để tăng sức mạnh và trọng lượng khi ASK USER để khiến người dùng nhẹ nhàng hơn nhưng vẫn phải chuẩn chỉ Best Practice# Spec Mode Rules
  Khi ở chế độ Spec (read-only planning):
- Bắt buộc dùng DARE framework: Decompose → Analyze → Reflect → Execute plan.
- Dùng AskUser để làm rõ mọi điểm mơ hồ TRƯỚC khi chốt spec; không đoán requirement.Đưa ra Option khi ASK USER với các (Recommend) ,... và lý do rõ ràng giúp người dùng dễ chọn và dễ hiểu lý do, feynman nếu thấy phức tạp.
- Plan phải chi tiết từng bước (step-by-step actionable), đủ để implement xong trong 1 lần — KHÔNG chia phase/giai đoạn.
- Mỗi bước ghi rõ: file nào, thay đổi gì, logic cụ thể; ai đọc plan cũng tự implement được.
- Ưu tiên full implement > incremental; nếu scope quá lớn thì AskUser để user quyết cắt scope, không tự ý chia phase.
- Cuối spec phải có phần chốt lại thật dễ hiểu cho User, trình bài checklist, Best practice ra
- Tự WebSearch và đọc kỹ codebase để đưa ra Best Practice với dự án cho User để tăng sức mạnh và trọng lượng khi ASK USER để khiến người dùng nhẹ nhàng hơn nhưng vẫn phải chuẩn chỉ Best Practice
```

## 7. Audit-First Operating Rule

- Luôn Audit trước khi fix/debug/đề xuất giải pháp: Audit → Root Cause → Fix/Proposal → Verify.
- Mọi kết luận phải có evidence (log, code path, repro, metric, history). Thiếu evidence thì nêu rõ gap + cách lấy evidence.
- Trigger Audit khi gặp các từ khóa: fix, bug, lỗi, root cause, spec, optimize, refactor.

## 8. UX rule

cut text in half, then half again

## 9. Final Verification

Trước khi hoàn tất, chạy các lệnh kiểm tra sau để đảm bảo không lỗi deploy:
Type Check:

- bunx tsc --project frontend/tsconfig.json --noEmit
- bunx tsc --project backend/tsconfig.json --noEmit
  Linting: - bunx oxlint --type-aware --type-check --fix
  Bun Cache Troubleshooting:
  Nếu bunx lỗi: Remove-Item -Recurse -Force $env:LOCALAPPDATA\Temp\bunx-\* hoặc chạy bun install.
