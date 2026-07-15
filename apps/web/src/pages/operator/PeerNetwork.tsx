import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getKitchenByOperator, listMemberships, listBookings } from '@/lib/store';

export default function PeerNetwork() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const activeTenants = listMemberships(kitchen.id).filter((m) => m.status === 'active').length;
  const bookings = listBookings({ kitchenId: kitchen.id }).length;

  // Anonymized benchmark cohort (national peer operators).
  const benchmarks = [
    { metric: 'Utilization %', you: 78, cohort: 64 },
    { metric: 'Tenant retention %', you: 92, cohort: 81 },
    { metric: 'Avg members', you: activeTenants * 10, cohort: 22 },
  ];

  const bestPractices = [
    { title: 'Tiered membership beats pure hourly', by: 'Operator in Portland, OR', body: 'Switching long-term members to monthly blocks cut our admin time 30% and stabilized cash flow.' },
    { title: 'Run a quarterly member showcase', by: 'Operator in Austin, TX', body: 'A public market day for our makers drives leads and gives members a sales spike — everyone wins.' },
    { title: 'Pre-block maintenance windows', by: 'Operator in Madison, WI', body: 'Reserving Friday mornings for equipment service ended surprise downtime complaints.' },
  ];

  return (
    <div>
      <PageHeader
        title="Operator Peer Network"
        description="Benchmark against an anonymized national cohort and learn from other operators."
      />

      <span className="mb-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Preview — sample benchmark data</span>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Your utilization" value="78%" icon={TrendingUp} trend={{ value: '+14 vs cohort', positive: true }} />
        <StatCard label="Your retention" value="92%" icon={Users} trend={{ value: '+11 vs cohort', positive: true }} />
        <StatCard label="Bookings (90d)" value={String(bookings)} icon={Award} hint="cohort avg: 280" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>You vs. peer cohort</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={benchmarks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="you" fill="#2D4A3E" radius={[6, 6, 0, 0]} name="You" />
                <Bar dataKey="cohort" fill="#C8963E" radius={[6, 6, 0, 0]} name="Cohort avg" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Best practices from operators</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bestPractices.map((p) => (
              <div key={p.title} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{p.title}</h3>
                  <Badge variant="muted">Peer tip</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">— {p.by}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
