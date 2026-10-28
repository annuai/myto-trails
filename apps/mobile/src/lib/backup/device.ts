import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { commitStaged, deleteAllPhotos, discardStaged, readPhotoBase64, stagePhoto } from '../localMedia';
import { useProfile } from '@/store/profile';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { createBackup } from './export';
import type { Snapshot } from './format';
import type { Target } from './import';

/** Reads the phone's data. The sign-in token, trail packs and the quote queue are not part of it. */
export function currentSnapshot(): Snapshot {
  const { licence, vehicle, contacts, medical, photos } = useProfile.getState();
  return { licence, vehicle, contacts, medical, photos, todos: useTodos.getState().todos, rides: useRides.getState().rides };
}

export const phoneTarget: Target = {
  get: currentSnapshot,
  set: (s) => {
    useProfile.getState().restore({ licence: s.licence, vehicle: s.vehicle, contacts: s.contacts, medical: s.medical, photos: s.photos });
    useTodos.setState({ todos: s.todos });
    useRides.setState({ rides: s.rides });
  },
  photos: { stage: stagePhoto, commit: commitStaged, discard: discardStaged },
};

/** Erase all my data: the files go with the store entries. */
export const eraseDocumentPhotos = deleteAllPhotos;

/** Writes the encrypted file to the cache and opens the share sheet. Returns false when sharing is not available. */
export async function exportToShareSheet(passphrase: string): Promise<boolean> {
  const { fileName, text } = await createBackup(currentSnapshot(), { read: readPhotoBase64 }, passphrase);
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(text);
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, { dialogTitle: 'Save your Myto backup', UTI: 'public.data' });
    return true;
  } finally {
    // the file holds encrypted personal data: do not leave it in the cache
    if (file.exists) file.delete();
  }
}

/** Lets the rider pick a backup and returns its text, or undefined when they cancel. */
export async function pickBackupFile(): Promise<string | undefined> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (r.canceled) return undefined;
  const picked = new File(r.assets[0].uri);
  try { return await picked.text(); } finally { if (picked.exists) picked.delete(); }
}
