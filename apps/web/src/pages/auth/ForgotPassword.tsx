import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPassword() {
  const [sent, setSent] = React.useState(false);
  return (
    <AuthShell>
      <h2 className="font-heading text-3xl font-bold">Reset your password</h2>
      <p className="mt-1 text-muted-foreground">We’ll email you a magic link to get back in.</p>
      {sent ? (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          If an account exists for that email, a reset link is on its way.
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success('Reset link sent (demo).');
          }}
          className="mt-6 space-y-4"
        >
          <div><Label>Email</Label><Input type="email" required placeholder="you@business.com" /></div>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-medium text-primary hover:underline">Back to log in</Link>
      </p>
    </AuthShell>
  );
}
