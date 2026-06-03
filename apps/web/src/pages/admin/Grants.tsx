import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { listGrants, upsertGrant, deleteGrant } from '@/lib/store';
import type { Grant } from '@culina/shared';

export default function Grants() {
  const force = useForceUpdate();
  const grants = listGrants();
  const [editing, setEditing] = React.useState<Partial<Grant> | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    upsertGrant(editing as Grant);
    setEditing(null);
    force();
    toast.success('Grant saved');
  }

  return (
    <div>
      <PageHeader title="Grant Management" description="Curate the funding database for makers." action={<Button onClick={() => setEditing({ grant_type: 'foundation', is_active: true })}><Plus className="h-4 w-4" /> Add grant</Button>} />
      <div className="space-y-2">
        {grants.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
            <div>
              <div className="font-medium">{g.title}</div>
              <div className="text-xs text-muted-foreground">{g.funder}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="muted">{g.grant_type}</Badge>
              <Button size="sm" variant="ghost" onClick={() => { deleteGrant(g.id); force(); toast.success('Deleted'); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit grant' : 'Add grant'}>
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <div><Label>Title</Label><Input required value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Funder</Label><Input value={editing.funder ?? ''} onChange={(e) => setEditing({ ...editing, funder: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Type</Label><Select value={editing.grant_type} onChange={(e) => setEditing({ ...editing, grant_type: e.target.value as Grant['grant_type'] })}><option value="federal">Federal</option><option value="state">State</option><option value="local">Local</option><option value="foundation">Foundation</option><option value="loan">Loan</option><option value="other">Other</option></Select></div>
              <div><Label>Application URL</Label><Input value={editing.application_url ?? ''} onChange={(e) => setEditing({ ...editing, application_url: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full">Save grant</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
