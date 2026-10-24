import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4">
      <Link href="/" className="inline-flex min-h-11 items-center">
        <Image src="/brand/logo.png" alt="Moto Trails" width={99} height={32} priority />
      </Link>
    </header>
  );
}
