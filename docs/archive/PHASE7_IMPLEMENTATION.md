# Phase 7 Implementation Guide - Deployment & Production Readiness

## Overview

Phase 7 chuẩn bị ứng dụng cho **Production Deployment** với Docker containerization, environment management, monitoring, backup strategies, và production best practices.

**Key Features:**
- Docker containerization (Backend + Frontend + Database)
- Docker Compose orchestration
- Environment configuration management
- Production-ready Nginx setup
- Database backup & migration strategies
- Monitoring & logging setup
- CI/CD pipeline suggestions
- Security hardening
- Performance optimization

## Prerequisites

✅ Phase 6 đã hoàn thành:
- Testing infrastructure
- Type safety validation
- Security testing

---

## Part 1: Docker Setup

### Step 1: Backend Dockerfile

**File: `backend/Dockerfile`** (NEW)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

**File: `backend/.dockerignore`** (NEW)

```
node_modules
dist
npm-debug.log
.env
.env.local
.env.*.local
coverage
*.test.ts
src/tests
.git
.gitignore
README.md
uploads/*
!uploads/.gitkeep
```

### Step 2: Frontend Dockerfile

**File: `frontend/Dockerfile`** (NEW)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js
CMD ["npm", "start"]
```

**File: `frontend/.dockerignore`** (NEW)

```
node_modules
.next
.git
.gitignore
README.md
npm-debug.log
.env
.env.local
.env.*.local
coverage
*.test.ts
*.test.tsx
src/tests
```

### Step 3: Docker Compose Configuration

**File: `docker-compose.yml`** (NEW - root level)

```yaml
version: '3.9'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: lingerie-shop-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-lingerie_shop}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - lingerie-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: lingerie-shop-backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_NAME:-lingerie_shop}
      JWT_SECRET: ${JWT_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    ports:
      - "${BACKEND_PORT:-5000}:5000"
    networks:
      - lingerie-network

  # Frontend Next.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lingerie-shop-frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:5000/api}
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    networks:
      - lingerie-network

  # Nginx Reverse Proxy (Optional - for production)
  nginx:
    image: nginx:alpine
    container_name: lingerie-shop-nginx
    restart: unless-stopped
    depends_on:
      - backend
      - frontend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - lingerie-network

volumes:
  postgres_data:
    driver: local

networks:
  lingerie-network:
    driver: bridge
```

### Step 4: Nginx Configuration

**File: `nginx/nginx.conf`** (NEW)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    server {
        listen 80;
        server_name localhost;

        client_max_body_size 10M;

        # Rate limiting
        limit_req zone=general_limit burst=20 nodelay;

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API
        location /api {
            limit_req zone=api_limit burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # HTTPS (uncomment when you have SSL certificates)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #
    #     # SSL configuration
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_prefer_server_ciphers on;
    #     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    #
    #     # ... same proxy config as HTTP
    # }
}
```

---

## Part 2: Environment Configuration

### Step 1: Environment Template

**File: `.env.example`** (NEW - root level)

```bash
# Application
NODE_ENV=production

# Database
DB_NAME=lingerie_shop
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_HOST=db
DB_PORT=5432
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Backend
BACKEND_PORT=5000
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Backup
BACKUP_DIR=/backup
BACKUP_RETENTION_DAYS=7
```

### Step 2: Production Environment Setup Script

**File: `scripts/setup-env.sh`** (NEW)

```bash
#!/bin/bash

echo "🚀 Setting up production environment..."

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backup will be created."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy .env.example to .env
cp .env.example .env

echo "✅ .env file created from template"
echo ""
echo "⚠️  IMPORTANT: Edit .env and update the following:"
echo "   - DB_PASSWORD"
echo "   - JWT_SECRET"
echo "   - CLOUDINARY credentials"
echo "   - CORS_ORIGIN (your production domain)"
echo ""
echo "Generate JWT secret with:"
echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
```

**File: `scripts/setup-env.ps1`** (NEW - Windows PowerShell)

```powershell
Write-Host "🚀 Setting up production environment..." -ForegroundColor Green

# Check if .env exists
if (Test-Path .env) {
    Write-Host "⚠️  .env file already exists. Backup will be created." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item .env ".env.backup.$timestamp"
}

# Copy .env.example to .env
Copy-Item .env.example .env

Write-Host "✅ .env file created from template" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Edit .env and update the following:" -ForegroundColor Yellow
Write-Host "   - DB_PASSWORD"
Write-Host "   - JWT_SECRET"
Write-Host "   - CLOUDINARY credentials"
Write-Host "   - CORS_ORIGIN (your production domain)"
Write-Host ""
Write-Host "Generate JWT secret with:" -ForegroundColor Cyan
Write-Host '   node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"'
```

---

## Part 3: Database Backup & Migration

### Step 1: Backup Script

**File: `scripts/backup-db.sh`** (NEW)

```bash
#!/bin/bash

# Configuration
BACKUP_DIR=${BACKUP_DIR:-./backup}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER=${DB_CONTAINER:-lingerie-shop-db}
DB_NAME=${DB_NAME:-lingerie_shop}
DB_USER=${DB_USER:-postgres}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "🔄 Starting database backup..."

# Perform backup
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup completed: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
    
    # Remove old backups
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "✅ Old backups removed (older than $RETENTION_DAYS days)"
else
    echo "❌ Backup failed"
    exit 1
fi

# List recent backups
echo ""
echo "📦 Recent backups:"
ls -lh $BACKUP_DIR/backup_*.sql.gz | tail -5
```

**File: `scripts/backup-db.ps1`** (NEW - Windows PowerShell)

```powershell
# Configuration
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backup" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$DB_CONTAINER = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "lingerie-shop-db" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "lingerie_shop" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$RETENTION_DAYS = if ($env:BACKUP_RETENTION_DAYS) { $env:BACKUP_RETENTION_DAYS } else { 7 }

# Create backup directory
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Backup filename
$BACKUP_FILE = "$BACKUP_DIR\backup_${DB_NAME}_${TIMESTAMP}.sql"

Write-Host "🔄 Starting database backup..." -ForegroundColor Cyan

# Perform backup
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME | Out-File -FilePath $BACKUP_FILE -Encoding UTF8

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completed: $BACKUP_FILE" -ForegroundColor Green
    
    # Compress backup (requires 7-Zip or similar)
    # Compress-Archive -Path $BACKUP_FILE -DestinationPath "${BACKUP_FILE}.zip"
    # Remove-Item $BACKUP_FILE
    
    # Remove old backups
    Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RETENTION_DAYS) } | 
        Remove-Item
    
    Write-Host "✅ Old backups removed (older than $RETENTION_DAYS days)" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed" -ForegroundColor Red
    exit 1
}

# List recent backups
Write-Host ""
Write-Host "📦 Recent backups:" -ForegroundColor Cyan
Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### Step 2: Restore Script

**File: `scripts/restore-db.sh`** (NEW)

```bash
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./restore-db.sh <backup_file>"
    echo "Example: ./restore-db.sh ./backup/backup_lingerie_shop_20260101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1
DB_CONTAINER=${DB_CONTAINER:-lingerie-shop-db}
DB_NAME=${DB_NAME:-lingerie_shop}
DB_USER=${DB_USER:-postgres}

echo "⚠️  WARNING: This will restore database from backup"
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_FILE"
read -p "Continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Restoring database..."

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
else
    cat $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
fi

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Restore failed"
    exit 1
fi
```

---

## Part 4: Deployment Scripts

### Step 1: Production Build Script

**File: `scripts/build.sh`** (NEW)

```bash
#!/bin/bash

echo "🏗️  Building production images..."

# Build backend
echo "📦 Building backend..."
docker build -t lingerie-shop-backend:latest ./backend

# Build frontend
echo "📦 Building frontend..."
docker build -t lingerie-shop-frontend:latest ./frontend

echo "✅ Build completed"
echo ""
echo "🚀 To start the application:"
echo "   docker-compose up -d"
```

**File: `scripts/build.ps1`** (NEW - Windows PowerShell)

```powershell
Write-Host "🏗️  Building production images..." -ForegroundColor Green

# Build backend
Write-Host "📦 Building backend..." -ForegroundColor Cyan
docker build -t lingerie-shop-backend:latest ./backend

# Build frontend
Write-Host "📦 Building frontend..." -ForegroundColor Cyan
docker build -t lingerie-shop-frontend:latest ./frontend

Write-Host "✅ Build completed" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start the application:" -ForegroundColor Yellow
Write-Host "   docker-compose up -d"
```

### Step 2: Deploy Script

**File: `scripts/deploy.sh`** (NEW)

```bash
#!/bin/bash

set -e

echo "🚀 Deploying Lingerie Shop..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Run ./scripts/setup-env.sh first"
    exit 1
fi

# Backup database before deployment
echo "📦 Creating database backup..."
./scripts/backup-db.sh

# Pull latest code (if using git)
# git pull origin main

# Build images
echo "🏗️  Building images..."
docker-compose build --no-cache

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose down

# Start new containers
echo "▶️  Starting new containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo "🏥 Checking service health..."
docker-compose ps

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy

echo "✅ Deployment completed!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "   Backend:  http://localhost:${BACKEND_PORT:-5000}"
echo "   API Health: http://localhost:${BACKEND_PORT:-5000}/api/health"
```

### Step 3: Health Check Script

**File: `scripts/health-check.sh`** (NEW)

```bash
#!/bin/bash

BACKEND_URL=${BACKEND_URL:-http://localhost:5000}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

echo "🏥 Performing health checks..."
echo ""

# Backend health check
echo "🔧 Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BACKEND_URL}/api/health)

if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend is healthy (${BACKEND_STATUS})"
else
    echo "❌ Backend is unhealthy (${BACKEND_STATUS})"
fi

# Frontend health check
echo ""
echo "🖥️  Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL})

if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend is healthy (${FRONTEND_STATUS})"
else
    echo "❌ Frontend is unhealthy (${FRONTEND_STATUS})"
fi

# Database health check
echo ""
echo "🗄️  Database..."
docker exec lingerie-shop-db pg_isready -U postgres > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database is healthy"
else
    echo "❌ Database is unhealthy"
fi

# Container status
echo ""
echo "📦 Container Status:"
docker-compose ps
```

---

## Part 5: Monitoring & Logging

### Step 1: Logging Configuration

**File: `backend/src/utils/logger.ts`** (NEW)

```typescript
import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: unknown;
}

class Logger {
  private logFile: string;
  private errorFile: string;

  constructor() {
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(LOG_DIR, `app-${date}.log`);
    this.errorFile = path.join(LOG_DIR, `error-${date}.log`);
  }

  private formatLog(entry: LogEntry): string {
    const meta = entry.meta ? ` | ${JSON.stringify(entry.meta)}` : '';
    return `[${entry.timestamp}] ${entry.level}: ${entry.message}${meta}\n`;
  }

  private writeToFile(file: string, content: string): void {
    fs.appendFileSync(file, content, 'utf8');
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    const formatted = this.formatLog(entry);

    // Console output (with colors in dev)
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m', // Yellow
        INFO: '\x1b[36m', // Cyan
        DEBUG: '\x1b[90m', // Gray
      };
      console.log(`${colors[level]}${formatted}\x1b[0m`);
    }

    // Write to file
    this.writeToFile(this.logFile, formatted);

    // Write errors to separate file
    if (level === LogLevel.ERROR) {
      this.writeToFile(this.errorFile, formatted);
    }
  }

  error(message: string, meta?: unknown): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log(LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }
}

