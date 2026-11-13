import { useEffect } from 'react';
import { Share } from 'react-native';
import { SosActions } from '@/features/emergency/SosActions';
import { useEmergency } from '@/features/emergency/useEmergency';
import { sosMessage } from '@/lib/sosMessage';
import { useLocation } from '@/store/location';
import { Stack } from '@/ui/layout';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';

/** SOS with no ride recording: where the widget's SOS tile opens, with the same actions as the ride screen's SOS sheet. */
export default function Sos() {
  const emergency = useEmergency();
  // Watch the position while this screen is open, so Share my position has one.
  useEffect(() => useLocation.getState().acquire(), []);
  const share = () => {
    const fix = useLocation.getState().fix;
    void Share.share({ message: sosMessage(fix ? { lat: fix.lat, lng: fix.lng } : null) });
  };
  return (
    <Screen>
      <BackHeader title="Home" />
      <PageTitle>SOS</PageTitle>
      <Stack gap={3}>
        <SosActions emergency={emergency} onShare={share} />
      </Stack>
    </Screen>
  );
}
