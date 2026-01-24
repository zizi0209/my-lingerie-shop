import { Request, Response } from 'express';
import { cloudinary } from '../config/cloudinary';
import { prisma } from '../lib/prisma';
import { 
  removeImageBackground, 
  isBackgroundRemovalAvailable,
  isAIBackgroundRemovalAvailable,
  getAvailableMethods 
} from '../utils/backgroundRemoval';

/**
 * Remove background from uploaded image
 */
export const removeBackgroundFromImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload!' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh!' });
    }

    const folder = req.body.folder || 'lingerie-shop/no-bg';
    const method = req.body.method || 'auto'; // 'ai', 'advanced', 'simple', or 'auto'
    const model = req.body.model || 'medium'; // 'small' or 'medium' (for AI)

    console.log(`🎨 Removing background from image using ${method} method...`);
    
    // Remove background
    const processedBuffer = await removeImageBackground(req.file.buffer, {
      method: method === 'auto' ? undefined : method,
      model: model as 'small' | 'medium',
      output: {
        format: 'png',
        quality: 0.9,
      },
    });

    console.log('✅ Background removed successfully');

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: folder,
          format: 'png',
          transformation: [
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(processedBuffer);
    });

    // Save to database
    const media = await prisma.media.create({
      data: {
        filename: result.public_id,
        originalName: req.file.originalname.replace(/\.[^/.]+$/, '') + '-no-bg.png',
        mimeType: 'image/png',
        size: processedBuffer.length,
        url: result.secure_url,
        publicId: result.public_id,
        folder: folder,
      },
    });

    console.log('✅ Uploaded to Cloudinary:', result.secure_url);

    res.json({
      success: true,
      data: {
        ...media,
        originalUrl: req.file.originalname,
        processedUrl: result.secure_url,
        method: method,
      },
    });
  } catch (error) {
    console.error('Remove background error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi xóa nền ảnh!',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Check if background removal feature is available
 */
export const checkBackgroundRemovalStatus = async (req: Request, res: Response) => {
  try {
    const available = isBackgroundRemovalAvailable();
    const aiAvailable = isAIBackgroundRemovalAvailable();
    const methods = getAvailableMethods();
    
    res.json({
      success: true,
      available,
      aiAvailable,
      methods,
      message: available 
        ? `Background removal is available (methods: ${methods.join(', ')})` 
        : 'Background removal is not available',
      recommendation: aiAvailable 
        ? 'AI method recommended for best quality'
        : 'Using fallback methods (simple/advanced)',
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check background removal status',
      available: false,
    });
  }
};
