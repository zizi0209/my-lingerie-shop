import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import { Prisma } from '@prisma/client';

dotenv.config();

const validateRedisEnv = () => {
  if (process.env.SEARCH_ENGINE !== 'redis_hybrid') return;
  const redisUrl = process.env.REDIS_URL || '';
  if (!redisUrl) {
    console.warn('[Config][High] SEARCH_ENGINE=redis_hybrid nhưng thiếu REDIS_URL');
    return;
  }
  if (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
    console.warn('[Config][High] REDIS_URL đang trỏ localhost; kiểm tra backend có cùng network với Redis');
  }
};

const validateEmbeddingEnv = () => {
  const searchEngine = process.env.SEARCH_ENGINE || 'postgres';
  if (searchEngine !== 'redis_hybrid' && searchEngine !== 'pgvector') return;

  const provider = process.env.EMBEDDING_PROVIDER || 'worker';
  const apiKey = process.env.EMBEDDING_API_KEY || '';
  const model = process.env.EMBEDDING_MODEL || '';
  const serviceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8081';

  if (provider === 'disabled') {
    console.warn('[Config][High] EMBEDDING_PROVIDER=disabled nhưng SEARCH_ENGINE yêu cầu semantic search');
    return;
  }

  if (provider === 'worker') {
    if (!serviceUrl) {
      console.warn('[Config][High] EMBEDDING_PROVIDER=worker nhưng thiếu EMBEDDING_SERVICE_URL');
      return;
    }
    if (serviceUrl.includes('localhost') || serviceUrl.includes('127.0.0.1')) {
      console.warn('[Config][High] EMBEDDING_SERVICE_URL đang trỏ localhost; cần service embedding khả dụng');
    }
    return;
  }

  if (!apiKey || !model) {
    console.warn('[Config][High] EMBEDDING_PROVIDER=managed nhưng thiếu EMBEDDING_API_KEY hoặc EMBEDDING_MODEL');
  }
};

// Import routes & config AFTER dotenv.config()
import authRoutes from './routes/authRoutes';
import mediaRoutes from './routes/mediaRoutes';
import userRoutes from './routes/userRoutes';
import { startCleanupCron } from './cron/cleanup.cron';
import categoryRoutes from './routes/categoryRoutes';
import colorRoutes from './routes/colorRoutes';
import productRoutes from './routes/productRoutes';
import pageSectionRoutes from './routes/pageSectionRoutes';
import postCategoryRoutes from './routes/postCategoryRoutes';
import postRoutes from './routes/postRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import trackingRoutes from './routes/trackingRoutes';
import filterRoutes from './routes/filterRoutes';
import reviewRoutes from './routes/reviewRoutes';
import contactRoutes from './routes/contactRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import couponRoutes from './routes/couponRoutes';
import searchRoutes from './routes/searchRoutes';
import sizeTemplateRoutes from './routes/sizeTemplateRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import adminRoutes from './routes/admin';
import publicConfigRoutes from './routes/publicConfig';
import aboutSectionRoutes from './routes/aboutSectionRoutes';
import aboutStatsRoutes from './routes/aboutStatsRoutes';
import productPostRoutes from './routes/productPostRoutes';
import backgroundRemovalRoutes from './routes/backgroundRemovalRoutes';
import seedRoutes from './routes/seedRoutes';
import sizeSystemV2Routes from './routes/size-system-v2.routes';
import virtualTryOnRoutes from './routes/virtualTryOnRoutes';
import { apiLimiter } from './middleware/rateLimiter';
import aiConsultantRoutes from './routes/aiConsultantRoutes';
import { startTripoSrHealthMonitor } from './services/tripoSrHealth';
import { prisma } from './lib/prisma';
import { getSearchIndexStatus } from './services/searchIndexing.service';
import { getEmbeddingHealth } from './services/embeddingClient';
import { getProvidersHealth } from './services/llm/llmOrchestrator';
import { ensureRedisReady } from './lib/redis';

const app = express();
const PORT = process.env.PORT || 3000;

validateRedisEnv();
validateEmbeddingEnv();

// Trust proxy - Required for Render deployment and rate limiting
// This allows Express to trust the X-Forwarded-* headers from Render's proxy
app.set('trust proxy', 1);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    const [dbCheck, indexStatus, embeddingHealth] = await Promise.all([
      prisma.$queryRaw<{ ok: number }[]>(Prisma.sql`SELECT 1 AS "ok"`),
      getSearchIndexStatus(),
      getEmbeddingHealth(),
    ]);

    const dbReady = Boolean(dbCheck[0]?.ok);
    const searchReady = 'ok' in indexStatus
      ? Boolean(indexStatus.ok)
      : indexStatus.status === 'ok';
    const embeddingReady = embeddingHealth.status === 'ok' || process.env.SEARCH_ENGINE === 'postgres';
    const providers = getProvidersHealth();
    const aiProvidersReady = providers.some((provider) => provider.configured);
    const redisReady = Boolean(await ensureRedisReady());
    const ready = dbReady && searchReady && embeddingReady && aiProvidersReady;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'OK' : 'NOT_READY',
      dbReady,
      searchReady,
      embeddingReady,
      aiProvidersReady,
      redisReady,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    res.status(503).json({ status: 'NOT_READY', error: message });
  }
});

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for API, enable for web apps
}));

// CORS
app.use(
  cors({
    // Cho phép Localhost (để bạn test) VÀ Domain trên Vercel
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://my-lingerie-shop.vercel.app",
      "https://lingerie.zyth.id.vn",
    ],
    credentials: true,
  })
);

// Static ONNX models (no CDN, same-origin hosting)
const onnxStaticDir = path.resolve(__dirname, '../public/onnx');
app.use(
  '/static/onnx',
  express.static(onnxStaticDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'public, max-age=60');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
 app.use(cookieParser());
// Public routes (no rate limit, no auth required)
app.use('/api/public/config', publicConfigRoutes);
app.use('/api/about-stats', aboutStatsRoutes);
app.use('/api/seed', seedRoutes); // Seed endpoints for initial data setup

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/page-sections', pageSectionRoutes);
app.use('/api/post-categories', postCategoryRoutes);
app.use('/api/about-sections', aboutSectionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api', couponRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/size-templates', sizeTemplateRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/product-posts', productPostRoutes);
app.use('/api/background-removal', backgroundRemovalRoutes);
app.use('/api/virtual-tryon', virtualTryOnRoutes);

app.use('/api/ai-consultant', aiConsultantRoutes);
// Size System V2 routes
app.use('/api', sizeSystemV2Routes);

// Admin routes (protected)
app.use('/api/admin', adminRoutes);

// Start cleanup cron jobs
if (process.env.ENABLE_CLEANUP_CRON !== 'false') {
  startCleanupCron();
}

startTripoSrHealthMonitor();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (_req, res) => {
  res.send("Hello from Lingerie Shop Backend!");
});

// Export app for testing
export default app;