import * as React from 'react';
import { toast } from 'sonner';
import { KeyRound, Plus, Lock, DoorOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useForceUpdate } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getKitchenByOperator,
  listAccessCredentials,
  listAccessEvents,
  listMemberships,
  getTenantProfile,
  getProfile,
  upsertAccessCredential,
  revokeAccessCredential,
} from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function AccessControl() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const creds = listAccessCredentials(kitchen.id);
  const events = listAccessEvents(kitchen.id);
  const memberships = listMemberships(kitchen.id);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ tenant_id: memberships[0]?.tenant_id ?? '', lock_name: 'Main Entrance', schedule: '24/7' });

  const tenantName = (id: string | null) => (id ? getTenantProfile(id)?.business_name ?? getProfile(id)?.full_name : 'Shared');

  function issue(e: React.FormEvent) {
    e.preventDefault();
    upsertAccessCredential({ kitchen_id: kitchen.id, tenant_id: form.tenant_id, lock_name: form.lock_name, schedule: form.schedule });
    setOpen(false);
    force();
    toast.success('Access credential issued');
  }

  return (
    <div>
      <PageHeader
        title="Access Control"
        description="Issue smart-lock credentials per member and review the entry log. Integrates with keypad, fob, and app-based locks."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Issue credential</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Member</th><th className="p-3">Lock</th><th className="p-3">Code</th><th className="p-3">Schedule</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {creds.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{tenantName(c.tenant_id)}</td>
                  <td className="p-3"><span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-muted-foreground" />{c.lock_name}</span></td>
                  <td className="p-3 font-mono">{c.status === 'active' ? c.code : '••••'}</td>
                  <td className="p-3 text-muted-foreground">{c.schedule}</td>
                  <td className="p-3"><Badge variant={statusVariant(c.status)}>{c.status}</Badge></td>
                  <td className="p-3 text-right">
                    {c.status === 'active' && <Button size="sm" variant="ghost" onClick={() => { revokeAccessCredential(c.id); force(); toast.success('Credential revoked'); }}>Revoke</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-accent" /> Recent access</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tenantName(e.tenant_id)}</span>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                </div>
                <div className="text-xs text-muted-foreground">{e.lock_name} · {e.event}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Issue access credential">
        <form onSubmit={issue} className="space-y-3">
          <div>
            <Label>Member</Label>
            <Select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
              {memberships.map((m) => <option key={m.tenant_id} value={m.tenant_id}>{getTenantProfile(m.tenant_id)?.business_name ?? getProfile(m.tenant_id)?.full_name}</option>)}
            </Select>
          </div>
          <div><Label>Lock / door</Label><Input value={form.lock_name} onChange={(e) => setForm({ ...form, lock_name: e.target.value })} /></div>
          <div><Label>Access schedule</Label><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. Mon–Fri 7am–9pm" /></div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground"><KeyRound className="h-4 w-4" /> A unique entry code is generated automatically.</div>
          <Button type="submit" className="w-full">Issue credential</Button>
        </form>
      </Modal>
    </div>
  );
}
