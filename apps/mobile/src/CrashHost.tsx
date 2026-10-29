import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Vibration, View } from 'react-native';
import { Phone, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncGroupNow } from '@/CompanionHost';
import { callTargets, secondsLeft, telUrl } from '@/lib/crashAlert';
import { CRASH_NOTICE_ID, crashAlertedNotice, crashNotice } from '@/lib/rideActions';
import { clearRideNotice, showRideNotice } from '@/lib/rideNotification';
import { useCompanion } from '@/store/companion';
import { useCrash } from '@/store/crash';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

const quietly = () => undefined;

/**
 * The crash alert, over whatever screen is open. "Are you OK?" with a countdown, buzzing and a notification with an I'm OK button; if
 * nobody answers, a group ride's Help goes out and the screen offers one-tap calls (docs/superpowers/specs/2026-10-29-crash-detection-design.md).
 * A test run shows the same screens and tells no one.
 */
export function CrashHost() {
  const phase = useCrash((s) => s.phase);
  const test = useCrash((s) => s.test);
  const deadline = useCrash((s) => s.deadline);
  const contacts = useProfile((s) => s.contacts);
  const group = useCompanion((s) => !!s.group);
  const [now, setNow] = useState(() => Date.now());
  const sentHelp = useRef(false);
  const targets = callTargets(contacts);

  // The clock: drives the countdown and runs it out.
  useEffect(() => {
    if (phase === 'idle') return;
    const run = () => { const n = Date.now(); setNow(n); useCrash.getState().tick(n); };
    const first = setTimeout(run, 0);
    const id = setInterval(run, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [phase]);

  // Buzz until the rider answers. Gloves and wind: one short buzz would be missed.
  useEffect(() => {
    if (phase !== 'countdown') return;
    Vibration.vibrate(800);
    const id = setInterval(() => Vibration.vibrate(800), 1500);
    return () => { clearInterval(id); Vibration.cancel(); };
  }, [phase]);

  // The notification, and telling the group.
  useEffect(() => {
    if (phase === 'countdown') void showRideNotice(CRASH_NOTICE_ID, crashNotice, false, true).catch(quietly);
    else if (phase === 'alerted') {
      void showRideNotice(CRASH_NOTICE_ID, crashAlertedNotice(useProfile.getState().contacts.find((c) => c.primary)?.name), false, true).catch(quietly);
      const { group } = useCompanion.getState();
      if (!useCrash.getState().test && group) { useCompanion.getState().setLive({ myStatus: 'help' }); sentHelp.current = true; syncGroupNow(); }
    } else {
      void clearRideNotice(CRASH_NOTICE_ID).catch(quietly);
      // The rider answered after the alert went out: the group should not keep thinking they need help.
      if (sentHelp.current) { sentHelp.current = false; useCompanion.getState().setLive({ myStatus: 'ok' }); syncGroupNow(); }
    }
  }, [phase]);

  if (phase === 'idle') return null;
  return <CrashScreen phase={phase} test={test} seconds={secondsLeft(deadline, now)} targets={targets} group={group} />;
}

function CrashScreen({ phase, test, seconds, targets, group }: { phase: 'countdown' | 'alerted'; test: boolean; seconds: number; targets: { label: string; phone: string }[]; group: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const ok = () => useCrash.getState().cancel();
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[6], paddingHorizontal: space[6], gap: space[6], justifyContent: 'space-between' }]}>
      <View style={{ gap: space[4], alignItems: 'center' }}>
        <Icon icon={ShieldAlert} size={56} tone="stop" />
        {test ? <Text variant="labelMedium" tone="muted">TEST. Nothing will be sent.</Text> : null}
        {phase === 'countdown' ? (
          <>
            <Text variant="title" style={{ textAlign: 'center' }}>Crash detected. Are you OK?</Text>
            <Text variant="live" tone="stop" accessibilityLiveRegion="polite">{seconds}</Text>
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>{group ? 'If you do not answer, your group is told you need help.' : 'If you do not answer, you can call for help from here. Nobody is told automatically.'}</Text>
          </>
        ) : (
          <>
            <Text variant="title" style={{ textAlign: 'center' }}>{group && !test ? 'Your group has been told you need help' : 'No answer'}</Text>
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>{group && !test ? 'Call now if you can.' : 'Call for help now if you can.'}</Text>
          </>
        )}
      </View>
      <View style={{ gap: space[3] }}>
        {phase === 'alerted' ? targets.map((t) => <Button key={t.phone} big variant="accent" icon={Phone} label={t.label} onPress={() => void Linking.openURL(telUrl(t.phone))} />) : null}
        <Button big variant={phase === 'countdown' ? 'primary' : 'soft'} label={phase === 'countdown' ? "I'm OK" : "I'm OK, close this"} onPress={ok} />
      </View>
    </View>
  );
}
