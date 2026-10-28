import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { confirmConditionReport, listConditionReports, type ConditionReportDto } from '@/api/conditionReports';
import { CONDITION_CHOICES } from '@/lib/conditions';
import { useAuth } from '@/store/auth';
import { ChoiceChip, StatusChip, type Status } from '@/ui/Chip';
import { Card } from '@/ui/Card';
import { SectionTitle } from '@/ui/Header';
import { Text } from '@/ui/Text';

const TONE: Record<string, Status> = { clear: 'good', muddy: 'caution', blocked: 'stop', washed_out: 'stop', closed: 'stop' };
const label = (kind: string) => CONDITION_CHOICES.find((c) => c.kind === kind)?.label ?? kind;
const ago = (iso: string) => { const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };

/**
 * What other riders saw lately, clearly labelled as riders' reports (they never change the trail's published access).
 * "Still true?" lets the next rider confirm or dispute one, which is how stale reports fade.
 */
export function RiderReports({ slug }: { slug: string }) {
  const token = useAuth((s) => s.token);
  const [items, setItems] = useState<ConditionReportDto[]>();
  const [voted, setVoted] = useState<Record<string, true>>({});
  useEffect(() => { let live = true; listConditionReports(slug).then((r) => live && setItems(r.slice(0, 5))).catch(() => undefined); return () => { live = false; }; }, [slug]);
  if (!items?.length) return null;
  const vote = (id: string, still: boolean) => { if (!token) return; setVoted((v) => ({ ...v, [id]: true })); void confirmConditionReport(token, id, still).catch(() => setVoted((v) => { const { [id]: _x, ...rest } = v; return rest; })); };
  return (
    <>
      <SectionTitle>Rider reports</SectionTitle>
      <View style={{ gap: 12 }}>
        {items.map((r) => (
          <Card key={r.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusChip status={TONE[r.kind] ?? 'unknown'} label={label(r.kind)} />
              <Text variant="label" tone="muted">{ago(r.at)}{r.fresh ? '' : ' · may be out of date'}</Text>
            </View>
            {r.confirmations || r.disputes ? <Text variant="caption" tone="muted">{r.confirmations} riders say still true, {r.disputes} say it has changed</Text> : null}
            {token && !voted[r.id] ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text variant="label" tone="muted">Still true?</Text>
                <ChoiceChip label="Yes" onPress={() => vote(r.id, true)} />
                <ChoiceChip label="No" onPress={() => vote(r.id, false)} />
              </View>
            ) : null}
          </Card>
        ))}
        <Text variant="caption" tone="muted">Reported by riders, not checked by Moto Trails. The access and condition above are the verified ones.</Text>
      </View>
    </>
  );
}
