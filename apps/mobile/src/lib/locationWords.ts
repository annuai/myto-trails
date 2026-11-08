import { Platform } from 'react-native';

/** What the phone's own Settings calls the location choice that lets a ride record with the screen locked: Android has no "Always", it says "Allow all the time". */
export const ALWAYS_CHOICE = Platform.OS === 'android' ? 'Allow all the time' : 'Always';
