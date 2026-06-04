import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Plus, Send, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import {
  getKitchenByOperator,
  listInvoices,
  listMemberships,
  getTenantProfile,
  getProfile,
  createInvoice,
  updateInvoice,
} from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatCents, platformFeeCents } from '@culina/shared';
import { format } from 'date-fns';

export default function Invoices() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const memberships = listMemberships(kitchen.id);
  const force = useForceUpdate();
  const invoices = listInvoices(kitchen.id);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ tenant_id: memberships[0]?.tenant_id ?? '', description: 'Monthly membership', amount: '600', due: '' });

  function create(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(form.amount) * 100);
    createInvoice({
      kitchen_id: kitchen.id,
      membership_id: memberships.find((m) => m.tenant_id === form.tenant_id)?.id ?? null,
      tenant_id: form.tenant_id,
      period_start: null,
      period_end: null,
      line_items: [{ description: form.description, qty: 1, unit_price: Number(form.amount), total: Number(form.amount) }],
      subtotal_cents: cents,
      tax_cents: 0,
      total_cents: cents + platformFeeCents(cents),
      platform_fee_cents: platformFeeCents(cents),
      status: 'draft',
      due_date: form.due || null,
      stripe_invoice_id: null,
      paid_at: null,
      notes: null,
    });
    setOpen(false);
    force();
    toast.success('Invoice created');
  }

  // Email the invoice to its tenant (live) or simulate (demo), then mark sent.
  const [sending, setSending] = React.useState<string | null>(null);
  async function sendInvoice(id: string) {
    setSending(id);
    try {
      if (isLive()) await dataApi.sendInvoice(id);
      updateInvoice(id, { status: 'sent' });
      force();
      toast.success(isLive() ? 'Invoice emailed to tenant' : 'Invoice sent (demo)');
    } catch (err) {
      notifyError(err);
    } finally {
      setSending(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices & Billing"
        description="Create, send, and track invoices. The 1.5% platform fee is shown on each."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create invoice</Button>}
      />

      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Create your first invoice or auto-generate from bookings." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create invoice</Button>} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Invoice</th><th className="p-3">Tenant</th><th className="p-3">Due</th><th className="p-3">Fee</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const tp = getTenantProfile(inv.tenant_id);
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-3">{tp?.business_name ?? getProfile(inv.tenant_id)?.full_name}</td>
                    <td className="p-3 text-muted-foreground">{inv.due_date ? format(new Date(inv.due_date), 'MMM d') : '—'}</td>
                    <td className="p-3 text-muted-foreground">{formatCents(inv.platform_fee_cents)}</td>
                    <td className="p-3 font-medium">{formatCents(inv.total_cents)}</td>
                    <td className="p-3"><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></td>
                    <td className="p-3 text-right">
                      {inv.status === 'draft' && <Button size="sm" variant="outline" disabled={sending === inv.id} onClick={() => sendInvoice(inv.id)}><Send className="h-3 w-3" /> {sending === inv.id ? 'Sending…' : 'Send'}</Button>}
                      {(inv.status === 'sent' || inv.status === 'overdue') && <Button size="sm" variant="outline" onClick={() => { updateInvoice(inv.id, { status: 'paid', paid_at: new Date().toISOString() }); force(); toast.success('Marked paid'); }}><Check className="h-3 w-3" /> Mark paid</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create invoice">
        <form onSubmit={create} className="space-y-3">
          <div>
            <Label>Tenant</Label>
            <Select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
              {memberships.map((m) => <option key={m.tenant_id} value={m.tenant_id}>{getTenantProfile(m.tenant_id)?.business_name ?? getProfile(m.tenant_id)?.full_name}</option>)}
            </Select>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>
          </div>
          <Button type="submit" className="w-full">Create draft</Button>
        </form>
      </Modal>
    </div>
  );
}
