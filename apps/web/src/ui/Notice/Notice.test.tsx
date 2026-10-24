import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Notice } from "./Notice";

describe("Notice", () => {
  it("shows a title and body", () => {
    render(<Notice tone="caution" title="Permission required">Ask at the office.</Notice>);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Ask at the office.")).toBeInTheDocument();
  });
  it.each([["info", "status"], ["caution", "status"], ["stop", "alert"]] as const)("%s uses role %s", (tone, role) => {
    render(<Notice tone={tone} title="T">Body</Notice>);
    expect(screen.getByRole(role)).toBeInTheDocument();
  });
});
