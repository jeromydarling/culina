import * as React from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/misc';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as seed from '@/lib/mockData';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';

export default function Users() {
  const [q, setQ] = React.useState('');
  // Profiles don't carry the users.suspended flag, so track toggles locally.
  const [suspended, setSuspended] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState<string | null>(null);
  const users = seed.profiles.filter((p) => `${p.full_name} ${p.email} ${p.role}`.toLowerCase().includes(q.toLowerCase()));

  async function toggleSuspend(id: string) {
    const next = !suspended.has(id);
    if (isLive()) {
      setBusy(id);
      try {
        await dataApi.suspendUser(id, next);
      } catch (e) {
        toast.error((e as Error).message);
        setBusy(null);
        return;
      }
      setBusy(null);
    }
    setSuspended((s) => {
      const out = new Set(s);
      next ? out.add(id) : out.delete(id);
      return out;
    });
    toast.success(next ? 'Account suspended — they can no longer log in.' : 'Account reinstated — they can log in again.');
  }

  return (
    <div>
      <PageHeader title="User Management" description="Search users, change roles, and manage accounts." />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Account</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSuspended = suspended.has(u.id);
              return (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {u.full_name}
                    {isSuspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3"><Badge variant={u.role === 'admin' ? 'accent' : 'default'}>{u.role}</Badge></td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant={isSuspended ? 'outline' : 'destructive'}
                      disabled={busy === u.id}
                      onClick={() => toggleSuspend(u.id)}
                    >
                      {isSuspended ? 'Reinstate' : 'Suspend'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
