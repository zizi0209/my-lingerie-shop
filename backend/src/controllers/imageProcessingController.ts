 import { Request, Response } from 'express';
 import {
   processProductImage,
   processProductImagesAsync,
   retryFailedImages,
   getProcessingStatus,
 } from '../services/imageProcessingService';
 import { isTripoSrAvailable } from '../services/tripoSrClient';
 
 /**
  * GET /api/products/:id/processing-status
  * Lấy trạng thái xử lý ảnh của sản phẩm
  */
 export const getProductProcessingStatus = async (req: Request, res: Response) => {
   try {
     const { id } = req.params;
     const status = await getProcessingStatus(Number(id));
 
     res.json({ success: true, data: status });
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Lỗi không xác định';
     res.status(500).json({ error: message });
   }
 };
 
 /**
  * POST /api/products/:id/process-images
  * Trigger xử lý ảnh cho sản phẩm (async)
  */
 export const triggerImageProcessing = async (req: Request, res: Response) => {
   try {
     const { id } = req.params;
     const productId = Number(id);
 
     // Fire-and-forget: start processing in background
     processProductImagesAsync(productId).catch((err) => {
       console.error(`[Processing] Background processing failed for product ${productId}:`, err);
     });
 
     res.json({
       success: true,
       message: 'Đã bắt đầu xử lý ảnh. Kiểm tra trạng thái qua GET /processing-status',
     });
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Lỗi không xác định';
     res.status(500).json({ error: message });
   }
 };
 
 /**
  * POST /api/products/:id/retry-processing
  * Retry xử lý ảnh thất bại
  */
 export const retryImageProcessing = async (req: Request, res: Response) => {
   try {
     const { id } = req.params;
     const results = await retryFailedImages(Number(id));
 
     res.json({
       success: true,
       message: `Đã xử lý lại ${results.length} ảnh`,
       data: results,
     });
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Lỗi không xác định';
     res.status(500).json({ error: message });
   }
 };
 
 /**
  * POST /api/images/:imageId/process
  * Xử lý lại 1 ảnh cụ thể
  */
 export const processSingleImage = async (req: Request, res: Response) => {
   try {
     const { imageId } = req.params;
     const result = await processProductImage(Number(imageId));
 
     res.json({ success: result.success, data: result });
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Lỗi không xác định';
     res.status(500).json({ error: message });
   }
 };
 
 /**
  * GET /api/processing/triposr-status
  * Kiểm tra TripoSR service có sẵn không
  */
 export const checkTripoSrStatus = async (_req: Request, res: Response) => {
   try {
     const available = await isTripoSrAvailable();
     res.json({ success: true, available });
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Lỗi không xác định';
     res.status(500).json({ error: message });
   }
 };
