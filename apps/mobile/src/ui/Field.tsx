import { useEffect, useState } from 'react';
import { Animated, TextInput, View, type TextInputProps } from 'react-native';
import { buzz } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, font, space, size, type } from '@/theme/tokens';
import { ARRIVE, useReducedMotion } from './motion';
import { Text } from './Text';
import { useAnimatedValue } from './useAnimatedValue';

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
          borderWidth: size.rule, borderColor: error ? c.stop : focus ? c.accent : c.edge, textAlignVertical: multiline ? 'top' : 'center',
          // web only: drop the browser's default outline, the border shows focus
          outlineStyle: 'none' as unknown as 'solid',
        }}
      />
      {error ? <ErrorLine text={error} /> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}

/** A field's problem: it slides in and fades up as it appears, with a warning buzz, and says nothing about itself until it has something to say. */
function ErrorLine({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const shown = useAnimatedValue(reduced ? 1 : 0);
  useEffect(() => {
    buzz.help();
    if (reduced) return;
    shown.setValue(0);
    Animated.timing(shown, { toValue: 1, duration: motion.duration.quick, easing: ARRIVE, useNativeDriver: true }).start();
  }, [text, reduced, shown]);
  return (
    <Animated.View style={{ opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [-space[2], 0] }) }] }}>
      <Text variant="caption" tone="stop">{text}</Text>
    </Animated.View>
  );
}
