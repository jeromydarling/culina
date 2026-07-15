import { Link } from 'react-router-dom';
import { Users, DollarSign, CalendarClock, AlertTriangle, Plus, UserPlus, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GettingStarted } from '@/components/GettingStarted';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  getKitchenByOperator,
  listMemberships,
  listBookings,
  listComplianceForKitchen,
  listAnnouncements,
  getTenantProfile,
  getProfile,
} from '@/lib/store';
import { formatCents } from '@culina/shared';
import { format, isToday, isThisMonth, isSameMonth, subMonths } from 'date-fns';

export default function Overview() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const memberships = listMemberships(kitchen.id);
  const bookings = listBookings({ kitchenId: kitchen.id });
  const docs = listComplianceForKitchen(kitchen.id);
  const announcements = listAnnouncements(kitchen.id);

  const activeTenants = memberships.filter((m) => m.status === 'active').length;
  const monthRevenue = bookings
    .filter((b) => isThisMonth(new Date(b.start_time)) && b.status !== 'cancelled')
    .reduce((s, b) => s + b.subtotal_cents, 0);
  const lastMonthRevenue = bookings
    .filter((b) => isSameMonth(new Date(b.start_time), subMonths(new Date(), 1)) && b.status !== 'cancelled')
    .reduce((s, b) => s + b.subtotal_cents, 0);
  const revenueChange = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;
  const revenueTrend = revenueChange != null
    ? { value: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`, positive: revenueChange >= 0 }
    : undefined;
  const todayBookings = bookings.filter((b) => isToday(new Date(b.start_time)) && b.status !== 'cancelled');
  const expiringDocs = docs.filter((d) => d.status === 'expired' || (d.expiration_date && new Date(d.expiration_date) < new Date(Date.now() + 30 * 864e5)));

  const upcoming = [...bookings]
    .filter((b) => new Date(b.start_time) >= new Date(Date.now() - 864e5) && b.status !== 'cancelled')
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile!.full_name?.split(' ')[0]}`}
        description={`Here’s what’s happening at ${kitchen.name} today.`}
        action={
          <>
            <Link to="/operator/calendar"><Button><Plus className="h-4 w-4" /> New booking</Button></Link>
            <Link to="/operator/tenants"><Button variant="outline"><UserPlus className="h-4 w-4" /> Welcome someone in</Button></Link>
          </>
        }
      />

      <GettingStarted role="operator" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={String(activeTenants)} icon={Users} hint={`${memberships.length} total`} />
        <StatCard label="Revenue this month" value={formatCents(monthRevenue)} icon={DollarSign} {...(revenueTrend ? { trend: revenueTrend, hint: 'vs last month' } : {})} />
        <StatCard label="Bookings today" value={String(todayBookings.length)} icon={CalendarClock} hint="across all stations" />
        <StatCard label="Docs needing attention" value={String(expiringDocs.length)} icon={AlertTriangle} hint="expired or expiring" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming bookings</CardTitle>
            <Link to="/operator/calendar" className="text-sm text-primary hover:underline">View calendar</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No upcoming bookings.</p>}
            {upcoming.map((b) => {
              const tenant = getTenantProfile(b.tenant_id);
              return (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{tenant?.business_name ?? getProfile(b.tenant_id)?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(b.start_time), 'EEE MMM d, h:mma')} – {format(new Date(b.end_time), 'h:mma')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCents(b.total_cents)}</span>
                    <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link to="/operator/invoices"><Button variant="outline" className="w-full justify-start"><FileText className="h-4 w-4" /> Create invoice</Button></Link>
            <Link to="/operator/leads"><Button variant="outline" className="w-full justify-start"><UserPlus className="h-4 w-4" /> Review leads</Button></Link>
            <Link to="/operator/compliance"><Button variant="outline" className="w-full justify-start"><AlertTriangle className="h-4 w-4" /> Compliance check</Button></Link>
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest announcement</div>
              {announcements[0] && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3">
                  <div className="text-sm font-medium">{announcements[0].title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{announcements[0].body}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
