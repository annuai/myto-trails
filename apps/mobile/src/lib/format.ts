export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
export const duration = (sec: number) => { if (sec < 60) return `${sec} sec`; const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m} min`; };
export const mask = (s: string) => (s.length <= 4 ? s : `•••• ${s.slice(-4)}`);
export const km = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });
