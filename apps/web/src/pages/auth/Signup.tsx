import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, Store, HeartHandshake } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { dataApi } from '@/lib/dataApi';
import { notifyError } from '@/lib/errors';
import { takeSignupPrefill, type DemoCarry } from '@/lib/signupPrefill';
import { carrySummary } from '@/lib/convert';
import type { UserRole } from '@culina/shared';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = React.useState<UserRole>('operator');
  const [form, setForm] = React.useState({ name: '', email: '', password: '', business: '' });
  const [loading, setLoading] = React.useState(false);
  const [converting, setConverting] = React.useState(false);
  const [carry, setCarry] = React.useState<DemoCarry | undefined>();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') ?? '';
  const [invite, setInvite] = React.useState<{ email: string; full_name: string | null; business_name: string | null; kitchen_name: string } | null>(null);

  // Prefill from a converted demo session, if present.
  React.useEffect(() => {
    const pre = takeSignupPrefill();
    if (pre) {
      setRole(pre.role);
      setForm((f) => ({ ...f, name: pre.fullName ?? '', business: pre.businessName ?? '' }));
      setCarry(pre.carry);
      setConverting(true);
    }
  }, []);

  // Prefill from a membership invitation, if present.
  React.useEffect(() => {
    if (!inviteToken) return;
    dataApi
      .invite(inviteToken)
      .then((d) => {
        if (!d.invite) return;
        setInvite(d.invite);
        setRole('tenant');
        setForm((f) => ({ ...f, email: d.invite!.email, name: d.invite!.full_name ?? f.name, business: d.invite!.business_name ?? f.business }));
      })
      .catch(() => {});
  }, [inviteToken]);

  const keepList = carry?.counts ? carrySummary(carry.counts) : [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signup(form.email, form.password, role, form.name, form.business, carry, inviteToken || undefined);
    setLoading(false);
    if (error) return notifyError(new Error(error), { action: 'signup' });
    toast.success(invite ? `Welcome to ${invite.kitchen_name}!` : keepList.length ? 'Welcome to Culina — your work is saved!' : 'Welcome to Culina!');
    navigate(role === 'operator' ? '/operator' : '/tenant');
  }

  const roles: { id: UserRole; icon: typeof ChefHat; title: string; sub: string }[] = [
    { id: 'operator', icon: ChefHat, title: 'I run a shared kitchen', sub: 'Operator' },
    { id: 'tenant', icon: Store, title: 'I’m a food entrepreneur', sub: 'Maker' },
  ];

  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">{invite ? 'Accept your invitation' : converting ? 'Save your work' : 'Create your account'}</h2>
      <p className="mt-1 text-muted-foreground">
        {invite ? `${invite.kitchen_name} would love to welcome you in as a member.` : converting ? 'Turn your demo into a real account — your details are carried over.' : 'Free to start. No card required.'}
      </p>

      {invite && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0" />
          <span>You’ve been invited to join <span className="font-semibold">{invite.kitchen_name}</span>. Finish creating your account and your membership will be ready and waiting.</span>
        </div>
      )}

      {converting && (form.business || keepList.length > 0) && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          {form.business && <div>Continuing as <span className="font-semibold">{form.business}</span></div>}
          {keepList.length > 0 && (
            <div className="mt-1 text-muted-foreground">
              We’ll bring over <span className="font-medium text-foreground">{keepList.join(', ')}</span> from your demo.
            </div>
          )}
        </div>
      )}

      {!invite && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                role === r.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/40',
              )}
            >
              <r.icon className={cn('h-5 w-5', role === r.id ? 'text-primary' : 'text-muted-foreground')} />
              <div className="mt-2 text-sm font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.sub}</div>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div><Label>Full name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <Label>{role === 'operator' ? 'Kitchen name' : 'Business name'}</Label>
          <Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder={role === 'operator' ? 'Midwest Food Hub' : "Sara's Sourdough"} />
        </div>
        <div><Label>Email</Label><Input type="email" required readOnly={!!invite} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={invite ? 'bg-muted/50' : undefined} /></div>
        <div><Label>Password</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
