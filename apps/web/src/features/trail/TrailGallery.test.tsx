import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaDto } from "@/server/queries/types";
import { TrailGallery } from "./TrailGallery";

const media: MediaDto[] = [
  { role: "cover", position: 0, caption: "The ridge at dawn", altText: "A gravel track along a ridge", credit: "A. Rider", variants: { "800": "https://example.test/a-800.webp", "1200": "https://example.test/a-1200.webp" }, width: 1200, height: 800 },
  { role: "gallery", position: 1, caption: null, altText: "A river crossing", credit: null, variants: { "800": "https://example.test/b-800.webp" }, width: 800, height: 533 },
];

describe("TrailGallery", () => {
  it("renders nothing without media", () => {
    const { container } = render(<TrailGallery media={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows images with alt text, caption and credit", () => {
    render(<TrailGallery media={media} />);
    expect(screen.getByAltText("A gravel track along a ridge")).toBeInTheDocument();
    expect(screen.getByAltText("A river crossing")).toBeInTheDocument();
    expect(screen.getByText("The ridge at dawn")).toBeInTheDocument();
    expect(screen.getByText(/A\. Rider/)).toBeInTheDocument();
  });
  it("lazy-loads images and offers responsive sizes", () => {
    render(<TrailGallery media={media} />);
    const img = screen.getByAltText("A gravel track along a ridge");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img.getAttribute("srcset")).toContain("https://example.test/a-1200.webp 1200w");
  });
});
