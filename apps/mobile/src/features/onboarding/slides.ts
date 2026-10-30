import type { ImageSourcePropType } from 'react-native';

export type Slide = { key: string; title: string; body: string; art: ImageSourcePropType };

/**
 * What the app is for, one idea a page. The pictures are halftone illustrations in assets/onboarding; a file can be replaced
 * with the same name and the flow picks it up.
 */
export const SLIDES: Slide[] = [
  { key: 'welcome', title: 'Every ride, remembered.', body: 'Myto Moto records your rides, finds trails worth riding and looks out for you on the road.', art: require('../../../assets/onboarding/welcome.png') },
  { key: 'record', title: 'Tap Ride. We do the rest.', body: 'Distance, speed and route are saved even with the screen locked. Each ride shows what it cost in petrol.', art: require('../../../assets/onboarding/record.png') },
  { key: 'trails', title: 'Know before you go.', body: 'Every trail says whether it is open, when that was last confirmed and by whom.', art: require('../../../assets/onboarding/trails.png') },
  { key: 'safety', title: 'Someone always knows.', body: 'Set a check-in, ride with a group, or hold SOS for help. If a crash is detected, the app asks if you are OK first.', art: require('../../../assets/onboarding/safety.png') },
];

/** The picture above the setup page, which is not a slide. */
export const SETUP_ART: ImageSourcePropType = require('../../../assets/onboarding/setup.png');
