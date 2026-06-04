import * as React from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { authApi } from '@/lib/authApi';
import { notifyError } from '@/lib/errors';

export default function ForgotPassword() {
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // The endpoint always succeeds (it never reveals whether an account exists).
      await authApi.forgot(email);
      setSent(true);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">Reset your password</h2>
      <p className="mt-1 text-muted-foreground">We’ll email you a secure link to set a new one.</p>
      {sent ? (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          If an account exists for that email, a reset link is on its way. The link expires in 1 hour.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-medium text-primary hover:underline">Back to log in</Link>
      </p>
    </AuthShell>
  );
}
