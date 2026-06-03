import * as React from 'react';
import { useForceUpdate } from '@/lib/hooks';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink, Store } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SmartImage } from '@/components/SmartImage';
import { AiImageButton } from '@/components/AiImageButton';
import { listProducts, upsertProduct, deleteProduct, listRecipes, getTenantProfile } from '@/lib/store';
import { formatCents } from '@culina/shared';
import type { Product } from '@culina/shared';

export default function Products() {
  const { profile } = useAuth();
  const tp = getTenantProfile(profile!.id);
  const force = useForceUpdate();
  const products = listProducts(profile!.id);
  const recipes = listRecipes(profile!.id);
  const [editing, setEditing] = React.useState<Partial<Product> | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    upsertProduct({ ...(editing as Product), tenant_id: profile!.id });
    setEditing(null);
    force();
    toast.success('Product saved');
  }

  return (
    <div>
      <PageHeader
        title="Products & Storefront"
        description="Manage what you sell and where it lives online."
        action={
          <>
            <Link to="/tenant/storefront"><Button variant="outline"><Store className="h-4 w-4" /> Storefront editor</Button></Link>
            {tp?.business_slug && <Link to={`/shop/${tp.business_slug}`} target="_blank"><Button variant="outline"><ExternalLink className="h-4 w-4" /> View shop</Button></Link>}
            <Button onClick={() => setEditing({ price_cents: 0, is_active: true, allergens: [], images: [], tags: [] })}><Plus className="h-4 w-4" /> Add product</Button>
          </>
        }
      />

      {products.length === 0 ? (
        <EmptyState icon={Store} title="No products yet" description="Add your first product to start selling online." action={<Button onClick={() => setEditing({ price_cents: 0, is_active: true })}>Add product</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border bg-card shadow-card">
              <div className="h-36 overflow-hidden"><SmartImage src={p.images[0]} alt={p.name} emoji="🥖" gradient="from-amber-600 via-orange-500 to-yellow-400" className="h-full w-full" /></div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{p.name}</h3>
                  {!p.is_active && <Badge variant="muted">Hidden</Badge>}
                </div>
                <div className="mt-1 text-sm font-semibold text-primary">{formatCents(p.price_cents)}</div>
                {p.track_inventory && <div className="mt-1 text-xs text-muted-foreground">{p.inventory_count} in stock</div>}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { deleteProduct(p.id); force(); toast.success('Deleted'); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit product' : 'Add product'}>
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Product image</Label>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
                  <SmartImage src={editing.images?.[0]} alt={editing.name ?? 'Product'} emoji="🥖" gradient="from-amber-600 to-yellow-400" className="h-full w-full" />
                </div>
                <AiImageButton
                  prompt={`${editing.name ?? ''} ${editing.description ?? ''}`.trim()}
                  style="product"
                  label="Generate with Flux"
                  onGenerated={(url) => setEditing({ ...editing, images: [url, ...(editing.images ?? []).slice(1)] })}
                />
              </div>
            </div>
            <div><Label>Name</Label><Input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Price ($)</Label><Input type="number" step="0.01" value={(editing.price_cents ?? 0) / 100} onChange={(e) => setEditing({ ...editing, price_cents: Math.round(Number(e.target.value) * 100) })} /></div>
              <div><Label>Inventory</Label><Input type="number" value={editing.inventory_count ?? 0} onChange={(e) => setEditing({ ...editing, inventory_count: Number(e.target.value), track_inventory: true })} /></div>
            </div>
            {recipes.length > 0 && (
              <div>
                <Label>Link a recipe (cost data)</Label>
                <Select value={editing.recipe_id ?? ''} onChange={(e) => setEditing({ ...editing, recipe_id: e.target.value || null })}>
                  <option value="">None</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Visible on storefront</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_subscription_eligible ?? false} onChange={(e) => setEditing({ ...editing, is_subscription_eligible: e.target.checked, subscription_interval: 'weekly' })} /> Offer “Subscribe & Save”</label>
            <Button type="submit" className="w-full">Save product</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
