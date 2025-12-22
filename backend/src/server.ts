import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import mediaRoutes from './routes/mediaRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware
app.use(
  cors({
    // Cho phép Localhost (để bạn test) VÀ Domain trên Vercel
    origin: [
      "http://localhost:3000",
      "https://my-lingerie-shop.vercel.app", // <-- Thay bằng link Vercel thực tế của bạn
    ],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/media', mediaRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Hello from Lingerie Shop Backend!");
});