 import { Request, Response } from 'express';
 import { processVirtualTryOn, checkSpacesStatus } from '../services/virtualTryOnService';
 
 export async function tryOn(req: Request, res: Response) {
   try {
     const { personImage, garmentImage } = req.body;
 
     if (!personImage || !garmentImage) {
       return res.status(400).json({
         success: false,
         error: 'personImage and garmentImage are required',
       });
     }
 
     // Validate base64 images
     const isValidBase64 = (str: string) => {
       return str.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(str);
     };
 
     if (!isValidBase64(personImage) || !isValidBase64(garmentImage)) {
       return res.status(400).json({
         success: false,
         error: 'Invalid image format. Expected base64 encoded images.',
       });
     }
 
     console.log('Processing virtual try-on request...');
     
     const result = await processVirtualTryOn(personImage, garmentImage);
 
     if (result.success) {
       return res.json({
         success: true,
         data: {
           resultImage: result.resultImage,
           provider: result.provider,
           processingTime: result.processingTime,
         },
       });
     } else {
       return res.status(503).json({
         success: false,
         error: result.error || 'Failed to process virtual try-on',
         message: 'Tất cả hệ thống AI đang bận. Vui lòng thử lại sau vài phút.',
       });
     }
   } catch (error) {
     console.error('Virtual try-on error:', error);
     return res.status(500).json({
       success: false,
       error: 'Internal server error',
       message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
     });
   }
 }
 
 export async function getStatus(_req: Request, res: Response) {
   try {
     const statuses = await checkSpacesStatus();
 
     const available = statuses.some((s) => s.available);
 
     return res.json({
       success: true,
       data: {
         available,
         providers: statuses,
       },
     });
   } catch (error) {
     console.error('Status check error:', error);
     return res.status(500).json({
       success: false,
       error: 'Failed to check status',
     });
   }
 }
