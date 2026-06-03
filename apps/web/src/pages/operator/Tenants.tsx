import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { getKitchenByOperator, listMemberships, getTenantProfile, getProfile } from '@/lib/store';
import { formatCents } from '@culina/shared';
import { format } from 'date-fns';

export default function Tenants() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const memberships = listMemberships(kitchen.id);
  const [invite, setInvite] = React.useState(false);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Your kitchen’s food makers and their membership status."
        action={<Button onClick={() => setInvite(true)}><UserPlus className="h-4 w-4" /> Invite tenant</Button>}
      />

      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Business</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Started</th>
              <th className="p-3">Revenue est.</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const tp = getTenantProfile(m.tenant_id);
              const p = getProfile(m.tenant_id);
              return (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{tp?.business_name ?? p?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </td>
                  <td className="p-3 capitalize">{m.membership_type}{m.monthly_hours_included ? ` · ${m.monthly_hours_included}h` : ''}</td>
                  <td className="p-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{m.start_date ? format(new Date(m.start_date), 'MMM yyyy') : '—'}</td>
                  <td className="p-3">{tp?.annual_revenue_estimate ? formatCents(tp.annual_revenue_estimate * 100) + '/yr' : '—'}</td>
                  <td className="p-3 text-right"><Link to={`/operator/tenants/${m.tenant_id}`} className="text-sm font-medium text-primary hover:underline">View →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite a tenant" description="Send an invite link or email.">
        <form onSubmit={(e) => { e.preventDefault(); setInvite(false); toast.success('Invite sent (demo).'); }} className="space-y-3">
          <div><Label>Email</Label><Input type="email" required placeholder="maker@business.com" /></div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> They’ll get a link to join {kitchen.name}.
          </div>
          <Button type="submit" className="w-full">Send invite</Button>
        </form>
      </Modal>
    </div>
  );
}
