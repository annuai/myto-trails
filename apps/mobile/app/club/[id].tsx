import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/goBack';
import { Image as ImageIcon, LogOut, MessageSquare } from 'lucide-react-native';
import { decideRequest, leaveClub, postToClub, removeMember, removePost, requestJoin, respondToRide, setMemberRole, withdrawJoin } from '@/api/community';
import { ApiFailure, api } from '@/api/client';
import { createGroupRide, getClubGroupRide, joinGroupRide } from '@/api/groups';
import type { ClubMember, ClubPost, PostReaction } from '@/api/types';
import { olderPosts, reactToPost } from '@/api/photos';
import { createEvent } from '@/api/events';
import { forgetProfile, useClub, useClubPosts, useClubRequests, useEvents } from '@/api/useApi';
import { CreateEventSheet } from '@/features/event/CreateEventSheet';
import { EventsSection } from '@/features/event/EventsSection';
import { ClubPostCard } from '@/features/community/ClubPostCard';
import { nextWeek } from '@/lib/community';
import { ConfirmSheet } from '@/features/community/ConfirmSheet';
import { JoinRequestCard } from '@/features/community/JoinRequestCard';
import { JoinSheet } from '@/features/community/JoinSheet';
import { MemberCard } from '@/features/community/MemberCard';
import { PendingPosts } from '@/features/community/PendingPosts';
import { PhotoViewer } from '@/features/community/PhotoViewer';
import { PostSheet } from '@/features/community/PostSheet';
import { TextSheet } from '@/features/community/TextSheet';
import { queuePhotoPost } from '@/lib/queuePhotoPost';
import { withMyReaction } from '@/lib/reactions';
import { savedText, savePhotos } from '@/lib/savePhotos';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useCompanion } from '@/store/companion';
import { usePhotoOutbox } from '@/store/photoOutbox';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Skeleton } from '@/ui/Skeleton';
import { media, radius, space } from '@/theme/tokens';

