import * as ImagePicker from 'expo-image-picker';
import { FileSystemUploadType, getInfoAsync, uploadAsync } from 'expo-file-system/legacy';
import { ApiFailure, api } from '@/api/client';
import { SITE_BASE } from '@/api/config';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
type Check = { status: string; mediaId?: string; rejectMessage?: string };

/**
 * Let the rider choose a photo and send it through the website's upload pipeline (signed upload, then processing).
 * Returns the finished upload's media id, to be attached with PUT /me/avatar, /me/bike or /clubs/{id}/cover.
 * Returns null when the rider backs out of the picker.
 */
export async function pickAndUploadImage(token: string, aspect: [number, number]): Promise<{ mediaId: string; uri: string } | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  // The store signs the exact size and type, so read the size from the file itself and let the native uploader stream it from disk.
  // (A fetch with a Blob body is unreliable on iOS: the length it sends can differ from the signed one.)
  const info = await getInfoAsync(asset.uri);
  if (!info.exists || !info.size) throw new ApiFailure(0, 'unreadable', 'That photo could not be read.');
  const contentType = asset.mimeType && TYPES.includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';

  const up = await api<{ uploadId: string; target: { url: string; method: 'PUT'; headers: Record<string, string> } }>('/uploads', { method: 'POST', token, body: { kind: 'image', contentType, sizeBytes: info.size } });
  // The development file store hands out a path on the website; the production store hands out a full address.
  const url = up.target.url.startsWith('/') ? `${SITE_BASE}${up.target.url}` : up.target.url;
  const { 'Content-Length': _length, ...headers } = up.target.headers;
  const put = await uploadAsync(url, asset.uri, { httpMethod: 'PUT', uploadType: FileSystemUploadType.BINARY_CONTENT, headers }).catch(() => { throw new ApiFailure(0, 'network', 'Cannot reach the file store. Check your connection.'); });
  if (put.status < 200 || put.status > 299) throw new ApiFailure(put.status, 'upload_failed', `The photo could not be uploaded (${put.status}).`);
  let check = await api<Check>(`/uploads/${up.uploadId}/complete`, { method: 'POST', token, body: {} });
  for (let i = 0; i < 10 && (check.status === 'processing' || check.status === 'pending'); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    check = await api<Check>(`/uploads/${up.uploadId}`, { token });
  }
  if (check.status !== 'ready' || !check.mediaId) throw new ApiFailure(422, 'rejected', check.rejectMessage ?? 'That photo was not accepted.');
  return { mediaId: check.mediaId, uri: asset.uri };
}
