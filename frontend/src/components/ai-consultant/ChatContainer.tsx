'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useWebSpeechTTS } from '@/hooks/useWebSpeechTTS';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { SpeakerButton } from './SpeakerButton';
import { MessageRenderer } from './chatjpt/MessageRenderer';
import { SessionSidebar } from './chatjpt/SessionSidebar';
import { ModelPickerModal } from './chatjpt/ModelPickerModal';
import type { ChatMessage, ChatSession, ModelOption } from './chatjpt/chatTypes';
import { fetchChatModels, sendChatMessage } from '@/services/ai-consultant-api';

interface ChatContainerProps {
  onClose: () => void;
  productSlug?: string;
  initialScrollTop?: number;
  initialChatId?: string;
  onScrollPositionChange?: (scrollTop: number) => void;
  onActiveChatChange?: (chatId: string) => void;
}

const CHAT_STORAGE_KEY = 'ai-consultant:sessions:v2';
const IS_CHATJPT_ONLY_MODE = process.env.NEXT_PUBLIC_AI_CHAT_TEST_FORCE_CHATJPT === 'true';
const DEFAULT_CHATJPT_MODEL_ID = 'gpt-oss-120b';
const DEFAULT_CHATJPT_PROVIDER = 'chatjpt';
const FALLBACK_MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gpt-oss-120b',
    label: 'GPT-OSS 120B',
    provider: 'openai',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
    featured: true,
  },
  {
    id: 'llama-3.3-70b-fp8-fast',
    label: 'Llama 3.3 70B FP8 Fast',
    provider: 'meta',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'llama-4-scout-17b-16e',
    label: 'Llama 4 Scout 17B 16E',
    provider: 'meta',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'gemma-3-12b-it',
    label: 'Gemma 3 12B IT',
    provider: 'google',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    label: 'DeepSeek R1 Distill Qwen 32B',
    provider: 'deepseek-ai',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'qwen3-30b-a3b-fp8',
    label: 'Qwen3 30B A3B FP8',
    provider: 'qwen',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'qwq-32b',
    label: 'QwQ 32B',
    provider: 'qwen',
    contextWindow: '128K tokens',
    contextWindowTokens: 128000,
  },
  {
    id: 'mistral-7b-instruct-v0.1',
    label: 'Mistral 7B Instruct v0.1',
    provider: 'mistral',
    contextWindow: '32K tokens',
    contextWindowTokens: 32000,
  },
];

