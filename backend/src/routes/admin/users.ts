import express from 'express';
import { prisma } from '../../lib/prisma';
import { auditLog } from '../../utils/auditLog';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { adminCriticalLimiter } from '../../middleware/rateLimiter';

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
      excludeRole,
      isActive,
      search,
      hasOrders
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      deletedAt: null
    };

    if (role) {
      where.role = {
        name: (role as string).toUpperCase()
      };
    }

    // Exclude specific role (e.g., exclude USER to get only staff)
    if (excludeRole) {
      where.role = {
        name: { not: (excludeRole as string).toUpperCase() }
      };
    }

    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter users who have at least one order (customers)
    if (hasOrders === 'true') {
      where.orders = {
        some: {}
      };
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
          },
          _count: {
            select: {
              orders: true
            }
          },
          orders: {
            select: {
              totalAmount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Calculate total spent for each user
    const usersWithStats = users.map(user => {
      const totalSpent = user.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      // Remove orders array from response to keep it clean
      const { orders, ...userWithoutOrders } = user;
      return {
        ...userWithoutOrders,
        totalSpent
      };
    });

    res.json({
      success: true,
      data: usersWithStats,
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
        },
        _count: {
          select: {
            orders: true
          }
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Calculate total spent
    const allOrders = await prisma.order.findMany({
      where: { userId: Number(id) },
      select: { totalAmount: true }
    });
    const totalSpent = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      data: {
        ...user,
        totalSpent
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thông tin user' 
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user information (name, email, phone, roleId, isActive)
 * Implements strict RBAC with Mutual Non-Interference for SUPER_ADMIN
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, roleId, isActive } = req.body;

    // Get target user
    const targetUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User không tồn tại'
      });
    }

    // Get current user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN';
    const targetIsSuperAdmin = targetUser.role?.name === 'SUPER_ADMIN';
    const isSelf = targetUser.id === req.user?.id;

    // 🛡️ MUTUAL NON-INTERFERENCE: Super Admin cannot modify peer Super Admin
    if (targetIsSuperAdmin && !isSelf) {
      return res.status(403).json({
        error: 'Super Admin không thể chỉnh sửa thông tin của Super Admin khác (Mutual Non-Interference)'
      });
    }

    // 🛡️ Regular ADMIN cannot modify SUPER_ADMIN at all
    if (!isSuperAdmin && targetIsSuperAdmin) {
      return res.status(403).json({
        error: 'Bạn không có quyền thao tác với SUPER ADMIN'
      });
    }

    // Prevent changing your own role (self-demotion)
    if (roleId && isSelf) {
      return res.status(400).json({
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // 🔒 SECURITY: Prevent deactivating yourself (account lockout prevention)
    if (isActive === false && isSelf) {
      return res.status(400).json({
        error: 'Không thể vô hiệu hóa tài khoản của chính mình (ngăn chặn tự khóa)'
      });
    }

    // 🔒 CRITICAL: Prevent deactivating SUPER_ADMIN accounts
    if (isActive === false && targetIsSuperAdmin) {
      return res.status(403).json({
        error: 'SUPER ADMIN không thể bị vô hiệu hóa (tài khoản được bảo vệ)'
      });
    }

    // If email is being updated, check for duplicates
    if (email && email !== targetUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          deletedAt: null,
          id: { not: Number(id) }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          error: 'Email đã được sử dụng'
        });
      }
    }

    // Build update data (whitelist approach)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Only allow role change if not targeting SUPER_ADMIN
    if (roleId !== undefined) {
      // Verify target role exists
      const newRole = await prisma.role.findUnique({
        where: { id: Number(roleId) }
      });

      if (!newRole) {
        return res.status(404).json({
          error: 'Role không tồn tại'
        });
      }

      // Prevent assigning SUPER_ADMIN role by non-SUPER_ADMIN
      if (newRole.name === 'SUPER_ADMIN' && !isSuperAdmin) {
        return res.status(403).json({
          error: 'Chỉ SUPER ADMIN mới có thể cấp quyền SUPER ADMIN'
        });
      }

      updateData.roleId = Number(roleId);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Audit log with appropriate severity
    const hasRoleChange = roleId && roleId !== targetUser.roleId;
    const severity = hasRoleChange ? 'CRITICAL' : 'INFO';

    await auditLog({
      userId: req.user!.id,
      action: hasRoleChange ? 'UPDATE_USER_ROLE' : 'UPDATE_USER',
      resource: 'user',
      resourceId: id,
      oldValue: {
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role?.name,
        isActive: targetUser.isActive
      },
      newValue: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role?.name,
        isActive: updatedUser.isActive
      },
      severity
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Cập nhật thông tin user thành công'
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({
      error: 'Lỗi khi cập nhật user'
    });
  }
});

