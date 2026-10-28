// Terms, Privacy and About, written once for the website and the app. Plain data so both can render it their own way.
// Everything said here about data must be true of the code; the Terms' "up to a day" matches the 24-hour cache cap.

/** Text, or text that links somewhere. */
export type Part = string | { text: string; href: string };
export type Block = { p: Part[] } | { ul: Part[][] };
export type Section = { heading?: string; blocks: Block[] };
export type LegalSlug = "about" | "terms" | "privacy";
export type LegalDoc = { slug: LegalSlug; title: string; updated: string; /** Draft text waits for a lawyer's review. */ draft: boolean; sections: Section[] };

export const CONTACT_EMAIL = "clubmyto@gmail.com";
export const MYTO_URL = "https://myto-moto.com";
export const MADE_IN_INDIA = "Proudly made in India";
export const LEGAL_SLUGS: readonly LegalSlug[] = ["about", "terms", "privacy"];

const UPDATED = "28 October 2026";
const email: Part = { text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` };
const myto: Part = { text: "myto-moto", href: MYTO_URL };
const p = (...parts: Part[]): Block => ({ p: parts });
const ul = (...items: Part[][]): Block => ({ ul: items });

export const legalDocs: Record<LegalSlug, LegalDoc> = {
  about: {
    slug: "about",
    title: "About Moto Trails",
    updated: UPDATED,
    draft: false,
    sections: [
      {
        blocks: [
          p("Moto Trails is a community-powered directory of motorcycle trails in India. Riders share trails; moderators check them, with special care for one question: are riders allowed here?"),
          p("Moto Trails is a project by ", myto, `. ${MADE_IN_INDIA}.`),
        ],
      },
      {
        heading: "How we handle access",
        blocks: [
          ul(
            ["Every trail shows who can ride it, how we know, and when that was last checked."],
            ['We say "unknown" when we don\'t know. We never present uncertain access as fact.'],
            ["Trails on private land or in protected areas are not published as open to everyone."],
          ),
        ],
      },
      {
        heading: "Contact",
        blocks: [
          p('To report a problem with a trail, use "Report an issue" on its page, or email ', email, ". Landowners and authorities who want a trail removed or corrected can do the same, and we hold such requests for review first."),
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms of use",
    updated: UPDATED,
    draft: true,
    sections: [
      {
        heading: "Using Moto Trails",
        blocks: [
          p("Moto Trails shows trails shared by riders and checked by moderators. We make no promise that any trail is open, safe or legal to ride on a given day. You are responsible for checking access and conditions and for riding within the law and your ability. Riding is at your own risk. The app does not replace emergency services."),
        ],
      },
      {
        heading: "What you submit",
        blocks: [
          p("You confirm that you rode or know the trail first-hand, that you did not trespass to collect it, and that you may share what you submit. You allow Moto Trails to publish your trail details, photos and GPX, to let other riders use and share them, and to credit you by display name."),
        ],
      },
      {
        heading: "What we may do",
        blocks: [
          p("We may edit, withhold or remove content, including at the request of landowners or authorities, and we may suspend accounts that misuse the service. A removal can take up to a day to appear everywhere, because the website and the app keep copies of trail information to stay fast."),
        ],
      },
      {
        heading: "Taking a trail down",
        blocks: [
          p('Landowners and authorities can ask us to remove or correct a trail by emailing ', email, ' or using "Report an issue" on the trail\'s page. We hold such requests for review first.'),
        ],
      },
      {
        heading: "Being a good member",
        blocks: [p("Be respectful. Do not post other people's personal details, and do not use club features to pester anyone.")],
      },
      {
        heading: "Donations",
        blocks: [p("Donations go to Myto, are not a charity gift and are not tax-deductible.")],
      },
      {
        heading: "Contact",
        blocks: [p("Questions about these terms: ", email, ".")],
      },
    ],
  },

  privacy: {
    slug: "privacy",
    title: "Privacy",
    updated: UPDATED,
    draft: true,
    sections: [
      {
        blocks: [p("Your rides stay on your phone. We keep only what the website and the community features need, and this page says exactly what that is.")],
      },
      {
        heading: "What stays on your device",
        blocks: [
          ul(
            ["Your ride log and recorded tracks."],
            ["Your ride journal: notes, photos and voice notes."],
            ["Your to-dos and reminders."],
            ["Your documents, document photos and emergency contacts."],
            ["Backups you export, which are one encrypted file only you hold."],
          ),
          p('None of this is sent to us. You can erase it in the app under You, "Erase all my data". If you choose to submit a ride as a trail, that submission is sent to us (see below).'),
        ],
      },
      {
        heading: "What we store if you sign in or join the community",
        blocks: [
          ul(
            ["Your email address and display name."],
            ["Your profile picture and bike, if you add them."],
            ["Trails you save."],
            ["Trails, photos and GPX files you submit, and the comments, questions and club posts you write."],
            ["Your club membership and join requests."],
            ["A scrambled (hashed) form of your network address and device, used only to limit abuse and keep you signed in."],
          ),
          p("We do not store your precise location. Location data is removed from photos you upload."),
        ],
      },
      {
        heading: "Phone numbers",
        blocks: [
          p("If you ask to join a club, or offer your number to another rider, the number is stored encrypted. Only the club admins you asked, or the rider you offered it to, can see it. It is deleted automatically once the request is settled or its time limit passes."),
        ],
      },
      {
        heading: "Your location",
        blocks: [
          p('"Near me" uses your approximate position, rounded to about 1 km, only to find trails close to you. On the website it sits in a short-lived cookie that expires after 30 minutes. We do not save it to your account or our logs. The clock in the website footer shows the time where you are; its place name comes from the approximate location your hosting provider reports for that request, or from your browser\'s time zone, and we do not store it.'),
        ],
      },
      {
        heading: "Who sees what",
        blocks: [
          p("Your display name appears as credit on trails you contribute. Your email address is never shown publicly. Moderators see your submissions and the permission contacts and evidence you provide. Members of a club see each other's names, pictures and bikes."),
        ],
      },
      {
        heading: "Companies that help us run this",
        blocks: [
          ul(
            ["Vercel hosts the website and its service."],
            ["Supabase hosts our database."],
            ["Cloudflare R2 stores photos and GPX files."],
            ["Resend sends your sign-in email links."],
            ["A map provider supplies map tiles and sees which map area your device asks for."],
          ),
          p("They handle data only to provide that service. We do not sell your data or use it for advertising."),
        ],
      },
      {
        heading: "Cookies",
        blocks: [p('The website uses two functional cookies: one keeps you signed in, and one remembers "near me" for 30 minutes. There are no advertising or tracking cookies.')],
      },
      {
        heading: "Your choices",
        blocks: [
          p("You can change your display name and sign out everywhere on your account page. You can export or erase your on-device data in the app. To delete your account and the data tied to it, email ", email, " and we will do it and tell you when it is done."),
        ],
      },
      {
        heading: "Contact",
        blocks: [p("Privacy questions: ", email, ".")],
      },
      {
        heading: "Changes",
        blocks: [p("If this changes in a way that matters, we will say so here and update the date.")],
      },
    ],
  },
};

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return (LEGAL_SLUGS as readonly string[]).includes(slug) ? legalDocs[slug as LegalSlug] : undefined;
}

/** `v1.2.3`, or `v0.0.0` when the app cannot tell its own version. */
export function versionLabel(version?: string | null): string {
  const v = version?.trim();
  return `v${v ? v : "0.0.0"}`;
}

const plain = (parts: Part[]) => parts.map((x) => (typeof x === "string" ? x : x.text)).join("");

/** Every heading and paragraph as one string, for tests and search. */
export function docText(doc: LegalDoc): string {
  return doc.sections
    .flatMap((s) => [s.heading ?? "", ...s.blocks.flatMap((b) => ("p" in b ? [plain(b.p)] : b.ul.map(plain)))])
    .filter(Boolean)
    .join(" ");
}
