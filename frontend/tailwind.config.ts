import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Cấu hình font chữ ở đây để dùng class font-sans và font-serif
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair)"],
      },
      colors: {
        // Bạn có thể định nghĩa thêm màu thương hiệu ở đây nếu thích
        // Ví dụ dùng class: text-primary
        primary: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e", // Màu hồng rose-500
          600: "#e11d48",
          900: "#881337",
        },
      },
    },
  },
  plugins: [],
};
export default config;
