"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadFile } from "./upload-client";

/** Uploads a GPX, attaches it to the draft, and refreshes the page so the server-rendered preview appears. */
export function GpxUpload({ attach, attached }: { attach: (uploadId: string) => Promise<{ ok: boolean }>; attached: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState({ busy: true });
    const r = await uploadFile(file, "gpx");
    if (!r.ok) return setState({ busy: false, message: r.message });
    const done = await attach(r.uploadId);
    if (!done.ok) return setState({ busy: false, message: "We couldn't attach that file to your submission." });
    setState({ busy: false });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="gpx" className="text-sm font-medium">{attached ? "Replace the GPX file" : "Upload a GPX file"}</label>
      <input id="gpx" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" onChange={onChange} disabled={state.busy} className="min-h-12" aria-describedby="gpx-help" />
      <p id="gpx-help" className="text-sm text-muted">Up to 5 MB. Use the recorded track of your ride. You can trim the ends before sharing to keep your home private.</p>
      {state.busy ? <p role="status">Checking your file…</p> : null}
      {state.message ? <p role="alert" className="text-sm font-medium text-status-stop">{state.message}</p> : null}
    </div>
  );
}
