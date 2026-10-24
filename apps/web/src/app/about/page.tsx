import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "About Moto Trails" };

export default function AboutPage() {
  return (
    <LegalPage title="About Moto Trails">
      <p>Moto Trails is a community-powered directory of motorcycle trails in India. Riders share trails; moderators check them, with special care for one question: <em>are riders allowed here?</em></p>
      <p>Moto Trails is a project by <a href="https://myto-moto.com" className="underline underline-offset-4">myto-moto</a>.</p>
      <h2>How we handle access</h2>
      <ul>
        <li>Every trail shows who can ride it, how we know, and when that was last checked.</li>
        <li>We say &quot;unknown&quot; when we don&apos;t know. We never present uncertain access as fact.</li>
        <li>Trails on private land or in protected areas are not published as open to everyone.</li>
      </ul>
      <h2>Contact</h2>
      <p>To report a problem with a trail, use &quot;Report an issue&quot; on its page. Landowners and authorities who want a trail removed or corrected can use the same link, and we hold such requests for review first.</p>
    </LegalPage>
  );
}
