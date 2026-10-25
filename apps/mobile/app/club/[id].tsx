import { useState } from 'react';
import { Image, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image as ImageIcon } from 'lucide-react-native';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useClub } from '@/api/useApi';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { radius } from '@/theme/tokens';

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuth((s) => s.token);
  const c = useClub(id);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  if (!c.data) {
    return <Screen><BackHeader title="Clubs" /><Text variant="body" tone={c.error ? 'stop' : 'muted'}>{c.error ?? 'Loading…'}</Text>{c.error ? <View style={{ marginTop: 16 }}><Button variant="soft" label="Try again" onPress={c.reload} /></View> : null}</Screen>;
  }
  const { club, members } = c.data;
  const isAdmin = club.role === 'admin';

  const setCover = async (mediaId: string | null) => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try {
      await api(`/clubs/${id}/cover`, { method: 'PUT', token, body: { mediaId } });
      forgetProfile();
      c.reload();
    } catch (e) {
      setProblem(e instanceof ApiFailure ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  };
  const change = async () => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try {
      const r = await pickAndUploadImage(token, [16, 9]);
      if (r) await setCover(r.mediaId);
    } catch (e) {
      setProblem(e instanceof ApiFailure ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <BackHeader title="Clubs" />
      <View style={{ borderRadius: radius.card, overflow: 'hidden' }}><ClubCover name={club.name} url={club.coverUrl} height={180} /></View>
      <View style={{ marginTop: 16, gap: 6 }}>
        <Text variant="title">{club.name}</Text>
        <Text variant="label" tone="muted">{club.memberCount} {club.memberCount === 1 ? 'member' : 'members'}{club.womenOnly ? ' · Women only' : ''}</Text>
        {club.description ? <Text variant="body">{club.description}</Text> : null}
      </View>
      {isAdmin ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Button variant="soft" icon={ImageIcon} label={busy ? 'Working…' : 'Change cover image'} disabled={busy} onPress={() => void change()} />
          {club.coverUrl ? <Button variant="soft" label="Remove cover image" disabled={busy} onPress={() => void setCover(null)} /> : null}
          {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
        </View>
      ) : null}
      {members ? (
        <>
          <SectionTitle>Members</SectionTitle>
          <View style={{ gap: 12 }}>
            {members.map((m) => (
              <Card key={m.handle} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                <Avatar name={m.name} url={m.avatarUrl} size={52} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium">{m.name}{m.role === 'admin' ? ' · Admin' : ''}</Text>
                  {m.bike ? <Text variant="label" tone="muted">{m.bike.name}{m.bike.modelYear ? ` · ${m.bike.modelYear}` : ''}</Text> : <Text variant="label" tone="muted">No bike added</Text>}
                </View>
                {m.bike?.photoUrl ? <Image source={{ uri: m.bike.photoUrl }} accessibilityLabel={`${m.name}'s ${m.bike.name}`} style={{ width: 72, height: 54, borderRadius: radius.thumb - 6 }} resizeMode="cover" /> : null}
              </Card>
            ))}
          </View>
        </>
      ) : (
        <Card style={{ marginTop: 24 }}>
          <Text variant="label" tone="muted">{club.requested ? 'Your request is waiting for the club’s admins.' : 'Members, bikes and posts are only visible to the club’s members. Ask to join on moto-trails.com.'}</Text>
        </Card>
      )}
    </Screen>
  );
}
