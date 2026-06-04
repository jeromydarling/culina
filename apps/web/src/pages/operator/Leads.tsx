import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Mail, Phone, Plus, Search, Send, UserPlus, HeartHandshake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { getKitchenByOperator, listLeads, updateLead, createLead } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { LEAD_STAGES } from '@culina/shared';
import type { Lead, LeadStatus } from '@culina/shared';
import { format } from 'date-fns';

// Warm, relational labels — these are people reaching out, not a sales funnel.
const stageLabels: Record<LeadStatus, string> = {
  new: 'Reached out',
  contacted: 'In conversation',
  toured: 'Visited',
  converted: 'Joined',
  lost: 'Not now',
};

const stageColor: Record<LeadStatus, string> = {
  new: 'border-t-sky-500',
  contacted: 'border-t-amber-500',
  toured: 'border-t-accent',
  converted: 'border-t-emerald-500',
  lost: 'border-t-red-400',
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function Leads() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const leads = listLeads(kitchen.id);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  // ── A read on your relationships (not a funnel) ───────────────────────
  const total = leads.length;
  const converted = leads.filter((l) => l.status === 'converted').length;
  const newCount = leads.filter((l) => l.status === 'new').length;
  const inConversation = leads.filter((l) => l.status === 'contacted' || l.status === 'toured').length;

  const q = query.trim().toLowerCase();
  const visible = q
    ? leads.filter((l) => `${l.full_name} ${l.business_name ?? ''} ${l.email} ${l.business_type ?? ''}`.toLowerCase().includes(q))
    : leads;

  function move(lead: Lead, status: LeadStatus) {
    updateLead(lead.id, { status });
    force();
  }

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="The people who’ve reached out about your kitchen. Get to know them, stay in touch, and welcome the right ones in."
        action={<Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Add someone</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People reaching out" value={total} />
        <Stat label="Awaiting a reply" value={newCount} hint={newCount ? 'a quick hello goes a long way' : 'all caught up'} />
        <Stat label="In conversation" value={inConversation} />
        <Stat label="Joined" value={converted} />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find someone by name, business, or email"
          className="flex-1 bg-transparent py-2.5 text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {LEAD_STAGES.map((stage) => {
          const items = visible.filter((l) => l.status === stage);
          return (
            <div key={stage} className="rounded-lg bg-muted/40 p-2">
              <div className={`mb-2 rounded-md border-t-4 bg-card px-3 py-2 ${stageColor[stage]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{stageLabels[stage]}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <button key={l.id} onClick={() => setSelectedId(l.id)} className="w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-card-hover">
                    <div className="text-sm font-medium">{l.business_name ?? l.full_name}</div>
                    <div className="text-xs text-muted-foreground">{l.full_name}</div>
                    {l.business_type && <Badge variant="muted" className="mt-1">{l.business_type}</Badge>}
                    {l.follow_up_date && <div className="mt-1 text-[11px] font-medium text-amber-600">check in {format(new Date(l.follow_up_date), 'MMM d')}</div>}
                  </button>
                ))}
                {items.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.business_name ?? selected?.full_name}>
        {selected && <LeadDetail key={selected.id} lead={selected} kitchenName={kitchen.name} onChange={force} onMove={(s) => move(selected, s)} />}
      </Modal>

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} kitchenId={kitchen.id} onAdded={force} />
    </div>
  );
}

/* ─────────────────────────── Lead detail ─────────────────────────── */
function LeadDetail({
  lead,
  kitchenName,
  onChange,
  onMove,
}: {
  lead: Lead;
  kitchenName: string;
  onChange: () => void;
  onMove: (s: LeadStatus) => void;
}) {
  const [businessType, setBusinessType] = React.useState(lead.business_type ?? '');
  const [followUp, setFollowUp] = React.useState(lead.follow_up_date?.slice(0, 10) ?? '');
  const [notes, setNotes] = React.useState(lead.notes ?? '');
  const [subject, setSubject] = React.useState(`Re: your inquiry about ${kitchenName}`);
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [membershipType, setMembershipType] = React.useState('monthly');
  const [welcoming, setWelcoming] = React.useState(false);

  function saveDetails() {
    updateLead(lead.id, { business_type: businessType || null, follow_up_date: followUp || null, notes: notes || null });
    onChange();
    toast.success('Lead updated');
  }

  async function sendEmail() {
    if (!message.trim()) return toast.error('Write a message first.');
    setSending(true);
    try {
      if (isLive()) {
        const r = await dataApi.contactLead(lead.id, subject, message);
        updateLead(lead.id, { status: r.lead.status, notes: r.lead.notes });
        setNotes(r.lead.notes ?? '');
      } else {
        const log = `[${new Date().toISOString().slice(0, 10)}] Emailed: ${subject}`;
        const next = lead.notes ? `${lead.notes}\n${log}` : log;
        updateLead(lead.id, { status: lead.status === 'new' ? 'contacted' : lead.status, notes: next });
        setNotes(next);
      }
      setMessage('');
      onChange();
      toast.success(isLive() ? 'Your note is on its way' : 'Note sent (demo)');
    } catch (e) {
      notifyError(e);
    } finally {
      setSending(false);
    }
  }

  async function welcomeIn() {
    setWelcoming(true);
    try {
      if (isLive()) {
        const r = await dataApi.convertLead(lead.id, membershipType);
        updateLead(lead.id, { status: 'converted', converted_membership_id: r.lead.converted_membership_id ?? null, notes: r.lead.notes });
        toast.success(r.mode === 'added' ? `${lead.full_name.split(' ')[0]} is now a member 🎉` : `Invitation on its way to ${lead.full_name.split(' ')[0]}`);
      } else {
        updateLead(lead.id, { status: 'converted' });
        toast.success('Invitation sent (demo)');
      }
      onChange();
    } catch (e) {
      notifyError(e);
    } finally {
      setWelcoming(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Contact */}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {lead.email}</div>
        {lead.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}</div>}
        <div className="text-xs text-muted-foreground">
          Source: {lead.source ?? 'unknown'} · Added {format(new Date(lead.created_at), 'MMM d, yyyy')}
        </div>
      </div>
      {lead.message && <p className="rounded-lg bg-muted/50 p-3 text-sm">{lead.message}</p>}

      {/* Where things stand */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where things stand</div>
        <div className="flex flex-wrap gap-2">
          {LEAD_STAGES.map((s) => (
            <Button key={s} size="sm" variant={lead.status === s ? 'default' : 'outline'} onClick={() => onMove(s)}>
              {stageLabels[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Welcome them in */}
      {lead.status === 'converted' ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <HeartHandshake className="h-4 w-4 shrink-0" />
          {lead.converted_membership_id ? 'Now part of your kitchen 🎉' : 'Invitation sent — they’ll appear in your members once they join.'}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-900"><HeartHandshake className="h-4 w-4" /> Welcome them in</div>
          <p className="mb-2 text-xs text-muted-foreground">Make them a member. If they don’t have an account yet, we’ll send a warm invitation to join.</p>
          <div className="flex gap-2">
            <Select value={membershipType} onChange={(e) => setMembershipType(e.target.value)} className="flex-1">
              <option value="monthly">Monthly membership</option>
              <option value="hourly">Hourly / pay-as-you-go</option>
              <option value="annual">Annual membership</option>
            </Select>
            <Button disabled={welcoming} onClick={welcomeIn}>{welcoming ? 'Sending…' : 'Welcome in'}</Button>
          </div>
        </div>
      )}

      {/* Send a note */}
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-accent" /> Send a note</div>
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A quick, personal hello. Their replies come straight to your inbox." rows={3} />
          <Button className="w-full" disabled={sending} onClick={sendEmail}>
            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send note'}
          </Button>
        </div>
      </div>

      {/* Details + notes */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Business type</Label><Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. bakery" /></div>
          <div><Label>Follow-up date</Label><Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></div>
        </div>
        <div>
          <Label>Notes &amp; activity</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Call notes, next steps, email log…" />
        </div>
        <Button variant="outline" className="w-full" onClick={saveDetails}>Save details</Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Add lead ─────────────────────────── */
function AddLeadModal({ open, onClose, kitchenId, onAdded }: { open: boolean; onClose: () => void; kitchenId: string; onAdded: () => void }) {
  const [form, setForm] = React.useState({ full_name: '', email: '', phone: '', business_name: '', business_type: '', message: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return toast.error('Name and email are required.');
    createLead({
      kitchen_id: kitchenId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone || null,
      business_name: form.business_name || null,
      business_type: form.business_type || null,
      message: form.message || null,
      source: 'manual',
    });
    setForm({ full_name: '', email: '', phone: '', business_name: '', business_type: '', message: '' });
    onClose();
    onAdded();
    toast.success('Added to your inquiries');
  }

  return (
    <Modal open={open} onClose={onClose} title="Add someone">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Business</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
        </div>
        <div><Label>Business type</Label><Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="e.g. caterer" /></div>
        <div><Label>Notes</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How did they reach out? What do they need?" /></div>
        <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Add them</Button>
      </form>
    </Modal>
  );
}
