import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Star } from 'lucide-react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Footer } from '@/components/layout/Footer';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { listKitchens } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { formatCents, type Kitchen } from '@culina/shared';

const kitchenEmoji = ['🏭', '🥘', '🍽️'];

export default function FindAKitchen() {
  const [params] = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') ?? '');
  // The directory is public: fetch all listed kitchens from the API (so it isn't
  // limited to a logged-in user's own kitchen), falling back to seeded data.
  const [remote, setRemote] = React.useState<Kitchen[] | null>(null);
  React.useEffect(() => {
    dataApi.kitchens().then((d) => setRemote(d.kitchens as Kitchen[])).catch(() => setRemote(null));
  }, []);
  const all = (remote ?? listKitchens()).filter((k) => k.is_listed);

  const filtered = all.filter((k) => {
    if (!q.trim()) return true;
    const hay = `${k.name} ${k.city} ${k.state} ${k.zip}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="bg-white">
      <MarketingNav />
      <section className="bg-primary px-4 pb-16 pt-32 text-secondary lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">The Kitchen Discovery Network</h1>
          <p className="mt-3 text-secondary/80">Open, operator-listed shared kitchens. Find your next home base.</p>
          <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-xl">
            <Search className="ml-3 h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by city, state, or ZIP"
              className="flex-1 bg-transparent px-2 py-2 text-foreground outline-none"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
        <div className="mb-6 text-sm text-muted-foreground">{filtered.length} kitchen{filtered.length !== 1 && 's'} found</div>
        {filtered.length === 0 ? (
          <EmptyState icon={MapPin} title="No kitchens match that search" description="Try a different city or ZIP — the network is growing every week." action={<Button onClick={() => setQ('')}>Clear search</Button>} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((k, i) => (
              <Link
                key={k.id}
                to={`/kitchen/${k.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="relative h-44 overflow-hidden">
                  <SmartImage src={k.cover_image_url ?? undefined} alt={k.name} emoji={kitchenEmoji[i % 3]} gradient="from-slate-700 via-emerald-800 to-primary" className="h-full w-full transition-transform group-hover:scale-105" />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-primary">
                    <Star className="h-3 w-3 fill-accent text-accent" /> Listed
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-heading text-lg font-semibold">{k.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {k.city}, {k.state}
                  </p>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{k.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {k.amenities.slice(0, 3).map((a) => (
                      <Badge key={a} variant="muted">{a}</Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">from {formatCents(k.monthly_price_cents)}/mo</span>
                    <span className="text-sm font-medium text-accent">View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
