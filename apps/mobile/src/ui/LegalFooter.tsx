import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LEGAL_SLUGS, MADE_IN_INDIA, MYTO_URL, versionLabel, type LegalSlug } from '@moto-trails/domain';
import { Inline, Stack } from './layout';
import { Text } from './Text';

const LABEL: Record<LegalSlug, string> = { about: 'About', terms: 'Terms', privacy: 'Privacy' };

/** Bottom of the You page: Terms, Privacy and About, the version, the myto-moto link and where it was made. */
export function LegalFooter() {
  const router = useRouter();
  return (
    <Stack gap={2} align="center">
      <Inline gap={4} justify="center" wrap>
        {LEGAL_SLUGS.map((slug) => (
          <Text key={slug} variant="caption" tone="accent" accessibilityRole="link" onPress={() => router.push(`/legal/${slug}`)}>
            {LABEL[slug]}
          </Text>
        ))}
      </Inline>
      <Inline gap={2} justify="center" wrap>
        <Text variant="caption" tone="muted">{versionLabel(Constants.expoConfig?.version)}</Text>
        <Text variant="caption" tone="muted">·</Text>
        <Text variant="caption" tone="muted" accessibilityRole="link" onPress={() => void Linking.openURL(MYTO_URL)}>myto-moto.com</Text>
        <Text variant="caption" tone="muted">·</Text>
        <Text variant="caption" tone="muted">{MADE_IN_INDIA}</Text>
      </Inline>
    </Stack>
  );
}
