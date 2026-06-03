import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, ExternalLink, Eye, Rocket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SmartImage } from '@/components/SmartImage';
import { AiImageButton } from '@/components/AiImageButton';
import { getTenantProfile, getTenantSite, upsertTenantSite, listPublicProducts } from '@/lib/store';
import { callAI } from '@/lib/ai';
import type { TenantSite } from '@culina/shared';
import { formatCents } from '@culina/shared';

const themes = [
  { id: 'warm_artisan', name: 'Warm Artisan', primary: '#2D4A3E', secondary: '#F5E6C8' },
  { id: 'modern_clean', name: 'Modern Clean', primary: '#111827', secondary: '#F3F4F6' },
  { id: 'bold_market', name: 'Bold Market', primary: '#B91C1C', secondary: '#FEF3C7' },
  { id: 'rustic_farm', name: 'Rustic Farm', primary: '#7C5E10', secondary: '#FAF3E0' },
  { id: 'elegant_patisserie', name: 'Elegant Patisserie', primary: '#5B2333', secondary: '#FCE7EF' },
];

export default function StorefrontEditor() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id)!;
  const existing = getTenantSite(profile!.id);
  const [vibe, setVibe] = React.useState('warm, honest, neighborly');
  const [generating, setGenerating] = React.useState(false);
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

  function set(patch: Partial<TenantSite>) {
    setSite((s) => ({ ...s, ...patch }));
  }

  async function generate() {
    setGenerating(true);
    const fallback = JSON.stringify({
      headline: `${tp.business_name}: ${tp.business_type === 'bakery' ? 'Bread with a soul' : 'Made with care, sold with pride'}`,
      subheadline: `Small-batch ${tp.business_type ?? 'food'}, made fresh and sold to neighbors who notice the difference.`,
      about: `${tp.business_name} started with a simple belief: good food, made honestly, can build a livelihood. ${tp.description ?? ''} Every order supports a small maker growing one batch at a time.`,
      meta: `${tp.business_name} — ${tp.business_type ?? 'artisan food'} made fresh. Order online.`,
    });
    const raw = await callAI('generate-storefront-copy', { business_name: tp.business_name, business_type: tp.business_type, vibe, products: products.map((p) => p.name) }, fallback);
    try {
      const parsed = JSON.parse(raw);
      set({ hero_headline: parsed.headline, hero_subheadline: parsed.subheadline, about_text: parsed.about, meta_description: parsed.meta });
    } catch {
      set({ about_text: raw });
    }
    setGenerating(false);
    toast.success('Copy generated — edit anything you like.');
  }

  function publish() {
    upsertTenantSite({ ...site, is_published: true });
    toast.success('Storefront published!');
    set({ is_published: true });
  }

  return (
    <div>
      <PageHeader
        title="Storefront Builder"
        description="Generate your site with AI, then make it yours."
        action={
          <>
            <Link to={`/shop/${site.site_slug}`} target="_blank"><Button variant="outline"><Eye className="h-4 w-4" /> Preview</Button></Link>
            <Button onClick={publish}><Rocket className="h-4 w-4" /> {site.is_published ? 'Republish' : 'Publish'}</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Editor */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI copy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Describe your vibe (3 words)</Label><Input value={vibe} onChange={(e) => setVibe(e.target.value)} /></div>
              <Button variant="accent" className="w-full" onClick={generate} disabled={generating}>
                {generating ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Generate hero, tagline & about'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Hero image</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border">
                    <SmartImage src={site.hero_image_url ?? undefined} alt="Hero" emoji="🥖" gradient="from-amber-700 to-yellow-500" className="h-full w-full" />
                  </div>
                  <AiImageButton
                    prompt={`${tp.business_name ?? ''}, ${tp.business_type ?? 'artisan food'}, ${vibe}`}
                    style="storefront"
                    label="Generate hero"
                    onGenerated={(url) => set({ hero_image_url: url })}
                  />
                </div>
              </div>
              <div><Label>Hero headline</Label><Input value={site.hero_headline ?? ''} onChange={(e) => set({ hero_headline: e.target.value })} /></div>
              <div><Label>Subheadline</Label><Textarea value={site.hero_subheadline ?? ''} onChange={(e) => set({ hero_subheadline: e.target.value })} /></div>
              <div><Label>About</Label><Textarea rows={4} value={site.about_text ?? ''} onChange={(e) => set({ about_text: e.target.value })} /></div>
              <div><Label>Storefront URL</Label><div className="flex items-center gap-1 rounded-lg border px-2"><span className="text-sm text-muted-foreground">/shop/</span><Input className="border-0 px-1 focus-visible:ring-0" value={site.site_slug} onChange={(e) => set({ site_slug: e.target.value })} /></div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((t) => (
                  <button key={t.id} type="button" onClick={() => set({ theme: t.id, color_primary: t.primary, color_secondary: t.secondary })} className={cn('rounded-lg border p-3 text-left text-sm', site.theme === t.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                    <div className="mb-2 flex gap-1"><span className="h-5 w-5 rounded" style={{ background: t.primary }} /><span className="h-5 w-5 rounded" style={{ background: t.secondary }} /></div>
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-3">
                <div><Label>Primary</Label><input type="color" value={site.color_primary} onChange={(e) => set({ color_primary: e.target.value })} className="h-9 w-full rounded border" /></div>
                <div><Label>Secondary</Label><input type="color" value={site.color_secondary} onChange={(e) => set({ color_secondary: e.target.value })} className="h-9 w-full rounded border" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-3">
          <div className="sticky top-24 overflow-hidden rounded-xl border shadow-card">
            <div className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-muted-foreground">culina.app/shop/{site.site_slug}</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto" style={{ background: site.color_secondary + '55' }}>
              <div style={{ background: site.color_primary }} className="p-8 text-white">
                <h1 className="font-heading text-3xl font-bold">{site.hero_headline}</h1>
                <p className="mt-2 opacity-90">{site.hero_subheadline}</p>
              </div>
              <div className="p-6">
                <h2 className="font-heading text-xl font-bold" style={{ color: site.color_primary }}>Shop</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {products.slice(0, 4).map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-lg border bg-white">
                      <SmartImage src={p.images[0]} alt={p.name} emoji="🥖" gradient="from-amber-600 to-yellow-400" className="h-24 w-full" />
                      <div className="p-2"><div className="text-sm font-medium">{p.name}</div><div className="text-sm" style={{ color: site.color_primary }}>{formatCents(p.price_cents)}</div></div>
                    </div>
                  ))}
                </div>
                {site.show_about && (
                  <div className="mt-6">
                    <h2 className="font-heading text-xl font-bold" style={{ color: site.color_primary }}>Our story</h2>
                    <p className="mt-2 text-sm text-foreground/70">{site.about_text}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Link to={`/shop/${site.site_slug}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open full storefront <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
