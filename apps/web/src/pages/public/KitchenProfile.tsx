import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, Mail, MapPin, Phone } from 'lucide-react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Footer } from '@/components/layout/Footer';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/misc';
import { getKitchenBySlug, listSpaces, listEquipment } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { notifyError } from '@/lib/errors';
import { formatCents, SPACE_TYPE_LABELS } from '@culina/shared';

export default function KitchenProfile() {
  const { slug } = useParams();
  // Seeded/demo kitchens resolve synchronously from the store; live operator
  // kitchens come from the public API. Prefer the live record when present.
  const storeKitchen = slug ? getKitchenBySlug(slug) : null;
  const [remote, setRemote] = React.useState<{ kitchen: any; spaces: any[]; equipment: any[] } | null | undefined>(undefined);
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ full_name: '', email: '', phone: '', business_name: '', message: '' });

  React.useEffect(() => {
    if (!slug) return setRemote(null);
    let active = true;
    dataApi
      .kitchenBySlug(slug)
      .then((d) => active && setRemote(d.kitchen ? { kitchen: d.kitchen, spaces: d.spaces ?? [], equipment: d.equipment ?? [] } : null))
      .catch(() => active && setRemote(null));
    return () => {
      active = false;
    };
  }, [slug]);

  const kitchen = remote?.kitchen ?? storeKitchen;

  // Still resolving and no local match yet → show a spinner instead of "not found".
  if (remote === undefined && !storeKitchen) {
    return (
      <div className="bg-white">
        <MarketingNav />
        <div className="grid min-h-[60vh] place-items-center pt-24">
          <Spinner className="h-8 w-8" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!kitchen) {
    return (
      <div className="bg-white">
        <MarketingNav />
        <div className="grid min-h-[60vh] place-items-center px-4 pt-24 text-center">
          <div>
            <h1 className="font-heading text-2xl font-bold">Kitchen not found</h1>
            <Link to="/find-a-kitchen" className="mt-4 inline-block">
              <Button>Browse all kitchens</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const spaces: any[] = remote?.kitchen ? remote.spaces : storeKitchen ? listSpaces(storeKitchen.id) : [];
  const equipment: any[] = remote?.kitchen ? remote.equipment : storeKitchen ? listEquipment(storeKitchen.id) : [];

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Public endpoint: creates the lead in D1 and emails the operator.
      await dataApi.createLead({
        kitchen_id: kitchen!.id,
        kitchen_slug: kitchen!.slug,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        business_name: form.business_name || undefined,
        message: form.message || undefined,
        source: 'culina_directory',
      });
      setSent(true);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white">
      <MarketingNav />
      <div className="relative h-72 overflow-hidden pt-16">
        <SmartImage src={kitchen.cover_image_url ?? undefined} alt={kitchen.name} emoji="🏭" gradient="from-slate-800 via-emerald-900 to-primary" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-0 w-full px-4 lg:px-8">
          <div className="mx-auto max-w-6xl text-white">
            <h1 className="font-heading text-4xl font-bold">{kitchen.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-white/90"><MapPin className="h-4 w-4" /> {kitchen.address}, {kitchen.city}, {kitchen.state} {kitchen.zip}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-3 lg:px-8">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="font-heading text-2xl font-bold">About this kitchen</h2>
            <p className="mt-3 text-muted-foreground">{kitchen.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(kitchen.amenities as string[]).map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"><Check className="h-3.5 w-3.5 text-emerald-600" />{a}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">Spaces & stations</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {spaces.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{s.name}</h3>
                      <span className="text-xs text-muted-foreground">{SPACE_TYPE_LABELS[s.space_type]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-3 text-sm font-medium text-primary">{formatCents(s.hourly_rate_cents)}/hr · {formatCents(s.daily_rate_cents)}/day</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">Equipment</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {equipment.map((e) => (
                <span key={e.id} className="rounded-full border px-3 py-1 text-sm">{e.name} · {formatCents(e.hourly_rate_cents)}/hr</span>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-card p-6 shadow-card">
            <div className="font-heading text-lg font-semibold">Request space</div>
            <p className="mt-1 text-sm text-muted-foreground">Tell {kitchen.name} about your business.</p>
            {sent ? (
              <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                <Check className="mx-auto mb-2 h-6 w-6" />
                Your request was sent. Watch your inbox!
              </div>
            ) : (
              <form onSubmit={submitLead} className="mt-4 space-y-3">
                <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
                <div><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What do you make, and what space do you need?" /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button>
              </form>
            )}
            <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
              {kitchen.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {kitchen.phone}</div>}
              {kitchen.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {kitchen.email}</div>}
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
