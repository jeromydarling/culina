import * as React from 'react';
import { toast } from 'sonner';
import { Sparkles, Plus, Mail, Camera, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useForceUpdate } from '@/lib/hooks';
import { PageHeader, Tabs, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartImage } from '@/components/SmartImage';
import { AiImageButton } from '@/components/AiImageButton';
import { getTenantProfile, listEmailSubscribers, addEmailSubscriber } from '@/lib/store';
import { callAI } from '@/lib/ai';

export default function Marketing() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const [tab, setTab] = React.useState('logo');

  return (
    <div>
      <PageHeader title="Marketing Studio" description="Brand assets, social content, and your customer list — all in one place." />
      <Tabs
        tabs={[
          { id: 'logo', label: 'Logo & brand' },
          { id: 'social', label: 'Social posts' },
          { id: 'email', label: 'Email list' },
          { id: 'photo', label: 'Photography' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'logo' && <LogoStudio name={tp?.business_name ?? ''} type={tp?.business_type ?? ''} />}
      {tab === 'social' && <SocialStudio name={tp?.business_name ?? ''} type={tp?.business_type ?? ''} />}
      {tab === 'email' && <EmailStudio tenantId={profile!.id} />}
      {tab === 'photo' && <PhotoTips />}
    </div>
  );
}

function LogoStudio({ name, type }: { name: string; type: string }) {
  const [logo, setLogo] = React.useState<string | null>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI logo generator</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-xl border">
            <SmartImage src={logo ?? undefined} alt="Logo" emoji="🎨" gradient="from-primary to-accent" className="h-full w-full" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Generate a starting logo emblem with Flux, then refine it or hand it to a designer. Steered to a clean, flat, text-free mark.</p>
            <div className="mt-3">
              <AiImageButton prompt={`${name}, ${type} food brand`} style="logo" label="Generate logo" onGenerated={setLogo} />
            </div>
            {logo && <a href={logo} download="culina-logo.jpg" className="mt-3 inline-block text-sm text-primary hover:underline">Download</a>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialStudio({ name, type }: { name: string; type: string }) {
  const [topic, setTopic] = React.useState('');
  const [out, setOut] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function generate() {
    setLoading(true);
    const fallback = [
      `📸 Caption ideas for ${name || 'your brand'}:`,
      ``,
      `1. "Made this morning, gone by noon. ${topic || 'Fresh batch'} is ready — tag a friend who needs one. 🌿"`,
      `2. "Behind every ${type || 'good bite'} is a 4am start and a lot of love. Pre-orders open now (link in bio)."`,
      `3. "Small batch, big flavor. This week's ${topic || 'special'} drops Saturday — set a reminder. ⏰"`,
      ``,
      `Hashtags: #shoplocal #smallbatch #madefromscratch #${(type || 'food').replace(/\s/g, '')}`,
    ].join('\n');
    const text = await callAI('tutor', { question: `Write 3 short, engaging Instagram captions (with emoji and a few hashtags) for ${name}, a ${type} business, about: ${topic}.`, context: { business_type: type } }, fallback);
    setOut(text);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Social post generator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>What's the post about?</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. new cinnamon morning buns this weekend" /></div>
        <Button variant="accent" onClick={generate} disabled={loading}>{loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Generate captions'}</Button>
        {out && (
          <div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{out}</pre>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { navigator.clipboard?.writeText(out); toast.success('Copied'); }}><Copy className="h-3 w-3" /> Copy</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmailStudio({ tenantId }: { tenantId: string }) {
  const force = useForceUpdate();
  const subs = listEmailSubscribers(tenantId);
  const [form, setForm] = React.useState({ email: '', name: '' });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) return;
    addEmailSubscriber(tenantId, form.email, form.name);
    setForm({ email: '', name: '' });
    force();
    toast.success('Subscriber added');
  }

  function exportCsv() {
    const escape = (v: string | null) => {
      const s = v ?? '';
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      'email,name,source,created_at',
      ...subs.map((s) => [s.email, s.name, s.source, s.created_at].map(escape).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Subscriber list downloaded');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> Add subscriber</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Name (optional)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Add</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Subscribers also collect automatically from your storefront checkout.</p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Your list ({subs.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b px-5 py-2.5 text-sm last:border-0">
              <span>{s.email}</span>
              <span className="text-xs text-muted-foreground">{s.name ?? '—'} · {s.source}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoTips() {
  const tips = [
    'Shoot in natural light near a window — never use overhead kitchen fluorescents.',
    'Use a clean, neutral surface (wood, marble, or craft paper) and remove clutter.',
    'Get close and fill the frame; a 45° angle flatters most plated food.',
    'Style with a prop that hints at scale or ingredients (a hand towel, a few raw ingredients).',
    'Shoot a few orientations: square for the grid, vertical for stories, wide for your storefront hero.',
    'Edit lightly — bump brightness and contrast, keep colors true to the real product.',
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4 text-accent" /> Product photography tips</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
