import * as React from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { listLearning, upsertLearning } from '@/lib/store';
import { useForceUpdate } from '@/lib/hooks';
import { titleCase as catLabel } from '@/lib/format';
import type { LearningResource } from '@culina/shared';

const emptyForm = {
  title: '',
  description: '',
  category: 'business_formation',
  content_type: 'article' as LearningResource['content_type'],
  duration: '',
  url: '',
  is_free: true,
};

export default function Content() {
  const resources = listLearning();
  const force = useForceUpdate();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('A title is required.');
    upsertLearning({
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() as LearningResource['category'],
      content_type: form.content_type,
      duration_minutes: form.duration ? Number(form.duration) : null,
      content_url: form.url.trim() || null,
      is_free: form.is_free,
    });
    setOpen(false);
    setForm(emptyForm);
    force();
    toast.success('Resource added to the library.');
  }

  return (
    <div>
      <PageHeader
        title="Learning Content"
        description="Manage the maker education library."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add resource</Button>}
      />
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Type</th><th className="p-3">Access</th></tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3 text-muted-foreground">{catLabel(r.category)}</td>
                <td className="p-3 capitalize">{r.content_type}</td>
                <td className="p-3">{r.is_free ? <Badge variant="success">Free</Badge> : <Badge variant="accent">Pro</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a learning resource">
        <form onSubmit={save} className="space-y-3">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pricing for wholesale" /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. financial_planning" /></div>
            <div>
              <Label>Content type</Label>
              <Select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value as LearningResource['content_type'] })}>
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="guide">Course / guide</option>
                <option value="template">Template</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Duration (minutes)</Label><Input type="number" min={0} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            <div><Label>URL</Label><Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="h-4 w-4 rounded border-input" />
            Free for all makers
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add resource</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
