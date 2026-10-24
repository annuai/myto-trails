import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" draft>
      <h2>What we collect</h2>
      <ul>
        <li>Your email address and display name when you sign in.</li>
        <li>Trails, photos, GPX files and access evidence you submit. Location data is removed from photos.</li>
        <li>A hashed form of your network address, used only to limit abuse.</li>
      </ul>
      <h2>Your location</h2>
      <p>If you use &quot;near me&quot;, your approximate position stays in your browser and in a short-lived cookie; it is not stored in your account or in our logs.</p>
      <h2>Who sees what</h2>
      <p>Your display name appears as credit on trails you contribute. Your email address is never shown publicly. Moderators see your submissions, and the permission contacts and evidence you provide.</p>
      <h2>Your choices</h2>
      <p>You can change your display name, sign out everywhere, and ask for your account to be deleted.</p>
    </LegalPage>
  );
}
