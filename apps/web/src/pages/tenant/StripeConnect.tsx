import { useAuth } from '@/context/AuthContext';
import { getTenantProfile } from '@/lib/store';
import { StripeConnectPanel } from '@/components/StripeConnectPanel';

export default function StripeConnect() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  return <StripeConnectPanel onboarded={tp?.stripe_onboarded ?? false} audience="tenant" />;
}
