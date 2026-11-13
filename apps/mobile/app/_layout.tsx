import { useEffect } from 'react';
import { AppState, Platform, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';
import { Theme } from '@/theme/ThemeProvider';
import { dark, fixed, light, layout } from '@/theme/tokens';
import { useAppearance } from '@/store/appearance';
import { NotificationHost } from '@/NotificationHost';
import { RecorderHost } from '@/RecorderHost';
import { CompanionHost } from '@/CompanionHost';
import { NudgeHost } from '@/NudgeHost';
import { AutoEndHost } from '@/AutoEndHost';
import { MarkHost } from '@/MarkHost';
import { PhotoOutboxHost } from '@/PhotoOutboxHost';
import { SyncHost } from '@/SyncHost';
import { SubmissionQueueHost } from '@/SubmissionQueueHost';
import { refreshFixit } from '@/fixit/content';
import { refreshQuotes } from '@/store/quotes';
import { ResumeHost } from '@/ResumeHost';
import { CrashHost } from '@/CrashHost';
import { NavigateChoiceHost } from '@/NavigateChoiceHost';
import { OsmAskHost } from '@/features/osm/OsmAskHost';
import { QuickWidgetHost } from '@/QuickWidgetHost';
import { RideNotificationHost } from '@/RideNotificationHost';
import { VoiceHost } from '@/VoiceHost';
import { runRideIdMigration } from '@/lib/rideIdMigration.run';
import { startCachePersistence } from '@/api/cachePersist.run';
import { startCrashReporting } from '@/lib/crashReporting';

startCrashReporting();
void SplashScreen.preventAutoHideAsync();

// Web build only. A phone app does not select text when you press and hold a button, so the browser build should not either.
// Text fields stay selectable. Without this, holding Stop or SOS starts a text selection (and a long-press menu on phones).
const WEB_BASE_CSS = `
  html, body { overscroll-behavior: none; }
  * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  input, textarea { -webkit-user-select: text; user-select: text; }
  [role=button], [role=tab], [role=checkbox], [role=link] { touch-action: manipulation; }
`;

export default function Root() {
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS !== 'web' || document.getElementById('myto-web-base')) return;
    const el = document.createElement('style');
    el.id = 'myto-web-base';
    el.textContent = WEB_BASE_CSS;
    document.head.appendChild(el);
    const noMenu = (e: Event) => e.preventDefault(); // the long-press menu on touch screens
    document.addEventListener('contextmenu', noMenu);
    return () => document.removeEventListener('contextmenu', noMenu);
  }, []);
  useEffect(() => { void runRideIdMigration().catch(() => undefined); }, []);
  useEffect(() => { void startCachePersistence(); }, []);
  // Download the Fix it guides while there is a signal, so they are on the phone when there is not one.
  useEffect(() => { void refreshFixit(Date.now()); }, []);
  // The pull-down quotes: fetched on first open and then weekly, on start and whenever the app comes back to the front.
  useEffect(() => {
    void refreshQuotes(Date.now());
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refreshQuotes(Date.now()); });
    return () => sub.remove();
  }, []);
  // Under inverted colours the page behind every screen is the dark paper, as the screens are drawn in the opposite mode.
  const paper = useAppearance((s) => s.inverted) ? dark.paper : light.paper;
  const [loaded] = useFonts({ Michroma_400Regular, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });
  useEffect(() => { if (loaded) void SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  const app = (
    <Theme mode="light" screen>
      <RecorderHost />
      <NotificationHost />
      <CompanionHost />
      <SubmissionQueueHost />
      <PhotoOutboxHost />
      <SyncHost />
      <NudgeHost />
      <AutoEndHost />
      <ResumeHost />
      <RideNotificationHost />
      <QuickWidgetHost />
          <VoiceHost />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="ride/live" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <NavigateChoiceHost />
      <OsmAskHost />
      <CrashHost />
      <MarkHost />
    </Theme>
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {Platform.OS === 'web' ? (
          // On the web, show the app at phone width so a laptop test matches a phone.
          <View style={{ flex: 1, backgroundColor: fixed.frame, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: width > height ? layout.frameLandscape : layout.frame, backgroundColor: paper, overflow: 'hidden' }}>{app}</View>
          </View>
        ) : app}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
