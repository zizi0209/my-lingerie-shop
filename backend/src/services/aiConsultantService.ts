import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const DEFAULT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
const GEMINI_MODELS = (process.env.GEMINI_MODELS || '')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
const RESOLVED_GEMINI_MODELS = GEMINI_MODELS.length > 0 ? GEMINI_MODELS : DEFAULT_GEMINI_MODELS;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const AI_UNAVAILABLE_MESSAGE = 'Không thể kết nối trợ lý AI lúc này. Vui lòng thử lại sau.';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  currentProductSlug?: string;
  userMeasurements?: {
    bust?: number;
    waist?: number;
    hip?: number;
  };
  conversationHistory?: ChatMessage[];
}

interface ChatResponse {
  message: string;
  suggestedProducts?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }>;
}

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

const SYSTEM_PROMPT = `Bạn là Linh - tư vấn viên thời trang nội y chuyên nghiệp.

NGUYÊN TẮC BẮT BUỘC:
1. Luôn lịch sự, tế nhị, chuyên nghiệp
2. KHÔNG BAO GIỜ đề cập đến nội dung khiêu dâm, gợi dục, hoặc không phù hợp
3. Focus vào sự tự tin, thoải mái, chất lượng sản phẩm
4. Tư vấn dựa trên số đo và nhu cầu thực tế của khách hàng
5. Trả lời ngắn gọn, súc tích, dưới 150 từ
6. Sử dụng ngôn ngữ thân thiện, dễ hiểu
7. Khi được hỏi về sản phẩm, hãy sử dụng thông tin từ CONTEXT SẢN PHẨM bên dưới
8. Nếu không có thông tin về sản phẩm, hãy hỏi lại hoặc gợi ý khách xem catalog

CÁC CHỦ ĐỀ BẠN CÓ THỂ TƯ VẤN:
- Cách chọn size phù hợp (dựa trên số đo)
- Chất liệu và cách chăm sóc sản phẩm
- Phong cách phù hợp với dáng người
- Khuyến mãi và ưu đãi hiện có
- Chính sách đổi trả, bảo hành

CONTEXT SẢN PHẨM:
{productContext}

Hãy trả lời câu hỏi của khách hàng một cách chuyên nghiệp và hữu ích.`;

export class AIConsultantService {
  private conversationCache: Map<string, ChatMessage[]> = new Map();
  private currentModelIndex: number = 0;
  private groqFallbackActive: boolean = false;

  async getProductContext(productSlug?: string): Promise<string> {
    try {
      if (productSlug) {
        const product = await prisma.product.findFirst({
          where: { slug: productSlug },
          include: {
            category: true,
            variants: { include: { color: true } },
          },
        });

        if (product) {
          return `
Sản phẩm hiện tại: ${product.name}
Giá: ${product.price.toLocaleString('vi-VN')}đ
${product.salePrice ? `Giá khuyến mãi: ${product.salePrice.toLocaleString('vi-VN')}đ` : ''}
Danh mục: ${product.category?.name || 'N/A'}
Mô tả: ${product.description || 'Không có mô tả'}
Các size có sẵn: ${product.variants?.map(v => v.size).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A'}
Màu sắc: ${product.variants?.map(v => v.color?.name).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A'}
          `.trim();
        }
      }

      const featuredProducts = await prisma.product.findMany({
        where: { isVisible: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { name: true, price: true, salePrice: true, slug: true },
      });

      if (featuredProducts.length > 0) {
        return `Sản phẩm mới nhất:\n${featuredProducts.map(p => 
          `- ${p.name}: ${p.salePrice ? p.salePrice.toLocaleString('vi-VN') : p.price.toLocaleString('vi-VN')}đ`
        ).join('\n')}`;
      }

      return 'Chưa có thông tin sản phẩm cụ thể. Hãy hỏi khách hàng cần tư vấn về sản phẩm nào.';
    } catch (error) {
      console.error('Error fetching product context:', error);
      return 'Không thể lấy thông tin sản phẩm.';
    }
  }

  async chat(sessionId: string, userMessage: string, context?: ChatContext): Promise<ChatResponse> {
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let history = this.conversationCache.get(sessionId) || [];

    if (context?.conversationHistory) {
      history = context.conversationHistory;
    }

    const productContext = await this.getProductContext(context?.currentProductSlug);

    let userContextStr = '';
    if (context?.userMeasurements) {
      const { bust, waist, hip } = context.userMeasurements;
      if (bust || waist || hip) {
        userContextStr = `\n\nSỐ ĐO KHÁCH HÀNG: Ngực: ${bust || 'N/A'}cm, Eo: ${waist || 'N/A'}cm, Hông: ${hip || 'N/A'}cm`;
      }
    }

    const systemPromptWithContext = SYSTEM_PROMPT.replace('{productContext}', productContext + userContextStr);

    let aiMessage: string;

    try {
      if (this.groqFallbackActive && GROQ_API_KEY) {
        console.log(`[AIConsultant][${requestId}] provider=groq fallbackActive=true`);
        aiMessage = await this.callGroq(systemPromptWithContext, userMessage, history, requestId);
      } else if (genAI) {
        console.log(`[AIConsultant][${requestId}] provider=gemini models=${RESOLVED_GEMINI_MODELS.join(',')}`);
        aiMessage = await this.callGemini(systemPromptWithContext, userMessage, history, requestId);
      } else if (GROQ_API_KEY) {
        console.log(`[AIConsultant][${requestId}] provider=groq fallbackActive=false`);
        aiMessage = await this.callGroq(systemPromptWithContext, userMessage, history, requestId);
      } else {
        console.error(`[AIConsultant][${requestId}] missing_api_keys gemini=${Boolean(GEMINI_API_KEY)} groq=${Boolean(GROQ_API_KEY)}`);
        throw new Error(AI_UNAVAILABLE_MESSAGE);
      }
    } catch (error) {
      console.error(`[AIConsultant][${requestId}] primary_provider_failed`, error);

      if (!this.groqFallbackActive && GROQ_API_KEY) {
        console.log(`[AIConsultant][${requestId}] switching_to_groq_fallback`);
        this.groqFallbackActive = true;
        try {
          aiMessage = await this.callGroq(systemPromptWithContext, userMessage, history, requestId);
        } catch (groqError) {
          console.error(`[AIConsultant][${requestId}] groq_fallback_failed`, groqError);
          throw new Error(AI_UNAVAILABLE_MESSAGE);
        }
      } else {
        throw new Error(AI_UNAVAILABLE_MESSAGE);
      }
    }

    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: aiMessage });

