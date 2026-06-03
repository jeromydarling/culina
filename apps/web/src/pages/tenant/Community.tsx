import * as React from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus, Plus, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useForceUpdate } from '@/lib/hooks';
import { PageHeader, Tabs, EmptyState } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input, Label, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getMembershipForTenant,
  getTenantProfile,
  listCommunityPosts,
  createCommunityPost,
  listClassifieds,
  createClassified,
  closeClassified,
  sellClassified,
} from '@/lib/store';
import { formatCents, MARKETPLACE_COMMISSION_PERCENT } from '@culina/shared';
import type { Classified } from '@culina/shared';
import { formatDistanceToNow } from 'date-fns';

const kindLabel: Record<Classified['kind'], string> = {
  ingredient: 'Ingredients',
  packaging: 'Packaging',
  equipment_time: 'Equipment time',
  collab: 'Collaboration',
  other: 'Other',
};

export default function Community() {
  const { profile } = useAuth();
  const membership = getMembershipForTenant(profile!.id);
  const kitchenId = membership?.kitchen_id ?? '';
  const tp = getTenantProfile(profile!.id);
  const force = useForceUpdate();
  const [tab, setTab] = React.useState('feed');
  const [postOpen, setPostOpen] = React.useState(false);
  const [listOpen, setListOpen] = React.useState(false);
  const [post, setPost] = React.useState('');
  const [listing, setListing] = React.useState<{ title: string; description: string; kind: Classified['kind']; listing_type: Classified['listing_type']; price: string }>({ title: '', description: '', kind: 'ingredient', listing_type: 'offer', price: '' });

  const posts = listCommunityPosts(kitchenId);
  const classifieds = listClassifieds(kitchenId);

  function submitPost(e: React.FormEvent) {
    e.preventDefault();
    createCommunityPost({ kitchen_id: kitchenId, author_id: profile!.id, author_name: tp?.business_name ?? profile!.full_name ?? 'Maker', body: post });
    setPost('');
    setPostOpen(false);
    force();
    toast.success('Posted to the community');
  }

  function submitListing(e: React.FormEvent) {
    e.preventDefault();
    createClassified({
      kitchen_id: kitchenId,
      author_tenant_id: profile!.id,
      title: listing.title,
      description: listing.description || null,
      kind: listing.kind,
      listing_type: listing.listing_type,
      price_cents: listing.price ? Math.round(Number(listing.price) * 100) : null,
    });
    setListing({ title: '', description: '', kind: 'ingredient', listing_type: 'offer', price: '' });
    setListOpen(false);
    force();
    toast.success('Listing posted');
  }

  return (
    <div>
      <PageHeader
        title="Community"
        description="Your kitchen's feed and a peer-to-peer marketplace for surplus ingredients, packaging, equipment time, and collaborations."
        action={
          tab === 'feed'
            ? <Button onClick={() => setPostOpen(true)}><MessageSquarePlus className="h-4 w-4" /> New post</Button>
            : <Button onClick={() => setListOpen(true)}><Plus className="h-4 w-4" /> New listing</Button>
        }
      />

      <Tabs tabs={[{ id: 'feed', label: 'Community feed' }, { id: 'market', label: `Marketplace (${classifieds.length})` }]} active={tab} onChange={setTab} />

      {tab === 'feed' && (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.author_name}</span>
                <div className="flex items-center gap-2">
                  {p.kind !== 'post' && <Badge variant={p.kind === 'spotlight' ? 'success' : 'accent'}>{p.kind}</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <p className="mt-2 text-sm">{p.body}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'market' && (
        classifieds.length === 0 ? (
          <EmptyState icon={Tag} title="No listings yet" description="Post surplus ingredients, packaging, or split equipment time with your kitchen-mates." action={<Button onClick={() => setListOpen(true)}>Post a listing</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classifieds.map((c) => {
              const mine = c.author_tenant_id === profile!.id;
              const author = getTenantProfile(c.author_tenant_id ?? '');
              return (
                <div key={c.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <Badge variant={c.listing_type === 'offer' ? 'success' : 'warning'}>{c.listing_type === 'offer' ? 'Offering' : 'Wanted'}</Badge>
                    <Badge variant="muted">{kindLabel[c.kind]}</Badge>
                  </div>
                  <h3 className="mt-2 font-heading font-semibold">{c.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">{c.price_cents != null ? formatCents(c.price_cents) : 'Free / split'}</span>
                    <span className="text-xs text-muted-foreground">{author?.business_name ?? 'Maker'}</span>
                  </div>
                  {mine ? (
                    c.listing_type === 'offer' && c.price_cents ? (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => { const tx = sellClassified(c.id); force(); toast.success(`Sold! Culina fee ${formatCents(tx?.commission_cents ?? 0)} (${MARKETPLACE_COMMISSION_PERCENT}%)`); }}>Mark sold ({MARKETPLACE_COMMISSION_PERCENT}% fee)</Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="mt-3" onClick={() => { closeClassified(c.id); force(); toast.success('Listing closed'); }}>Close listing</Button>
                    )
                  ) : (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => toast.success('Message sent to the maker (demo)')}>Contact maker</Button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      <Modal open={postOpen} onClose={() => setPostOpen(false)} title="New community post">
        <form onSubmit={submitPost} className="space-y-3">
          <Textarea required rows={4} value={post} onChange={(e) => setPost(e.target.value)} placeholder="Share a win, ask a question, or post an update…" />
          <Button type="submit" className="w-full">Post</Button>
        </form>
      </Modal>

      <Modal open={listOpen} onClose={() => setListOpen(false)} title="New marketplace listing">
        <form onSubmit={submitListing} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select value={listing.listing_type} onChange={(e) => setListing({ ...listing, listing_type: e.target.value as Classified['listing_type'] })}>
                <option value="offer">Offering</option>
                <option value="request">Wanted</option>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={listing.kind} onChange={(e) => setListing({ ...listing, kind: e.target.value as Classified['kind'] })}>
                <option value="ingredient">Ingredients</option>
                <option value="packaging">Packaging</option>
                <option value="equipment_time">Equipment time</option>
                <option value="collab">Collaboration</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </div>
          <div><Label>Title</Label><Input required value={listing.title} onChange={(e) => setListing({ ...listing, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={listing.description} onChange={(e) => setListing({ ...listing, description: e.target.value })} /></div>
          <div><Label>Price ($, optional)</Label><Input type="number" step="0.01" value={listing.price} onChange={(e) => setListing({ ...listing, price: e.target.value })} placeholder="Leave blank for free / split" /></div>
          <Button type="submit" className="w-full">Post listing</Button>
        </form>
      </Modal>
    </div>
  );
}
