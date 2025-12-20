import { useLanguage } from "@/context/LanguageContext";
import { t as translate } from "@/lib/i18n";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string): string => {
    return translate(key, language);
  };

  return { t, language };
}
