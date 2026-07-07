import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Search, Mail, Phone, Globe, MapPin, ExternalLink, Users2, DollarSign, ShieldAlert, Plus, Tag, PhoneCall, CalendarClock, StickyNote, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StatCard, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { UsMap, type MapPoint } from '@/components/UsMap';
import {
  listKitchens,
  getProfile,
  listMemberships,
  listBookings,
  listInvoicesForTenant,
  listComplianceForTenant,
  getTenantProfile,
} from '@/lib/store';
import { memberHealth } from '@/lib/retention';
import {
  useCrm,
  initCrm,
  getCrm,
  addActivity,
  setStatus,
  toggleTag,
  addTask,
  toggleTask,
  openTasks,
  STATE_CENTROIDS,
  CRM_STATUS_LABEL,
  ACTIVITY_LABEL,
  type CrmStatus,
  type ActivityKind,
} from '@/lib/crm';
import { formatCents } from '@culina/shared';
import type { Kitchen } from '@culina/shared';

interface Customer {
  kitchen: Kitchen;
  operatorName: string;
  operatorEmail: string;
  members: number;
  active: number;
  atRisk: number;
  lat: number | null;
  lng: number | null;
}

const statusColor: Record<CrmStatus, string> = {
  prospect: '#6366f1',
  active: '#059669',
  at_risk: '#f59e0b',
  churned: '#ef4444',
};
const statusVariantMap: Record<CrmStatus, BadgeProps['variant']> = {
  prospect: 'default',
  active: 'success',
  at_risk: 'warning',
  churned: 'destructive',
};

/** Health that drives the pin color / default status when none is set. */
function inferStatus(c: Customer, explicit: CrmStatus | null): CrmStatus {
  if (explicit) return explicit;
  if (c.active === 0 && c.members === 0) return 'prospect';
  if (c.atRisk > 0) return 'at_risk';
  return 'active';
}

