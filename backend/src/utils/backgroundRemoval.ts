import sharp from 'sharp';

// Try to import AI-based background removal (optional)
let removeBackground: any = null;
let isAIAvailable = false;

try {
  const bgRemoval = require('@imgly/background-removal-node');
  removeBackground = bgRemoval.removeBackground;
  isAIAvailable = true;
} catch {
  console.warn('⚠️  AI background removal not available, using fallback method');
}

// Import fallback methods
import { 
  removeImageBackgroundSimple, 
  removeImageBackgroundAdvanced 
} from './backgroundRemovalSimple';

/**
 * Remove background from image buffer using best available method
 * @param imageBuffer - Input image buffer
 * @param options - Optional configuration
 * @returns Buffer of image with transparent background (WebP format)
 */
export async function removeImageBackground(
  imageBuffer: Buffer,
  options?: {
    model?: 'small' | 'medium'; // AI model (only if AI available)
    method?: 'ai' | 'simple' | 'advanced'; // Force specific method
    output?: {
      format?: 'png' | 'webp';
      quality?: number;
    };
    threshold?: number; // For simple method
    tolerance?: number; // For advanced method
  }
): Promise<Buffer> {
  try {
    // Force 'advanced' method for now to avoid AI model issues
    const method = options?.method || 'advanced';
    const outputFormat = options?.output?.format || 'webp'; // ✅ Default to WebP
    const outputQuality = options?.output?.quality || 0.9;

    console.log(`🔧 Background removal config:`, {
      requestedMethod: options?.method,
      actualMethod: method,
      isAIAvailable,
      outputFormat,
      outputQuality,
    });

    // Method 1: AI-based (best quality, requires @imgly/background-removal-node)
    if (method === 'ai' && isAIAvailable && removeBackground) {
      console.log('🤖 Using AI background removal...');
      const blob = await removeBackground(imageBuffer, {
        model: options?.model || 'medium',
        output: {
          format: 'png', // AI outputs PNG first
          quality: outputQuality,
          type: 'foreground',
        },
      });

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert to desired format (WebP or PNG)
      const optimized = outputFormat === 'webp'
        ? await sharp(buffer)
            .webp({ quality: Math.round(outputQuality * 100), alphaQuality: 100 })
            .toBuffer()
        : await sharp(buffer)
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer();

      return optimized;
    }

    // Method 2: Advanced (good quality, uses edge detection)
    if (method === 'advanced' || method === 'ai') {
      console.log('🎨 Using advanced background removal...');
      const pngBuffer = await removeImageBackgroundAdvanced(imageBuffer, {
        tolerance: options?.tolerance,
      });
      
      // Convert to WebP if requested
      if (outputFormat === 'webp') {
        return await sharp(pngBuffer)
          .webp({ quality: Math.round(outputQuality * 100), alphaQuality: 100 })
          .toBuffer();
      }
      return pngBuffer;
    }

    // Method 3: Simple (fast, works for solid backgrounds)
    console.log('⚡ Using simple background removal...');
    const pngBuffer = await removeImageBackgroundSimple(imageBuffer, {
      threshold: options?.threshold,
    });
    
    // Convert to WebP if requested
    if (outputFormat === 'webp') {
      return await sharp(pngBuffer)
        .webp({ quality: Math.round(outputQuality * 100), alphaQuality: 100 })
        .toBuffer();
    }
    return pngBuffer;

  } catch (error) {
    console.error('Background removal error:', error);
    throw new Error('Failed to remove background from image');
  }
}

/**
 * Check if background removal is available
 */
export function isBackgroundRemovalAvailable(): boolean {
  return true; // Always available (fallback to simple/advanced methods)
}

/**
 * Check if AI background removal is available
 */
export function isAIBackgroundRemovalAvailable(): boolean {
  return isAIAvailable;
}

/**
 * Get available background removal methods
 */
export function getAvailableMethods(): string[] {
  const methods = ['simple', 'advanced'];
  if (isAIAvailable) {
    methods.unshift('ai');
  }
  return methods;
}
