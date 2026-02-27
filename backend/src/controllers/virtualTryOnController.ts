import { Request, Response } from 'express';
import { processVirtualTryOn, checkSpacesStatus, resetProviderHealth, getProviderHealthStats } from '../services/virtualTryOnService';
import { validateTryOnInputs } from '../services/inputValidatorService';
import {
  createTryOnJob,
  updateTryOnJob,
  getTryOnJob,
  isTryOnJobStoreEnabled,
} from '../services/virtualTryOnJobRepository';
 
 export async function tryOn(req: Request, res: Response) {
  let jobId: string | undefined;
   try {
     console.log('=== Virtual Try-On Request Received ===');
     console.log('Content-Type:', req.headers['content-type']);
     console.log('Body keys:', Object.keys(req.body || {}));
     
     const { personImage, garmentImage } = req.body;
 
     if (!personImage || !garmentImage) {
       console.log('Missing images - personImage:', !!personImage, 'garmentImage:', !!garmentImage);
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
       console.log('Invalid base64 format');
       return res.status(400).json({
         success: false,
         error: 'Invalid image format. Expected base64 encoded images.',
       });
     }
 
     console.log('Images validated. Person:', Math.round(personImage.length/1024), 'KB, Garment:', Math.round(garmentImage.length/1024), 'KB');

     const validation = await validateTryOnInputs(personImage, garmentImage);
     if (!validation.ok && validation.error) {
       console.log('[TryOn] Input validation failed:', validation.error.code, validation.error.message);
       return res.status(422).json({
         success: false,
         error: validation.error.message,
         errorCode: validation.error.code,
         details: validation.error.details,
       });
     }
     const jobStoreEnabled = isTryOnJobStoreEnabled();
     const jobRecord = jobStoreEnabled
       ? await createTryOnJob({ status: 'processing' })
       : null;
     jobId = jobRecord?.jobId;

     console.log('Calling processVirtualTryOn...');
     
     const result = await processVirtualTryOn(personImage, garmentImage);
     
     console.log('Processing complete. Success:', result.success);
 
     if (result.success) {
       if (jobId) {
         await updateTryOnJob(jobId, {
           status: 'completed',
           provider: result.provider,
           processingTime: result.processingTime,
           resultImage: result.resultImage,
         });
       }

       return res.json({
         success: true,
         data: {
           resultImage: result.resultImage,
           provider: result.provider,
           processingTime: result.processingTime,
           ...(jobId ? { jobId } : {}),
         },
       });
     }

     if (jobId) {
       await updateTryOnJob(jobId, {
         status: 'failed',
         errorCode: result.errorCode,
         errorMessage: result.error || 'Failed to process virtual try-on',
       });
     }

     return res.status(503).json({
       success: false,
       error: result.error || 'Failed to process virtual try-on',
       errorCode: result.errorCode,
       message: 'Tất cả hệ thống AI đang bận. Vui lòng thử lại sau vài phút.',
       ...(jobId ? { jobId } : {}),
     });
   } catch (error) {
     console.error('Virtual try-on error:', error);
     const message = error instanceof Error ? error.message : 'Internal server error';
     if (jobId) {
       await updateTryOnJob(jobId, {
         status: 'failed',
         errorMessage: message,
       });
     }
     return res.status(500).json({
       success: false,
       error: message,
       message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
     });
   }
 }

export async function getJobStatus(req: Request, res: Response) {
  try {
    if (!isTryOnJobStoreEnabled()) {
      return res.status(501).json({
        success: false,
        error: 'Try-on job tracking is not configured',
      });
    }

    const jobId = req.params.id;
    const job = await getTryOnJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
}

export async function resetHealth(_req: Request, res: Response) {
  try {
    resetProviderHealth();
    
    return res.json({
      success: true,
      message: 'All provider health stats have been reset',
    });
  } catch (error) {
    console.error('Reset health error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset health stats',
    });
  }
}

export async function getHealthStats(_req: Request, res: Response) {
  try {
    const stats = getProviderHealthStats();
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Health stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get health stats',
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
 