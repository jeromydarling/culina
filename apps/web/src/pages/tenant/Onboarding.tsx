import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Store as StoreIcon, FileCheck2, CalendarPlus,
  ChefHat, PartyPopper, Wand2, MapPin,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { getTenantProfile, updateTenantProfile, getMembershipForTenant, getKitchenBySlug, listKitchens } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { completeStep, markWelcomed, type OnboardingStepId } from '@/lib/onboarding';
import { uploadFile } from '@/lib/upload';
import { notifyError } from '@/lib/errors';
import { callAI } from '@/lib/ai';

const STEPS = ['Welcome', 'Your business', 'Join a kitchen', 'Get compliant', 'Launch', 'Done'];

export default function Onboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tp = getTenantProfile(profile!.id);
  const membership = getMembershipForTenant(profile!.id);
  // Public directory of listed kitchens (so a new tenant sees real options, not
  // their own/seeded subset from the user-scoped hydrate).
  const [kitchens, setKitchens] = React.useState(() => listKitchens().filter((k) => k.is_listed));
  React.useEffect(() => {
    if (isLive()) dataApi.kitchens().then((d) => setKitchens((d.kitchens as typeof kitchens).filter((k) => k.is_listed))).catch(() => {});
  }, []);
  const [step, setStep] = React.useState(0);

  const [biz, setBiz] = React.useState({
    business_name: tp?.business_name ?? '',
    business_type: tp?.business_type ?? 'bakery',
    description: tp?.description ?? '',
  });
  const [vibe, setVibe] = React.useState('');
  const [pitch, setPitch] = React.useState('');
  const [pitchLoading, setPitchLoading] = React.useState(false);
  const [kitchenSlug, setKitchenSlug] = React.useState(
    membership ? listKitchens().find((k) => k.id === membership.kitchen_id)?.slug ?? '' : kitchens[0]?.slug ?? '',
  );

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  function saveBiz() {
    updateTenantProfile(profile!.id, biz);
    completeStep(profile!.id, 't_profile');
    next();
  }

  async function generatePitch() {
    setPitchLoading(true);
    const fallback = `${biz.business_name} makes ${biz.description || `small-batch ${biz.business_type}`} — crafted with care for neighbors who notice the difference. ${vibe ? `It feels ${vibe}.` : ''} Order fresh, support a local maker.`;
    const text = await callAI('tutor', { question: `Write a one-sentence tagline for ${biz.business_name}, a ${biz.business_type} business. Vibe: ${vibe}.`, context: { business_type: biz.business_type } }, fallback);
    setPitch(text);
    setPitchLoading(false);
  }

  function joinKitchen() {
    completeStep(profile!.id, 't_kitchen');
    toast.success(`${getKitchenBySlug(kitchenSlug)?.name ?? 'The kitchen'} will be glad to hear from you — they’ll welcome you in soon.`);
    next();
  }

  function finish() {
    markWelcomed(profile!.id);
    navigate('/tenant');
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* progress */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn('grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-colors', i < step ? 'bg-primary text-secondary' : i === step ? 'bg-accent text-white' : 'bg-muted text-muted-foreground')}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-1 h-1 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      {/* WELCOME */}
      {step === 0 && (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Wand2 className="h-7 w-7" /></div>
          <h1 className="mt-4 font-heading text-3xl font-bold">Welcome, {profile!.full_name?.split(' ')[0]} 👋</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            You’re minutes away from running your food business like a pro: book kitchen time, stay compliant,
            price for profit, and sell online with a free AI-built storefront.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-left">
            {[
              { icon: CalendarPlus, t: 'Book space', d: 'Reserve the kitchen and equipment in seconds.' },
              { icon: ChefHat, t: 'Price for profit', d: 'Know your true cost per unit with the Food Cost Lab.' },
              { icon: StoreIcon, t: 'Sell online', d: 'Launch a storefront + AI website for free.' },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border p-4"><c.icon className="h-5 w-5 text-accent" /><div className="mt-2 text-sm font-semibold">{c.t}</div><div className="text-xs text-muted-foreground">{c.d}</div></div>
            ))}
          </div>
          <Button size="lg" className="mt-7" onClick={next}>Let’s go <ArrowRight className="h-4 w-4" /></Button>
        </CardContent></Card>
      )}

      {/* BUSINESS */}
      {step === 1 && (
        <div className="space-y-4">
          <div><h2 className="font-heading text-2xl font-bold">Tell us about your business</h2><p className="text-muted-foreground">This powers your storefront, labels, and grant matches.</p></div>
          <Card><CardContent className="space-y-3 p-5">
            <div><Label>Business name</Label><Input value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} placeholder="Sara's Sourdough" /></div>
            <div>
              <Label>Type</Label>
              <Select value={biz.business_type} onChange={(e) => setBiz({ ...biz, business_type: e.target.value })}>
                {['bakery', 'caterer', 'packaged', 'meal_prep', 'beverage', 'confectionery', 'other'].map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
            </div>
            <div><Label>What do you make?</Label><Textarea value={biz.description} onChange={(e) => setBiz({ ...biz, description: e.target.value })} placeholder="Naturally-leavened sourdough, baked fresh weekly." /></div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <div className="flex items-center gap-2"><Label className="flex-1">Three words for your vibe</Label><Button size="sm" variant="ghost" onClick={generatePitch} disabled={pitchLoading || !biz.business_name}>{pitchLoading ? <Spinner className="h-4 w-4" /> : <><Sparkles className="h-4 w-4" /> Tagline</>}</Button></div>
              <Input className="mt-1" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="warm, honest, neighborly" />
              {pitch && <p className="mt-2 text-sm italic text-muted-foreground">“{pitch}”</p>}
            </div>
          </CardContent></Card>
          <div className="flex justify-between"><Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button><Button onClick={saveBiz} disabled={!biz.business_name}>Continue <ArrowRight className="h-4 w-4" /></Button></div>
        </div>
      )}

      {/* JOIN KITCHEN */}
      {step === 2 && (
        <div className="space-y-4">
          <div><h2 className="font-heading text-2xl font-bold">Find your kitchen home</h2><p className="text-muted-foreground">Already been invited? You’re likely connected. Otherwise, choose the kitchen you’d like to call home.</p></div>
          <div className="grid gap-3">
            {kitchens.map((k) => (
              <button key={k.id} onClick={() => setKitchenSlug(k.slug)} className={cn('flex items-center gap-3 rounded-xl border p-4 text-left transition-all', kitchenSlug === k.slug ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-lg">🏭</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{k.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {k.city}, {k.state}</div>
                </div>
                {kitchenSlug === k.slug && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button><Button onClick={joinKitchen} disabled={!kitchenSlug}>Join kitchen <ArrowRight className="h-4 w-4" /></Button></div>
        </div>
      )}

      {/* COMPLIANCE */}
      {step === 3 && (
        <div className="space-y-4">
          <div><h2 className="font-heading text-2xl font-bold">Get compliant</h2><p className="text-muted-foreground">Upload these to unlock booking. You can add more later.</p></div>
          <Card><CardContent className="p-5">
            <div className="space-y-2">
              {['Food handler certification', 'Liability insurance (COI)', 'Business license', 'Health permit'].map((d) => (
                <div key={d} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /> {d}</span>
                  <DocUpload label={d} onDone={() => completeStep(profile!.id, 't_docs')} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Files are stored in your kitchen’s document vault (Cloudflare R2 once enabled).</p>
          </CardContent></Card>
          <div className="flex justify-between"><Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button><Button onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button></div>
        </div>
      )}

      {/* LAUNCH */}
      {step === 4 && (
        <div className="space-y-4">
          <div><h2 className="font-heading text-2xl font-bold">Launch your business</h2><p className="text-muted-foreground">Three quick wins to start making money this week.</p></div>
          <div className="grid gap-3">
            {[
              { icon: CalendarPlus, t: 'Make your first booking', d: 'Reserve kitchen time for your next production run.', step: 't_booking', to: '/tenant/book', cta: 'Book a space' },
              { icon: ChefHat, t: 'Cost your first recipe', d: 'Find your true margin and a profitable price.', step: 't_recipe', to: '/tenant/recipes', cta: 'Open Food Cost Lab' },
              { icon: StoreIcon, t: 'Build your storefront', d: 'AI generates your site + a free online shop.', step: 't_storefront', to: '/tenant/storefront', cta: 'Build storefront' },
            ].map((c) => (
              <Card key={c.t}><CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-3"><c.icon className="mt-0.5 h-5 w-5 text-accent" /><div><h3 className="font-semibold">{c.t}</h3><p className="text-sm text-muted-foreground">{c.d}</p></div></div>
                <Button variant="outline" onClick={() => { completeStep(profile!.id, c.step as OnboardingStepId); markWelcomed(profile!.id); navigate(c.to); }}>{c.cta}</Button>
              </CardContent></Card>
            ))}
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button><Button onClick={next}>Finish <ArrowRight className="h-4 w-4" /></Button></div>
        </div>
      )}

      {/* DONE */}
      {step === 5 && (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600"><PartyPopper className="h-7 w-7" /></div>
          <h1 className="mt-4 font-heading text-3xl font-bold">You’re all set! 🎉</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Your business is ready to grow on Culina. Jump into your hub to book space, manage products, and track your milestones.</p>
          <Button size="lg" className="mt-7" onClick={finish}>Go to my hub <ArrowRight className="h-4 w-4" /></Button>
        </CardContent></Card>
      )}
    </div>
  );
}

/** Compact per-row file uploader for the compliance step (real R2 upload). */
function DocUpload({ label, onDone }: { label: string; onDone: () => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  async function handle(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadFile(file);
      setDone(true);
      onDone();
      toast.success(`${label} uploaded`);
    } catch (e) {
      notifyError(e, { action: 'uploadDoc' });
    }
    setBusy(false);
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      <Button size="sm" variant={done ? 'ghost' : 'outline'} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Uploading…' : done ? '✓ Uploaded' : 'Upload'}
      </Button>
    </>
  );
}
