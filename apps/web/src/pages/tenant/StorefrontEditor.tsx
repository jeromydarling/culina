import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, ExternalLink, Eye, Rocket, Undo2, ImageIcon, Send, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Tabs, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SmartImage } from '@/components/SmartImage';
import { ImageStudio } from '@/components/ImageStudio';
import { getTenantProfile, getTenantSite, upsertTenantSite, listPublicProducts } from '@/lib/store';
import { editSite } from '@/lib/ai';
import type { TenantSite } from '@culina/shared';
import { formatCents } from '@culina/shared';
import { thumb } from '@/lib/img';

const themes = [
  { id: 'warm_artisan', name: 'Warm Artisan', primary: '#2D4A3E', secondary: '#F5E6C8' },
  { id: 'modern_clean', name: 'Modern Clean', primary: '#111827', secondary: '#F3F4F6' },
  { id: 'bold_market', name: 'Bold Market', primary: '#B91C1C', secondary: '#FEF3C7' },
  { id: 'rustic_farm', name: 'Rustic Farm', primary: '#7C5E10', secondary: '#FAF3E0' },
  { id: 'elegant_patisserie', name: 'Elegant Patisserie', primary: '#5B2333', secondary: '#FCE7EF' },
];

const QUICK_COMMANDS = [
  'Make it feel warmer and more rustic',
  'Write a punchier hero headline',
  'Rewrite the about section to mention our 24-hour fermentation',
  'Switch to a bold, vibrant market style',
];

