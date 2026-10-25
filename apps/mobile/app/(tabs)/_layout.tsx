import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { RideBar } from '@/ui/RideBar';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
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
