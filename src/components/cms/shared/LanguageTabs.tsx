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

// Render-prop (uncontrolled) mode
interface LanguageTabsRenderProps {
  children: (lang: ContentLang) => React.ReactNode;
  defaultLang?: ContentLang;
  activeLang?: undefined;
  onChange?: undefined;
}

// Controlled mode — just renders the tab bar, no children
interface LanguageTabsControlledProps {
  activeLang: ContentLang;
  onChange: (lang: ContentLang) => void;
  children?: undefined;
  defaultLang?: undefined;
}

type LanguageTabsProps = LanguageTabsRenderProps | LanguageTabsControlledProps;

export function LanguageTabs(props: LanguageTabsProps) {
  const isControlled = props.activeLang !== undefined;
  const [internalLang, setInternalLang] = useState<ContentLang>(
    !isControlled && props.defaultLang ? props.defaultLang : 'en'
  );

  const activeLang = isControlled ? props.activeLang : internalLang;
  const setLang = isControlled ? props.onChange : setInternalLang;

  const tabBar = (
    <div className="flex gap-0 border border-border rounded-lg overflow-hidden w-fit mb-5">
      {(Object.keys(LANG_LABELS) as ContentLang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLang(lang)}
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
  );

  if (isControlled) {
    // Controlled mode: just render the tab bar (caller manages state and content)
    return tabBar;
  }

  // Render-prop mode: render tabs + invoke children with the active lang
  return (
    <div>
      {tabBar}
      <div>{(props.children as (lang: ContentLang) => React.ReactNode)(activeLang)}</div>
    </div>
  );
}