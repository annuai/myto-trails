import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4">
      <Link href="/" className="font-display text-base text-foreground">
        Myto Trails
      </Link>
    </header>
  );
}
