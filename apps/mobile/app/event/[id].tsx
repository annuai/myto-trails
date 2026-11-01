import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, ImageIcon, MapPin, Users } from 'lucide-react-native';
import { cancelEvent, checkInEvent, joinEventRide, markArrived, respondToEvent, setEventCover, setEventRole, startEvent } from '@/api/events';
import { ApiFailure } from '@/api/client';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { ClubCover } from '@/ui/ClubCover';
import type { DeclineReason, EventRole } from '@/api/types';
import { useEvent } from '@/api/useApi';
import { ConfirmSheet } from '@/features/community/ConfirmSheet';
import { DeclineSheet } from '@/features/event/DeclineSheet';
import { RosterSheet } from '@/features/event/RosterSheet';
import { RESPONSE_LABEL } from '@/features/event/labels';
import { canCheckIn, primaryAction } from '@/lib/eventCore';
import { formatRideWhen } from '@/lib/community';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { useLocation } from '@/store/location';
import { Button } from '@/ui/Button';
import { ChoiceChip, StatusChip } from '@/ui/Chip';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { media, radius, space } from '@/theme/tokens';

const HOUR_MS = 3_600_000;
/** How often the page re-reads the clock, so "start the ride" and check-in appear while it stays open. */
const TICK_MS = 30_000;
type Open = 'decline' | 'roster' | 'cancel';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const e = useEvent(id);
  const act = useAction();
  const [open, setOpen] = useState<Open>();
  const fix = useLocation((s) => s.fix);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), TICK_MS); return () => clearInterval(t); }, []);
  const ev = e.data;
  // The phone only needs a position while a rider could be checking in.
  const watching = !!ev && ev.status !== 'cancelled' && ev.status !== 'ended' && ev.myResponse !== 'declined' && ev.myResponse !== 'waitlisted' && !ev.checkedIn;
  useEffect(() => (watching ? useLocation.getState().acquire() : undefined), [watching]);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoProblem, setPhotoProblem] = useState<string>();
  /** Picks and uploads a photo, or removes the event's own one with `remove`; the page then reloads with the new cover. */
  const changeCover = async (remove = false) => {
    if (!token) return;
    setPhotoBusy(true); setPhotoProblem(undefined);
    try {
      if (remove) await setEventCover(token, id, null);
      else { const r = await pickAndUploadImage(token, [16, 9]); if (!r) return; await setEventCover(token, id, r.mediaId); }
      e.reload();
    } catch (err) { setPhotoProblem(err instanceof ApiFailure ? err.message : 'The photo could not be changed.'); }
    finally { setPhotoBusy(false); }
  };
  const close = () => { setOpen(undefined); act.clear(); };
  /** Runs a server action; on success the page reloads and any open sheet closes. */
  const submit = async (fn: () => Promise<unknown>, then?: () => void) => {
    if (!token) return;
    if (await act.run(fn)) { e.reload(); setOpen(undefined); then?.(); }
  };

  if (!ev) {
    return <Screen><BackHeader title="Event" /><Text variant="body" tone={e.error ? 'stop' : 'muted'}>{e.error ?? 'Loading…'}</Text>{e.error ? <View style={{ marginTop: space[4] }}><Button variant="soft" label="Try again" onPress={e.reload} /></View> : null}</Screen>;
  }

  const here = fix ? { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracy ?? Infinity } : null;
  const near = canCheckIn(ev, here, now);
  const action = primaryAction(ev, near === 'yes');
  const over = ev.status === 'cancelled' || ev.status === 'ended';
  const canStart = ev.mine && ev.status === 'scheduled' && Date.parse(ev.startsAt) - now <= HOUR_MS;
  const hostName = ev.mine ? 'you' : ev.hostName;
  const reply = (response: 'going' | 'maybe') => void submit(() => respondToEvent(token!, id, { response }));
  const decline = (b: { reason?: DeclineReason; note?: string }) => void submit(() => respondToEvent(token!, id, { response: 'declined', ...b }));
  const checkIn = () => {
    if (!here) return;
    void submit(async () => {
      const r = await checkInEvent(token!, id, here);
      if (r.rideLive) await join();
    });
  };
  const join = async () => {
    const r = await joinEventRide(token!, id);
    useCompanion.getState().setGroup({ id: r.id, code: r.code, name: r.name, role: r.role });
    router.push('/ride');
  };

  const overlay = (
    <>
      <DeclineSheet open={open === 'decline'} hostName={ev.hostName} busy={act.busy} problem={act.problem} onClose={close} onSubmit={decline} />
      {ev.roster ? (
        <RosterSheet open={open === 'roster'} roster={ev.roster} busy={act.busy} problem={act.problem} onClose={close}
          onRole={(rid, role: EventRole | null) => void submit(() => setEventRole(token!, id, rid, role), () => setOpen('roster'))}
          onArrived={(rid) => void submit(() => markArrived(token!, id, rid), () => setOpen('roster'))} />
      ) : null}
      <ConfirmSheet open={open === 'cancel'} title="Cancel this event?" body="Riders who answered will see that it is cancelled. This cannot be undone." confirmLabel="Cancel event" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => cancelEvent(token!, id))} />
    </>
  );

  return (
    <Screen overlay={overlay}>
      <BackHeader title="Event" />
      <View style={{ borderRadius: radius.card, overflow: 'hidden', marginBottom: space[4] }}><ClubCover name={ev.title} url={ev.coverUrl} height={media.coverHero} /></View>
      <View style={{ gap: space[2] }}>
        <Text variant="title">{ev.title}</Text>
        <Text variant="label" tone="muted">{ev.clubName ? `${ev.clubName} · hosted by ${hostName}` : `Hosted by ${hostName}`}{ev.audience === 'members' ? ' · Members only' : ''}</Text>
        {ev.status === 'cancelled' ? <StatusChip status="stop" label="Cancelled" /> : ev.status === 'live' ? <StatusChip status="good" label="Riding now" /> : ev.status === 'ended' ? <StatusChip status="unknown" label="Over" /> : null}
      </View>

      <View style={{ marginTop: space[5] }}>
        <ListCard>
          <Row icon={CalendarClock} label={formatRideWhen(ev.startsAt)} chevron={false} />
          <Row icon={MapPin} label={ev.placeName} sub={`Check in within ${ev.radiusM} m of the meeting point`} chevron={false} />
          <Row icon={Users} label={ev.capacity ? `${ev.going} of ${ev.capacity} going` : `${ev.going} going`} sub={[ev.maybe ? `${ev.maybe} maybe` : '', ev.waitlisted ? `${ev.waitlisted} waiting` : ''].filter(Boolean).join(' · ') || undefined} chevron={false} />
        </ListCard>
      </View>
      {ev.description ? <Text variant="body" style={{ marginTop: space[5] }}>{ev.description}</Text> : null}

      {!over ? (
        <View style={{ marginTop: space[6], gap: space[3] }}>
          {action === 'join_ride' ? <Button label={act.busy ? 'Joining…' : 'Join the ride'} disabled={act.busy} onPress={() => void submit(join)} />
            : action === 'check_in' ? <Button icon={MapPin} label={act.busy ? 'Checking in…' : 'I’m here, check in'} disabled={act.busy} onPress={checkIn} />
            : action === 'going' ? <Button label={act.busy ? 'Saving…' : 'I’m going'} disabled={act.busy} onPress={() => reply('going')} /> : null}

          {!ev.mine && ev.myResponse === null ? (
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <View style={{ flex: 1 }}><Button variant="soft" label="Maybe" disabled={act.busy} onPress={() => reply('maybe')} /></View>
              <View style={{ flex: 1 }}><Button variant="soft" label="Can’t make it" disabled={act.busy} onPress={() => setOpen('decline')} /></View>
            </View>
          ) : null}
          {!ev.mine && ev.myResponse !== null ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {ev.myResponse === 'waitlisted' ? <ChoiceChip label={RESPONSE_LABEL.waitlisted} selected /> : <ChoiceChip label={RESPONSE_LABEL.going} selected={ev.myResponse === 'going'} onPress={() => reply('going')} />}
              <ChoiceChip label={RESPONSE_LABEL.maybe} selected={ev.myResponse === 'maybe'} onPress={() => reply('maybe')} />
              <ChoiceChip label={RESPONSE_LABEL.declined} selected={ev.myResponse === 'declined'} onPress={() => setOpen('decline')} />
            </View>
          ) : null}
          {ev.myResponse === 'waitlisted' ? <Text variant="label" tone="muted">The event is full. You move up when someone drops out.</Text> : null}
          {ev.checkedIn && !ev.rideLive ? <Text variant="label" tone="muted">You’re checked in. The host starts the ride when everyone is here.</Text> : null}
          {!ev.checkedIn && ev.myResponse === 'going' && action === 'none' ? (
            <Text variant="label" tone="muted">{near === 'early' ? 'Check-in opens an hour before the start.' : near === 'no_fix' ? 'Finding your location. Check-in appears when you reach the meeting point.' : `Check-in appears when you reach ${ev.placeName}.`}</Text>
          ) : null}
          {act.problem && !open ? <Text variant="label" tone="stop" accessibilityLiveRegion="polite">{act.problem}</Text> : null}
        </View>
      ) : null}

      {ev.mine && !over ? (
        <>
          <SectionTitle>Host</SectionTitle>
          <View style={{ gap: space[3] }}>
            {canStart ? <Button label={act.busy ? 'Starting…' : 'Start the ride'} disabled={act.busy} onPress={() => void submit(() => startEvent(token!, id))} />
              : ev.status === 'scheduled' ? <Text variant="label" tone="muted">You can start the ride from an hour before the start. Riders who check in then join it.</Text> : null}
            <Button variant="soft" label={`Riders (${ev.roster?.length ?? 0})`} onPress={() => setOpen('roster')} />
            <Button variant="soft" icon={ImageIcon} label={photoBusy ? 'Working…' : 'Change cover photo'} disabled={photoBusy} onPress={() => void changeCover()} />
            {ev.coverUrl ? <Button variant="soft" label="Remove cover photo" disabled={photoBusy} onPress={() => void changeCover(true)} /> : null}
            {photoProblem ? <Text variant="label" tone="stop">{photoProblem}</Text> : null}
            {ev.status === 'scheduled' ? <Button variant="soft" label="Cancel event" onPress={() => setOpen('cancel')} /> : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
