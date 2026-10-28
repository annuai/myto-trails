import { stopBackground } from '@/lib/backgroundLocation';
import { journal } from '@/lib/journalStore';
import { createRecorder } from './recorderCore';

/** The live recorder, writing every fix to the on-disk journal (see recorderCore for what it does). */
export const useRecorder = createRecorder(journal, { stopBackground });
