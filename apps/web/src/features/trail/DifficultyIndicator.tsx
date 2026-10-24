import type { Difficulty } from "@moto-trails/domain";
import { difficultyLabel } from "./labels";

const LEVEL: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3, expert: 4 };

/** Four steps plus the word; the squares are decoration. */
export function DifficultyIndicator({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-2.5 w-2.5 border border-foreground ${n <= LEVEL[difficulty] ? "bg-foreground" : ""}`} />
        ))}
      </span>
      <span>{difficultyLabel(difficulty)}</span>
    </span>
  );
}
