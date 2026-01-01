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
