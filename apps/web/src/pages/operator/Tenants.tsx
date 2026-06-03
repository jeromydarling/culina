import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, UserPlus, Database } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { getKitchenByOperator, listMemberships, getTenantProfile, getProfile } from '@/lib/store';
import { dataApi, type TenantRow } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatCents } from '@culina/shared';
import { format } from 'date-fns';

export default function Tenants() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id);
  const [invite, setInvite] = React.useState(false);
  const [rows, setRows] = React.useState<TenantRow[] | null>(null);
  const [loading, setLoading] = React.useState(isLive());

  React.useEffect(() => {
    if (!isLive()) {
      // Build rows from the in-memory store.
      setRows(
        listMemberships(kitchen!.id).map((m) => {
          const tp = getTenantProfile(m.tenant_id);
          const p = getProfile(m.tenant_id);
          return {
            id: m.id, tenant_id: m.tenant_id, status: m.status, membership_type: m.membership_type,
            start_date: m.start_date, full_name: p?.full_name ?? null, email: p?.email ?? '',
            business_name: tp?.business_name ?? null, business_type: tp?.business_type ?? null,
            annual_revenue_estimate: tp?.annual_revenue_estimate ?? null,
          };
        }),
      );
      return;
    }
    // Live: load from D1 via the Worker.
    dataApi
      .bootstrap()
      .then((d) => setRows(d.tenants))
      .catch((e) => notifyError(e, { action: 'loadTenants' }))
      .finally(() => setLoading(false));
  }, [kitchen]);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Your kitchen’s food makers and their membership status."
        action={
          <>
            <Link to="/operator/onboarding"><Button variant="outline"><Database className="h-4 w-4" /> Import</Button></Link>
            <Button onClick={() => setInvite(true)}><UserPlus className="h-4 w-4" /> Invite tenant</Button>
          </>
        }
      />

      {isLive() && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Database className="h-3.5 w-3.5" /> Live from Cloudflare D1
        </div>
      )}

      {loading || !rows ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Business</th><th className="p-3">Plan</th><th className="p-3">Status</th>
                <th className="p-3">Started</th><th className="p-3">Revenue est.</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{r.business_name ?? r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="p-3 capitalize">{r.membership_type}</td>
                  <td className="p-3"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{r.start_date ? format(new Date(r.start_date), 'MMM yyyy') : '—'}</td>
                  <td className="p-3">{r.annual_revenue_estimate ? formatCents(r.annual_revenue_estimate * 100) + '/yr' : '—'}</td>
                  <td className="p-3 text-right"><Link to={`/operator/tenants/${r.tenant_id}`} className="text-sm font-medium text-primary hover:underline">View →</Link></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No tenants yet — import or invite your makers.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={invite} onClose={() => setInvite(false)} title="Invite a tenant" description="Send an invite link or email.">
        <form onSubmit={(e) => { e.preventDefault(); setInvite(false); toast.success('Invite sent (demo).'); }} className="space-y-3">
          <div><Label>Email</Label><Input type="email" required placeholder="maker@business.com" /></div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> They’ll get a link to join {kitchen?.name}.
          </div>
          <Button type="submit" className="w-full">Send invite</Button>
        </form>
      </Modal>
    </div>
  );
}
