import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import type { AlbumPhoto, ClubFeed, PostReaction } from './types';
import { ApiFailure, api } from './client';
import { SITE_BASE } from './config';
import { forgetProfile } from './useApi';
import { PHOTO_KINDS, type PhotoSize } from '@/lib/photoSizes';

type Target = { url: string; method: 'PUT'; headers: Record<string, string> };
export type PhotoIntent = { assetId: string; uploads: Record<PhotoSize, Target> };

/** Step one: say how big each copy is, and get an address for each to send to. */
export async function requestUploads(token: string, clubId: string, sizes: Record<PhotoSize, number>[]): Promise<PhotoIntent[]> {
  return (await api<{ photos: PhotoIntent[] }>(`/clubs/${clubId}/photo-uploads`, { method: 'POST', token, body: { photos: sizes } })).photos;
}

/** Sends one copy straight from disk to the address, with the native uploader (a fetch with a Blob sends a different length on iOS than the one signed). */
export async function sendCopy(target: Target, uri: string): Promise<void> {
  // The development file store hands out a path on the website; the production store hands out a full address.
  const url = target.url.startsWith('/') ? `${SITE_BASE}${target.url}` : target.url;
  const { 'Content-Length': _length, ...headers } = target.headers;
  const put = await uploadAsync(url, uri, { httpMethod: 'PUT', uploadType: FileSystemUploadType.BINARY_CONTENT, headers }).catch(() => { throw new ApiFailure(0, 'network', 'Cannot reach the file store. Check your connection.'); });
  if (put.status < 200 || put.status > 299) throw new ApiFailure(put.status, 'upload_failed', `A photo could not be sent (${put.status}).`);
}

/** Step two: the copies are sent; write the post. */
export async function postPhotos(token: string, clubId: string, b: { body: string; assetIds: string[]; eventId?: string }): Promise<string> {
  const r = await api<{ postId: string }>(`/clubs/${clubId}/photo-posts`, { method: 'POST', token, body: { body: b.body, photos: b.assetIds, ...(b.eventId ? { eventId: b.eventId } : {}) } });
  forgetProfile();
  return r.postId;
}

export const PHOTO_COPY_KINDS = PHOTO_KINDS;

/** One reaction per person: a new one replaces the old, null takes it back. */
export async function reactToPost(token: string, postId: string, reaction: PostReaction | null) {
  const r = await api<{ reactions: Partial<Record<PostReaction, number>>; myReaction: PostReaction | null }>(`/club-posts/${postId}/reaction`, { method: 'PUT', token, body: { reaction } });
  forgetProfile();
  return r;
}

/** Older posts than the ones shown, from the cursor the last page gave. */
export async function olderPosts(token: string, clubId: string, before: string): Promise<ClubFeed> {
  return api<ClubFeed>(`/clubs/${clubId}/posts?before=${encodeURIComponent(before)}`, { token });
}
