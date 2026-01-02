import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();

// Import routes & config AFTER dotenv.config()
import mediaRoutes from './routes/mediaRoutes';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import pageSectionRoutes from './routes/pageSectionRoutes';
import postCategoryRoutes from './routes/postCategoryRoutes';
import postRoutes from './routes/postRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import trackingRoutes from './routes/trackingRoutes';
import adminRoutes from './routes/admin';
import publicConfigRoutes from './routes/publicConfig';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
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
      "https://my-lingerie-shop.vercel.app", // <-- Thay bằng link Vercel thực tế của bạn
    ],
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no rate limit, no auth required)
app.use('/api/public/config', publicConfigRoutes);

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/media', mediaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/page-sections', pageSectionRoutes);
app.use('/api/post-categories', postCategoryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRoutes);

// Admin routes (protected)
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Hello from Lingerie Shop Backend!");
});