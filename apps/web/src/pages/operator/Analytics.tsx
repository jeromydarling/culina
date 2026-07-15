import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DollarSign, TrendingUp, Percent, Repeat } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getKitchenByOperator, listBookings, listSpaces, listMemberships, getTenantProfile } from '@/lib/store';
import { formatCents } from '@culina/shared';

export default function Analytics() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const bookings = listBookings({ kitchenId: kitchen.id });
  const spaces = listSpaces(kitchen.id);
  const memberships = listMemberships(kitchen.id);

  const revenueByMonth = [
    { month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 4800 }, { month: 'Mar', revenue: 5100 },
    { month: 'Apr', revenue: 5600 }, { month: 'May', revenue: 6200 }, { month: 'Jun', revenue: 6900 },
  ];

  const utilization = spaces.map((s) => ({
    name: s.name.replace('Station', 'Stn').replace('Storage', 'Stor'),
    hours: bookings.filter((b) => b.space_id === s.id).reduce((sum, b) => sum + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3.6e6, 0),
  }));

  const revenueByTenant = memberships.map((m) => ({
    name: getTenantProfile(m.tenant_id)?.business_name?.split(' ')[0] ?? 'Tenant',
    revenue: bookings.filter((b) => b.tenant_id === m.tenant_id).reduce((s, b) => s + b.subtotal_cents, 0) / 100,
  }));

  const totalRevenue = bookings.reduce((s, b) => s + b.subtotal_cents, 0);
  const avgBooking = bookings.length ? totalRevenue / bookings.length : 0;

  const mrr = memberships.filter((m) => m.status === 'active' && m.membership_type === 'monthly').length * kitchen.monthly_price_cents;
  const activeCount = memberships.filter((m) => m.status === 'active').length;
  const suspendedCount = memberships.filter((m) => m.status === 'suspended').length;
  const retention = activeCount + suspendedCount > 0 ? `${Math.round((activeCount / (activeCount + suspendedCount)) * 100)}%` : '—';

  return (
    <div>
      <PageHeader title="Analytics" description="The numbers that run your kitchen." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={formatCents(mrr)} icon={Repeat} hint="active monthly members" />
        <StatCard label="Total revenue (90d)" value={formatCents(totalRevenue)} icon={DollarSign} />
        <StatCard label="Avg booking value" value={formatCents(avgBooking)} icon={TrendingUp} />
        <StatCard label="Retention" value={retention} icon={Percent} hint="active share" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `$${v}`} />
                <Line type="monotone" dataKey="revenue" stroke="#2D4A3E" strokeWidth={3} dot={{ fill: '#C8963E' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Space utilization (hours)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilization}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#C8963E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue by member</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByTenant} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v: number) => `$${v}`} />
                <Bar dataKey="revenue" fill="#2D4A3E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
