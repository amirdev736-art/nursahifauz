import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { Button, Card, Spinner } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { LANGS, type LangCode } from "@/lib/i18n";
import { checkSubscription, setLanguage, logEvent } from "@/lib/nur.functions";
import { openLink, haptic } from "@/lib/telegram";

export function Gate({ children }: { children: React.ReactNode }) {
  const { tr, ready, initData, lang, setLang } = useNur();
  const [langDone, setLangDone] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem("nur.lang")),
  );

  const sub = useQuery({
    queryKey: ["sub", initData],
    enabled: langDone && initData.length > 0,
    queryFn: () => checkSubscription({ data: { initData } }),
  });

  if (!ready) return <Spinner />;

  if (!initData) {
    return (
      <Card className="mt-16 py-12 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-secondary">
          <BookOpenText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-lg font-bold">Nur Sahifa</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tr("openTelegram")}</p>
      </Card>
    );
  }

  if (!langDone) {
    return (
      <div className="space-y-4 pt-6">
        <div className="text-center">
          <div className="grad-warm mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl shadow-[var(--shadow-pop)]">
            <BookOpenText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Nur Sahifa</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("chooseLang")}</p>
        </div>
        <div className="ios-card overflow-hidden">
          {LANGS.map((l, i) => (
            <button
              key={l.code}
              onClick={() => {
                haptic("light");
                setLang(l.code as LangCode);
              }}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${i ? "border-t border-border" : ""}`}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{l.label}</span>
              {lang === l.code ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            localStorage.setItem("nur.lang", lang);
            void setLanguage({ data: { initData, lang } });
            setLangDone(true);
          }}
        >
          {tr("continue")}
        </Button>
      </div>
    );
  }

  if (sub.isLoading) return <Spinner label={tr("checking")} />;

  if (sub.data && !sub.data.subscribed) {
    return (
      <div className="space-y-4 pt-6">
        <div className="text-center">
          <div className="grad-cool mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl">
            <ShieldCheck className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-bold">{tr("subTitle")}</h1>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{tr("subDesc")}</p>
        </div>
        <div className="space-y-2.5">
          {sub.data.missing.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                void logEvent({ data: { initData, type: "channel_click", target: ch.username } });
                openLink(ch.url);
              }}
              className="ios-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.98]"
            >
              <div className="grad-warm grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-bold text-primary-foreground">
                {ch.title.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{ch.title}</p>
                <p className="truncate text-xs text-muted-foreground">@{ch.username}</p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
        <Button onClick={() => sub.refetch()} disabled={sub.isFetching}>
          {sub.isFetching ? tr("checking") : tr("check")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{tr("notSubscribed")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
