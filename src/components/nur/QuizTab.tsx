import { useMemo, useState } from "react";
import { Lock, ListChecks, Shuffle, SpellCheck2, GraduationCap } from "lucide-react";
import { Button, Card, Progress, SectionTitle } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { reviewCard, type CardRow } from "@/lib/nur.functions";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

type Mode = "choice" | "match" | "spell" | "exam";

const QUIZ_MIN = 20;
const EXAM_MIN = 100;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function QuizTab() {
  const { tr, cards } = useNur();
  const [mode, setMode] = useState<Mode | null>(null);
  const pool = cards.filter((c) => !c.learned).length >= 4 ? cards.filter((c) => !c.learned) : cards;

  const quizUnlocked = cards.length >= QUIZ_MIN;
  const examUnlocked = cards.length >= EXAM_MIN;

  if (mode) return <Session mode={mode} pool={pool} onExit={() => setMode(null)} />;

  const items: { key: Mode; icon: typeof ListChecks; label: string; unlocked: boolean }[] = [
    { key: "choice", icon: ListChecks, label: tr("quizChoice"), unlocked: quizUnlocked },
    { key: "match", icon: Shuffle, label: tr("quizMatch"), unlocked: quizUnlocked },
    { key: "spell", icon: SpellCheck2, label: tr("quizSpell"), unlocked: quizUnlocked },
    { key: "exam", icon: GraduationCap, label: tr("exam"), unlocked: examUnlocked },
  ];

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{tr("cardsCount")}</span>
          <span className="tabular-nums text-accent">
            {cards.length} / {quizUnlocked ? EXAM_MIN : QUIZ_MIN}
          </span>
        </div>
        <Progress value={(cards.length / (quizUnlocked ? EXAM_MIN : QUIZ_MIN)) * 100} />
        <p className="text-xs text-muted-foreground">
          {quizUnlocked ? tr("lockedExam") : tr("lockedQuiz")}
        </p>
      </Card>

      <SectionTitle>{tr("quiz")}</SectionTitle>
      <div className="space-y-3">
        {items.map((it) => (
          <button
            key={it.key}
            disabled={!it.unlocked}
            onClick={() => {
              haptic("light");
              setMode(it.key);
            }}
            className={cn(
              "relative flex w-full items-center gap-3.5 overflow-hidden p-4 text-left transition-transform active:scale-[0.98]",
              it.unlocked ? "glass-panel shadow-[var(--shadow-pop)]" : "ios-card",
            )}
          >
            <div
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                it.unlocked
                  ? it.key === "exam"
                    ? "grad-warm"
                    : "grad-cool"
                  : "border border-border bg-secondary/60",
              )}
            >
              <it.icon
                className={cn(
                  "h-5 w-5",
                  it.unlocked ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
            </div>
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-semibold",
                !it.unlocked && "text-muted-foreground",
              )}
            >
              {it.label}
            </span>
            {it.unlocked ? null : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-secondary/70 backdrop-blur-xl">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            {it.unlocked ? null : (
              <span className="pointer-events-none absolute inset-0 bg-background/35 backdrop-blur-[2px]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type Q = { card: CardRow; options: string[] };

function Session({ mode, pool, onExit }: { mode: Mode; pool: CardRow[]; onExit: () => void }) {
  const { tr, initData, refreshCards } = useNur();
  const total = mode === "exam" ? 20 : 10;

  const questions = useMemo<Q[]>(() => {
    const picked = shuffle(pool).slice(0, Math.min(total, pool.length));
    return picked.map((card) => {
      const others = shuffle(pool.filter((c) => c.id !== card.id))
        .slice(0, 3)
        .map((c) => c.translation);
      return { card, options: shuffle([card.translation, ...others]) };
    });
  }, [pool, total]);

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [input, setInput] = useState("");

  const q = questions[idx];
  const kind: Exclude<Mode, "exam"> =
    mode === "exam" ? (["choice", "match", "spell"] as const)[idx % 3] : mode;

  async function submit(correct: boolean) {
    haptic(correct ? "success" : "error");
    setAnswered(correct);
    if (correct) setScore((s) => s + 1);
    await reviewCard({ data: { initData, id: q.card.id, correct } });
  }

  function next() {
    setAnswered(null);
    setInput("");
    setIdx((i) => i + 1);
  }

  if (!q) {
    const pct = Math.round((score / Math.max(1, questions.length)) * 100);
    return (
      <Card className="py-12 text-center">
        <div className="mb-3 text-4xl">{pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "💪"}</div>
        <h2 className="text-lg font-bold">{tr("result")}</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums text-accent">
          {score} / {questions.length}
        </p>
        <div className="mt-6">
          <Button
            variant="neon"
            onClick={() => {
              refreshCards();
              onExit();
            }}
          >
            {tr("finish")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between px-1">
        <button onClick={onExit} className="text-sm font-semibold text-muted-foreground">
          {tr("back")}
        </button>
        <span className="text-sm font-bold tabular-nums">
          {idx + 1} / {questions.length}
        </span>
      </div>
      <Progress value={((idx + 1) / questions.length) * 100} />

      <Card className="animate-pop py-8 text-center">
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {kind === "spell" ? tr("typeWord") : tr("quiz")}
        </p>
        <p className="text-2xl font-bold">{kind === "spell" ? q.card.translation : q.card.word}</p>
        {q.card.example && answered !== null ? (
          <p className="mx-auto mt-3 max-w-xs text-xs text-muted-foreground italic">
            {q.card.example}
          </p>
        ) : null}
      </Card>

      {kind === "spell" ? (
        <div className="space-y-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={answered !== null}
            placeholder={tr("typeWord")}
            className="w-full rounded-2xl border border-input bg-card/70 px-4 py-3.5 text-center text-lg font-semibold outline-none focus:border-accent"
          />
          {answered === null ? (
            <Button
              variant="neon"
              disabled={!input.trim()}
              onClick={() => submit(input.trim().toLowerCase() === q.card.word.trim().toLowerCase())}
            >
              {tr("submitAnswer")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2.5">
          {(kind === "match" ? shuffle(q.options) : q.options).map((opt) => {
            const isCorrect = opt === q.card.translation;
            const show = answered !== null;
            return (
              <button
                key={opt}
                disabled={show}
                onClick={() => submit(isCorrect)}
                className={cn(
                  "ios-card w-full p-4 text-left font-semibold transition-all active:scale-[0.98]",
                  show && isCorrect && "bg-success/15 text-success",
                  show && !isCorrect && "opacity-40",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {answered !== null ? (
        <div className="space-y-3">
          <p
            className={cn(
              "text-center text-lg font-bold",
              answered ? "text-success" : "animate-shake text-destructive",
            )}
          >
            {answered ? tr("correct") : `${tr("wrong")} — ${q.card.word}`}
          </p>
          <Button variant="neon" onClick={next}>
            {tr("continue")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
