import * as React from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getMembershipForTenant,
  listSpaces,
  listEquipment,
  createBooking,
  addBookingLocal,
  listComplianceForTenant,
} from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatCents, feeBreakdown, SPACE_TYPE_LABELS } from '@culina/shared';
import { format } from 'date-fns';

export default function Book() {
  const { profile } = useAuth();
  const membership = getMembershipForTenant(profile!.id);
  const kitchenId = membership?.kitchen_id ?? '';
  const spaces = listSpaces(kitchenId);
  const equipment = listEquipment(kitchenId);
  const docs = listComplianceForTenant(profile!.id);
  const blocked = docs.some((d) => d.status === 'expired');

  const [spaceId, setSpaceId] = React.useState(spaces[0]?.id ?? '');
  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [start, setStart] = React.useState('08:00');
  const [end, setEnd] = React.useState('12:00');
  const [equip, setEquip] = React.useState<string[]>([]);

  const space = spaces.find((s) => s.id === spaceId);
  const hours = Math.max(1, Number(end.split(':')[0]) - Number(start.split(':')[0]));
  const equipRate = equip.reduce((s, id) => s + (equipment.find((e) => e.id === id)?.hourly_rate_cents ?? 0), 0);
  const subtotal = Math.round(((space?.hourly_rate_cents ?? 0) + equipRate) * hours);
  const fb = feeBreakdown(subtotal);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return toast.error('A required document is expired. Update your documents to book.');
    const payload = {
      space_id: spaceId,
      start_time: new Date(`${date}T${start}`).toISOString(),
      end_time: new Date(`${date}T${end}`).toISOString(),
      equipment_ids: equip,
    };
    if (isLive()) {
      // Server validates conflicts, compliance, and recomputes pricing.
      try {
        const { booking } = await dataApi.createBooking(payload);
        addBookingLocal(booking);
        toast.success('Booking confirmed! A calendar invite is on its way.');
      } catch (err) {
        notifyError(err, { action: 'createBooking' });
      }
    } else {
      createBooking({ kitchen_id: kitchenId, tenant_id: profile!.id, ...payload });
      toast.success('Booking confirmed! A calendar invite is on its way.');
    }
  }

  return (
    <div>
      <PageHeader title="Book a Space" description="Reserve kitchen time and equipment in seconds." />
      {blocked && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          A required document is expired, so booking is paused. Visit <strong>My Documents</strong> to fix it.
        </div>
      )}

      <form onSubmit={book} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Label>Choose a space</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpaceId(s.id)}
                  className={cn('rounded-xl border p-4 text-left transition-all', spaceId === s.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/40')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    {spaceId === s.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{SPACE_TYPE_LABELS[s.space_type]}</div>
                  <div className="mt-1 text-sm font-medium text-primary">{formatCents(s.hourly_rate_cents)}/hr</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Start</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>

          <div>
            <Label>Equipment add-ons</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {equipment.map((e) => {
                const on = equip.includes(e.id);
                return (
                  <button key={e.id} type="button" onClick={() => setEquip(on ? equip.filter((x) => x !== e.id) : [...equip, e.id])} className={cn('rounded-full border px-3 py-1.5 text-sm', on ? 'border-primary bg-primary text-white' : 'hover:border-primary/40')}>
                    {e.name} (+{formatCents(e.hourly_rate_cents)}/hr)
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-24 rounded-xl border bg-card p-5 shadow-card">
            <div className="font-heading font-semibold">Booking summary</div>
            <div className="mt-3 space-y-1 text-sm">
              <Row label="Space" value={space?.name ?? '—'} />
              <Row label="Date" value={format(new Date(date), 'MMM d, yyyy')} />
              <Row label="Time" value={`${start}–${end} (${hours}h)`} />
            </div>
            <div className="mt-3 space-y-1 border-t pt-3 text-sm">
              <Row label="Subtotal" value={formatCents(fb.subtotalCents)} />
              <Row label={`Platform fee (${fb.feePercent}%)`} value={formatCents(fb.platformFeeCents)} muted />
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatCents(fb.totalCents)}</span></div>
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={blocked}><CalendarPlus className="h-4 w-4" /> Confirm booking</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn('flex justify-between', muted && 'text-muted-foreground')}>
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
