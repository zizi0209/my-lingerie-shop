# 🛍️ Lingerie E-commerce Platform

Full-stack e-commerce platform cho cửa hàng đồ lót với tính năng quản lý toàn diện.

## 📋 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components với Lexical Editor
- **State Management**: React Context API
- **i18n**: next-intl (Vietnamese/English)

### Backend
- **Runtime**: Node.js với Express
- **Language**: TypeScript
- **Database**: PostgreSQL với Prisma ORM
- **Authentication**: JWT
- **File Upload**: Cloudinary
- **Email**: Resend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Bun (recommended) hoặc npm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd my-lingerie-shop

# Install dependencies
bun install

# Setup database
cd backend
cp .env.example .env
# Cập nhật DATABASE_URL trong .env
bunx prisma migrate dev
bunx prisma db seed

# Start development
cd ..
bun run dev
```

## 📁 Project Structure

```
my-lingerie-shop/
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   ├── lib/      # Utilities
│   │   └── context/  # React contexts
│   └── public/
├── backend/           # Express backend
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── utils/
│   └── prisma/       # Database schema & migrations
├── docs/              # Documentation
│   ├── api/          # API documentation
│   ├── features/     # Feature specifications
│   ├── guides/       # Development guides
│   ├── setup/        # Setup instructions
│   ├── testing/      # Testing guides
│   └── archive/      # Archived documents
└── e2e/              # End-to-end tests
```

## 📚 Documentation

Tất cả documentation được tổ chức trong thư mục `docs/`:

- **API Docs**: `docs/api/` - API endpoints và usage
- **Features**: `docs/features/` - Feature specifications
- **Guides**: `docs/guides/` - Development guides
- **Setup**: `docs/setup/` - Setup và configuration
- **Testing**: `docs/testing/` - Testing strategies
- **Archive**: `docs/archive/` - Historical documents

### Key Documents
- [AGENTS.md](docs/AGENTS.md) - Coding guidelines và best practices
- [TODO.md](docs/TODO.md) - Project roadmap
- [DASHBOARD_API_GUIDE.md](docs/api/DASHBOARD_API_GUIDE.md) - Dashboard API
- [TESTING.md](docs/testing/TESTING.md) - Testing guide

## 🔧 Development

### Frontend
```bash
cd frontend
bun run dev          # Start dev server (http://localhost:3000)
bun run build        # Build for production
bun run lint         # Run ESLint
```

### Backend
```bash
cd backend
bun run dev          # Start dev server (http://localhost:5000)
bun run build        # Build TypeScript
bunx prisma studio   # Open Prisma Studio
```

### Type Checking
```bash
# Frontend
bunx tsc --project frontend/tsconfig.json --noEmit

# Backend
bunx tsc --project backend/tsconfig.json --noEmit
```

## 🧪 Testing

```bash
# E2E tests
bunx playwright test

# Unit tests (frontend)
cd frontend
bun test

# Unit tests (backend)
cd backend
bun test
```

## 🎨 Features

### Customer Features
- 🛒 Shopping cart với real-time updates
- 💳 Multiple payment methods
- 📦 Order tracking
- ⭐ Product reviews & ratings
- ❤️ Wishlist
- 🔍 Smart search với filters
- 📱 Responsive design
- 🌙 Dark mode
- 🌐 Multi-language (VI/EN)

### Admin Features
- 📊 Analytics dashboard
- 📦 Product management
- 🎫 Voucher/Coupon system
- 👥 User management
- 📝 Content management (Lexical Editor)
- 🖼️ Media library (Cloudinary)
- 📈 Sales tracking
- 🔐 Role-based access control

## 🔐 Security

- JWT authentication
- Rate limiting
- Input sanitization
- CSRF protection
- Secure file upload
- Audit logging

## 📝 Code Quality

### Guidelines
- **KISS**: Keep It Simple, Stupid
- **DRY**: Don't Repeat Yourself
- **YAGNI**: You Aren't Gonna Need It
- **Explicit > Implicit**
- **Readability > Cleverness**

### TypeScript Rules
- ❌ NO `any` type
- ✅ Use `unknown` với type guards
- ✅ Define proper interfaces/types
- ✅ Use generic types `<T>`

See [AGENTS.md](docs/AGENTS.md) for detailed guidelines.

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
bun run build
# Deploy to Vercel
```

### Backend (Railway/Render)
```bash
cd backend
bun run build
# Deploy to Railway/Render
```

## 📄 License

Private project - All rights reserved

## 👥 Contributors

- Development Team

## 📞 Support

For issues and questions, please check the documentation in `docs/` folder.
