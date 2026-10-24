import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Ride responsibly" };

export default function ResponsibleRidingPage() {
  return (
    <LegalPage title="Ride responsibly">
      <p>A trail listing is information, not permission. Rules, closures and conditions change.</p>
      <ul>
        <li>Stay on marked tracks and respect gates and closures.</li>
        <li>Do not ride in protected areas without a valid permit.</li>
        <li>Give way to people, livestock and wildlife.</li>
        <li>Carry out your waste and keep noise down near settlements.</li>
        <li>Ride in small groups within your ability, and tell someone your plan.</li>
        <li>Never trespass to check a route, and respect what landowners ask you not to share.</li>
      </ul>
    </LegalPage>
  );
}
