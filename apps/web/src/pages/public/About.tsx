import { MarketingNav } from '@/components/layout/MarketingNav';
import { Seo } from "@/components/Seo";
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/Reveal';
import { HeartHandshake, Sprout, Users } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-white">
      <Seo />
      <MarketingNav />
      <section className="bg-primary px-4 pb-20 pt-36 text-secondary lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-5xl font-bold text-white text-balance">Where food businesses are born and grow</h1>
          <p className="mt-6 text-lg text-secondary/85">
            Culina started from a simple conviction: the people who feed their neighbors deserve the same
            quality of tools as the largest food companies — at a price that puts those tools within reach.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-3xl font-bold">Why we exist</h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground/80">
            Shared commercial kitchens are quietly one of the most important engines of small-scale
            entrepreneurship in the country. They lower the barrier to starting a food business from hundreds
            of thousands of dollars to a few hundred a month. Inside them, a remarkable, diverse community of
            makers — overwhelmingly women and people of color — builds livelihoods one batch at a time.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-foreground/80">
            Yet the software serving this world has been thin, expensive, and aimed only at operators. The
            makers themselves — the ones with the thinnest margins and the steepest learning curve — have had
            almost nothing. We built Culina to change that, on both sides at once.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            { icon: HeartHandshake, title: 'Solidarity', body: 'We design for the whole community — operators and makers rise together, never one at the other’s expense.' },
            { icon: Sprout, title: 'Subsidiarity', body: 'Power and tools belong close to the people doing the work. We equip the small to do big things.' },
            { icon: Users, title: 'The common good', body: 'A healthy local food economy benefits everyone. We price for access, not extraction.' },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <div className="h-full rounded-2xl border bg-card p-6 shadow-card">
                <v.icon className="h-7 w-7 text-accent" />
                <h3 className="mt-3 font-heading text-lg font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 rounded-2xl bg-secondary/40 p-8 text-center">
          <p className="font-heading text-2xl font-semibold text-primary">We grow by making others grow first.</p>
        </Reveal>
      </section>
      <Footer />
    </div>
  );
}
