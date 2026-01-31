---
sidebar_position: 1
---

# Architecture Overview

High-level overview of the Lingerie Shop application architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   User Web   │  │    Admin     │  │    Mobile    │      │
│  │     App      │  │  Dashboard   │  │  (Future)    │      │
│  │  (Next.js)   │  │  (Next.js)   │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       API GATEWAY                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Express.js REST API                        │ │
│  │  - Authentication (JWT)                                │ │
│  │  - Rate Limiting                                       │ │
│  │  - Request Validation                                  │ │
│  │  - CORS Configuration                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
┌─────────▼───────┐ ┌───────▼──────┐ ┌───────▼──────┐
│   Business      │ │   Size       │ │   Payment    │
│   Logic Layer   │ │   System     │ │   Services   │
│                 │ │   Services   │ │              │
│ - Products      │ │ - Sister     │ │ - COD        │
│ - Orders        │ │   Sizing     │ │ - VNPay      │
│ - Users         │ │ - Regional   │ │ - Stripe     │
│ - Categories    │ │   Convert    │ │   (Future)   │
└─────────┬───────┘ └───────┬──────┘ └───────┬──────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  Cloudinary  │      │
│  │              │  │              │  │              │      │
│  │  - Prisma    │  │  - Caching   │  │  - Images    │      │
│  │    ORM       │  │  - Sessions  │  │  - Videos    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form
- **Rich Text**: Lexical Editor
- **Authentication**: NextAuth.js

### Backend

- **Runtime**: Bun
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator

### Database

- **Primary Database**: PostgreSQL (Railway)
- **Caching**: Redis
- **File Storage**: Cloudinary

### DevOps

- **Deployment**: Railway
- **CI/CD**: GitHub Actions (planned)
- **Monitoring**: Railway Metrics
- **Documentation**: Docusaurus

## Project Structure

```
my-lingerie-shop/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & API clients
│   │   ├── hooks/        # Custom React hooks
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
│
├── backend/              # Express.js API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── utils/        # Utilities
│   │   └── index.ts      # Entry point
│   └── prisma/           # Database schema & migrations
│
├── documentation/        # Docusaurus site
│   ├── docs/            # Documentation content
│   └── src/             # Docusaurus config
│
├── e2e/                 # End-to-end tests
└── docs/                # Legacy documentation
```

## Data Flow

### User Request Flow

```
1. User → Frontend (Next.js)
   ↓
2. Frontend → API Request (fetch/axios)
   ↓
3. API Gateway → Middleware (Auth, Rate Limit, Validation)
   ↓
4. Router → Controller
   ↓
5. Controller → Service Layer
   ↓
6. Service → Database (Prisma ORM)
   ↓
7. Database → Returns Data
   ↓
8. Service → Process Data
   ↓
9. Controller → Format Response
   ↓
10. API → JSON Response
    ↓
11. Frontend → Update UI
```

## Authentication Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│  User   │                │Frontend │                │  Backend │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │  1. Login Credentials    │                          │
     │─────────────────────────→│                          │
     │                          │                          │
     │                          │  2. POST /api/users/login│
     │                          │─────────────────────────→│
     │                          │                          │
     │                          │                          │  3. Validate
     │                          │                          │     Credentials
     │                          │                          │
     │                          │     4. JWT Token         │
     │                          │←─────────────────────────│
     │                          │                          │
     │   5. Store Token         │                          │
     │   (localStorage/cookie)  │                          │
     │                          │                          │
     │  6. Subsequent Requests  │                          │
     │                          │  Headers:                │
     │                          │  Authorization:          │
     │                          │  Bearer <token>          │
     │                          │─────────────────────────→│
     │                          │                          │
     │                          │                          │  7. Verify JWT
     │                          │                          │
     │                          │     8. Protected Data    │
     │                          │←─────────────────────────│
     │                          │                          │
```

## Size System Architecture

The size system is one of the most complex features:

```
┌──────────────────────────────────────────────────────────┐
│                  SIZE SYSTEM SERVICES                     │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐          │
│  │  Sister Sizing     │  │  Cup Progression   │          │
│  │  Service           │  │  Service           │          │
│  │                    │  │                    │          │
│  │  - Find sisters    │  │  - Convert cups    │          │
│  │  - Same cup vol    │  │  - Region mapping  │          │
│  │  - Band +/- 1      │  │  - US/UK/EU/FR/AU  │          │
│  └────────────────────┘  └────────────────────┘          │
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐          │
│  │  Brand Fit         │  │  Region Detection  │          │
│  │  Service           │  │  Service           │          │
│  │                    │  │                    │          │
│  │  - Runs small/big  │  │  - IP geolocation  │          │
│  │  - Adjust sizes    │  │  - User preference │          │
│  │  - Based on data   │  │  - Default region  │          │
│  └────────────────────┘  └────────────────────┘          │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## Performance Optimization

### Frontend

- Next.js ISR (Incremental Static Regeneration)
- Image optimization with next/image
- Code splitting and lazy loading
- Font optimization

### Backend

- Database query optimization
- Redis caching
- Connection pooling
- Response compression (gzip)

### Database

- Proper indexing
- Query optimization
- Materialized views (planned)

## Security Measures

- JWT authentication
- Rate limiting
- CORS configuration
- Input validation
- Password hashing with bcrypt
- Role-based access control

## Next Steps

- [Database Schema](./database) - Database structure details
- [API Reference](../../api-reference/introduction) - API documentation
- [Size System](../features/size-system) - Size system guide
