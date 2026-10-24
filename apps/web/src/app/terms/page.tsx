import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" draft>
      <h2>Using Moto Trails</h2>
      <p>Moto Trails provides information about trails contributed by riders and checked by moderators. We make no promise that any trail is open, safe or legal to ride on a given day. You are responsible for checking access and conditions and for riding within the law and your ability.</p>
      <h2>What you submit</h2>
      <p>You confirm that you rode or know the trail first-hand, that you did not trespass to collect it, and that you may share what you submit. You allow Moto Trails to publish your trail details, photos and GPX, to let other riders use and share them, and to credit you by display name.</p>
      <h2>What we may do</h2>
      <p>We may edit, withhold or remove content, including at the request of landowners or authorities, and we may suspend accounts that misuse the service.</p>
      <h2>Donations</h2>
      <p>Donations go to Myto, are not a charity gift and are not tax-deductible.</p>
    </LegalPage>
  );
}
