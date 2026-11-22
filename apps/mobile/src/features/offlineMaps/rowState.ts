// Where one offline map region stands, for its row on the screen.

import { updateAvailable, type Installed, type Region } from '@/lib/offlineRegions/manifest';

/** Not downloaded, downloading, an update available, or installed. */
export type RowState = 'download' | 'downloading' | 'update' | 'installed';

/** What a region's row offers: a running download wins, then an older copy on the phone, then a current one, then nothing. */
export function rowState(region: Region, installed: Installed | undefined, progress: number | undefined): RowState {
  if (progress !== undefined) return 'downloading';
  if (!installed) return 'download';
  return updateAvailable(region, installed) ? 'update' : 'installed';
}
