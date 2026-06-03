import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { getTenantProfile, updateTenantProfile } from '@/lib/store';
import { PrivacyData } from '@/components/PrivacyData';

export default function Settings() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id)!;
  const [form, setForm] = React.useState({ ...tp });

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateTenantProfile(profile!.id, form);
    toast.success('Profile saved');
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your business profile and graduation goals." />
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Business name</Label><Input value={form.business_name ?? ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>Storefront slug</Label><Input value={form.business_slug ?? ''} onChange={(e) => setForm({ ...form, business_slug: e.target.value })} /></div>
            <div><Label>Type</Label><Input value={form.business_type ?? ''} onChange={(e) => setForm({ ...form, business_type: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Entity type</Label><Input value={form.legal_entity_type ?? ''} onChange={(e) => setForm({ ...form, legal_entity_type: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state_of_formation ?? ''} onChange={(e) => setForm({ ...form, state_of_formation: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Years operating</Label><Input type="number" value={form.years_in_operation ?? 0} onChange={(e) => setForm({ ...form, years_in_operation: Number(e.target.value) })} /></div>
              <div><Label>Annual revenue est. ($)</Label><Input type="number" value={form.annual_revenue_estimate ?? 0} onChange={(e) => setForm({ ...form, annual_revenue_estimate: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Graduation target date</Label><Input type="date" value={form.graduation_target_date ?? ''} onChange={(e) => setForm({ ...form, graduation_target_date: e.target.value })} /></div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2"><Button type="submit">Save changes</Button></div>
        <div className="lg:col-span-2"><PrivacyData /></div>
      </form>
    </div>
  );
}
