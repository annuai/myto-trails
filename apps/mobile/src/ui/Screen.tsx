import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';

export const TAB_BAR_HEIGHT = 96;

type Props = { children: ReactNode; overlay?: ReactNode; tabs?: boolean; scroll?: boolean; footer?: ReactNode };

/** Page frame: safe-area top, 20 px side margins, scrolls, leaves room for the tab bar. */
export function Screen({ children, overlay, tabs = false, scroll = true, footer }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabs ? TAB_BAR_HEIGHT + 24 : insets.bottom + 24) + (footer ? 88 : 0);
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottom, paddingHorizontal: size.screenX }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: size.screenX, paddingBottom: insets.bottom + 16 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      {body}
      {footer ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: size.screenX, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
          {footer}
        </View>
      ) : null}
      {overlay}
    </View>
  );
}
