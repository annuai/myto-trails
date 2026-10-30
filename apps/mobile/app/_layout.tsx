import { useEffect } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';
import { Theme } from '@/theme/ThemeProvider';
import { fixed, light } from '@/theme/tokens';
import { NotificationHost } from '@/NotificationHost';
import { RecorderHost } from '@/RecorderHost';
import { CompanionHost } from '@/CompanionHost';
import { CrashHost } from '@/CrashHost';
import { RideNotificationHost } from '@/RideNotificationHost';
import { VoiceHost } from '@/VoiceHost';

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
  const [loaded] = useFonts({ Michroma_400Regular, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });
  useEffect(() => { if (loaded) void SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  const app = (
    <Theme mode="light">
      <RecorderHost />
      <NotificationHost />
      <CompanionHost />
      <RideNotificationHost />
          <VoiceHost />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: light.paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="ride/live" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <CrashHost />
    </Theme>
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {Platform.OS === 'web' ? (
          // On the web, show the app at phone width so a laptop test matches a phone.
          <View style={{ flex: 1, backgroundColor: fixed.frame, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: width > height ? 932 : 430, backgroundColor: light.paper, overflow: 'hidden' }}>{app}</View>
          </View>
        ) : app}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
