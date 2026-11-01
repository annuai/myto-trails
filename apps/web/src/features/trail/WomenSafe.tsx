import type { WomenSafe as Summary } from "@moto-trails/domain";
import { resultMessage } from "@/features/community/messages";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

type Action = (formData: FormData) => void | Promise<void>;

/**
 * Whether women riders found the trail safe. Nobody is named: only a count shows. A woman rider can add or remove her own
 * mark. Nothing is shown when there are no marks and the viewer cannot mark.
 */
export function WomenSafe({ slug, summary, code, actions }: { slug: string; summary: Summary; code?: string; actions: { mark: Action; unmark: Action } }) {
  const { count, confirmed, mine, canMark } = summary;
  const msg = code?.startsWith("women_") ? resultMessage(code) : null;
  const canAct = canMark || mine;
  if (count === 0 && !canAct && !msg) return null;
  return (
    <section id="women-safe" aria-label="Safe for women riders" className="flex flex-col gap-3">
      {count > 0 ? (
        confirmed ? (
          <StatusBadge kind="women_safe" value="confirmed" size="lg" />
        ) : (
          <StatusBadge kind="women_safe" value="reported" size="lg" label={`Reported safe by ${count} women ${count === 1 ? "rider" : "riders"}`} />
        )
      ) : null}
      {msg ? <p role="status" className={`border-l-4 py-1 pl-4 ${msg.tone === "stop" ? "border-status-stop" : msg.tone === "caution" ? "border-status-caution" : "border-status-good"}`}>{msg.text}</p> : null}
      {canAct ? (
        <form action={mine ? actions.unmark : actions.mark} className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton className="inline-flex min-h-11 items-center rounded-lg border border-ink px-4 text-sm font-medium">{mine ? "Remove my mark" : "+ Mark as safe for women riders"}</SubmitButton>
          <p className="text-sm text-muted">Nobody can see who marked a trail.</p>
        </form>
      ) : null}
    </section>
  );
}
