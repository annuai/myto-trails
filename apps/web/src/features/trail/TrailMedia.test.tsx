import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaDto, VideoDto } from "@/server/queries/types";
import { TrailMedia, formatSeconds } from "./TrailMedia";

const photo = (position: number, altText: string, o: Partial<MediaDto> = {}): MediaDto => ({
  role: position === 0 ? "cover" : "gallery", position, caption: null, altText, credit: null,
  variants: { "800": `https://example.test/${position}-800.webp`, "1200": `https://example.test/${position}-1200.webp` }, width: 1200, height: 800, ...o,
});
const video = (position: number, description: string, o: Partial<VideoDto> = {}): VideoDto => ({
  position, description, caption: null, credit: "Annuai", mp4Url: `/videos/x/video-${position}.mp4`, posterUrl: `/videos/x/video-${position}-poster.webp`, width: 720, height: 1280, durationS: 20, ...o,
});

describe("formatSeconds", () => {
  it("writes short durations as m:ss", () => {
    expect(formatSeconds(9)).toBe("0:09");
    expect(formatSeconds(75)).toBe("1:15");
  });
});

describe("TrailMedia", () => {
  it("renders nothing without media", () => {
    const { container } = render(<TrailMedia photos={[]} videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows photos with alt text, caption and credit, lazy-loaded with responsive sizes", () => {
    render(<TrailMedia photos={[photo(0, "A gravel track along a ridge", { caption: "The ridge at dawn", credit: "A. Rider" })]} />);
    const img = screen.getByAltText("A gravel track along a ridge");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img.getAttribute("srcset")).toContain("https://example.test/0-1200.webp 1200w");
    expect(screen.getByText("The ridge at dawn")).toBeInTheDocument();
    expect(screen.getByText(/A\. Rider/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Photos" })).toBeInTheDocument();
  });

  it("shows videos with controls, poster, no autoplay, a description, a duration and a download link", () => {
    const { container } = render(<TrailMedia photos={[]} videos={[video(0, "A slow pan across the lake shore at dusk")]} />);
    expect(screen.getByRole("heading", { name: "Videos" })).toBeInTheDocument();
    const el = container.querySelector("video")!;
    expect(el).toHaveAttribute("controls");
    expect(el).toHaveAttribute("preload", "none");
    expect(el).not.toHaveAttribute("autoplay");
    expect(el).toHaveAttribute("poster", "/videos/x/video-0-poster.webp");
    expect(el.querySelector("source")).toHaveAttribute("src", "/videos/x/video-0.mp4");
    expect(screen.getByText("A slow pan across the lake shore at dusk")).toBeInTheDocument();
    expect(screen.getByText(/0:20/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download the video/i })).toHaveAttribute("href", "/videos/x/video-0.mp4");
  });

  it("mixes photos and videos in one masonry list, alternating them", () => {
    render(<TrailMedia photos={[photo(1, "Photo one"), photo(2, "Photo two"), photo(3, "Photo three")]} videos={[video(0, "Video one"), video(1, "Video two")]} />);
    expect(screen.getByRole("heading", { name: "Photos and videos" })).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list.className).toContain("columns-1");
    expect(list.className).toContain("lg:columns-3");
    const items = within(list).getAllByRole("listitem");
    expect(items.every((li) => li.className.includes("break-inside-avoid"))).toBe(true);
    const order = items.map((li) => li.querySelector("img")?.getAttribute("alt") ?? li.querySelector("figcaption span")?.textContent);
    expect(order).toEqual(["Photo one", "Video one", "Photo two", "Video two", "Photo three"]);
  });
});
