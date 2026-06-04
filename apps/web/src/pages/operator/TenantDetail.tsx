import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, Pause, PartyPopper } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Tabs } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import {
  getKitchenByOperator,
  getMembershipForTenant,
  getTenantProfile,
  getProfile,
  listBookings,
  listComplianceForTenant,
  listInvoicesForTenant,
  updateMembership,
} from '@/lib/store';
import { formatCents, DOC_TYPE_LABELS } from '@culina/shared';
import { format, differenceInDays } from 'date-fns';

// Warmer words for how someone’s membership is going.
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

export default function TenantDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const membership = id ? getMembershipForTenant(id) : null;
  const tp = id ? getTenantProfile(id) : null;
  const p = id ? getProfile(id) : null;
  const [tab, setTab] = React.useState('overview');
  const [notes, setNotes] = React.useState(membership?.notes ?? '');
  const force = useForceUpdate();

  if (!membership || !p) {
    return (
      <div>
        <Link to="/operator/tenants" className="text-sm text-primary hover:underline">← Back to members</Link>
        <p className="mt-6 text-muted-foreground">We couldn’t find that member.</p>
      </div>
    );
  }

  const bookings = listBookings({ tenantId: id }).filter((b) => b.kitchen_id === kitchen.id);
  const docs = listComplianceForTenant(id!);
  const invoices = listInvoicesForTenant(id!);

  function setStatus(status: 'active' | 'suspended' | 'graduated') {
    updateMembership(membership!.id, { status });
    force();
    const msg = status === 'suspended' ? 'Membership paused.' : status === 'graduated' ? 'Graduated — what a journey 🎉' : 'Membership active.';
    toast.success(msg);
  }

  const justJoined = membership.start_date && differenceInDays(new Date(), new Date(membership.start_date)) <= 30;

  return (
    <div>
      <Link to="/operator/tenants" className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Members</Link>
      <PageHeader
        title={tp?.business_name ?? p.full_name ?? 'Member'}
        description={p.email}
        action={
          <>
            <Button variant="outline" onClick={() => setStatus('suspended')}><Pause className="h-4 w-4" /> Pause</Button>
            <Button onClick={() => setStatus('graduated')}><GraduationCap className="h-4 w-4" /> Graduate</Button>
          </>
        }
      />

      {justJoined && membership.status === 'active' && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-800">
          <PartyPopper className="h-4 w-4 shrink-0 text-emerald-600" />
          New to {kitchen.name} — a warm welcome and a quick tour go a long way right now.
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Badge variant={statusVariant(membership.status)}>{statusLabel[membership.status] ?? membership.status}</Badge>
        <span className="text-sm text-muted-foreground">{membershipLabel[membership.membership_type] ?? membership.membership_type} membership</span>
        {membership.start_date && <span className="text-sm text-muted-foreground">· with you since {format(new Date(membership.start_date), 'MMM yyyy')}</span>}
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'bookings', label: `Bookings (${bookings.length})` },
          { id: 'compliance', label: `Compliance (${docs.length})` },
          { id: 'invoices', label: `Invoices (${invoices.length})` },
          { id: 'notes', label: 'Notes' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card><CardHeader><CardTitle>Business profile</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <Row label="Type" value={tp?.business_type ?? '—'} />
            <Row label="Years operating" value={String(tp?.years_in_operation ?? '—')} />
            <Row label="Annual revenue est." value={tp?.annual_revenue_estimate ? formatCents(tp.annual_revenue_estimate * 100) : '—'} />
            <Row label="Entity type" value={tp?.legal_entity_type ?? '—'} />
            <Row label="Storefront" value={tp?.business_slug ? `/shop/${tp.business_slug}` : '—'} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Contact</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <Row label="Name" value={p.full_name ?? '—'} />
            <Row label="Email" value={p.email} />
            <Row label="Phone" value={p.phone ?? '—'} />
          </CardContent></Card>
        </div>
      )}

      {tab === 'bookings' && (
        <Card><CardContent className="p-0">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b p-3 last:border-0">
              <span className="text-sm">{format(new Date(b.start_time), 'MMM d, h:mma')}</span>
              <div className="flex items-center gap-3"><span className="text-sm">{formatCents(b.total_cents)}</span><Badge variant={statusVariant(b.status)}>{b.status}</Badge></div>
            </div>
          ))}
          {bookings.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No bookings yet.</p>}
        </CardContent></Card>
      )}

      {tab === 'compliance' && (
        <Card><CardContent className="p-0">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b p-3 last:border-0">
              <span className="text-sm">{DOC_TYPE_LABELS[d.doc_type]}</span>
              <div className="flex items-center gap-3">
                {d.expiration_date && <span className="text-xs text-muted-foreground">exp {format(new Date(d.expiration_date), 'MMM d, yyyy')}</span>}
                <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          ))}
          {docs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No documents.</p>}
        </CardContent></Card>
      )}

      {tab === 'invoices' && (
        <Card><CardContent className="p-0">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b p-3 last:border-0">
              <span className="text-sm font-mono">{inv.invoice_number}</span>
              <div className="flex items-center gap-3"><span className="text-sm">{formatCents(inv.total_cents)}</span><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></div>
            </div>
          ))}
          {invoices.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No invoices.</p>}
        </CardContent></Card>
      )}

      {tab === 'notes' && (
        <Card><CardContent className="p-5">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Private notes — how they’re settling in, what they’re working on, how you can help…" />
          <Button className="mt-3" onClick={() => { updateMembership(membership.id, { notes }); toast.success('Notes saved'); }}>Save notes</Button>
        </CardContent></Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
