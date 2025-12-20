import viMessages from "@/messages/vi.json";
import enMessages from "@/messages/en.json";

export type Language = "vi" | "en";

const messages: Record<Language, any> = {
  vi: viMessages,
  en: enMessages,
};

export function getMessages(lang: Language = "vi") {
  return messages[lang] || messages.vi;
}

export function t(key: string, lang: Language = "vi"): string {
  const msgObj = getMessages(lang);
  const keys = key.split(".");
  let value: any = msgObj;

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}
