import express, { Request, Response } from 'express';
import { PrismaClient, ProductType } from '@prisma/client';
import { isValidProductType } from '../schemas/sizeChart.schema';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/size-templates
 * @desc    Get all active size chart templates
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.sizeChartTemplate.findMany({
      where: { isActive: true },
      orderBy: { productType: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching size templates:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng size',
    });
  }
});

/**
 * @route   GET /api/size-templates/:type
 * @desc    Get size chart template by product type
 * @access  Public
 */
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    // Validate product type
    if (!isValidProductType(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid product type: ${type}. Valid types: BRA, PANTY, SET, SLEEPWEAR, SHAPEWEAR, ACCESSORY`,
      });
    }

    const productType = type.toUpperCase() as ProductType;

    // ACCESSORY không có size guide
    if (productType === 'ACCESSORY') {
      return res.json({
        success: true,
        data: null,
        message: 'Phụ kiện không có bảng size',
      });
    }

    const template = await prisma.sizeChartTemplate.findUnique({
      where: { productType },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy bảng size cho loại: ${type}`,
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
 * @route   GET /api/size-templates/product/:productId
 * @desc    Get size chart for a specific product (handles customSizeChart)
 * @access  Public
 */
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        productType: true,
        customSizeChart: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // ACCESSORY không có size guide
    if (product.productType === 'ACCESSORY') {
      return res.json({
        success: true,
        data: null,
        message: 'Phụ kiện không có bảng size',
        productType: 'ACCESSORY',
      });
    }

    // Ưu tiên 1: Custom size chart của sản phẩm
    if (product.customSizeChart) {
      return res.json({
        success: true,
        data: product.customSizeChart,
        source: 'custom',
        productType: product.productType,
      });
    }

    // Ưu tiên 2: Template theo product type
    const template = await prisma.sizeChartTemplate.findUnique({
      where: { productType: product.productType },
    });

    if (template) {
      return res.json({
        success: true,
        data: {
          name: template.name,
          headers: template.headers,
          sizes: template.sizes,
          measurements: template.measurements,
          tips: template.tips,
          note: template.note,
          measurementImage: template.measurementImage,
        },
        source: 'template',
        productType: product.productType,
      });
    }

    // Fallback
    res.json({
      success: true,
      data: null,
      message: 'Không có bảng size cho sản phẩm này',
      productType: product.productType,
    });
  } catch (error) {
    console.error('Error fetching product size chart:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng size',
    });
  }
});

export default router;
