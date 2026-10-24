import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClubLoading from "@/app/club/loading";
import ClubDetailLoading from "@/app/club/[id]/loading";
import RootLoading from "@/app/loading";
import TrailsLoading from "@/app/trails/loading";
import TrailLoading from "@/app/trails/[slug]/loading";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is decorative: hidden from assistive technology", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("loading screens", () => {
  it.each([
    ["the default page", RootLoading],
    ["the trails list", TrailsLoading],
    ["a trail page", TrailLoading],
    ["the club list", ClubLoading],
    ["a club page", ClubDetailLoading],
  ])("%s announces that it is loading, once", (_name, Screen) => {
    render(<Screen />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading");
  });
});
