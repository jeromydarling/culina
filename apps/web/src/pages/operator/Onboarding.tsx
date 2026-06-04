import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, Check, Sparkles, UploadCloud, FileSpreadsheet, Users,
  Megaphone, PartyPopper, Wand2, Database,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { getKitchenByOperator, importTenants, createAnnouncement, type ImportTenantRow } from '@/lib/store';
import { PROVIDERS, getConnections, setConnection } from '@/lib/integrations';
import { completeStep, markWelcomed } from '@/lib/onboarding';
import { callAI } from '@/lib/ai';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';

const SAMPLE_CSV = `Business Name,Contact,Email,Type,Plan,Status
Sara's Sourdough,Sara Bakes,sara@example.com,bakery,monthly,active
Marco's Salsa Co,Marco Ruiz,marco@example.com,packaged,hourly,active
Amara Catering,Amara Okafor,amara@example.com,caterer,hourly,pending
Dulce Lena,Lena Ortiz,lena@example.com,bakery,monthly,active`;

type Parsed = { headers: string[]; rows: ImportTenantRow[]; raw: string[][] };

function parseCsv(text: string): Parsed {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [], raw: [] };
  const split = (l: string) => l.split(',').map((c) => c.trim());
  const headers = split(lines[0]);
  const raw = lines.slice(1).map(split);
  const find = (cands: string[]) => headers.findIndex((h) => cands.some((c) => h.toLowerCase().includes(c)));
  const ix = {
    business: find(['business', 'company', 'shop']),
    name: find(['contact', 'name', 'owner']),
    email: find(['email', 'e-mail']),
    type: find(['type', 'category']),
    plan: find(['plan', 'membership']),
    status: find(['status', 'state']),
  };
  const rows: ImportTenantRow[] = raw.map((cells) => ({
    business_name: ix.business >= 0 ? cells[ix.business] : cells[0],
    full_name: ix.name >= 0 ? cells[ix.name] : undefined,
    email: ix.email >= 0 ? cells[ix.email] : '',
    business_type: ix.type >= 0 ? cells[ix.type] : undefined,
    plan: ix.plan >= 0 ? cells[ix.plan] : undefined,
    status: ix.status >= 0 ? cells[ix.status] : undefined,
  }));
  return { headers, rows, raw };
}

const STEPS = ['Welcome', 'Bring your data', 'Map & import', 'Bring members over', 'Grow revenue', 'Done'];