export const logger = new Logger();
```

### Step 2: Request Logging Middleware

**File: `backend/src/middleware/requestLogger.ts`** (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}
```

---

## Part 6: Production Checklist

### Security Checklist

- [ ] Environment variables properly configured
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database password is strong
- [ ] CORS origins are restricted to production domains
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active
- [ ] HTTPS is configured (SSL certificates)
- [ ] SQL injection protection (Prisma parameterized queries)
- [ ] XSS protection enabled
- [ ] File upload validation and sanitization
- [ ] Audit logging for sensitive operations

### Performance Checklist

- [ ] Database indexes are optimized
- [ ] Static assets have caching headers
- [ ] Image optimization (Cloudinary/Sharp)
- [ ] API response compression
- [ ] Database connection pooling
- [ ] CDN for static assets (optional)
- [ ] Load testing completed

### Reliability Checklist

- [ ] Database backups automated
- [ ] Health check endpoints implemented
- [ ] Graceful shutdown handling
- [ ] Error monitoring setup
- [ ] Log aggregation configured
- [ ] Container restart policies configured
- [ ] Database migration strategy defined

### Documentation Checklist

- [ ] API documentation (Postman/Swagger)
- [ ] Deployment guide
- [ ] Environment configuration guide
- [ ] Backup & restore procedures
- [ ] Monitoring & alerting setup
- [ ] Troubleshooting guide

