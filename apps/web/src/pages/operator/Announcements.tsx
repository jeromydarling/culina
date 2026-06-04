import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Pin, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/input';
import { getKitchenByOperator, listAnnouncements, createAnnouncement } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function Announcements() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const items = listAnnouncements(kitchen.id);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', body: '', is_pinned: false });

  function post(e: React.FormEvent) {
    e.preventDefault();
    createAnnouncement({ kitchen_id: kitchen.id, author_id: profile!.id, ...form });
    setForm({ title: '', body: '', is_pinned: false });
    setOpen(false);
    force();
    toast.success('Announcement posted');
  }

  return (
    <div>
      <PageHeader title="Announcements" description="Broadcast updates to your members." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New announcement</Button>} />
      {items.length === 0 ? (
        <EmptyState icon={Pin} title="No announcements yet" description="Keep your community in the loop with kitchen updates." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                {a.is_pinned && <Pin className="h-4 w-4 text-accent" />}
                <h3 className="font-heading font-semibold">{a.title}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New announcement">
        <form onSubmit={post} className="space-y-3">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pin to top</label>
          <Button type="submit" className="w-full">Post</Button>
        </form>
      </Modal>
    </div>
  );
}
