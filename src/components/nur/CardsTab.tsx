import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Sparkles, Volume2, Gauge, ChevronUp } from "lucide-react";
import { Card, Spinner } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { deleteCard, reviewCard, type CardRow } from "@/lib/nur.functions";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 70;

export function CardsTab() {
  const { tr, cards, cardsLoading, initData, refreshCards } = useNur();
  const [list, setList] = useState<CardRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    setList(cards);
    setIdx((i) => Math.min(i, Math.max(0, cards.length - 1)));
  }, [cards]);

  const current = list[idx];

  const go = useCallback(
    (dir: 1 | -1) => {
      setIdx((i) => {
        const next = i + dir;
        if (next < 0 || next >= list.length) return i;
        return next;
      });
      setFlipped(false);
      setRateOpen(false);
      haptic("light");
    },
    [list.length],
  );

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    startY.current = e.clientY;
    moved.current = false;
    setAnimating(false);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 6) moved.current = true;
    const atEdge = (dy > 0 && idx === 0) || (dy < 0 && idx >= list.length - 1);
    setDrag(atEdge ? dy * 0.25 : dy);
  }
  function onPointerUp() {
    if (startY.current === null) return;
    const dy = drag;
    startY.current = null;
    setAnimating(true);
    setDrag(0);
    if (dy <= -SWIPE_THRESHOLD) go(1);
    else if (dy >= SWIPE_THRESHOLD) go(-1);
    else if (!moved.current) {
      setFlipped((f) => !f);
      haptic("light");
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") go(1);
      if (e.key === "ArrowUp") go(-1);
      if (e.key === " ") setFlipped((f) => !f);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const speak = useCallback((word: string) => {
    try {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }, []);

  async function rate(correct: boolean) {
    if (!current) return;
    haptic(correct ? "success" : "error");
    setRateOpen(false);
    await reviewCard({ data: { initData, id: current.id, correct } });
    if (idx < list.length - 1) go(1);
    else refreshCards();
  }

  async function removeCard() {
    if (!current) return;
    haptic("error");
    const id = current.id;
    setList((l) => l.filter((c) => c.id !== id));
    setIdx((i) => Math.max(0, Math.min(i, list.length - 2)));
    setFlipped(false);
    await deleteCard({ data: { initData, id } });
    refreshCards();
  }

  const neighbors = useMemo(
    () => [idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < list.length),
    [idx, list.length],
  );

  if (cardsLoading) return <Spinner />;

  if (!list.length) {
    return (
      <Card className="py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-secondary">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-bold">{tr("noCards")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tr("noCardsDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="relative -mx-4 h-[calc(100dvh-8.5rem)] overflow-hidden select-none">
      {/* ultra-thin progress */}
      <div className="absolute inset-x-4 top-0 z-30 flex items-center gap-2">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="grad-warm h-full rounded-full transition-[width] duration-300"
            style={{ width: `${((idx + 1) / list.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
          {idx + 1}/{list.length}
        </span>
      </div>

      <div
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {neighbors.map((i) => {
          const c = list[i];
          const offset = (i - idx) * 100;
          return (
            <div
              key={c.id}
              className={cn(
                "absolute inset-x-0 top-0 h-full px-4 pt-5 pb-2 will-change-transform",
                animating && "transition-transform duration-300 ease-out",
              )}
              style={{ transform: `translate3d(0, calc(${offset}% + ${drag}px), 0)` }}
            >
              <FlipCard card={c} flipped={i === idx && flipped} phonetic={toPhonetic(c.word)} />
            </div>
          );
        })}
      </div>

      {/* right-side overlay actions */}
      <div className="pointer-events-none absolute right-6 bottom-8 z-30 flex flex-col items-center gap-3">
        <OverlayButton label="audio" onClick={() => current && speak(current.word)}>
          <Volume2 className="h-5 w-5" />
        </OverlayButton>
        <div className="relative">
          {rateOpen ? (
            <div
              data-no-drag
              className="pointer-events-auto absolute right-14 bottom-0 flex w-36 flex-col gap-2 rounded-2xl bg-card/90 p-2 shadow-[var(--shadow-card)] backdrop-blur-xl"
            >
              <button
                onClick={() => rate(false)}
                className="rounded-xl bg-destructive/12 px-3 py-2 text-xs font-bold text-destructive"
              >
                {tr("forgot")}
              </button>
              <button
                onClick={() => rate(true)}
                className="rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success"
              >
                {tr("knew")}
              </button>
            </div>
          ) : null}
          <OverlayButton label="rate" active={rateOpen} onClick={() => setRateOpen((o) => !o)}>
            <Gauge className="h-5 w-5" />
          </OverlayButton>
        </div>
        <OverlayButton label="delete" tone="danger" onClick={removeCard}>
          <Trash2 className="h-5 w-5" />
        </OverlayButton>
      </div>

      {idx < list.length - 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
          <ChevronUp className="h-5 w-5 animate-bounce text-muted-foreground/60" />
        </div>
      ) : null}
    </div>
  );
}

function OverlayButton({
  children,
  onClick,
  label,
  tone,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone?: "danger";
  active?: boolean;
}) {
  return (
    <button
      data-no-drag
      aria-label={label}
      onClick={onClick}
      className={cn(
        "pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-card/70 backdrop-blur-xl transition-transform active:scale-90",
        tone === "danger" ? "text-destructive" : "text-foreground",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function FlipCard({
  card,
  flipped,
  phonetic,
}: {
  card: CardRow;
  flipped: boolean;
  phonetic: string;
}) {
  return (
    <div className="h-full w-full" style={{ perspective: "1400px" }}>
      <div
        className="relative h-full w-full transition-transform duration-500 will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="ios-card absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-[40px] leading-tight font-bold tracking-tight">{card.word}</p>
          <p className="text-sm font-medium text-primary">{phonetic}</p>
        </div>
        <div
          className="ios-card absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-2xl font-bold text-primary">{card.translation}</p>
          {card.example ? (
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground italic">
              {card.example}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function toPhonetic(word: string) {
  return `/${word.toLowerCase()}/`;
}
