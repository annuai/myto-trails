import { useRouter } from 'expo-router';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { useOnboarding } from '@/store/onboarding';
import { Screen } from '@/ui/Screen';

/** The welcome flow for a fresh install (see useFirstRun). Finishing or skipping it is remembered on this phone. */
export default function Onboarding() {
  const router = useRouter();
  const done = () => { useOnboarding.getState().finish(); router.replace('/'); };
  return (
    <Screen scroll={false}>
      <OnboardingFlow onDone={done} onPickCountry={() => router.push('/region')} />
    </Screen>
  );
}
