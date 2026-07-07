import { MarketingNav } from '@/components/layout/MarketingNav';
import { Seo } from "@/components/Seo";
import { Footer } from '@/components/layout/Footer';
import { SUPPORT_EMAIL } from '@/lib/errors';

export default function Privacy() {
  return (
    <div className="bg-white">
      <Seo />
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-32 lg:px-8">
        <h1 className="font-heading text-4xl font-bold">Privacy & Your Data</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated June 2026</p>

        <div className="prose mt-8 space-y-6 text-foreground/80">
          <Section title="What we collect">
            Account details (name, email), the business information you enter (kitchen, business profile,
            recipes, products, bookings, compliance documents), and basic technical data needed to run the
            service. Storefront orders include the customer details a buyer provides at checkout.
          </Section>
          <Section title="How we use it">
            To operate Culina for you — scheduling, billing, compliance tracking, your storefront, and the
            features you choose to use. We do not sell your personal data.
          </Section>
          <Section title="Where it lives">
            Your data is stored on Cloudflare (D1 + R2) in the United States. Payments are handled by Stripe;
            transactional email by Resend. AI features send only the inputs needed to generate a result.
          </Section>
          <Section title="Your rights">
            You can <strong>export</strong> a copy of your data or <strong>permanently delete</strong> your
            account and data at any time from <em>Settings → Privacy &amp; Data</em>. Deletion is immediate and
            irreversible.
          </Section>
          <Section title="AI guidance">
            AI-generated content (labeling, permitting, grants, business plans) is informational only and may be
            inaccurate. Verify anything you rely on with the relevant authority. It is not legal, financial, or
            food-safety advice.
          </Section>
          <Section title="Contact">
            Questions or requests? Email <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </Section>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
