<coding_guidelines>
Trả lời bằng Tiếng Việt
Chọn Best approve
Chọn Best practices

- Áp dụng Convenient over Configuration
- Áp dụng Explicit over Implicit
- Áp dụng DRY over WET

- Mọi thay đổi sau khi kiểm tra xong cần phải commit và TUYỆT ĐỐI KHÔNG được phép push

- Áp sticket QA & phân tích các vấn đề theo các mức (Critical, High, Medium, Low)

Intentional I/O:

- Do not call APIs, read/write databases, or store data unless it serves a clear, current purpose.
- Avoid collecting logs, audit records, or events that are not actively used.
- Treat bandwidth, storage, and I/O as real costs, not free resources.
- Data without a consumer is waste.

Tuân thủ nguyên tắc :

- Kiss
- YAGNI
- DRY
- Readability > Cleverness
- Correctness First
- Single Responsibility
- Minimize Blast Radius
- Explicit > Implicit
- Ask Before Assuming
- No Hidden Changes

## TypeScript/ESLint Rules

- KHÔNG dùng `any` type. Thay vào đó:
  - Dùng `unknown` rồi type guard: `if (err instanceof Error)`
  - Định nghĩa interface/type cụ thể
  - Dùng generic type `<T>`

- Khi catch error:

  ```typescript
  // SAI
  } catch (err: any) {
    alert(err.message);
  }

  // ĐÚNG
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    alert(message);
  }
  ```

## Next.js Rules

- Dùng `<Link>` từ `next/link` thay vì `<a>` cho internal navigation
- Dùng `next/image` cho images với optimization

## Tailwind CSS Rules (v4+)

- Dùng `bg-linear-to-*` thay vì `bg-gradient-to-*`
- Dùng `rounded-4xl` thay vì `rounded-[32px]`
- Ưu tiên utility classes có sẵn thay vì arbitrary values `[value]`

Sau khi làm xong, cần check lại, đảm bảo không còn lỗi khi deploy:

- bunx tsc --project frontend/tsconfig.json --noEmit
- bunx tsc --project backend/tsconfig.json --noEmit
  </coding_guidelines>
