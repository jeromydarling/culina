import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLATFORM_FEE_PERCENT } from '@culina/shared';

export function StripeConnectPanel({
  onboarded: initialOnboarded,
  audience,
}: {
  onboarded: boolean;
  audience: 'operator' | 'tenant';
}) {
  const [onboarded, setOnboarded] = React.useState(initialOnboarded);
  const [loading, setLoading] = React.useState(false);

  function connect() {
    setLoading(true);
    // In production this calls POST /api/stripe/connect/create-account-link
    setTimeout(() => {
      setOnboarded(true);
      setLoading(false);
      toast.success('Stripe Connect account linked (demo).');
    }, 1200);
  }

  const flow =
    audience === 'operator'
      ? 'Booking and membership payments settle directly to your connected account.'
      : 'Storefront sales settle directly to your connected account.';

  return (
    <div>
      <PageHeader title="Payments" description="Powered by Stripe Connect (Express)." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Connected account</CardTitle></CardHeader>
          <CardContent>
            {onboarded ? (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <div className="font-medium text-emerald-800">You’re ready to accept payments</div>
                  <div className="text-sm text-emerald-700">{flow}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect a Stripe Express account to start accepting payments. It takes about 2 minutes.
                </p>
                <Button onClick={connect} disabled={loading}>
                  <CreditCard className="h-4 w-4" /> {loading ? 'Connecting…' : 'Connect with Stripe'}
                </Button>
              </div>
            )}
            <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              Culina never holds your funds. Payments flow straight to you through Stripe.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>How fees work</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="font-medium">Transparent {PLATFORM_FEE_PERCENT}% platform fee</div>
              <div className="mt-1 text-muted-foreground">Shown as a separate line item on every transaction. Never hidden.</div>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Example $100 sale</span><span className="font-medium">$100.00</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Culina fee ({PLATFORM_FEE_PERCENT}%)</span><span className="font-medium">$1.50</span></div>
            <div className="flex justify-between border-t pt-2"><span>You receive</span><span className="font-semibold">$98.50</span></div>
            <a href="https://stripe.com/connect" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              About Stripe Connect <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
