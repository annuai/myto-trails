import { Button } from '@/ui/Button';
import { Row } from '@/ui/ListCard';
import type { Region } from '@/lib/offlineRegions/manifest';
import { regionTotalBytes } from '@/lib/offlineRegions/manifest';
import type { RowState } from './rowState';

const mb = (bytes: number) => `${Math.max(0.1, bytes / 1_000_000).toFixed(1)} MB`;

type Props = { region: Region; state: RowState; percent?: number; onDownload: () => void; onDelete: () => void };

/** One region: its size, and the one thing you can do with it right now. */
export function RegionRow({ region, state, percent, onDownload, onDelete }: Props) {
  const size = mb(regionTotalBytes(region));
  const sub = state === 'downloading' ? `Downloading ${percent ?? 0}%` : state === 'update' ? `${size}. A newer map is ready` : state === 'installed' ? `${size}. On this phone` : size;
  const action = state === 'installed' ? <Button variant="soft" label="Delete" onPress={onDelete} />
    : state === 'downloading' ? <Button variant="soft" label={`${percent ?? 0}%`} disabled />
    : <Button variant="soft" label={state === 'update' ? 'Update' : 'Download'} onPress={onDownload} />;
  return <Row label={region.name} sub={sub} chevron={false} right={action} />;
}
