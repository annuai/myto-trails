"use client";

import { useState } from "react";
import { Field, inputClass } from "./Field";
import { uploadFile } from "./upload-client";

export type PhotoRow = { mediaId: string; thumbUrl: string; altText: string; caption: string; credit: string };

/** Photo rows with alt text; each photo uploads as soon as it is chosen. The first photo becomes the cover. */
export function PhotoUpload({ initial, errors, max }: { initial: PhotoRow[]; errors?: string; max: number }) {
  const [rows, setRows] = useState<PhotoRow[]>(initial);
  const [state, setState] = useState<{ busy: boolean; messages: string[] }>({ busy: false, messages: [] });

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, max - rows.length));
    e.target.value = "";
    setState({ busy: true, messages: [] });
    const messages: string[] = [];
    const added: PhotoRow[] = [];
    for (const file of files) {
      const r = await uploadFile(file, "image");
      if (r.ok && r.outcome.mediaId) added.push({ mediaId: r.outcome.mediaId, thumbUrl: URL.createObjectURL(file), altText: "", caption: "", credit: "" });
      else messages.push(`${file.name}: ${r.ok ? "not accepted" : r.message}`);
    }
    setRows((prev) => [...prev, ...added]);
    setState({ busy: false, messages });
  }

  const update = (i: number, patch: Partial<PhotoRow>) => setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="photos-input" className="text-sm font-medium">Add photos</label>
        <input id="photos-input" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={onChange} disabled={state.busy || rows.length >= max} className="min-h-12" aria-describedby="photos-help" />
        <p id="photos-help" className="text-sm text-muted">JPEG, PNG, WebP or AVIF, up to 10 MB each, {max} photos at most. Location data is removed from every photo.</p>
        {state.busy ? <p role="status">Uploading…</p> : null}
        {state.messages.map((m) => <p key={m} role="alert" className="text-sm font-medium text-status-stop">{m}</p>)}
        {errors ? <p role="alert" className="text-sm font-medium text-status-stop">{errors}</p> : null}
      </div>
      <ul className="flex flex-col gap-6">
        {rows.map((r, i) => (
          <li key={r.mediaId} className="flex flex-col gap-3 border border-border p-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.thumbUrl ? <img src={r.thumbUrl} alt="" className="h-28 w-40 object-cover" /> : null}
            <div className="flex flex-1 flex-col gap-3">
              <p className="text-sm text-muted">{i === 0 ? "Cover photo" : `Photo ${i + 1}`}</p>
              <input type="hidden" name={`photoId_${i}`} value={r.mediaId} />
              <Field label="Describe the photo for people who can't see it" name={`photoAlt_${i}`}>
                <input id={`photoAlt_${i}`} name={`photoAlt_${i}`} value={r.altText} onChange={(e) => update(i, { altText: e.target.value })} maxLength={300} required className={inputClass} />
              </Field>
              <Field label="Caption (optional)" name={`photoCaption_${i}`}>
                <input id={`photoCaption_${i}`} name={`photoCaption_${i}`} value={r.caption} onChange={(e) => update(i, { caption: e.target.value })} maxLength={160} className={inputClass} />
              </Field>
              <Field label="Credit (optional)" name={`photoCredit_${i}`} hint="Leave blank to credit your display name.">
                <input id={`photoCredit_${i}`} name={`photoCredit_${i}`} value={r.credit} onChange={(e) => update(i, { credit: e.target.value })} maxLength={120} className={inputClass} />
              </Field>
              <button type="button" onClick={() => setRows((prev) => prev.filter((_, k) => k !== i))} className="min-h-11 self-start underline underline-offset-4">Remove this photo</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
