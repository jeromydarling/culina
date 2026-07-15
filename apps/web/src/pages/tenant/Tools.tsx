import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Tag, FileBadge, Store, Boxes, ClipboardList, Sparkles, ArrowLeft, Barcode, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { getTenantProfile } from '@/lib/store';
import { AiDisclaimer } from '@/components/AiDisclaimer';
import { callAI } from '@/lib/ai';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';

const tools = [
  { id: 'business-formation', icon: Building2, title: 'Business Formation Wizard', desc: 'LLC, EIN, and entity setup — step by step.' },
  { id: 'labeling', icon: Tag, title: 'Labeling Compliance Checker', desc: 'AI reviews your label for FDA requirements.' },
  { id: 'permitting', icon: FileBadge, title: 'Permitting Wizard', desc: 'Required permits for your state and products.' },
  { id: 'sales-channels', icon: Store, title: 'Sales Channel Finder', desc: 'Farmers markets, co-ops, and retail buyers.' },
  { id: 'co-packer', icon: Boxes, title: 'Co-packer Matchmaking', desc: 'Connect with co-packing resources to scale.' },
  { id: 'barcode', icon: Barcode, title: 'UPC / Barcode Generator', desc: 'Create a scannable barcode + UPC guidance for retail.' },
  { id: 'business-plan', icon: ClipboardList, title: 'Business Plan Builder', desc: 'AI-assisted, fill-in-the-blank business plan.' },
];

export default function Tools() {
  const { tool } = useParams();
  const navigate = useNavigate();

  if (tool) {
    const meta = tools.find((t) => t.id === tool);
    return (
      <div>
        <button onClick={() => navigate('/tenant/tools')} className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Business tools</button>
        <PageHeader title={meta?.title ?? 'Tool'} description={meta?.desc} />
        <ToolBody tool={tool} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Business Tools" description="Everything you need to formalize and scale your business." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <button key={t.id} onClick={() => navigate(`/tenant/tools/${t.id}`)} className="rounded-lg border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><t.icon className="h-5 w-5" /></div>
            <h3 className="mt-3 font-heading font-semibold">{t.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolBody({ tool }: { tool: string }) {
  switch (tool) {
    case 'business-formation':
      return <FormationWizard />;
    case 'labeling':
      return <AITool endpoint="check-label" inputLabel="Paste your product label text or description" buttonLabel="Check compliance" makeFallback={(input) => `Label review for: “${input.slice(0, 60)}…”\n\n✅ Present: product name, basic ingredient list.\n⚠️ Likely missing / to verify:\n• Net quantity of contents (weight/volume) in both US + metric\n• Name & address of manufacturer/distributor\n• Full ingredient list in descending order by weight\n• Allergen "Contains" statement (Big 9)\n• Nutrition Facts panel (unless exempt as a small business)\n\nRecommendation: add the items above and confirm your state’s cottage-food labeling rules. This is guidance, not legal advice.`} />;
    case 'permitting':
      return <PermittingWizard />;
    case 'sales-channels':
      return <SalesChannels />;
    case 'co-packer':
      return <CoPacker />;
    case 'barcode':
      return <BarcodeTool />;
    case 'business-plan':
      return <BusinessPlan />;
    default:
      return null;
  }
}

function FormationWizard() {
  const steps = [
    { title: 'Choose your entity', body: 'Most food makers start as a sole proprietorship and form an LLC once revenue is steady. An LLC separates personal and business liability.' },
    { title: 'Register with your state', body: 'File Articles of Organization with your Secretary of State. Most states allow online filing for $50–$300.' },
    { title: 'Get an EIN (free)', body: 'Apply for a free Employer Identification Number at IRS.gov — needed for banking, taxes, and Stripe.' },
    { title: 'Open a business bank account', body: 'Keep finances separate from day one. Bring your formation docs and EIN letter.' },
    { title: 'Licenses & permits', body: 'Use the Permitting Wizard to confirm what your state and product require.' },
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <Card key={i}><CardContent className="flex gap-4 p-5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-secondary">{i + 1}</div>
          <div><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-sm text-muted-foreground">{s.body}</p></div>
        </CardContent></Card>
      ))}
      <div className="flex gap-3">
        <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" target="_blank" rel="noreferrer"><Button variant="outline">IRS EIN portal</Button></a>
        <a href="https://www.sba.gov/business-guide/launch-your-business/register-your-business" target="_blank" rel="noreferrer"><Button variant="outline">SBA registration guide</Button></a>
      </div>
    </div>
  );
}

function PermittingWizard() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const [state, setState] = React.useState(tp?.state_of_formation ?? 'MN');
  const [productType, setProductType] = React.useState(tp?.business_type ?? 'bakery');
  const [out, setOut] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    const fallback = `Permitting guidance for a ${productType} business in ${state}:\n\n1. Food Handler / Manager Certification — required for at least one person on-site.\n2. Health Department Permit — apply through your county; a shared kitchen often holds the base facility permit, but your product line may need its own.\n3. Cottage Food vs. Commercial — confirm whether your products qualify for cottage-food sales or require full commercial processing.\n4. Business License — register locally and with the ${state} Secretary of State.\n5. Sales Tax Permit — register with the ${state} Department of Revenue if your products are taxable.\n6. Labeling — packaged goods must meet FDA + ${state} labeling rules.\n\nThis is general guidance — always confirm with your local health authority.`;
    const text = await callAI('permitting', { state, business_type: productType }, fallback);
    setOut(text);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2">
        <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} /></div>
        <div><Label>Product type</Label><Input value={productType} onChange={(e) => setProductType(e.target.value)} /></div>
        <div className="sm:col-span-2"><Button onClick={run} variant="accent" disabled={loading}>{loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Sparkles className="h-4 w-4" /> Get permitting steps</>}</Button></div>
      </CardContent></Card>
      {out && (<div><pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{out}</pre><AiDisclaimer /></div>)}
    </div>
  );
}

