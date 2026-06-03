import * as React from 'react';
import { PageHeader, EmptyState, Spinner } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { isLive } from '@/lib/config';
import { dataApi } from '@/lib/dataApi';
import { notifyError } from '@/lib/errors';
import { formatDistanceToNow } from 'date-fns';

export default function Errors() {
  const [rows, setRows] = React.useState<any[] | null>(isLive() ? null : []);

  React.useEffect(() => {
    if (!isLive()) return;
    dataApi.errors().then((d) => setRows(d.errors)).catch((e) => { notifyError(e); setRows([]); });
  }, []);

  return (
    <div>
      <PageHeader title="Error Log" description="Captured client + server errors (live observability). Also streamed to Cloudflare Workers logs." />
      {rows === null ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No errors logged" description={isLive() ? 'Nothing has gone wrong recently. 🎉' : 'Switch to a live account to view captured errors.'} />
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={e.source === 'server' ? 'destructive' : 'warning'}>{e.source}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{e.incident}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
              </div>
              <div className="mt-1 text-sm font-medium">{e.message}</div>
              {e.url && <div className="text-xs text-muted-foreground">{e.url}</div>}
              {e.stack && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">{e.stack}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
