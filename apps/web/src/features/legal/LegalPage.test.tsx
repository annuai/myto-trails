import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage } from "./LegalPage";

describe("LegalPage", () => {
  it("has one h1 and flags drafts", () => {
    render(<LegalPage title="Terms" draft><p>Body</p></LegalPage>);
    expect(screen.getByRole("heading", { level: 1, name: "Terms" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/pending legal review/i);
  });
  it("does not flag finished pages", () => {
    render(<LegalPage title="About"><p>Body</p></LegalPage>);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
