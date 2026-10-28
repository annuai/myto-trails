import type { Summary } from '@/lib/backup/import';
import { Card } from './Card';
import { Stack } from './layout';
import { Text } from './Text';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What a backup file holds, in counts, shown after the passphrase opened it. */
export function BackupSummary({ summary }: { summary: Summary }) {
  const lines = [plural(summary.rides, 'ride'), plural(summary.todos, 'to-do'), plural(summary.contacts, 'emergency contact'), plural(summary.documents, 'document record'), plural(summary.photos, 'document photo')];
  return (
    <Card>
      <Stack gap={2}>
        <Text variant="labelMedium" tone="muted">This backup holds</Text>
        {lines.map((l) => <Text key={l} variant="body">{l}</Text>)}
      </Stack>
    </Card>
  );
}
