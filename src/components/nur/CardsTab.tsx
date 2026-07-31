import { useMemo, useState } from "react";
import { Trash2, Sparkles, RotateCcw } from "lucide-react";
import { Button, Card, Spinner, Stat, SectionTitle, Progress } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { deleteCard, reviewCard, type CardRow } from "@/lib/nur.functions";
import { haptic } from "@/lib/telegram";
import { LEARNED_STREAK } from "@/lib/srs";

export function CardsTab() {
  const { tr, cards, cardsLoading, initData, refreshCards } = useNur();
  const [reviewing, setReviewing] = useState(false);

  const learned = cards.filter((c) => c.learned);
  const active = cards.filter((c) => !c.learned);
  const due = useMemo(
    () => active.filter((c) => new Date(c.due_at).getTime() <= Date.now()),
    [active],
  );

  if (cardsLoading) return <Spinner />;

  if (reviewing) {
    return (
      <ReviewSession
        queue={due.length ? due : active}
        onExit={() => {
          setReviewing(false);
          refreshCards();
        }}
      />
    );
  }

  if (!cards.length) {
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
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={cards.length} label={tr("total")} />
        <Stat value={active.length} label={tr("active")} tone="text-primary" />
        <Stat value={learned.length} label={tr("learned")} tone="text-success" />
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{tr("progress")}</span>
          <span className="text-sm font-bold tabular-nums text-success">
            {Math.round((learned.length / cards.length) * 100)}%
          </span>
        </div>
        <Progress value={(learned.length / cards.length) * 100} />
        <Button
          disabled={!active.length}
          onClick={() => {
            haptic("light");
            setReviewing(true);
          }}
        >
          <RotateCcw className="h-4 w-4" />
          {tr("review")} {due.length ? `· ${due.length}` : ""}
        </Button>
      </Card>

      <SectionTitle>{tr("cards")}</SectionTitle>
      <div className="space-y-2.5">
        {cards.map((c) => (
          <div key={c.id} className="ios-card flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{c.word}</span>
                {c.learned ? (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    {tr("learned")}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                    {c.streak}/{LEARNED_STREAK}
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-primary">{c.translation}</p>
              {c.example ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">
                  {c.example}
                </p>
              ) : null}
            </div>
            <button
              onClick={async () => {
                await deleteCard({ data: { initData, id: c.id } });
                refreshCards();
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewSession({ queue, onExit }: { queue: CardRow[]; onExit: () => void }) {
  const { tr, initData } = useNur();
  const [order] = useState(() => [...queue].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = order[idx];

  if (!card) {
    return (
      <Card className="py-12 text-center">
        <div className="mb-3 text-4xl">🎉</div>
        <h2 className="text-lg font-bold">{tr("allDone")}</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{tr("allDoneDesc")}</p>
        <Button variant="soft" onClick={onExit}>
          {tr("back")}
        </Button>
      </Card>
    );
  }

  async function answer(correct: boolean) {
    haptic(correct ? "success" : "error");
    await reviewCard({ data: { initData, id: card.id, correct } });
    setFlipped(false);
    setIdx((i) => i + 1);
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between px-1">
        <button onClick={onExit} className="text-sm font-semibold text-muted-foreground">
          {tr("back")}
        </button>
        <span className="text-sm font-bold tabular-nums">
          {idx + 1} / {order.length}
        </span>
      </div>
      <Progress value={((idx + 1) / order.length) * 100} />

      <Card className="animate-pop min-h-[220px] py-10 text-center">
        <p className="text-3xl font-bold">{card.word}</p>
        {flipped ? (
          <>
            <p className="mt-4 text-xl font-semibold text-primary">{card.translation}</p>
            {card.example ? (
              <p className="mx-auto mt-4 max-w-xs text-sm text-muted-foreground italic">
                {card.example}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">···</p>
        )}
      </Card>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="danger" onClick={() => answer(false)}>
            {tr("forgot")}
          </Button>
          <Button variant="success" onClick={() => answer(true)}>
            {tr("knew")}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setFlipped(true)}>{tr("showAnswer")}</Button>
      )}
    </div>
  );
}
