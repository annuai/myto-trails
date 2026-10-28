import type { CommentTag } from './types';
import { api } from './client';
import { forgetComments, forgetProfile } from './useApi';

// Every club and comment action the app can take. Each one forgets what it made stale, so the screen that asked reloads fresh.
type Id = { token: string; clubId: string };

export async function createClub(token: string, b: { name: string; description: string; womenOnly: boolean }) {
  const r = await api<{ clubId: string }>('/clubs', { method: 'POST', token, body: b });
  forgetProfile();
  return r.clubId;
}
export async function requestJoin({ token, clubId }: Id, b: { phone: string; message: string }) {
  await api(`/clubs/${clubId}/join`, { method: 'POST', token, body: b });
  forgetProfile();
}
export async function withdrawJoin({ token, clubId }: Id) {
  await api(`/clubs/${clubId}/join`, { method: 'DELETE', token });
  forgetProfile();
}
export async function decideRequest({ token, clubId }: Id, requestId: string, decision: 'accept' | 'decline') {
  await api(`/clubs/${clubId}/requests/${requestId}`, { method: 'POST', token, body: { decision } });
  forgetProfile();
}
export async function leaveClub({ token, clubId }: Id) {
  await api(`/clubs/${clubId}/leave`, { method: 'POST', token });
  forgetProfile();
}
export async function removeMember({ token, clubId }: Id, handle: string) {
  await api(`/clubs/${clubId}/members/${handle}`, { method: 'DELETE', token });
  forgetProfile();
}
export async function setMemberRole({ token, clubId }: Id, handle: string, role: 'admin' | 'member') {
  await api(`/clubs/${clubId}/members/${handle}/role`, { method: 'PUT', token, body: { role } });
  forgetProfile();
}
/** A post, a reply (parentId) or a ride plan (rideAt as an ISO instant, with a place). */
export async function postToClub({ token, clubId }: Id, b: { body: string; parentId?: string; rideAt?: string; place?: string }) {
  await api(`/clubs/${clubId}/posts`, { method: 'POST', token, body: b });
  forgetProfile();
}
export async function respondToRide(token: string, postId: string, response: 'going' | 'maybe' | null) {
  await api(`/club-posts/${postId}/response`, { method: 'PUT', token, body: { response } });
  forgetProfile();
}
export async function removePost(token: string, postId: string) {
  await api(`/club-posts/${postId}`, { method: 'DELETE', token });
  forgetProfile();
}

/** Returns whether the comment is live or waits for a moderator (a rider's first comments do). */
export async function postComment(token: string, slug: string, b: { body: string; tag: CommentTag | null; parentId?: string }) {
  const r = await api<{ id: string; status: 'visible' | 'pending' }>(`/trails/${slug}/comments`, { method: 'POST', token, body: { body: b.body, tag: b.tag ?? undefined, parentId: b.parentId } });
  forgetComments(slug);
  return r.status;
}
export async function editComment(token: string, slug: string, id: string, body: string) {
  await api(`/comments/${id}`, { method: 'PATCH', token, body: { body } });
  forgetComments(slug);
}
export async function deleteComment(token: string, slug: string, id: string) {
  await api(`/comments/${id}`, { method: 'DELETE', token });
  forgetComments(slug);
}
export async function reportComment(token: string, id: string, reason: string) {
  await api(`/comments/${id}/reports`, { method: 'POST', token, body: { reason } });
}
