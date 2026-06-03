import * as React from 'react';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useForceUpdate } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea, Label } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { listMentors, listMentorRequests, requestMentor } from '@/lib/store';
import type { Mentor } from '@culina/shared';

export default function Mentors() {
  const { profile } = useAuth();
  const force = useForceUpdate();
  const mentors = listMentors();
  const requests = listMentorRequests(profile!.id);
  const [selected, setSelected] = React.useState<Mentor | null>(null);
  const [message, setMessage] = React.useState('');

  const requestFor = (mentorId: string) => requests.find((r) => r.mentor_id === mentorId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    requestMentor(profile!.id, selected.id, message);
    setSelected(null);
    setMessage('');
    force();
    toast.success(`Request sent to ${selected.name}`);
  }

  return (
    <div>
      <PageHeader title="Mentor Matching" description="Connect with vetted mentors in food law, distribution, branding, scaling, and financing." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => {
          const req = requestFor(m.id);
          return (
            <div key={m.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-2xl">{m.avatar_emoji}</div>
                <div>
                  <h3 className="font-heading font-semibold">{m.name}</h3>
                  <div className="text-xs text-muted-foreground">{m.expertise}</div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{m.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="muted">{m.availability}</Badge>
                <Badge variant="accent">{m.rate}</Badge>
              </div>
              <div className="mt-4">
                {req ? (
                  <Badge variant={statusVariant(req.status === 'requested' ? 'pending' : req.status === 'accepted' ? 'active' : req.status)}>
                    {req.status === 'requested' ? 'Request pending' : req.status}
                  </Badge>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => setSelected(m)}><GraduationCap className="h-4 w-4" /> Request mentorship</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Request ${selected?.name ?? ''}`} description={selected?.expertise}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>What would you like help with?</Label><Textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Briefly describe your goal or challenge…" /></div>
          <Button type="submit" className="w-full">Send request</Button>
        </form>
      </Modal>
    </div>
  );
}
