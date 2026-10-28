import { useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BellRing, Share2, X } from 'lucide-react-native';
import { arriveCheckin, createCheckin, extendCheckin } from '@/api/checkins';
import { checkinStatus } from '@/lib/checkinCore';
import { clockLabel } from '@/lib/community';
import { defaultArrivalMinutes, nextOccurrence } from '@/lib/checkinTime';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { useLocation } from '@/store/location';
import { useProfile } from '@/store/profile';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TimeStepper } from '@/ui/TimeStepper';
import { space } from '@/theme/tokens';

const minutesOf = (t: number) => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
const shareLink = (name: string, expectedAt: number, url: string) =>
  Share.share({ message: `${name} is on a ride and expects to be back by ${clockLabel(minutesOf(expectedAt))}. If they have not arrived, this page shows where they were last seen: ${url}` });

/**
 * "I haven't arrived": pick who to tell and when to be back. The server watches the clock, so it works even if the phone dies.
 * The rider shares the link themselves (WhatsApp, SMS, anything): the contact needs no app.
 */
export function CheckinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const checkin = useCompanion((s) => s.checkin);
  const { contacts, medical, vehicle, licence } = useProfile();
  const fix = useLocation((s) => s.fix);
  const [contactId, setContactId] = useState(() => contacts.find((c) => c.primary)?.id ?? contacts[0]?.id);
  const [minutes, setMinutes] = useState(() => defaultArrivalMinutes(new Date()));
  const [email, setEmail] = useState('');
  const [live, setLive] = useState(false);
  const { busy, problem, run } = useAction();
  const contact = contacts.find((c) => c.id === contactId);
  const riderName = licence?.holder || user?.displayName;

  const create = async () => {
    if (!token || !contact) return;
    const expectedAt = nextOccurrence(new Date(), minutes);
    const r = await run(() => createCheckin(token, {
      expectedAt: new Date(expectedAt).toISOString(), contactName: contact.name, shareLive: live,
      ...(email.trim() ? { contactEmail: email.trim() } : {}),
      ...(fix ? { position: { lat: fix.lat, lng: fix.lng, at: new Date().toISOString() } } : {}),
      emergency: { ...(riderName ? { riderName } : {}), ...(medical.bloodGroup ? { bloodGroup: medical.bloodGroup } : {}), ...(medical.notes ? { allergies: medical.notes } : {}), ...(vehicle?.model ? { bikeName: vehicle.model } : {}) },
    }));
    if (!r) return;
    useCompanion.getState().setCheckin({ id: r.value.id, expectedAt, contactName: contact.name, url: r.value.url });
    await shareLink(riderName ?? 'A rider', expectedAt, r.value.url).catch(() => undefined);
  };
  const extend = async (ms: number) => {
    if (!token || !checkin) return;
    const expectedAt = Math.max(checkin.expectedAt, Date.now()) + ms;
    if ((await run(() => extendCheckin(token, checkin.id, new Date(expectedAt).toISOString())))) useCompanion.getState().setCheckin({ ...checkin, expectedAt });
  };
  const cancel = async () => {
    if (!token || !checkin) return;
    if ((await run(() => arriveCheckin(token, checkin.id)))) { useCompanion.getState().setCheckin(null); onClose(); }
  };

  return (
    <Sheet open={open} title="I haven't arrived" onClose={onClose}>
      {!token ? (
        <>
          <Text variant="label" tone="muted">Sign in so Myto Moto can tell someone when you have not arrived. Nobody is told anything until you set a time.</Text>
          <Button label="Sign in" onPress={() => { onClose(); router.push('/auth'); }} />
        </>
      ) : checkin ? (
        <>
          <Text variant="label" tone="muted">
            {checkinStatus(Date.now(), checkin.expectedAt) === 'overdue' ? `${checkin.contactName} can see you are overdue.` : `${checkin.contactName} will be able to see where you were last seen if you are not back by ${clockLabel(minutesOf(checkin.expectedAt))}.`}
          </Text>
          <Button icon={Share2} label="Share the link again" onPress={() => void shareLink(riderName ?? 'A rider', checkin.expectedAt, checkin.url)} />
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <ChoiceChip label="+30 min" onPress={() => void extend(30 * 60_000)} />
            <ChoiceChip label="+1 hour" onPress={() => void extend(60 * 60_000)} />
            <ChoiceChip label="+2 hours" onPress={() => void extend(120 * 60_000)} />
          </View>
          <Button variant="soft" icon={X} label="I'm safe, cancel it" onPress={() => void cancel()} />
        </>
      ) : contacts.length === 0 ? (
        <>
          <Text variant="label" tone="muted">Add someone to tell first.</Text>
          <Button label="Add an emergency contact" onPress={() => { onClose(); router.push('/documents/contacts'); }} />
        </>
      ) : (
        <>
          <Text variant="label" tone="muted">If you have not ended your ride by this time, the person you choose can see where you were last seen. Your position stays private until then.</Text>
          <Text variant="labelMedium">Tell</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {contacts.map((c) => <ChoiceChip key={c.id} label={c.name} selected={c.id === contactId} onPress={() => setContactId(c.id)} />)}
          </View>
          <Text variant="labelMedium">Be back by</Text>
          <TimeStepper label="Be back by" value={minutes} onChange={setMinutes} />
          <Field label="Their email (optional)" hint="They get an email too if you are overdue." value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <ChoiceChip icon={BellRing} label="Share my live position" selected={live} onPress={() => setLive(!live)} />
          </View>
          <Button label="Start check-in and share link" disabled={busy || !contact} onPress={() => void create()} />
        </>
      )}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}
