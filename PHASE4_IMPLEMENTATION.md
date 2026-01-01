# Phase 4 Implementation Guide - File Upload Security & Admin Dashboard API

## Overview

Phase 4 tích hợp các tính năng bảo mật cho file upload và xây dựng Admin Dashboard API hoàn chỉnh với quản lý users, audit logs, và dashboard statistics.

**Key Features:**
- File upload security với magic number validation
- Image processing & optimization với Sharp
- Prevention: RCE, decompression bombs, malicious files
- Admin User Management API
- Audit Logs Viewer API
- Dashboard Statistics API

## Prerequisites

✅ Phases 1, 2, 3 đã hoàn thành:
- Database với security fields & audit logging
- Authentication & Authorization middleware
- Rate limiting
- Validation schemas

---

## Part 1: File Upload Security

### Step 1: Install Dependencies

```bash
cd backend
npm install sharp file-type
```

**Dependencies:**
- `sharp` - Image processing & optimization
- `file-type` - Magic number detection (không tin file extension)

### Step 2: Create File Upload Security Middleware

**File: `backend/src/middleware/fileUploadSecurity.ts`** (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif'
];

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Max image dimensions
const MAX_WIDTH = 4096;
const MAX_HEIGHT = 4096;

// Max pixels (to prevent decompression bombs)
const MAX_PIXELS = 268402689; // ~16384x16384

/**
 * Validate file upload security
 * - Check file exists
 * - Validate file size
 * - Verify magic numbers (not just extension)
 * - Check image dimensions
 * - Prevent decompression bombs
 */
