import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listKitchens, updateKitchen } from '@/lib/store';
import { useForceUpdate } from '@/lib/hooks';
import { formatCents } from '@culina/shared';

export default function Kitchens() {
  const kitchens = listKitchens();
  const force = useForceUpdate();

  function verify(id: string, name: string) {
    // Write-through persists in a live session (kitchens.is_verified).
    updateKitchen(id, { is_verified: true });
    force();
    toast.success(`${name} is now verified.`);
  }

  return (
    <div>
      <PageHeader title="Kitchen Registry" description="All kitchens on the platform." />
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Kitchen</th><th className="p-3">Location</th><th className="p-3">Price</th><th className="p-3">Stripe</th><th className="p-3">Listed</th><th className="p-3">Verification</th></tr>
          </thead>
          <tbody>
            {kitchens.map((k) => (
              <tr key={k.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{k.name}</td>
                <td className="p-3 text-muted-foreground">{k.city}, {k.state}</td>
                <td className="p-3">{formatCents(k.monthly_price_cents)}/mo</td>
                <td className="p-3">{k.stripe_onboarded ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Pending</Badge>}</td>
                <td className="p-3">{k.is_listed ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}</td>
                <td className="p-3">
                  {k.is_verified ? (
                    <Badge variant="success"><BadgeCheck className="mr-1 h-3 w-3" /> Verified ✓</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => verify(k.id, k.name)}>Verify</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
