import { Flame, Globe, ShieldCheck, Check, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, SectionTitle, Stat } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { LANGS, type LangCode } from "@/lib/i18n";
import { setLanguage } from "@/lib/nur.functions";
import { LEARNED_STREAK } from "@/lib/srs";
import { CreditsBar, PlansList, ReferralCard, TierBadge } from "@/components/nur/Paywall";

export function ProfileTab() {
  const { tr, firstName, streakDays, cards, lang, setLang, initData, isAdmin } = useNur();
  const learned = cards.filter((c) => c.learned).length;

  return (
    <div className="space-y-4 pb-4">
      <Card className="flex items-center gap-4">
        <div className="grad-cool grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-bold text-primary-foreground shadow-[var(--glow-blue)]">
          {(firstName || "N").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold">{firstName || "Nur"}</h1>
            <TierBadge />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary" />
            {streakDays} · {tr("streak")}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={cards.length} label={tr("total")} />
        <Stat value={learned} label={tr("learned")} tone="text-success" />
        <Stat value={LEARNED_STREAK} label="SRS" tone="text-accent" />
      </div>

      <SectionTitle>Kunlik kreditlar</SectionTitle>
      <CreditsBar />
      <div className="ios-card flex items-start gap-3 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Birinchi kun uchun <span className="font-semibold text-foreground">15 kredit</span>{" "}
          beriladi. Ishlatmasangiz saqlanadi, ishlatsangiz keyingi kunlardan{" "}
          <span className="font-semibold text-foreground">kuniga 5 kredit</span> yangilanadi.
        </p>
      </div>

      <SectionTitle>Do'st taklif qilish</SectionTitle>
      <ReferralCard />

      <SectionTitle>Obuna darajalari</SectionTitle>
      <PlansList />

      <SectionTitle>{tr("language")}</SectionTitle>
      <div className="ios-card overflow-hidden">
        {LANGS.map((l, i) => (
          <button
            key={l.code}
            onClick={() => {
              setLang(l.code as LangCode);
              void setLanguage({ data: { initData, lang: l.code } });
            }}
            className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${i ? "border-t border-border" : ""}`}
          >
            <span className="text-lg">{l.flag}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{l.label}</span>
            {lang === l.code ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
          </button>
        ))}
      </div>

      {isAdmin ? (
        <>
          <SectionTitle>{tr("admin")}</SectionTitle>
          <Link to="/admin" className="ios-card flex items-center gap-3 p-4">
            <div className="grad-warm grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="min-w-0 flex-1 truncate font-semibold">{tr("admin")}</span>
          </Link>
        </>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-muted-foreground">
        <Globe className="h-3 w-3" /> Nur Sahifa · Telegram Mini App
      </p>
    </div>
  );
}
