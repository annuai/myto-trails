import type { Metadata } from "next";
import { JoinListForm } from "@/features/app-beta/JoinListForm";
import { getBetaApk } from "@/lib/site";
import { Notice } from "@/ui/Notice/Notice";

export const metadata: Metadata = {
  title: "The Myto Moto app",
  description: "A ride companion that records your rides, follows routes without signal and keeps your group together. Try the Android beta, or join the list for launch.",
};

const features = [
  { title: "Record the ride", body: "It keeps recording with the screen off, and every ride goes into a journal with the route, distance and fuel." },
  { title: "Plan and follow a route", body: "Search places, plan along real roads, and follow the route as you ride." },
  { title: "Work without signal", body: "Download maps before you leave. What you need on the road does not wait on a connection." },
  { title: "Tell the next rider", body: "After a ride, check in with what the trail was like: open, muddy, closed." },
  { title: "Ride with a group", body: "Live status for everyone on the ride, and a Help button that tells the group where you are." },
];

const steps = [
  "Open the download on your Android phone, and keep the file if Chrome asks.",
  "Open the file. Android asks once to allow installs from your browser or Files app; allow it.",
  "Open Myto. Sign in with your Moto Trails account, or look around without one.",
];

export default function AppPage() {
  const apk = getBetaApk(process.env);
  return (
    <div className="flex flex-col gap-12 py-12 sm:gap-16 sm:py-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="display-lg text-balance">The Myto Moto app is coming.</h1>
        <p className="max-w-2xl text-lg text-muted">
          One app for the whole ride: find a trail on Moto Trails, take it offline, ride it and record it. It is in beta on Android now, and free.
        </p>
      </header>

      <section id="beta" aria-labelledby="beta-title" className="flex scroll-mt-24 flex-col gap-6">
        <h2 id="beta-title" className="display-md">Try the beta</h2>
        <dl className="max-w-xl border-t border-border">
          {[
            ["Status", "Beta"],
            ["Platform", "Android"],
            ["Version", apk?.version ?? "0.10"],
            ["Size", apk?.size ?? "60 MB"],
            ["Price", "Free"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="font-mono text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {apk ? (
            <a href={apk.url} download className="inline-flex min-h-12 items-center rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">
              Download for Android
            </a>
          ) : (
            <p className="text-muted">The download is going up shortly. Join the list below and we will tell you.</p>
          )}
          <a href="#list" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Or hear when it is live</a>
        </div>
        <div className="flex max-w-2xl flex-col gap-4">
          <Notice tone="caution" title="This is a beta">It can crash and it will change. Tell us what breaks, and we will fix it.</Notice>
          <Notice tone="info" title="No iPhone version yet">Join the list and say you ride an iPhone. We will write the day it is ready.</Notice>
        </div>
        <ol className="max-w-2xl list-decimal space-y-3 pl-6 marker:font-mono marker:text-muted">
          {steps.map((s) => <li key={s} className="pl-2">{s}</li>)}
        </ol>
      </section>

      <section aria-labelledby="does-title" className="flex flex-col gap-6">
        <h2 id="does-title" className="display-md">What it does</h2>
        <ul className="max-w-3xl border-t border-border">
          {features.map((f) => (
            <li key={f.title} className="grid gap-1 border-b border-border py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="list" aria-labelledby="list-title" className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 id="list-title" className="display-md">Hear when it is live</h2>
          <p className="text-muted">Occasional notes while it is built, and one email the day it launches. Reply to any email to leave the list.</p>
        </div>
        <JoinListForm />
      </section>
    </div>
  );
}
