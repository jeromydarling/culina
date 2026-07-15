import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import {
  getKitchenByOperator,
  listMemberships,
  listComplianceForKitchen,
  getTenantProfile,
  getProfile,
  updateComplianceDoc,
} from '@/lib/store';
import { DOC_TYPES, DOC_TYPE_LABELS } from '@culina/shared';
import type { ComplianceDocument, DocType, DocStatus } from '@culina/shared';
import { format } from 'date-fns';

const requiredDocs: DocType[] = ['food_handler_cert', 'liability_insurance', 'health_permit', 'business_license'];

function cellState(doc?: ComplianceDocument): { color: string; label: string } {
  if (!doc) return { color: 'bg-gray-100 text-gray-400', label: '—' };
  if (doc.status === 'expired' || doc.status === 'rejected') return { color: 'bg-red-100 text-red-700', label: 'Expired' };
  if (doc.status === 'pending_review') return { color: 'bg-amber-100 text-amber-700', label: 'Pending' };
  if (doc.expiration_date && new Date(doc.expiration_date) < new Date(Date.now() + 30 * 864e5)) return { color: 'bg-amber-100 text-amber-700', label: 'Expiring' };
  return { color: 'bg-emerald-100 text-emerald-700', label: 'Valid' };
}

export default function Compliance() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const memberships = listMemberships(kitchen.id);
  const force = useForceUpdate();
  const docs = listComplianceForKitchen(kitchen.id);
  const [editing, setEditing] = React.useState<{ doc: ComplianceDocument } | null>(null);

  const find = (tenantId: string, type: DocType) => docs.find((d) => d.tenant_id === tenantId && d.doc_type === type);

  function review(status: DocStatus) {
    if (!editing) return;
    updateComplianceDoc(editing.doc.id, { status, reviewed_at: new Date().toISOString() });
    setEditing(null);
    force();
    toast.success(`Document ${status}.`);
  }

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Every member × required document. Bookings are auto-blocked when a required doc is expired."
      />

      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Member</th>
              {requiredDocs.map((t) => (
                <th key={t} className="p-3 text-center text-xs font-medium text-muted-foreground">{DOC_TYPE_LABELS[t]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => {
              const tp = getTenantProfile(m.tenant_id);
              return (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{tp?.business_name ?? getProfile(m.tenant_id)?.full_name}</td>
                  {requiredDocs.map((type) => {
                    const doc = find(m.tenant_id, type);
                    const st = cellState(doc);
                    return (
                      <td key={type} className="p-2 text-center">
                        <button
                          onClick={() => doc && setEditing({ doc })}
                          className={cn('w-full rounded-md px-2 py-2 text-xs font-medium transition-opacity hover:opacity-80', st.color)}
                        >
                          {st.label}
                          {doc?.expiration_date && st.label !== 'Expired' && <div className="text-[10px] opacity-70">{format(new Date(doc.expiration_date), 'MMM yy')}</div>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100" /> Valid</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100" /> Expiring / pending</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100" /> Expired / rejected</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-100" /> Not on file</span>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Review document">
        {editing && (
          <div className="space-y-3">
            <div className="text-sm"><span className="text-muted-foreground">Type:</span> {DOC_TYPE_LABELS[editing.doc.doc_type]}</div>
            <div className="text-sm"><span className="text-muted-foreground">Name:</span> {editing.doc.doc_name ?? '—'}</div>
            {editing.doc.expiration_date && <div className="text-sm"><span className="text-muted-foreground">Expires:</span> {format(new Date(editing.doc.expiration_date), 'PP')}</div>}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => review('approved')}>Approve</Button>
              <Button variant="destructive" className="flex-1" onClick={() => review('rejected')}>Reject</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
