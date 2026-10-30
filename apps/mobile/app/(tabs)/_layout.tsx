import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { RIDER_OS } from '@/lib/flags';
import { RideBar } from '@/ui/RideBar';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Tabs.Screen name="index" options={{ title: RIDER_OS ? 'Home' : 'Dash' }} />
        <Tabs.Screen name="trails" options={{ title: RIDER_OS ? 'Explore' : 'Trails' }} />
        <Tabs.Screen name="my-rides" options={{ title: 'Rides', ...(RIDER_OS ? {} : { href: null }) }} />
        <Tabs.Screen name="clubs" options={{ title: RIDER_OS ? 'Community' : 'Clubs' }} />
        {/* Not hidden under the flag: Profile is opened from the header, and a hidden tab cannot be opened by path. The tab bar only draws the tabs it lists. */}
        <Tabs.Screen name="you" options={{ title: RIDER_OS ? 'Profile' : 'You' }} />
      </Tabs>
      <RideBar />
    </View>
  );
}