function SalesChannels() {
  const channels = [
    { name: 'Farmers Markets', desc: 'Direct-to-consumer, weekly cash flow, brand building.', tag: 'Local' },
    { name: 'Food Co-ops', desc: 'Consignment or wholesale to member-owned grocers.', tag: 'Retail' },
    { name: 'Independent Grocers', desc: 'Local shelf space; start with one or two relationships.', tag: 'Retail' },
    { name: 'Online + Shipping', desc: 'Your Culina storefront + nationwide shipping.', tag: 'Online' },
    { name: 'Subscription Boxes', desc: 'Recurring revenue via weekly/monthly boxes.', tag: 'Online' },
    { name: 'Wholesale / Food Service', desc: 'Restaurants, cafés, and institutions buying in volume.', tag: 'Wholesale' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {channels.map((c) => (
        <Card key={c.name}><CardContent className="p-5"><h3 className="font-semibold">{c.name}</h3><p className="mt-1 text-sm text-muted-foreground">{c.desc}</p><span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{c.tag}</span></CardContent></Card>
      ))}
    </div>
  );
}

function CoPacker() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const [form, setForm] = React.useState({ company: tp?.business_name ?? '', location: '', capabilities: '', notes: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isLive()) {
      setSubmitting(true);
      try {
        await dataApi.copackerSubmit(form);
      } catch (err) {
        toast.error((err as Error).message);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    } else {
      toast.success('Request received! (Demo — a live account emails the Culina team for real.)');
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card><CardContent className="p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600"><Boxes className="h-6 w-6" /></div>
        <h3 className="mt-3 font-heading text-xl font-semibold">We're on it</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Thanks — we've got your details. We'll look for a good co-packer match and you'll hear back by email.
        </p>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent className="p-6">
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Company</Label><Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your business name" /></div>
        <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, state" /></div>
        <div><Label>Capabilities needed</Label><Textarea required value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} placeholder="e.g. hot-fill 16oz jars, 2,000 units/month, gluten-free line…" /></div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Timeline, certifications, packaging…" /></div>
        <Button type="submit" disabled={submitting}>{submitting ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Find co-packers'}</Button>
      </form>
    </CardContent></Card>
  );
}

const UPC_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const UPC_R = UPC_L.map((s) => s.replace(/[01]/g, (b) => (b === '0' ? '1' : '0')));

function upcCheckDigit(d11: string): number {
  let odd = 0, even = 0;
  for (let i = 0; i < 11; i++) (i % 2 === 0 ? (odd += +d11[i]) : (even += +d11[i]));
  return (10 - ((odd * 3 + even) % 10)) % 10;
}
function encodeUpc(upc12: string): string {
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += UPC_L[+upc12[i]];
  bits += '01010';
  for (let i = 6; i < 12; i++) bits += UPC_R[+upc12[i]];
  return bits + '101';
}

function BarcodeTool() {
  const [digits, setDigits] = React.useState('07350053');
  const padded = (digits.replace(/\D/g, '') + '00000000000').slice(0, 11);
  const upc = padded + String(upcCheckDigit(padded));
  const bits = encodeUpc(upc);
  const moduleW = 2;
  const height = 90;
  const width = bits.length * moduleW;

  function download() {
    const svg = document.getElementById('upc-svg')?.outerHTML;
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `upc-${upc}.svg`;
    a.click();
    toast.success('Barcode downloaded');
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div><Label>Your product number (up to 11 digits — the check digit is added automatically)</Label><Input value={digits} onChange={(e) => setDigits(e.target.value)} maxLength={11} /></div>
          <div className="rounded-lg border bg-white p-5 text-center">
            <svg id="upc-svg" xmlns="http://www.w3.org/2000/svg" width={width} height={height + 20} viewBox={`0 0 ${width} ${height + 20}`} className="mx-auto">
              <rect width={width} height={height + 20} fill="#ffffff" />
              {bits.split('').map((b, i) => b === '1' ? <rect key={i} x={i * moduleW} y={0} width={moduleW} height={height} fill="#000" /> : null)}
              <text x={width / 2} y={height + 16} textAnchor="middle" fontFamily="monospace" fontSize="14" fill="#000">{upc}</text>
            </svg>
          </div>
          <Button onClick={download}><Download className="h-4 w-4" /> Download barcode (SVG)</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Using barcodes on real retail products</p>
          <p>This generates a valid <strong>UPC-A</strong> barcode graphic for mockups, internal SKUs, and pickup labels. For products sold through major retailers, purchase a genuine company prefix from <a href="https://www.gs1us.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">GS1 US</a> so your UPC is globally unique.</p>
          <p>Place the barcode on a flat, high-contrast area of your label, keep a quiet zone (clear margin) on both sides, and don't shrink it below ~80% scale.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessPlan() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const [form, setForm] = React.useState({ name: tp?.business_name ?? '', type: tp?.business_type ?? '', stage: 'early', market: 'Local Twin Cities customers and farmers markets' });
  const [out, setOut] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    const fallback = `BUSINESS PLAN — ${form.name}\n\n1. EXECUTIVE SUMMARY\n${form.name} is a ${form.type} business serving ${form.market}. We make small-batch products with a focus on quality and community, and we are positioned to grow through direct sales and selective wholesale.\n\n2. PRODUCTS & SERVICES\nA focused product line with clear margins (see Recipe & Food Cost Lab). Signature items anchor the brand while seasonal items drive repeat purchase.\n\n3. MARKET ANALYSIS\nDemand for local, transparently-made food continues to grow. Our target customer values provenance and is willing to pay a fair price.\n\n4. MARKETING & SALES\nStorefront + farmers markets in year one; add 1–2 wholesale accounts in year two. Email + social drive repeat orders.\n\n5. OPERATIONS\nProduction from a licensed shared commercial kitchen keeps fixed costs low and compliance high.\n\n6. FINANCIAL PLAN\nReach breakeven by maintaining a ${'>'}35% gross margin and steadily growing weekly order volume. Reinvest early profits into equipment time and inventory.\n\n(Draft generated by Culina AI — refine with your real numbers.)`;
    const text = await callAI('business-plan', form, fallback);
    setOut(text);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2">
        <div><Label>Business name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
        <div><Label>Stage</Label><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}><option value="idea">Idea</option><option value="early">Early</option><option value="growing">Growing</option><option value="scaling">Scaling</option></Select></div>
        <div><Label>Target market</Label><Input value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} /></div>
        <div className="sm:col-span-2"><Button onClick={run} variant="accent" disabled={loading}>{loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Sparkles className="h-4 w-4" /> Generate business plan</>}</Button></div>
      </CardContent></Card>
      {out && (<div><pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{out}</pre><AiDisclaimer /></div>)}
    </div>
  );
}

function AITool({ endpoint, inputLabel, buttonLabel, makeFallback }: { endpoint: string; inputLabel: string; buttonLabel: string; makeFallback: (input: string) => string }) {
  const [input, setInput] = React.useState('');
  const [out, setOut] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  async function run() {
    setLoading(true);
    const text = await callAI(endpoint, { input }, makeFallback(input));
    setOut(text);
    setLoading(false);
  }
  return (
    <div className="space-y-4">
      <Card><CardContent className="space-y-3 p-5">
        <div><Label>{inputLabel}</Label><Textarea rows={5} value={input} onChange={(e) => setInput(e.target.value)} /></div>
        <Button onClick={run} variant="accent" disabled={loading || !input.trim()}>{loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <><Sparkles className="h-4 w-4" /> {buttonLabel}</>}</Button>
      </CardContent></Card>
      {out && (<div><pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{out}</pre><AiDisclaimer /></div>)}
    </div>
  );
}
