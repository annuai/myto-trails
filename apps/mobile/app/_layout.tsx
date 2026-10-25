import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Theme } from '@/theme/ThemeProvider';
import { light } from '@/theme/tokens';
import { RecorderHost } from '@/RecorderHost';

void SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });
  useEffect(() => { if (loaded) void SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  const app = (
    <Theme mode="light">
      <RecorderHost />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: light.paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="ride/live" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </Theme>
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {Platform.OS === 'web' ? (
          // On the web, show the app at phone width so a laptop test matches a phone.
          <View style={{ flex: 1, backgroundColor: '#d9d4ce', alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: 430, backgroundColor: light.paper, overflow: 'hidden' }}>{app}</View>
          </View>
        ) : app}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
