import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommentView } from "@/server/community/comments";
import { CommentsSection } from "./CommentsSection";

const actions = { post: vi.fn(), edit: vi.fn(), remove: vi.fn(), report: vi.fn() };
const c = (o: Partial<CommentView> = {}): CommentView => ({ id: "c1", body: "Gate was open on Saturday", tag: null, createdAt: "2026-10-01T10:00:00.000Z", editedAt: null, authorName: "Ann", authorId: null, mine: false, pending: false, replies: [], ...o });

describe("CommentsSection", () => {
  it("invites signed-out visitors to sign in and comes back to the comments", () => {
    render(<CommentsSection slug="ridge" comments={[]} signedIn={false} actions={actions} />);
    expect(screen.getByRole("link", { name: "Sign in to comment" })).toHaveAttribute("href", "/sign-in?next=%2Ftrails%2Fridge%23comments");
    expect(screen.queryByRole("button", { name: "Post comment" })).toBeNull();
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("says comments are not permission to ride, and offers a posting form with condition tags to members", () => {
    render(<CommentsSection slug="ridge" comments={[]} signedIn actions={actions} />);
    expect(screen.getByText(/not permission to ride/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post comment" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Gate closed" })).toBeInTheDocument();
  });

  it("shows threads with the tag, edited mark, and replies indented under their comment, with a total count", () => {
    render(<CommentsSection slug="ridge" signedIn actions={actions} comments={[c({ tag: "gate_closed", editedAt: "2026-10-01T10:05:00.000Z", replies: [c({ id: "c2", body: "Thanks for the update", authorName: "Bob" })] })]} />);
    expect(screen.getByRole("heading", { name: "Comments (2)" })).toBeInTheDocument();
    expect(screen.getByText("Gate closed", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/edited/)).toBeInTheDocument();
    const nested = screen.getByText("Thanks for the update").closest("ul")!;
    expect(within(nested).getByText("Bob")).toBeInTheDocument();
  });

  it("lets authors edit and delete their own comments, and others report them; pending ones say so", () => {
    render(<CommentsSection slug="ridge" signedIn actions={actions} comments={[c({ id: "mine", mine: true, pending: true, body: "My comment" }), c({ id: "theirs", body: "Their comment" })]} />);
    expect(screen.getByText("Waiting for a moderator")).toBeInTheDocument();
    expect(screen.getAllByText("Edit")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getAllByText("Report")).toHaveLength(1);
    expect(screen.queryByText("Reply", { selector: "summary" })).not.toBeNull(); // only on the comment that is not pending
  });

  it("renders comment text as text, never as markup", () => {
    const { container } = render(<CommentsSection slug="ridge" signedIn={false} actions={actions} comments={[c({ body: "<img src=x onerror=alert(1)> **bold**" })]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
  });

  it("shows the result of the last action", () => {
    render(<CommentsSection slug="ridge" comments={[]} signedIn actions={actions} code="comment_pending" />);
    expect(screen.getByRole("status")).toHaveTextContent(/moderator checks/i);
  });
});
