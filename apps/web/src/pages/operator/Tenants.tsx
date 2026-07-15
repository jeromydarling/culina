import * as React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Database, Sparkles, PartyPopper } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { getKitchenByOperator, listMemberships, getTenantProfile, getProfile } from '@/lib/store';
import { dataApi, type TenantRow } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatCents } from '@culina/shared';
import { format, differenceInDays } from 'date-fns';

// People, not line items. Warmer words for how someone’s membership is going.
const statusLabel: Record<string, string> = {
  active: 'Active',
  pending: 'Getting set up',
  suspended: 'Paused',
  graduated: 'Graduated',
};

const membershipLabel: Record<string, string> = {
  hourly: 'Pay-as-you-go',
  monthly: 'Monthly',
  annual: 'Annual',
};

// A small moment worth noticing — just arrived, or an anniversary with you.
function milestone(start: string | null): { label: string; tone: 'new' | 'anniversary' } | null {
  if (!start) return null;
  const days = differenceInDays(new Date(), new Date(start));
  if (days < 0) return null;
  if (days <= 30) return { label: 'Just joined', tone: 'new' };
  const years = Math.floor(days / 365);
  if (years >= 1 && days % 365 <= 14) return { label: `${years} ${years === 1 ? 'year' : 'years'} 🎉`, tone: 'anniversary' };
  return null;
}

const firstName = (full: string | null, email: string) => (full?.trim().split(' ')[0] ?? email.split('@')[0]);

export default function Tenants() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id);
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

  // Who’s arrived recently — worth a warm hello before anything else.
  const justJoined = (rows ?? []).filter((r) => milestone(r.start_date)?.tone === 'new');

  return (
    <div>
      <PageHeader
        title="Members"
        description="The makers who call your kitchen home. Keep up with how they’re doing and welcome new ones in."
        action={
          <>
            <Link to="/operator/onboarding"><Button variant="outline"><Database className="h-4 w-4" /> Import</Button></Link>
            <Link to="/operator/leads"><Button><UserPlus className="h-4 w-4" /> Welcome someone in</Button></Link>
          </>
        }
      />

      {isLive() && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Database className="h-3.5 w-3.5" /> Live from Cloudflare D1
        </div>
      )}

      {/* A gentle nudge to say hello to whoever just arrived. */}
      {justJoined.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">
              {justJoined.length === 1
                ? `${firstName(justJoined[0].full_name, justJoined[0].email)} just joined ${kitchen?.name}.`
                : `${justJoined.length} makers joined ${kitchen?.name} recently.`}
            </div>
            <p className="text-emerald-800/80">A quick welcome note goes a long way in their first few weeks.</p>
          </div>
        </div>
      )}

      {loading || !rows ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Member</th><th className="p-3">Membership</th><th className="p-3">Status</th>
                <th className="p-3">With you since</th><th className="p-3">Annual revenue</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = milestone(r.start_date);
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.business_name ?? r.full_name}</span>
                        {m && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.tone === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-accent/15 text-accent'}`}>
                            <Sparkles className="h-3 w-3" /> {m.label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="p-3">{membershipLabel[r.membership_type] ?? r.membership_type}</td>
                    <td className="p-3"><Badge variant={statusVariant(r.status)}>{statusLabel[r.status] ?? r.status}</Badge></td>
                    <td className="p-3 text-muted-foreground">{r.start_date ? format(new Date(r.start_date), 'MMM yyyy') : '—'}</td>
                    <td className="p-3">{r.annual_revenue_estimate ? formatCents(r.annual_revenue_estimate * 100) + '/yr' : '—'}</td>
                    <td className="p-3 text-right"><Link to={`/operator/tenants/${r.tenant_id}`} className="text-sm font-medium text-primary hover:underline">View →</Link></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No members yet — import your makers or welcome someone in.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
