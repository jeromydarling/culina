import * as React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { listNotifications, markNotificationRead } from '@/lib/store';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function DashboardLayout({
  nav,
  title,
  children,
}: {
  nav: NavItem[];
  title: string;
  children: React.ReactNode;
}) {
  const { profile, logout, isDemo } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);

  const notes = profile ? listNotifications(profile.id) : [];
  const unread = notes.filter((n) => !n.is_read).length;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <Logo />
      </div>
      <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary">
            {(profile?.full_name ?? 'U').charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
          </div>
          <button onClick={handleLogout} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur lg:px-8">
          <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          {isDemo && (
            <span className="hidden rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent sm:inline-flex">
              Demo mode — explore freely, changes aren’t saved
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-card p-2 shadow-xl">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button onClick={() => setBellOpen(false)} className="rounded p-1 hover:bg-muted">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {notes.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">You’re all caught up.</p>}
                  {notes.map((n) => (
                    <Link
                      key={n.id}
                      to={n.action_url ?? '#'}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setBellOpen(false);
                      }}
                      className={cn('block rounded-md px-2 py-2 hover:bg-muted', !n.is_read && 'bg-primary/5')}
                    >
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
