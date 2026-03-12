import { PrismaClient } from '@prisma/client';
import { clearSessionMessages, getSessionMessages, setSessionMessages } from './chatSessionStore';
import { generateWithFallback } from './llm/llmOrchestrator';
import type { ChatMessage, LLMProviderName } from './llm/types';
import { LLMProviderError } from './llm/types';

const prisma = new PrismaClient();

const AI_UNAVAILABLE_MESSAGE = 'Không thể kết nối trợ lý AI lúc này. Vui lòng thử lại sau.';

interface ChatContext {
  currentProductSlug?: string;
  userMeasurements?: {
    bust?: number;
    waist?: number;
    hip?: number;
  };
  conversationHistory?: ChatMessage[];
}

interface ChatOptions {
  preferredProvider?: LLMProviderName;
  preferredModel?: string;
  clientMessages?: ChatMessage[];
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
  providerUsed?: LLMProviderName;
  modelUsed?: string;
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
  private normalizeHistory(input: ChatMessage[]): ChatMessage[] {
    return input
      .filter(
        (message) =>
          message &&
          typeof message.content === 'string' &&
          (message.role === 'user' || message.role === 'assistant')
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0)
      .slice(-20);
  }

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

  async chat(
    sessionId: string,
    userMessage: string,
    context?: ChatContext,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let history: ChatMessage[] = [];
    let historySource = 'redis';

    if (options?.clientMessages && options.clientMessages.length > 0) {
      history = this.normalizeHistory(options.clientMessages);
      historySource = 'client';
    } else if (context?.conversationHistory && context.conversationHistory.length > 0) {
      history = this.normalizeHistory(context.conversationHistory);
      historySource = 'context';
    } else {
      const stored = await getSessionMessages(sessionId);
      if (stored === null) {
        historySource = 'stateless';
      } else {
        history = this.normalizeHistory(stored);
      }
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

    const trimmedMessage = userMessage.trim();
    let aiMessage: string;
    let providerUsed: LLMProviderName | undefined;
    let modelUsed: string | undefined;

    try {
      const response = await generateWithFallback(
        {
          systemPrompt: systemPromptWithContext,
          userMessage: trimmedMessage,
          history,
          requestId,
          preferredModel: options?.preferredModel,
        },
        options?.preferredProvider,
      );
      aiMessage = response.message;
      providerUsed = response.provider;
      modelUsed = response.model;
      console.log(
        `[AIConsultant][${requestId}] provider=${response.provider} model=${response.model} historySource=${historySource}`
      );
    } catch (error) {
      console.error(`[AIConsultant][${requestId}] all_providers_failed`, error);
      if (error instanceof LLMProviderError) {
        throw error;
      }
      throw new Error(AI_UNAVAILABLE_MESSAGE);
    }

    const nextHistory = this.normalizeHistory([
      ...history,
      { role: 'user', content: trimmedMessage },
      { role: 'assistant', content: aiMessage },
    ]);

    const stored = await setSessionMessages(sessionId, nextHistory);
    if (!stored) {
      console.warn(`[AIConsultant][${requestId}] session_store_unavailable`);
    }

    const suggestedProducts = await this.searchRelatedProducts(userMessage);

    return {
      message: aiMessage,
      suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
      providerUsed,
      modelUsed,
    };
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
    void clearSessionMessages(sessionId);
  }
}

export const aiConsultantService = new AIConsultantService();
