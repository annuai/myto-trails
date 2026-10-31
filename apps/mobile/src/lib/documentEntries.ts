import { daysUntil } from './dates';
import type { DocKind } from './localMedia/types';

type Licence = { number: string; validTill?: string };
type Vehicle = { regNo: string; rcValidTill?: string; insurer?: string; policyNo?: string; insuranceValidTill?: string; pucValidTill?: string };
export type DocEntry = { kind: DocKind; label: string; detail: string; validTill?: string };

/** The papers the rider has filled in, in the order a traffic stop asks for them. Papers they never added are left out. */
export function documentEntries(licence?: Licence, vehicle?: Vehicle): DocEntry[] {
  const out: DocEntry[] = [];
  if (licence) out.push({ kind: 'licence', label: 'Driving licence', detail: licence.number, validTill: licence.validTill });
  if (vehicle?.regNo) out.push({ kind: 'rc', label: 'Registration', detail: vehicle.regNo, validTill: vehicle.rcValidTill });
  if (vehicle?.policyNo || vehicle?.insuranceValidTill) out.push({ kind: 'insurance', label: 'Insurance', detail: [vehicle.insurer, vehicle.policyNo].filter(Boolean).join(' · '), validTill: vehicle.insuranceValidTill });
  if (vehicle?.pucValidTill) out.push({ kind: 'puc', label: 'PUC', detail: '', validTill: vehicle.pucValidTill });
  return out;
}

/** Papers whose date has passed. Nothing else about the papers is raised before a ride: a missing or valid paper is the rider's business. */
export const expiredEntries = (entries: DocEntry[], today?: string): DocEntry[] => entries.filter((e) => e.validTill && daysUntil(e.validTill, today) < 0);

export type PaperState = 'valid' | 'soon' | 'expired' | 'missing';
export type Paper = { kind: DocKind; label: string; state: PaperState; /** Days left when it runs out within SOON_DAYS. */ daysLeft?: number; detail: string; validTill?: string };
/** A paper this close to its date is flagged. */
export const SOON_DAYS = 30;

/** All four papers, whether added or not, each with where it stands: valid, running out, expired or missing. */
export function paperStatus(licence?: Licence, vehicle?: Vehicle, today?: string): Paper[] {
  const have = new Map(documentEntries(licence, vehicle).map((e) => [e.kind, e]));
  const labels: [DocKind, string][] = [['licence', 'Driving licence'], ['rc', 'Registration'], ['insurance', 'Insurance'], ['puc', 'PUC']];
  return labels.map(([kind, label]): Paper => {
    const e = have.get(kind);
    if (!e) return { kind, label, state: 'missing', detail: '' };
    const d = e.validTill ? daysUntil(e.validTill, today) : undefined;
    const state: PaperState = d === undefined ? 'valid' : d < 0 ? 'expired' : d <= SOON_DAYS ? 'soon' : 'valid';
    return { kind, label, state, detail: e.detail, validTill: e.validTill, ...(state === 'soon' ? { daysLeft: d } : {}) };
  });
}

/** One line for the ride screen: nothing when every paper is valid, else the worst thing, as a status and a few words. */
export function papersSummary(papers: Paper[]): { status: 'caution' | 'stop'; word: string } | undefined {
  const count = (s: PaperState) => papers.filter((p) => p.state === s).length;
  const expired = count('expired'), missing = count('missing'), soon = count('soon');
  if (expired) return { status: 'stop', word: `${expired} expired` };
  if (missing === papers.length) return { status: 'caution', word: 'Add (optional)' };
  if (missing) return { status: 'caution', word: `${missing} missing` };
  if (soon) return { status: 'caution', word: `${soon} running out` };
  return undefined;
}
