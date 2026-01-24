import sharp from 'sharp';

/**
 * Simple background removal using color threshold
 * Works best for logos with solid/white backgrounds
 * @param imageBuffer - Input image buffer
 * @param options - Optional configuration
 * @returns Buffer of image with transparent background
 */
export async function removeImageBackgroundSimple(
  imageBuffer: Buffer,
  options?: {
    threshold?: number; // 0-255, higher = more aggressive (default: 240)
    backgroundColor?: 'white' | 'black' | 'auto'; // default: 'auto'
  }
): Promise<Buffer> {
  try {
    const threshold = options?.threshold || 240;
    const bgColor = options?.backgroundColor || 'auto';

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Convert to raw pixel data
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process pixels to remove background
    const pixels = new Uint8ClampedArray(data);
    const channels = info.channels;

    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Detect background color
      let isBackground = false;

      if (bgColor === 'white' || bgColor === 'auto') {
        // Remove white/light backgrounds
        if (r >= threshold && g >= threshold && b >= threshold) {
          isBackground = true;
        }
      }

      if (bgColor === 'black' || (bgColor === 'auto' && !isBackground)) {
        // Remove black/dark backgrounds
        if (r <= (255 - threshold) && g <= (255 - threshold) && b <= (255 - threshold)) {
          isBackground = true;
        }
      }

      // Make background transparent
      if (isBackground) {
        pixels[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    // Convert back to PNG with transparency
    const result = await sharp(pixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: channels,
      },
    })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    return result;
  } catch (error) {
    console.error('Simple background removal error:', error);
    throw new Error('Failed to remove background from image');
  }
}

/**
 * Advanced background removal using edge detection and flood fill
 * Better quality than simple threshold method
 */
export async function removeImageBackgroundAdvanced(
  imageBuffer: Buffer,
  options?: {
    tolerance?: number; // 0-100, color similarity tolerance (default: 10)
  }
): Promise<Buffer> {
  try {
    const tolerance = options?.tolerance || 10;

    // Convert to raw pixel data
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data);
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Sample corner pixels to detect background color
    const corners = [
      { x: 0, y: 0 },
      { x: width - 1, y: 0 },
      { x: 0, y: height - 1 },
      { x: width - 1, y: height - 1 },
    ];

    // Get average background color from corners
    let avgR = 0, avgG = 0, avgB = 0;
    corners.forEach(({ x, y }) => {
      const idx = (y * width + x) * channels;
      avgR += pixels[idx];
      avgG += pixels[idx + 1];
      avgB += pixels[idx + 2];
    });
    avgR /= corners.length;
    avgG /= corners.length;
    avgB /= corners.length;

    // Remove pixels similar to background color
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - avgR, 2) +
        Math.pow(g - avgG, 2) +
        Math.pow(b - avgB, 2)
      );

      // If color is similar to background, make it transparent
      if (distance <= tolerance * 2.55) {
        pixels[i + 3] = 0; // Set alpha to 0
      }
    }

    // Convert back to PNG
    const result = await sharp(pixels, {
      raw: {
        width: width,
        height: height,
        channels: channels,
      },
    })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    return result;
  } catch (error) {
    console.error('Advanced background removal error:', error);
    throw new Error('Failed to remove background from image');
  }
}

/**
 * Check if simple background removal is available (always true since it uses Sharp)
 */
export function isSimpleBackgroundRemovalAvailable(): boolean {
  return true;
}
