import * as React from 'react';
import { toast } from 'sonner';
import { CalendarDays, Copy, Webhook, Plug } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { getKitchenByOperator, setKitchenWebhook } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';

const SAMPLE_FEED_URL = 'https://culina.life/api/data/calendar-feed?k=demo-kitchen&t=demo-token';
const webhookKey = (kitchenId: string) => `culina_webhook_${kitchenId}`;

export default function Integrations() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id);

  // ── Calendar feed (real: token-signed iCal URL from the Worker) ─────────
  const [feedUrl, setFeedUrl] = React.useState('');
  const [feedLoading, setFeedLoading] = React.useState(isLive());
  React.useEffect(() => {
    if (!isLive()) return;
    let cancelled = false;
    dataApi
      .icalUrl()
      .then((r) => { if (!cancelled) setFeedUrl(r.url); })
      .catch((e) => { if (!cancelled) toast.error((e as Error).message); })
      .finally(() => { if (!cancelled) setFeedLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function copyFeed() {
    navigator.clipboard?.writeText(feedUrl);
    toast.success('Calendar URL copied — paste it into your calendar app.');
  }

  // ── Outbound webhook ─────────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = React.useState(() => {
    try { return kitchen ? localStorage.getItem(webhookKey(kitchen.id)) ?? '' : ''; } catch { return ''; }
  });
  const [webhookSaved, setWebhookSaved] = React.useState(!!webhookUrl);

  function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!kitchen) return;
    const url = webhookUrl.trim();
    if (!/^https?:\/\//.test(url)) return toast.error('Enter a full URL starting with https://');
    setKitchenWebhook(kitchen.id, url); // write-through persists in a live session
    try { localStorage.setItem(webhookKey(kitchen.id), url); } catch { /* private mode */ }
    setWebhookSaved(true);
    toast.success(isLive() ? 'Webhook saved — we’ll start POSTing events.' : 'Webhook saved. (Demo — a live account persists this and receives real events.)');
  }

  return (
    <div>
      <PageHeader title="Integrations" description="Connect Culina to the tools you already use." />

      {/* Calendar feed */}
      <Card className="mb-6"><CardContent className="p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold">Calendar feed</h2>
          <Badge variant="success">Live</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe to your kitchen&rsquo;s bookings from any calendar app. The link is read-only and unguessable.
        </p>
        {feedLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Fetching your feed URL…</div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Input readOnly value={isLive() ? feedUrl : SAMPLE_FEED_URL} disabled={!isLive()} className="font-mono text-xs" />
            <Button variant="outline" onClick={copyFeed} disabled={!isLive() || !feedUrl}><Copy className="h-4 w-4" /> Copy</Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Paste into Google/Apple/Outlook calendar subscriptions — updates automatically.
          {!isLive() && ' (Sample shown — create a live account to get your kitchen’s real URL.)'}
        </p>
      </CardContent></Card>

      {/* Webhook */}
      <Card className="mb-6"><CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold">Webhook</h2>
          {webhookSaved ? <Badge variant="success">Connected</Badge> : <Badge variant="muted">Not set</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Send booking and inquiry events to your own tools — Zapier, Make, Slack, or anything with an HTTPS endpoint.
        </p>
        <form onSubmit={saveWebhook} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Label className="sr-only">Webhook URL</Label>
            <Input
              type="url"
              placeholder="https://hooks.example.com/culina"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); setWebhookSaved(false); }}
              className="font-mono text-xs"
            />
          </div>
          <Button type="submit">Save</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">We&rsquo;ll POST booking.created and lead.created events as JSON.</p>
      </CardContent></Card>

      {/* Connected apps */}
      <Card><CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold">Connected apps</h2>
          <Badge variant="muted">Coming soon</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Google Drive, Dropbox, and The Food Corridor sync are coming soon — they require OAuth app registration.
          Until then, the CSV importer in onboarding brings your member data over in minutes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['📁 Google Drive', '🗂️ Dropbox', '🍴 The Food Corridor'].map((n) => (
            <span key={n} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">{n}</span>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}
