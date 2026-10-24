import Link from "next/link";

const link = "inline-flex min-h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline";

export function AccountMenu({ user }: { user: { displayName: string; email: string } | null }) {
  if (!user) {
    return (
      <Link href="/sign-in" className={link}>
        Sign in
      </Link>
    );
  }
  return (
    <>
      <Link href="/saved" className={link}>
        Saved
      </Link>
      <Link href="/account" className={link}>
        Account
      </Link>
    </>
  );
}
