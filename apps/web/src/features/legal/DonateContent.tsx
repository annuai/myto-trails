const safe = (u?: string) => (u && /^https:\/\//i.test(u) && URL.canParse(u) ? u : null);

/** The donate page body. The payment itself happens on a hosted page (no card details touch this site). */
export function DonateContent({ url }: { url?: string }) {
  const href = safe(url);
  return (
    <div className="flex max-w-prose flex-col gap-6">
      <p>Moto Trails is free to use. Donations help pay for hosting, map data and the moderators who check every trail before it is published.</p>
      <p>Your donation goes to Myto, the company behind Moto Trails. It is not a charity and is not tax-deductible. It does not buy any special access, and it never influences which trails are published or how they are described.</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-fit items-center rounded-md bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover">Donate</a>
      ) : (
        <p role="status" className="border-l-4 border-status-info py-1 pl-4">Donations are not open yet. Thank you for your interest.</p>
      )}
      <p className="text-sm text-muted">Payments are handled by a payment provider on its own page. We never see or store your card details.</p>
    </div>
  );
}
