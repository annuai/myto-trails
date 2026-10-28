import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquarePlus } from 'lucide-react-native';
import { deleteComment, editComment, postComment, reportComment } from '@/api/community';
import type { CommentTag, TrailComment } from '@/api/types';
import { useTrailComments } from '@/api/useApi';
import { canEditComment, formatPosted, hasLink, TAG_LABEL } from '@/lib/community';
import { useAction } from '@/lib/useAction';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { SectionTitle } from '@/ui/Header';
import { Sheet } from '@/ui/Sheet';
import { ChoiceChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { ConfirmSheet } from './ConfirmSheet';
import { TextSheet } from './TextSheet';

type Target = { kind: 'new' } | { kind: 'reply' | 'edit' | 'report' | 'delete'; comment: TrailComment };

/** What a rider can do on one comment. Edit lasts ten minutes, as on the website. */
function Actions({ c, isReply, signedIn, onReply, onEdit, onDelete, onReport }: {
  c: TrailComment; isReply: boolean; signedIn: boolean; onReply: () => void; onEdit: () => void; onDelete: () => void; onReport: () => void;
}) {
  const link = (label: string, onPress: () => void, muted?: boolean) => (
    <Text variant="labelMedium" tone={muted ? 'muted' : 'accent'} accessibilityRole="button" onPress={onPress} style={{ paddingVertical: space[3] }}>{label}</Text>
  );
  return (
    <View style={{ flexDirection: 'row', gap: space[5], flexWrap: 'wrap' }}>
      {!isReply && signedIn && !c.pending ? link('Reply', onReply) : null}
      {c.mine && canEditComment(c.createdAt) ? link('Edit', onEdit) : null}
      {c.mine ? link('Delete', onDelete, true) : signedIn ? link('Report', onReport, true) : null}
    </View>
  );
}

function CommentView({ c: comment, isReply, ...actions }: { c: TrailComment; isReply: boolean; signedIn: boolean; onReply: () => void; onEdit: () => void; onDelete: () => void; onReport: () => void }) {
  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[1] }}>
        <Text variant="bodyMedium">{comment.authorName}</Text>
        <Text variant="caption" tone="muted">{formatPosted(comment.createdAt)}{comment.editedAt ? ' · edited' : ''}</Text>
        {comment.tag ? <Text variant="caption" tone="accent">{TAG_LABEL[comment.tag]}</Text> : null}
      </View>
      {comment.pending ? <Text variant="caption" tone="caution">Waiting for a moderator. Only you can see this for now.</Text> : null}
      <Text variant="body">{comment.body}</Text>
      <Actions c={comment} isReply={isReply} {...actions} />
    </View>
  );
}

