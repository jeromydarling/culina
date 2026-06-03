import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Globe } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listWhiteLabelConfigs, upsertWhiteLabelConfig } from '@/lib/store';
import { WHITE_LABEL_PRICE_CENTS, formatCents } from '@culina/shared';
import type { WhiteLabelConfig } from '@culina/shared';

export default function WhiteLabel() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  const configs = listWhiteLabelConfigs();
  const [editing, setEditing] = React.useState<Partial<WhiteLabelConfig> | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    upsertWhiteLabelConfig(editing as WhiteLabelConfig);
    setEditing(null);
    force();
    toast.success('White-label license saved');
  }

  return (
    <div>
      <PageHeader
        title="White-label Licensing"
        description="License Culina to universities, municipalities, and nonprofits under their own brand."
        action={<Button onClick={() => setEditing({ plan: 'pilot', primary_color: '#2D4A3E', is_active: true })}><Plus className="h-4 w-4" /> New license</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active licenses" value={String(configs.filter((c) => c.is_active).length)} icon={Globe} />
        <StatCard label="List price" value={`${formatCents(WHITE_LABEL_PRICE_CENTS)}/mo`} />
        <StatCard label="Licensing MRR" value={formatCents(configs.filter((c) => c.is_active).length * WHITE_LABEL_PRICE_CENTS)} />
      </div>

      <div className="mt-6 space-y-3">
        {configs.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg" style={{ background: c.primary_color }} />
              <div>
                <div className="font-medium">{c.brand_name} <span className="text-xs text-muted-foreground">by {c.org_name}</span></div>
                <div className="text-xs text-muted-foreground">{c.custom_domain ?? 'no custom domain'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="muted">{c.plan}</Badge>
              <Badge variant={c.is_active ? 'success' : 'muted'}>{c.is_active ? 'active' : 'inactive'}</Badge>
              <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit license' : 'New white-label license'}>
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <div><Label>Organization</Label><Input required value={editing.org_name ?? ''} onChange={(e) => setEditing({ ...editing, org_name: e.target.value })} placeholder="University Food Innovation Center" /></div>
            <div><Label>Brand name</Label><Input required value={editing.brand_name ?? ''} onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })} placeholder="HarvestHub" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Primary color</Label><input type="color" value={editing.primary_color ?? '#2D4A3E'} onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })} className="h-9 w-full rounded border" /></div>
              <div><Label>Plan</Label><Select value={editing.plan} onChange={(e) => setEditing({ ...editing, plan: e.target.value as WhiteLabelConfig['plan'] })}><option value="pilot">Pilot</option><option value="standard">Standard</option><option value="enterprise">Enterprise</option></Select></div>
            </div>
            <div><Label>Custom domain</Label><Input value={editing.custom_domain ?? ''} onChange={(e) => setEditing({ ...editing, custom_domain: e.target.value })} placeholder="kitchen.org.edu" /></div>
            <Button type="submit" className="w-full">Save license</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
