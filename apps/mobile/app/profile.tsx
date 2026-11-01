import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bike, Camera, Trash2 } from 'lucide-react-native';
import { api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import type { MyProfile } from '@/api/types';
import { BIO_MAX, GENDER_CHOICES, NAME_MAX, phonePatch, phoneProblem, profileProblem } from '@/lib/profileForm';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAction } from '@/lib/useAction';
import { useOnChange } from '@/lib/useOnChange';
import { useAuth } from '@/store/auth';
import { media, space } from '@/theme/tokens';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Who you are to other riders: name, picture, rider page, bio and a private gender. Mirrors the website's Account page. */
export default function Profile() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const me = useMe();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<MyProfile['gender']>(null);
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const save = useAction();
  const picture = useAction();

  useOnChange(me.data?.profile, (p) => {
    if (!p) return;
    setName(p.displayName); setIsPublic(p.public); setBio(p.bio ?? ''); setGender(p.gender); setPhone(p.phone ?? '');
  }, { onFirstDraw: true });

  const invalid = profileProblem({ name, bio }) ?? phoneProblem(phone);
  const welcomeDone = me.data?.profile.welcomeDone !== false;
  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setSaved(false); };

  const onSave = async () => {
    const current = me.data;
    if (!token || !current) return;
    setSaved(false);
    const r = await save.run(() => api<MyProfile>('/me/profile', { method: 'PUT', token, body: { displayName: name.trim(), public: isPublic, bio: bio.trim() || null, gender, ...phonePatch(current.profile.phone, phone) } }));
    if (!r) return;
    useAuth.getState().setSession(token, { displayName: r.value.displayName, email: user?.email ?? current.email });
    forgetProfile(); me.reload(); setSaved(true);
  };

  const setPicture = async (change: boolean) => {
    if (!token) return;
    await picture.run(async () => {
      let mediaId: string | null = null;
      if (change) { const r = await pickAndUploadImage(token, [1, 1]); if (!r) return; mediaId = r.mediaId; }
      await api('/me/avatar', { method: 'PUT', token, body: { mediaId } });
      forgetProfile(); me.reload();
    });
  };

  return (
    <Screen footer={welcomeDone ? <Button label={save.busy ? 'Saving…' : 'Save profile'} disabled={save.busy || !me.data || !!invalid} onPress={() => void onSave()} /> : undefined}>
      <BackHeader title="Profile settings" />
      {welcomeDone ? (
        <>
      <Card style={{ gap: space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar name={name.trim() || 'Rider'} url={me.data?.avatarUrl} own size={media.avatarLg} />
          <View style={{ flex: 1, gap: space[2] }}>
            <Button variant="soft" icon={Camera} label={me.data?.avatarUrl ? 'Change picture' : 'Choose a picture'} disabled={picture.busy} onPress={() => void setPicture(true)} />
            {me.data?.avatarUrl ? <Button variant="soft" label="Remove picture" disabled={picture.busy} onPress={() => void setPicture(false)} /> : null}
          </View>
        </View>
        {picture.problem ? <Text variant="label" tone="stop">{picture.problem}</Text> : null}
        <Field onCard label="Display name" value={name} onChangeText={edit(setName)} maxLength={NAME_MAX} hint="Shown with your comments, trails and club posts." />
      </Card>

      <SectionTitle>Rider page</SectionTitle>
      <Card style={{ gap: space[4] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <ChoiceChip raised label="Public" selected={isPublic} onPress={() => edit(setIsPublic)(true)} />
          <ChoiceChip raised label="Private" selected={!isPublic} onPress={() => edit(setIsPublic)(false)} />
        </View>
        <Text variant="label" tone="muted">
          {isPublic ? 'Listed on trails you have ridden, and riders can ask you questions.' : 'Not listed. You still count in the total.'}
        </Text>
        <Field onCard label="About you (optional)" value={bio} onChangeText={edit(setBio)} maxLength={BIO_MAX} multiline hint="Shown on your rider page if you are public. No web addresses." />
      </Card>

      <SectionTitle>Gender</SectionTitle>
      <Card style={{ gap: space[4] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {GENDER_CHOICES.map((g) => <ChoiceChip raised key={g.label} label={g.label} selected={gender === g.value} onPress={() => edit(setGender)(g.value)} />)}
        </View>
        <Text variant="label" tone="muted">Private. Only used for women-only clubs, and never shown to anyone.</Text>
      </Card>

      <SectionTitle>Phone number</SectionTitle>
      <Card style={{ gap: space[4] }}>
        <Field onCard label="Phone number (optional)" value={phone} onChangeText={edit(setPhone)} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" hint="Private, and not verified. Leave it empty if you prefer." />
      </Card>

      {save.problem ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{save.problem}</Text> : null}
      {!save.problem && invalid && (name || bio || phone) ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{invalid}</Text> : null}
      {saved ? <Text variant="label" tone="good" style={{ marginTop: space[4] }}>Saved.</Text> : null}
        </>
      ) : (
        <Card style={{ gap: space[4] }}>
          <Text variant="title">Finish setting up your account</Text>
          <Text variant="body" tone="muted">Confirm your name and the driving licence declaration once, then you can edit your profile here.</Text>
          <Button label="Finish setting up" onPress={() => router.push('/onboarding?step=profile')} />
        </Card>
      )}

      <View style={{ marginTop: space[6] }} />
      <ListCard>
        <Row icon={Bike} label="Your bike" sub="Shown to the members of your clubs" onPress={() => router.push('/bike')} />
        <Row icon={Trash2} tone="stop" label="Delete account" onPress={() => router.push('/delete-account')} />
      </ListCard>
    </Screen>
  );
}
