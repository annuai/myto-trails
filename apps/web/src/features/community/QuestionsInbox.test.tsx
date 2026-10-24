import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QuestionView } from "@/server/community/questions";
import { QuestionsInbox, type InboxActions } from "./QuestionsInbox";

const actions: InboxActions = { answer: vi.fn(), decline: vi.fn(), block: vi.fn(), report: vi.fn(), offer: vi.fn(), withdraw: vi.fn(), reveal: vi.fn(async () => ({})) };
const q = (o: Partial<QuestionView> = {}): QuestionView => ({
  id: "q1", otherName: "Anil", trailSlug: "ridge", trailName: "Ridge track", question: "How was the water crossing?", answer: null, status: "pending",
  createdAt: "2026-10-20T10:00:00.000Z", share: { state: "none", remainingSeconds: 0 }, canOffer: false, canReveal: false, ...o,
});
const render_ = (received: QuestionView[], sent: QuestionView[] = [], blocked: { blockedId: string; name: string }[] = []) =>
  render(<QuestionsInbox received={received} sent={sent} blocked={blocked} actions={actions} unblock={vi.fn()} />);

describe("QuestionsInbox", () => {
  it("explains the empty states", () => {
    render_([]);
    expect(screen.getByText(/only ask you if your profile is public/i)).toBeInTheDocument();
    expect(screen.getByText(/You haven't asked anyone/)).toBeInTheDocument();
  });

  it("lets the person asked answer, decline, block or report a pending question", () => {
    render_([q()]);
    expect(screen.getByText("How was the water crossing?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeInTheDocument();
    for (const name of ["Decline", "Block this rider"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.getByText("Report", { selector: "summary" })).toBeInTheDocument();
  });

  it("offers phone sharing only once answered, with the time limits spelled out", () => {
    render_([q({ status: "answered", answer: "Knee deep.", canOffer: true })]);
    expect(screen.getByText(/Share my phone number with Anil/)).toBeInTheDocument();
    expect(screen.getByText(/within 24 hours/)).toBeInTheDocument();
    expect(screen.getByText(/for 5 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/nobody, including us, can see it/)).toBeInTheDocument();
  });

  it("shows an offered number as withdrawable, and never shows any number", () => {
    const { container } = render_([q({ status: "answered", answer: "ok", share: { state: "offered", remainingSeconds: 7200 } })]);
    expect(screen.getByText(/offered to Anil \(2 h left/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take it back" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\+?\d{10}/);
  });

  it("gives the asker a Reveal button for an offered number, and the answer text", () => {
    render_([], [q({ otherName: "Rhea", status: "answered", answer: "Go slowly.", share: { state: "offered", remainingSeconds: 3000 }, canReveal: true })]);
    expect(screen.getByText(/Rhea answered:/)).toBeInTheDocument();
    expect(screen.getByText(/Rhea offered you their phone number/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reveal the number" })).toBeInTheDocument();
  });

  it("lists blocked riders with an unblock button, and renders question text as text", () => {
    const { container } = render_([q({ question: "<img src=x onerror=alert(1)>" })], [], [{ blockedId: "b1", name: "Bad Actor" }]);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Bad Actor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeInTheDocument();
  });
});
