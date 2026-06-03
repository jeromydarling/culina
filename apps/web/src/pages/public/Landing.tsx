import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ChefHat,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Globe,
  GraduationCap,
  HeartHandshake,
  LineChart,
  Search,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
  Check,
} from 'lucide-react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/Reveal';
import { SmartImage } from '@/components/SmartImage';
import { Button } from '@/components/ui/button';
import { BrowserFrame } from '@/components/marketing/BrowserFrame';
import {
  ScreenCalendar,
  ScreenCompliance,
  ScreenDiscovery,
  ScreenStorefront,
} from '@/components/marketing/MarketingScreens';
import { IMG } from '@/lib/images';
import { OPERATOR_PLANS, TENANT_PLANS, formatCents, PLATFORM_FEE_PERCENT } from '@culina/shared';

const foodMarquee = [
  '🥖 Bakeries',
  '🌶️ Hot sauce',
  '🍫 Chocolatiers',
  '🍜 Meal prep',
  '🧁 Pastry',
  '🥫 Preserves',
  '🍝 Pasta makers',
  '🧀 Cheesemongers',
  '🍪 Cookie co.',
  '🌮 Caterers',
  '🍯 Honey + jam',
  '☕ Roasters',
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-white">
      <MarketingNav />
      <Hero />
      <Marquee />
      <Why />
      <Problem />
      <Solution />
      <Showcase />
      <Audiences />
      <Features />
      <SeeItLive />
      <Compare />
      <Pricing />
      <Discovery />
      <Testimonials />
      <Mission />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────── HERO ─────────────────────────────── */
function Hero() {
  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden bg-primary">
      {/* animated gradient + blobs */}
      <div className="absolute inset-0 bg-animated-gradient bg-[linear-gradient(120deg,#1f3a2e,#2D4A3E,#33564a,#2D4A3E)]" />
      <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-accent/30 blur-3xl animate-blob" />
      <div className="absolute right-0 top-40 h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-3xl animate-blob [animation-delay:3s]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-secondary/20 blur-3xl animate-blob [animation-delay:6s]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-32 lg:grid-cols-2 lg:px-8 lg:pt-36">
        <div className="animate-risein">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-white/5 px-4 py-1.5 text-sm font-medium text-secondary backdrop-blur">
            <Sparkles className="h-4 w-4 text-accent" />
            We grow only when you grow
          </span>
          <h1 className="mt-6 font-heading text-5xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl text-balance">
            The kitchen is ready.
            <span className="block bg-gradient-to-r from-accent via-amber-300 to-secondary bg-clip-text text-transparent">
              Is your food business?
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary/85">
            Culina is the all-in-one home for shared commercial kitchens and the food makers inside them.
            Booking, compliance, storefronts, funding, and growth — radically affordable, because the
            tools that help people build should be within everyone’s reach.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth/signup">
              <Button size="lg" variant="accent" className="w-full sm:w-auto">
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-white/10 sm:w-auto">
                Explore the live demo
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-secondary/70">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Free for makers</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> From $19/mo for operators</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Just {PLATFORM_FEE_PERCENT}% on transactions</span>
          </div>
        </div>

        {/* floating image collage */}
        <div className="relative hidden h-[34rem] lg:block">
          <div className="absolute right-4 top-0 h-56 w-72 rotate-3 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20 animate-float">
            <SmartImage src={IMG.heroBread} alt="Fresh sourdough loaves cooling on a rack" emoji="🥖" gradient="from-amber-700 via-amber-600 to-yellow-500" className="h-full w-full" />
          </div>
          <div className="absolute left-0 top-32 h-52 w-64 -rotate-3 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20 animate-float-slow">
            <SmartImage src={IMG.heroKitchen} alt="Stainless steel commercial kitchen prep line" emoji="🍳" gradient="from-slate-600 via-slate-500 to-zinc-400" className="h-full w-full" />
          </div>
          <div className="absolute bottom-6 right-12 h-48 w-60 rotate-2 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20 animate-float [animation-delay:1.5s]">
            <SmartImage src={IMG.heroJars} alt="Rows of fire-roasted salsa jars" emoji="🌶️" gradient="from-red-700 via-rose-600 to-orange-500" className="h-full w-full" />
          </div>
          <div className="absolute bottom-32 left-8 grid h-28 w-44 place-items-center rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 ring-white/30 animate-float-slow [animation-delay:2s]">
            <div className="text-center">
              <div className="font-heading text-3xl font-bold text-primary">2×</div>
              <div className="text-xs font-medium text-muted-foreground">success rate for incubated makers</div>
            </div>
          </div>
        </div>
      </div>

      {/* wave divider */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0,40 C360,90 720,0 1080,30 C1260,45 1380,40 1440,35 L1440,80 L0,80 Z" fill="white" />
      </svg>
    </section>
  );
}

/* ─────────────────────────────── MARQUEE ─────────────────────────────── */
function Marquee() {
  return (
    <section className="border-y bg-white py-5">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Built for every kind of food maker
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {[...foodMarquee, ...foodMarquee].map((item, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border bg-muted/50 px-5 py-2 text-sm font-medium text-foreground/80">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── WHY ─────────────────────────────── */
function Why() {
  const pillars = [
    { icon: HeartHandshake, title: 'Dignity in every plate', body: 'A person who makes food for a living deserves tools that respect their craft and their margins — not software priced for venture-backed chains.' },
    { icon: Users, title: 'We rise together', body: 'When an operator fills their kitchen, their makers grow. When makers grow, the kitchen thrives. We build for that whole circle, not one side of it.' },
    { icon: GraduationCap, title: 'Build people, not lock-in', body: 'Our goal is to graduate makers into their own success. The healthiest platform is one its members eventually outgrow — and recommend.' },
  ];
  return (
    <section id="why" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Why Culina exists</span>
        <h2 className="mt-3 font-heading text-4xl font-bold text-balance">
          The smallest food businesses carry the biggest dreams — and the thinnest margins.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Culina is priced near-free on purpose. We only earn when a booking happens or a sale is made — so our
          success is tied to yours, never extracted from it.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {pillars.map((p, i) => (
          <Reveal key={p.title} delay={i * 120}>
            <div className="group h-full rounded-2xl border bg-card p-7 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-secondary">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── PROBLEM ─────────────────────────────── */
function Problem() {
  const stats = [
    { value: '$19,500', label: 'average annual sales for an early-stage kitchen maker' },
    { value: '36%', label: 'of those sales eaten by rental fees alone' },
    { value: '55% / 47%', label: 'of tenants are women / people of color' },
    { value: '~0', label: 'software tools built for the maker’s side of the kitchen' },
  ];
  return (
    <section id="problem" className="relative overflow-hidden bg-primary py-24 text-secondary">
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-blob" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">The problem</span>
            <h2 className="mt-3 font-heading text-4xl font-bold text-white text-balance">
              The shared-kitchen world runs on spreadsheets, group texts, and duct tape.
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                'Operators juggle bookings in a calendar, invoices in one app, compliance docs in a filing cabinet, and leads in their inbox.',
                'Makers are left entirely on their own — no storefront, no cost tools, no guidance toward funding or graduation.',
                'The few platforms that exist are expensive, operator-only, and serve a tiny fraction of the market.',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                  <span className="text-secondary/85">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <div className="font-heading text-3xl font-bold text-accent">{s.value}</div>
                  <div className="mt-2 text-sm text-secondary/75">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── SOLUTION ─────────────────────────────── */
function Solution() {
  const steps = [
    { n: '01', title: 'Operators run a calmer kitchen', body: 'Calendar, bookings, tenants, leads, invoices, compliance, and analytics — one login, one source of truth.' },
    { n: '02', title: 'Makers get a real toolkit', body: 'Book space, track costs, build a storefront, find grants, and learn — the support side that has never existed.' },
    { n: '03', title: 'Money moves transparently', body: `Payments flow through Stripe Connect with a single, visible ${PLATFORM_FEE_PERCENT}% fee. No hidden cuts, ever.` },
    { n: '04', title: 'Everyone grows', body: 'Makers graduate to their own facilities. Operators fill their space. The whole community compounds.' },
  ];
  return (
    <section id="solution" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">How we solve it</span>
        <h2 className="mt-3 font-heading text-4xl font-bold text-balance">One platform for the whole kitchen circle</h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 100}>
            <div className="relative h-full rounded-2xl border bg-gradient-to-b from-muted/40 to-white p-7 shadow-card">
              <div className="font-mono text-sm font-bold text-accent">{s.n}</div>
              <h3 className="mt-2 font-heading text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── SHOWCASE ─────────────────────────────── */
function Showcase() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-muted/40 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">See it in action</span>
          <h2 className="mt-3 font-heading text-4xl font-bold text-balance">One calm screen for the whole operation</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bookings, stations, and equipment in a single conflict-proof calendar — color-coded, fee-transparent,
            and updated the moment a maker reserves time. No more group texts or double-bookings.
          </p>
          <div className="mt-7">
            <Link to="/features">
              <Button variant="outline">Tour every feature <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </Reveal>
        <Reveal delay={120} className="relative">
          <BrowserFrame url="culina.app/operator/calendar" glow>
            <ScreenCalendar />
          </BrowserFrame>
          <div className="absolute -bottom-10 -left-6 hidden w-56 sm:block">
            <BrowserFrame url="culina.app/shop/saras-sourdough" tilt>
              <ScreenStorefront />
            </BrowserFrame>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────── SEE IT LIVE ─────────────────────────────── */
function SeeItLive() {
  const items = [
    { url: 'culina.app/operator/compliance', screen: <ScreenCompliance />, title: 'Compliance, handled', body: 'Red/yellow/green status with reminders before anything lapses.' },
    { url: 'culina.app/find-a-kitchen', screen: <ScreenDiscovery />, title: 'A live discovery map', body: 'Makers find the right kitchen; operators fill empty hours.' },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        {items.map((it, i) => (
          <Reveal key={it.url} delay={i * 120}>
            <div className="rounded-3xl border bg-card p-6 shadow-card">
              <BrowserFrame url={it.url}>{it.screen}</BrowserFrame>
              <h3 className="mt-5 font-heading text-lg font-semibold">{it.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── AUDIENCES ─────────────────────────────── */
function Audiences() {
  return (
    <section className="bg-muted/40 py-24">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <div id="operators" className="flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="relative h-48 overflow-hidden">
              <SmartImage src={IMG.kitchenLine} alt="Commercial kitchen stainless prep stations" emoji="🏭" gradient="from-slate-700 via-slate-600 to-emerald-700" className="h-full w-full" />
              <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary">For operators</span>
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="font-heading text-2xl font-bold">Fill your kitchen. Lose the busywork.</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {['Fill empty hours with directory leads + a public profile', 'Automate bookings, invoices, and compliance reminders', 'Grow a thriving community of makers who stay and refer'].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{t}</li>
                ))}
              </ul>
              <Link to="/auth/signup" className="mt-6">
                <Button>I run a shared kitchen <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div id="tenants" className="flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="relative h-48 overflow-hidden">
              <SmartImage src={IMG.makerPastry} alt="Tray of glazed pastries fresh from the oven" emoji="🧁" gradient="from-rose-600 via-amber-500 to-yellow-400" className="h-full w-full" />
              <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-accent">For makers</span>
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="font-heading text-2xl font-bold">Book space. Grow a business. Launch a storefront.</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {['Book kitchen time and equipment in seconds', 'Price for profit with the Recipe & Food Cost Lab', 'Sell online with a free AI-built storefront + find funding'].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{t}</li>
                ))}
              </ul>
              <Link to="/auth/signup" className="mt-6">
                <Button variant="accent">I’m a food entrepreneur <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────── FEATURES ─────────────────────────────── */
function Features() {
  const feats = [
    { icon: Calendar, title: 'Smart booking calendar', body: 'Day/week/month views, color-coded by station, equipment add-ons, and instant fee-transparent pricing.' },
    { icon: FileCheck2, title: 'Compliance command center', body: 'Track every cert and permit with red/yellow/green status and auto reminders before they expire.' },
    { icon: ChefHat, title: 'Recipe & Food Cost Lab', body: 'Live COGS, margin targets, batch scaling, label + allergen generators, and AI cost-cutting advice.' },
    { icon: Store, title: 'AI website builder', body: 'A free storefront at culina.app/shop/you — copy, theme, and checkout generated in minutes.' },
    { icon: Wallet, title: 'Grant & funding finder', body: 'A searchable database of USDA, SBA, state, and foundation funding — with an AI application drafter.' },
    { icon: CreditCard, title: 'Stripe Connect payments', body: `Bookings and storefront sales settle directly to you, with one transparent ${PLATFORM_FEE_PERCENT}% platform fee.` },
    { icon: LineChart, title: 'Analytics that matter', body: 'Revenue trends, space utilization, retention, and MRR — the numbers operators actually run on.' },
    { icon: GraduationCap, title: 'Learning + graduation path', body: 'A milestone-gated learning hub and an AI tutor guiding makers from launch to their own facility.' },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Everything, in one place</span>
        <h2 className="mt-3 font-heading text-4xl font-bold text-balance">A complete operating system for the food incubator</h2>
        <p className="mt-4 text-lg text-muted-foreground">Eight modules that usually mean eight subscriptions. Here, they’re one.</p>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {feats.map((f, i) => (
          <Reveal key={f.title} delay={(i % 4) * 90}>
            <div className="group h-full rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-card-hover">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── COMPARE ─────────────────────────────── */
function Compare() {
  const rows = [
    { label: 'Built for makers, not just operators', culina: true, food_corridor: false, spreadsheets: false },
    { label: 'Free tier for food entrepreneurs', culina: true, food_corridor: false, spreadsheets: true },
    { label: 'Booking + compliance + invoicing', culina: true, food_corridor: true, spreadsheets: false },
    { label: 'Recipe costing & margin tools', culina: true, food_corridor: false, spreadsheets: 'manual' },
    { label: 'AI storefront + online sales', culina: true, food_corridor: false, spreadsheets: false },
    { label: 'Grant finder + AI application help', culina: true, food_corridor: false, spreadsheets: false },
    { label: 'Transparent flat 1.5% transaction fee', culina: true, food_corridor: 'opaque', spreadsheets: 'n/a' },
    { label: 'Operator price', culina: 'from $19/mo', food_corridor: '$$$ / kitchen', spreadsheets: 'free, painful' },
  ];
  const Cell = ({ v }: { v: boolean | string }) => {
    if (v === true) return <Check className="mx-auto h-5 w-5 text-emerald-600" />;
    if (v === false) return <X className="mx-auto h-5 w-5 text-red-400" />;
    return <span className="text-xs font-medium text-muted-foreground">{v}</span>;
  };
  return (
    <section id="compare" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">How we compare</span>
          <h2 className="mt-3 font-heading text-4xl font-bold text-balance">More for everyone, for less</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Today’s leading platform serves only ~55 kitchens and ignores makers entirely. Most of the market still runs on spreadsheets.
          </p>
        </Reveal>
        <Reveal className="mt-12 overflow-hidden rounded-2xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-primary text-secondary">
                <th className="p-4 text-left font-semibold">Capability</th>
                <th className="p-4 text-center font-semibold">
                  <span className="font-heading text-base">Culina</span>
                </th>
                <th className="p-4 text-center font-medium text-secondary/80">Legacy platform</th>
                <th className="p-4 text-center font-medium text-secondary/80">Spreadsheets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i % 2 ? 'bg-muted/30' : ''}>
                  <td className="p-4 text-left font-medium">{r.label}</td>
                  <td className="p-4 text-center bg-accent/5"><Cell v={r.culina} /></td>
                  <td className="p-4 text-center"><Cell v={r.food_corridor} /></td>
                  <td className="p-4 text-center"><Cell v={r.spreadsheets} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────── PRICING ─────────────────────────────── */
function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Pricing</span>
        <h2 className="mt-3 font-heading text-4xl font-bold text-balance">Priced so no one can justify not using it</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          A flat, visible {PLATFORM_FEE_PERCENT}% on transactions funds everything. Off-platform payments are always 0%.
        </p>
      </Reveal>

      <h3 className="mt-14 text-center font-heading text-xl font-semibold">For operators</h3>
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {OPERATOR_PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <div className={`flex h-full flex-col rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover ${p.id === 'growth' ? 'ring-2 ring-accent' : ''}`}>
              {p.id === 'growth' && <span className="mb-2 inline-flex w-fit rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">Most popular</span>}
              <div className="font-heading text-lg font-semibold">{p.name}</div>
              <div className="mt-2 font-heading text-3xl font-bold">
                {formatCents(p.priceCents)}<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{p.tenants}</div>
              <Link to="/auth/signup" className="mt-6">
                <Button variant={p.id === 'growth' ? 'accent' : 'outline'} className="w-full">Choose {p.name}</Button>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <h3 className="mt-16 text-center font-heading text-xl font-semibold">For makers</h3>
      <div className="mx-auto mt-6 grid max-w-3xl gap-5 md:grid-cols-2">
        {TENANT_PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <div className={`flex h-full flex-col rounded-2xl border bg-card p-7 shadow-card ${p.id === 'pro' ? 'bg-primary text-secondary' : ''}`}>
              <div className="font-heading text-lg font-semibold">{p.name}</div>
              <div className="mt-2 font-heading text-3xl font-bold">
                {p.priceCents === 0 ? 'Free' : <>{formatCents(p.priceCents)}<span className="text-base font-normal opacity-70">/mo</span></>}
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className={`mt-0.5 h-4 w-4 ${p.id === 'pro' ? 'text-accent' : 'text-emerald-600'}`} />{f}</li>
                ))}
              </ul>
              <Link to="/auth/signup" className="mt-6">
                <Button variant={p.id === 'pro' ? 'accent' : 'outline'} className="w-full">
                  {p.priceCents === 0 ? 'Start free' : 'Go Pro'}
                </Button>
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── DISCOVERY ─────────────────────────────── */
function Discovery() {
  const [q, setQ] = React.useState('');
  const navigate = useNavigate();
  return (
    <section id="discovery" className="relative overflow-hidden bg-primary py-24 text-secondary">
      <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-blob" />
      <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
        <Reveal>
          <Globe className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-4 font-heading text-4xl font-bold text-white text-balance">Find a kitchen near you</h2>
          <p className="mt-3 text-lg text-secondary/80">
            Browse the open Kitchen Discovery network — whether you’re starting out or scaling to a second city.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/find-a-kitchen?q=${encodeURIComponent(q)}`);
            }}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-2xl"
          >
            <Search className="ml-3 h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="City, state, or ZIP"
              className="flex-1 bg-transparent px-2 py-2 text-foreground outline-none"
            />
            <Button variant="accent" type="submit" className="rounded-full">Search</Button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────── TESTIMONIALS ─────────────────────────────── */
function Testimonials() {
  const quotes = [
    { quote: 'My kitchen went from 40% to 85% booked in a season. The directory leads alone paid for the year.', name: 'A shared-kitchen operator', tag: 'Operator', emoji: '🏭' },
    { quote: 'I finally know my real cost per loaf. I raised prices with confidence and my margin nearly doubled.', name: 'A sourdough baker', tag: 'Maker', emoji: '🥖' },
    { quote: 'The storefront took me one afternoon. I took my first online order that same night.', name: 'A salsa maker', tag: 'Maker', emoji: '🌶️' },
  ];
  return (
    <section id="demo" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Stories from the line</span>
        <h2 className="mt-3 font-heading text-4xl font-bold text-balance">Built with food makers, for food makers</h2>
        <p className="mt-3 text-sm text-muted-foreground">Representative stories shown for this preview build.</p>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {quotes.map((t, i) => (
          <Reveal key={t.quote} delay={i * 120}>
            <figure className="flex h-full flex-col rounded-2xl border bg-gradient-to-b from-white to-muted/40 p-7 shadow-card">
              <div className="text-3xl">{t.emoji}</div>
              <blockquote className="mt-3 flex-1 font-heading text-lg leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t.tag}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-12 text-center">
        <Link to="/auth/login">
          <Button size="lg" variant="accent">
            Open the live demo dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">No signup needed — jump straight into an operator, maker, or admin view.</p>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────── MISSION ─────────────────────────────── */
function Mission() {
  return (
    <section id="mission" className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
        <Reveal>
          <HeartHandshake className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-heading text-4xl font-bold text-balance">Our mission</h2>
          <p className="mt-6 text-xl leading-relaxed text-foreground/80">
            We believe the people who feed their neighbors deserve a fair shot — and that the tools to build a
            livelihood shouldn’t be reserved for the already-large. Culina exists to put real infrastructure in
            the hands of small food makers and the operators who shelter them, priced so low that access is the
            default, not the privilege.
          </p>
          <p className="mt-5 font-heading text-2xl font-semibold text-primary">
            We grow by making others grow first.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────── FINAL CTA ─────────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 text-center text-secondary">
      <div className="absolute inset-0 bg-animated-gradient bg-[linear-gradient(120deg,#1f3a2e,#2D4A3E,#3a5e4f,#2D4A3E)]" />
      <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-blob" />
      <div className="relative mx-auto max-w-2xl px-4">
        <Reveal>
          <h2 className="font-heading text-4xl font-bold text-white sm:text-5xl text-balance">
            The kitchen is ready. Let’s grow your food business.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/auth/signup">
              <Button size="lg" variant="accent" className="w-full sm:w-auto">Start free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/find-a-kitchen">
              <Button size="lg" variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-white/10 sm:w-auto">
                Find a kitchen
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
