import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { authApi } from '@/lib/authApi';
import { useAuth } from '@/context/AuthContext';
import { humanError } from '@/lib/errors';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords don’t match.');
    setBusy(true);
    try {
      const { token: jwt, profile } = await authApi.reset(token, password);
      await establishSession(jwt, profile);
      toast.success('Password updated — you’re signed in.');
      navigate(`/${profile.role}`, { replace: true });
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">Choose a new password</h2>
      <p className="mt-1 text-muted-foreground">Set a new password for your Culina account.</p>

      {!token ? (
        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          This reset link is missing its token. Please use the link from your email, or{' '}
          <Link to="/auth/forgot-password" className="font-medium underline">request a new one</Link>.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>New password</Label>
            <Input type="password" required placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" required placeholder="Re-enter your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-medium text-primary hover:underline">Back to log in</Link>
      </p>
    </AuthShell>
  );
}
