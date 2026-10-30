import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bike as BikeGlyph, Camera } from 'lucide-react-native';
import { ApiFailure, api } from '@/api/client';
import { forgetProfile, useMe } from '@/api/useApi';
import type { BikeImageVariants, BikeModel } from '@/api/types';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { BikeImage } from '@/ui/BikeImage';
import { BikePicker } from '@/ui/BikePicker';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { BackHeader } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const HERO_WIDTH = 800;

/** Name, model year and one picture: the catalogue bike, or the rider's own photo over it. Shown to the members of the rider's clubs only. */
export default function Bike() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const me = useMe();
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  // The rider's own photo: undefined keeps the saved one, null removes it.
  const [photo, setPhoto] = useState<{ mediaId?: string | null; uri?: string | null }>({});
  // The catalogue bike: undefined keeps the saved one. `preset` is what to draw for it.
  const [model, setModel] = useState<{ id?: string | null; preset?: string | BikeImageVariants | null }>({});
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    const b = me.data?.bike;
    if (!b) return;
    setName(b.name); setYear(b.modelYear ? String(b.modelYear) : '');
    setPhoto({ uri: b.ownPhoto ? b.photoUrl : null });
    setModel({ id: b.bikeModelId, preset: b.ownPhoto ? null : b.photoUrl });
  }, [me.data?.bike]);

  const fail = (e: unknown) => setProblem(e instanceof ApiFailure ? e.message : 'Something went wrong.');
  const pick = (m: BikeModel) => {
    setModel({ id: m.id, preset: m.image });
    setName(`${m.make} ${m.model}`.slice(0, 60));
    setPicking(false);
  };
  const upload = async () => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try { const r = await pickAndUploadImage(token, [4, 3]); if (r) setPhoto({ mediaId: r.mediaId, uri: r.uri }); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!token) return;
    setBusy(true); setProblem(undefined);
    try {
      await api('/me/bike', { method: 'PUT', token, body: { name, modelYear: year.trim() ? Number(year) : null, ...(photo.mediaId !== undefined ? { photoMediaId: photo.mediaId } : {}), ...(model.id !== me.data?.bike?.bikeModelId ? { bikeModelId: model.id ?? null } : {}) } });
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
    <Screen
      footer={<Button label={busy ? 'Saving…' : 'Save bike'} disabled={busy || name.trim().length < 2} onPress={() => void save()} />}
      overlay={<Sheet open={picking} title="Choose a bike" onClose={() => setPicking(false)}><BikePicker onPick={pick} /></Sheet>}
    >
      <BackHeader title="Your bike" />
      <Text variant="label" tone="muted" style={{ marginBottom: space[4] }}>Shown to the members of your clubs, and no one else.</Text>
      <Card style={{ gap: space[5] }}>
        <BikeImage own={photo.uri} preset={model.preset} want={HERO_WIDTH} label={name.trim() || 'Your bike'} />
        <Button variant="accent" icon={BikeGlyph} label="Choose a bike" disabled={busy} onPress={() => setPicking(true)} />
        <Field onCard label="Bike name" value={name} onChangeText={setName} maxLength={60} placeholder="Himalayan 450" />
        <Field onCard label="Model year (optional)" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2024" />
        <Button variant="soft" icon={Camera} label={photo.uri ? 'Change my own photo' : 'Upload my own photo'} disabled={busy} onPress={() => void upload()} />
        {photo.uri ? <Button variant="soft" label="Remove my photo" disabled={busy} onPress={() => setPhoto({ mediaId: null, uri: null })} /> : null}
        {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      </Card>
      {me.data?.bike ? <View style={{ marginTop: space[4] }}><Button variant="danger" label="Remove my bike" disabled={busy} onPress={() => void remove()} /></View> : null}
    </Screen>
  );
}