/**
 * POST /api/admin/users
 * Create new staff/admin user
 * 🔒 CRITICAL: Rate limited to prevent abuse
 */
router.post('/', adminCriticalLimiter, async (req, res) => {
  try {
    const { name, email, phone, roleId, isActive = true } = req.body;

    // Validation
    if (!email || !roleId) {
      return res.status(400).json({
        error: 'Email và Role là bắt buộc'
      });
    }

    // Verify role exists first (before checking existing user)
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role không tồn tại'
      });
    }

    // Check if email already exists (including soft-deleted users)
    const existingUser = await prisma.user.findFirst({
      where: {
        email
        // Don't filter by deletedAt - we need to check deleted users too
      },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        },
        // 📊 Include customer activity data for context
        orders: {
          select: { id: true },
          take: 1 // Just check if any orders exist
        },
        reviews: {
          select: { id: true },
          take: 1 // Just check if any reviews exist
        },
        wishlistItems: {
          select: { id: true },
          take: 1 // Just check if any wishlist items exist
        }
      }
    });

    console.log('🔍 Existing user check:', { email, found: !!existingUser, userId: existingUser?.id, isDeleted: !!existingUser?.deletedAt });

    if (existingUser) {
      // 🔄 CASE 1: Soft-Deleted User → Offer RESTORE
      if (existingUser.deletedAt) {
        // 📊 Gather customer activity context
        const hasOrders = existingUser.orders && existingUser.orders.length > 0;
        const hasReviews = existingUser.reviews && existingUser.reviews.length > 0;
        const hasWishlist = existingUser.wishlistItems && existingUser.wishlistItems.length > 0;
        const hasCustomerActivity = hasOrders || hasReviews || hasWishlist || existingUser.pointBalance > 0;

        // Get accurate counts for display
        const [orderCount, reviewCount, wishlistCount] = await Promise.all([
          prisma.order.count({ where: { userId: existingUser.id } }),
          prisma.review.count({ where: { userId: existingUser.id } }),
          prisma.wishlistItem.count({ where: { userId: existingUser.id } })
        ]);

        return res.status(409).json({
          error: 'Email đã tồn tại (đã bị xóa)',
          existingUser: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            currentRole: existingUser.role?.name,
            currentRoleId: existingUser.roleId,
            isActive: existingUser.isActive,
            deletedAt: existingUser.deletedAt,
            memberSince: existingUser.createdAt,
            customerActivity: {
              hasActivity: hasCustomerActivity,
              orderCount,
              reviewCount,
              wishlistCount,
              pointBalance: existingUser.pointBalance,
              totalSpent: existingUser.totalSpent,
              memberTier: existingUser.memberTier
            }
          },
          requestedRole: role.name,
          requestedRoleId: Number(roleId),
          suggestion: 'RESTORE_USER',
          message: hasCustomerActivity
            ? `Tài khoản này đã bị xóa nhưng vẫn có lịch sử mua sắm (${orderCount} đơn hàng, ${existingUser.pointBalance} điểm). Khôi phục và nâng cấp lên ${role.name}?`
            : `Tài khoản này đã bị xóa. Bạn có muốn khôi phục và đặt vai trò ${role.name} không?`
        });
      }

      // 🔄 CASE 2: Active User → ENTERPRISE STANDARD: Role Promotion (Single Identity Principle)
      // Instead of blocking with error, suggest role promotion if applicable

      // Case 1: Same role → Duplicate, reject
      if (existingUser.roleId === Number(roleId)) {
        return res.status(400).json({
          error: 'Email đã được sử dụng với cùng vai trò'
        });
      }

      // 📊 Gather customer activity context
      const hasOrders = existingUser.orders && existingUser.orders.length > 0;
      const hasReviews = existingUser.reviews && existingUser.reviews.length > 0;
      const hasWishlist = existingUser.wishlistItems && existingUser.wishlistItems.length > 0;
      const hasCustomerActivity = hasOrders || hasReviews || hasWishlist || existingUser.pointBalance > 0;

      // Get accurate counts for display
      const [orderCount, reviewCount, wishlistCount] = await Promise.all([
        prisma.order.count({ where: { userId: existingUser.id } }),
        prisma.review.count({ where: { userId: existingUser.id } }),
        prisma.wishlistItem.count({ where: { userId: existingUser.id } })
      ]);

      // Case 2: Different role → Suggest promotion (409 Conflict with promotion option)
      return res.status(409).json({
        error: 'Email đã tồn tại trong hệ thống',
        existingUser: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          currentRole: existingUser.role?.name,
          currentRoleId: existingUser.roleId,
          isActive: existingUser.isActive,
          memberSince: existingUser.createdAt,
          // 📊 Customer activity context
          customerActivity: {
            hasActivity: hasCustomerActivity,
            orderCount,
            reviewCount,
            wishlistCount,
            pointBalance: existingUser.pointBalance,
            totalSpent: existingUser.totalSpent,
            memberTier: existingUser.memberTier
          }
        },
        requestedRole: role.name,
        requestedRoleId: Number(roleId),
        suggestion: 'PROMOTE_ROLE',
        message: hasCustomerActivity
          ? `Tài khoản này đã có hoạt động mua sắm (${orderCount} đơn hàng, ${existingUser.pointBalance} điểm). Nâng cấp lên ${role.name} sẽ giữ nguyên toàn bộ lịch sử. Tiếp tục?`
          : `Tài khoản này đã tồn tại với vai trò ${existingUser.role?.name}. Bạn có muốn nâng cấp lên ${role.name} không?`
      });
    }

    // Get current user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN';

    // 🛡️ CRITICAL: Only SUPER_ADMIN can create ADMIN or SUPER_ADMIN accounts
    // Implements Enterprise Standard: Anti-Collusion & Principle of Least Privilege
    // - Admin creating Admin = Collusion risk (Admin A creates Admin B, they conspire)
    // - Only highest authority (Super Admin) should grant administrative privileges
    if ((role.name === 'ADMIN' || role.name === 'SUPER_ADMIN') && !isSuperAdmin) {
      return res.status(403).json({
        error: 'Chỉ SUPER ADMIN mới có thể tạo tài khoản ADMIN hoặc SUPER ADMIN (Anti-Collusion Policy)'
      });
    }

    // Create user with a temporary password (should be sent via email in production)
    // 🔒 SECURITY: Use cryptographically secure random generation
    const tempPassword = crypto.randomBytes(16).toString('base64').slice(0, 16);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        roleId: Number(roleId),
        isActive
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

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: String(newUser.id),
      newValue: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role?.name
      },
      severity: role.name === 'SUPER_ADMIN' ? 'CRITICAL' : 'WARNING'
    }, req);

    // 🔴 CRITICAL SECURITY: Send email alert when Super Admin is created
    // Enterprise Standard: Transparency & Accountability to prevent backdoor attacks
    if (role.name === 'SUPER_ADMIN') {
      try {
        // Get all existing Super Admins to notify them
        const allSuperAdmins = await prisma.user.findMany({
          where: {
            role: { name: 'SUPER_ADMIN' },
            deletedAt: null,
            isActive: true
          },
          select: {
            email: true,
            name: true
          }
        });

        // Send alert email (async, don't block response)
        if (currentUser) {
          const { sendSuperAdminCreationAlert } = require('../../services/emailService');
          sendSuperAdminCreationAlert(
            {
              id: currentUser.id,
              email: currentUser.email,
              name: currentUser.name
            },
            {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name
            },
            {
              ip: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
              timestamp: new Date()
            },
            allSuperAdmins
          ).catch(async (err: Error) => {
            // 🔴 FALLBACK: Log to audit trail if email fails
            console.error('🚨 CRITICAL: Failed to send Super Admin creation alert email:', err);

            // Log email failure to audit log with CRITICAL severity
            await auditLog({
              userId: req.user!.id,
              action: 'EMAIL_ALERT_FAILED',
              resource: 'super_admin_creation_alert',
              resourceId: String(newUser.id),
              newValue: {
                error: err.message,
                errorStack: err.stack,
                recipients: allSuperAdmins.map(a => a.email),
                newSuperAdmin: {
                  id: newUser.id,
                  email: newUser.email,
                  name: newUser.name
                },
                createdBy: {
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.name
                }
              },
              severity: 'CRITICAL'
            }, req);
          });
        }
      } catch (err) {
        console.error('Error preparing Super Admin alert:', err);
      }
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Tạo user thành công',
      // In production, send this via email instead
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
    });
  } catch (error: any) {
    console.error('Admin create user error:', error);

    // Handle Prisma unique constraint violation (P2002)
    // This catches race conditions where user was created between our check and create
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      try {
        // Fetch the existing user to provide promotion option
        const { email, roleId } = req.body;
        const existingUser = await prisma.user.findFirst({
          where: { email, deletedAt: null },
          include: {
            role: { select: { id: true, name: true } }
          }
        });

        if (existingUser && existingUser.roleId !== Number(roleId)) {
          // Different role - return PROMOTE_ROLE suggestion
          const requestedRole = await prisma.role.findUnique({
            where: { id: Number(roleId) }
          });

          // Get customer activity counts
          const [orderCount, reviewCount, wishlistCount] = await Promise.all([
            prisma.order.count({ where: { userId: existingUser.id } }),
            prisma.review.count({ where: { userId: existingUser.id } }),
            prisma.wishlistItem.count({ where: { userId: existingUser.id } })
          ]);

          const hasCustomerActivity = orderCount > 0 || reviewCount > 0 || wishlistCount > 0 || existingUser.pointBalance > 0;

          return res.status(409).json({
            error: 'Email đã tồn tại trong hệ thống',
            existingUser: {
              id: existingUser.id,
              name: existingUser.name,
              email: existingUser.email,
              currentRole: existingUser.role?.name,
              currentRoleId: existingUser.roleId,
              isActive: existingUser.isActive,
              memberSince: existingUser.createdAt,
              customerActivity: {
                hasActivity: hasCustomerActivity,
                orderCount,
                reviewCount,
                wishlistCount,
                pointBalance: existingUser.pointBalance,
                totalSpent: existingUser.totalSpent,
                memberTier: existingUser.memberTier
              }
            },
            requestedRole: requestedRole?.name,
            requestedRoleId: Number(roleId),
            suggestion: 'PROMOTE_ROLE',
            message: hasCustomerActivity
              ? `Tài khoản này đã có hoạt động mua sắm (${orderCount} đơn hàng, ${existingUser.pointBalance} điểm). Nâng cấp lên ${requestedRole?.name} sẽ giữ nguyên toàn bộ lịch sử. Tiếp tục?`
              : `Tài khoản này đã tồn tại với vai trò ${existingUser.role?.name}. Bạn có muốn nâng cấp lên ${requestedRole?.name} không?`
          });
        }

        // Same role or user not found - generic duplicate error
        return res.status(409).json({
          error: 'Email đã tồn tại trong hệ thống',
          message: 'Email này đã được sử dụng với cùng vai trò.',
          suggestion: 'USE_DIFFERENT_EMAIL'
        });
      } catch (fetchError) {
        console.error('Error fetching existing user in P2002 handler:', fetchError);
        return res.status(409).json({
          error: 'Email đã tồn tại trong hệ thống',
          message: 'Email này đã được sử dụng. Vui lòng sử dụng email khác.',
          suggestion: 'USE_DIFFERENT_EMAIL'
        });
      }
    }

    res.status(500).json({
      error: 'Lỗi khi tạo user'
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

    // Get target user (renamed from currentUser for clarity)
    const targetUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User không tồn tại'
      });
    }

    // Find target role
    let newRole;
    if (roleId) {
      newRole = await prisma.role.findUnique({
        where: { id: Number(roleId) }
      });
    } else {
      newRole = await prisma.role.findFirst({
        where: { name: roleName.toUpperCase() }
      });
    }

    if (!newRole) {
      return res.status(404).json({
        error: 'Role không tồn tại'
      });
    }

    // Prevent changing your own role
    if (targetUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // 🛡️ CRITICAL: SUPER_ADMIN role cannot be changed (Anti-Coup protection)
    // Prevents any admin from demoting a Super Admin to remove system access
    if (targetUser.role?.name === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Không thể thay đổi role của SUPER ADMIN (tài khoản được bảo vệ)'
      });
    }

    // Get current user's role for additional checks
    const currentUserData = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    // Regular ADMIN cannot assign SUPER_ADMIN role
    if (newRole.name === 'SUPER_ADMIN' && currentUserData?.role?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Chỉ SUPER ADMIN mới có thể cấp quyền SUPER ADMIN'
      });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { roleId: newRole.id },
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
      oldValue: { role: targetUser.role?.name },
      newValue: { role: newRole.name },
      severity: 'CRITICAL' // Changed to CRITICAL as role changes are highly sensitive
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

    // Get target user with role
    const targetUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User không tồn tại'
      });
    }

    // Prevent deactivating your own account
    if (targetUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi trạng thái tài khoản của chính mình'
      });
    }

    // Get current user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    // 🛡️ MUTUAL NON-INTERFERENCE: Super Admins cannot modify peer Super Admins
    // Only exception: they can view (handled in audit log endpoint)
    if (targetUser.role?.name === 'SUPER_ADMIN' && targetUser.id !== req.user?.id) {
      return res.status(403).json({
        error: 'Super Admin không thể thay đổi trạng thái của Super Admin khác (Mutual Non-Interference)'
      });
    }

    // Regular ADMIN cannot modify SUPER_ADMIN
    if (targetUser.role?.name === 'SUPER_ADMIN' && currentUser?.role?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Chỉ SUPER ADMIN mới có thể thao tác với tài khoản SUPER ADMIN'
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
      oldValue: { isActive: targetUser.isActive },
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

    // Get target user with role
    const targetUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Prevent deleting your own account
    if (targetUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể xóa tài khoản của chính mình'
      });
    }

    // CRITICAL: SUPER_ADMIN cannot be deleted (protected account)
    if (targetUser.role?.name === 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'SUPER ADMIN không thể bị xóa (tài khoản được bảo vệ)'
      });
    }

    // Get current user's role for permission check
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    // Regular ADMIN cannot delete other ADMIN/STAFF if target has equal/higher role
    if (currentUser?.role?.name === 'ADMIN' && targetUser.role?.name === 'ADMIN') {
      // Allow ADMIN to delete other ADMIN (but not SUPER_ADMIN, already blocked above)
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
      oldValue: { email: targetUser.email, name: targetUser.name, role: targetUser.role?.name }
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

/**
 * PATCH /api/admin/users/:id/promote-role
 * Role Promotion: Nâng cấp quyền cho user hiện có
 * Enterprise Standard: Single Identity Principle
 *
 * Khi Super Admin muốn biến một USER thành ADMIN, thay vì tạo tài khoản mới,
 * hệ thống sẽ UPDATE role của tài khoản cũ (giữ nguyên lịch sử, dữ liệu).
 *
 * Security measures:
 * - Revoke all active tokens (force logout)
 * - Increment tokenVersion (invalidate old tokens)
 * - Audit log with CRITICAL severity
 * - Prevent self-demotion
 * 🔒 CRITICAL: Rate limited to prevent privilege escalation abuse
 */
router.patch('/:id/promote-role', adminCriticalLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { newRoleId } = req.body;

    if (!newRoleId) {
      return res.status(400).json({
        error: 'newRoleId là bắt buộc'
      });
    }

    // Get target user
    const targetUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User không tồn tại'
      });
    }

    // Get new role
    const newRole = await prisma.role.findUnique({
      where: { id: Number(newRoleId) }
    });

    if (!newRole) {
      return res.status(404).json({
        error: 'Role không tồn tại'
      });
    }

    // Get current user's role
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true }
    });

    const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN';
    const targetIsSuperAdmin = targetUser.role?.name === 'SUPER_ADMIN';
    const isSelf = targetUser.id === req.user?.id;

    // 🛡️ SECURITY CHECKS

    // Prevent self-demotion (admin cannot demote themselves)
    if (isSelf) {
      return res.status(403).json({
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // Super Admin is immutable
    if (targetIsSuperAdmin) {
      return res.status(403).json({
        error: 'Không thể thay đổi role của SUPER ADMIN (tài khoản được bảo vệ)'
      });
    }

    // Only SUPER_ADMIN can promote to ADMIN/SUPER_ADMIN
    if ((newRole.name === 'ADMIN' || newRole.name === 'SUPER_ADMIN') && !isSuperAdmin) {
      return res.status(403).json({
        error: 'Chỉ SUPER ADMIN mới có thể cấp quyền ADMIN/SUPER_ADMIN (Anti-Collusion Policy)'
      });
    }

    // Regular admin cannot modify Super Admin
    if (!isSuperAdmin && targetIsSuperAdmin) {
      return res.status(403).json({
        error: 'Bạn không có quyền thao tác với SUPER ADMIN'
      });
    }

    // 🔄 PERFORM ROLE PROMOTION

    // Step 1: Increment tokenVersion (invalidate all old tokens)
    // Step 2: Update role
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        roleId: Number(newRoleId),
        tokenVersion: { increment: 1 } // Force re-login
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

    // Step 3: Revoke all refresh tokens (force logout from all devices)
    const { revokeAllUserTokens } = require('../../utils/tokenUtils');
    await revokeAllUserTokens(Number(id));

    // 📊 Gather customer activity context for audit log
    const [orderCount, pointBalance] = await Promise.all([
      prisma.order.count({ where: { userId: Number(id) } }),
      prisma.user.findUnique({
        where: { id: Number(id) },
        select: { pointBalance: true, totalSpent: true }
      })
    ]);

    // Step 4: Audit log with CRITICAL severity + customer context
    await auditLog({
      userId: req.user!.id,
      action: 'PROMOTE_USER_ROLE',
      resource: 'user',
      resourceId: id,
      oldValue: {
        role: targetUser.role?.name,
        roleId: targetUser.roleId
      },
      newValue: {
        role: newRole.name,
        roleId: newRole.id,
        reason: 'ROLE_PROMOTION',
        tokensRevoked: true,
        forceLogout: true,
        // 📊 Preserve customer activity context in audit
        preservedCustomerData: {
          orderCount,
          pointBalance: pointBalance?.pointBalance || 0,
          totalSpent: pointBalance?.totalSpent || 0,
          hadCustomerActivity: orderCount > 0 || (pointBalance?.pointBalance || 0) > 0
        }
      },
      severity: (newRole.name === 'SUPER_ADMIN' || newRole.name === 'ADMIN') ? 'CRITICAL' : 'WARNING'
    }, req);

    // Step 5: Send email alert if promoted to Super Admin
    if (newRole.name === 'SUPER_ADMIN') {
      try {
        const allSuperAdmins = await prisma.user.findMany({
          where: {
            role: { name: 'SUPER_ADMIN' },
            deletedAt: null,
            isActive: true
          },
          select: {
            email: true,
            name: true
          }
        });

        if (currentUser) {
          const { sendSuperAdminCreationAlert } = require('../../services/emailService');
          sendSuperAdminCreationAlert(
            {
              id: currentUser.id,
              email: currentUser.email,
              name: currentUser.name
            },
            {
              id: updatedUser.id,
              email: updatedUser.email,
              name: updatedUser.name
            },
            {
              ip: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
              timestamp: new Date()
            },
            allSuperAdmins
          ).catch(async (err: Error) => {
            // 🔴 FALLBACK: Log to audit trail if email fails
            console.error('🚨 CRITICAL: Failed to send Super Admin promotion alert email:', err);

            // Log email failure to audit log with CRITICAL severity
            await auditLog({
              userId: req.user!.id,
              action: 'EMAIL_ALERT_FAILED',
              resource: 'super_admin_promotion_alert',
              resourceId: String(updatedUser.id),
              newValue: {
                error: err.message,
                errorStack: err.stack,
                recipients: allSuperAdmins.map(a => a.email),
                promotedUser: {
                  id: updatedUser.id,
                  email: updatedUser.email,
                  name: updatedUser.name,
                  newRole: newRole.name
                },
                promotedBy: {
                  id: currentUser.id,
                  email: currentUser.email,
                  name: currentUser.name
                }
              },
              severity: 'CRITICAL'
            }, req);
          });
        }
      } catch (err) {
        console.error('Error preparing Super Admin promotion alert:', err);
      }
    }

    // 🔐 CRITICAL: Check if promoted user needs password setup (social login → admin)
    let requiresPasswordSetup = false;
    if ((newRole.name === 'ADMIN' || newRole.name === 'SUPER_ADMIN') && !updatedUser.password) {
      try {
        // Generate password setup token
        const setupToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(setupToken, 10);

        await prisma.passwordSetupToken.create({
          data: {
            userId: updatedUser.id,
            token: hashedToken,
            purpose: 'ADMIN_PASSWORD_SETUP',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });

        // Send password setup email
        const { sendAdminPasswordSetupEmail } = require('../../services/emailService');
        await sendAdminPasswordSetupEmail({
          email: updatedUser.email,
          name: updatedUser.name,
          role: newRole.name,
          token: setupToken,
          expiresInHours: 24
        }).catch(async (emailErr: Error) => {
          console.error('🚨 CRITICAL: Failed to send admin password setup email:', emailErr);

          // Fallback: Log to audit
          await auditLog({
            userId: req.user!.id,
            action: 'EMAIL_ALERT_FAILED',
            resource: 'admin_password_setup',
            resourceId: String(updatedUser.id),
            newValue: {
              error: emailErr.message,
              recipient: updatedUser.email,
              role: newRole.name
            },
            severity: 'CRITICAL'
          }, req);
        });

        requiresPasswordSetup = true;

        // Audit log
        await auditLog({
          userId: req.user!.id,
          action: 'ADMIN_PASSWORD_SETUP_INITIATED',
          resource: 'user',
          resourceId: String(updatedUser.id),
          newValue: {
            reason: 'Social login user promoted to admin',
            expiresInHours: 24,
            emailSent: true
          },
          severity: 'WARNING'
        }, req);

      } catch (setupErr) {
        console.error('Error setting up password setup flow:', setupErr);
        // Don't fail promotion, but log error
      }
    }

    res.json({
      success: true,
      data: updatedUser,
      message: requiresPasswordSetup
        ? `Đã nâng cấp quyền thành công. Email thiết lập mật khẩu đã được gửi đến ${updatedUser.email}`
        : `Đã nâng cấp quyền thành công. User cần đăng nhập lại.`,
      sessionInvalidated: true,
      requiresPasswordSetup
    });
  } catch (error) {
    console.error('Admin promote user role error:', error);
    res.status(500).json({
      error: 'Lỗi khi nâng cấp quyền user'
    });
  }
});

/**
 * PATCH /api/admin/users/:id/restore
 * Restore soft-deleted user and optionally update role
 * 🔄 ENTERPRISE STANDARD: Single Identity - Restore instead of recreate
 */
router.patch('/:id/restore', adminCriticalLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    // Find deleted user
    const deletedUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: { not: null } // Must be deleted
      },
      include: {
        role: { select: { id: true, name: true } }
      }
    });

    if (!deletedUser) {
      return res.status(404).json({
        error: 'User không tồn tại hoặc chưa bị xóa'
      });
    }

    // Verify new role exists if provided
    let newRole = deletedUser.role;
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { id: Number(roleId) }
      });

      if (!role) {
        return res.status(404).json({
          error: 'Role không tồn tại'
        });
      }

      newRole = role;

      // 🛡️ CRITICAL: Only SUPER_ADMIN can restore as ADMIN or SUPER_ADMIN
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { role: true }
      });

      const isSuperAdmin = currentUser?.role?.name === 'SUPER_ADMIN';

      if ((role.name === 'ADMIN' || role.name === 'SUPER_ADMIN') && !isSuperAdmin) {
        return res.status(403).json({
          error: 'Chỉ SUPER ADMIN mới có thể khôi phục user với vai trò ADMIN hoặc SUPER ADMIN (Anti-Collusion Policy)'
        });
      }
    }

    // Restore user (set deletedAt = null, update role if provided, activate)
    const restoredUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        deletedAt: null,
        isActive: true,
        ...(roleId && { roleId: Number(roleId) }),
        tokenVersion: { increment: 1 } // Invalidate old sessions
      },
      include: {
        role: { select: { id: true, name: true } }
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'USER_RESTORED',
      resource: 'user',
      resourceId: String(restoredUser.id),
      oldValue: {
        deletedAt: deletedUser.deletedAt?.toISOString(),
        roleId: deletedUser.roleId,
        roleName: deletedUser.role?.name
      },
      newValue: {
        deletedAt: null,
        roleId: restoredUser.roleId,
        roleName: restoredUser.role?.name,
        restoredBy: req.user!.id
      },
      severity: 'WARNING'
    }, req);

    // 🔐 If restored as ADMIN and no password, send password setup email
    let requiresPasswordSetup = false;
    if ((newRole?.name === 'ADMIN' || newRole?.name === 'SUPER_ADMIN') && !restoredUser.password) {
      const setupToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(setupToken, 10);

      await prisma.passwordSetupToken.create({
        data: {
          userId: restoredUser.id,
          token: hashedToken,
          purpose: 'ADMIN_PASSWORD_SETUP',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Send password setup email
      const { sendAdminPasswordSetupEmail } = require('../../services/emailService');
      await sendAdminPasswordSetupEmail({
        email: restoredUser.email,
        name: restoredUser.name,
        role: newRole.name,
        token: setupToken,
        expiresInHours: 24
      });

      requiresPasswordSetup = true;

      // Audit log for password setup email
      await auditLog({
        userId: restoredUser.id,
        action: 'ADMIN_PASSWORD_SETUP_EMAIL_SENT',
        resource: 'user',
        resourceId: String(restoredUser.id),
        newValue: {
          role: newRole.name,
          expiresInHours: 24,
          tokenPurpose: 'ADMIN_PASSWORD_SETUP',
          reason: 'USER_RESTORED_AS_ADMIN'
        },
        severity: 'WARNING'
      }, req);
    }

    res.json({
      success: true,
      data: restoredUser,
      message: `User đã được khôi phục${roleId ? ' và nâng cấp vai trò' : ''}`,
      requiresPasswordSetup,
      setupEmailSent: requiresPasswordSetup
    });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({
      error: 'Lỗi khi khôi phục user'
    });
  }
});

export default router;