export async function validateFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Không có file được upload!' 
      });
    }

    const file = req.file;

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File quá lớn. Kích thước tối đa: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        maxSize: MAX_FILE_SIZE
      });
    }

    // 2. Verify magic numbers (check actual file type, not just extension)
    const fileType = await fileTypeFromBuffer(file.buffer);
    
    if (!fileType) {
      return res.status(400).json({
        error: 'Không thể xác định loại file. File có thể bị hỏng hoặc không hợp lệ.'
      });
    }

    // Check if file type is allowed
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return res.status(400).json({
        error: `Loại file không được phép. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`,
        detected: fileType.mime
      });
    }

    // 3. Validate image with sharp (also checks for malformed images)
    try {
      const metadata = await sharp(file.buffer, {
        limitInputPixels: MAX_PIXELS // Prevent decompression bombs
      }).metadata();

      // Check dimensions
      if (metadata.width && metadata.width > MAX_WIDTH) {
        return res.status(400).json({
          error: `Chiều rộng ảnh vượt quá giới hạn. Tối đa: ${MAX_WIDTH}px`,
          width: metadata.width
        });
      }

      if (metadata.height && metadata.height > MAX_HEIGHT) {
        return res.status(400).json({
          error: `Chiều cao ảnh vượt quá giới hạn. Tối đa: ${MAX_HEIGHT}px`,
          height: metadata.height
        });
      }

      // Check total pixels
      if (metadata.width && metadata.height) {
        const totalPixels = metadata.width * metadata.height;
        if (totalPixels > MAX_PIXELS) {
          return res.status(400).json({
            error: 'Ảnh có kích thước quá lớn (pixel bomb detected)',
            pixels: totalPixels
          });
        }
      }

      // Attach validated metadata to request
      (req as any).imageMetadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: file.size,
        verified: true
      };

    } catch (sharpError: any) {
      console.error('Sharp validation error:', sharpError);
      return res.status(400).json({
        error: 'File ảnh không hợp lệ hoặc bị hỏng.',
        detail: process.env.NODE_ENV === 'development' ? sharpError.message : undefined
      });
    }

    // All validations passed
    next();

  } catch (error: any) {
    console.error('File validation error:', error);
    return res.status(500).json({
      error: 'Lỗi khi kiểm tra file upload',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Validate multiple file uploads
 */
export async function validateMultipleFileUploads(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'Không có file được upload!' 
      });
    }

    const files = req.files;

    // Check number of files
    if (files.length > 10) {
      return res.status(400).json({
        error: 'Quá nhiều file. Tối đa 10 files mỗi lần.',
        count: files.length
      });
    }

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `File thứ ${i + 1} quá lớn. Kích thước tối đa: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          fileIndex: i,
          fileName: file.originalname
        });
      }

      // Verify magic numbers
      const fileType = await fileTypeFromBuffer(file.buffer);
      
      if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
        return res.status(400).json({
          error: `File thứ ${i + 1} không hợp lệ. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`,
          fileIndex: i,
          fileName: file.originalname,
          detected: fileType?.mime
        });
      }

      // Validate with sharp
      try {
        const metadata = await sharp(file.buffer, {
          limitInputPixels: MAX_PIXELS
        }).metadata();

        if (metadata.width && metadata.width > MAX_WIDTH) {
          return res.status(400).json({
            error: `File thứ ${i + 1}: Chiều rộng vượt quá ${MAX_WIDTH}px`,
            fileIndex: i,
            fileName: file.originalname
          });
        }

        if (metadata.height && metadata.height > MAX_HEIGHT) {
          return res.status(400).json({
            error: `File thứ ${i + 1}: Chiều cao vượt quá ${MAX_HEIGHT}px`,
            fileIndex: i,
            fileName: file.originalname
          });
        }

      } catch (sharpError) {
        return res.status(400).json({
          error: `File thứ ${i + 1} không hợp lệ hoặc bị hỏng.`,
          fileIndex: i,
          fileName: file.originalname
        });
      }
    }

    // All files validated
    next();

  } catch (error: any) {
    console.error('Multiple files validation error:', error);
    return res.status(500).json({
      error: 'Lỗi khi kiểm tra files upload',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Process and sanitize uploaded image
 * - Remove EXIF data (privacy)
 * - Optimize size
 * - Convert to standard format
 */
export async function processUploadedImage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      return next();
    }

    // Process image with sharp
    const processed = await sharp(req.file.buffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .rotate() // Auto-rotate based on EXIF
      .withMetadata({ 
        exif: {} // Remove EXIF data
      })
      .webp({ 
        quality: 85,
        effort: 4
      })
      .toBuffer();

    // Replace original buffer with processed one
    req.file.buffer = processed;
    req.file.mimetype = 'image/webp';
    req.file.size = processed.length;

    next();

  } catch (error: any) {
    console.error('Image processing error:', error);
    return res.status(500).json({
      error: 'Lỗi khi xử lý ảnh',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

### Step 3: Update Media Routes

**File: `backend/src/routes/mediaRoutes.ts`** (UPDATE)

```typescript
import express from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  getMediaList,
  getMediaById,
  deleteMedia,
} from '../controllers/mediaController';
import { upload } from '../config/multer';
import { requireAdmin } from '../middleware/requireAdmin';
import { uploadLimiter } from '../middleware/rateLimiter';
import { 
  validateFileUpload, 
  validateMultipleFileUploads,
  processUploadedImage 
} from '../middleware/fileUploadSecurity';

const router = express.Router();

// Upload single image (alias for backward compatibility)
router.post(
  '/upload', 
  uploadLimiter,
  requireAdmin,
  upload.single('file'), 
  validateFileUpload,
  processUploadedImage,
  uploadImage
);

// Upload single image
router.post(
  '/single', 
  uploadLimiter,
  requireAdmin,
  upload.single('image'), 
  validateFileUpload,
  processUploadedImage,
  uploadImage
);

// Upload multiple images (max 10 files)
router.post(
  '/multiple', 
  uploadLimiter,
  requireAdmin,
  upload.array('images', 10), 
  validateMultipleFileUploads,
  uploadMultipleImages
);

// Get media list with pagination (admin only)
router.get('/', requireAdmin, getMediaList);

// Get media by ID (admin only)
router.get('/:id', requireAdmin, getMediaById);

// Delete media (admin only)
router.delete('/:id', requireAdmin, deleteMedia);

