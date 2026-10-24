import Image from "next/image";

/** The closing illustration under the footer. Decorative, so it has no alt text. */
export function FooterBanner() {
  return (
    <div className="w-full overflow-hidden bg-background" aria-hidden="true">
      <Image src="/images/footer/footer-rider-on-mountain-ridge.webp" alt="" width={2000} height={667} sizes="100vw" className="h-auto w-full" />
    </div>
  );
}
