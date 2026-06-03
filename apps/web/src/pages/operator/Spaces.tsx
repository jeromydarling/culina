import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Tabs } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SmartImage } from '@/components/SmartImage';
import { AiImageButton } from '@/components/AiImageButton';
import {
  getKitchenByOperator,
  listSpaces,
  listEquipment,
  upsertSpace,
  deleteSpace,
  upsertEquipment,
  deleteEquipment,
} from '@/lib/store';
import { formatCents, SPACE_TYPES, SPACE_TYPE_LABELS } from '@culina/shared';
import type { KitchenSpace, KitchenEquipment } from '@culina/shared';

export default function Spaces() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const [tab, setTab] = React.useState('spaces');
  const [, force] = React.useReducer((x) => x + 1, 0);
  const spaces = listSpaces(kitchen.id);
  const equipment = listEquipment(kitchen.id);
  const [spaceModal, setSpaceModal] = React.useState<Partial<KitchenSpace> | null>(null);
  const [eqModal, setEqModal] = React.useState<Partial<KitchenEquipment> | null>(null);

  return (
    <div>
      <PageHeader title="Spaces & Equipment" description="Define what tenants can book, and set your pricing." />
      <Tabs tabs={[{ id: 'spaces', label: `Spaces (${spaces.length})` }, { id: 'equipment', label: `Equipment (${equipment.length})` }]} active={tab} onChange={setTab} />

      {tab === 'spaces' && (
        <>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setSpaceModal({ kitchen_id: kitchen.id, space_type: 'prep_station', hourly_rate_cents: 2500, capacity_persons: 1, is_active: true })}><Plus className="h-4 w-4" /> Add space</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-lg border bg-card shadow-card">
                {s.image_url && (
                  <div className="h-32 w-full overflow-hidden">
                    <SmartImage src={s.image_url} alt={s.name} emoji="🍳" gradient="from-slate-600 to-emerald-700" className="h-full w-full" />
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="muted" className="mt-1">{SPACE_TYPE_LABELS[s.space_type]}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSpaceModal(s)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { deleteSpace(s.id); force(); toast.success('Space removed'); }} className="rounded p-1.5 text-red-500 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-3 text-sm font-medium text-primary">{formatCents(s.hourly_rate_cents)}/hr</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'equipment' && (
        <>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setEqModal({ kitchen_id: kitchen.id, hourly_rate_cents: 1000, quantity: 1, is_active: true })}><Plus className="h-4 w-4" /> Add equipment</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{e.name}</h3>
                    <div className="mt-1 text-xs text-muted-foreground">Qty: {e.quantity}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEqModal(e)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { deleteEquipment(e.id); force(); toast.success('Equipment removed'); }} className="rounded p-1.5 text-red-500 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 text-sm font-medium text-primary">{formatCents(e.hourly_rate_cents)}/hr</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Space editor */}
      <Modal open={!!spaceModal} onClose={() => setSpaceModal(null)} title={spaceModal?.id ? 'Edit space' : 'Add space'}>
        {spaceModal && (
          <form
            onSubmit={(e) => { e.preventDefault(); upsertSpace(spaceModal as KitchenSpace & { kitchen_id: string }); setSpaceModal(null); force(); toast.success('Saved'); }}
            className="space-y-3"
          >
            <div><Label>Name</Label><Input required value={spaceModal.name ?? ''} onChange={(e) => setSpaceModal({ ...spaceModal, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={spaceModal.space_type} onChange={(e) => setSpaceModal({ ...spaceModal, space_type: e.target.value as KitchenSpace['space_type'] })}>
                {SPACE_TYPES.map((t) => <option key={t} value={t}>{SPACE_TYPE_LABELS[t]}</option>)}
              </Select>
            </div>
            <div><Label>Description</Label><Input value={spaceModal.description ?? ''} onChange={(e) => setSpaceModal({ ...spaceModal, description: e.target.value })} /></div>
            <div>
              <Label>Photo</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border">
                  <SmartImage src={spaceModal.image_url ?? undefined} alt={spaceModal.name ?? 'Space'} emoji="🍳" gradient="from-slate-600 to-emerald-700" className="h-full w-full" />
                </div>
                <AiImageButton
                  prompt={`${spaceModal.name ?? 'prep station'}, ${spaceModal.description ?? ''}`.trim()}
                  style="space"
                  label="Generate with Flux"
                  onGenerated={(url) => setSpaceModal({ ...spaceModal, image_url: url })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Hourly rate ($)</Label><Input type="number" value={(spaceModal.hourly_rate_cents ?? 0) / 100} onChange={(e) => setSpaceModal({ ...spaceModal, hourly_rate_cents: Math.round(Number(e.target.value) * 100) })} /></div>
              <div><Label>Capacity</Label><Input type="number" value={spaceModal.capacity_persons ?? 1} onChange={(e) => setSpaceModal({ ...spaceModal, capacity_persons: Number(e.target.value) })} /></div>
            </div>
            <Button type="submit" className="w-full">Save space</Button>
          </form>
        )}
      </Modal>

      {/* Equipment editor */}
      <Modal open={!!eqModal} onClose={() => setEqModal(null)} title={eqModal?.id ? 'Edit equipment' : 'Add equipment'}>
        {eqModal && (
          <form
            onSubmit={(e) => { e.preventDefault(); upsertEquipment(eqModal as KitchenEquipment & { kitchen_id: string }); setEqModal(null); force(); toast.success('Saved'); }}
            className="space-y-3"
          >
            <div><Label>Name</Label><Input required value={eqModal.name ?? ''} onChange={(e) => setEqModal({ ...eqModal, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Hourly rate ($)</Label><Input type="number" value={(eqModal.hourly_rate_cents ?? 0) / 100} onChange={(e) => setEqModal({ ...eqModal, hourly_rate_cents: Math.round(Number(e.target.value) * 100) })} /></div>
              <div><Label>Quantity</Label><Input type="number" value={eqModal.quantity ?? 1} onChange={(e) => setEqModal({ ...eqModal, quantity: Number(e.target.value) })} /></div>
            </div>
            <Button type="submit" className="w-full">Save equipment</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
