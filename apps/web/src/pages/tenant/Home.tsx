import { Link } from 'react-router-dom';
import { DollarSign, Package, ShoppingCart, CalendarClock, CalendarPlus, Plus, Store, Wallet, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GettingStarted } from '@/components/GettingStarted';
import { Translate } from '@/components/Translate';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  getTenantProfile,
  getMembershipForTenant,
  getKitchenById,
  listBookings,
  listProducts,
  listOrders,
  listAnnouncements,
} from '@/lib/store';
import { formatCents } from '@culina/shared';
import { format } from 'date-fns';

const milestones = ['Launch', 'Grow', 'Graduate'];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const membership = getMembershipForTenant(profile!.id);
  const kitchen = membership ? getKitchenById(membership.kitchen_id) : null;
  const bookings = listBookings({ tenantId: profile!.id });
  const products = listProducts(profile!.id);
  const orders = listOrders(profile!.id);

  const monthRevenue = orders.reduce((s, o) => s + o.subtotal_cents, 0);
  const nextBooking = [...bookings]
    .filter((b) => new Date(b.start_time) >= new Date() && b.status !== 'cancelled')
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))[0];
  const announcements = membership ? listAnnouncements(membership.kitchen_id) : [];

  const currentMilestone = (tp?.years_in_operation ?? 0) >= 3 ? 2 : (tp?.years_in_operation ?? 0) >= 1 ? 1 : 0;
  const firstName = profile!.full_name?.trim().split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description={kitchen ? `Here’s how ${tp?.business_name ?? 'your business'} is doing at ${kitchen.name} today.` : 'Here’s how your business is doing today.'}
        action={
          <>
            <Link to="/tenant/book"><Button><CalendarPlus className="h-4 w-4" /> Book a space</Button></Link>
            <Link to="/tenant/products"><Button variant="outline"><Plus className="h-4 w-4" /> Add product</Button></Link>
          </>
        }
      />

      <GettingStarted role="tenant" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={formatCents(monthRevenue)} icon={DollarSign} trend={{ value: '+8%', positive: true }} />
        <StatCard label="Orders" value={String(orders.length)} icon={ShoppingCart} hint="all-time" />
        <StatCard label="Active products" value={String(products.filter((p) => p.is_active).length)} icon={Package} />
        <StatCard label="Next booking" value={nextBooking ? format(new Date(nextBooking.start_time), 'MMM d') : '—'} icon={CalendarClock} hint={nextBooking ? format(new Date(nextBooking.start_time), 'h:mma') : 'none scheduled'} />
      </div>

      {/* Milestone tracker */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Your growth journey</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center">
            {milestones.map((m, i) => (
              <div key={m} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${i <= currentMilestone ? 'bg-primary text-secondary' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                  <span className="mt-1 text-xs font-medium">{m}</span>
                </div>
                {i < milestones.length - 1 && <div className={`mx-2 h-1 flex-1 rounded-full ${i < currentMilestone ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
          {tp?.graduation_target_date && (
            <p className="mt-4 text-sm text-muted-foreground">🎯 Graduation target: {format(new Date(tp.graduation_target_date), 'MMMM yyyy')}</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Recent orders</CardTitle><Link to="/tenant/products" className="text-sm text-primary hover:underline">Manage products</Link></CardHeader>
          <CardContent className="space-y-2">
            {orders.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No orders yet — share your storefront!</p>}
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                <div><div className="text-sm font-medium">{o.order_number}</div><div className="text-xs text-muted-foreground">{o.customer_name}</div></div>
                <div className="flex items-center gap-3"><span className="text-sm font-medium">{formatCents(o.total_cents)}</span><Badge variant={statusVariant(o.status)}>{o.status}</Badge></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link to="/tenant/storefront"><Button variant="outline" className="w-full justify-start"><Store className="h-4 w-4" /> Edit storefront</Button></Link>
            <Link to="/tenant/grants"><Button variant="outline" className="w-full justify-start"><Wallet className="h-4 w-4" /> Find a grant</Button></Link>
            <Link to="/tenant/recipes"><Button variant="outline" className="w-full justify-start"><Plus className="h-4 w-4" /> Cost a recipe</Button></Link>
            <div className="mt-4">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Megaphone className="h-3 w-3" /> {kitchen ? `From ${kitchen.name}` : 'From your kitchen'}</div>
              {announcements[0]
                ? <div className="mt-2 rounded-lg bg-muted/50 p-3"><div className="text-sm font-medium">{announcements[0].title}</div><Translate text={announcements[0].body} className="mt-0.5 text-xs text-muted-foreground" /></div>
                : <p className="mt-2 text-xs text-muted-foreground">No notes from your kitchen right now — you’re all caught up.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
