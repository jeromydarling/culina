import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { SmartImage } from '@/components/SmartImage';
import { AiImageButton } from '@/components/AiImageButton';
import { getKitchenByOperator, updateKitchen } from '@/lib/store';
import { PrivacyData } from '@/components/PrivacyData';

export default function Settings() {
  const { profile } = useAuth();
  const kitchen = getKitchenByOperator(profile!.id)!;
  const [form, setForm] = React.useState({ ...kitchen });

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateKitchen(kitchen.id, form);
    toast.success('Settings saved');
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your kitchen’s public profile and listing." />
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Kitchen profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Cover image</Label>
              <div className="mt-1 overflow-hidden rounded-lg border">
                <div className="h-28 w-full overflow-hidden">
                  <SmartImage src={form.cover_image_url ?? undefined} alt={form.name} emoji="🏭" gradient="from-slate-700 via-emerald-900 to-primary" className="h-full w-full" />
                </div>
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="text-xs text-muted-foreground">Generate a kitchen / menu image with Flux</span>
                  <AiImageButton
                    prompt={`${form.name}, ${form.description ?? 'a shared commercial kitchen'}`}
                    style="kitchen"
                    label="Generate"
                    onGenerated={(url) => setForm({ ...form, cover_image_url: url })}
                  />
                </div>
              </div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>City</Label><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state ?? ''} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Listing & pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Monthly base price ($)</Label><Input type="number" value={form.monthly_price_cents / 100} onChange={(e) => setForm({ ...form, monthly_price_cents: Math.round(Number(e.target.value) * 100) })} /></div>
            <div><Label>Health permit #</Label><Input value={form.health_permit_number ?? ''} onChange={(e) => setForm({ ...form, health_permit_number: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_listed} onChange={(e) => setForm({ ...form, is_listed: e.target.checked })} />
              List on the Kitchen Discovery network
            </label>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Public profile: <span className="font-mono text-primary">culina.app/kitchen/{kitchen.slug}</span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit">Save changes</Button>
        </div>
        <div className="lg:col-span-2"><PrivacyData /></div>
      </form>
    </div>
  );
}
