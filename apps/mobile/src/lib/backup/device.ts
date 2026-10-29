import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, FileMode, Paths } from 'expo-file-system';
import { commitStaged, deleteAllPhotos, discardStaged, hasPhoto, readPhotoBase64, stagePhoto } from '../localMedia';
import { commitStaged as commitJournalMedia, discardStaged as discardJournalMedia, hasMedia, readBase64 as readJournalMedia, stageMedia } from '../journalMedia';
import { useJournal } from '@/store/journal';
import { useProfile } from '@/store/profile';
import { useMyRoutes } from '@/store/myRoutes';
import { useFuel } from '@/store/fuel';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { useTodos } from '@/store/todos';
import { writeBackup } from './export';
import { backupFileName, type OpenedBackup, type Snapshot } from './format';
import { openBackupFile, type Target } from './import';

/** Reads the phone's data. The sign-in token, trail packs and the quote queue are not part of it. */
export function currentSnapshot(): Snapshot {
  const { licence, vehicle, contacts, medical, photos } = useProfile.getState();
  return { licence, vehicle, contacts, medical, photos, todos: useTodos.getState().todos, rides: useRides.getState().rides, journal: useJournal.getState().entries, journalTitles: useJournal.getState().titles, routes: useMyRoutes.getState().routes, trips: useTrips.getState().trips, fuel: useFuel.getState().history };
}

export const phoneTarget: Target = {
  get: currentSnapshot,
  set: (s) => {
    useProfile.getState().restore({ licence: s.licence, vehicle: s.vehicle, contacts: s.contacts, medical: s.medical, photos: s.photos });
    useTodos.setState({ todos: s.todos });
    useRides.setState({ rides: s.rides });
    useJournal.getState().restore(s.journal, s.journalTitles);
    // A backup made before routes and trips existed leaves the phone's own alone.
    if (s.routes) useMyRoutes.setState({ routes: s.routes });
    if (s.trips) useTrips.setState({ trips: s.trips });
    if (s.fuel) useFuel.getState().restore(s.fuel);
  },
  photos: { stage: stagePhoto, commit: commitStaged, discard: discardStaged },
  journal: { stage: (kind, id, b64) => stageMedia(id, kind, b64), commit: commitJournalMedia, discard: discardJournalMedia },
};

/** Erase all my data: the files go with the store entries. */
export const eraseDocumentPhotos = deleteAllPhotos;

/**
 * Writes the encrypted backup to the cache one record at a time (so a large journal never sits in memory) and opens
 * the share sheet. Returns false when sharing is not available.
 */
export async function exportToShareSheet(passphrase: string): Promise<boolean> {
  const file = new File(Paths.cache, backupFileName(new Date()));
  file.create({ overwrite: true });
  try {
    const handle = file.open(FileMode.WriteOnly);
    try {
      await writeBackup(currentSnapshot(), { has: hasPhoto, read: readPhotoBase64 }, { has: hasMedia, read: readJournalMedia }, passphrase, { write: (b) => handle.writeBytes(b) });
    } finally { handle.close(); }
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, { dialogTitle: 'Save your Myto Moto backup', UTI: 'public.data' });
    return true;
  } finally {
    // the file holds encrypted personal data: do not leave it in the cache
    if (file.exists) file.delete();
  }
}

/** Lets the rider pick a backup. Returns the address of a private copy in the cache, or undefined when they cancel. Delete it with `discardPickedBackup`. */
export async function pickBackupFile(): Promise<string | undefined> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  return r.canceled ? undefined : r.assets[0].uri;
}

export function discardPickedBackup(uri: string) {
  const f = new File(uri);
  if (f.exists) f.delete();
}

/** Opens a picked backup for the length of `fn`, then closes it. A streamed backup is read as `fn` asks for its files. */
export async function withBackup<T>(uri: string, passphrase: string, fn: (opened: OpenedBackup) => Promise<T>): Promise<T> {
  const handle = new File(uri).open(FileMode.ReadOnly);
  try {
    return await fn(await openBackupFile({ read: (n) => handle.readBytes(n) }, passphrase));
  } finally { handle.close(); }
}
