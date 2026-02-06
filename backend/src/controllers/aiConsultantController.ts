 import { Request, Response } from 'express';
 import { aiConsultantService } from '../services/aiConsultantService';
 import { v4 as uuidv4 } from 'uuid';
 
 interface ChatRequestBody {
   message: string;
   sessionId?: string;
   context?: {
     currentProductSlug?: string;
     userMeasurements?: {
       bust?: number;
       waist?: number;
       hip?: number;
     };
   };
 }
 
 // Content moderation - filter inappropriate content
 const BLOCKED_PATTERNS = [
   /sex/i,
   /porn/i,
   /nude/i,
   /khỏa thân/i,
   /khoả thân/i,
   /xxx/i,
   /18\+/i,
 ];
 
 function isInappropriateContent(text: string): boolean {
   return BLOCKED_PATTERNS.some(pattern => pattern.test(text));
 }
 
 export const chat = async (req: Request, res: Response): Promise<void> => {
   try {
     const { message, sessionId, context } = req.body as ChatRequestBody;
 
     // Validate message
     if (!message || typeof message !== 'string') {
       res.status(400).json({
         success: false,
         error: 'Tin nhắn không hợp lệ',
       });
       return;
     }
 
     // Check message length
     if (message.length > 1000) {
       res.status(400).json({
         success: false,
         error: 'Tin nhắn quá dài (tối đa 1000 ký tự)',
       });
       return;
     }
 
     // Content moderation
     if (isInappropriateContent(message)) {
       res.status(400).json({
         success: false,
         error: 'Nội dung không phù hợp. Vui lòng đặt câu hỏi liên quan đến sản phẩm.',
       });
       return;
     }
 
     // Generate or use existing session ID
     const currentSessionId = sessionId || uuidv4();
 
     // Call AI service
     const response = await aiConsultantService.chat(
       currentSessionId,
       message.trim(),
       context
     );
 
     res.json({
       success: true,
       data: {
         message: response.message,
         sessionId: currentSessionId,
         suggestedProducts: response.suggestedProducts,
       },
     });
   } catch (error) {
     console.error('AI Consultant Error:', error);
     
     const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
     
     res.status(500).json({
       success: false,
       error: errorMessage,
     });
   }
 };
 
 export const clearSession = async (req: Request, res: Response): Promise<void> => {
   try {
     const { sessionId } = req.params;
 
     if (!sessionId) {
       res.status(400).json({
         success: false,
         error: 'Session ID is required',
       });
       return;
     }
 
     aiConsultantService.clearSession(sessionId);
 
     res.json({
       success: true,
       message: 'Session cleared',
     });
   } catch (error) {
     console.error('Clear session error:', error);
     res.status(500).json({
       success: false,
       error: 'Failed to clear session',
     });
   }
 };
