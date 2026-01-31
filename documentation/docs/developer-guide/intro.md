 ---
 sidebar_position: 1
 ---
 
 # Developer Guide
 
 Chào mừng developers đến với My Lingerie Shop! Đây là tài liệu kỹ thuật toàn diện cho việc phát triển và bảo trì hệ thống.
 
 ## Tech Stack
 
 ### Frontend
 - **Framework**: Next.js 14 (App Router)
 - **Language**: TypeScript
 - **Styling**: Tailwind CSS
 - **State Management**: React Context + Zustand
 - **Authentication**: NextAuth.js
 
 ### Backend
 - **Runtime**: Node.js + Express
 - **Language**: TypeScript
 - **Database**: PostgreSQL
 - **ORM**: Prisma
 - **Cache**: Redis
 - **Session**: express-session + connect-redis
 
 ### Infrastructure
 - **Hosting**: 
   - Frontend: Vercel
   - Backend: Railway
 - **Database**: Railway PostgreSQL
 - **CDN**: Vercel Edge Network
 
 ## Project Structure
 
 ```
 my-lingerie-shop/
 ├── frontend/          # Next.js application
 │   ├── src/
 │   │   ├── app/       # App router pages
 │   │   ├── components/
 │   │   ├── lib/
 │   │   └── types/
 │   └── package.json
 │
 ├── backend/           # Express API
 │   ├── src/
 │   │   ├── routes/
 │   │   ├── controllers/
 │   │   ├── services/
 │   │   └── middleware/
 │   └── package.json
 │
 ├── documentation/     # Docusaurus docs
 └── e2e/              # Playwright tests
 ```
 
 ## Quick Start
 
 ### Prerequisites
 
 - Node.js 18+
 - PostgreSQL 14+
 - Redis 6+
 - npm hoặc yarn
 
 ### Installation
 
 ```bash
 # Clone repository
 git clone https://github.com/zizi0209/my-lingerie-shop.git
 cd my-lingerie-shop
 
 # Install dependencies
 npm install
 cd frontend && npm install
 cd ../backend && npm install
 
 # Setup environment
 cp backend/.env.example backend/.env
 cp frontend/.env.example frontend/.env
 
 # Run migrations
 cd backend
 npx prisma migrate dev
 
 # Seed database
 npm run seed
 
 # Start development
 npm run dev
 ```
 
 ## Development Workflow
 
 1. Tạo branch từ `master`
 2. Develop và test locally
 3. Run tests: `npm run test`
 4. Commit với conventional commits
 5. Tạo Pull Request
 6. Code review và merge
 
 ## Key Features
 
 - [Authentication System](./features/authentication)
 - [Size System V2](./features/size-system)
 - [Sister Sizing Algorithm](./features/sister-sizing)
 
 ## Resources
 
 - [Architecture Overview](./architecture/overview)
 - [API Documentation](../api-reference/intro)
 - [Testing Guide](./testing/overview)
