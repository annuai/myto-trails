import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bike as BikeIcon, Camera, ClipboardList, IdCard, LogIn, LogOut, Route as RouteIcon, Trash2 } from 'lucide-react-native';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import { signOut, startSignIn } from '@/lib/signIn';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { useTrailStore } from '@/store/trails';
import { distanceKm } from '@/lib/units';
import { useProfile } from '@/store/profile';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { Avatar } from '@/ui/Avatar';
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
    useProfile.getState().wipe();
    useTodos.setState({ todos: [] });
    useRides.setState({ rides: [] });
    useTrailStore.getState().clear();
    void signOut();
    setConfirm(false);
  };

  return (
    <Screen tabs brand overlay={
      <Sheet open={confirm} title="Erase all my data?" onClose={() => setConfirm(false)}>
        <Text variant="body" tone="muted">This removes your rides, to-dos, documents and contacts from this device. It cannot be undone.</Text>
        <Button label="Erase everything" variant="danger" icon={Trash2} onPress={erase} />
        <Button label="Keep my data" variant="soft" onPress={() => setConfirm(false)} />
      </Sheet>
    }>
      <PageTitle>You</PageTitle>
      <Columns rightStartsWithSection left={<>
      <Card style={{ padding: 24, gap: 6 }}>
        <Text variant="label" tone="muted">Ridden with Myto</Text>
        <Measure parts={distanceKm(totalKm(rides))} size="liveSecondary" />
        <Text variant="label" tone="muted">{real} ride{real === 1 ? '' : 's'} recorded</Text>
      </Card>
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
        {signedIn ? <Row icon={BikeIcon} label="Your bike" value={me.data?.bike ? me.data.bike.name : 'Add'} onPress={() => router.push('/bike')} /> : null}
        <Row icon={RouteIcon} label="Ride log" value={`${rides.length}`} mono onPress={() => router.push('/rides')} />
        <Row icon={ClipboardList} label="To-do list" value={`${openTodos} open`} onPress={() => router.push('/todos')} />
        <Row icon={IdCard} label="Documents and emergency" sub={docs || 'Licence, vehicle, emergency contacts'} onPress={() => router.push('/documents')} />
      </ListCard>
      <SectionTitle>Privacy</SectionTitle>
      <ListCard>
        <Row icon={Trash2} tone="stop" label="Erase all my data" onPress={() => setConfirm(true)} chevron={false} />
      </ListCard>
      </>} />
      <View style={{ marginTop: 24 }}>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>Everything is stored on this device only. Myto does not replace emergency services.</Text>
      </View>
    </Screen>
  );
}
