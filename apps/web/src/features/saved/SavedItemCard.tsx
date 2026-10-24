import { statusFor } from "@/ui/StatusBadge/status-map";
import type { SavedItem } from "@/server/queries/saved";
import type { SavedChange } from "@/server/queries/saved-changes";
import { TrailCard } from "../discovery/TrailCard";

function describe(c: SavedChange): string {
  switch (c.field) {
    case "access":
      return `Access: ${statusFor("access", c.from as never).label} → ${statusFor("access", c.to as never).label}`;
    case "condition":
      return `Condition: ${statusFor("condition", c.from as never).label} → ${statusFor("condition", c.to as never).label}`;
    case "verification":
      return `Verification: ${statusFor("verification", c.from as never).label} → ${statusFor("verification", c.to as never).label}`;
  }
}

export function SavedItemCard({ item, remove }: { item: SavedItem; remove: (formData: FormData) => void | Promise<void> }) {
  const removeButton = "inline-flex min-h-11 items-center text-sm underline underline-offset-4";
  if (!item.trail) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <p className="text-muted">This trail is no longer published.</p>
        <form action={remove}>
          <input type="hidden" name="trailId" value={item.unavailableId} />
          <button type="submit" className={removeButton}>Remove from saved</button>
        </form>
      </div>
    );
  }
  return (
    <TrailCard trail={item.trail}>
      {item.changes.length > 0 ? (
        <div className="border-l-4 border-status-caution pl-3">
          <p className="font-medium text-status-caution">Changed</p>
          <ul>
            {item.changes.map((c) => (
              <li key={c.field} className="text-sm">{describe(c)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <form action={remove}>
        <input type="hidden" name="slug" value={item.trail.slug} />
        <button type="submit" className={removeButton} aria-label={`Remove ${item.trail.name} from saved`}>Remove</button>
      </form>
    </TrailCard>
  );
}