---

## Part 7: CI/CD Pipeline (Optional)

### GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`** (NEW)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run type checks
        run: npm run typecheck
      
      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: your-username/lingerie-shop-backend:latest
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: your-username/lingerie-shop-frontend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /path/to/app
            docker-compose pull
            docker-compose up -d
            docker-compose exec backend npx prisma migrate deploy
```

---

## Quick Start Commands

### Development

```bash
# Start all services in development
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Production

```bash
# Setup environment
./scripts/setup-env.sh

# Build images
./scripts/build.sh

# Deploy
./scripts/deploy.sh

# Health check
./scripts/health-check.sh

# Backup database
./scripts/backup-db.sh

# Restore database
./scripts/restore-db.sh backup/backup_file.sql.gz
```

---

## ✅ Phase 7 Checklist

### Docker Setup
- [ ] Backend Dockerfile created
- [ ] Frontend Dockerfile created
- [ ] .dockerignore files created
- [ ] docker-compose.yml configured
- [ ] Nginx configuration created
- [ ] Test Docker builds

### Environment Configuration
- [ ] .env.example created
- [ ] Setup scripts created (Linux + Windows)
- [ ] Environment validation
- [ ] Secrets management strategy

### Backup & Recovery
- [ ] Backup scripts created
- [ ] Restore scripts created
- [ ] Backup automation configured
- [ ] Test backup/restore process

