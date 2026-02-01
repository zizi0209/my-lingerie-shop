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

    // Validate Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ 
        error: 'Cloudinary chưa được cấu hình!',
        details: 'Missing Cloudinary environment variables'
      });
    }

    const folder = req.body.folder || 'lingerie-shop/no-bg';
    const method = req.body.method || 'auto'; // 'ai', 'advanced', 'simple', or 'auto'
    const model = req.body.model || 'medium'; // 'small' or 'medium' (for AI)
    const outputFormat = req.body.format || 'webp'; // 'webp' or 'png'
    const tolerance = parseInt(req.body.tolerance) || 40; // Higher tolerance = more aggressive background removal

    console.log(`🎨 Removing background from image:`, {
      method,
      model,
      outputFormat,
      folder,
      tolerance,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
    
    // Remove background
    let processedBuffer: Buffer;
    try {
      processedBuffer = await removeImageBackground(req.file.buffer, {
        method: method === 'auto' ? undefined : method,
        model: model as 'small' | 'medium',
        output: {
          format: outputFormat as 'png' | 'webp',
          quality: 0.9,
        },
        tolerance: tolerance, // Pass tolerance for advanced method
      });
    } catch (bgError) {
      console.error('❌ Background removal failed:', bgError);
      return res.status(500).json({
        error: 'Không thể xóa nền ảnh!',
        details: bgError instanceof Error ? bgError.message : 'Background removal failed',
        step: 'background_removal'
      });
    }

    console.log('✅ Background removed successfully, buffer size:', processedBuffer.length);

    // Upload to Cloudinary with format preserved
    let result: any;
    try {
      console.log('📤 Uploading to Cloudinary...');
      result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            format: outputFormat, // ✅ WebP or PNG
            flags: 'preserve_transparency', // ✅ Preserve alpha channel
            transformation: [
              { quality: 'auto:best' }, // ✅ Best quality for transparency
            ],
          },
          (error, uploadResult) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(uploadResult);
            }
          }
        ).end(processedBuffer);
      });
    } catch (uploadError) {
      console.error('❌ Cloudinary upload failed:', uploadError);
      return res.status(500).json({
        error: 'Không thể tải ảnh lên Cloudinary!',
        details: uploadError instanceof Error ? uploadError.message : 'Upload failed',
        step: 'cloudinary_upload'
      });
    }

    console.log('✅ Uploaded to Cloudinary:', {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
    });

    // Save to database
    console.log('💾 Saving to database...');
    let media: any;
    try {
      media = await prisma.media.create({
        data: {
          filename: result.public_id,
          originalName: req.file.originalname.replace(/\.[^/.]+$/, '') + `-no-bg.${outputFormat}`,
          mimeType: `image/${outputFormat}`,
          size: processedBuffer.length,
          url: result.secure_url,
          publicId: result.public_id,
          folder: folder,
        },
      });
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError);
      // Still return success since the image was uploaded to Cloudinary
      return res.json({
        success: true,
        data: {
          id: null,
          url: result.secure_url,
          processedUrl: result.secure_url,
          publicId: result.public_id,
          filename: result.public_id,
          originalName: req.file.originalname,
          mimeType: `image/${outputFormat}`,
          size: processedBuffer.length,
          method: method,
          format: outputFormat,
          warning: 'Image uploaded but not saved to database'
        },
      });
    }

    console.log('✅ Saved to database, media ID:', media.id);

    res.json({
      success: true,
      data: {
        id: media.id,
        url: media.url,
        processedUrl: result.secure_url,
        publicId: media.publicId,
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        method: method,
        format: outputFormat,
      },
    });
  } catch (error) {
    console.error('❌ Remove background error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
