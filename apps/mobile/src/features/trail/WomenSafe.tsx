import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import type { WomenSafe as Marks } from '@moto-trails/domain';
import { api } from '@/api/client';
import { useAction } from '@/lib/useAction';
import { womenSafeDisplay } from '@/lib/trailCarry';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/Chip';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

/**
 * 'Safe for women riders' status, and for a woman who is a member, the button to add or remove her own mark. Nobody can see who marked.
 * `reload` asks the server again so the count shown is the real one.
 */
export function WomenSafe({ slug, marks, token, reload }: { slug: string; marks?: Marks; token: string | null; reload: () => void }) {
  const { busy, problem, run } = useAction();
  const shown = womenSafeDisplay(marks);
  const canMark = !!marks?.canMark && !!token;
  if (!shown && !canMark) return null;
  const toggle = async () => {
    const done = await run(() => api<void>(`/trails/${slug}/women-safe`, { method: marks?.mine ? 'DELETE' : 'PUT', token }));
    if (done) reload();
  };
  return (
    <View style={{ gap: space[3], marginTop: space[4] }}>
      {shown ? <StatusChip status={shown.status} label={shown.text} /> : null}
      {canMark ? (
        <>
          <Button variant="soft" icon={marks?.mine ? undefined : Plus} label={marks?.mine ? 'Remove my mark' : 'Mark as safe for women riders'} disabled={busy} onPress={() => void toggle()} />
          <Text variant="caption" tone="muted">Nobody can see who marked a trail.</Text>
        </>
      ) : null}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </View>
  );
}
