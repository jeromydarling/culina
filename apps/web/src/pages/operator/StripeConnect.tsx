import { useAuth } from '@/context/AuthContext';
import { getKitchenByOperator } from '@/lib/store';
import { StripeConnectPanel } from '@/components/StripeConnectPanel';

export default function StripeConnect() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  return <StripeConnectPanel onboarded={kitchen.stripe_onboarded} audience="operator" />;
}
