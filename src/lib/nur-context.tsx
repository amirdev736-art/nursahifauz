import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInitData, getWebApp } from "@/lib/telegram";
import { bootstrap, listCards, type CardRow, type Channel } from "@/lib/nur.functions";
import { t, type LangCode } from "@/lib/i18n";

type NurCtx = {
  initData: string;
  ready: boolean;
  lang: LangCode;
  setLang: (l: LangCode) => void;
  tr: (k: Parameters<typeof t>[1]) => string;
  isAdmin: boolean;
  firstName: string;
  streakDays: number;
  channels: Channel[];
  cards: CardRow[];
  cardsLoading: boolean;
  refreshCards: () => void;
};

const Ctx = createContext<NurCtx | null>(null);

export function NurProvider({ children }: { children: ReactNode }) {
  const [initData, setInitData] = useState("");
  const [mounted, setMounted] = useState(false);
  const [lang, setLangState] = useState<LangCode>("uz");
  const qc = useQueryClient();

  useEffect(() => {
    const wa = getWebApp();
    wa?.ready();
    wa?.expand();
    if (wa?.colorScheme === "dark") document.documentElement.classList.add("dark");
    const stored = localStorage.getItem("nur.lang") as LangCode | null;
    if (stored) setLangState(stored);
    setInitData(getInitData());
    setMounted(true);
  }, []);

  const boot = useQuery({
    queryKey: ["boot", initData],
    enabled: mounted && initData.length > 0,
    queryFn: () => bootstrap({ data: { initData, lang } }),
  });

  useEffect(() => {
    const remote = boot.data?.profile?.lang as LangCode | undefined;
    if (remote && !localStorage.getItem("nur.lang")) setLangState(remote);
  }, [boot.data]);

  const cards = useQuery({
    queryKey: ["cards", initData],
    enabled: mounted && initData.length > 0 && Boolean(boot.data),
    queryFn: () => listCards({ data: { initData } }),
  });

  const value = useMemo<NurCtx>(
    () => ({
      initData,
      ready: mounted,
      lang,
      setLang: (l) => {
        localStorage.setItem("nur.lang", l);
        setLangState(l);
      },
      tr: (k) => t(lang, k),
      isAdmin: Boolean(boot.data?.isAdmin),
      firstName: boot.data?.user?.first_name ?? "",
      streakDays: boot.data?.profile?.streak_days ?? 0,
      channels: boot.data?.channels ?? [],
      cards: cards.data ?? [],
      cardsLoading: cards.isLoading,
      refreshCards: () => qc.invalidateQueries({ queryKey: ["cards"] }),
    }),
    [initData, mounted, lang, boot.data, cards.data, cards.isLoading, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNur() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNur must be used inside NurProvider");
  return ctx;
}
