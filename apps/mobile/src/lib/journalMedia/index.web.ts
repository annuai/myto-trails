// A browser has no private folder, so on the web journal files are kept in memory for this tab only. It is a preview; the phone app is the real thing.
import { uid } from '../id';

export type MediaKind = 'photo' | 'voice';
const files = new Map<string, string>();
const staged = new Map<string, string>();
const key = (id: string, kind: MediaKind) => `${kind}:${id}`;

export async function savePhoto(sourceUri: string): Promise<{ id: string; width: number; height: number }> {
  const id = uid();
  files.set(key(id, 'photo'), sourceUri);
  return { id, width: 1200, height: 900 };
}
export async function saveVoice(sourceUri: string, id: string): Promise<void> { files.set(key(id, 'voice'), sourceUri); }
export const mediaUri = (id: string, kind: MediaKind) => files.get(key(id, kind)) ?? '';
export const hasMedia = (id: string, kind: MediaKind) => files.has(key(id, kind));
export const readBase64 = async (id: string, kind: MediaKind) => {
  const uri = files.get(key(id, kind));
  if (!uri) throw new Error('missing');
  const blob = await (await fetch(uri)).blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; buf.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
};
export const removeMedia = (id: string, kind: MediaKind) => { files.delete(key(id, kind)); };
export const removeAllMedia = () => { files.clear(); staged.clear(); };
export async function stageMedia(id: string, kind: MediaKind, base64: string) { staged.set(key(id, kind), `data:${kind === 'photo' ? 'image/jpeg' : 'audio/mp4'};base64,${base64}`); }
export const discardStaged = () => staged.clear();
export function commitStaged(mode: 'replace' | 'merge') {
  if (mode === 'replace') files.clear();
  for (const [k, v] of staged) if (!files.has(k)) files.set(k, v);
  staged.clear();
}
