import { Crown, Flame, Gift, Send, Sparkles, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { ADMIN_CONTACT, PLAN_LIST, planOf, type Plan } from "@/lib/plans";
import { logEvent } from "@/lib/nur.functions";
import { openLink, haptic } from "@/lib/telegram";

export function refLink(botUsername: string, refCode: string) {
  return botUsername && refCode ? `https://t.me/${botUsername}?start=${refCode}` : "";
}

export function CreditsBar({ compact }: { compact?: boolean }) {
  const { billing } = useNur();
  const plan = planOf(billing.tier);
  const left = Math.max(0, plan.scanCap - billing.scansToday) + billing.bonusScans;

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur-xl">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Zap className="h-3.5 w-3.5 text-accent" />
          <span className="tabular-nums">{billing.credits}</span>
          <span className="text-muted-foreground">kredit</span>
        </span>
        <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">
          {left} skaner · {plan.label}
        </span>
      </div>
    );
  }

  return (
    <div className="ios-card flex items-center gap-3 p-3.5">
      <div className="grad-cool grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-[var(--glow-blue)]">
        <Zap className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {billing.credits} kredit · {left} skaner qoldi
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {plan.label} · har kuni {plan.daily} kredit
        </p>
      </div>
    </div>
  );
}

export function TierBadge() {
  const { billing } = useNur();
  const plan = planOf(billing.tier);
  return (
    <span className="glass-panel inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase">
      {plan.tier === "vip" ? (
        <Crown className="h-3 w-3 text-accent" />
      ) : (
        <Sparkles className="h-3 w-3 text-accent" />
      )}
      {plan.label}
    </span>
  );
}

export function ReferralCard() {
  const { billing } = useNur();
  const link = refLink(billing.botUsername, billing.refCode);

  return (
    <div className="ios-card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="grad-warm grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-[var(--glow-purple)]">
          <Gift className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Do'st taklif qiling — bepul skaner</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Do'stingiz rasmiy kanalga a'zo bo'lib Mini Appni ochsa: sizga +1, unga +1 bonus kredit
            qo'shiladi.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-3.5 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-4 w-4 text-accent" /> Taklif qilingan
        </span>
        <span className="font-bold text-accent tabular-nums">{billing.invited}</span>
      </div>
      <Button
        variant="neon"
        disabled={!link}
        onClick={() => {
          haptic("light");
          if (!link) return;
          openLink(
            `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
              "Nur Sahifa — kitobdan so'z yodlash ilovasi. Qo'shil!",
            )}`,
          );
        }}
      >
        Havolani ulashish
      </Button>
      {link ? (
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(link);
            toast.success("Havola nusxalandi");
          }}
          className="w-full truncate text-center text-xs text-muted-foreground"
        >
          {link}
        </button>
      ) : null}
    </div>
  );
}

function TierRow({ plan, current }: { plan: Plan; current: boolean }) {
  const hot = plan.tier === "premium";
  return (
    <div
      className={
        hot
          ? "glass-panel relative p-4 shadow-[var(--shadow-pop)]"
          : "ios-card relative p-4" + (current ? " ring-1 ring-accent" : "")
      }
    >
      {hot ? (
        <span className="grad-cool absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          🔥 Eng ommabop
        </span>
      ) : null}
      <div className="flex items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
            plan.tier === "vip" ? "grad-warm" : hot ? "grad-cool" : "bg-secondary"
          }`}
        >
          {plan.tier === "vip" ? (
            <Crown className="h-5 w-5 text-primary-foreground" />
          ) : hot ? (
            <Flame className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Zap className="h-5 w-5 text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{plan.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {plan.scanCap} ta scan/kun · {plan.daily} kredit
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold">{plan.priceLabel}</p>
          <p className="text-[11px] text-muted-foreground">/ oy</p>
        </div>
      </div>
      {current ? (
        <p className="mt-2 text-[11px] font-semibold text-accent">Faol daraja</p>
      ) : null}
    </div>
  );
}

export function PlansList() {
  const { billing, initData } = useNur();
  const paid = PLAN_LIST.filter((p) => p.tier !== "free");

  return (
    <div className="space-y-3">
      {paid.map((p) => (
        <TierRow key={p.tier} plan={p} current={p.tier === billing.tier} />
      ))}
      <Button
        variant="neon"
        onClick={() => {
          haptic("light");
          void logEvent({ data: { initData, type: "payment_request", target: billing.tier } });
          openLink(ADMIN_CONTACT);
        }}
      >
        <Send className="h-4 w-4" /> To'lov chekini adminga yuborish
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Chekni @davlatbekdev ga yuborsangiz, darajangiz qo'lda ko'tariladi.
      </p>
    </div>
  );
}

export function PaywallSheet({ onClose, reason }: { onClose: () => void; reason: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="animate-pop max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border-t border-border bg-card/95 p-6 pb-8 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Kunlik limit tugadi</h3>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <ReferralCard />
          <p className="px-1 text-[13px] font-semibold text-muted-foreground">Yoki obunani tanlang</p>
          <PlansList />
        </div>
      </div>
    </div>
  );
}
