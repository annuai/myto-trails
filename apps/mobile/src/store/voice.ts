import { saveVoice } from '@/lib/journalMedia';
import { createVoice } from './voiceCore';
import { useJournal } from './journal';

/** The voice note recorder (see voiceCore). */
export const useVoice = createVoice({ add: (e) => useJournal.getState().add(e), save: saveVoice, now: Date.now });