type Open = { kind: 'join' | 'post' | 'leave' | 'event' } | { kind: 'reply' | 'removePost'; post: ClubPost } | { kind: 'manage' | 'removeMember'; member: ClubMember };

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const c = useClub(id);
  const role = c.data?.club.role ?? null;
  const posts = useClubPosts(id, role !== null);
  const requests = useClubRequests(id, role === 'admin');
  const events = useEvents('club', id);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [open, setOpen] = useState<Open>();
  const act = useAction();
  const user = useAuth((s) => s.user);
  /** A group ride one of the club's riders has on now, so the ride plans can offer to join it. */
  const [live, setLive] = useState<{ id: string; name: string; code: string } | null>(null);
  useEffect(() => {
    if (!token || role === null) return;
    let on = true;
    getClubGroupRide(token, id).then((r) => on && setLive(r.ride)).catch(() => undefined);
    return () => { on = false; };
  }, [token, id, role]);
  // Older posts, loaded a page at a time under the newest; reactions set a moment ago, shown before the site has answered; and the photo viewer.
  const [older, setOlder] = useState<{ posts: ClubPost[]; cursor: string | null } | undefined>();
  const [reacts, setReacts] = useState<Record<string, { counts: ClubPost['reactions']; mine: PostReaction | null }>>({});
  const [viewer, setViewer] = useState<{ photos: ClubPost['photos']; start: number } | null>(null);
  const [saveNote, setSaveNote] = useState<string>();
  const [moreBusy, setMoreBusy] = useState(false);
  const close = () => { setOpen(undefined); act.clear(); };
  const refresh = () => { c.reload(); posts.reload(); requests.reload(); events.reload(); setOlder(undefined); setReacts({}); };
  // A post of photos that finished sending shows up in the feed.
  const waiting = usePhotoOutbox((s) => s.items.filter((i) => i.clubId === id).length);
  const waitingBefore = useRef(waiting);
  useEffect(() => { if (waiting < waitingBefore.current) { c.reload(); posts.reload(); setOlder(undefined); setReacts({}); } waitingBefore.current = waiting; }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Runs a server action; on success the screen reloads and any open sheet closes. */
  const submit = async (fn: () => Promise<unknown>, then?: () => void) => {
    if (!token) return;
    if (await act.run(fn)) { refresh(); setOpen(undefined); then?.(); }
  };

  if (!c.data) {
    return <Screen><BackHeader title="Clubs" /><Text variant="body" tone={c.error ? 'stop' : 'muted'}>{c.error ?? 'Loading…'}</Text>{c.error ? <View style={{ marginTop: space[4] }}><Button variant="soft" label="Try again" onPress={c.reload} /></View> : null}</Screen>;
  }
  const { club, members } = c.data;
  const isAdmin = club.role === 'admin';
  const isMember = club.role !== null;
  const clubId = id;
  const ref = { token: token!, clubId };
  const pending = requests.data?.filter((r) => r.status === 'pending') ?? [];
  const startGroup = async () => {
    if (!token) return;
    const r = await act.run(() => createGroupRide(token, { name: `${club.name} ride`, clubId }));
    if (r) { useCompanion.getState().setGroup({ id: r.value.id, code: r.value.code, name: r.value.name, role: 'leader' }); setLive({ id: r.value.id, name: r.value.name, code: r.value.code }); router.push('/ride'); }
  };
  const joinGroup = async () => {
    if (!token || !live) return;
    const r = await act.run(() => joinGroupRide(token, { code: live.code, displayName: user?.displayName ?? 'Rider' }));
    if (r) { useCompanion.getState().setGroup({ id: r.value.id, code: live.code, name: r.value.name, role: r.value.role }); router.push('/ride'); }
  };

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

  const post = open && 'post' in open ? open.post : undefined;
  const member = open && 'member' in open ? open.member : undefined;
  const overlay = (
    <>
      <JoinSheet open={open?.kind === 'join'} clubName={club.name} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(b) => void submit(() => requestJoin(ref, b))} />
      <CreateEventSheet open={open?.kind === 'event'} clubId={clubId} clubName={club.name} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(b) => void submit(async () => { const r = await createEvent(token!, b); router.push(`/event/${r.id}`); })} />
      <PostSheet open={open?.kind === 'post'} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(p) => void submit(() => (p.photos?.length ? queuePhotoPost({ clubId, body: p.body, uris: p.photos }) : postToClub(ref, { body: p.body, rideAt: p.rideAt, place: p.place })))} />
      <PhotoViewer photos={viewer?.photos ?? []} start={viewer?.start ?? null} note={saveNote} onClose={() => { setViewer(null); setSaveNote(undefined); }}
        onSave={(p) => void savePhotos([p.fullUrl]).then((r) => setSaveNote(r.problem ?? savedText(r.saved)))}
        onSaveAll={() => void savePhotos((viewer?.photos ?? []).map((p) => p.fullUrl)).then((r) => setSaveNote(r.problem ?? savedText(r.saved)))} />
      <TextSheet open={open?.kind === 'reply'} title={`Reply to ${post?.authorName ?? ''}`} label="Your reply" submitLabel="Reply" max={1000} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(t) => void submit(() => postToClub(ref, { body: t, parentId: post!.id }))} />
      <ConfirmSheet open={open?.kind === 'removePost'} title="Remove this post?" body="The post and its replies disappear for everyone in the club." confirmLabel="Remove post" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => removePost(token!, post!.id))} />
      <ConfirmSheet open={open?.kind === 'leave'} title={`Leave ${club.name}?`} body="You will stop seeing its posts and members. You can ask to join again later." confirmLabel="Leave club" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => leaveClub(ref), () => goBack(router, '/clubs'))} />
      <ConfirmSheet open={open?.kind === 'removeMember'} title={`Remove ${member?.name ?? ''}?`} body="They lose access to the club’s posts and members. They can ask to join again." confirmLabel="Remove from club" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => removeMember(ref, member!.handle))} />
      <Sheet open={open?.kind === 'manage'} title={member?.name ?? ''} onClose={close}>
        {member ? (
          <>
            <Button variant="soft" label={act.busy ? 'Working…' : member.role === 'admin' ? 'Make member' : 'Make admin'} disabled={act.busy}
              onPress={() => void submit(() => setMemberRole(ref, member.handle, member.role === 'admin' ? 'member' : 'admin'))} />
            <Button variant="danger" label="Remove from club" disabled={act.busy} onPress={() => setOpen({ kind: 'removeMember', member })} />
            {act.problem ? <Text variant="label" tone="stop">{act.problem}</Text> : null}
          </>
        ) : null}
      </Sheet>
    </>
  );

  return (
    <Screen overlay={overlay}>
      <BackHeader title="Clubs" />
      <View style={{ borderRadius: radius.card, overflow: 'hidden' }}><ClubCover name={club.name} url={club.coverUrl} height={media.coverHero} /></View>
      <View style={{ marginTop: space[4], gap: space[2] }}>
        <Text variant="title">{club.name}</Text>
        <Text variant="label" tone="muted">{club.memberCount} {club.memberCount === 1 ? 'member' : 'members'}{club.womenOnly ? ' · Women only' : ''}</Text>
        {club.description ? <Text variant="body">{club.description}</Text> : null}
      </View>
      {!open && act.problem && isMember ? <Text variant="label" tone="stop" accessibilityLiveRegion="polite" style={{ marginTop: space[4] }}>{act.problem}</Text> : null}
      {isAdmin ? (
        <View style={{ marginTop: space[4], gap: space[3] }}>
          <Button variant="soft" icon={ImageIcon} label={busy ? 'Working…' : 'Change cover image'} disabled={busy} onPress={() => void change()} />
          {club.coverUrl ? <Button variant="soft" label="Remove cover image" disabled={busy} onPress={() => void setCover(null)} /> : null}
          {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
        </View>
      ) : null}

      {!isMember ? (
        <Card style={{ marginTop: space[6], gap: space[4] }}>
          {club.requested ? (
            <>
              <Text variant="bodyMedium">Your request is waiting for the club’s admins.</Text>
              <Button variant="soft" label={act.busy ? 'Working…' : 'Withdraw request and delete my number'} disabled={act.busy} onPress={() => void submit(() => withdrawJoin(ref))} />
              {act.problem ? <Text variant="label" tone="stop">{act.problem}</Text> : null}
            </>
          ) : (
            <>
              <Text variant="label" tone="muted">Posts, ride plans and members are visible to the club’s members. Ask to join; an admin will decide.</Text>
              <Button label="Ask to join" onPress={() => setOpen({ kind: 'join' })} />
            </>
          )}
        </Card>
      ) : null}

      {isAdmin ? (
        <>
          <SectionTitle>{pending.length ? `Join requests (${pending.length})` : 'Join requests'}</SectionTitle>
          {requests.error && !requests.data ? <Text variant="label" tone="stop">{requests.error}</Text>
            : !requests.data ? <Skeleton rows={2} />
            : requests.data.length === 0 ? <Text variant="label" tone="muted">No requests.</Text>
            : <View style={{ gap: space[3] }}>{requests.data.map((r) => <JoinRequestCard key={r.id} request={r} busy={act.busy} onDecide={(d) => void submit(() => decideRequest(ref, r.id, d))} />)}</View>}
          {requests.data?.length ? <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>Phone numbers are for deciding who joins. Please do not share them. They are deleted 7 days after you decide.</Text> : null}
        </>
      ) : null}

      <EventsSection title="Rides" events={events} empty={isMember ? 'No rides planned. Admins can host one with the + button.' : 'No open rides planned. Members can see the club’s own rides.'} onAdd={isAdmin ? () => setOpen({ kind: 'event' }) : undefined} addLabel="Host a club ride" />

      {isMember ? (
        <>
          <SectionTitle onAdd={() => setOpen({ kind: 'post' })} addLabel="New post or ride plan">Posts and rides</SectionTitle>
          <PendingPosts clubId={clubId} />
          {posts.error && !posts.data ? (
            <Card style={{ gap: space[3] }}><Text variant="label" tone="stop">{posts.error}</Text><Button variant="soft" label="Try again" onPress={posts.reload} /></Card>
          ) : !posts.data ? <Skeleton />
          : posts.data.posts.length === 0 && waiting === 0 ? <EmptyState icon={MessageSquare} title="Quiet in here" body="Be the first to post, or plan the club’s next ride." />
          : (
            <View style={{ gap: space[3] }}>
              {[...posts.data.posts, ...(older?.posts ?? [])].map((shown) => {
                const p = reacts[shown.id] ? { ...shown, reactions: reacts[shown.id]!.counts, myReaction: reacts[shown.id]!.mine } : shown;
                return (
                <ClubPostCard key={p.id} post={p} busy={act.busy} canRemove={p.mine || isAdmin}
                  onOpenPhoto={(start) => setViewer({ photos: p.photos, start })}
                  onReact={(next) => {
                    if (!token) return;
                    setReacts((r) => ({ ...r, [p.id]: { counts: withMyReaction(p.reactions, p.myReaction, next), mine: next } }));
                    reactToPost(token, p.id, next).then((r2) => setReacts((r) => ({ ...r, [p.id]: { counts: r2.reactions, mine: r2.myReaction } }))).catch(() => setReacts((r) => { const { [p.id]: _gone, ...rest } = r; return rest; }));
                  }}
                  group={live ? { label: 'Join the group ride', onPress: () => void joinGroup() } : p.mine || isAdmin ? { label: 'Start a group ride', onPress: () => void startGroup() } : undefined}
                  onRespond={(r) => void submit(() => respondToRide(token!, p.id, r))}
                  onReply={() => setOpen({ kind: 'reply', post: p })} onRemove={() => setOpen({ kind: 'removePost', post: p })}
                  onRepeat={p.kind === 'ride_plan' && p.at && (p.mine || isAdmin) ? () => void submit(() => postToClub(ref, { body: p.body, ...(p.place ? { place: p.place } : {}), rideAt: nextWeek(p.at!) })) : undefined} />
                );
              })}
              {(older ? older.cursor : posts.data.nextCursor) ? (
                <Button variant="soft" label={moreBusy ? 'Loading…' : 'Show older posts'} disabled={moreBusy}
                  onPress={() => {
                    const cursor = older ? older.cursor : posts.data?.nextCursor;
                    if (!token || !cursor) return;
                    setMoreBusy(true);
                    olderPosts(token, id, cursor).then((page) => setOlder((o) => ({ posts: [...(o?.posts ?? []), ...page.posts], cursor: page.nextCursor }))).catch(() => undefined).finally(() => setMoreBusy(false));
                  }} />
              ) : null}
            </View>
          )}
        </>
      ) : null}

      {members ? (
        <>
          <SectionTitle>Members</SectionTitle>
          <View style={{ gap: space[3] }}>
            {members.map((m) => <MemberCard key={m.handle} member={m} onManage={isAdmin && m.handle !== club.myHandle ? () => setOpen({ kind: 'manage', member: m }) : undefined} />)}
          </View>
          <View style={{ marginTop: space[6] }}><Button variant="soft" icon={LogOut} label="Leave club" onPress={() => setOpen({ kind: 'leave' })} /></View>
        </>
      ) : null}
    </Screen>
  );
}
