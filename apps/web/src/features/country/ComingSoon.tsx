import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

const MESSAGE: Record<string, string> = {
  saved: "Thanks. We'll email you once, when Moto Trails opens here.",
  invalid: "That doesn't look like an email address. Please check it and try again.",
  limited: "Too many requests from this device today. Please try again tomorrow.",
  error: "We couldn't save that. Please try again.",
};

/** What a visitor sees for a country we are not open in yet: honest about it, and a way to hear when that changes. */
export function ComingSoon({ country, slug, action, status }: { country: string; slug: string; action: (formData: FormData) => void | Promise<void>; status?: string }) {
  return (
    <section aria-labelledby="coming-soon" className="max-w-prose rounded-3xl bg-card-cream p-6">
      <h2 id="coming-soon" className="text-xl font-semibold">Coming soon to {country}</h2>
      <p className="mt-3">Moto Trails isn&apos;t open in {country} yet. We plan to open there soon, and we only list trails once someone who knows the local rules can check them.</p>
      <form action={action} className="mt-5 flex max-w-md flex-col gap-3">
        <input type="hidden" name="slug" value={slug} />
        <div>
          <label htmlFor="notify-email" className="block text-sm font-medium">Email me when it opens</label>
          <input id="notify-email" name="email" type="email" required autoComplete="email" maxLength={254} className="mt-1 min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3" />
          <p className="mt-2 text-sm text-muted">We&apos;ll send one email when Moto Trails opens in {country}, and nothing else. To have your address removed, write to the contact address in our Privacy page.</p>
        </div>
        {status && MESSAGE[status] ? <p role="status" className={`text-sm font-medium ${status === "saved" ? "text-status-good" : "text-status-caution"}`}>{MESSAGE[status]}</p> : null}
        <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Tell me when it opens</SubmitButton>
      </form>
    </section>
  );
}
