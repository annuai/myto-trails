import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useFirstRun } from '@/features/onboarding/useFirstRun';
import { RideBar } from '@/ui/RideBar';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  // A fresh install opens the welcome flow first; everyone else lands on the tabs.
  const first = useFirstRun();
  if (first === 'checking') return null;
  if (first === 'show') return <Redirect href="/onboarding" />;
  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Tabs.Screen name="index" options={{ title: 'Dash' }} />
        <Tabs.Screen name="trails" options={{ title: 'Trails' }} />
        <Tabs.Screen name="clubs" options={{ title: 'Clubs' }} />
        <Tabs.Screen name="you" options={{ title: 'You' }} />
      </Tabs>
      <RideBar />
    </View>
  );
}