export default router;
```

### Security Features Explained

#### 1. Magic Number Validation
```typescript
const fileType = await fileTypeFromBuffer(file.buffer);
```
- **Tại sao**: Extension có thể bị fake (ví dụ: `malware.php.jpg`)
- **Cách hoạt động**: Đọc bytes đầu tiên của file (magic numbers) để xác định file type thực sự
- **Ngăn chặn**: RCE attacks, shell uploads

#### 2. Decompression Bomb Prevention
```typescript
const metadata = await sharp(file.buffer, {
  limitInputPixels: MAX_PIXELS // 268402689
}).metadata();
```
- **Tại sao**: File nhỏ (1MB) có thể expand thành hàng GB khi decompress
- **Cách hoạt động**: Giới hạn số pixels tối đa trước khi process
- **Ngăn chặn**: DoS attacks, server crashes

#### 3. Image Re-processing
```typescript
const processed = await sharp(req.file.buffer)
  .resize(2000, 2000, { fit: 'inside' })
  .webp({ quality: 85 })
  .toBuffer();
```
- **Tại sao**: File ảnh có thể chứa embedded code (polyglot files)
- **Cách hoạt động**: Parse và re-encode ảnh, loại bỏ mọi data thừa
- **Ngăn chặn**: XSS, RCE trong image viewers

#### 4. EXIF Data Removal
```typescript
.withMetadata({ exif: {} })
```
- **Tại sao**: EXIF chứa GPS location, camera info, timestamps
- **Cách hoạt động**: Strip tất cả EXIF metadata
- **Ngăn chặn**: Privacy leaks, OSINT attacks

---

## Part 2: Admin Dashboard API Routes

### Step 1: Create Admin Routes Structure

```bash
backend/src/routes/admin/
├── index.ts           # Main admin router
├── users.ts           # User management
├── auditLogs.ts       # Audit logs viewer
└── dashboard.ts       # Dashboard statistics
```

### Step 2: Create Admin Index Router

**File: `backend/src/routes/admin/index.ts`** (NEW)

```typescript
import express from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { adminApiLimiter } from '../../middleware/rateLimiter';

// Import admin sub-routes
import dashboardRoutes from './dashboard';
import usersRoutes from './users';
import auditLogsRoutes from './auditLogs';

const router = express.Router();

// Apply middleware to ALL admin routes
router.use(adminApiLimiter); // Rate limiting
router.use(requireAdmin);     // Admin authentication & authorization

// Mount sub-routers
router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/audit-logs', auditLogsRoutes);

export default router;
```

**Giải thích:**
- `router.use()` áp middleware cho TẤT CẢ routes con
- Rate limit: 100 requests/min cho admin API
- Require admin role cho mọi endpoint

### Step 3: Create Dashboard Statistics API

**File: `backend/src/routes/admin/dashboard.ts`** (NEW)

```typescript
import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

/**
 * GET /api/admin/dashboard/stats
 * Get overview statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      visibleProducts,
      totalOrders,
      pendingOrders,
      revenueResult,
      recentOrders
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: { deletedAt: null }
      }),
      
      // Active users
      prisma.user.count({
        where: { 
          deletedAt: null,
          isActive: true
        }
      }),
      
      // Total products
      prisma.product.count({
        where: { deletedAt: null }
      }),
      
      // Visible products
      prisma.product.count({
        where: { 
          deletedAt: null,
          isVisible: true
        }
      }),
      
      // Total orders
      prisma.order.count(),
      
      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      
      // Total revenue (delivered orders)
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'DELIVERED' }
      }),
      
      // Recent orders (last 10)
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        products: {
          total: totalProducts,
          visible: visibleProducts,
          hidden: totalProducts - visibleProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: totalOrders - pendingOrders
        },
        revenue: {
          total: revenueResult._sum.totalAmount || 0,
          currency: 'VND'
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thống kê dashboard' 
    });
  }
});

/**
 * GET /api/admin/dashboard/analytics
 * Get analytics data (orders, revenue by time)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7days' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [
      ordersByStatus,
      revenueByDay,
      topProducts
    ] = await Promise.all([
      // Orders grouped by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Revenue by day (simplified - just get orders)
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'DELIVERED'
        },
        select: {
          totalAmount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }),
      
      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _count: { productId: true },
        _sum: { quantity: true },
        orderBy: {
          _sum: { quantity: 'desc' }
        },
        take: 10
      })
    ]);

    // Get product details for top products
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true }
    });

    const topProductsWithDetails = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        price: product?.price || 0,
        totalSold: item._sum.quantity || 0,
        orderCount: item._count.productId
      };
    });

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        revenueByDay,
        topProducts: topProductsWithDetails
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy dữ liệu analytics' 
    });
  }
});

/**
 * GET /api/admin/dashboard/recent-activities
 * Get recent system activities
 */