/** Compose a comment: text, and an optional condition tag. */
function CommentSheet({ open, busy, problem, onSubmit, onClose }: { open: boolean; busy: boolean; problem?: string; onSubmit: (b: { body: string; tag: CommentTag | null }) => void; onClose: () => void }) {
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<CommentTag | null>(null);
  useEffect(() => { if (open) { setBody(''); setTag(null); } }, [open]);
  const t = body.trim();
  return (
    <Sheet open={open} title="Add a comment" onClose={onClose} footer={<Button label={busy ? 'Posting…' : 'Post comment'} disabled={busy || t.length < 2 || hasLink(t)} onPress={() => onSubmit({ body: t, tag })} />}>
      <Field label="Comment" value={body} onChangeText={setBody} multiline autoFocus maxLength={1500} error={hasLink(t) ? 'Please leave web addresses out.' : undefined}
        hint="Be kind: abusive comments are removed." />
      <View style={{ gap: space[2] }}>
        <Text variant="labelMedium">Is it a condition report? (optional)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {(Object.keys(TAG_LABEL) as CommentTag[]).map((k) => <ChoiceChip key={k} label={TAG_LABEL[k]} selected={tag === k} onPress={() => setTag(tag === k ? null : k)} />)}
        </View>
      </View>
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}

/** Riders' own experience of a trail: conditions, gates, water levels and tips. The sheets render through `overlay`. */
export function useTrailCommentsSection(slug: string) {
  const router = useRouter();
  const { c } = useTheme();
  const token = useAuth((s) => s.token);
  const list = useTrailComments(slug);
  const act = useAction();
  const [target, setTarget] = useState<Target>();
  const [notice, setNotice] = useState<string>();
  const close = () => { setTarget(undefined); act.clear(); };
  const total = (list.data ?? []).reduce((n, x) => n + 1 + x.replies.length, 0);
  const signedIn = !!token;

  const submit = async (fn: () => Promise<unknown>, after?: (v: unknown) => void) => {
    const r = await act.run(fn);
    if (!r) return;
    list.reload(); setTarget(undefined); after?.(r.value);
  };

  const body = (
    <>
      <SectionTitle onAdd={signedIn ? () => setTarget({ kind: 'new' }) : undefined} addLabel="Add a comment">{total ? `Comments (${total})` : 'Comments'}</SectionTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: space[3] }}>Riders’ own experience: conditions, gates, water levels, tips. Comments are not permission to ride; check the access information above.</Text>
      {notice ? <Card style={{ marginBottom: space[3] }}><Text variant="label" tone="muted">{notice}</Text></Card> : null}
      {!signedIn ? <Button variant="soft" icon={MessageSquarePlus} label="Sign in to comment" onPress={() => router.push('/you')} /> : null}
      {list.error && !list.data ? (
        <Card style={{ gap: space[3] }}><Text variant="label" tone="stop">{list.error}</Text><Button variant="soft" label="Try again" onPress={list.reload} /></Card>
      ) : !list.data ? (
        <Text variant="label" tone="muted">Loading comments…</Text>
      ) : list.data.length === 0 ? (
        <EmptyState icon={MessageSquarePlus} title="No comments yet" body="Ridden it recently? Tell other riders how it was." />
      ) : (
        <View style={{ gap: space[3], marginTop: signedIn ? 0 : space[3] }}>
          {list.data.map((root) => {
            const handlers = (x: TrailComment) => ({ signedIn, onReply: () => setTarget({ kind: 'reply', comment: root }), onEdit: () => setTarget({ kind: 'edit', comment: x }), onDelete: () => setTarget({ kind: 'delete', comment: x }), onReport: () => setTarget({ kind: 'report', comment: x }) });
            return (
              <Card key={root.id} style={{ gap: space[3] }}>
                <CommentView c={root} isReply={false} {...handlers(root)} />
                {root.replies.length ? (
                  <View style={{ gap: space[4], borderLeftWidth: 2, borderLeftColor: c.line, paddingLeft: space[4] }}>
                    {root.replies.map((r) => <CommentView key={r.id} c={r} isReply {...handlers(r)} />)}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </>
  );

  const comment = target && target.kind !== 'new' ? target.comment : undefined;
  const overlay = (
    <>
      <CommentSheet open={target?.kind === 'new'} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(b) => void submit(() => postComment(token!, slug, b), (status) => setNotice(status === 'pending' ? 'Thanks. A moderator reads a new rider’s first comments before they appear. You can see yours; others will once it is approved.' : undefined))} />
      <TextSheet open={target?.kind === 'reply'} title={`Reply to ${comment?.authorName ?? ''}`} label="Your reply" submitLabel="Reply" min={2} max={1500} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(t) => void submit(() => postComment(token!, slug, { body: t, tag: null, parentId: comment!.id }))} />
      <TextSheet open={target?.kind === 'edit'} title="Edit your comment" label="Comment" initial={comment?.body} submitLabel="Save" min={2} max={1500} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(t) => void submit(() => editComment(token!, slug, comment!.id, t))} />
      <TextSheet open={target?.kind === 'report'} title="Report this comment" label="What is the problem?" submitLabel="Send report" min={5} max={500} noLinks={false} busy={act.busy} problem={act.problem} onClose={close}
        onSubmit={(t) => void submit(() => reportComment(token!, comment!.id, t), () => setNotice('Thank you. The moderators will look at it.'))} />
      <ConfirmSheet open={target?.kind === 'delete'} title="Delete this comment?" body="It will be removed for everyone, replies included." confirmLabel="Delete comment" busy={act.busy} problem={act.problem} onClose={close}
        onConfirm={() => void submit(() => deleteComment(token!, slug, comment!.id))} />
    </>
  );
  return { body, overlay };
}
