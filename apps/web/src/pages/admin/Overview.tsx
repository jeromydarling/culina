import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Building2, Users, CalendarCheck, DollarSign } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listKitchens, listGrants, listLearning } from '@/lib/store';
import { formatCents } from '@culina/shared';

export default function Overview() {
  const kitchens = listKitchens();
  const mrr = [
    { m: 'Jan', v: 2100 }, { m: 'Feb', v: 2600 }, { m: 'Mar', v: 3200 },
    { m: 'Apr', v: 3900 }, { m: 'May', v: 4700 }, { m: 'Jun', v: 5600 },
  ];

  return (
    <div>
      <PageHeader title="Platform Overview" description="Culina at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Kitchens" value={String(kitchens.length)} icon={Building2} trend={{ value: '+2', positive: true }} hint="this month" />
        <StatCard label="Makers" value="128" icon={Users} trend={{ value: '+14', positive: true }} />
        <StatCard label="Bookings (30d)" value="412" icon={CalendarCheck} />
        <StatCard label="Platform fee revenue" value={formatCents(560000)} icon={DollarSign} trend={{ value: '+19%', positive: true }} />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Platform MRR + fee revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mrr}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D4A3E" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2D4A3E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v}`} />
              <Area type="monotone" dataKey="v" stroke="#2D4A3E" strokeWidth={3} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active grants listed" value={String(listGrants().length)} />
        <StatCard label="Learning resources" value={String(listLearning().length)} />
        <StatCard label="Listed kitchens" value={String(kitchens.filter((k) => k.is_listed).length)} />
      </div>
    </div>
  );
}
