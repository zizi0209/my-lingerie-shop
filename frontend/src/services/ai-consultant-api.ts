 const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
 
 interface ChatContext {
   currentProductSlug?: string;
   userMeasurements?: {
     bust?: number;
     waist?: number;
     hip?: number;
   };
  conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
 }

export type LLMProviderName = 'chatjpt' | 'workers_ai' | 'gemini' | 'groq';

export interface ModelOption {
  id: string;
  label: string;
  provider: LLMProviderName;
  contextWindowTokens?: number;
  featured?: boolean;
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
    providerUsed?: LLMProviderName;
    modelUsed?: string;
   };
   error?: string;
 }
 
 export async function sendChatMessage(
   message: string,
   sessionId?: string,
  context?: ChatContext,
  options?: {
    preferredProvider?: LLMProviderName;
    preferredModel?: string;
    messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  }
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
        preferredProvider: options?.preferredProvider,
        preferredModel: options?.preferredModel,
        messages: options?.messages,
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

export async function fetchChatModels(): Promise<ModelOption[]> {
  try {
    const response = await fetch(`${API_BASE}/ai-consultant/models`, {
      method: 'GET',
    });
    const data = (await response.json()) as {
      success?: boolean;
      data?: { models?: ModelOption[] };
    };
    return data?.data?.models ?? [];
  } catch (error) {
    console.error('Failed to load chat models:', error);
    return [];
  }
}
