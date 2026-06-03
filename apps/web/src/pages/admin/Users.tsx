import * as React from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as seed from '@/lib/mockData';

export default function Users() {
  const [q, setQ] = React.useState('');
  const users = seed.profiles.filter((p) => `${p.full_name} ${p.email} ${p.role}`.toLowerCase().includes(q.toLowerCase()));
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
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{u.full_name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3"><Badge variant={u.role === 'admin' ? 'accent' : 'default'}>{u.role}</Badge></td>
                <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => toast.success('Account suspended (demo)')}>Suspend</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
