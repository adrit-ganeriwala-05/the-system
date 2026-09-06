export const THEME_COOKIE = "system-theme";
export const THEME_VALUES = ["SYSTEM", "LIGHT", "DARK"] as const;
export type Theme = (typeof THEME_VALUES)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEME_VALUES as readonly string[]).includes(value);
}

export function parseTheme(value: string | undefined): Theme {
  return isTheme(value) ? value : "SYSTEM";
}

/**
 * The `data-theme` attribute for <html>. SYSTEM returns undefined on purpose: with no
 * attribute, the CSS falls through to `prefers-color-scheme`, so the OS decides.
 */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  if (theme === "LIGHT") return "light";
  if (theme === "DARK") return "dark";
  return undefined;
}

export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
