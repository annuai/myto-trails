import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, font, space, size, type } from '@/theme/tokens';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & { label: string; hint?: string; error?: string; /** Set when the box sits on a Card, so its fill differs from the card's. */ onCard?: boolean };

export function Field({ label, hint, error, multiline, onCard, ...rest }: Props) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="labelMedium">{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          minHeight: multiline ? size.textArea : size.button, borderRadius: radius.control, paddingHorizontal: space[5], paddingVertical: multiline ? space[4] : 0,
          backgroundColor: onCard ? c.field : c.card, color: c.ink, fontFamily: font.regular, fontSize: type.body.fontSize,
          borderWidth: size.rule, borderColor: error ? c.stop : focus ? c.accent : 'transparent', textAlignVertical: multiline ? 'top' : 'center',
          // web only: drop the browser's default outline, the border shows focus
          outlineStyle: 'none' as unknown as 'solid',
        }}
      />
      {error ? <Text variant="caption" tone="stop">{error}</Text> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}
