import type { Metadata } from "next";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import { Suspense } from "react";
import { HeaderAccount } from "@/layout/HeaderAccount";
import { FooterBanner } from "@/layout/FooterBanner";
import { SiteFooter } from "@/layout/SiteFooter";
import { SiteHeader } from "@/layout/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import { NavProgress } from "@/ui/NavProgress/NavProgress";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl(process.env)),
  title: { default: "Moto Trails", template: "%s · Moto Trails" },
  description: "A moderated directory of motorcycle trails in India: access, condition and verification for every trail.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <SiteHeader
          account={
            <Suspense fallback={null}>
              <HeaderAccount />
            </Suspense>
          }
        />
        <main className="container-wide w-full flex-1">{children}</main>
        <SiteFooter />
        <FooterBanner />
      </body>
    </html>
  );
}
