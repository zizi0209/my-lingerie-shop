<coding_guidelines>
Trả lời bằng Tiếng Việt
Chọn Best approve
Chọn Best practice

Tuân thủ nguyên tắc :

- Kiss
- YAGNI
- DRY

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
