import * as React from 'react';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Lock, PlayCircle, FileText, ListChecks, Sparkles, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { listLearning, getTenantProfile } from '@/lib/store';
import { callAI } from '@/lib/ai';
import { LEARNING_CATEGORIES } from '@culina/shared';
import type { LearningResource } from '@culina/shared';

const typeIcon = { article: FileText, video: PlayCircle, checklist: ListChecks, template: FileText, guide: BookOpen };
const catLabel = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function Learning() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const resources = listLearning();
  const [cat, setCat] = React.useState('all');
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const filtered = resources.filter((r) => cat === 'all' || r.category === cat);

  function toggle(id: string) {
    setDone((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setAnswer('');
    const fallback = `Great question. For a ${tp?.business_type ?? 'food'} business at your stage, the short answer is: start with the requirement that blocks revenue first (usually your food handler cert and the kitchen agreement), then layer in business formation and labeling as you scale. A few concrete next steps:\n\n1. Confirm your state’s cottage-food vs. commercial rules for what you make.\n2. Lock in liability insurance — most kitchens require a current COI.\n3. Use the Food Cost Lab to price with a real margin before you chase volume.\n\nWant me to break any of these down further?`;
    const text = await callAI('tutor', { question: q, context: { business_type: tp?.business_type, years: tp?.years_in_operation } }, fallback);
    setAnswer(text);
    setLoading(false);
  }

  const ResourceCard = ({ r, locked }: { r: LearningResource; locked?: boolean }) => {
    const Icon = typeIcon[r.content_type] ?? BookOpen;
    return (
      <div className={cn('flex flex-col rounded-lg border bg-card p-5 shadow-card', locked && 'opacity-60')}>
        <div className="flex items-start justify-between">
          <Icon className="h-5 w-5 text-accent" />
          {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <button onClick={() => toggle(r.id)}>{done.has(r.id) ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <span className="block h-5 w-5 rounded-full border" />}</button>}
        </div>
        <h3 className="mt-3 font-medium">{r.title}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="muted">{catLabel(r.category)}</Badge>
          {r.duration_minutes && <span className="text-xs text-muted-foreground">{r.duration_minutes} min</span>}
          {!r.is_free && <Badge variant="accent">Pro</Badge>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Learning Hub" description="Grow from launch to graduation, one lesson at a time." />

      <Card className="mb-6 border-accent/30 bg-accent/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Ask the AI Kitchen Tutor</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={ask} className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What permits do I need to sell jam in Minnesota?" />
            <Button type="submit" variant="accent" disabled={loading}>{loading ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Send className="h-4 w-4" />}</Button>
          </form>
          {answer && <pre className="mt-3 whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm leading-relaxed">{answer}</pre>}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCat('all')} className={cn('rounded-full border px-3 py-1 text-sm', cat === 'all' ? 'border-primary bg-primary text-white' : 'hover:border-primary/40')}>All</button>
        {LEARNING_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn('rounded-full border px-3 py-1 text-sm', cat === c ? 'border-primary bg-primary text-white' : 'hover:border-primary/40')}>{catLabel(c)}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => <ResourceCard key={r.id} r={r} locked={!r.is_free} />)}
      </div>
    </div>
  );
}
