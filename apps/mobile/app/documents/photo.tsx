import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { photoUri } from '@/lib/localMedia';
import { fixed, space } from '@/theme/tokens';
import { documentPhoto } from '@/ui/DocumentPhotoField.tokens';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';

/** Asks for Face ID or the passcode when the phone has one set up; a phone without a lock opens the photo directly. */
async function unlock(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return true;
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Open document photo' });
  return r.success;
}

/** Full-screen document photo with pinch-to-zoom. */
export default function DocumentPhotoViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [allowed, setAllowed] = useState<boolean>();
  useEffect(() => { void unlock().then(setAllowed, () => setAllowed(false)); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: fixed.ink }}>
      {allowed ? (
        <ScrollView
          style={{ flex: 1 }} contentContainerStyle={{ width, height, justifyContent: 'center' }}
          maximumZoomScale={documentPhoto.maxZoom} minimumZoomScale={1} bouncesZoom centerContent
          showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri: photoUri(id) }} style={{ width, height }} resizeMode="contain" accessibilityLabel="Document photo" />
        </ScrollView>
      ) : allowed === false ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] }}>
          <Text variant="body" tone="onInk" style={{ textAlign: 'center' }}>This photo is locked. Close this and try again.</Text>
        </View>
      ) : null}
      <View style={{ position: 'absolute', top: insets.top + space[2], right: space[4] }}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
    </View>
  );
}
