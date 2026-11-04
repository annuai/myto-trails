import { WifiOff } from 'lucide-react-native';
import { useFixitLoading, refreshFixit } from '@/fixit/content';
import { nowMs } from '@/lib/clock';
import { EmptyState } from '@/ui/EmptyState';

/** What a Fix it screen shows before the phone has ever downloaded the guides: they come from the site, and stay on the phone once downloaded. */
export function Unavailable() {
  const loading = useFixitLoading((s) => s.loading);
  return (
    <EmptyState
      icon={WifiOff}
      title={loading ? 'Downloading the guides' : 'Guides not downloaded yet'}
      body="They download from the site when you have a signal, then work with no signal. Open this once while you are online."
      action={loading ? undefined : { label: 'Try again', onPress: () => void refreshFixit(nowMs(), true) }}
    />
  );
}
