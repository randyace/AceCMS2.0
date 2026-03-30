import React, { useState } from 'react';

export type ContentLang = 'en' | 'zh_TW' | 'zh_CN';

export const LANG_LABELS: Record<ContentLang, string> = {
  en: 'EN — English',
  zh_TW: '繁中 — Traditional Chinese',
  zh_CN: '简中 — Simplified Chinese',
};

export const LANG_SHORT: Record<ContentLang, string> = {
  en: 'EN',
  zh_TW: '繁中',
  zh_CN: '简中',
};

interface LanguageTabsProps {
  children: (lang: ContentLang) => React.ReactNode;
  defaultLang?: ContentLang;
}

export function LanguageTabs({ children, defaultLang = 'en' }: LanguageTabsProps) {
  const [activeLang, setActiveLang] = useState<ContentLang>(defaultLang);

  return (
    <div>
      <div className="flex gap-0 border border-border rounded-lg overflow-hidden w-fit mb-5">
        {(Object.keys(LANG_LABELS) as ContentLang[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLang(lang)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeLang === lang
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {LANG_SHORT[lang]}
          </button>
        ))}
      </div>
      <div>{children(activeLang)}</div>
    </div>
  );
}
