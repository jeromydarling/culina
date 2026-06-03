import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Upload, FileCheck2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { listComplianceForTenant, getMembershipForTenant, addComplianceDoc } from '@/lib/store';
import { DOC_TYPES, DOC_TYPE_LABELS } from '@culina/shared';
import type { DocType } from '@culina/shared';
import { format } from 'date-fns';

export default function Documents() {
  const { profile } = useAuth();
  const membership = getMembershipForTenant(profile!.id);
  const force = useForceUpdate();
  const docs = listComplianceForTenant(profile!.id);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ doc_type: DocType; doc_name: string; expiration_date: string }>({ doc_type: 'food_handler_cert', doc_name: '', expiration_date: '' });

  function upload(e: React.FormEvent) {
    e.preventDefault();
    addComplianceDoc({
      tenant_id: profile!.id,
      kitchen_id: membership?.kitchen_id ?? '',
      membership_id: membership?.id ?? null,
      doc_type: form.doc_type,
      doc_name: form.doc_name || DOC_TYPE_LABELS[form.doc_type],
      expiration_date: form.expiration_date || null,
    });
    setOpen(false);
    force();
    toast.success('Document uploaded — pending operator review.');
  }

  return (
    <div>
      <PageHeader title="My Documents" description="Keep your certifications current to keep booking." action={<Button onClick={() => setOpen(true)}><Upload className="h-4 w-4" /> Upload document</Button>} />

      <div className="grid gap-4 sm:grid-cols-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /><h3 className="font-medium">{DOC_TYPE_LABELS[d.doc_type]}</h3></div>
                <div className="mt-1 text-xs text-muted-foreground">{d.doc_name ?? 'No file'}</div>
              </div>
              <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
            </div>
            {d.expiration_date && <div className="mt-3 text-sm text-muted-foreground">Expires {format(new Date(d.expiration_date), 'PP')}</div>}
            {d.reviewer_notes && <div className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">{d.reviewer_notes}</div>}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <form onSubmit={upload} className="space-y-3">
          <div>
            <Label>Document type</Label>
            <Select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value as DocType })}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
          <div><Label>File name</Label><Input value={form.doc_name} onChange={(e) => setForm({ ...form, doc_name: e.target.value })} placeholder="e.g. ServSafe 2026.pdf" /></div>
          <div><Label>Expiration date</Label><Input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} /></div>
          <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground"><Upload className="mx-auto mb-2 h-6 w-6" /> Drop a file here (demo — no upload needed)</div>
          <Button type="submit" className="w-full">Upload</Button>
        </form>
      </Modal>
    </div>
  );
}
