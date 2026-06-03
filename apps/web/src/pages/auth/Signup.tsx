import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, Store } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { takeSignupPrefill } from '@/lib/signupPrefill';
import type { UserRole } from '@culina/shared';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = React.useState<UserRole>('operator');
  const [form, setForm] = React.useState({ name: '', email: '', password: '', business: '' });
  const [loading, setLoading] = React.useState(false);
  const [converting, setConverting] = React.useState(false);

  // Prefill from a converted demo session, if present.
  React.useEffect(() => {
    const pre = takeSignupPrefill();
    if (pre) {
      setRole(pre.role);
      setForm((f) => ({ ...f, name: pre.fullName ?? '', business: pre.businessName ?? '' }));
      setConverting(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signup(form.email, form.password, role, form.name, form.business);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success('Welcome to Culina!');
    navigate(role === 'operator' ? '/operator' : '/tenant');
  }

  const roles: { id: UserRole; icon: typeof ChefHat; title: string; sub: string }[] = [
    { id: 'operator', icon: ChefHat, title: 'I run a shared kitchen', sub: 'Operator' },
    { id: 'tenant', icon: Store, title: 'I’m a food entrepreneur', sub: 'Maker' },
  ];

  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">{converting ? 'Save your work' : 'Create your account'}</h2>
      <p className="mt-1 text-muted-foreground">
        {converting ? 'Turn your demo into a real account — your details are carried over.' : 'Free to start. No card required.'}
      </p>

      {converting && form.business && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
          Continuing as <span className="font-semibold">{form.business}</span>
        </div>
      )}

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

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div><Label>Full name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <Label>{role === 'operator' ? 'Kitchen name' : 'Business name'}</Label>
          <Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder={role === 'operator' ? 'Midwest Food Hub' : "Sara's Sourdough"} />
        </div>
        <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
