import * as React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { to: '/#why', label: 'Why Culina' },
  { to: '/#problem', label: 'The Problem' },
  { to: '/#features', label: 'Features' },
  { to: '/#compare', label: 'Compare' },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/find-a-kitchen', label: 'Find a Kitchen' },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b bg-white/85 backdrop-blur-md shadow-sm' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary/5 hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/auth/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button size="sm" variant="accent">
              Get started
            </Button>
          </Link>
        </div>
        <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-white px-4 py-3 lg:hidden">
          {links.map((l) => (
            <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex gap-2">
            <Link to="/auth/login" className="flex-1">
              <Button variant="outline" className="w-full">Log in</Button>
            </Link>
            <Link to="/auth/signup" className="flex-1">
              <Button variant="accent" className="w-full">Get started</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
