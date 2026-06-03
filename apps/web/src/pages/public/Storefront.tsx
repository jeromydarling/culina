import * as React from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label } from '@/components/ui/input';
import { getTenantProfileBySlug, getTenantSiteBySlug, getTenantSite, listPublicProducts } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { startCheckout } from '@/lib/stripeApi';
import { notifyError } from '@/lib/errors';
import { thumb } from '@/lib/img';
import { Spinner } from '@/components/ui/misc';
import type { Product, TenantProfile, TenantSite } from '@culina/shared';
import { formatCents, feeBreakdown } from '@culina/shared';

const productEmoji = ['🥖', '🧁', '🥯', '🍪', '🥐', '🍞'];

type StoreData = { profile: TenantProfile | null; site: TenantSite | null; products: Product[] };

export default function Storefront() {
  const { slug } = useParams();
  // The public storefront always tries live D1 first (so published edits show
  // for anyone), then falls back to seeded/demo data if there's no backend.
  const [remote, setRemote] = React.useState<StoreData | null | undefined>(undefined);

  React.useEffect(() => {
    if (!slug) { setRemote(null); return; }
    dataApi
      .storefront(slug)
      .then((d) => setRemote(d.profile ? { profile: d.profile, site: d.site ?? null, products: d.products ?? [] } : null))
      .catch(() => setRemote(null));
  }, [slug]);

  const inMemory: StoreData | null = slug
    ? (() => {
        const p = getTenantProfileBySlug(slug);
        return { profile: p, site: getTenantSiteBySlug(slug) ?? (p ? getTenantSite(p.tenant_id) : null), products: p ? listPublicProducts(p.tenant_id) : [] };
      })()
    : null;

  const data = remote ?? inMemory;
  const profile = data?.profile ?? null;
  const site = data?.site ?? null;
  const products = data?.products ?? [];

  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = React.useState(false);
  const [checkout, setCheckout] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [paying, setPaying] = React.useState(false);

  // Returning from Stripe Checkout.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      toast.success('Payment complete — thank you! Your order is confirmed.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === '1') {
      toast.info('Checkout canceled — your cart is still here.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (remote === undefined && !inMemory?.profile) {
    return <div className="grid min-h-screen place-items-center"><Spinner className="h-8 w-8" /></div>;
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-6 text-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Storefront not found</h1>
          <p className="mt-2 text-muted-foreground">This shop may be unpublished.</p>
        </div>
      </div>
    );
  }

  const primary = site?.color_primary ?? '#2D4A3E';
  const secondary = site?.color_secondary ?? '#F5E6C8';

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty }))
    .filter((x) => x.product);
  const subtotal = cartItems.reduce((s, x) => s + x.product.price_cents * x.qty, 0);
  const fb = feeBreakdown(subtotal);
  const count = cartItems.reduce((s, x) => s + x.qty, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);
    try {
      const items = cartItems.map((x) => ({ product_id: x.product.id, qty: x.qty }));
      const res = await startCheckout(slug ?? '', items, email);
      if (res.url) {
        window.location.href = res.url; // hosted Stripe Checkout
        return;
      }
      // No Stripe keys yet → simulated confirmation for the demo.
      setCheckout(false);
      setCartOpen(false);
      setCart({});
      toast.success('Order placed! A confirmation email is on its way. (Demo)');
    } catch (err) {
      notifyError(err, { action: 'checkout' });
    }
    setPaying(false);
  }

  return (
    <div className="min-h-screen" style={{ background: secondary + '40', fontFamily: site?.font_body }}>
      {/* nav */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-heading text-xl font-bold" style={{ color: primary }}>{profile.business_name}</span>
          <button onClick={() => setCartOpen(true)} className="relative rounded-full p-2 hover:bg-muted">
            <ShoppingBag className="h-5 w-5" style={{ color: primary }} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: primary }}>{count}</span>}
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden" style={{ background: primary }}>
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-16 sm:grid-cols-2">
          <div className="text-white">
            <h1 className="font-heading text-4xl font-bold sm:text-5xl">{site?.hero_headline ?? profile.business_name}</h1>
            <p className="mt-4 text-lg text-white/85">{site?.hero_subheadline ?? profile.description}</p>
          </div>
          <div className="h-56 overflow-hidden rounded-2xl shadow-xl">
            <SmartImage src={site?.hero_image_url ?? undefined} alt={profile.business_name ?? 'Storefront'} emoji="🥖" gradient="from-amber-700 via-amber-600 to-yellow-500" className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* products */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-heading text-2xl font-bold" style={{ color: primary }}>Shop</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card">
              <div className="h-44 overflow-hidden">
                <SmartImage src={thumb(p.images[0], 600)} alt={p.name} emoji={productEmoji[i % productEmoji.length]} gradient="from-amber-600 via-orange-500 to-yellow-400" className="h-full w-full" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-heading font-semibold">{p.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
                {p.allergens.length > 0 && <div className="mt-2 text-xs text-muted-foreground">Contains: {p.allergens.join(', ')}</div>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-semibold" style={{ color: primary }}>
                    {formatCents(p.price_cents)}
                    {p.compare_at_price_cents && <span className="ml-1 text-xs text-muted-foreground line-through">{formatCents(p.compare_at_price_cents)}</span>}
                  </div>
                  <Button size="sm" onClick={() => add(p.id)} style={{ background: primary }}>Add</Button>
                </div>
                {p.is_subscription_eligible && <div className="mt-2 text-xs font-medium" style={{ color: primary }}>↻ Subscribe & save ({p.subscription_interval})</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* about */}
      {site?.show_about && site.about_text && (
        <section className="bg-white py-14">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-heading text-2xl font-bold" style={{ color: primary }}>Our story</h2>
            <p className="mt-4 text-muted-foreground">{site.about_text}</p>
          </div>
        </section>
      )}

      <footer className="py-10 text-center text-sm text-muted-foreground">
        <p>{profile.business_name} · Powered by Culina</p>
      </footer>

      {/* cart drawer */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Your cart">
        {cartItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Your cart is empty.</p>
        ) : (
          <>
            <div className="space-y-3">
              {cartItems.map((x) => (
                <div key={x.product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{x.product.name}</div>
                    <div className="text-xs text-muted-foreground">{formatCents(x.product.price_cents)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => sub(x.product.id)} className="rounded border p-1"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center text-sm">{x.qty}</span>
                    <button onClick={() => add(x.product.id)} className="rounded border p-1"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCents(fb.subtotalCents)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Culina platform fee ({fb.feePercent}%)</span><span>{formatCents(fb.platformFeeCents)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCents(fb.totalCents)}</span></div>
            </div>
            <Button className="mt-4 w-full" onClick={() => { setCartOpen(false); setCheckout(true); }} style={{ background: primary }}>Checkout</Button>
          </>
        )}
      </Modal>

      {/* checkout */}
      <Modal open={checkout} onClose={() => setCheckout(false)} title="Checkout" description="Secure payment via Stripe">
        <form onSubmit={placeOrder} className="space-y-3">
          <div><Label>Name</Label><Input required /></div>
          <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Total due</span><span className="font-semibold">{formatCents(fb.totalCents)}</span></div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><X className="h-3 w-3" /> No card charged in demo mode</div>
          </div>
          <Button type="submit" disabled={paying} className="w-full" style={{ background: primary }}>{paying ? 'Redirecting…' : `Pay ${formatCents(fb.totalCents)}`}</Button>
        </form>
      </Modal>
    </div>
  );
}
