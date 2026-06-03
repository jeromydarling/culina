import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CreditCard,
  FileCheck2,
  LineChart,
  MapPin,
  Sparkles,
  Store,
} from 'lucide-react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/Reveal';
import { Button } from '@/components/ui/button';
import { BrowserFrame } from '@/components/marketing/BrowserFrame';
import {
  ScreenCalendar,
  ScreenCompliance,
  ScreenDiscovery,
  ScreenStorefront,
} from '@/components/marketing/MarketingScreens';
import { ScreenAnalytics, ScreenRecipeCost } from '@/components/marketing/MarketingCharts';
import { PLATFORM_FEE_PERCENT } from '@culina/shared';

interface Row {
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  points: string[];
  url: string;
  screen: React.ReactNode;
}

const rows: Row[] = [
  {
    eyebrow: 'For operators',
    icon: Calendar,
    title: 'A booking calendar that fills itself',
    body: 'Day, week, and month views color-coded by station, with equipment add-ons and instant, fee-transparent pricing. Double-bookings are impossible — the calendar is the single source of truth.',
    points: ['Drag-free, conflict-checked scheduling', 'Equipment & space add-ons priced by the minute', 'Directory leads flow straight into open hours'],
    url: 'culina.app/operator/calendar',
    screen: <ScreenCalendar />,
  },
  {
    eyebrow: 'For operators',
    icon: FileCheck2,
    title: 'Compliance you never have to chase',
    body: 'Every certificate, permit, and insurance doc tracked with red / yellow / green status and automatic reminders before anything lapses. Bookings are gated on valid paperwork.',
    points: ['Auto-reminders at 30, 14 & 3 days', 'Expired docs block new bookings automatically', 'One organized record per tenant'],
    url: 'culina.app/operator/compliance',
    screen: <ScreenCompliance />,
  },
  {
    eyebrow: 'For operators',
    icon: LineChart,
    title: 'The numbers you actually run on',
    body: 'Revenue trends, space utilization, retention, and MRR — the metrics that tell you whether the kitchen is healthy, refreshed live as bookings land.',
    points: ['Utilization by station and hour', 'MRR, churn, and retention at a glance', 'Export-ready for board and lender updates'],
    url: 'culina.app/operator/analytics',
    screen: <ScreenAnalytics />,
  },
  {
    eyebrow: 'For makers',
    icon: Store,
    title: 'A storefront built in an afternoon',
    body: 'Every maker gets a free online shop at culina.app/shop/you — AI-generated copy and theme, real product photos, and checkout wired to their own payouts.',
    points: ['AI website builder with a natural-language editor', 'Real product photos via drag-and-drop', 'Online orders land the day you publish'],
    url: 'culina.app/shop/saras-sourdough',
    screen: <ScreenStorefront />,
  },
  {
    eyebrow: 'For makers',
    icon: Sparkles,
    title: 'Price every product for profit',
    body: 'The Recipe & Food Cost Lab computes live COGS and margins, scales batches, and flags where a few cents of cost are quietly eating the bottom line.',
    points: ['Live cost-of-goods and margin targets', 'Batch scaling and label generation', 'AI advice on where to trim cost'],
    url: 'culina.app/tenant/recipes',
    screen: <ScreenRecipeCost />,
  },
  {
    eyebrow: 'For everyone',
    icon: MapPin,
    title: 'An open discovery network',
    body: 'A public, map-based directory so makers find the right kitchen and operators fill empty hours. Listings are free, searchable by city, and shown on a live map.',
    points: ['Map + list view of every listed kitchen', 'Searchable by city, state, or ZIP', 'Free listing that sends you qualified leads'],
    url: 'culina.app/find-a-kitchen',
    screen: <ScreenDiscovery />,
  },
];

export default function Features() {
  return (
    <div className="overflow-x-hidden bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary px-4 pb-24 pt-32 text-secondary lg:px-8">
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-accent/30 blur-3xl animate-blob" />
        <div className="absolute right-0 top-40 h-[26rem] w-[26rem] rounded-full bg-emerald-400/20 blur-3xl animate-blob [animation-delay:3s]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-white/5 px-4 py-1.5 text-sm font-medium text-secondary backdrop-blur">
              <Sparkles className="h-4 w-4 text-accent" /> Everything, in one place
            </span>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-white sm:text-6xl text-balance">
              The complete operating system for the food incubator
            </h1>
            <p className="mt-5 text-lg text-secondary/85">
              Eight modules that usually mean eight subscriptions — booking, compliance, payments, storefronts,
              costing, funding, learning, and analytics — woven into one calm, affordable platform.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auth/signup">
                <Button size="lg" variant="accent" className="w-full sm:w-auto">Start free <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/auth/login">
                <Button size="lg" variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-white/10 sm:w-auto">Explore the live demo</Button>
              </Link>
            </div>
          </div>

          {/* Hero showcase */}
          <Reveal className="mt-14">
            <BrowserFrame url="culina.app/operator/calendar" glow className="mx-auto max-w-3xl">
              <ScreenCalendar />
            </BrowserFrame>
          </Reveal>
        </div>
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0,40 C360,90 720,0 1080,30 C1260,45 1380,40 1440,35 L1440,80 L0,80 Z" fill="white" />
        </svg>
      </section>

      {/* Alternating feature rows */}
      <div className="mx-auto max-w-6xl space-y-24 px-4 py-24 lg:px-8">
        {rows.map((r, i) => {
          const flip = i % 2 === 1;
          return (
            <Reveal key={r.title}>
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className={flip ? 'lg:order-2' : ''}>
                  <span className="text-sm font-semibold uppercase tracking-widest text-accent">{r.eyebrow}</span>
                  <h2 className="mt-2 flex items-center gap-2 font-heading text-3xl font-bold text-balance">
                    <r.icon className="h-7 w-7 shrink-0 text-primary" /> {r.title}
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">{r.body}</p>
                  <ul className="mt-5 space-y-2.5">
                    {r.points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span className="text-foreground/80">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={flip ? 'lg:order-1' : ''}>
                  <BrowserFrame url={r.url} tilt={flip} className="mx-auto max-w-lg">
                    {r.screen}
                  </BrowserFrame>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Fee strip */}
      <section className="border-y bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Reveal>
            <CreditCard className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 font-heading text-3xl font-bold text-balance">One transparent {PLATFORM_FEE_PERCENT}% fee funds all of it</h2>
            <p className="mt-3 text-muted-foreground">
              Bookings and storefront sales settle directly to you through Stripe Connect, with a single visible
              platform fee. Off-platform payments are always 0%. No per-seat charges, no surprise tiers.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-24 text-center text-secondary">
        <div className="absolute inset-0 bg-animated-gradient bg-[linear-gradient(120deg,#1f3a2e,#2D4A3E,#3a5e4f,#2D4A3E)]" />
        <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-2xl px-4">
          <Reveal>
            <h2 className="font-heading text-4xl font-bold text-white sm:text-5xl text-balance">See it all working — in seconds</h2>
            <p className="mt-4 text-secondary/85">Jump into the live demo as an operator, maker, or admin. No signup required.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auth/login">
                <Button size="lg" variant="accent" className="w-full sm:w-auto">Open the live demo <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/find-a-kitchen">
                <Button size="lg" variant="outline" className="w-full border-secondary/40 text-secondary hover:bg-white/10 sm:w-auto">Find a kitchen</Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      <Footer />
    </div>
  );
}
