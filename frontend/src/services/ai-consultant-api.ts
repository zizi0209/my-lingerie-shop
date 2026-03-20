import { getApiBaseUrl } from '@/lib/apiBase';

const API_BASE = getApiBaseUrl();
const CHATJPT_BUSY_MESSAGE = 'ChatJPT hiện đang bận. Vui lòng thử lại sau ít phút.';
const CHATJPT_UNREACHABLE_MESSAGE = 'Không thể kết nối với ChatJPT. Vui lòng thử lại sau.';
 
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

    const data = (await response.json().catch(() => null)) as ChatResponse | null;
    if (!response.ok) {
      const fallbackMessage = CHATJPT_BUSY_MESSAGE;
      return {
        success: false,
        error: data?.error || fallbackMessage,
      };
    }
    return data ?? {
      success: false,
      error: CHATJPT_BUSY_MESSAGE,
    };
   } catch (error) {
     console.error('AI Consultant API Error:', error);
     return {
       success: false,
      error: CHATJPT_UNREACHABLE_MESSAGE,
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
