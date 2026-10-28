import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ImageIcon, LogOut, MessageSquare } from 'lucide-react-native';
import { decideRequest, leaveClub, postToClub, removeMember, removePost, requestJoin, respondToRide, setMemberRole, withdrawJoin } from '@/api/community';
import { ApiFailure, api } from '@/api/client';
import type { ClubMember, ClubPost } from '@/api/types';
import { forgetProfile, useClub, useClubPosts, useClubRequests } from '@/api/useApi';
import { ClubPostCard } from '@/features/community/ClubPostCard';
import { ConfirmSheet } from '@/features/community/ConfirmSheet';
import { JoinRequestCard } from '@/features/community/JoinRequestCard';
import { JoinSheet } from '@/features/community/JoinSheet';
import { MemberCard } from '@/features/community/MemberCard';
import { PostSheet } from '@/features/community/PostSheet';
import { TextSheet } from '@/features/community/TextSheet';
import { pickAndUploadImage } from '@/lib/uploadImage';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ClubCover } from '@/ui/ClubCover';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { media, radius, space } from '@/theme/tokens';

type Open = { kind: 'join' | 'post' | 'leave' } | { kind: 'reply' | 'removePost'; post: ClubPost } | { kind: 'manage' | 'removeMember'; member: ClubMember };

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const c = useClub(id);
  const role = c.data?.club.role ?? null;
  const posts = useClubPosts(id, role !== null);
  const requests = useClubRequests(id, role === 'admin');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [open, setOpen] = useState<Open>();
  const act = useAction();
  const close = () => { setOpen(undefined); act.clear(); };
  const refresh = () => { c.reload(); posts.reload(); requests.reload(); };
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
      <PostSheet open={open?.kind === 'post'} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(p) => void submit(() => postToClub(ref, p))} />
      <TextSheet open={open?.kind === 'reply'} title={`Reply to ${post?.authorName ?? ''}`} label="Your reply" submitLabel="Reply" max={1000} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(t) => void submit(() => postToClub(ref, { body: t, parentId: post!.id }))} />
      <ConfirmSheet open={open?.kind === 'removePost'} title="Remove this post?" body="The post and its replies disappear for everyone in the club." confirmLabel="Remove post" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => removePost(token!, post!.id))} />
      <ConfirmSheet open={open?.kind === 'leave'} title={`Leave ${club.name}?`} body="You will stop seeing its posts and members. You can ask to join again later." confirmLabel="Leave club" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => leaveClub(ref), () => router.replace('/clubs'))} />
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
            : !requests.data ? <Text variant="label" tone="muted">Loading…</Text>
            : requests.data.length === 0 ? <Text variant="label" tone="muted">No requests.</Text>
            : <View style={{ gap: space[3] }}>{requests.data.map((r) => <JoinRequestCard key={r.id} request={r} busy={act.busy} onDecide={(d) => void submit(() => decideRequest(ref, r.id, d))} />)}</View>}
          {requests.data?.length ? <Text variant="caption" tone="muted" style={{ marginTop: space[3] }}>Phone numbers are for deciding who joins. Please do not share them. They are deleted 7 days after you decide.</Text> : null}
        </>
      ) : null}

      {isMember ? (
        <>
          <SectionTitle onAdd={() => setOpen({ kind: 'post' })} addLabel="New post or ride plan">Posts and rides</SectionTitle>
          {posts.error && !posts.data ? (
            <Card style={{ gap: space[3] }}><Text variant="label" tone="stop">{posts.error}</Text><Button variant="soft" label="Try again" onPress={posts.reload} /></Card>
          ) : !posts.data ? <Text variant="label" tone="muted">Loading…</Text>
          : posts.data.length === 0 ? <EmptyState icon={MessageSquare} title="Nothing here yet" body="Post something, or plan the club’s next ride." />
          : (
            <View style={{ gap: space[3] }}>
              {posts.data.map((p) => (
                <ClubPostCard key={p.id} post={p} busy={act.busy} canRemove={p.mine || isAdmin}
                  onRespond={(r) => void submit(() => respondToRide(token!, p.id, r))}
                  onReply={() => setOpen({ kind: 'reply', post: p })} onRemove={() => setOpen({ kind: 'removePost', post: p })} />
              ))}
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