### Deployment
- [ ] Build scripts created
- [ ] Deploy scripts created
- [ ] Health check scripts created
- [ ] Rollback strategy defined

### Monitoring & Logging
- [ ] Logger utility created
- [ ] Request logging middleware
- [ ] Log rotation configured
- [ ] Monitoring dashboard (optional)

### Documentation
- [ ] Production deployment guide
- [ ] Environment configuration docs
- [ ] Backup procedures documented
- [ ] Troubleshooting guide

### Production Readiness
- [ ] Security checklist completed
- [ ] Performance checklist completed
- [ ] Reliability checklist completed
- [ ] Load testing performed

---

## Troubleshooting

### Issue: Docker build fails

**Solution:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Issue: Database connection fails

**Solution:**
- Check `DATABASE_URL` in `.env`
- Verify database container is running: `docker ps`
- Check database logs: `docker logs lingerie-shop-db`

### Issue: Frontend can't connect to backend

**Solution:**
- Verify `NEXT_PUBLIC_API_URL` in `.env`
- Check CORS configuration in backend
- Verify backend is healthy: `curl http://localhost:5000/api/health`

---

## Next Steps

Phase 7 hoàn tất! Bây giờ có:
- ✅ Docker containerization
- ✅ Production environment configuration
- ✅ Automated backup & restore
- ✅ Deployment scripts
- ✅ Monitoring & logging

**Post-Deployment:**
- Setup domain & SSL certificates
- Configure monitoring alerts
- Setup automated backups (cron jobs)
- Performance monitoring
- Security audits

---

**Phase 7 Complete! 🚀**

Application đã sẵn sàng deploy lên production!
