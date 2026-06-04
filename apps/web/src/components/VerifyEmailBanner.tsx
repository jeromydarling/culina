import * as React from 'react';
import { MailWarning, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/authApi';
import { humanError } from '@/lib/errors';

/**
 * A gentle nudge for live users who haven't confirmed their email yet. Hidden
 * in demo sessions and once the account is verified. Dismissible for the
 * current page session.
 */
export function VerifyEmailBanner() {
  const { profile, isDemo } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  // Only when we positively know the email is unverified (live sessions).
  if (isDemo || dismissed || !profile || profile.email_verified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      const r = await authApi.resendVerification();
      if (r.already_verified) {
        toast.success('Your email is already confirmed.');
        setDismissed(true);
      } else {
        setSent(true);
        toast.success('Confirmation email sent — check your inbox.');
      }
    } catch (err) {
      toast.error(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 lg:px-8">
      <MailWarning className="h-4 w-4 shrink-0" />
      <p className="flex-1">
        <span className="font-medium">Confirm your email</span> to secure your account.
        <span className="hidden sm:inline"> Check {profile.email} for the link.</span>
      </p>
      <button
        onClick={resend}
        disabled={busy || sent}
        className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
      >
        {sent ? 'Sent ✓' : busy ? 'Sending…' : 'Resend link'}
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 rounded p-1 hover:bg-amber-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
