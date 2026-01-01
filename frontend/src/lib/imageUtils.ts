import imageCompression from 'browser-image-compression';

export interface CompressedImage {
  file: File;
  preview: string;
  originalSize: number;
  compressedSize: number;
  reduction: number;
}

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;
}

const defaultOptions: ImageCompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
  quality: 0.85,
};

/**
 * Compress and convert image to WebP format
 * Quality 0.85 = best balance between quality and file size
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImage> {
  const opts = { ...defaultOptions, ...options };
  const originalSize = file.size;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: opts.useWebWorker!,
      fileType: opts.fileType,
      initialQuality: opts.quality,
    });

    // Create new file with .webp extension
    const newFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    const webpFile = new File([compressedFile], newFileName, {
      type: 'image/webp',
    });

    const compressedSize = webpFile.size;
    const reduction = ((originalSize - compressedSize) / originalSize) * 100;

    // Create preview URL
    const preview = URL.createObjectURL(webpFile);

    return {
      file: webpFile,
      preview,
      originalSize,
      compressedSize,
      reduction,
    };
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {},
  onProgress?: (index: number, total: number) => void
): Promise<CompressedImage[]> {
  const results: CompressedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const compressed = await compressImage(files[i], options);
    results.push(compressed);
  }

  return results;
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Get accepted image types for input
 */
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff';

/**
 * Maximum file size before compression (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!isImageFile(file)) {
    return { valid: false, error: 'File không phải là hình ảnh' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File quá lớn (tối đa ${formatFileSize(MAX_FILE_SIZE)})` };
  }

  return { valid: true };
}

/**
 * Release object URLs to prevent memory leaks
 */
export function revokePreviewUrls(images: CompressedImage[]): void {
  images.forEach((img) => {
    if (img.preview) {
      URL.revokeObjectURL(img.preview);
    }
  });
}
