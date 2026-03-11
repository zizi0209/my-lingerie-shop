import { ensureRedisReady } from '../lib/redis';
import type { ChatMessage } from './llm/types';

const SESSION_TTL_SECONDS = Number(process.env.AI_SESSION_TTL_SECONDS || 60 * 60 * 24);
const SESSION_MAX_MESSAGES = Number(process.env.AI_SESSION_MAX_MESSAGES || 20);

const getSessionKey = (sessionId: string) => `ai:session:${sessionId}`;

const sanitizeMessages = (messages: ChatMessage[]): ChatMessage[] =>
  messages
    .filter(
      (message): message is ChatMessage =>
        message &&
        (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
        typeof message.content === 'string'
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

const trimMessages = (messages: ChatMessage[]): ChatMessage[] => {
  const max = Number.isFinite(SESSION_MAX_MESSAGES) && SESSION_MAX_MESSAGES > 0
    ? SESSION_MAX_MESSAGES
    : 20;
  return messages.length > max ? messages.slice(-max) : messages;
};

const resolveTtl = (): number => {
  const ttl = Number.isFinite(SESSION_TTL_SECONDS) && SESSION_TTL_SECONDS > 0
    ? SESSION_TTL_SECONDS
    : 60 * 60 * 24;
  return Math.max(300, ttl);
};

export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[] | null> => {
  const redis = await ensureRedisReady();
  if (!redis) return null;
  try {
    const raw = await redis.get(getSessionKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sanitizeMessages(parsed as ChatMessage[]);
  } catch {
    return [];
  }
};

export const setSessionMessages = async (sessionId: string, messages: ChatMessage[]): Promise<boolean> => {
  const redis = await ensureRedisReady();
  if (!redis) return false;
  const sanitized = trimMessages(sanitizeMessages(messages));
  try {
    await redis.set(getSessionKey(sessionId), JSON.stringify(sanitized), 'EX', resolveTtl());
    return true;
  } catch {
    return false;
  }
};

export const appendSessionMessages = async (
  sessionId: string,
  newMessages: ChatMessage[]
): Promise<{ stored: boolean; messages: ChatMessage[] }> => {
  const redis = await ensureRedisReady();
  if (!redis) {
    return { stored: false, messages: trimMessages(sanitizeMessages(newMessages)) };
  }

  const existing = await getSessionMessages(sessionId);
  const base = existing ?? [];
  const merged = trimMessages([...base, ...sanitizeMessages(newMessages)]);
  const stored = await setSessionMessages(sessionId, merged);
  return { stored, messages: merged };
};

export const clearSessionMessages = async (sessionId: string): Promise<boolean> => {
  const redis = await ensureRedisReady();
  if (!redis) return false;
  try {
    await redis.del(getSessionKey(sessionId));
    return true;
  } catch {
    return false;
  }
};
