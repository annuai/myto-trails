import QuickActions from '@/features/widgets/QuickActions.android.tokens';
import type { QuickWidgetProps } from './quickWidget';

/** Sends the widget's state to the home screen. */
export const updateQuickWidget = (p: QuickWidgetProps): void => { try { QuickActions.updateSnapshot(p); } catch { /* no widget on this phone, or too old an OS */ } };
