import { describe, expect, it } from "vitest";
import { answeredEmail, newQuestionEmail, phoneOfferedEmail } from "./emails";

const site = "https://moto-trails.com";

describe("community emails", () => {
  it("point to the inbox and never carry the question, answer or a phone number", () => {
    for (const m of [newQuestionEmail("Anil", site), answeredEmail("Rhea", site), phoneOfferedEmail("Rhea", site, 24, 5)]) {
      expect(m.text).toContain(`${site}/account/questions`);
      expect(m.text).not.toMatch(/\+?\d{10}/);
    }
  });
  it("explains the time limits when a number is offered", () => {
    const m = phoneOfferedEmail("Rhea", site, 24, 5);
    expect(m.text).toMatch(/within 24 hours/);
    expect(m.text).toMatch(/5 minutes/);
    expect(m.text).toMatch(/deleted/);
  });
  it("keeps names from injecting headers", () => {
    expect(newQuestionEmail("Bad\r\nBcc: evil@example.com", site).subject).not.toMatch(/[\r\n]/);
  });
});
