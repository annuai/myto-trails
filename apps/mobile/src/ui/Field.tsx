import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, font } from '@/theme/tokens';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, multiline, ...rest }: Props) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelMedium">{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          minHeight: multiline ? 112 : 56, borderRadius: radius.control, paddingHorizontal: 18, paddingVertical: multiline ? 16 : 0,
          backgroundColor: c.card, color: c.ink, fontFamily: font.regular, fontSize: 17,
          borderWidth: 2, borderColor: error ? c.stop : focus ? c.accent : 'transparent', textAlignVertical: multiline ? 'top' : 'center',
          // web only: drop the browser's default outline, the border shows focus
          outlineStyle: 'none' as unknown as 'solid',
        }}
      />
      {error ? <Text variant="caption" tone="stop">{error}</Text> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}