export default function Crm() {
  const { profile } = useAuth();
  useCrm(); // re-render on any CRM change
  React.useEffect(() => {
    if (profile) initCrm(profile.id); // sets author + loads from D1 (live)
  }, [profile]);
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | CrmStatus>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const customers: Customer[] = React.useMemo(() => {
    return listKitchens().map((kitchen) => {
      const memberships = listMemberships(kitchen.id).filter((m) => m.status !== 'graduated');
      const atRisk = memberships.filter((m) => {
        const h = memberHealth({
          membership: m,
          bookings: listBookings({ kitchenId: kitchen.id, tenantId: m.tenant_id }),
          invoices: listInvoicesForTenant(m.tenant_id),
          docs: listComplianceForTenant(m.tenant_id),
          tenantProfile: getTenantProfile(m.tenant_id),
        });
        return h.band === 'at_risk';
      }).length;
      const operator = getProfile(kitchen.operator_id);
      const centroid = kitchen.state ? STATE_CENTROIDS[kitchen.state.toUpperCase()] : undefined;
      return {
        kitchen,
        operatorName: operator?.full_name ?? '—',
        operatorEmail: operator?.email ?? kitchen.email ?? '',
        members: memberships.length,
        active: memberships.filter((m) => m.status === 'active').length,
        atRisk,
        lat: kitchen.latitude ?? centroid?.[0] ?? null,
        lng: kitchen.longitude ?? centroid?.[1] ?? null,
      };
    });
  }, []);

  const crmStatus = (id: string) => getCrm(id).status;
  const q = query.trim().toLowerCase();
  const visible = customers.filter((c) => {
    const eff = inferStatus(c, crmStatus(c.kitchen.id));
    return (
      (filter === 'all' || eff === filter) &&
      (!q || `${c.kitchen.name} ${c.kitchen.city ?? ''} ${c.kitchen.state ?? ''} ${c.operatorName} ${c.operatorEmail}`.toLowerCase().includes(q))
    );
  });

  const points: MapPoint[] = customers
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      id: c.kitchen.id,
      lat: c.lat!,
      lng: c.lng!,
      label: c.kitchen.name,
      sub: [c.kitchen.city, c.kitchen.state].filter(Boolean).join(', '),
      color: statusColor[inferStatus(c, crmStatus(c.kitchen.id))],
    }));

  const totalMrr = customers.reduce((s, c) => s + (c.active > 0 ? c.kitchen.monthly_price_cents : 0), 0);
  const withRisk = customers.filter((c) => c.atRisk > 0).length;
  const selected = customers.find((c) => c.kitchen.id === selectedId) ?? null;
  const nameById = React.useMemo(() => new Map(customers.map((c) => [c.kitchen.id, c.kitchen.name])), [customers]);

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Every kitchen you serve — who they are, how they're doing, where they are, and every conversation you've had."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Customers" value={String(customers.length)} icon={Building2} />
        <StatCard label="Active" value={String(customers.filter((c) => c.active > 0).length)} icon={Users2} />
        <StatCard label="With at-risk members" value={String(withRisk)} icon={ShieldAlert} hint={withRisk ? 'worth a check-in' : 'all steady'} />
        <StatCard label="MRR" value={formatCents(totalMrr)} icon={DollarSign} hint="active plans" />
      </div>

      <FollowUps nameById={nameById} onOpen={setSelectedId} />

      <div className="mb-6 rounded-lg border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading font-semibold">Where your customers are</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(['active', 'at_risk', 'prospect', 'churned'] as CrmStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor[s] }} /> {CRM_STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>
        <UsMap points={points} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'active', 'at_risk', 'prospect', 'churned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {f === 'all' ? 'All' : CRM_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 shadow-card sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a customer, city, or operator" className="flex-1 bg-transparent py-2 text-sm outline-none" />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Building2} title="No customers here" description="Try a different filter or search." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Customer</th><th className="p-3">Location</th><th className="p-3">Members</th>
                <th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Last touch</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const crm = getCrm(c.kitchen.id);
                const eff = inferStatus(c, crm.status);
                return (
                  <tr key={c.kitchen.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/30" onClick={() => setSelectedId(c.kitchen.id)}>
                    <td className="p-3">
                      <div className="font-medium">{c.kitchen.name}</div>
                      <div className="text-xs text-muted-foreground">{c.operatorName}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{[c.kitchen.city, c.kitchen.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="p-3">{c.members}{c.atRisk > 0 && <span className="ml-1 text-xs font-medium text-amber-600">· {c.atRisk} at risk</span>}</td>
                    <td className="p-3">{formatCents(c.kitchen.monthly_price_cents)}/mo</td>
                    <td className="p-3"><Badge variant={statusVariantMap[eff]}>{CRM_STATUS_LABEL[eff]}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{crm.lastContacted ? formatDistanceToNow(new Date(crm.lastContacted), { addSuffix: true }) : '—'}</td>
                    <td className="p-3 text-right text-sm font-medium text-primary">Open →</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

/* ─────────────────────────── Follow-ups surface ─────────────────────────── */
function FollowUps({ nameById, onOpen }: { nameById: Map<string, string>; onOpen: (id: string) => void }) {
  const db = useCrm();
  const tasks = openTasks(db);
  if (tasks.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const groups: [string, typeof tasks, string][] = [
    ['Overdue', tasks.filter((t) => t.task.dueDate && t.task.dueDate < today), 'text-red-600'],
    ['Due today', tasks.filter((t) => t.task.dueDate === today), 'text-amber-600'],
    ['Upcoming', tasks.filter((t) => !t.task.dueDate || t.task.dueDate > today), 'text-muted-foreground'],
  ];
  const overdue = groups[0][1].length;
  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h2 className="font-heading font-semibold">Follow-ups</h2>
        <span className="text-xs text-muted-foreground">{tasks.length} open{overdue ? ` · ${overdue} overdue` : ''}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {groups.map(([label, items, color]) => (
          <div key={label}>
            <div className={`mb-1.5 text-xs font-semibold uppercase tracking-wider ${color}`}>{label} ({items.length})</div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1.5">
                {items.slice(0, 6).map(({ kitchenId, task }) => (
                  <div key={task.id} className="flex items-start gap-2 rounded-md border p-2">
                    <button onClick={() => toggleTask(kitchenId, task.id)} aria-label="Mark done" className="mt-0.5 text-muted-foreground hover:text-emerald-600"><Circle className="h-4 w-4" /></button>
                    <button onClick={() => onOpen(kitchenId)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium">{task.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{nameById.get(kitchenId) ?? 'Customer'}{task.dueDate ? ` · ${task.dueDate}` : ''}</div>
                    </button>
                  </div>
                ))}
                {items.length > 6 && <p className="text-[11px] text-muted-foreground">+{items.length - 6} more</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Customer detail ─────────────────────────── */
function CustomerDrawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  useCrm();
  const [tag, setTag] = React.useState('');
  const [kind, setKind] = React.useState<ActivityKind>('note');
  const [body, setBody] = React.useState('');
  const [taskTitle, setTaskTitle] = React.useState('');
  const [taskDue, setTaskDue] = React.useState('');
  if (!customer) return null;
  const k = customer.kitchen;
  const crm = getCrm(k.id);

  const email = customer.operatorEmail || k.email || '';
  const mailto = email ? `mailto:${email}?subject=${encodeURIComponent(`A note from the Culina team about ${k.name}`)}` : undefined;

  function logActivity() {
    if (!body.trim()) return toast.error('Add a few words first.');
    addActivity(k.id, kind, body.trim());
    setBody('');
    toast.success(`${ACTIVITY_LABEL[kind]} logged`);
  }

  return (
    <Modal open={!!customer} onClose={onClose} title={k.name} description={[k.city, k.state].filter(Boolean).join(', ') || undefined}>
      <div className="space-y-5">
        {/* status pipeline */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {(['prospect', 'active', 'at_risk', 'churned'] as CrmStatus[]).map((s) => (
              <Button key={s} size="sm" variant={inferStatus(customer, crm.status) === s ? 'default' : 'outline'} onClick={() => setStatus(k.id, s)}>
                {CRM_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* health snapshot */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Snap label="Members" value={String(customer.members)} />
          <Snap label="Active" value={String(customer.active)} />
          <Snap label="At risk" value={String(customer.atRisk)} tone={customer.atRisk > 0 ? 'warn' : undefined} />
        </div>

        {/* contact + quick actions */}
        <div className="rounded-lg border p-3 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</div>
          <div className="space-y-1.5">
            <Row icon={Users2} value={customer.operatorName} />
            {email && <Row icon={Mail} value={email} />}
            {(k.phone) && <Row icon={Phone} value={k.phone} />}
            {k.website && <Row icon={Globe} value={k.website} />}
            {(k.address || k.city) && <Row icon={MapPin} value={[k.address, k.city, k.state, k.zip].filter(Boolean).join(', ')} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mailto && <a href={mailto}><Button size="sm" variant="outline" onClick={() => addActivity(k.id, 'email', `Emailed ${email}`)}><Mail className="h-4 w-4" /> Email</Button></a>}
            {k.phone && <a href={`tel:${k.phone}`}><Button size="sm" variant="outline" onClick={() => addActivity(k.id, 'call', `Called ${k.phone}`)}><PhoneCall className="h-4 w-4" /> Call</Button></a>}
            <Link to={`/kitchen/${k.slug}`} target="_blank"><Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /> View kitchen</Button></Link>
          </div>
        </div>

        {/* tags */}
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Tag className="h-3 w-3" /> Tags</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {crm.tags.map((t) => (
              <button key={t} onClick={() => toggleTag(k.id, t)} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent hover:line-through">{t} ✕</button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); toggleTag(k.id, tag); setTag(''); }} className="flex items-center gap-1">
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="add tag" className="w-24 rounded-full border px-2.5 py-0.5 text-xs outline-none" />
            </form>
          </div>
        </div>

        {/* follow-ups */}
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ListChecks className="h-3 w-3" /> Follow-ups</div>
          <div className="space-y-1.5">
            {crm.tasks.length === 0 && <p className="text-xs text-muted-foreground">No follow-ups yet — add a reminder so this customer never slips.</p>}
            {crm.tasks
              .slice()
              .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
              .map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-md border p-2">
                  <button onClick={() => toggleTask(k.id, t.id)} aria-label="Toggle done">
                    {t.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${t.done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{t.title}</div>
                    {t.dueDate && !t.done && <div className={`text-[11px] ${t.dueDate < new Date().toISOString().slice(0, 10) ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>Due {t.dueDate}</div>}
                  </div>
                </div>
              ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addTask(k.id, taskTitle, taskDue || null); setTaskTitle(''); setTaskDue(''); }} className="mt-2 flex gap-2">
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add a follow-up…" />
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-40" />
            <Button type="submit"><Plus className="h-4 w-4" /></Button>
          </form>
        </div>

        {/* log activity */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log an interaction</div>
          <div className="flex gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className="w-32">
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </Select>
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened?" onKeyDown={(e) => { if (e.key === 'Enter') logActivity(); }} />
            <Button onClick={logActivity}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* timeline */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</div>
          {crm.activities.length === 0 ? (
            <p className="rounded-lg bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground">No history yet — log your first call, email, or note above.</p>
          ) : (
            <div className="space-y-2">
              {crm.activities.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-lg border p-2.5">
                  <div className="mt-0.5 shrink-0">{activityIcon(a.kind)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{ACTIVITY_LABEL[a.kind]}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-foreground/90">{a.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Snap({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className={`rounded-lg border p-2 ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'bg-muted/30'}`}>
      <div className={`font-heading text-lg font-bold ${tone === 'warn' ? 'text-amber-700' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> <span className="truncate">{value}</span></div>;
}

function activityIcon(kind: ActivityKind) {
  const cls = 'h-4 w-4 text-muted-foreground';
  if (kind === 'call') return <PhoneCall className={cls} />;
  if (kind === 'email') return <Mail className={cls} />;
  if (kind === 'meeting') return <CalendarClock className={cls} />;
  if (kind === 'status') return <ShieldAlert className={cls} />;
  return <StickyNote className={cls} />;
}