export default function StorefrontEditor() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id)!;
  const existing = getTenantSite(profile!.id);
  const [tab, setTab] = React.useState('content');
  const [studioOpen, setStudioOpen] = React.useState(false);
  const [command, setCommand] = React.useState('');
  const [aiBusy, setAiBusy] = React.useState(false);
  const [history, setHistory] = React.useState<TenantSite[]>([]);

  const [site, setSite] = React.useState<TenantSite>(
    existing ?? {
      id: 'new', tenant_id: profile!.id, site_slug: tp.business_slug ?? 'my-shop', theme: 'warm_artisan',
      hero_headline: tp.business_name ?? 'My Food Business', hero_subheadline: tp.description ?? '', hero_image_url: null,
      about_text: tp.description ?? '', color_primary: '#2D4A3E', color_secondary: '#F5E6C8', font_heading: 'Playfair Display',
      font_body: 'Inter', show_products: true, show_about: true, show_contact: true, show_social: true, custom_domain: null,
      is_published: false, meta_title: null, meta_description: null, created_at: '', updated_at: '',
    },
  );
  const products = listPublicProducts(profile!.id);

  function set(patch: Partial<TenantSite>, snapshot = false) {
    if (snapshot) setHistory((h) => [...h.slice(-19), site]);
    setSite((s) => ({ ...s, ...patch }));
  }
  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      setSite(h[h.length - 1]);
      return h.slice(0, -1);
    });
    toast.success('Reverted last change');
  }

  async function runCommand(cmd: string) {
    const c = cmd.trim();
    if (!c) return;
    setAiBusy(true);
    const patch = await editSite(c, site as unknown as Record<string, unknown>);
    setAiBusy(false);
    const keys = Object.keys(patch);
    if (!keys.length) return toast.info('No changes suggested — try rephrasing.');
    set(patch as Partial<TenantSite>, true);
    setCommand('');
    toast.success(`Updated: ${keys.map((k) => k.replace(/_/g, ' ')).join(', ')}`, {
      action: { label: 'Undo', onClick: undo },
    });
  }

  function save() {
    upsertTenantSite(site);
    toast.success('Saved');
  }
  function publish() {
    upsertTenantSite({ ...site, is_published: true });
    set({ is_published: true });
    toast.success('Storefront published!');
  }

  return (
    <div>
      <PageHeader
        title="Website Manager"
        description="Edit your live site with plain-language AI commands — you’re always in control."
        action={
          <>
            {history.length > 0 && <Button variant="ghost" onClick={undo}><Undo2 className="h-4 w-4" /> Undo</Button>}
            <Link to={`/shop/${site.site_slug}`} target="_blank"><Button variant="outline"><Eye className="h-4 w-4" /> Preview</Button></Link>
            <Button variant="outline" onClick={save}>Save</Button>
            <Button onClick={publish}><Rocket className="h-4 w-4" /> {site.is_published ? 'Republish' : 'Publish'}</Button>
          </>
        }
      />

      {/* AI command bar */}
      <Card className="mb-6 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4 text-accent" /> Tell the AI what to change</div>
          <form onSubmit={(e) => { e.preventDefault(); runCommand(command); }} className="mt-2 flex gap-2">
            <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="e.g. make the hero warmer and rewrite the tagline to mention weekly bakes" />
            <Button type="submit" variant="accent" disabled={aiBusy}>{aiBusy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Send className="h-4 w-4" />}</Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((q) => (
              <button key={q} onClick={() => runCommand(q)} disabled={aiBusy} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">{q}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Editor */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs
            tabs={[{ id: 'content', label: 'Content' }, { id: 'design', label: 'Design' }, { id: 'images', label: 'Images' }, { id: 'seo', label: 'SEO' }]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'content' && (
            <Card><CardContent className="space-y-3 p-5">
              <div><Label>Hero headline</Label><Input value={site.hero_headline ?? ''} onChange={(e) => set({ hero_headline: e.target.value })} /></div>
              <div><Label>Subheadline</Label><Textarea value={site.hero_subheadline ?? ''} onChange={(e) => set({ hero_subheadline: e.target.value })} /></div>
              <div><Label>About</Label><Textarea rows={4} value={site.about_text ?? ''} onChange={(e) => set({ about_text: e.target.value })} /></div>
              <div>
                <Label>Sections</Label>
                <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  {([['show_products', 'Products'], ['show_about', 'About'], ['show_contact', 'Contact'], ['show_social', 'Social']] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 rounded-lg border p-2"><input type="checkbox" checked={site[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<TenantSite>)} /> {label}</label>
                  ))}
                </div>
              </div>
            </CardContent></Card>
          )}

          {tab === 'design' && (
            <Card><CardContent className="space-y-3 p-5">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button key={t.id} type="button" onClick={() => set({ theme: t.id, color_primary: t.primary, color_secondary: t.secondary })} className={cn('rounded-lg border p-3 text-left text-sm', site.theme === t.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                    <div className="mb-2 flex gap-1"><span className="h-5 w-5 rounded" style={{ background: t.primary }} /><span className="h-5 w-5 rounded" style={{ background: t.secondary }} /></div>
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Label>Primary</Label><input type="color" value={site.color_primary} onChange={(e) => set({ color_primary: e.target.value })} className="h-9 w-full rounded border" /></div>
                <div className="flex-1"><Label>Secondary</Label><input type="color" value={site.color_secondary} onChange={(e) => set({ color_secondary: e.target.value })} className="h-9 w-full rounded border" /></div>
              </div>
            </CardContent></Card>
          )}

          {tab === 'images' && (
            <Card><CardContent className="space-y-3 p-5">
              <Label>Hero image</Label>
              <div className="overflow-hidden rounded-lg border">
                <div className="aspect-[16/7] w-full"><SmartImage src={site.hero_image_url ?? undefined} alt="Hero" emoji="🥖" gradient="from-amber-700 to-yellow-500" className="h-full w-full" /></div>
              </div>
              <Button variant="accent" className="w-full" onClick={() => setStudioOpen(true)}><ImageIcon className="h-4 w-4" /> Open Image Studio</Button>
              <p className="text-xs text-muted-foreground">Generate Flux options, compare, and apply only when you’re happy. Product photos are managed per-product in <Link to="/tenant/products" className="text-primary hover:underline">Products</Link>.</p>
            </CardContent></Card>
          )}

          {tab === 'seo' && (
            <Card><CardContent className="space-y-3 p-5">
              <div><Label>Storefront URL</Label><div className="flex items-center gap-1 rounded-lg border px-2"><span className="text-sm text-muted-foreground">/shop/</span><Input className="border-0 px-1 focus-visible:ring-0" value={site.site_slug} onChange={(e) => set({ site_slug: e.target.value })} /></div></div>
              <div><Label>Meta title</Label><Input value={site.meta_title ?? ''} onChange={(e) => set({ meta_title: e.target.value })} /></div>
              <div><Label>Meta description</Label><Textarea value={site.meta_description ?? ''} onChange={(e) => set({ meta_description: e.target.value })} /></div>
            </CardContent></Card>
          )}
        </div>

        {/* Live preview */}
        <div className="lg:col-span-3">
          <div className="sticky top-24 overflow-hidden rounded-xl border shadow-card">
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-muted-foreground">culina.app/shop/{site.site_slug}</span>
              <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium', site.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{site.is_published ? 'Published' : 'Draft'}</span>
            </div>
            <div className="max-h-[72vh] overflow-y-auto" style={{ background: site.color_secondary + '55' }}>
              <div style={{ background: site.color_primary }} className="relative p-8 text-white">
                <h1 className="font-heading text-3xl font-bold">{site.hero_headline}</h1>
                <p className="mt-2 opacity-90">{site.hero_subheadline}</p>
              </div>
              {site.hero_image_url && <div className="h-40 w-full overflow-hidden"><SmartImage src={site.hero_image_url} alt="hero" emoji="🥖" gradient="from-amber-700 to-yellow-500" className="h-full w-full" /></div>}
              {site.show_products && (
                <div className="p-6">
                  <h2 className="font-heading text-xl font-bold" style={{ color: site.color_primary }}>Shop</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {products.slice(0, 4).map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-lg border bg-white">
                        <SmartImage src={thumb(p.images[0], 400)} alt={p.name} emoji="🥖" gradient="from-amber-600 to-yellow-400" className="h-24 w-full" />
                        <div className="p-2"><div className="text-sm font-medium">{p.name}</div><div className="text-sm" style={{ color: site.color_primary }}>{formatCents(p.price_cents)}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {site.show_about && site.about_text && (
                <div className="p-6"><h2 className="font-heading text-xl font-bold" style={{ color: site.color_primary }}>Our story</h2><p className="mt-2 text-sm text-foreground/70">{site.about_text}</p></div>
              )}
              {site.show_contact && (
                <div className="p-6"><h2 className="font-heading text-xl font-bold" style={{ color: site.color_primary }}>Visit us</h2><p className="mt-2 text-sm text-foreground/70">Order online for pickup, or reach out to say hello.</p></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImageStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        title="Hero image studio"
        promptSeed={`${tp.business_name ?? ''}, ${tp.business_type ?? 'artisan food'} hero image`}
        style="storefront"
        current={site.hero_image_url}
        onApply={(url) => set({ hero_image_url: url }, true)}
      />
    </div>
  );
}
