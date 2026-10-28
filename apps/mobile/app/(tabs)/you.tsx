import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BookOpen, Camera, ClipboardList, Download, IdCard, LogIn, LogOut, Luggage, Route as RouteIcon, Trash2, Upload } from 'lucide-react-native';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import { eraseDocumentPhotos } from '@/lib/backup/device';
import { signOut, startSignIn } from '@/lib/signIn';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { useTrailStore } from '@/store/trails';
import { distanceKm } from '@/lib/units';
import { useProfile } from '@/store/profile';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useJournal } from '@/store/journal';
import { useCompanion } from '@/store/companion';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrips } from '@/store/trips';
import { useNotifications } from '@/store/notifications';
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
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { media, space } from '@/theme/tokens';

export default function You() {
  const router = useRouter();
  const rides = useRides((s) => s.rides);
  const { licence, vehicle, contacts } = useProfile();
  const journalCount = useJournal((s) => s.entries.length);
  const tripCount = useTrips((s) => s.trips.length);
  const openTodos = useTodos((s) => s.todos.filter((t) => !t.done).length);
  const [confirm, setConfirm] = useState(false);
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

  const erase = () => {
    eraseDocumentPhotos();
    useJournal.getState().wipe();
    useNotifications.getState().wipe();
    useCompanion.getState().wipe();
    useMyRoutes.getState().wipe();
    useTrips.getState().wipe();
    useProfile.getState().wipe();
    useTodos.setState({ todos: [] });
    useRides.setState({ rides: [] });
    useTrailStore.getState().clear();
    void signOut();
    setConfirm(false);
  };

  return (
    <Screen tabs brand fadeTabs endCap={<RiderBanner />} overlay={
      <Sheet open={confirm} title="Erase all my data?" onClose={() => setConfirm(false)}>
        <Text variant="body" tone="muted">This removes your rides, ride journals, to-dos, documents and contacts from this device. It cannot be undone.</Text>
        <Button label="Erase everything" variant="danger" icon={Trash2} onPress={erase} />
        <Button label="Keep my data" variant="soft" onPress={() => setConfirm(false)} />
      </Sheet>
    }>
      <PageTitle>You</PageTitle>
      <Columns rightStartsWithSection left={<>
      <Card style={{ padding: 24, gap: 6 }}>
        <Text variant="label" tone="muted">Ridden with Myto Moto</Text>
        <Measure parts={distanceKm(totalKm(rides))} size="liveSecondary" />
        <Text variant="label" tone="muted">{real} ride{real === 1 ? '' : 's'} recorded</Text>
      </Card>
      {signedIn ? (
        <>
          <SectionTitle action="Edit" onAction={() => router.push('/bike')}>Your bike</SectionTitle>
          <BikeCard bike={me.data?.bike} onPress={() => router.push('/bike')} />
        </>
      ) : null}
      <SectionTitle>Account</SectionTitle>
      <Card style={{ gap: 14 }}>
        {signedIn ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
              <Avatar name={user?.displayName || 'Rider'} url={me.data?.avatarUrl} size={media.avatarLg} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyMedium">{user?.displayName || 'Signed in'}</Text>
                <Text variant="label" tone="muted">{user?.email}</Text>
              </View>
            </View>
            <Button variant="soft" icon={Camera} label={avatarBusy ? 'Uploading…' : me.data?.avatarUrl ? 'Change picture' : 'Add a picture'} disabled={avatarBusy} onPress={() => void changeAvatar()} />
            {authError ? <Text variant="label" tone="stop">{authError}</Text> : null}
            <Text variant="label" tone="muted">Your Saved trails and ride uploads use this account, the same one as moto-trails.com.</Text>
            <Button variant="soft" icon={LogOut} label="Sign out" onPress={() => void signOut()} />
            <Button variant="soft" icon={Trash2} label="Delete account" onPress={() => router.push('/delete-account')} />
          </>
        ) : (
          <>
            <Text variant="label" tone="muted">Sign in with the same email link as moto-trails.com to see your Saved trails and upload rides.</Text>
            <Button icon={LogIn} label="Sign in with email" onPress={() => { setAuthError(undefined); startSignIn().catch((e: Error) => setAuthError(e.message)); }} />
            {authError ? <Text variant="label" tone="stop">{authError}</Text> : null}
          </>
        )}
      </Card>
      </>} right={<>
      <SectionTitle>Keep track</SectionTitle>
      <ListCard>
        <Row icon={RouteIcon} label="Ride log" value={`${rides.length}`} mono onPress={() => router.push('/rides')} />
        <Row icon={Luggage} label="Trips" value={`${tripCount}`} mono onPress={() => router.push('/trips')} />
        <Row icon={BookOpen} label="Journal" value={`${journalCount}`} mono onPress={() => router.push('/journal')} />
        <Row icon={Bell} label="Notifications" sub="Reminders for to-dos and trips" onPress={() => router.push('/notifications/settings')} />
        <Row icon={ClipboardList} label="To-do list" value={`${openTodos} open`} onPress={() => router.push('/todos')} />
        <Row icon={IdCard} label="Documents and emergency" sub={docs || 'Licence, vehicle, emergency contacts'} onPress={() => router.push('/documents')} />
      </ListCard>
      <SectionTitle>Backup</SectionTitle>
      <ListCard>
        <Row icon={Upload} label="Export my data" sub="One encrypted file you keep" onPress={() => router.push('/backup/export')} />
        <Row icon={Download} label="Import data" sub="From a Myto Moto backup file" onPress={() => router.push('/backup/import')} />
      </ListCard>
      <SectionTitle>Privacy</SectionTitle>
      <ListCard>
        <Row icon={Trash2} tone="stop" label="Erase all my data" onPress={() => setConfirm(true)} chevron={false} />
      </ListCard>
      </>} />
      <View style={{ marginTop: 24, gap: 16 }}>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>Your rides, journal and documents stay on this device. Myto Moto does not replace emergency services.</Text>
        <LegalFooter />
      </View>
    </Screen>
  );
}
