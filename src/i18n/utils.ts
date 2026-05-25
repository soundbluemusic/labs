import { defaultLocale, locales, ui, type Locale } from './ui';

export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  if (seg && (locales as readonly string[]).includes(seg)) {
    return seg as Locale;
  }
  return defaultLocale;
}

export function t(lang: Locale) {
  return ui[lang];
}

/** Strips the locale prefix (if any) from a pathname, returning the canonical KO-base path. */
export function stripLocaleFromPath(pathname: string): string {
  const parts = pathname.split('/');
  if (parts[1] && (locales as readonly string[]).includes(parts[1])) {
    parts.splice(1, 1);
  }
  const stripped = parts.join('/');
  return stripped === '' ? '/' : stripped;
}

/** Builds a path for the given locale. Default locale has no prefix. */
export function localizePath(pathname: string, lang: Locale): string {
  const base = stripLocaleFromPath(pathname);
  if (lang === defaultLocale) {
    return base;
  }
  if (base === '/') return `/${lang}/`;
  return `/${lang}${base}`;
}
