import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, ShieldCheck, Store } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { useAuth, roleForEmail } from '@/context/AuthContext';
import type { UserRole } from '@culina/shared';

export default function Login() {
  const { login, loginAsDemo, isDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const homeFor = (role: UserRole) => (role === 'operator' ? '/operator' : role === 'admin' ? '/admin' : '/tenant');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) return toast.error(error);
    navigate(homeFor(roleForEmail(email)));
  }

  async function demo(role: UserRole) {
    setLoading(true);
    await loginAsDemo(role);
    setLoading(false);
    navigate(homeFor(role));
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">Welcome back</h2>
      <p className="mt-1 text-muted-foreground">Log in to your Culina account.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Log in'}
        </Button>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs uppercase tracking-wider text-muted-foreground">or just explore</span></div>
      </div>

      <div className="mt-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try a live demo — no signup</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => demo('operator')} className="flex-col h-auto py-3"><ChefHat className="mb-1 h-4 w-4" />Operator</Button>
          <Button variant="outline" size="sm" onClick={() => demo('tenant')} className="flex-col h-auto py-3"><Store className="mb-1 h-4 w-4" />Maker</Button>
          <Button variant="outline" size="sm" onClick={() => demo('admin')} className="flex-col h-auto py-3"><ShieldCheck className="mb-1 h-4 w-4" />Admin</Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          A safe sandbox to poke at every feature — nothing is saved. Sign up above for a real account on Cloudflare.
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Culina? <Link to="/auth/signup" className="font-medium text-primary hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
