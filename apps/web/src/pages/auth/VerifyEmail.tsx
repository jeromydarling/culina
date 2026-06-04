import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { authApi } from '@/lib/authApi';
import { humanError } from '@/lib/errors';

type Status = 'verifying' | 'ok' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = React.useState<Status>('verifying');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    let active = true;
    authApi
      .verifyEmail(token)
      .then(() => active && setStatus('ok'))
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        setMessage(humanError(err));
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell>
      {status === 'verifying' && (
        <div className="flex flex-col items-center py-6 text-center">
          <Spinner className="h-8 w-8" />
          <p className="mt-4 text-muted-foreground">Confirming your email…</p>
        </div>
      )}
      {status === 'ok' && (
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 font-heading text-2xl font-bold">Email confirmed</h2>
          <p className="mt-1 text-muted-foreground">Your Culina account is all set. Thanks for confirming.</p>
          <Link to="/auth/login" className="mt-6 w-full">
            <Button className="w-full">Continue to log in</Button>
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col items-center py-4 text-center">
          <XCircle className="h-12 w-12 text-red-500" />
          <h2 className="mt-4 font-heading text-2xl font-bold">Couldn’t confirm</h2>
          <p className="mt-1 text-muted-foreground">{message || 'This verification link is invalid or has expired.'}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            You can request a fresh link from your account settings after logging in.
          </p>
          <Link to="/auth/login" className="mt-6 w-full">
            <Button variant="outline" className="w-full">Back to log in</Button>
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
