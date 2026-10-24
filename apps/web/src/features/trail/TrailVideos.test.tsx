import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VideoDto } from "@/server/queries/types";
import { TrailVideos, formatSeconds } from "./TrailVideos";

const video = (o: Partial<VideoDto> = {}): VideoDto => ({
  position: 0, description: "A slow pan across the lake shore at dusk", caption: null, credit: "Annuai",
  mp4Url: "/videos/x/video-1.mp4", posterUrl: "/videos/x/video-1-poster.webp", width: 1280, height: 720, durationS: 20, ...o,
});

describe("formatSeconds", () => {
  it("writes short durations as m:ss", () => {
    expect(formatSeconds(9)).toBe("0:09");
    expect(formatSeconds(75)).toBe("1:15");
  });
});

describe("TrailVideos", () => {
  it("shows each video with controls, a poster, no autoplay, and its description and credit as text", () => {
    const { container } = render(<TrailVideos videos={[video()]} />);
    expect(screen.getByRole("heading", { name: "Videos" })).toBeInTheDocument();
    const el = container.querySelector("video")!;
    expect(el).toHaveAttribute("controls");
    expect(el).toHaveAttribute("poster", "/videos/x/video-1-poster.webp");
    expect(el).toHaveAttribute("preload", "none");
    expect(el).not.toHaveAttribute("autoplay");
    expect(el.querySelector("source")).toHaveAttribute("src", "/videos/x/video-1.mp4");
    expect(screen.getByText("A slow pan across the lake shore at dusk")).toBeInTheDocument();
    expect(screen.getByText(/0:20/)).toBeInTheDocument();
    expect(screen.getByText(/Annuai/)).toBeInTheDocument();
  });
  it("offers a download link as a fallback", () => {
    render(<TrailVideos videos={[video()]} />);
    expect(screen.getByRole("link", { name: /download the video/i })).toHaveAttribute("href", "/videos/x/video-1.mp4");
  });
  it("renders nothing without videos", () => {
    const { container } = render(<TrailVideos videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
