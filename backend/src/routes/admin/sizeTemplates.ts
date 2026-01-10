import express, { Request, Response } from 'express';
import { PrismaClient, ProductType, Prisma } from '@prisma/client';
import { 
  isValidProductType, 
  validateSizeChartTemplateUpdate 
} from '../../schemas/sizeChart.schema';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/admin/size-templates
 * @desc    Get all size chart templates (including inactive)
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.sizeChartTemplate.findMany({
      orderBy: { productType: 'asc' },
    });

    // Thêm info về các ProductType chưa có template
    const existingTypes = templates.map(t => t.productType);
    const allTypes: ProductType[] = ['BRA', 'PANTY', 'SET', 'SLEEPWEAR', 'SHAPEWEAR', 'ACCESSORY'];
    const missingTypes = allTypes.filter(t => !existingTypes.includes(t) && t !== 'ACCESSORY');

    res.json({
      success: true,
      data: templates,
      meta: {
        total: templates.length,
        missingTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching size templates:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách bảng size',
    });
  }
});

/**
 * @route   GET /api/admin/size-templates/:type
 * @desc    Get single size chart template by type
 * @access  Admin
 */
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    if (!isValidProductType(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid product type: ${type}`,
      });
    }

    const productType = type.toUpperCase() as ProductType;

    const template = await prisma.sizeChartTemplate.findUnique({
      where: { productType },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Chưa có bảng size cho loại: ${type}`,
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching size template:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng size',
    });
  }
});

/**
 * @route   PUT /api/admin/size-templates/:type
 * @desc    Update size chart template
 * @access  Admin
 */
router.put('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const adminId = req.user?.id;

    if (!isValidProductType(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid product type: ${type}`,
      });
    }

    const productType = type.toUpperCase() as ProductType;

    // ACCESSORY không có size template
    if (productType === 'ACCESSORY') {
      return res.status(400).json({
        success: false,
        message: 'Phụ kiện không có bảng size',
      });
    }

    // Validate input
    let validatedData;
    try {
      validatedData = validateSizeChartTemplateUpdate(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation error';
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Get old value for audit log
    const oldTemplate = await prisma.sizeChartTemplate.findUnique({
      where: { productType },
    });

    // Prepare data for Prisma (convert to proper JSON types)
    const updateData: Prisma.SizeChartTemplateUpdateInput = {
      updatedAt: new Date(),
    };
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.headers !== undefined) updateData.headers = validatedData.headers;
    if (validatedData.sizes !== undefined) updateData.sizes = validatedData.sizes as Prisma.InputJsonValue;
    if (validatedData.measurements !== undefined) updateData.measurements = validatedData.measurements as Prisma.InputJsonValue;
    if (validatedData.tips !== undefined) updateData.tips = validatedData.tips;
    if (validatedData.internationalSizes !== undefined) {
      updateData.internationalSizes = validatedData.internationalSizes as Prisma.InputJsonValue;
    }
    if (validatedData.measurementImage !== undefined) updateData.measurementImage = validatedData.measurementImage;
    if (validatedData.note !== undefined) updateData.note = validatedData.note;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // Upsert template
    const template = await prisma.sizeChartTemplate.upsert({
      where: { productType },
      update: updateData,
      create: {
        productType,
        name: validatedData.name || productType,
        headers: validatedData.headers || [],
        sizes: (validatedData.sizes || []) as Prisma.InputJsonValue,
        measurements: (validatedData.measurements || []) as Prisma.InputJsonValue,
        tips: validatedData.tips || [],
        description: validatedData.description,
        internationalSizes: validatedData.internationalSizes as Prisma.InputJsonValue | undefined,
        measurementImage: validatedData.measurementImage,
        note: validatedData.note,
        isActive: validatedData.isActive ?? true,
      },
    });

    // Create audit log
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: oldTemplate ? 'UPDATE' : 'CREATE',
          resource: 'SizeChartTemplate',
          resourceId: productType,
          oldValue: oldTemplate as Prisma.InputJsonValue ?? Prisma.JsonNull,
          newValue: template as unknown as Prisma.InputJsonValue,
          severity: 'INFO',
        },
      });
    }

    res.json({
      success: true,
      data: template,
      message: `Cập nhật bảng size ${template.name} thành công`,
    });
  } catch (error) {
    console.error('Error updating size template:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bảng size',
    });
  }
});

/**
 * @route   PATCH /api/admin/size-templates/:type/toggle
 * @desc    Toggle active status of template
 * @access  Admin
 */
router.patch('/:type/toggle', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    if (!isValidProductType(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid product type: ${type}`,
      });
    }

    const productType = type.toUpperCase() as ProductType;

    const template = await prisma.sizeChartTemplate.findUnique({
      where: { productType },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy bảng size cho loại: ${type}`,
      });
    }

    const updated = await prisma.sizeChartTemplate.update({
      where: { productType },
      data: { isActive: !template.isActive },
    });

    res.json({
      success: true,
      data: updated,
      message: `${updated.isActive ? 'Kích hoạt' : 'Ẩn'} bảng size ${updated.name} thành công`,
    });
  } catch (error) {
    console.error('Error toggling size template:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thay đổi trạng thái bảng size',
    });
  }
});

/**
 * @route   GET /api/admin/size-templates/stats
 * @desc    Get usage statistics of size templates
 * @access  Admin
 */
router.get('/stats/usage', async (req: Request, res: Response) => {
  try {
    // Count products by type
    const productCounts = await prisma.product.groupBy({
      by: ['productType'],
      _count: { id: true },
    });

    // Count products with custom size charts
    const customChartCount = await prisma.product.count({
      where: {
        customSizeChart: { not: Prisma.JsonNull },
      },
    });

    const stats = {
      productsByType: productCounts.map(p => ({
        type: p.productType,
        count: p._count.id,
      })),
      customSizeChartCount: customChartCount,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching size template stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thống kê',
    });
  }
});

export default router;
