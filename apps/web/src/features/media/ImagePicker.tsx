"use client";

import { useState } from "react";
import { uploadFile } from "@/features/submit/upload-client";

/** Picks one image and uploads it at once; the form then carries the finished upload's id in a hidden field named `name`. */
export function ImagePicker({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const [state, setState] = useState<{ busy: boolean; mediaId: string; preview: string; error: string }>({ busy: false, mediaId: "", preview: "", error: "" });

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState((s) => ({ ...s, busy: true, error: "" }));
    const r = await uploadFile(file, "image");
    if (r.ok && r.outcome.mediaId) setState({ busy: false, mediaId: r.outcome.mediaId, preview: URL.createObjectURL(file), error: "" });
    else setState((s) => ({ ...s, busy: false, error: r.ok ? "That photo was not accepted." : r.message }));
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${name}-input`} className="text-sm font-medium">{label}</label>
      <input id={`${name}-input`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onChange} disabled={state.busy} className="min-h-12" aria-describedby={`${name}-help`} />
      <p id={`${name}-help`} className="text-sm text-muted">{hint ?? "JPEG, PNG, WebP or AVIF, up to 10 MB. Location data is removed."}</p>
      {state.busy ? <p role="status">Uploading…</p> : null}
      {state.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.preview} alt="Your new photo, not saved yet" className="h-28 w-auto max-w-full self-start rounded-2xl object-cover" />
      ) : null}
      {state.error ? <p role="alert" className="text-sm font-medium text-status-stop">{state.error}</p> : null}
      <input type="hidden" name={name} value={state.mediaId} />
    </div>
  );
}
