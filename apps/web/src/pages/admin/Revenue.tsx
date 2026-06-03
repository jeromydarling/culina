import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { DollarSign, Handshake } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listMarketplaceTransactions, listReferralPartners } from '@/lib/store';
import { REVENUE_STREAMS, formatCents } from '@culina/shared';

const COLORS = ['#2D4A3E', '#C8963E', '#10B981', '#6D28D9', '#0EA5E9', '#F59E0B'];

// Illustrative monthly revenue per stream (cents).
const streamRevenue: Record<string, number> = {
  transaction: 184000,
  subscription: 268000,
  tenant_pro: 43000,
  marketplace: 21000,
  referral: 16000,
  white_label: 99800,
};

export default function Revenue() {
  const txns = listMarketplaceTransactions();
  const partners = listReferralPartners();
  const total = Object.values(streamRevenue).reduce((a, b) => a + b, 0);
  const pie = REVENUE_STREAMS.map((s) => ({ name: s.label, value: streamRevenue[s.id] ?? 0 }));
  const marketplaceCommission = txns.reduce((s, t) => s + t.commission_cents, 0);

  return (
    <div>
      <PageHeader title="Revenue" description="How Culina earns — diversified across six streams so no single one carries the platform." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly revenue" value={formatCents(total)} icon={DollarSign} trend={{ value: '+17%', positive: true }} />
        <StatCard label="Annualized run-rate" value={formatCents(total * 12)} icon={DollarSign} />
        <StatCard label="Marketplace commission" value={formatCents(marketplaceCommission)} hint="this period" />
        <StatCard label="Referral partners" value={String(partners.length)} icon={Handshake} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue mix</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCents(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>The six streams</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {REVENUE_STREAMS.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatCents(streamRevenue[s.id] ?? 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Grant & capital referral partners</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="muted">{p.partner_type}</Badge>
                <span className="text-sm font-medium text-primary">{p.revenue_share_percent}% share</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