    if (history.length > 20) {
      history = history.slice(-20);
    }

    this.conversationCache.set(sessionId, history);

    const suggestedProducts = await this.searchRelatedProducts(userMessage);

    return {
      message: aiMessage,
      suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
    };
  }

  private async callGemini(
    systemPrompt: string,
    userMessage: string,
    history: ChatMessage[],
    requestId?: string,
  ): Promise<string> {
    if (!genAI) throw new Error('Gemini not configured');

    let lastError: Error | null = null;
    
    const modelsLength = RESOLVED_GEMINI_MODELS.length;

    for (let attempt = 0; attempt < modelsLength; attempt++) {
      const modelIndex = (this.currentModelIndex + attempt) % modelsLength;
      const modelName = RESOLVED_GEMINI_MODELS[modelIndex];

      try {
        console.log(`[AIConsultant][${requestId || 'n/a'}] trying_gemini_model=${modelName}`);

        const model = genAI.getGenerativeModel({ model: modelName });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conversationParts: any[] = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
          history: conversationParts,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        const fullPrompt = history.length === 0 
          ? `${systemPrompt}\n\nKhách hàng: ${userMessage}`
          : userMessage;

        const result = await chat.sendMessage(fullPrompt);
        const response = result.response;
        
        this.currentModelIndex = modelIndex;
        return response.text();
      } catch (error) {
        console.error(`[AIConsultant][${requestId || 'n/a'}] gemini_model_failed=${modelName}`, error);
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }

  private async callGroq(
    systemPrompt: string,
    userMessage: string,
    history: ChatMessage[],
    requestId?: string,
  ): Promise<string> {
    if (!GROQ_API_KEY) throw new Error('Groq not configured');

    console.log(`[AIConsultant][${requestId || 'n/a'}] using_groq_model=${GROQ_MODEL}`);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[AIConsultant][${requestId || 'n/a'}] groq_api_error status=${response.status} model=${GROQ_MODEL}`, errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as GroqResponse;
    return data.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.';
  }

  private async searchRelatedProducts(query: string): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }>> {
    try {
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      if (keywords.length === 0) return [];

      const products = await prisma.product.findMany({
        where: {
          isVisible: true,
          OR: keywords.map(keyword => ({
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              { description: { contains: keyword, mode: 'insensitive' as const } },
            ],
          })),
        },
        take: 3,
        include: { images: { take: 1 } },
      });

      return products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        imageUrl: p.images?.[0]?.url || undefined,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  clearSession(sessionId: string): void {
    this.conversationCache.delete(sessionId);
  }
}

export const aiConsultantService = new AIConsultantService();
