import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Mail, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getKitchenByOperator, listLeads, updateLead } from '@/lib/store';
import { LEAD_STAGES } from '@culina/shared';
import type { Lead, LeadStatus } from '@culina/shared';
import { format } from 'date-fns';

const stageLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  toured: 'Toured',
  converted: 'Converted',
  lost: 'Lost',
};

const stageColor: Record<LeadStatus, string> = {
  new: 'border-t-sky-500',
  contacted: 'border-t-amber-500',
  toured: 'border-t-accent',
  converted: 'border-t-emerald-500',
  lost: 'border-t-red-400',
};

export default function Leads() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const leads = listLeads(kitchen.id);
  const [selected, setSelected] = React.useState<Lead | null>(null);

  function move(lead: Lead, status: LeadStatus) {
    updateLead(lead.id, { status });
    force();
    if (status === 'converted') toast.success('Lead converted — membership draft created.');
  }

  return (
    <div>
      <PageHeader title="Leads CRM" description="Drag leads through your pipeline. Public inquiries land in “New”." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {LEAD_STAGES.map((stage) => {
          const items = leads.filter((l) => l.status === stage);
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
                  <button key={l.id} onClick={() => setSelected(l)} className="w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-card-hover">
                    <div className="text-sm font-medium">{l.business_name ?? l.full_name}</div>
                    <div className="text-xs text-muted-foreground">{l.full_name}</div>
                    {l.business_type && <Badge variant="muted" className="mt-1">{l.business_type}</Badge>}
                    {l.follow_up_date && <div className="mt-1 text-[11px] text-muted-foreground">follow up {format(new Date(l.follow_up_date), 'MMM d')}</div>}
                  </button>
                ))}
                {items.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.business_name ?? selected?.full_name}>
        {selected && (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {selected.email}</div>
              {selected.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {selected.phone}</div>}
              <div className="text-muted-foreground">Source: {selected.source}</div>
            </div>
            {selected.message && <p className="rounded-lg bg-muted/50 p-3 text-sm">{selected.message}</p>}
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move to stage</div>
              <div className="flex flex-wrap gap-2">
                {LEAD_STAGES.map((s) => (
                  <Button key={s} size="sm" variant={selected.status === s ? 'default' : 'outline'} onClick={() => { move(selected, s); setSelected({ ...selected, status: s }); }}>
                    {stageLabels[s]}
                  </Button>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => toast.success('Follow-up email sent (demo).')}>
              <Mail className="h-4 w-4" /> Send follow-up email
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
