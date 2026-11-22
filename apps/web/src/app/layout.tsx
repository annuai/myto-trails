// The root layout of every page: fonts, the site header and footer, analytics and the default metadata.

import type { Metadata } from "next";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@/layout/Analytics";
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
  description: "A moderated directory of motorcycle trails: access, condition and verification for every trail.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <SiteHeader
          account={
            // data-ph-mask: session replay never shows the rider's name or email (lib/analytics).
            <span data-ph-mask className="contents">
              <Suspense fallback={null}>
                <HeaderAccount />
              </Suspense>
            </span>
          }
        />
        <main className="container-wide w-full flex-1">{children}</main>
        <SiteFooter />
        <FooterBanner />
      </body>
    </html>
  );
}
