export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
  time: string;
  providerUsed?: string;
  modelUsed?: string;
  suggestedProducts?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }>;
};

export type ChatSession = {
  id: string;
  title: string;
  model: string;
  provider?: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
  contextWindow?: string;
  contextWindowTokens?: number;
  featured?: boolean;
};
