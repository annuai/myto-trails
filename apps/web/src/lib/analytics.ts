"use client";

import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
import { ANALYTICS_EVENTS, replayAllowed, scrubAnalyticsProps, webPagePattern, type AnalyticsEventName } from "@moto-trails/domain";

/**
 * Anonymous usage statistics on the website (PostHog, EU, through our own `/ingest` proxy in next.config.ts). No cookies or browser
 * storage (`persistence: "memory"`), no person profiles, no location lookup, no autocapture. Every URL is sent as its route pattern and every
 * prop goes through `scrubAnalyticsProps` (docs/11-security-and-moderation.md). Session replay records a share of visits to public pages only,
 * with inputs and `[data-ph-mask]` text masked and maps blocked. Off without NEXT_PUBLIC_POSTHOG_KEY.
 */
export const REPLAY_SAMPLE_RATE = 0.2;

const URL_KEY = /(url|pathname|referrer)$/i;
/** Props the SDK needs to deliver an event; without them PostHog drops it. */
const SDK_KEYS = new Set(["token", "distinct_id"]);

/** One URL or path as the server may see it: our own pages as route patterns, other sites as their origin only. */
export function scrubUrl(value: string, siteOrigin: string): string {
  if (value.startsWith("/")) return webPagePattern(value);
  try {
    const u = new URL(value);
    return u.origin === siteOrigin ? siteOrigin + webPagePattern(u.pathname) : u.origin;
  } catch {
    return value === "$direct" ? value : "";
  }
}

const isOurs = (event: string): event is AnalyticsEventName => Object.hasOwn(ANALYTICS_EVENTS, event);

/** Runs on every event before it is sent: drops events we did not choose, rewrites URLs and keeps only allowed props. */
export function scrubCapture(cr: CaptureResult | null, siteOrigin: string): CaptureResult | null {
  if (!cr) return null;
  if (cr.event.startsWith("$snapshot")) return cr;
  if (cr.event !== "$pageview" && !isOurs(cr.event)) return null;
  const kept: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cr.properties ?? {})) {
    if (k.startsWith("$") || SDK_KEYS.has(k)) kept[k] = typeof v === "string" && URL_KEY.test(k) ? scrubUrl(v, siteOrigin) : v;
  }
  const own = isOurs(cr.event) ? scrubAnalyticsProps(cr.event, cr.properties) : {};
  return { ...cr, properties: { ...kept, ...own, $geoip_disable: true }, $set: undefined, $set_once: undefined };
}

/**
 * The PostHog settings for the browser: events are sent through this site's own `/ingest` path, and the PostHog interface is the EU one.
 */
export function analyticsConfig(siteOrigin: string): Partial<PostHogConfig> {
  return {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    persistence: "memory",
    person_profiles: "never",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_web_experiments: true,
    disable_session_recording: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
      blockSelector: "canvas, video, .maplibregl-map, [data-ph-block]",
      recordHeaders: false,
      recordBody: false,
      captureJsonLd: false,
    },
    before_send: (cr) => scrubCapture(cr, siteOrigin),
  };
}

let client: PostHog | null = null;
let starting: Promise<boolean> | null = null;
/** Decided once per page load, so a visit is either recorded throughout or not at all. */
const sampled = typeof Math !== "undefined" && Math.random() < REPLAY_SAMPLE_RATE;

/** Starts once, however many times it is called (React runs effects twice in development). */
export function initAnalytics(key: string | undefined = process.env.NEXT_PUBLIC_POSTHOG_KEY): Promise<boolean> {
  if (!key?.trim() || typeof window === "undefined") return Promise.resolve(false);
  starting ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key.trim(), analyticsConfig(window.location.origin));
    client = posthog;
    return true;
  });
  return starting;
}

/** A page view by route pattern, and replay started or stopped for this page. */
export function pageView(pathname: string): void {
  if (!client) return;
  const allowed = sampled && replayAllowed(pathname);
  if (allowed && !client.sessionRecordingStarted()) client.startSessionRecording();
  if (!allowed && client.sessionRecordingStarted()) client.stopSessionRecording();
  client.capture("$pageview");
}
