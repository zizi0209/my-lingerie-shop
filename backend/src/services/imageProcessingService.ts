 /**
  * Image Processing Service
  *
  * Orchestrates the pipeline:
  * 1. Background removal (server-side AI via @imgly/background-removal-node)
  * 2. Upload noBg image to Cloudinary
  * 3. Generate 3D model via TripoSR
  * 4. Upload .glb to Cloudinary
  * 5. Update ProductImage record
  */
 
 import { prisma } from '../lib/prisma';
 import { cloudinary } from '../config/cloudinary';
 import { removeImageBackground } from '../utils/backgroundRemoval';
import { generateModel3D } from './tripoSrClient';
import { getTripoSrAvailability } from './tripoSrHealth';
 
 interface ProcessingResult {
   imageId: number;
   success: boolean;
   noBgUrl?: string;
   model3dUrl?: string;
   error?: string;
 }
 
 /**
  * Upload buffer to Cloudinary
  */
 async function uploadBufferToCloudinary(
   buffer: Buffer,
   options: { folder: string; format: string; resourceType?: string }
 ): Promise<string> {
   return new Promise((resolve, reject) => {
     const uploadOptions: Record<string, unknown> = {
       folder: options.folder,
       format: options.format,
       resource_type: options.resourceType || 'image',
     };
 
     if (options.format === 'glb') {
       uploadOptions.resource_type = 'raw';
     }
 
     const stream = cloudinary.uploader.upload_stream(
       uploadOptions,
       (error, result) => {
         if (error) reject(error);
         else if (!result) reject(new Error('Cloudinary returned no result'));
         else resolve(result.secure_url);
       }
     );
     stream.end(buffer);
   });
 }
 
 /**
  * Download image from URL to buffer
  */
 async function downloadImageBuffer(url: string): Promise<Buffer> {
   const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
   if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
   const arrayBuffer = await res.arrayBuffer();
   return Buffer.from(arrayBuffer);
 }
 
 /**
  * Process a single ProductImage: bg removal + 3D generation
  */
 export async function processProductImage(imageId: number): Promise<ProcessingResult> {
   try {
     // Mark as processing
     const image = await prisma.productImage.update({
       where: { id: imageId },
       data: { processingStatus: 'processing' },
     });
 
     if (!image) {
       return { imageId, success: false, error: 'Image not found' };
     }
 
     // Step 1: Download original image
     const imageBuffer = await downloadImageBuffer(image.url);
 
     // Step 2: Remove background
     let noBgUrl: string | undefined;
     try {
       const noBgBuffer = await removeImageBackground(imageBuffer, {
         method: 'ai',
         output: { format: 'png', quality: 0.95 },
       });
 
       noBgUrl = await uploadBufferToCloudinary(noBgBuffer, {
         folder: 'lingerie-shop/no-bg',
         format: 'png',
       });
 
       await prisma.productImage.update({
         where: { id: imageId },
         data: { noBgUrl },
       });
 
       console.log(`[Processing] Image ${imageId}: bg removed -> ${noBgUrl}`);
     } catch (bgErr) {
       const msg = bgErr instanceof Error ? bgErr.message : 'BG removal failed';
       console.error(`[Processing] Image ${imageId}: bg removal failed:`, msg);
       // Continue without noBgUrl - 3D generation can still try with original
     }
 
     // Step 3: Generate 3D model (only if TripoSR is available)
     let model3dUrl: string | undefined;
    const tripoHealth = await getTripoSrAvailability();
    const tripoAvailable = tripoHealth.available;
 
     if (tripoAvailable) {
       try {
         // Use noBg image if available, otherwise original
         const sourceBuffer = noBgUrl
           ? await downloadImageBuffer(noBgUrl)
           : imageBuffer;
 
         const result = await generateModel3D(sourceBuffer);
 
         if (result.success && result.glbBuffer) {
           model3dUrl = await uploadBufferToCloudinary(result.glbBuffer, {
             folder: 'lingerie-shop/3d-models',
             format: 'glb',
           });
 
           console.log(`[Processing] Image ${imageId}: 3D model -> ${model3dUrl}`);
         } else {
           console.warn(`[Processing] Image ${imageId}: 3D generation failed: ${result.error}`);
         }
       } catch (tripoErr) {
         const msg = tripoErr instanceof Error ? tripoErr.message : '3D generation failed';
         console.error(`[Processing] Image ${imageId}: TripoSR error:`, msg);
       }
     } else {
      console.warn(
        `[Processing] Image ${imageId}: TripoSR not available, skipping 3D (${tripoHealth.lastError || 'unhealthy'})`
      );
     }
 
     // Step 4: Update final status
   const status = noBgUrl && model3dUrl
     ? 'completed'
     : noBgUrl
       ? 'partial'
       : 'failed';
     await prisma.productImage.update({
       where: { id: imageId },
       data: {
         noBgUrl: noBgUrl || undefined,
         model3dUrl: model3dUrl || undefined,
         processingStatus: status,
       },
     });
 
     return { imageId, success: status === 'completed', noBgUrl, model3dUrl };
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Processing failed';
     console.error(`[Processing] Image ${imageId} failed:`, message);
 
     // Mark as failed
     await prisma.productImage.update({
       where: { id: imageId },
       data: { processingStatus: 'failed' },
     }).catch(() => {});
 
     return { imageId, success: false, error: message };
   }
 }

