import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { radius } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { BackHeader } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Name, model year and one photo. Shown to the members of the rider's clubs only. */
export default function Bike() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const me = useMe();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [photo, setPhoto] = useState<{ mediaId?: string | null; uri?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    const b = me.data?.bike;
    if (b) { setName(b.name); setYear(b.modelYear ? String(b.modelYear) : ''); setPhoto({ uri: b.photoUrl }); }
  }, [me.data?.bike]);

  const fail = (e: unknown) => setProblem(e instanceof ApiFailure ? e.message : 'Something went wrong.');
  const choose = async () => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try { const r = await pickAndUploadImage(token, [4, 3]); if (r) setPhoto({ mediaId: r.mediaId, uri: r.uri }); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try {
      await api('/me/bike', { method: 'PUT', token, body: { name, modelYear: year.trim() ? Number(year) : null, ...(photo.mediaId !== undefined ? { photoMediaId: photo.mediaId } : {}) } });
      forgetProfile();
      router.back();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!token) return;
    setBusy(true);
    try { await api('/me/bike', { method: 'DELETE', token }); forgetProfile(); router.back(); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button label={busy ? 'Saving…' : 'Save bike'} disabled={busy || name.trim().length < 2} onPress={() => void save()} />}>
      <BackHeader title="Your bike" />
      <Text variant="label" tone="muted" style={{ marginBottom: 16 }}>Shown to the members of your clubs, and no one else.</Text>
      <Card style={{ gap: 18 }}>
        <Field label="Bike name" value={name} onChangeText={setName} maxLength={60} placeholder="Himalayan 450" />
        <Field label="Model year (optional)" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2024" />
        {photo.uri ? <Image source={{ uri: photo.uri }} accessibilityLabel="Your bike" style={{ width: '100%', height: 190, borderRadius: radius.control }} resizeMode="cover" /> : null}
        <Button variant="soft" icon={Camera} label={photo.uri ? 'Change photo' : 'Add a photo'} disabled={busy} onPress={() => void choose()} />
        {photo.uri ? <Button variant="soft" label="Remove photo" disabled={busy} onPress={() => setPhoto({ mediaId: null, uri: null })} /> : null}
        {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      </Card>
      {me.data?.bike ? <View style={{ marginTop: 16 }}><Button variant="danger" label="Remove my bike" disabled={busy} onPress={() => void remove()} /></View> : null}
    </Screen>
  );
}
