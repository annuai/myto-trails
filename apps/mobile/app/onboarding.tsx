import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AccountStep, ProfileSetupStep } from '@/features/onboarding/AccountSteps';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { useAuth } from '@/store/auth';
import { useOnboarding } from '@/store/onboarding';
import { Screen } from '@/ui/Screen';

type Step = 'tour' | 'account' | 'profile';

/**
 * The welcome flow for a fresh install (see useFirstRun): the pages and setup, then two optional account steps (sign in, then a
 * short profile). The tour counts as done once its setup is finished; the account steps can be skipped, and are offered again
 * under You and Profile settings. `?step=profile` opens the profile step directly: the email link lands there, and so does
 * Profile settings.
 */
export default function Onboarding() {
  const router = useRouter();
  const { step: asked } = useLocalSearchParams<{ step?: string }>();
  const token = useAuth((s) => s.token);
  const [step, setStep] = useState<Step>(asked === 'profile' ? (token ? 'profile' : 'account') : 'tour');
  const home = useCallback(() => { useOnboarding.getState().finish(); router.replace('/'); }, [router]);
  const tourDone = () => { useOnboarding.getState().finish(); setStep(token ? 'profile' : 'account'); };
  if (step === 'account') return <AccountStep onSkip={home} />;
  if (step === 'profile') return <ProfileSetupStep onDone={home} />;
  return (
    <Screen scroll={false}>
      <OnboardingFlow onDone={tourDone} onPickCountry={() => router.push('/region')} />
    </Screen>
  );
}
