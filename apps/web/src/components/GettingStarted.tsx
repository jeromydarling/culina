import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Rocket, X, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ONBOARDING_STEPS, getCompletedSteps, hasBeenWelcomed, markWelcomed } from '@/lib/onboarding';

/** First-login welcome modal + persistent setup checklist for operators. */
export function GettingStarted() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);
  const completed = getCompletedSteps(profile!.id);
  const [showWelcome, setShowWelcome] = React.useState(!hasBeenWelcomed(profile!.id));

  const done = ONBOARDING_STEPS.filter((s) => completed.has(s.id)).length;
  const pct = Math.round((done / ONBOARDING_STEPS.length) * 100);

  if (done === ONBOARDING_STEPS.length || dismissed) {
    return (
      <Modal open={showWelcome} onClose={() => { markWelcomed(profile!.id); setShowWelcome(false); }} title="">
        <WelcomeBody onStart={() => { markWelcomed(profile!.id); setShowWelcome(false); navigate('/operator/onboarding'); }} onClose={() => { markWelcomed(profile!.id); setShowWelcome(false); }} />
      </Modal>
    );
  }

  return (
    <>
      <Card className="mb-6 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-accent" /> Get your kitchen up and running</CardTitle>
          <button onClick={() => setDismissed(true)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{done}/{ONBOARDING_STEPS.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ONBOARDING_STEPS.map((s) => {
              const isDone = completed.has(s.id);
              return (
                <Link key={s.id} to={s.to} className={cn('flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50', isDone && 'opacity-60')}>
                  <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', isDone ? 'bg-emerald-500 text-white' : 'border')}>
                    {isDone && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className={cn(isDone && 'line-through')}>{s.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-4">
            <Link to="/operator/onboarding"><Button><Sparkles className="h-4 w-4" /> Open the guided setup</Button></Link>
          </div>
        </CardContent>
      </Card>

      <Modal open={showWelcome} onClose={() => { markWelcomed(profile!.id); setShowWelcome(false); }} title="">
        <WelcomeBody onStart={() => { markWelcomed(profile!.id); setShowWelcome(false); navigate('/operator/onboarding'); }} onClose={() => { markWelcomed(profile!.id); setShowWelcome(false); }} />
      </Modal>
    </>
  );
}

function WelcomeBody({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Rocket className="h-7 w-7" /></div>
      <h2 className="mt-4 font-heading text-2xl font-bold">Welcome to Culina!</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Let’s bring your existing kitchen data in and get you ready to fill bookings and grow revenue — yours
        and your tenants’. The guided setup takes about 5 minutes.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" onClick={onClose}>I’ll explore first</Button>
        <Button onClick={onStart}>Start guided setup</Button>
      </div>
    </div>
  );
}
