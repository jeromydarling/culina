import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { HeartPulse, Send, Search, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StatCard, EmptyState, Tabs } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  getKitchenByOperator,
  listMemberships,
  listBookings,
  listInvoicesForTenant,
  listComplianceForTenant,
  getTenantProfile,
  getProfile,
  getMembershipForTenant,
  updateMembership,
} from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { memberHealth, BAND_LABEL, suggestOutreach, type HealthBand, type MemberHealth } from '@/lib/retention';

const bandVariant: Record<HealthBand, BadgeProps['variant']> = {
  healthy: 'success',
  watch: 'warning',
  at_risk: 'destructive',
};

interface Row {
  tenantId: string;
  name: string;
  business: string | null;
  email: string;
  health: MemberHealth;
}

export default function Retention() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const [tab, setTab] = React.useState<'all' | HealthBand>('all');
  const [query, setQuery] = React.useState('');
  const [reachOut, setReachOut] = React.useState<Row | null>(null);

  const rows: Row[] = React.useMemo(() => {
    return listMemberships(kitchen.id)
      .filter((m) => m.status !== 'graduated') // graduated = a happy exit, not churn
      .map((m) => {
        const tp = getTenantProfile(m.tenant_id);
        const p = getProfile(m.tenant_id);
        return {
          tenantId: m.tenant_id,
          name: p?.full_name ?? tp?.business_name ?? 'Member',
          business: tp?.business_name ?? null,
          email: p?.email ?? '',
          health: memberHealth({
            membership: m,
            bookings: listBookings({ kitchenId: kitchen.id, tenantId: m.tenant_id }),
            invoices: listInvoicesForTenant(m.tenant_id),
            docs: listComplianceForTenant(m.tenant_id),
            tenantProfile: tp,
          }),
        };
      })
      .sort((a, b) => a.health.score - b.health.score); // worst first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchen.id, reachOut]);

  const counts = {
    all: rows.length,
    healthy: rows.filter((r) => r.health.band === 'healthy').length,
    watch: rows.filter((r) => r.health.band === 'watch').length,
    at_risk: rows.filter((r) => r.health.band === 'at_risk').length,
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (tab === 'all' || r.health.band === tab) &&
      (!q || `${r.name} ${r.business ?? ''} ${r.email}`.toLowerCase().includes(q)),
  );

  return (
    <div>
      <PageHeader
        title="Retention"
        description="A health read on every member so you can reach the ones who need a human touch — before they quietly drift away."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Members" value={String(counts.all)} icon={HeartPulse} />
        <StatCard label="Healthy" value={String(counts.healthy)} hint="in a good rhythm" />
        <StatCard label="Watch" value={String(counts.watch)} hint="worth an eye" />
        <StatCard label="At risk" value={String(counts.at_risk)} hint={counts.at_risk ? 'reach out today' : 'none — nice'} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'at_risk', label: `At risk (${counts.at_risk})` },
            { id: 'watch', label: `Watch (${counts.watch})` },
            { id: 'healthy', label: `Healthy (${counts.healthy})` },
          ]}
          active={tab}
          onChange={(t) => setTab(t as typeof tab)}
        />
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 shadow-card sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a member"
            className="flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={HeartPulse} title="No members here" description="When members join, their health shows up here." />
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.tenantId} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-3 sm:w-64 sm:shrink-0">
                <ScoreRing score={r.health.score} band={r.health.band} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.business ?? r.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.name}</div>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                <Badge variant={bandVariant[r.health.band]}>{BAND_LABEL[r.health.band]}</Badge>
                {r.health.reasons.slice(0, 3).map((reason) => (
                  <span key={reason} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{reason}</span>
                ))}
                {r.health.reasons.length === 0 && <span className="text-xs text-muted-foreground">In a good rhythm 🌿</span>}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link to={`/operator/tenants/${r.tenantId}`} className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1">
                  <LinkIcon className="h-3.5 w-3.5" /> View
                </Link>
                <Button size="sm" variant={r.health.band === 'healthy' ? 'outline' : 'default'} onClick={() => setReachOut(r)}>
                  <Send className="h-4 w-4" /> Reach out
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReachOutModal row={reachOut} onClose={() => setReachOut(null)} onSent={force} />
    </div>
  );
}

function ScoreRing({ score, band }: { score: number; band: HealthBand }) {
  const color = band === 'healthy' ? 'text-emerald-600' : band === 'watch' ? 'text-amber-500' : 'text-red-500';
  const ringColor = band === 'healthy' ? '#059669' : band === 'watch' ? '#f59e0b' : '#ef4444';
  return (
    <div
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold"
      style={{ background: `conic-gradient(${ringColor} ${score * 3.6}deg, #e5e7eb 0deg)` }}
      aria-label={`Health score ${score}`}
    >
      <div className={`grid h-8 w-8 place-items-center rounded-full bg-card ${color}`}>{score}</div>
    </div>
  );
}

function ReachOutModal({ row, onClose, onSent }: { row: Row | null; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (row) {
      const draft = suggestOutreach(row.name, row.health);
      setSubject(draft.subject);
      setMessage(draft.message);
    }
  }, [row]);

  if (!row) return null;

  async function send() {
    if (!message.trim()) return toast.error('Write a message first.');
    setSending(true);
    try {
      if (isLive()) {
        await dataApi.contactMember(row!.tenantId, subject, message);
      }
      // Log the touch locally so the note shows immediately (and persists in demo).
      const line = `[${new Date().toISOString().slice(0, 10)}] Reached out: ${subject}`;
      const m = getMembershipForTenant(row!.tenantId);
      if (m) updateMembership(m.id, { notes: m.notes ? `${m.notes}\n${line}` : line });
      toast.success(isLive() ? `Your note is on its way to ${row!.name.split(' ')[0]}` : 'Note sent (demo)');
      onSent();
      onClose();
    } catch (e) {
      notifyError(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={!!row} onClose={onClose} title={`Reach out to ${row.name}`} description="A warm, personal note — replies come straight to your inbox.">
      <div className="space-y-3">
        {row.health.reasons.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Why now: {row.health.reasons.slice(0, 2).join(' · ')}
          </div>
        )}
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
        <Button className="w-full" disabled={sending} onClick={send}>
          <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send note'}
        </Button>
      </div>
    </Modal>
  );
}

