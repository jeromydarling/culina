import { toast } from 'sonner';
import { Check, Plug } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PROVIDERS, getConnections } from '@/lib/integrations';

const catLabel: Record<string, string> = { storage: 'Document storage', accounting: 'Accounting', import: 'Data import' };

export default function Integrations() {
  const connections = getConnections();

  function toggle(_id: string, _connected: boolean) {
    toast.info('Integrations are coming soon — OAuth connections ship after launch.');
  }

  const cats = ['storage', 'accounting', 'import'] as const;

  return (
    <div>
      <PageHeader title="Integrations" description="Connect the tools where your data already lives. Storage options let you keep documents in your own cloud." />

      {cats.map((cat) => {
        const items = PROVIDERS.filter((p) => p.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{catLabel[cat]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => {
                const connected = !!connections[p.id] || p.id === 'r2';
                return (
                  <Card key={p.id}><CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{p.emoji}</span>
                      {connected ? <Badge variant="success"><Check className="mr-1 h-3 w-3" /> Connected</Badge> : <Badge variant="muted">Not connected</Badge>}
                    </div>
                    <h3 className="mt-3 font-heading font-semibold">{p.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
                    {p.id === 'r2' ? (
                      <p className="mt-3 text-xs text-muted-foreground">Built in. Create the bucket with <code className="rounded bg-muted px-1">wrangler r2 bucket create culina-files</code>.</p>
                    ) : connected ? (
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => toggle(p.id, false)}>Disconnect</Button>
                    ) : (
                      <Button size="sm" className="mt-3" onClick={() => toggle(p.id, true)}><Plug className="h-4 w-4" /> Connect</Button>
                    )}
                  </CardContent></Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="mt-2 text-xs text-muted-foreground">OAuth connections are stubbed in this build; Claude for Chrome will provision the real provider keys.</p>
    </div>
  );
}
