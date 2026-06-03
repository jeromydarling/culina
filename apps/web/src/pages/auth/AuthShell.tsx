import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { BRAND } from '@culina/shared';

/** Split-screen wrapper for auth pages with a branded marketing panel. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-animated-gradient bg-[linear-gradient(120deg,#1f3a2e,#2D4A3E,#3a5e4f,#2D4A3E)]" />
        <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl animate-blob" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl animate-blob [animation-delay:3s]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-secondary">
          <Logo light />
          <div>
            <h1 className="font-heading text-4xl font-bold text-white text-balance">{BRAND.heroLine}</h1>
            <p className="mt-4 max-w-sm text-secondary/80">
              Join the platform built for shared kitchens and the food makers inside them. We grow only when you do.
            </p>
          </div>
          <p className="text-sm text-secondary/60">We grow by making others grow first.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to Culina’s Terms & Privacy.{' '}
            <Link to="/" className="underline">Back to site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