export default function Onboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const [step, setStep] = React.useState(0);

  // import state
  const [source, setSource] = React.useState<string>('');
  const [csv, setCsv] = React.useState('');
  const [parsed, setParsed] = React.useState<Parsed | null>(null);
  const [mapping, setMapping] = React.useState('');
  const [mapLoading, setMapLoading] = React.useState(false);
  const [imported, setImported] = React.useState(0);
  const [, forceConn] = React.useReducer((x) => x + 1, 0);
  const connections = getConnections();

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function analyze() {
    const p = parseCsv(csv);
    setParsed(p);
    if (p.rows.length === 0) return toast.error('Couldn’t detect rows — check your CSV has a header row.');
    setMapLoading(true);
    const fallback = `I detected ${p.rows.length} members across ${p.headers.length} columns. Here's how I'll map them:\n\n• "${p.headers.join('", "')}"\n\n→ business name, contact, email, type, plan, and status. Everything looks importable — review the preview and click Import.`;
    const text = await callAI('tutor', { question: `I'm importing kitchen tenants from a CSV with columns: ${p.headers.join(', ')}. Briefly confirm the column mapping and flag anything to double-check.`, context: { task: 'data_import' } }, fallback);
    setMapping(text);
    setMapLoading(false);
  }

  const [importing, setImporting] = React.useState(false);
  async function runImport() {
    if (!parsed) return;
    setImporting(true);
    try {
      let n: number;
      if (isLive()) {
        // Persist to Cloudflare D1 via the Worker.
        n = (await dataApi.importTenants(parsed.rows)).imported;
      } else {
        n = importTenants(kitchen.id, parsed.rows);
      }
      setImported(n);
      completeStep(profile!.id, 'import');
      toast.success(`Imported ${n} member${n !== 1 ? 's' : ''}${isLive() ? ' to D1' : ''}`);
      next();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function connect(id: string) {
    setConnection(id, true);
    forceConn();
    toast.success(`${PROVIDERS.find((p) => p.id === id)?.name} connected (demo — keys wired later)`);
  }

  function finish() {
    markWelcomed(profile!.id);
    navigate('/operator');
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* progress */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn('grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-colors', i < step ? 'bg-primary text-secondary' : i === step ? 'bg-accent text-white' : 'bg-muted text-muted-foreground')}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-1 h-1 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      {/* WELCOME */}
      {step === 0 && (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Wand2 className="h-7 w-7" /></div>
          <h1 className="mt-4 font-heading text-3xl font-bold">Welcome to Culina, {profile!.full_name?.split(' ')[0]} 👋</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Let’s get <strong>{kitchen.name}</strong> live in a few minutes. We’ll bring in your existing
            members and data from wherever they live today, then set you up to fill your kitchen and grow
            revenue — for you and your makers.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-left">
            {[
              { icon: Database, t: 'Import your data', d: 'From a spreadsheet, Drive, Dropbox, or The Food Corridor.' },
              { icon: Users, t: 'Bring members over', d: 'Bulk-invite your current makers with one click.' },
              { icon: Megaphone, t: 'Grow revenue', d: 'Turn on storefronts & AI sites your members will love.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border p-4"><c.icon className="h-5 w-5 text-accent" /><div className="mt-2 text-sm font-semibold">{c.t}</div><div className="text-xs text-muted-foreground">{c.d}</div></div>
            ))}
          </div>
          <Button size="lg" className="mt-7" onClick={next}>Let’s go <ArrowRight className="h-4 w-4" /></Button>
        </CardContent></Card>
      )}

      {/* BRING DATA */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Bring your data in</h2>
            <p className="text-muted-foreground">Where do you keep your member & booking info today?</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'csv', name: 'Spreadsheet (CSV / Excel)', emoji: '📄' },
              { id: 'food_corridor', name: 'The Food Corridor export', emoji: '🍴' },
              { id: 'google_drive', name: 'Google Drive', emoji: '📁' },
              { id: 'dropbox', name: 'Dropbox', emoji: '🗂️' },
            ].map((s) => {
              const isConn = s.id === 'csv' || s.id === 'food_corridor' || connections[s.id];
              return (
                <button key={s.id} onClick={() => setSource(s.id)} className={cn('flex items-center gap-3 rounded-xl border p-4 text-left transition-all', source === s.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                  <span className="text-2xl">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{s.name}</div>
                    {(s.id === 'google_drive' || s.id === 'dropbox') && (
                      isConn
                        ? <span className="text-xs text-emerald-600">Connected</span>
                        : <button onClick={(e) => { e.stopPropagation(); connect(s.id); }} className="text-xs text-primary hover:underline">Connect</button>
                    )}
                  </div>
                  {source === s.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>

          {source && (
            <Card><CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <Label>Paste your member rows (CSV with a header line)</Label>
                <Button size="sm" variant="ghost" onClick={() => setCsv(SAMPLE_CSV)}>Use sample</Button>
              </div>
              <Textarea rows={7} className="font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={SAMPLE_CSV} />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <UploadCloud className="h-3.5 w-3.5" /> {source === 'google_drive' || source === 'dropbox' ? 'File picker is stubbed for now — paste the contents to preview the import.' : 'Drag-and-drop upload is wired to R2 once your bucket is created.'}
              </p>
            </CardContent></Card>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={async () => { await analyze(); next(); }} disabled={!csv.trim()}>
              <Sparkles className="h-4 w-4" /> Analyze with AI
            </Button>
          </div>
        </div>
      )}

      {/* MAP & IMPORT */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">AI mapped your data</h2>
            <p className="text-muted-foreground">Review the preview, then import into your live account.</p>
          </div>

          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-accent" /> Culina AI</div>
            {mapLoading ? <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Reading your columns…</div>
              : <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{mapping}</pre>}
          </CardContent></Card>

          {parsed && parsed.rows.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2 text-sm">
                <span className="font-medium">{parsed.rows.length} members detected</span>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Business</th><th className="p-3">Email</th><th className="p-3">Type</th><th className="p-3">Plan</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {parsed.rows.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-t"><td className="p-3 font-medium">{r.business_name}</td><td className="p-3 text-muted-foreground">{r.email}</td><td className="p-3">{r.business_type ?? '—'}</td><td className="p-3 capitalize">{r.plan ?? 'hourly'}</td><td className="p-3"><Badge variant="muted">{r.status ?? 'active'}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 6 && <div className="border-t px-4 py-2 text-xs text-muted-foreground">+ {parsed.rows.length - 6} more</div>}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={runImport} disabled={!parsed?.rows.length || importing}>{importing ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Database className="h-4 w-4" /> Import {parsed?.rows.length ?? 0} members</>}</Button>
          </div>
        </div>
      )}

      {/* MIGRATE */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Bring your members aboard</h2>
            <p className="text-muted-foreground">{imported > 0 ? `${imported} members imported.` : ''} Send them a friendly invite to claim their account.</p>
          </div>
          <Card><CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-accent" /> AI-drafted migration email</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{`Subject: We've upgraded — your ${kitchen.name} account is ready 🎉

Hi there,

We've moved ${kitchen.name} onto Culina to make your life easier: book the kitchen and equipment online, keep your certs in one place, and — new — launch a free online storefront and AI-built website for your business.

Click below to claim your account (everything's already set up for you):
→ ${typeof window !== 'undefined' ? window.location.origin : 'https://culina.app'}/auth/signup

Can't wait to see you grow,
${profile!.full_name}`}</pre>
            <Button onClick={() => { completeStep(profile!.id, 'promote'); toast.success(`Invitations sent to ${imported || 'your'} members (demo)`); }}>
              <Users className="h-4 w-4" /> Send invitations to everyone you imported
            </Button>
          </CardContent></Card>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* GROW REVENUE */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Turn on the money-makers</h2>
            <p className="text-muted-foreground">These features grow your members’ revenue — and yours, through the marketplace.</p>
          </div>
          <div className="grid gap-3">
            {[
              { t: 'AI Website + Storefront', d: 'Every member gets a free AI-built storefront. You earn 1.5% of their online sales.', cta: 'Announce to members' },
              { t: 'Peer-to-peer Marketplace', d: 'Members trade surplus ingredients, packaging & equipment time. Culina shares marketplace commission.', cta: 'Enable marketplace' },
              { t: 'Grant & Capital Finder', d: 'Point members to funding partners — strengthening retention and your community.', cta: 'Highlight to members' },
            ].map((c) => (
              <Card key={c.t}><CardContent className="flex items-center justify-between gap-4 p-5">
                <div><h3 className="font-semibold">{c.t}</h3><p className="text-sm text-muted-foreground">{c.d}</p></div>
                <Button variant="outline" onClick={() => { createAnnouncement({ kitchen_id: kitchen.id, author_id: profile!.id, title: c.t + ' is live!', body: c.d }); toast.success('Announced to your members'); }}>{c.cta}</Button>
              </CardContent></Card>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={next}>Finish setup <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 5 && (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600"><PartyPopper className="h-7 w-7" /></div>
          <h1 className="mt-4 font-heading text-3xl font-bold">You’re live! 🎉</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            {imported > 0 ? `${imported} members are in your dashboard. ` : ''}
            Your kitchen is set up and ready to fill. From here, manage bookings, track compliance, and watch revenue grow.
          </p>
          <Button size="lg" className="mt-7" onClick={finish}>Go to my dashboard <ArrowRight className="h-4 w-4" /></Button>
        </CardContent></Card>
      )}
    </div>
  );
}
