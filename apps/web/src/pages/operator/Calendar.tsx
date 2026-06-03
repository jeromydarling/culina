import * as React from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Label, Select, Input, Textarea } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  getKitchenByOperator,
  listSpaces,
  listEquipment,
  listBookings,
  listMemberships,
  getTenantProfile,
  getProfile,
  createBooking,
  addBookingLocal,
} from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { formatCents, feeBreakdown } from '@culina/shared';
import { addDays, startOfWeek, format, isSameDay } from 'date-fns';

const spaceColors = ['bg-primary', 'bg-accent', 'bg-emerald-600', 'bg-sky-600', 'bg-rose-500'];

export default function Calendar() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const spaces = listSpaces(kitchen.id);
  const equipment = listEquipment(kitchen.id);
  const memberships = listMemberships(kitchen.id);

  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [tick, setTick] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const bookings = listBookings({ kitchenId: kitchen.id }).filter((b) => b.status !== 'cancelled');
  const colorFor = (spaceId: string | null) => spaceColors[Math.max(0, spaces.findIndex((s) => s.id === spaceId)) % spaceColors.length];

  // form state
  const [form, setForm] = React.useState({ tenant_id: memberships[0]?.tenant_id ?? '', space_id: spaces[0]?.id ?? '', date: format(new Date(), 'yyyy-MM-dd'), start: '08:00', end: '12:00', equipment: [] as string[], notes: '' });

  const hours = Math.max(1, (Number(form.end.split(':')[0]) - Number(form.start.split(':')[0])));
  const space = spaces.find((s) => s.id === form.space_id);
  const equipRate = form.equipment.reduce((s, id) => s + (equipment.find((e) => e.id === id)?.hourly_rate_cents ?? 0), 0);
  const subtotal = Math.round(((space?.hourly_rate_cents ?? 0) + equipRate) * hours);
  const fb = feeBreakdown(subtotal);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      space_id: form.space_id,
      tenant_id: form.tenant_id,
      start_time: new Date(`${form.date}T${form.start}`).toISOString(),
      end_time: new Date(`${form.date}T${form.end}`).toISOString(),
      equipment_ids: form.equipment,
      notes: form.notes,
    };
    if (isLive()) {
      try {
        const { booking } = await dataApi.createBooking(payload);
        addBookingLocal(booking);
      } catch (err) {
        return toast.error((err as Error).message);
      }
    } else {
      createBooking({ kitchen_id: kitchen.id, ...payload });
    }
    setOpen(false);
    setTick((t) => t + 1);
    toast.success('Booking created');
  }

  return (
    <div key={tick}>
      <PageHeader
        title="Calendar"
        description="Bookings across all stations, color-coded by space."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New booking</Button>}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 font-heading text-lg font-semibold">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          {spaces.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-3 w-3 rounded-sm ${spaceColors[i % spaceColors.length]}`} /> {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {days.map((day) => {
          const dayBookings = bookings
            .filter((b) => isSameDay(new Date(b.start_time), day))
            .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
          return (
            <div key={day.toISOString()} className="min-w-[120px] rounded-lg border bg-card">
              <div className={`border-b p-2 text-center ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div className="font-heading text-lg font-semibold">{format(day, 'd')}</div>
              </div>
              <div className="space-y-1 p-1.5 min-h-[140px]">
                {dayBookings.map((b) => {
                  const tenant = getTenantProfile(b.tenant_id);
                  const sp = spaces.find((s) => s.id === b.space_id);
                  return (
                    <div key={b.id} className={`rounded-md p-1.5 text-[11px] text-white ${colorFor(b.space_id)}`}>
                      <div className="font-medium leading-tight">{format(new Date(b.start_time), 'h:mma')}</div>
                      <div className="truncate opacity-90">{tenant?.business_name ?? getProfile(b.tenant_id)?.full_name}</div>
                      <div className="truncate opacity-75">{sp?.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New booking" description="Pricing updates live with the 1.5% platform fee shown separately.">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Tenant</Label>
            <Select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
              {memberships.map((m) => {
                const tp = getTenantProfile(m.tenant_id);
                return <option key={m.tenant_id} value={m.tenant_id}>{tp?.business_name ?? getProfile(m.tenant_id)?.full_name}</option>;
              })}
            </Select>
          </div>
          <div>
            <Label>Space</Label>
            <Select value={form.space_id} onChange={(e) => setForm({ ...form, space_id: e.target.value })}>
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatCents(s.hourly_rate_cents)}/hr</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Start</Label><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><Label>End</Label><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <div>
            <Label>Equipment add-ons</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {equipment.map((e) => {
                const on = form.equipment.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setForm({ ...form, equipment: on ? form.equipment.filter((x) => x !== e.id) : [...form.equipment, e.id] })}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-primary bg-primary text-white' : 'hover:border-primary/40'}`}
                  >
                    {e.name} (+{formatCents(e.hourly_rate_cents)}/hr)
                  </button>
                );
              })}
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal ({hours}h)</span><span>{formatCents(fb.subtotalCents)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Platform fee ({fb.feePercent}%)</span><span>{formatCents(fb.platformFeeCents)}</span></div>
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatCents(fb.totalCents)}</span></div>
          </div>
          <Button type="submit" className="w-full">Create booking</Button>
        </form>
      </Modal>
    </div>
  );
}
