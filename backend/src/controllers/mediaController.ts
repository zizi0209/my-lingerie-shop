import { Request, Response } from 'express';
import { cloudinary } from '../config/cloudinary';
import { prisma } from "../lib/prisma";

// Helper: Generate WebP URL from Cloudinary URL
const getWebPUrl = (url: string): string => {
  // Chèn f_webp vào URL để auto-deliver WebP
  return url.replace('/upload/', '/upload/f_webp,q_auto/');
};

// Upload single image
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload!' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh!' });
    }

    // Get folder from request body (default: 'lingerie-shop')
    const folder = req.body.folder || 'lingerie-shop';

    // Detect if image is PNG (to preserve transparency)
    const isPNG = req.file.mimetype === 'image/png';

    // Upload lên Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: folder,
        format: isPNG ? 'png' : undefined, // Preserve PNG format for transparency
        flags: isPNG ? 'preserve_transparency' : undefined, // Preserve alpha channel
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Giới hạn kích thước
          { quality: isPNG ? 'auto:best' : 'auto' }, // Best quality for PNG
        ],
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Lỗi khi upload lên Cloudinary!' });
        }

        if (!result) {
          return res.status(500).json({ error: 'Không nhận được kết quả từ Cloudinary!' });
        }

        // Lưu vào database
        try {
          const media = await prisma.media.create({
            data: {
              filename: result.public_id,
              originalName: req.file!.originalname,
              mimeType: req.file!.mimetype,
              size: req.file!.size,
              url: result.secure_url,
              publicId: result.public_id,
              folder: folder,
            },
          });

          // Tạo WebP URL cho response
          const webpUrl = getWebPUrl(result.secure_url);

          res.json({
            success: true,
            data: {
              ...media,
              webpUrl, // URL tự động deliver WebP
            },
          });
        } catch (dbError) {
          console.error('Database save error:', dbError);
          // Nếu lưu DB thất bại, xóa ảnh trên Cloudinary
          await cloudinary.uploader.destroy(result.public_id);
          res.status(500).json({ error: 'Lỗi khi lưu vào database!' });
        }
      }
    );

    // Gửi buffer của file lên Cloudinary
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Lỗi server!' });
  }
};

// Upload multiple images
export const uploadMultipleImages = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Không có file được upload!' });
    }

    // Validate file types
    for (const file of req.files) {
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh!' });
      }
    }

    // Get folder from request body (default: 'lingerie-shop')
    const folder = req.body.folder || 'lingerie-shop';

    const uploadPromises = req.files.map((file) => {
      // Detect if image is PNG (to preserve transparency)
      const isPNG = file.mimetype === 'image/png';
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            format: isPNG ? 'png' : undefined, // Preserve PNG format for transparency
            flags: isPNG ? 'preserve_transparency' : undefined, // Preserve alpha channel
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: isPNG ? 'auto:best' : 'auto' },
            ],
          },
          async (error, result) => {
            if (error) {
              reject(error);
            } else if (!result) {
              reject(new Error('Không nhận được kết quả từ Cloudinary!'));
            } else {
              try {
                const media = await prisma.media.create({
                  data: {
                    filename: result.public_id,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    url: result.secure_url,
                    publicId: result.public_id,
                    folder: folder,
                  },
                });
                resolve(media);
              } catch (dbError) {
                // Xóa ảnh trên Cloudinary nếu lưu DB thất bại
                await cloudinary.uploader.destroy(result.public_id);
                reject(dbError);
              }
            }
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Lỗi khi upload nhiều ảnh!' });
  }
};

// Lấy danh sách media
export const getMediaList = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, folder } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    const folderValue =
      typeof folder === 'string'
        ? folder
        : Array.isArray(folder)
          ? folder[0]
          : undefined;
    if (folderValue) where.folder = folderValue;

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.media.count({ where }),
    ]);

    res.json({
      success: true,
      data: media,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get media list error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách media!' });
  }
};

// Lấy media by ID
export const getMediaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await prisma.media.findUnique({
      where: { id: Number(id) },
    });

    if (!media) {
      return res.status(404).json({ error: 'Không tìm thấy media!' });
    }

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error('Get media by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin media!' });
  }
};

// Xóa media
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Lấy thông tin media từ DB
    const media = await prisma.media.findUnique({
      where: { id: Number(id) },
    });

    if (!media) {
      return res.status(404).json({ error: 'Không tìm thấy media!' });
    }

    // Xóa trên Cloudinary
    await cloudinary.uploader.destroy(media.publicId);

    // Xóa trong DB
    await prisma.media.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa media thành công!',
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa media!' });
  }
};

