import { useAppearance } from '@/store/appearance';

/** Whether the map is drawn in its dark style: as the screen asks for it, turned over when the rider has chosen inverted colours. */
export const useMapDark = (dark?: boolean): boolean => {
  const inverted = useAppearance((s) => s.inverted);
  return inverted ? !dark : !!dark;
};
