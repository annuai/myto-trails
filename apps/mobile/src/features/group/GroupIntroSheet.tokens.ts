import { space } from '@/theme/tokens';

/**
 * The picture is square. It is shown `artRatio` as tall as it is wide, moved up by `artShift` of its width so the empty sky is what is
 * cut, not the riders. The step number sits in a circle `badge` wide.
 */
export const groupIntro = { artRatio: 0.72, artShift: 0.14, badge: space[6] } as const;
