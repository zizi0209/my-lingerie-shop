import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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

  async getProductContext(productSlug?: string): Promise<string> {
    try {
      if (productSlug) {
        const product = await prisma.product.findFirst({
          where: { slug: productSlug },
          include: {
            category: true,
            variants: {
              include: {
                color: true,
              },
            },
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
        select: {
          name: true,
          price: true,
          salePrice: true,
          slug: true,
        },
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
    context?: ChatContext
  ): Promise<ChatResponse> {
    if (!genAI) {
      throw new Error('Gemini API key is not configured');
    }

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

    const systemPromptWithContext = SYSTEM_PROMPT
      .replace('{productContext}', productContext + userContextStr);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const conversationParts = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: conversationParts as any,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });

      const fullPrompt = history.length === 0 
        ? `${systemPromptWithContext}\n\nKhách hàng: ${userMessage}`
        : userMessage;

      const result = await chat.sendMessage(fullPrompt);
      const response = result.response;
      const aiMessage = response.text();

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
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Không thể kết nối với AI. Vui lòng thử lại sau.');
    }
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
        include: {
          images: {
            take: 1,
          },
        },
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
