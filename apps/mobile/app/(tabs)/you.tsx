import { useState } from 'react';
import { Linking, Platform, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BookOpen, Globe, CalendarDays, ClipboardList, Download, Fuel, IdCard, LifeBuoy, LogIn, LogOut, Luggage, ShieldAlert, Stamp, Route as RouteIcon, Share2, TriangleAlert, Upload } from 'lucide-react-native';
import Constants from 'expo-constants';
import { CONTACT_EMAIL, MYTO_URL, versionLabel } from '@moto-trails/domain';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import { countryName } from '@/lib/countryNames';
import { signOut, startSignIn } from '@/lib/signIn';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { asText, distanceKm } from '@/lib/units';
import { yearRecap } from '@/lib/yearRecap';
import { useProfile } from '@/store/profile';
import { useDistanceUnit, useHomeCountry } from '@/store/region';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useJournal } from '@/store/journal';
import { useTrips } from '@/store/trips';
import { Avatar } from '@/ui/Avatar';
import { LegalFooter } from '@/ui/LegalFooter';
import { RiderBanner } from '@/ui/RiderBanner';
import { BikeCard } from '@/ui/BikeCard';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Measure } from '@/ui/Measure';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Columns } from '@/ui/Columns';
import { Pronunciation } from '@/ui/Pronunciation';
import { Screen } from '@/ui/Screen';
import { SocialLinks } from '@/ui/SocialLinks';
import { Text } from '@/ui/Text';
import { media, opacity, space } from '@/theme/tokens';
import { ScalePressable } from '@/ui/motion';

