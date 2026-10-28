import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, LEGAL_SLUGS, MADE_IN_INDIA, docText, getLegalDoc, legalDocs, versionLabel, type LegalDoc, type Part } from "./legal";

const partsOf = (doc: LegalDoc): Part[] => doc.sections.flatMap((s) => s.blocks.flatMap((b) => ("p" in b ? b.p : b.ul.flat())));

describe("legal documents", () => {
  it("getLegalDoc finds the three documents and nothing else", () => {
    for (const slug of LEGAL_SLUGS) expect(getLegalDoc(slug)?.slug).toBe(slug);
    expect(LEGAL_SLUGS).toEqual(["about", "terms", "privacy"]);
    expect(getLegalDoc("foo")).toBeUndefined();
    expect(getLegalDoc("")).toBeUndefined();
  });

  it("every document shows the contact address as a mailto link", () => {
    for (const doc of Object.values(legalDocs)) {
      expect(partsOf(doc), doc.slug).toContainEqual({ text: CONTACT_EMAIL, href: "mailto:clubmyto@gmail.com" });
    }
  });

  it("no document claims we store nothing or never share", () => {
    for (const doc of Object.values(legalDocs)) {
      const text = docText(doc);
      expect(text, doc.slug).not.toMatch(/we (do not|don't|never) (store|keep|collect) (any|anything|your (data|information))/i);
      expect(text, doc.slug).not.toMatch(/never share/i);
      expect(text, doc.slug).not.toMatch(/store no data/i);
      expect(text, doc.slug).not.toMatch(/nothing (is )?stored/i);
    }
  });

  it("terms say removals can take up to a day", () => {
    expect(docText(legalDocs.terms)).toContain("can take up to a day");
  });

  it("privacy says account deletion is by email, with no button promised", () => {
    const text = docText(legalDocs.privacy);
    expect(text).toContain("delete your account");
    expect(text).toContain("email clubmyto@gmail.com");
    expect(text).not.toMatch(/delete (it|your account) (from|in) the app/i);
  });

  it("terms and privacy are drafts, about is not", () => {
    expect(legalDocs.terms.draft).toBe(true);
    expect(legalDocs.privacy.draft).toBe(true);
    expect(legalDocs.about.draft).toBe(false);
  });
});

describe("privacy claims match the code", () => {
  const text = docText(legalDocs.privacy);

  it("join-request phone numbers are deleted 7 days after the admins decide, not 'once settled'", () => {
    expect(text).toContain("7 days after the admins decide");
    expect(text).not.toContain("once the request is settled");
  });

  it("photo originals are kept privately with their location data; only published copies are stripped", () => {
    expect(text).toContain("original upload privately");
    expect(text).not.toContain("Location data is removed from photos you upload");
  });

  it("lists the profile choices, bio and women-rider flag that the account page stores", () => {
    expect(text).toContain("whether you are listed publicly");
    expect(text).toContain("your short bio");
    expect(text).toContain("ride as a woman");
  });

  it("names the map providers", () => {
    expect(text).toContain("OpenStreetMap");
    expect(text).toContain("MapLibre");
  });

  it("says a submitted ride includes the times, and that moderator actions are recorded", () => {
    expect(text).toContain("the times you rode it");
    expect(text).toContain("record of moderator actions");
  });
});

describe("footer copy", () => {
  it("versionLabel falls back instead of printing undefined", () => {
    expect(versionLabel("1.2.3")).toBe("v1.2.3");
    expect(versionLabel(undefined)).toBe("v0.0.0");
    expect(versionLabel(null)).toBe("v0.0.0");
    expect(versionLabel("  ")).toBe("v0.0.0");
  });

  it("MADE_IN_INDIA is the exact owner copy and About says it", () => {
    expect(MADE_IN_INDIA).toBe("Proudly made in India");
    expect(docText(legalDocs.about)).toContain(MADE_IN_INDIA);
  });
});
