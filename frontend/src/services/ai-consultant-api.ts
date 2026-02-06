 const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
 
 interface ChatContext {
   currentProductSlug?: string;
   userMeasurements?: {
     bust?: number;
     waist?: number;
     hip?: number;
   };
 }
 
 interface SuggestedProduct {
   id: number;
   name: string;
   slug: string;
   price: number;
   imageUrl?: string;
 }
 
 interface ChatResponse {
   success: boolean;
   data?: {
     message: string;
     sessionId: string;
     suggestedProducts?: SuggestedProduct[];
   };
   error?: string;
 }
 
 export async function sendChatMessage(
   message: string,
   sessionId?: string,
   context?: ChatContext
 ): Promise<ChatResponse> {
   try {
     const response = await fetch(`${API_BASE}/ai-consultant/chat`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         message,
         sessionId,
         context,
       }),
     });
 
     const data = await response.json();
     return data;
   } catch (error) {
     console.error('AI Consultant API Error:', error);
     return {
       success: false,
       error: 'Không thể kết nối với server. Vui lòng thử lại sau.',
     };
   }
 }
 
 export async function clearChatSession(sessionId: string): Promise<void> {
   try {
     await fetch(`${API_BASE}/ai-consultant/session/${sessionId}`, {
       method: 'DELETE',
     });
   } catch (error) {
     console.error('Failed to clear session:', error);
   }
 }
