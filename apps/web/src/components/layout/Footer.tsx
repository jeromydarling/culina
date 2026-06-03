import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { BRAND } from '@culina/shared';

const cols = [
  {
    title: 'Platform',
    links: [
      { to: '/#features', label: 'Features' },
      { to: '/#pricing', label: 'Pricing' },
      { to: '/find-a-kitchen', label: 'Find a Kitchen' },
      { to: '/auth/signup', label: 'Get started' },
    ],
  },
  {
    title: 'For operators',
    links: [
      { to: '/#operators', label: 'Fill your kitchen' },
      { to: '/#features', label: 'Automate admin' },
      { to: '/#compare', label: 'Why switch' },
    ],
  },
  {
    title: 'For makers',
    links: [
      { to: '/#tenants', label: 'Book space' },
      { to: '/#tenants', label: 'Launch a storefront' },
      { to: '/#grants', label: 'Find funding' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'Our mission' },
      { to: '/privacy', label: 'Privacy & data' },
      { to: '/auth/login', label: 'Log in' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-primary text-secondary/90">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo light />
            <p className="mt-3 max-w-xs text-sm text-secondary/70">{BRAND.tagline}.</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-heading text-sm font-semibold text-secondary">{c.title}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-secondary/70 transition-colors hover:text-secondary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-secondary/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Culina. We grow by helping others grow first.</span>
          <span>hello@culina.app</span>
        </div>
      </div>
    </footer>
  );
}
