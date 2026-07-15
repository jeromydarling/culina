import { MarketingNav } from '@/components/layout/MarketingNav';
import { Seo } from '@/components/Seo';
import { Footer } from '@/components/layout/Footer';

const CONTACT_EMAIL = 'gardener@thecros.app';

export default function Terms() {
  return (
    <div className="bg-white">
      <Seo />
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-32 lg:px-8">
        <h1 className="font-heading text-4xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated July 2026</p>

        <div className="prose mt-8 space-y-6 text-foreground/80">
          <Section title="Acceptance">
            By creating a Culina account or using the service, you agree to these terms and to our{' '}
            <a className="text-primary hover:underline" href="/privacy">Privacy Policy</a>. If you use Culina
            on behalf of a business, you confirm you have authority to bind that business.
          </Section>
          <Section title="Accounts & roles">
            Culina serves two kinds of accounts: <strong>operators</strong>, who run shared commercial
            kitchens, and <strong>makers</strong> (tenants), who rent time and run food businesses inside
            them. You're responsible for keeping your login credentials secure, for the accuracy of the
            information you enter, and for activity that happens under your account. Operators are
            responsible for their kitchen's licensing, permits, and the house rules they set for members.
          </Section>
          <Section title="Bookings & billing">
            Bookings reserve real kitchen time, so cancellations and no-shows are governed by the kitchen's
            policies. Culina uses an <strong>invoice-first billing model</strong>: booking and membership
            activity rolls into invoices issued by the kitchen (often monthly), which you then review and
            pay. Booking may be blocked automatically when a required compliance document is expired —
            that's a safety feature, not a bug.
          </Section>
          <Section title="Payments, fees & Stripe">
            Online payments are processed by <strong>Stripe Connect</strong>; funds flow to the kitchen's or
            maker's own Stripe account, and use of Stripe is subject to Stripe's terms. Culina charges a{' '}
            <strong>1.5% platform fee</strong> on payments processed through the platform, calculated
            server-side and shown on your invoices. Kitchens set their own rates; taxes remain your
            responsibility.
          </Section>
          <Section title="Content & storefronts">
            You keep ownership of everything you create on Culina — recipes, product listings, photos, and
            your storefront. You grant us the limited license needed to host and display that content so the
            service works (for example, showing your public storefront to shoppers). You're responsible for
            having the rights to what you upload and for the accuracy of product claims, labels, and
            allergen information on anything you sell.
          </Section>
          <Section title="Acceptable use">
            Don't use Culina to break the law, infringe others' rights, send spam, probe or disrupt the
            service, or misrepresent who you are. Food safety rules and health-department requirements
            always apply to what you make and sell — Culina helps you track compliance but doesn't replace
            it.
          </Section>
          <Section title="AI features">
            Culina includes AI-assisted tools (labeling checks, permitting guidance, grant drafts, business
            plans, storefront copy). AI output can be wrong or incomplete — <strong>review it before relying
            on it</strong> and verify anything important with the relevant authority. It is not legal,
            financial, or food-safety advice.
          </Section>
          <Section title="Termination">
            You can close your account (and export or delete your data) at any time from Settings. We may
            suspend or terminate accounts that violate these terms, create risk for other users, or fail to
            pay amounts owed. Where practical we'll warn you first. Sections that by their nature survive
            (ownership, disclaimers, liability limits) survive termination.
          </Section>
          <Section title="Disclaimers & limitation of liability">
            Culina is provided <em>as is</em>, without warranties of any kind. Kitchens and makers transact
            with each other directly — we don't operate kitchens, prepare food, or guarantee any booking,
            payment, or outcome. To the maximum extent permitted by law, Culina's total liability for any
            claim is limited to the fees you paid us in the twelve months before the claim arose, and we're
            not liable for indirect, incidental, or consequential damages.
          </Section>
          <Section title="Changes">
            We may update these terms as Culina evolves. For material changes we'll give notice (in-app or
            by email) before they take effect; continuing to use the service after that means you accept the
            updated terms.
          </Section>
          <Section title="Contact">
            Questions about these terms? Email{' '}
            <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
            — a real person reads them.
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