export default function You() {
  const router = useRouter();
  const home = useHomeCountry();
  const unit = useDistanceUnit(); // re-draws this page's distances when the unit changes
  const rides = useRides((s) => s.rides);
  const { licence, vehicle, contacts } = useProfile();
  const journalCount = useJournal((s) => s.entries.length);
  const tripCount = useTrips((s) => s.trips.length);
  const openTodos = useTodos((s) => s.todos.filter((t) => !t.done).length);
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const signedIn = !!token;
  const me = useMe();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [authError, setAuthError] = useState<string>();
  const real = rides.filter((r) => !r.sample).length;
  const docs = [licence && 'Licence', vehicle && 'Vehicle', contacts.length && `${contacts.length} contact${contacts.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ');

  const changeAvatar = async () => {
    if (!token) return;
    setAvatarBusy(true); setAuthError(undefined);
    try {
      const r = await pickAndUploadImage(token, [1, 1]);
      if (r) { await api('/me/avatar', { method: 'PUT', token, body: { mediaId: r.mediaId } }); forgetProfile(); me.reload(); }
    } catch (e) { setAuthError(e instanceof ApiFailure ? e.message : 'Something went wrong.'); } finally { setAvatarBusy(false); }
  };

  const reportProblem = () => {
    const body = `\n\n---\nMyto Moto ${versionLabel(Constants.expoConfig?.version)}\n${Platform.OS} ${Platform.Version}`;
    void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Myto Moto: a problem')}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Screen tabs brand fadeTabs endCap={<RiderBanner />}>
      <PageTitle>You</PageTitle>
      <Columns rightStartsWithSection left={<>
      <Card style={{ padding: space[6], gap: space[2] }}>
        <Text variant="label" tone="muted">Ridden with Myto Moto</Text>
        <Measure parts={distanceKm(totalKm(rides))} size="liveSecondary" />
        <Text variant="label" tone="muted">{real} ride{real === 1 ? '' : 's'} recorded</Text>
      </Card>
      {signedIn ? (
        <>
          <SectionTitle>Your bike</SectionTitle>
          <BikeCard bike={me.data?.bike} onPress={() => router.push('/bike')} />
        </>
      ) : null}
      <SectionTitle>Account</SectionTitle>
      {signedIn ? (
        // Just who you are: the picture and the name. Tap the picture to change it.
        <ScalePressable scaleTo={0.985} accessibilityRole="button" accessibilityLabel="Change your profile picture" disabled={avatarBusy} onPress={() => void changeAvatar()}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4], opacity: avatarBusy ? opacity.disabled : 1 }}>
            <Avatar name={user?.displayName || 'Rider'} url={me.data?.avatarUrl} size={media.avatarLg} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>{user?.displayName || 'Rider'}</Text>
          </Card>
        </ScalePressable>
      ) : (
        <Card style={{ gap: space[3] }}>
          <Text variant="label" tone="muted">Sign in with the same email link as moto-trails.com to see your Saved trails and upload rides.</Text>
          <Button icon={LogIn} label="Sign in with email" onPress={() => { setAuthError(undefined); startSignIn().catch((e: Error) => setAuthError(e.message)); }} />
        </Card>
      )}
      {authError ? <Text variant="label" tone="stop" style={{ marginTop: space[2] }}>{authError}</Text> : null}
      </>} right={<>
      <SectionTitle>Keep track</SectionTitle>
      <ListCard>
        <Row icon={RouteIcon} label="Ride log" value={`${rides.length}`} mono onPress={() => router.push('/rides')} />
        <Row icon={CalendarDays} label="Your year" value={asText(distanceKm(yearRecap(rides, new Date().getFullYear()).distanceKm))} mono onPress={() => router.push('/recap')} />
        <Row icon={Fuel} label="Fuel logs" sub="What your rides cost in petrol" onPress={() => router.push('/fuel')} />
        <Row icon={Stamp} label="Trails ridden" onPress={() => router.push('/passport')} />
        <Row icon={Luggage} label="Trips" value={`${tripCount}`} mono onPress={() => router.push('/trips')} />
        <Row icon={BookOpen} label="Journal" value={`${journalCount}`} mono onPress={() => router.push('/journal')} />
        <Row icon={ClipboardList} label="To-do list" value={`${openTodos} open`} onPress={() => router.push('/todos')} />
        <Row icon={IdCard} label="Documents and emergency" sub={docs || 'Licence, vehicle, emergency contacts'} onPress={() => router.push('/documents')} />
      </ListCard>
      <SectionTitle>Settings</SectionTitle>
      <ListCard>
        <Row icon={ShieldAlert} label="Crash detection" sub="Beta. Asks if you are OK after a crash" onPress={() => router.push('/safety')} />
        <Row icon={Globe} label="Country and units" sub={`${home ? countryName(home) : 'Not set'} · ${unit === 'mi' ? 'miles' : 'kilometres'}`} onPress={() => router.push('/region')} />
        <Row icon={Bell} label="Notifications" sub="Reminders for to-dos and trips" onPress={() => router.push('/notifications/settings')} />
        <Row icon={LifeBuoy} label="Report a problem" sub="Opens an email with your app version" onPress={reportProblem} />
      </ListCard>
      <SectionTitle>Backup</SectionTitle>
      <ListCard>
        <Row icon={Upload} label="Export my data" sub="One encrypted file you keep" onPress={() => router.push('/backup/export')} />
        <Row icon={Download} label="Import data" sub="From a Myto Moto backup file" onPress={() => router.push('/backup/import')} />
      </ListCard>
      <View style={{ marginTop: space[8] }} />
      <ListCard>
        <Row icon={TriangleAlert} tone="stop" label="Danger zone" sub="Erase my data, delete my account" onPress={() => router.push('/danger')} />
      </ListCard>
      </>} />
      {signedIn ? <View style={{ marginTop: space[8] }}><Button variant="soft" icon={LogOut} label="Sign out" onPress={() => void signOut()} /></View> : null}
      <View style={{ marginTop: space[6], gap: space[4] }}>
        <Button variant="soft" icon={Share2} label="Share Myto Moto" onPress={() => void Share.share({ message: `Myto Moto, the motorcycle trails app: ${MYTO_URL}`, url: MYTO_URL })} />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>Your rides, journal and documents stay on this device. Myto Moto does not replace emergency services.</Text>
        <LegalFooter />
        <SocialLinks />
        <Pronunciation />
      </View>
    </Screen>
  );
}
