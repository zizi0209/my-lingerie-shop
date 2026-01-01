import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint
 * Prevents brute-force attacks
 * Max 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
      retryAfter: Math.ceil(15 * 60) // seconds
    });
  }
});

/**
 * Rate limiter for registration endpoint
 * Prevents mass account creation
 * Max 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Quá nhiều tài khoản được tạo. Vui lòng thử lại sau 1 giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều tài khoản được tạo từ IP này. Vui lòng thử lại sau 1 giờ.',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});

/**
 * Rate limiter for admin API endpoints
 * Max 100 requests per minute per IP
 */
export const adminApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Quá nhiều requests. Vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều requests đến admin API. Vui lòng thử lại sau 1 phút.',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiter for general API endpoints
 * Max 200 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  message: {
    error: 'Quá nhiều requests. Vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Strict rate limiter for sensitive operations
 * (password reset, email change, etc.)
 * Max 3 requests per hour per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Quá nhiều requests cho thao tác này. Vui lòng thử lại sau 1 giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều requests cho thao tác nhạy cảm này. Vui lòng thử lại sau 1 giờ.',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});

/**
 * Rate limiter for file uploads
 * Max 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Quá nhiều file uploads. Vui lòng thử lại sau 1 giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Quá nhiều file uploads. Vui lòng thử lại sau 1 giờ.',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
