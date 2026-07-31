export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe: { user?: TgUser };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  openTelegramLink: (url: string) => void;
  HapticFeedback?: {
    impactOccurred: (s: string) => void;
    notificationOccurred: (s: string) => void;
  };
};

export function getWebApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? "";
}

export function getTgUser(): TgUser | null {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function haptic(kind: "light" | "success" | "error" = "light") {
  const wa = getWebApp();
  if (!wa?.HapticFeedback) return;
  if (kind === "light") wa.HapticFeedback.impactOccurred("light");
  else wa.HapticFeedback.notificationOccurred(kind);
}

export function openLink(url: string) {
  const wa = getWebApp();
  if (wa) wa.openTelegramLink(url);
  else window.open(url, "_blank");
}
