import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

// On the web this is localStorage, on the phone the app's private storage.
// Documents are kept here unencrypted for now; move them to secure storage before release (docs/16 §9).
export const storage = createJSONStorage(() => AsyncStorage);
