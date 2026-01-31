 ---
 sidebar_position: 2
 ---
 
 # Setup Development Environment
 
 Hướng dẫn chi tiết setup môi trường development cho My Lingerie Shop.
 
 ## Prerequisites
 
 ### Required
 
 - **Node.js**: v18.0.0 trở lên
 - **npm**: v9.0.0 trở lên
 - **PostgreSQL**: v14.0 trở lên
 - **Redis**: v6.0 trở lên (optional, for caching)
 - **Git**: Latest version
 
 ### Recommended
 
 - **VS Code** với extensions:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - Prisma
 
 ## Step-by-Step Setup
 
 ### 1. Clone Repository
 
 ```bash
 git clone https://github.com/zizi0209/my-lingerie-shop.git
 cd my-lingerie-shop
 ```
 
 ### 2. Install Dependencies
 
 ```bash
 # Root dependencies
 npm install
 
 # Frontend dependencies
 cd frontend
 npm install
 
 # Backend dependencies
 cd ../backend
 npm install
 ```
 
 ### 3. Setup PostgreSQL
 
 **Option A: Local PostgreSQL**
 
 ```bash
 # Create database
 createdb my_lingerie_shop
 
 # Create user (optional)
psql -c "CREATE USER lingerie_admin WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
 psql -c "GRANT ALL PRIVILEGES ON DATABASE my_lingerie_shop TO lingerie_admin;"
 ```
 
 **Option B: Docker**
 
 ```bash
 docker run --name postgres-lingerie \
   -e POSTGRES_DB=my_lingerie_shop \
   -e POSTGRES_USER=lingerie_admin \
  -e POSTGRES_PASSWORD=CHANGE_THIS \
   -p 5432:5432 \
   -d postgres:14
 ```
 
 ### 4. Configure Environment Variables
 
 **Backend (.env)**
 
 ```bash
 cd backend
 cp .env.example .env
 ```
 
 Edit `backend/.env`:
 
 ```env
 # Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/my_lingerie_shop"
 
 # Session
SESSION_SECRET="REPLACE_WITH_RANDOM_SECRET_STRING"
 
 # Redis (optional)
 REDIS_URL="redis://localhost:6379"
 
 # Server
 PORT=3001
 NODE_ENV=development
 
 # CORS
 FRONTEND_URL="http://localhost:3000"
 ```
 
 **Frontend (.env.local)**
 
 ```bash
 cd ../frontend
 cp .env.example .env.local
 ```
 
 Edit `frontend/.env.local`:
 
 ```env
 # API
 NEXT_PUBLIC_API_URL=http://localhost:3001
 
 # NextAuth
NEXTAUTH_SECRET=REPLACE_WITH_RANDOM_SECRET
 NEXTAUTH_URL=http://localhost:3000
 ```
 
 ### 5. Run Database Migrations
 
 ```bash
 cd backend
 npx prisma migrate dev
 ```
 
 ### 6. Seed Database
 
 ```bash
 npm run seed
 ```
 
 ### 7. Start Development Servers
 
 **Terminal 1 - Backend:**
 
 ```bash
 cd backend
 npm run dev
 ```
 
 **Terminal 2 - Frontend:**
 
 ```bash
 cd frontend
 npm run dev
 ```
 
 ## Verify Installation
 
 1. Frontend: http://localhost:3000
 2. Backend API: http://localhost:3001
3. Test login với (demo account):
    - Email: `admin@example.com`
   - Password: `admin123` (change in production!)
 
 ## Common Issues
 
 ### Port already in use
 
 ```bash
 # Kill process on port 3000
 npx kill-port 3000
 
 # Kill process on port 3001
 npx kill-port 3001
 ```
 
 ### Prisma connection error
 
 ```bash
 # Reset Prisma client
 cd backend
 npx prisma generate
 ```
 
 ### Redis connection error
 
 Redis là optional. Nếu không có Redis, comment dòng `REDIS_URL` trong `.env`
 
 ## Next Steps
 
 - [Architecture Overview](./architecture/overview)
 - [Testing Guide](./testing/overview)
 - [API Reference](../api-reference/intro)
