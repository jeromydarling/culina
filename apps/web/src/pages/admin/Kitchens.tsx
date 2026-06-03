import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listKitchens } from '@/lib/store';
import { formatCents } from '@culina/shared';

export default function Kitchens() {
  const kitchens = listKitchens();
  return (
    <div>
      <PageHeader title="Kitchen Registry" description="All kitchens on the platform." />
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Kitchen</th><th className="p-3">Location</th><th className="p-3">Price</th><th className="p-3">Stripe</th><th className="p-3">Listed</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {kitchens.map((k) => (
              <tr key={k.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{k.name}</td>
                <td className="p-3 text-muted-foreground">{k.city}, {k.state}</td>
                <td className="p-3">{formatCents(k.monthly_price_cents)}/mo</td>
                <td className="p-3">{k.stripe_onboarded ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Pending</Badge>}</td>
                <td className="p-3">{k.is_listed ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => toast.success(`${k.name} verified`)}><CheckCircle2 className="h-3 w-3" /> Verify</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
