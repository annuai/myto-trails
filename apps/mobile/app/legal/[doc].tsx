import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLegalDoc, type Part } from '@moto-trails/domain';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Inline, Stack } from '@/ui/layout';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function Parts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((x, i) =>
        typeof x === 'string' ? x : <Text key={i} tone="accent" accessibilityRole="link" onPress={() => void Linking.openURL(x.href)}>{x.text}</Text>,
      )}
    </>
  );
}

/** Terms, Privacy or About: the same text as the website. */
export default function LegalDocScreen() {
  const router = useRouter();
  const { doc: slug } = useLocalSearchParams<{ doc: string }>();
  const doc = getLegalDoc(String(slug ?? ''));

  if (!doc) {
    return (
      <Screen>
        <BackHeader title="You" />
        <PageTitle>Page not found</PageTitle>
        <Stack gap={4}>
          <Text variant="label" tone="muted">That page does not exist.</Text>
          <Button variant="soft" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub={`Last updated ${doc.updated}`}>{doc.title}</PageTitle>
      <Stack gap={4}>
        {doc.draft ? <Text variant="caption" tone="muted">Draft text, pending legal review. It may change before launch.</Text> : null}
        {doc.sections.map((s, i) => (
          <Stack key={i} gap={3}>
            {s.heading ? <SectionTitle>{s.heading}</SectionTitle> : null}
            {s.blocks.map((b, j) =>
              'p' in b ? (
                <Text key={j}><Parts parts={b.p} /></Text>
              ) : (
                <Stack key={j} gap={2}>
                  {b.ul.map((item, k) => (
                    <Inline key={k} gap={2} align="flex-start">
                      <Text tone="muted">•</Text>
                      <Text style={{ flex: 1 }}><Parts parts={item} /></Text>
                    </Inline>
                  ))}
                </Stack>
              ),
            )}
          </Stack>
        ))}
      </Stack>
    </Screen>
  );
}