const resolveContextWindow = (tokens?: number): string | undefined => {
  if (!tokens || tokens <= 0) return undefined;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K tokens`;
  return `${tokens} tokens`;
};

const resolveModelVendor = (modelId: string): string => {
  const normalized = modelId.toLowerCase();
  if (normalized.includes('gpt-oss') || normalized.includes('openai')) return 'openai';
  if (normalized.includes('llama')) return 'meta';
  if (normalized.includes('gemma')) return 'google';
  if (normalized.includes('deepseek')) return 'deepseek-ai';
  if (normalized.includes('qwen') || normalized.includes('qwq')) return 'qwen';
  if (normalized.includes('mistral')) return 'mistral';
  return 'chatjpt';
};

const mapModels = (models: Array<{
  id: string;
  label: string;
  provider: string;
  contextWindowTokens?: number;
  featured?: boolean;
}>): ModelOption[] =>
  models.map((model) => ({
    id: model.id,
    label: model.label,
    provider: resolveModelVendor(model.id),
    contextWindow: resolveContextWindow(model.contextWindowTokens),
    contextWindowTokens: model.contextWindowTokens,
    featured: model.featured,
  }));

const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const makeSessionTitle = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return 'Chat mới';
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean;
};

const createAssistantMessage = (content: string): ChatMessage => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  role: 'assistant',
  content,
  time: nowTime(),
});

const createSession = (model: string, provider?: string): ChatSession => {
  const now = Date.now();
  return {
    id: `${now}-${Math.floor(Math.random() * 10000)}`,
    title: 'Chat mới',
    model,
    provider,
    updatedAt: now,
    messages: [createAssistantMessage('Bắt đầu cuộc trò chuyện mới.')],
  };
};

const loadSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        ...item,
        messages: Array.isArray(item.messages) ? item.messages.slice(-100) : [],
      }))
      .filter((item) => item.messages.length > 0);
  } catch {
    return [];
  }
};

const persistSessions = (sessions: ChatSession[]) => {
  try {
    const filtered = sessions.filter((session) =>
      session.messages.some((message) => message.role === 'user' && message.content.trim())
    );
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
};

export function ChatContainer({
  onClose,
  productSlug,
  initialScrollTop,
  initialChatId,
  onScrollPositionChange,
  onActiveChatChange,
}: ChatContainerProps) {
  const { isSpeaking, isSupported: ttsSupported, autoSpeak, speak, stop, toggleAutoSpeak } =
    useWebSpeechTTS({
      lang: 'vi-VN',
      preferFemaleVoice: true,
    });
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(FALLBACK_MODEL_OPTIONS);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTargetChatId, setDeleteTargetChatId] = useState<string>('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const [isSttListening, setIsSttListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const hasRestoredScrollRef = useRef(false);
  const [focusSignal, setFocusSignal] = useState(0);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  const defaultModelId = useMemo(
    () => modelOptions[0]?.id ?? DEFAULT_CHATJPT_MODEL_ID,
    [modelOptions]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeChatId) ?? null,
    [sessions, activeChatId]
  );

  useEffect(() => {
    const loaded = loadSessions();
    const normalized = loaded.map((session) => ({
      ...session,
      model: session.model || DEFAULT_CHATJPT_MODEL_ID,
      provider: IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : session.provider,
    }));
    setSessions(normalized);
    if (normalized.length === 0) {
      const defaultSession = createSession(
        DEFAULT_CHATJPT_MODEL_ID,
        IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : undefined
      );
      setSessions([defaultSession]);
      setActiveChatId(defaultSession.id);
      return;
    }
    if (initialChatId && normalized.some((session) => session.id === initialChatId)) {
      setActiveChatId(initialChatId);
      return;
    }
    setActiveChatId([...normalized].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? '');
  }, [initialChatId]);

  useEffect(() => {
    let isActive = true;
    const loadModels = async () => {
      const remote = await fetchChatModels();
      const mapped = remote.length ? mapModels(remote) : FALLBACK_MODEL_OPTIONS;
      if (!isActive) return;
      setModelOptions(mapped);
      setModelsLoaded(true);
    };
    loadModels();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (!activeChatId || !onActiveChatChange) return;
    onActiveChatChange(activeChatId);
  }, [activeChatId, onActiveChatChange]);

  const resolveModelId = useCallback(
    (modelId?: string) => {
      if (!modelOptions.length) return DEFAULT_CHATJPT_MODEL_ID;
      const matched = modelOptions.find((model) => model.id === modelId);
      return matched?.id ?? defaultModelId;
    },
    [modelOptions, defaultModelId]
  );

  useEffect(() => {
    if (!modelOptions.length) return;
    setSessions((prev) =>
      prev.map((session) => ({
        ...session,
        model: resolveModelId(session.model),
        provider: IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : session.provider,
      }))
    );
  }, [modelOptions, resolveModelId]);

  useEffect(() => {
    if (!activeSession) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const shouldRestore =
      !hasRestoredScrollRef.current &&
      typeof initialScrollTop === 'number' &&
      initialChatId === activeChatId;
    if (shouldRestore) {
      container.scrollTop = initialScrollTop;
      if (onScrollPositionChange) {
        onScrollPositionChange(container.scrollTop);
      }
      hasRestoredScrollRef.current = true;
      return;
    }
    container.scrollTop = container.scrollHeight;
    if (onScrollPositionChange) {
      onScrollPositionChange(container.scrollTop);
    }
    hasRestoredScrollRef.current = true;
  }, [
    activeSession?.messages,
    activeChatId,
    initialScrollTop,
    initialChatId,
    onScrollPositionChange,
  ]);

  useEffect(() => {
    if (autoSpeak && !isSttListening && activeSession?.messages.length) {
      const lastMessage = activeSession.messages[activeSession.messages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessage.id;
        speak(lastMessage.content);
      }
    }
  }, [activeSession?.messages, autoSpeak, isSttListening, speak]);

  const ensureSession = () => {
    if (activeSession) return activeSession;
    const fresh = createSession(
      defaultModelId,
      IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : undefined
    );
    setSessions((prev) => [...prev, fresh]);
    setActiveChatId(fresh.id);
    return fresh;
  };

  const touchSession = (session: ChatSession) => {
    session.updatedAt = Date.now();
  };

  const updateSession = (updated: ChatSession) => {
    setSessions((prev) => prev.map((session) => (session.id === updated.id ? { ...updated } : session)));
  };

  const handleCreateChat = () => {
    const session = createSession(
      defaultModelId,
      IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : undefined
    );
    setSessions((prev) => [...prev, session]);
    setActiveChatId(session.id);
    setErrorText('');
    setIsSidebarOpen(false);
    setIsDesktopSidebarOpen(false);
    setFocusSignal((prev) => prev + 1);
  };

  const handleDeleteChat = (chatId: string) => {
    if (!chatId) return;
    setDeleteTargetChatId(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = () => {
    const targetId = deleteTargetChatId;
    if (!targetId) {
      setShowDeleteModal(false);
      return;
    }
    setSessions((prev) => prev.filter((session) => session.id !== targetId));
    if (activeChatId === targetId) {
      const remaining = sessions.filter((session) => session.id !== targetId);
      if (remaining.length === 0) {
        handleCreateChat();
      } else {
        setActiveChatId([...remaining].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? '');
      }
    }
    setShowDeleteModal(false);
    setDeleteTargetChatId('');
    setErrorText('');
  };

  const handleSendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || sending) return;
    const session = ensureSession();
    setSending(true);
    setErrorText('');

    const userMessage: ChatMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      role: 'user',
      content: text,
      time: nowTime(),
    };

    const assistantMessage: ChatMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      role: 'assistant',
      content: '',
      time: nowTime(),
    };

    const resolvedModelId = resolveModelId(session.model);
    const updatedSession: ChatSession = {
      ...session,
      title: session.title === 'Chat mới' ? makeSessionTitle(text) : session.title,
      messages: [...session.messages, userMessage, assistantMessage],
      model: resolvedModelId,
      provider: IS_CHATJPT_ONLY_MODE
        ? DEFAULT_CHATJPT_PROVIDER
        : session.provider ?? DEFAULT_CHATJPT_PROVIDER,
    };
    touchSession(updatedSession);
    updateSession(updatedSession);

    try {
      const response = await sendChatMessage(text, session.id, { currentProductSlug: productSlug }, {
        preferredProvider: (IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : updatedSession.provider) as
          | 'chatjpt'
          | 'workers_ai'
          | 'gemini'
          | 'groq'
          | undefined,
        preferredModel: updatedSession.model,
      });

      const responseData = response.data;
      if (response.success && responseData) {
        assistantMessage.content = responseData.message || 'Không có phản hồi.';
        assistantMessage.suggestedProducts = responseData.suggestedProducts;
        assistantMessage.providerUsed = responseData.providerUsed;
        assistantMessage.modelUsed = responseData.modelUsed;
        if (!IS_CHATJPT_ONLY_MODE && responseData.providerUsed && responseData.providerUsed !== updatedSession.provider) {
          updatedSession.provider = responseData.providerUsed;
        }
      } else {
        assistantMessage.content = response.error || 'Không thể gọi AI lúc này.';
        setErrorText(response.error || 'Có lỗi xảy ra');
      }
    } catch {
      assistantMessage.content = 'Không thể gọi AI lúc này. Vui lòng thử lại.';
      setErrorText('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: updatedSession.messages.map((message) =>
          message.id === assistantMessage.id ? assistantMessage : message
        ),
      };
      touchSession(finalSession);
      updateSession(finalSession);
      setSending(false);
    }
  };

  const handleBeforeVoiceStart = () => {
    setVoiceError(null);
    stop();
  };

  const handleMessagesScroll = () => {
    if (!onScrollPositionChange) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    onScrollPositionChange(container.scrollTop);
  };

  const activeModelId = resolveModelId(activeSession?.model);
  const activeModel = modelOptions.find((model) => model.id === activeModelId) ?? modelOptions[0];

  const handleSelectModel = (modelId: string) => {
    if (!activeSession) return;
    const resolvedModelId = resolveModelId(modelId);
    const updatedSession: ChatSession = {
      ...activeSession,
      model: resolvedModelId,
      provider: IS_CHATJPT_ONLY_MODE ? DEFAULT_CHATJPT_PROVIDER : activeSession.provider,
    };
    updateSession(updatedSession);
    setIsModelModalOpen(false);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-4xl border border-pink-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-pink-100 bg-white/80 px-4 py-3 text-gray-900 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 dark:text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-500">
            <span className="text-lg">👩</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Linh - Tư vấn viên</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SpeakerButton
            isEnabled={autoSpeak}
            isSpeaking={isSpeaking}
            isSupported={ttsSupported}
            onToggle={toggleAutoSpeak}
            onStop={stop}
          />
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-white/20"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:gap-4 lg:p-4">
        <div className="flex min-h-0 flex-col rounded-4xl border border-pink-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-pink-400">CUỘC TRÒ CHUYỆN</p>
              <h2 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-white">Chat</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-medium text-pink-600 transition hover:border-pink-200 hover:text-pink-700 dark:border-gray-800 dark:bg-gray-900 dark:text-pink-200 dark:hover:text-white"
                onClick={() => setIsModelModalOpen(true)}
                disabled={!modelsLoaded}
              >
                {activeModel ? `Model: ${activeModel.label}` : 'Chọn model'}
              </button>
              <button
                type="button"
                className="hidden rounded-full border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-600 transition hover:border-pink-200 hover:text-pink-700 dark:border-gray-800 dark:bg-gray-800 dark:text-pink-200 dark:hover:text-white lg:inline-flex"
                onClick={() => setIsDesktopSidebarOpen(true)}
              >
                Lịch sử chat
              </button>
              <button
                type="button"
                className="rounded-full border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-600 transition hover:border-pink-200 hover:text-pink-700 dark:border-gray-800 dark:bg-gray-800 dark:text-pink-200 dark:hover:text-white lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                Lịch sử chat
              </button>
              <button
                type="button"
                className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-rose-900/40 dark:bg-gray-900 dark:text-rose-300 dark:hover:text-rose-200"
                onClick={() => handleDeleteChat(activeChatId)}
              >
                Xóa hội thoại
              </button>
            </div>
          </div>

          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-pink-100 bg-pink-50/40 p-3 scrollbar-thin dark:border-gray-800 dark:bg-gray-900 sm:p-4"
          >
            {activeSession?.messages.length ? (
              activeSession.messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[94%] rounded-3xl border p-4 text-[15px] shadow-sm ${
                    message.role === 'assistant'
                      ? 'border-pink-100 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white'
                      : 'ml-auto border-pink-200 bg-pink-100 text-gray-900 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-white'
                  }`}
                >
                  <MessageRenderer content={message.content} />
                  {(message.providerUsed || message.modelUsed) && (
                    <p className="mt-3 text-xs text-gray-400">
                      {message.providerUsed ? `Provider: ${message.providerUsed}` : 'Provider: N/A'}
                      {message.modelUsed ? ` · Model: ${message.modelUsed}` : ''}
                    </p>
                  )}
                  {message.suggestedProducts && message.suggestedProducts.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-pink-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-xs text-gray-500 dark:text-gray-300">Sản phẩm gợi ý:</p>
                      <div className="mt-2 space-y-2">
                        {message.suggestedProducts.map((product) => (
                          <Link
                            key={product.id}
                            href={`/san-pham/${product.slug}`}
                            className="flex items-center gap-2 rounded-xl border border-transparent bg-pink-50/40 p-2 text-xs text-gray-700 transition hover:border-pink-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {product.imageUrl && (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </p>
                              <p className="text-xs text-pink-500">
                                {product.price.toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-gray-400">{message.time}</p>
                </article>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Chưa có tin nhắn nào</p>
                <p className="mt-1 text-xs text-gray-400">Hãy bắt đầu trò chuyện để nhận tư vấn phù hợp.</p>
                <div className="mt-4 w-full max-w-sm">
                  <QuickActions onSelect={handleSendMessage} disabled={sending} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-3xl border border-pink-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
            <ChatInput
              onSend={(value) => void handleSendMessage(value)}
              onBeforeVoiceStart={handleBeforeVoiceStart}
              onVoiceListeningChange={setIsSttListening}
              onVoiceError={setVoiceError}
              isLoading={sending}
              placeholder="Nhập tin nhắn..."
              focusSignal={focusSignal}
            />
            {errorText && <p className="px-3 pt-2 text-xs text-red-500">{errorText}</p>}
          </div>
        </div>
      </section>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng lịch sử chat"
          />
          <div className="relative h-full w-[85vw] max-w-[320px]">
            <SessionSidebar
              sessions={sortedSessions}
              activeChatId={activeChatId}
              onCreate={() => {
                handleCreateChat();
                setIsSidebarOpen(false);
              }}
              onSelect={(id) => {
                setActiveChatId(id);
                setErrorText('');
                setIsSidebarOpen(false);
              }}
              onDelete={(id) => {
                handleDeleteChat(id);
                setIsSidebarOpen(false);
              }}
              onClose={() => setIsSidebarOpen(false)}
              className="h-full rounded-none border-0"
            />
          </div>
        </div>
      )}

      {isDesktopSidebarOpen && (
        <div className="absolute inset-0 z-40 hidden lg:flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsDesktopSidebarOpen(false)}
            aria-label="Đóng lịch sử chat"
          />
          <div className="relative h-full w-[85vw] max-w-[360px]">
            <SessionSidebar
              sessions={sortedSessions}
              activeChatId={activeChatId}
              onCreate={() => {
                handleCreateChat();
                setIsDesktopSidebarOpen(false);
              }}
              onSelect={(id) => {
                setActiveChatId(id);
                setErrorText('');
                setIsDesktopSidebarOpen(false);
              }}
              onDelete={(id) => {
                handleDeleteChat(id);
                setIsDesktopSidebarOpen(false);
              }}
              onClose={() => setIsDesktopSidebarOpen(false)}
              className="h-full rounded-none border-0"
            />
          </div>
        </div>
      )}

      {voiceError && (
        <div className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="flex-1">{voiceError}</p>
            <button
              onClick={() => {
                setVoiceError(null);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}


      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-4xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs tracking-widest text-pink-500">// XÁC NHẬN XÓA</p>
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              Xóa vĩnh viễn hội thoại?
            </h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">Hành động này không thể khôi phục.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500 transition hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                onClick={() => setShowDeleteModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="border border-pink-300 bg-pink-50 px-4 py-2 text-sm text-pink-600 transition hover:bg-pink-100"
                onClick={confirmDeleteChat}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      <ModelPickerModal
        open={isModelModalOpen}
        models={modelOptions}
        selectedModel={activeModelId}
        onSelect={handleSelectModel}
        onClose={() => setIsModelModalOpen(false)}
      />
    </div>
  );
}
