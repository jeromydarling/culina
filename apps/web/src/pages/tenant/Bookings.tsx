import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { listBookings, getSpace, updateBooking } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatCents } from '@culina/shared';
import { format } from 'date-fns';

export default function Bookings() {
  const { profile } = useAuth();
  const force = useForceUpdate();
  const bookings = [...listBookings({ tenantId: profile!.id })].sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  const upcoming = bookings.filter((b) => new Date(b.start_time) >= new Date() && b.status !== 'cancelled');
  const past = bookings.filter((b) => !(new Date(b.start_time) >= new Date() && b.status !== 'cancelled'));

  async function cancel(id: string) {
    // Persist via the validated endpoint in live mode (frees the slot in D1);
    // optimistically update the view either way.
    if (isLive()) {
      try {
        await dataApi.updateBooking(id, { status: 'cancelled' });
      } catch (e) {
        return notifyError(e, { action: 'cancelBooking' });
      }
    }
    updateBooking(id, { status: 'cancelled' });
    force();
    toast.success('Booking cancelled');
  }

  const Row = ({ b, cancellable }: { b: (typeof bookings)[number]; cancellable?: boolean }) => (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
      <div>
        <div className="font-medium">{getSpace(b.space_id ?? '')?.name ?? 'Space'}</div>
        <div className="text-sm text-muted-foreground">{format(new Date(b.start_time), 'EEE MMM d, h:mma')} – {format(new Date(b.end_time), 'h:mma')}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{formatCents(b.total_cents)}</span>
        <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
        {cancellable && <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>Cancel</Button>}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="My Bookings" description="Your upcoming and past kitchen reservations." action={<Link to="/tenant/book"><Button><CalendarPlus className="h-4 w-4" /> Book a space</Button></Link>} />
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarPlus} title="No bookings yet" description="Reserve your first block of kitchen time." action={<Link to="/tenant/book"><Button>Book a space</Button></Link>} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
            <div className="space-y-2">{upcoming.length ? upcoming.map((b) => <Row key={b.id} b={b} cancellable />) : <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}</div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Past</h2>
            <div className="space-y-2">{past.map((b) => <Row key={b.id} b={b} />)}</div>
          </section>
        </div>
      )}
    </div>
  );
}