/**
 * Retry 3D generation for a single image (uses existing noBgUrl if available)
 */
export async function retryModel3DGeneration(imageId: number): Promise<ProcessingResult> {
  try {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, url: true, noBgUrl: true },
    });

    if (!image) {
      return { imageId, success: false, error: 'Image not found' };
    }

    await prisma.productImage.update({
      where: { id: imageId },
      data: { processingStatus: 'processing' },
    });

    const tripoHealth = await getTripoSrAvailability();
    if (!tripoHealth.available) {
      await prisma.productImage.update({
        where: { id: imageId },
        data: { processingStatus: image.noBgUrl ? 'partial' : 'failed' },
      });
      return {
        imageId,
        success: false,
        noBgUrl: image.noBgUrl || undefined,
        error: tripoHealth.lastError || 'TripoSR not available',
      };
    }

    const sourceBuffer = image.noBgUrl
      ? await downloadImageBuffer(image.noBgUrl)
      : await downloadImageBuffer(image.url);

    const result = await generateModel3D(sourceBuffer);
    if (!result.success || !result.glbBuffer) {
      await prisma.productImage.update({
        where: { id: imageId },
        data: { processingStatus: image.noBgUrl ? 'partial' : 'failed' },
      });
      return {
        imageId,
        success: false,
        noBgUrl: image.noBgUrl || undefined,
        error: result.error || 'TripoSR returned empty result',
      };
    }

    const model3dUrl = await uploadBufferToCloudinary(result.glbBuffer, {
      folder: 'lingerie-shop/3d-models',
      format: 'glb',
    });

    const status = image.noBgUrl ? 'completed' : 'partial';
    await prisma.productImage.update({
      where: { id: imageId },
      data: { model3dUrl, processingStatus: status },
    });

    return {
      imageId,
      success: status === 'completed',
      noBgUrl: image.noBgUrl || undefined,
      model3dUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '3D generation failed';
    await prisma.productImage.update({
      where: { id: imageId },
      data: { processingStatus: 'failed' },
    }).catch(() => {});

    return { imageId, success: false, error: message };
  }
}
 
 /**
  * Process all pending images for a product (async, fire-and-forget)
  */
 export async function processProductImagesAsync(productId: number): Promise<void> {
   const images = await prisma.productImage.findMany({
     where: { productId, processingStatus: 'pending' },
     select: { id: true },
   });
 
   if (images.length === 0) return;
 
   console.log(`[Processing] Starting pipeline for product ${productId}: ${images.length} images`);
 
   // Process sequentially to avoid overloading
   for (const image of images) {
     await processProductImage(image.id);
   }
 
   console.log(`[Processing] Pipeline completed for product ${productId}`);
 }
 
 /**
  * Retry failed images for a product
  */
 export async function retryFailedImages(productId: number): Promise<ProcessingResult[]> {
   // Reset failed images to pending
   await prisma.productImage.updateMany({
     where: { productId, processingStatus: 'failed' },
     data: { processingStatus: 'pending' },
   });
 
   const images = await prisma.productImage.findMany({
     where: { productId, processingStatus: 'pending' },
     select: { id: true },
   });
 
   const results: ProcessingResult[] = [];
   for (const image of images) {
     const result = await processProductImage(image.id);
     results.push(result);
   }
 
   return results;
 }
 
 /**
  * Get processing status for all images of a product
  */
 export async function getProcessingStatus(productId: number) {
   const images = await prisma.productImage.findMany({
     where: { productId },
     select: {
       id: true,
       url: true,
       noBgUrl: true,
       model3dUrl: true,
       processingStatus: true,
     },
     orderBy: { id: 'asc' },
   });
 
   const summary = {
     total: images.length,
     pending: images.filter(i => i.processingStatus === 'pending').length,
     processing: images.filter(i => i.processingStatus === 'processing').length,
     completed: images.filter(i => i.processingStatus === 'completed').length,
    partial: images.filter(i => i.processingStatus === 'partial').length,
     failed: images.filter(i => i.processingStatus === 'failed').length,
   };
 
   return { images, summary };
 }
