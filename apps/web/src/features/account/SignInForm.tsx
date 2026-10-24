export function SignInForm({ action, next, message }: { action: (formData: FormData) => void | Promise<void>; next: string; message?: string }) {
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="signin-email" className="block text-sm font-medium">Email address</label>
        <input
          id="signin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          className="mt-1 min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3"
        />
        <p className="mt-2 text-sm text-muted">We&apos;ll email you a link that signs you in. No password needed.</p>
      </div>
      {message ? <p role="status" className="text-sm font-medium text-status-caution">{message}</p> : null}
      <button type="submit" className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">
        Email me a sign-in link
      </button>
    </form>
  );
}