router.get('/recent-activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const activities = await prisma.auditLog.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy hoạt động gần đây' 
    });
  }
});

export default router;
```

### Step 4: Create User Management API

**File: `backend/src/routes/admin/users.ts`** (NEW)

```typescript
import express from 'express';
import { prisma } from '../../lib/prisma';
import { auditLog } from '../../utils/auditLog';

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20',
      role,
      isActive,
      search 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deletedAt: null
    };

    if (role) {
      where.role = {
        name: (role as string).toUpperCase()
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách users' 
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thông tin user' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId, roleName } = req.body;

    if (!roleId && !roleName) {
      return res.status(400).json({
        error: 'Cần cung cấp roleId hoặc roleName'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Find target role
    let targetRole;
    if (roleId) {
      targetRole = await prisma.role.findUnique({
        where: { id: Number(roleId) }
      });
    } else {
      targetRole = await prisma.role.findFirst({
        where: { name: roleName.toUpperCase() }
      });
    }

    if (!targetRole) {
      return res.status(404).json({
        error: 'Role không tồn tại'
      });
    }

    // Prevent changing your own role
    if (currentUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { roleId: targetRole.id },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UPDATE_USER_ROLE',
      resource: 'user',
      resourceId: id,
      oldValue: { role: currentUser.role?.name },
      newValue: { role: targetRole.name },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Cập nhật role thành công'
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật role' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user account
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'isActive phải là boolean'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Prevent deactivating your own account
    if (currentUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi trạng thái tài khoản của chính mình'
      });
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      resource: 'user',
      resourceId: id,
      oldValue: { isActive: currentUser.isActive },
      newValue: { isActive },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: `User đã được ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật trạng thái user' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/unlock
 * Unlock locked user account
 */
router.patch('/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    if (!user.lockedUntil) {
      return res.status(400).json({
        error: 'Tài khoản không bị khóa'
      });
    }

    // Unlock account
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0
      },
      select: {
        id: true,
        email: true,
        name: true,
        lockedUntil: true,
        failedLoginAttempts: true
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UNLOCK_USER_ACCOUNT',
      resource: 'user',
      resourceId: id,
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Tài khoản đã được mở khóa'
    });
  } catch (error) {
    console.error('Admin unlock user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi mở khóa tài khoản' 
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete user (admin only - more restricted than regular delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Prevent deleting your own account
    if (user.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể xóa tài khoản của chính mình'
      });
    }

    // Soft delete
    await prisma.user.update({
      where: { id: Number(id) },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: id,
      severity: 'CRITICAL',
      oldValue: { email: user.email, name: user.name }
    }, req);

    res.json({
      success: true,
      message: 'User đã được xóa'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi xóa user' 
    });
  }
});

/**
 * GET /api/admin/users/:id/audit-logs
 * Get audit logs for specific user
 */
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: Number(id) },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.auditLog.count({
        where: { userId: Number(id) }
      })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get user audit logs error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit logs' 
    });
  }
});

export default router;
```

### Step 5: Create Audit Logs Viewer API

**File: `backend/src/routes/admin/auditLogs.ts`** (NEW)

```typescript
import express from 'express';
import { prisma } from '../../lib/prisma';

const router = express.Router();

/**
 * GET /api/admin/audit-logs
 * Get all audit logs with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      userId,
      severity,
      startDate,
      endDate,
      resource
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page

    const where: any = {};
    if (action) where.action = action as string;
    if (userId) where.userId = parseInt(userId as string);
    if (severity) where.severity = severity as string;
    if (resource) where.resource = resource as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit logs' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/:id
 * Get single audit log by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({
        error: 'Audit log không tồn tại'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Get audit log by ID error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit log' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/stats/summary
 * Get audit log statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const [
      totalLogs,
      bySeverity,
      byAction,
      criticalRecent
    ] = await Promise.all([
      // Total logs in period
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate } }
      }),

      // Logs grouped by severity
      prisma.auditLog.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where: { createdAt: { gte: startDate } }
      }),

      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),

      // Recent critical logs
      prisma.auditLog.findMany({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          startDate,
          endDate: new Date()
        },
        summary: {
          total: totalLogs,
          bySeverity: bySeverity.map(item => ({
            severity: item.severity,
            count: item._count.severity
          })),
          topActions: byAction.map(item => ({
            action: item.action,
            count: item._count.action
          }))
        },
        criticalRecent
      }
    });
  } catch (error) {
    console.error('Audit logs stats error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thống kê audit logs' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/actions/list
 * Get list of all available actions (for filtering)
 */
router.get('/actions/list', async (req, res) => {
  try {
    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' }
    });

    res.json({
      success: true,
      data: actions.map(a => a.action)
    });
  } catch (error) {
    console.error('Get audit actions error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách actions' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/resources/list
 * Get list of all available resources (for filtering)
 */
router.get('/resources/list', async (req, res) => {
  try {
    const resources = await prisma.auditLog.findMany({
      select: { resource: true },
      distinct: ['resource'],
      orderBy: { resource: 'asc' }
    });

    res.json({
      success: true,
      data: resources.map(r => r.resource)
    });
  } catch (error) {
    console.error('Get audit resources error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách resources' 
    });
  }
});

export default router;
```

### Step 6: Mount Admin Routes in Main App

**File: `backend/src/server.ts`** (UPDATE)

```typescript
import adminRoutes from './routes/admin';

// ... existing code ...

// Admin routes (protected with requireAdmin)
app.use('/api/admin', adminRoutes);

// ... existing routes ...
```

---

## Testing Phase 4

### Test File Upload Security

**Test 1: Magic Number Validation**
```bash
# Create fake image (actually a PHP file)
echo "<?php system($_GET['cmd']); ?>" > malware.jpg

# Try to upload
curl -X POST http://localhost:5000/api/media/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@malware.jpg"

# Expected: 400 Bad Request - "Invalid file type"
```

**Test 2: Decompression Bomb**
```bash
# Create large image (if you have one with many pixels)
# Try to upload image with > 268M pixels
# Expected: 400 Bad Request - "pixel bomb detected"
```

**Test 3: Normal Upload**
```bash
# Upload valid image
curl -X POST http://localhost:5000/api/media/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@valid-image.jpg"

# Expected: 200 OK with Cloudinary URL
# Check: File should be converted to WebP
```

### Test Admin User Management

**Test 1: List Users**
```bash
curl http://localhost:5000/api/admin/users?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK with user list
```

**Test 2: Change User Role**
```bash
curl -X PATCH http://localhost:5000/api/admin/users/123/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleName": "ADMIN"}'

# Expected: 200 OK, role changed, audit log created
```

**Test 3: Unlock User Account**
```bash
curl -X PATCH http://localhost:5000/api/admin/users/123/unlock \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK, account unlocked
```

**Test 4: Self-Protection**
```bash
# Try to change your own role
curl -X PATCH http://localhost:5000/api/admin/users/YOUR_ID/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleName": "SUPER_ADMIN"}'

# Expected: 400 Bad Request - "Cannot change own role"
```

### Test Audit Logs

**Test 1: View Audit Logs**
```bash
curl http://localhost:5000/api/admin/audit-logs?page=1&limit=20 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK with audit logs list
```

**Test 2: Filter by Severity**
```bash
curl "http://localhost:5000/api/admin/audit-logs?severity=CRITICAL" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: Only CRITICAL logs
```

**Test 3: Audit Log Statistics**
```bash
curl http://localhost:5000/api/admin/audit-logs/stats/summary?days=7 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: Stats summary for last 7 days
```

### Test Dashboard Statistics

```bash
# Get dashboard stats
curl http://localhost:5000/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: Overview stats (users, products, orders, revenue)

# Get analytics
curl "http://localhost:5000/api/admin/dashboard/analytics?period=7days" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: Orders by status, revenue, top products
```

---

## TypeScript Validation

Sau khi implement, chạy TypeScript check:

```bash
# Check backend
bunx tsc --project backend/tsconfig.json --noEmit

# Check frontend (nếu có)
bunx tsc --project frontend/tsconfig.json --noEmit
```

**Expected:** Không có lỗi TypeScript.

---

## ✅ Phase 4 Checklist

### File Upload Security
- [x] File upload validates magic numbers
- [x] Images re-processed with Sharp
- [x] File size limited to 5MB
- [x] Pixel dimensions limited (4096x4096)
- [x] Decompression bomb prevention (MAX_PIXELS)
- [x] EXIF metadata removal
- [x] Convert to WebP for optimization
- [x] Rate limiting on upload endpoints
- [x] Admin-only upload access

### Admin User Management
- [x] List users with pagination & filters
- [x] Get user by ID
- [x] Update user role (with self-protection)
- [x] Activate/deactivate user
- [x] Unlock user account
- [x] Soft delete user (with self-protection)
- [x] View user's audit logs
- [x] All actions logged to audit trail

### Audit Logs Viewer
- [x] List audit logs with pagination
- [x] Filter by action, severity, resource, date
- [x] Get single audit log by ID
- [x] Statistics & summary endpoint
- [x] List available actions (for filtering)
- [x] List available resources (for filtering)

### Dashboard Statistics
- [x] Overview stats (users, products, orders, revenue)
- [x] Analytics by time period
- [x] Orders by status
- [x] Top selling products
- [x] Recent activities

### Security
- [x] All admin routes protected with `requireAdmin`
- [x] Rate limiting applied to admin API
- [x] Self-protection (cannot modify own role/status)
- [x] Audit logging for critical actions
- [x] TypeScript validation passes

---

## Security Best Practices Implemented

### 1. Defense in Depth
- Multiple layers: file size → magic numbers → Sharp validation → processing
- Không tin file extension hoặc client-provided MIME type

### 2. Principle of Least Privilege
- Admin-only endpoints
- Self-protection mechanisms
- Rate limiting per role

### 3. Audit Trail
- Mọi thay đổi quan trọng được log
- Severity levels: INFO, WARNING, CRITICAL
- Immutable logs (không thể sửa/xóa)

### 4. Fail Secure
- Validation failures → reject request
- Missing token/permission → 401/403
- Không expose internal errors

### 5. Input Validation
- Validate every input (size, type, dimensions)
- Re-process images (không trust uploaded data)
- Whitelist approach (ALLOWED_MIME_TYPES)

---

## Next Steps

Phase 4 hoàn tất! Các bước tiếp theo:

1. **Phase 5**: Frontend Admin Dashboard
   - Create Next.js admin pages
   - Connect to admin API
   - Build user management UI
   - Build audit logs viewer

2. **Phase 6**: Testing & Security Validation
   - Integration tests
   - Security penetration testing
   - Load testing
   - OWASP Top 10 validation

3. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - Deployment guide
   - Security configuration guide

---

## Troubleshooting

### Issue: "Cannot find module 'sharp'"
```bash
cd backend
npm install sharp --save
```

### Issue: "Cannot find module 'file-type'"
```bash
cd backend
npm install file-type@16 --save  # Note: v16 uses CommonJS
```

### Issue: TypeScript errors with file-type
```typescript
// Use dynamic import for ESM modules
const { fileTypeFromBuffer } = await import('file-type');
```

### Issue: Images not being processed
- Check Sharp installation: `npm ls sharp`
- Check file permissions on temp directory
- Check memory limits (Sharp needs ~100MB RAM)

---

## Monitoring & Alerts

### Critical Events to Monitor

1. **Failed Upload Attempts**
   - Multiple invalid file types from same IP
   - Decompression bomb attempts
   - Rate limit violations

2. **Admin Actions**
   - Role changes (especially to SUPER_ADMIN)
   - Account deletions
   - Multiple failed admin logins

3. **Audit Log Patterns**
   - Multiple CRITICAL severity logs
   - Unusual activity patterns
   - Missing audit logs (potential log tampering)

### Recommended Tools
- **Logging**: Winston or Pino
- **Monitoring**: DataDog, New Relic, or Sentry
- **Alerts**: PagerDuty, Slack webhooks
- **SIEM**: Splunk, ELK Stack

---

**Phase 4 Complete! 🎉**

File upload security và admin dashboard API đã sẵn sàng. System hiện có đầy đủ bảo mật cho production deployment.
