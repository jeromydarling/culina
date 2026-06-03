import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listLearning } from '@/lib/store';
import { titleCase as catLabel } from '@/lib/format';

export default function Content() {
  const resources = listLearning();
  return (
    <div>
      <PageHeader title="Learning Content" description="Manage the maker education library." action={<Button onClick={() => toast.success('Resource editor (demo)')}><Plus className="h-4 w-4" /> Add resource</Button>} />
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
    </div>
  );
}
