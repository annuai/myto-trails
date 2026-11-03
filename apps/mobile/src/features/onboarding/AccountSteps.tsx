import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { ApiFailure } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import { sendWelcome, setMyAvatar } from '@/api/welcome';
import type { MyProfile } from '@/api/types';
import { DECLARATION, GENDER_CHOICES, NAME_MAX, welcomeBody, welcomeFailure, welcomeProblems } from '@/lib/profileForm';
import { startSignIn } from '@/lib/signIn';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { radius, media, size, space } from '@/theme/tokens';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Logo } from '@/ui/Logo';
import { logo } from '@/ui/Logo.tokens';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { SETUP_ART } from './slides';

/** Where the email link brings the rider back to: this flow's profile step. */
export const PROFILE_STEP_PATH = '/onboarding?step=profile';

/** The logo, and a button to skip the step when there is one. */
export function Header({ onSkip, skipLabel }: { onSkip?: () => void; skipLabel?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.target }}>
      <Logo height={logo.onboarding} />
      {onSkip && skipLabel ? <TextButton label={skipLabel} onPress={onSkip} /> : null}
    </View>
  );
}

/**
 * Step after the setup page: sign in or make an account (one email link, no password). Optional: the app works without an account,
 * so Skip for now is always one tap.
 */
export function AccountStep({ onSkip }: { onSkip: () => void }) {
  const [problem, setProblem] = useState<string>();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space[4] }}>
        <Header onSkip={onSkip} skipLabel="Skip for now" />
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: radius.card }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={SETUP_ART} resizeMode="cover" accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ gap: space[3] }}>
          <Text variant="title">Create your account or sign in.</Text>
          <Text variant="body" tone="muted">Join clubs, post to trails and keep your profile. Your rides stay on this phone either way, and you can do this later under You.</Text>
        </View>
        {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
        <View style={{ gap: space[2] }}>
          <Button big variant="accent" label="Continue with email" onPress={() => { setProblem(undefined); startSignIn(PROFILE_STEP_PATH).catch((e: Error) => setProblem(e.message)); }} />
          <Button variant="soft" label="Skip for now" onPress={onSkip} />
        </View>
      </View>
    </Screen>
  );
}

type SetupValues = { name: string; gender: MyProfile['gender']; phone: string };
type ViewProps = {
  initialName: string; avatarUrl: string | null; busy: boolean; problem?: string; pictureBusy?: boolean; pictureProblem?: string;
  onPickPicture: () => void; onSubmit: (v: SetupValues) => void; onLater: () => void; onTerms: () => void;
};

/** The form of the profile step. It holds what is typed; the step around it does the talking to the server. */
export function ProfileSetupView({ initialName, avatarUrl, busy, problem, pictureBusy, pictureProblem, onPickPicture, onSubmit, onLater, onTerms }: ViewProps) {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<MyProfile['gender']>(null);
  const [phone, setPhone] = useState('');
  const [declared, setDeclared] = useState(false);
  const [tried, setTried] = useState(false);
  const found = welcomeProblems({ name, phone, declared });
  const show = tried ? found : {};
  const finish = () => {
    setTried(true);
    if (Object.keys(found).length > 0) return;
    onSubmit({ name, gender, phone });
  };
  return (
    <Screen footer={<Button big variant="accent" label={busy ? 'Saving…' : 'Finish'} disabled={busy} onPress={finish} />}>
      <Header onSkip={onLater} skipLabel="Not now" />
      <View style={{ gap: space[3], marginBottom: space[5] }}>
        <Text variant="title">Set up your profile.</Text>
        <Text variant="body" tone="muted">Your name and one confirmation. The rest is optional.</Text>
      </View>
      <Card style={{ gap: space[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar name={name.trim() || 'Rider'} url={avatarUrl} own size={media.avatarLg} />
          <View style={{ flex: 1 }}>
            <Button variant="soft" icon={Camera} label={avatarUrl ? 'Change picture' : 'Add a picture'} disabled={pictureBusy} onPress={onPickPicture} />
          </View>
        </View>
        {pictureProblem ? <Text variant="label" tone="stop">{pictureProblem}</Text> : null}
        <Field onCard label="Display name" value={name} onChangeText={setName} maxLength={NAME_MAX} error={show.name} hint="Shown with your comments and club posts." autoComplete="name" textContentType="name" />
        <View style={{ gap: space[2] }}>
          <Text variant="labelMedium">Gender (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {GENDER_CHOICES.map((g) => <ChoiceChip raised key={g.label} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} />)}
          </View>
          <Text variant="caption" tone="muted">Private. Only used for women-only clubs and safety marks.</Text>
        </View>
        <Field onCard label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={show.phone} hint="Private, and not verified. Leave it empty if you prefer." />
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space[4] }}>
        <Checkbox checked={declared} onChange={setDeclared} label={DECLARATION} />
        <Text variant="body" style={{ flex: 1 }} onPress={() => setDeclared(!declared)}>{DECLARATION}.</Text>
      </View>
      {show.declaration ? <Text variant="label" tone="stop" style={{ marginTop: space[1] }}>{show.declaration}</Text> : null}
      <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>
        By continuing you accept the <Text variant="caption" tone="accent" accessibilityRole="link" onPress={onTerms}>Terms</Text>.
      </Text>
      {problem ? <Text variant="label" tone="stop" style={{ marginTop: space[4] }}>{problem}</Text> : null}
    </Screen>
  );
}

/**
 * Step for a signed-in rider whose welcome is not done: reads GET /me, then POST /me/welcome (private rider page by default; it can
 * be changed in Profile settings). The picture goes through the upload pipeline and PUT /me/avatar, before or after. A rider whose
 * welcome is already done skips straight on.
 */
export function ProfileSetupStep({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const me = useMe();
  const save = useAction();
  const picture = useAction();
  const welcomed = me.data?.profile.welcomeDone === true;
  useEffect(() => { if (welcomed) onDone(); }, [welcomed, onDone]);

  const submit = async (v: SetupValues) => {
    if (!token) return;
    const r = await save.run(() => sendWelcome(token, welcomeBody(v)).catch((e: unknown) => { throw e instanceof ApiFailure ? new ApiFailure(e.status, e.code, welcomeFailure(e), e.fields) : e; }));
    if (!r) return;
    useAuth.getState().setSession(token, { displayName: r.value.displayName, email: me.data?.email ?? '' });
    forgetProfile();
    onDone();
  };
  const pick = async () => {
    if (!token) return;
    await picture.run(async () => {
      const r = await pickAndUploadImage(token, [1, 1]);
      if (!r) return;
      await setMyAvatar(token, r.mediaId);
      forgetProfile(); me.reload();
    });
  };

  if (!me.data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', gap: space[4] }}>
          {me.error ? (<><Text variant="body" tone="stop">{me.error}</Text><Button variant="soft" label="Try again" onPress={me.reload} /><Button variant="soft" label="Not now" onPress={onDone} /></>) : <ActivityIndicator />}
        </View>
      </Screen>
    );
  }
  if (welcomed) return null;
  return (
    <ProfileSetupView initialName={me.data.displayName} avatarUrl={me.data.avatarUrl} busy={save.busy} problem={save.problem} pictureBusy={picture.busy} pictureProblem={picture.problem}
      onPickPicture={() => void pick()} onSubmit={(v) => void submit(v)} onLater={onDone} onTerms={() => router.push('/legal/terms')} />
  );
}
