import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { toast } from 'sonner';
import { Pin, Plus, Megaphone, TriangleAlert, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea } from '@/components/ui/input';
import { getKitchenByOperator, listAnnouncements, createAnnouncement, addAnnouncementLocal } from '@/lib/store';
import { dataApi } from '@/lib/dataApi';
import { isLive } from '@/lib/config';
import { notifyError } from '@/lib/errors';
import { formatDistanceToNow } from 'date-fns';

type Audience = 'all' | 'active_members';

export default function Announcements() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const force = useForceUpdate();
  const items = listAnnouncements(kitchen.id);
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [form, setForm] = React.useState({
    title: '',
    body: '',
    is_pinned: false,
    audience: 'all' as Audience,
    alert: false,
    email: true,
  });

  const reset = () =>
    setForm({ title: '', body: '', is_pinned: false, audience: 'all', alert: false, email: true });

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    try {
      if (isLive()) {
        const res = await dataApi.broadcastAnnouncement({
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          alert: form.alert,
          is_pinned: form.is_pinned,
          email: form.email,
        });
        // Reflect it immediately without re-persisting (server already inserted it).
        addAnnouncementLocal({
          id: res.announcement_id,
          kitchen_id: kitchen.id,
          author_id: profile!.id,
          title: form.title.trim(),
          body: form.body.trim(),
          is_pinned: form.is_pinned,
          audience: form.audience,
        });
        const emailNote = form.email ? `, emailed ${res.emailed}` : '';
        toast.success(
          res.notified === 0
            ? 'Posted — no members to notify yet.'
            : `${form.alert ? 'Alert' : 'Announcement'} sent to ${res.notified} member${res.notified === 1 ? '' : 's'}${emailNote}.`,
        );
      } else {
        createAnnouncement({ kitchen_id: kitchen.id, author_id: profile!.id, title: form.title.trim(), body: form.body.trim(), is_pinned: form.is_pinned });
        toast.success('Announcement posted (demo)');
      }
      reset();
      setOpen(false);
      force();
    } catch (err) {
      notifyError(err, { action: 'broadcastAnnouncement' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Post an update for your members — or send an urgent alert straight to their inbox and notifications."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New announcement</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Keep your community in the loop with kitchen updates, closures, and events." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                {a.is_pinned && <Pin className="h-4 w-4 text-accent" />}
                <h3 className="font-heading font-semibold">{a.title}</h3>
                {a.audience === 'active_members' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Users className="h-3 w-3" /> Active members
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New announcement">
        <form onSubmit={post} className="space-y-3">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kitchen closed Monday for deep clean" /></div>
          <div><Label>Message</Label><Textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Share the details your members need to know…" /></div>

          <div>
            <Label>Who should get this?</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([
                { v: 'all' as Audience, label: 'Everyone' },
                { v: 'active_members' as Audience, label: 'Active members only' },
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setForm({ ...form, audience: o.v })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${form.audience === o.v ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:bg-muted/40'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-input p-3 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.alert} onChange={(e) => setForm({ ...form, alert: e.target.checked })} />
            <span>
              <span className="flex items-center gap-1.5 font-medium"><TriangleAlert className="h-4 w-4 text-amber-500" /> Send as an urgent alert</span>
              <span className="text-muted-foreground">Flags it as time-sensitive in members’ notifications and email subject.</span>
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.email} onChange={(e) => setForm({ ...form, email: e.target.checked })} /> Also email members (not just in-app)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pin to top</label>

          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? 'Sending…' : form.alert ? 'Send alert' : 'Post announcement'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
