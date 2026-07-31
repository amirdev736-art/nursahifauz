// Interval takrorlash (spaced repetition) algoritmi.
// Box 0..5 -> intervallar. 5 marta ketma-ket to'g'ri => "Yodlangan".
export const BOX_INTERVALS_MIN = [10, 60 * 8, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 16];
export const LEARNED_STREAK = 5;

export function nextState(card: { box: number; streak: number }, correct: boolean) {
  if (!correct) {
    return {
      box: 0,
      streak: 0,
      learned: false,
      due_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
  const streak = card.streak + 1;
  const box = Math.min(card.box + 1, BOX_INTERVALS_MIN.length - 1);
  const learned = streak >= LEARNED_STREAK;
  const minutes = BOX_INTERVALS_MIN[box];
  return {
    box,
    streak,
    learned,
    due_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
  };
}
