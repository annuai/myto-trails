import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '@/api/client';
import type { SearchResult, TrailSummary } from '@/api/types';
import { CONDITION_CHOICES, enqueue, type ConditionKind } from '@/lib/conditions';
import type { LatLng } from '@/lib/geo';
import { useCompanion } from '@/store/companion';
import { useTrailStore } from '@/store/trails';
import { ChoiceChip } from '@/ui/Chip';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** The few trails nearest a position, so a report can say which trail it is about without the rider typing anything. */
function useNearbyTrails(at: LatLng | undefined, enabled: boolean): TrailSummary[] {
  const [items, setItems] = useState<TrailSummary[]>([]);
  const key = at ? `${at.lat.toFixed(2)},${at.lng.toFixed(2)}` : '';
  useEffect(() => {
    if (!enabled || !at) return;
    const ctl = new AbortController();
    api<SearchResult>(`/trails?near=me&lat=${at.lat}&lon=${at.lng}&radius=25`, { signal: ctl.signal }).then((r) => setItems(r.items.slice(0, 4))).catch(() => undefined);
    return () => ctl.abort();
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

/**
 * One tap to say what a trail is like right now. The report is queued on the phone first and sent when there is a signal,
 * so it works on a pass with no network. It is shown to other riders as a rider's report: it never changes a trail's published access.
 */
export function ReportSheet({ open, onClose, at }: { open: boolean; onClose: () => void; at?: LatLng }) {
  const planned = useTrailStore((s) => s.nextTrip);
  const nearby = useNearbyTrails(at, open);
  const [slug, setSlug] = useState<string>();
  const [sent, setSent] = useState<string>();
  const close = () => { setSent(undefined); onClose(); };
  // The planned trail leads only when the rider is actually near it; 200 km away, a report would go against the wrong trail.
  // With no signal to look nearby, the planned trail is the best guess.
  const plannedHere = !!planned && (nearby.length === 0 || nearby.some((t) => t.slug === planned.slug));
  const choices = planned ? (plannedHere ? [{ slug: planned.slug, name: planned.name }, ...nearby.filter((t) => t.slug !== planned.slug)] : [...nearby]) : nearby;
  const target = slug ?? choices[0]?.slug;

  const send = (kind: ConditionKind) => {
    if (!target) return;
    const { outbox, setOutbox } = useCompanion.getState();
    setOutbox(enqueue(outbox, { slug: target, kind, at: new Date().toISOString(), ...(at ? { lat: at.lat, lng: at.lng } : {}) }, Date.now()));
    setSent(CONDITION_CHOICES.find((c) => c.kind === kind)?.label);
  };

  return (
    <Sheet open={open} title="Report the trail" onClose={close}>
      {sent ? (
        <Text variant="bodyMedium">Thanks. "{sent}" is saved and goes to other riders as soon as you have a signal.</Text>
      ) : choices.length === 0 ? (
        <Text variant="label" tone="muted">{at ? 'No trail found close to here. Plan a trail first, or try again when you have a signal.' : 'Waiting for your position…'}</Text>
      ) : (
        <>
          {choices.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {choices.map((t) => <ChoiceChip key={t.slug} label={t.name} selected={t.slug === target} onPress={() => setSlug(t.slug)} />)}
            </View>
          ) : <Text variant="labelMedium">{choices[0]!.name}</Text>}
          <Text variant="label" tone="muted">What is it like right now?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONDITION_CHOICES.map((c) => <ChoiceChip key={c.kind} label={c.label} onPress={() => send(c.kind)} />)}
          </View>
        </>
      )}
    </Sheet>
  );
}
