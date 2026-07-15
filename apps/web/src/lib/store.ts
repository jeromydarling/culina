import type {
  Booking,
  ComplianceDocument,
  Grant,
  Invoice,
  KitchenEquipment,
  KitchenSpace,
  Lead,
  Membership,
  Product,
  Recipe,
  TenantProfile,
  TenantSite,
  AccessCredential,
  Classified,
  CommunityPost,
  MentorRequest,
  EmailSubscriber,
  ReferralPartner,
  MarketplaceTransaction,
  WhiteLabelConfig,
  LearningResource,
  Profile,
} from '@culina/shared';
import { MARKETPLACE_COMMISSION_PERCENT } from '@culina/shared';
import { computeCogs, feeBreakdown } from '@culina/shared';
import * as seed from './mockData';
import { genId } from './utils';
import { isLive } from './config';
import { persist, removeRemote } from './dataApi';

/** Write-through to Cloudflare D1 in a LIVE session (no-op in a demo session). */
const wt = (table: string, row: unknown) => {
  if (isLive()) persist(table, row as Record<string, unknown>);
};
const wtDel = (table: string, id: string) => {
  if (isLive()) removeRemote(table, id);
};

/**
 * In-memory data store for DEMO MODE. State is seeded from mockData and mutated
 * in place so the UI behaves like a real (if non-persistent) backend.
 * When Supabase env is configured, replace these accessors with real queries.
 */
const state = {
  profiles: [...seed.profiles],
  kitchens: [...seed.kitchens],
  spaces: [...seed.spaces],
  equipment: [...seed.equipment],
  memberships: [...seed.memberships],
  tenantProfiles: [...seed.tenantProfiles],
  complianceDocuments: [...seed.complianceDocuments],
  bookings: [...seed.bookings],
  leads: [...seed.leads],
  invoices: [...seed.invoices],
  recipes: [...seed.recipes],
  products: [...seed.products],
  orders: [...seed.orders],
  grants: [...seed.grants],
  learningResources: [...seed.learningResources],
  announcements: [...seed.announcements],
  tenantSites: [...seed.tenantSites],
  notifications: [...seed.notifications],
  accessCredentials: [...seed.accessCredentials],
  accessEvents: [...seed.accessEvents],
  mentors: [...seed.mentors],
  mentorRequests: [...seed.mentorRequests],
  classifieds: [...seed.classifieds],
  communityPosts: [...seed.communityPosts],
  emailSubscribers: [...seed.emailSubscribers],
  referralPartners: [...seed.referralPartners],
  marketplaceTransactions: [...seed.marketplaceTransactions],
  whiteLabelConfigs: [...seed.whiteLabelConfigs],
};

export const IDS = seed.IDS;

/**
 * Replace in-memory collections with data fetched from D1 (LIVE mode). Only
 * the keys present in the payload are replaced, so reference data and anything
 * not returned for the current user is left intact.
 */
export function hydrate(payload: Record<string, unknown[]>) {
  for (const [key, rows] of Object.entries(payload)) {
    if (key in state && Array.isArray(rows)) {
      (state as Record<string, unknown[]>)[key] = rows as unknown[];
    }
  }
}

// ─── Profiles ─────────────────────────────────────────────────────────────
export const getProfile = (id: string) => state.profiles.find((p) => p.id === id) ?? null;
/** Every profile (super-admin only surfaces this). */
export const listProfiles = () => state.profiles;

// ─── Kitchens ─────────────────────────────────────────────────────────────
export const listKitchens = () => state.kitchens;
export const getKitchenBySlug = (slug: string) => state.kitchens.find((k) => k.slug === slug) ?? null;
export const getKitchenById = (id: string) => state.kitchens.find((k) => k.id === id) ?? null;
export const getKitchenByOperator = (operatorId: string) =>
  state.kitchens.find((k) => k.operator_id === operatorId) ?? null;
/** Ensure an operator always has a kitchen (created on first login if missing). */
export const ensureOperatorKitchen = (operatorId: string, name: string): typeof state.kitchens[number] => {
  const existing = getKitchenByOperator(operatorId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const created = {
    // Deterministic id keyed to the operator → if a prior persist failed and we
    // re-create on the next login, the upsert overwrites the same row (no dupes).
    id: `kit-${operatorId}`, operator_id: operatorId, name, slug: `kitchen-${operatorId.slice(0, 8)}`,
    description: null, address: null, city: null, state: null, zip: null, phone: null, email: null,
    website: null, logo_url: null, cover_image_url: null, amenities: [] as string[], health_permit_number: null,
    stripe_account_id: null, stripe_onboarded: false, monthly_price_cents: 4900, is_listed: false,
    created_at: now, updated_at: now,
  };
  state.kitchens.push(created);
  wt('kitchens', created);
  return created;
};
export const updateKitchen = (id: string, patch: Partial<typeof state.kitchens[number]>) => {
  const k = state.kitchens.find((x) => x.id === id);
  if (k) { Object.assign(k, patch, { updated_at: new Date().toISOString() }); wt('kitchens', k); }
  return k ?? null;
};

// ─── Spaces ───────────────────────────────────────────────────────────────
export const listSpaces = (kitchenId: string) => state.spaces.filter((s) => s.kitchen_id === kitchenId);
export const getSpace = (id: string) => state.spaces.find((s) => s.id === id) ?? null;
export const upsertSpace = (sp: Partial<KitchenSpace> & { kitchen_id: string }): KitchenSpace => {
  if (sp.id) {
    const existing = state.spaces.find((s) => s.id === sp.id);
    if (existing) {
      Object.assign(existing, sp);
      wt('kitchen_spaces', existing);
      return existing;
    }
  }
  const created: KitchenSpace = {
    id: genId('sp'),
    name: 'New Space',
    space_type: 'prep_station',
    description: null,
    hourly_rate_cents: 2500,
    daily_rate_cents: null,
    monthly_rate_cents: null,
    capacity_persons: 1,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    ...sp,
  } as KitchenSpace;
  state.spaces.push(created);
  wt('kitchen_spaces', created);
  return created;
};
export const deleteSpace = (id: string) => {
  state.spaces = state.spaces.filter((s) => s.id !== id);
  wtDel('kitchen_spaces', id);
};

// ─── Equipment ────────────────────────────────────────────────────────────
export const listEquipment = (kitchenId: string) => state.equipment.filter((e) => e.kitchen_id === kitchenId);
export const upsertEquipment = (eq: Partial<KitchenEquipment> & { kitchen_id: string }): KitchenEquipment => {
  if (eq.id) {
    const existing = state.equipment.find((e) => e.id === eq.id);
    if (existing) {
      Object.assign(existing, eq);
      wt('kitchen_equipment', existing);
      return existing;
    }
  }
  const created: KitchenEquipment = {
    id: genId('eq'),
    name: 'New Equipment',
    hourly_rate_cents: 0,
    quantity: 1,
    is_active: true,
    ...eq,
  } as KitchenEquipment;
  state.equipment.push(created);
  wt('kitchen_equipment', created);
  return created;
};
export const deleteEquipment = (id: string) => {
  state.equipment = state.equipment.filter((e) => e.id !== id);
  wtDel('kitchen_equipment', id);
};

// ─── Memberships ──────────────────────────────────────────────────────────
export const listMemberships = (kitchenId: string) =>
  state.memberships.filter((m) => m.kitchen_id === kitchenId);
export const getMembershipForTenant = (tenantId: string) =>
  state.memberships.find((m) => m.tenant_id === tenantId) ?? null;
export const updateMembership = (id: string, patch: Partial<Membership>) => {
  const m = state.memberships.find((x) => x.id === id);
  if (m) { Object.assign(m, patch, { updated_at: new Date().toISOString() }); wt('memberships', m); }
  return m ?? null;
};

// ─── Tenant profiles ──────────────────────────────────────────────────────
export const getTenantProfile = (tenantId: string) =>
  state.tenantProfiles.find((t) => t.tenant_id === tenantId) ?? null;
export const getTenantProfileBySlug = (slug: string) =>
  state.tenantProfiles.find((t) => t.business_slug === slug) ?? null;
export const updateTenantProfile = (tenantId: string, patch: Partial<TenantProfile>) => {
  const t = state.tenantProfiles.find((x) => x.tenant_id === tenantId);
  if (t) { Object.assign(t, patch, { updated_at: new Date().toISOString() }); wt('tenant_profiles', t); }
  return t ?? null;
};
/** Create a tenant_profiles row if missing (used when converting a demo to a real account). */
export const ensureTenantProfile = (tenantId: string, businessName?: string): TenantProfile => {
  const existing = state.tenantProfiles.find((t) => t.tenant_id === tenantId);
  if (existing) {
    if (businessName) updateTenantProfile(tenantId, { business_name: businessName });
    return existing;
  }
  const now = new Date().toISOString();
  const slug = (businessName ?? 'maker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + tenantId.slice(0, 4);
  const created: TenantProfile = {
    id: genId('tp'), tenant_id: tenantId, business_name: businessName ?? null, business_slug: slug,
    business_type: null, description: null, logo_url: null, banner_url: null, instagram_url: null,
    facebook_url: null, website_url: null, stripe_account_id: null, stripe_onboarded: false, ein: null,
    legal_entity_type: null, state_of_formation: null, annual_revenue_estimate: null, years_in_operation: null,
    graduation_target_date: null, created_at: now, updated_at: now,
  };
  state.tenantProfiles.push(created);
  wt('tenant_profiles', created);
  return created;
};

// ─── Compliance ───────────────────────────────────────────────────────────
export const listComplianceForKitchen = (kitchenId: string) =>
  state.complianceDocuments.filter((d) => d.kitchen_id === kitchenId);
export const listComplianceForTenant = (tenantId: string) =>
  state.complianceDocuments.filter((d) => d.tenant_id === tenantId);
export const updateComplianceDoc = (id: string, patch: Partial<ComplianceDocument>) => {
  const d = state.complianceDocuments.find((x) => x.id === id);
  if (d) { Object.assign(d, patch); wt('compliance_documents', d); }
  return d ?? null;
};
export const addComplianceDoc = (doc: Partial<ComplianceDocument> & { tenant_id: string; kitchen_id: string; doc_type: ComplianceDocument['doc_type'] }) => {
  const created: ComplianceDocument = {
    id: genId('cd'),
    membership_id: null,
    doc_name: null,
    file_url: '#',
    expiration_date: null,
    status: 'pending_review',
    reviewer_notes: null,
    uploaded_at: new Date().toISOString(),
    reviewed_at: null,
    ...doc,
  } as ComplianceDocument;
  state.complianceDocuments.push(created);
  wt('compliance_documents', created);
  return created;
};

// ─── Bookings ─────────────────────────────────────────────────────────────
export const listBookings = (filter?: { kitchenId?: string; tenantId?: string }) =>
  state.bookings.filter(
    (b) =>
      (!filter?.kitchenId || b.kitchen_id === filter.kitchenId) &&
      (!filter?.tenantId || b.tenant_id === filter.tenantId),
  );
export const createBooking = (input: {
  kitchen_id: string;
  space_id: string;
  tenant_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
  equipment_ids?: string[];
}): Booking => {
  const space = state.spaces.find((s) => s.id === input.space_id);
  const hours = Math.max(1, (new Date(input.end_time).getTime() - new Date(input.start_time).getTime()) / 3.6e6);
  const equipmentRate = (input.equipment_ids ?? []).reduce((sum, id) => {
    const eq = state.equipment.find((e) => e.id === id);
    return sum + (eq?.hourly_rate_cents ?? 0);
  }, 0);
  const subtotal = Math.round(((space?.hourly_rate_cents ?? 0) + equipmentRate) * hours);
  const fb = feeBreakdown(subtotal);
  const booking: Booking = {
    id: genId('bk'),
    kitchen_id: input.kitchen_id,
    space_id: input.space_id,
    tenant_id: input.tenant_id,
    membership_id: getMembershipForTenant(input.tenant_id)?.id ?? null,
    start_time: input.start_time,
    end_time: input.end_time,
    status: 'confirmed',
    booking_type: 'hourly',
    subtotal_cents: fb.subtotalCents,
    platform_fee_cents: fb.platformFeeCents,
    total_cents: fb.totalCents,
    stripe_payment_intent_id: 'pi_demo',
    stripe_charge_id: null,
    notes: input.notes ?? null,
    equipment_ids: input.equipment_ids ?? [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.bookings.push(booking);
  // NOTE: live bookings are created via the validated /api/data/bookings
  // endpoint (conflict + compliance + money checks), not generic write-through.
  return booking;
};
/** Insert a server-created booking into the in-memory store (no write-through). */
export const addBookingLocal = (b: Booking) => {
  state.bookings.push(b);
};

/** Replay work captured from a demo session into a freshly created real account. */
export const applyDemoCarry = (
  role: string,
  ownerId: string,
  carry: { recipes?: Recipe[]; products?: Product[]; site?: TenantSite | null; spaces?: KitchenSpace[]; equipment?: KitchenEquipment[] } | undefined,
) => {
  if (!carry) return;
  if (role === 'tenant') {
    (carry.recipes ?? []).forEach(({ id: _i, ...rest }) => upsertRecipe({ ...rest, tenant_id: ownerId }));
    (carry.products ?? []).forEach(({ id: _i, ...rest }) => upsertProduct({ ...rest, tenant_id: ownerId }));
    if (carry.site) {
      const { id: _i, ...rest } = carry.site;
      const slug = `${carry.site.site_slug || 'shop'}-${ownerId.slice(0, 4)}`;
      upsertTenantSite({ ...rest, tenant_id: ownerId, site_slug: slug });
    }
  } else if (role === 'operator') {
    const k = getKitchenByOperator(ownerId);
    if (!k) return;
    (carry.spaces ?? []).forEach(({ id: _i, ...rest }) => upsertSpace({ ...rest, kitchen_id: k.id }));
    (carry.equipment ?? []).forEach(({ id: _i, ...rest }) => upsertEquipment({ ...rest, kitchen_id: k.id }));
  }
};

export const updateBooking = (id: string, patch: Partial<Booking>) => {
  const b = state.bookings.find((x) => x.id === id);
  // Persistence is handled by callers via dataApi.updateBooking (validated
  // endpoint); here we only update the in-memory view.
  if (b) Object.assign(b, patch, { updated_at: new Date().toISOString() });
  return b ?? null;
};

// ─── Leads ────────────────────────────────────────────────────────────────
export const listLeads = (kitchenId: string) => state.leads.filter((l) => l.kitchen_id === kitchenId);
export const updateLead = (id: string, patch: Partial<Lead>) => {
  const l = state.leads.find((x) => x.id === id);
  if (l) { Object.assign(l, patch, { updated_at: new Date().toISOString() }); wt('leads', l); }
  return l ?? null;
};
export const createLead = (input: Partial<Lead> & { kitchen_id: string; full_name: string; email: string }) => {
  const created: Lead = {
    id: genId('ld'),
    phone: null,
    business_name: null,
    business_type: null,
    message: null,
    source: 'website',
    status: 'new',
    notes: null,
    follow_up_date: null,
    assigned_to: null,
    converted_membership_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...input,
  } as Lead;
  state.leads.unshift(created);
  wt('leads', created);
  return created;
};

// ─── Invoices ─────────────────────────────────────────────────────────────
export const listInvoices = (kitchenId: string) => state.invoices.filter((i) => i.kitchen_id === kitchenId);
export const listInvoicesForTenant = (tenantId: string) =>
  state.invoices.filter((i) => i.tenant_id === tenantId);
export const getInvoice = (id: string) => state.invoices.find((i) => i.id === id) ?? null;
export const updateInvoice = (id: string, patch: Partial<Invoice>) => {
  const i = state.invoices.find((x) => x.id === id);
  if (i) { Object.assign(i, patch); wt('invoices', i); }
  return i ?? null;
};
export const createInvoice = (input: Omit<Invoice, 'id' | 'invoice_number' | 'created_at'>) => {
  const num = `INV-2026-${String(state.invoices.length + 1).padStart(4, '0')}`;
  const created: Invoice = { id: genId('inv'), invoice_number: num, created_at: new Date().toISOString(), ...input };
  state.invoices.push(created);
  wt('invoices', created);
  return created;
};

// ─── Recipes ──────────────────────────────────────────────────────────────
export const listRecipes = (tenantId: string) => state.recipes.filter((r) => r.tenant_id === tenantId);
export const getRecipe = (id: string) => state.recipes.find((r) => r.id === id) ?? null;
export const upsertRecipe = (recipe: Partial<Recipe> & { tenant_id: string; name: string }): Recipe => {
  const cogs = computeCogs({
    ingredients: recipe.ingredients ?? [],
    laborMinutes: recipe.labor_minutes ?? 0,
    laborHourlyRateCents: recipe.labor_hourly_rate_cents ?? 0,
    overheadPercent: recipe.overhead_percent ?? 15,
    targetMarginPercent: recipe.target_margin_percent ?? 35,
    yieldQuantity: recipe.yield_quantity ?? 1,
  });
  const computed = {
    cogs_cents: cogs.cogsPerUnitCents,
    gross_margin_percent: cogs.grossMarginPercent,
    selling_price_cents: recipe.selling_price_cents ?? cogs.suggestedPriceCents,
  };
  if (recipe.id) {
    const existing = state.recipes.find((r) => r.id === recipe.id);
    if (existing) {
      Object.assign(existing, recipe, computed, { updated_at: new Date().toISOString() });
      wt('recipes', existing);
      return existing;
    }
  }
  const created: Recipe = {
    id: genId('rc'),
    description: null,
    yield_quantity: 1,
    yield_unit: 'units',
    prep_time_minutes: null,
    cook_time_minutes: null,
    instructions: null,
    ingredients: [],
    labor_minutes: null,
    labor_hourly_rate_cents: 2000,
    overhead_percent: 15,
    target_margin_percent: 35,
    is_published: false,
    tags: [],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...recipe,
    ...computed,
  } as Recipe;
  state.recipes.push(created);
  wt('recipes', created);
  return created;
};
export const deleteRecipe = (id: string) => {
  state.recipes = state.recipes.filter((r) => r.id !== id);
  wtDel('recipes', id);
};

// ─── Products ─────────────────────────────────────────────────────────────
export const listProducts = (tenantId: string) => state.products.filter((p) => p.tenant_id === tenantId);
export const listPublicProducts = (tenantId: string) =>
  state.products.filter((p) => p.tenant_id === tenantId && p.is_active);
export const upsertProduct = (product: Partial<Product> & { tenant_id: string; name: string; price_cents: number }): Product => {
  if (product.id) {
    const existing = state.products.find((p) => p.id === product.id);
    if (existing) {
      Object.assign(existing, product, { updated_at: new Date().toISOString() });
      wt('products', existing);
      return existing;
    }
  }
  const created: Product = {
    id: genId('pr'),
    recipe_id: null,
    description: null,
    compare_at_price_cents: null,
    sku: null,
    category: null,
    tags: [],
    images: [],
    inventory_count: null,
    track_inventory: false,
    is_active: true,
    is_subscription_eligible: false,
    subscription_interval: null,
    stripe_product_id: null,
    stripe_price_id: null,
    allergens: [],
    ingredients_label: null,
    net_weight: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...product,
  } as Product;
  state.products.push(created);
  wt('products', created);
  return created;
};
export const deleteProduct = (id: string) => {
  state.products = state.products.filter((p) => p.id !== id);
  wtDel('products', id);
};

// ─── Orders ───────────────────────────────────────────────────────────────
export const listOrders = (tenantId: string) => state.orders.filter((o) => o.tenant_id === tenantId);

// ─── Grants ───────────────────────────────────────────────────────────────
export const listGrants = () => state.grants;
export const upsertGrant = (grant: Partial<Grant> & { title: string }): Grant => {
  if (grant.id) {
    const existing = state.grants.find((g) => g.id === grant.id);
    if (existing) {
      Object.assign(existing, grant);
      return existing;
    }
  }
  const created: Grant = {
    id: genId('gr'),
    description: null,
    funder: null,
    grant_type: 'foundation',
    amount_min: null,
    amount_max: null,
    eligibility_criteria: null,
    application_url: null,
    deadline: null,
    is_recurring: false,
    target_states: null,
    target_business_types: null,
    is_active: true,
    added_by: IDS.admin,
    created_at: new Date().toISOString(),
    ...grant,
  } as Grant;
  state.grants.push(created);
  return created;
};
export const deleteGrant = (id: string) => {
  state.grants = state.grants.filter((g) => g.id !== id);
};

// ─── Learning ─────────────────────────────────────────────────────────────
export const listLearning = () => state.learningResources;
export const upsertLearning = (resource: Partial<LearningResource> & { title: string }): LearningResource => {
  if (resource.id) {
    const existing = state.learningResources.find((r) => r.id === resource.id);
    if (existing) {
      Object.assign(existing, resource);
      wt('learning_resources', existing);
      return existing;
    }
  }
  const created: LearningResource = {
    id: genId('lr'),
    description: null,
    content_type: 'article',
    category: 'business_formation',
    content_url: null,
    content_body: null,
    duration_minutes: null,
    is_free: true,
    tags: [],
    created_at: new Date().toISOString(),
    ...resource,
  } as LearningResource;
  state.learningResources.push(created);
  wt('learning_resources', created);
  return created;
};

// ─── Announcements ────────────────────────────────────────────────────────
export const listAnnouncements = (kitchenId: string) =>
  state.announcements.filter((a) => a.kitchen_id === kitchenId);
export const createAnnouncement = (input: { kitchen_id: string; author_id: string; title: string; body: string; is_pinned?: boolean }) => {
  const created = {
    id: genId('an'),
    audience: 'all' as const,
    is_pinned: false,
    created_at: new Date().toISOString(),
    ...input,
  };
  state.announcements.unshift(created);
  wt('announcements', created);
  return created;
};

// ─── Tenant sites ─────────────────────────────────────────────────────────
export const getTenantSite = (tenantId: string) =>
  state.tenantSites.find((s) => s.tenant_id === tenantId) ?? null;
export const getTenantSiteBySlug = (slug: string) =>
  state.tenantSites.find((s) => s.site_slug === slug) ?? null;
export const upsertTenantSite = (site: Partial<TenantSite> & { tenant_id: string; site_slug: string }): TenantSite => {
  const existing = state.tenantSites.find((s) => s.tenant_id === site.tenant_id);
  if (existing) {
    Object.assign(existing, site, { updated_at: new Date().toISOString() });
    wt('tenant_sites', existing);
    return existing;
  }
  const created: TenantSite = {
    id: genId('ts'),
    theme: 'warm_artisan',
    hero_headline: null,
    hero_subheadline: null,
    hero_image_url: null,
    about_text: null,
    color_primary: '#2D4A3E',
    color_secondary: '#F5E6C8',
    font_heading: 'Playfair Display',
    font_body: 'Inter',
    show_products: true,
    show_about: true,
    show_contact: true,
    show_social: true,
    custom_domain: null,
    is_published: false,
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...site,
  } as TenantSite;
  state.tenantSites.push(created);
  wt('tenant_sites', created);
  return created;
};

// ─── Notifications ────────────────────────────────────────────────────────
export const listNotifications = (userId: string) =>
  state.notifications.filter((n) => n.user_id === userId);
export const markNotificationRead = (id: string) => {
  const n = state.notifications.find((x) => x.id === id);
  if (n) { n.is_read = true; wt('notifications', n); }
};

// ─── Access control (Tier 1) ───────────────────────────────────────────────
export const listAccessCredentials = (kitchenId: string) =>
  state.accessCredentials.filter((c) => c.kitchen_id === kitchenId);
export const listAccessCredentialsForTenant = (tenantId: string) =>
  state.accessCredentials.filter((c) => c.tenant_id === tenantId);
export const listAccessEvents = (kitchenId: string) =>
  [...state.accessEvents].filter((e) => e.kitchen_id === kitchenId).reverse();
export const upsertAccessCredential = (c: Partial<AccessCredential> & { kitchen_id: string; lock_name: string }) => {
  if (c.id) {
    const existing = state.accessCredentials.find((x) => x.id === c.id);
    if (existing) { Object.assign(existing, c); wt('access_credentials', existing); return existing; }
  }
  const created: AccessCredential = {
    id: genId('ac'), tenant_id: null, provider: 'SmartLock (Kisi)',
    code: String(Math.floor(1000 + Math.random() * 9000)), status: 'active',
    schedule: '24/7', last_used: null, created_at: new Date().toISOString(), ...c,
  } as AccessCredential;
  state.accessCredentials.push(created);
  wt('access_credentials', created);
  return created;
};
export const revokeAccessCredential = (id: string) => {
  const c = state.accessCredentials.find((x) => x.id === id);
  if (c) { c.status = 'revoked'; wt('access_credentials', c); }
};

// ─── Mentors (Tier 2) ───────────────────────────────────────────────────────
export const listMentors = () => state.mentors;
export const listMentorRequests = (tenantId: string) =>
  state.mentorRequests.filter((r) => r.tenant_id === tenantId);
export const requestMentor = (tenantId: string, mentorId: string, message: string): MentorRequest => {
  const created: MentorRequest = {
    id: genId('mr'), tenant_id: tenantId, mentor_id: mentorId, status: 'requested',
    message, created_at: new Date().toISOString(),
  };
  state.mentorRequests.unshift(created);
  wt('mentor_requests', created);
  return created;
};

// ─── Email subscribers (Tier 2) ─────────────────────────────────────────────
export const listEmailSubscribers = (tenantId: string) =>
  state.emailSubscribers.filter((s) => s.tenant_id === tenantId);
export const addEmailSubscriber = (tenantId: string, email: string, name?: string): EmailSubscriber => {
  const created: EmailSubscriber = {
    id: genId('es'), tenant_id: tenantId, email, name: name ?? null, source: 'manual',
    created_at: new Date().toISOString(),
  };
  state.emailSubscribers.unshift(created);
  wt('email_subscribers', created);
  return created;
};

// ─── Classifieds / community (Tier 3) ───────────────────────────────────────
export const listClassifieds = (kitchenId: string) =>
  [...state.classifieds].filter((c) => c.kitchen_id === kitchenId && c.status === 'active');
export const createClassified = (c: Partial<Classified> & { kitchen_id: string; author_tenant_id: string; title: string }): Classified => {
  const created: Classified = {
    id: genId('cl'), kind: 'other', listing_type: 'offer', description: null, price_cents: null,
    status: 'active', created_at: new Date().toISOString(), ...c,
  } as Classified;
  state.classifieds.unshift(created);
  wt('classifieds', created);
  return created;
};
export const closeClassified = (id: string) => {
  const c = state.classifieds.find((x) => x.id === id);
  if (c) { c.status = 'closed'; wt('classifieds', c); }
};
export const listCommunityPosts = (kitchenId: string) =>
  [...state.communityPosts].filter((p) => p.kitchen_id === kitchenId).reverse();
export const createCommunityPost = (p: { kitchen_id: string; author_id: string; author_name: string; body: string; kind?: CommunityPost['kind'] }): CommunityPost => {
  const created: CommunityPost = {
    id: genId('cp'), kind: 'post', created_at: new Date().toISOString(), ...p,
  } as CommunityPost;
  state.communityPosts.push(created);
  wt('community_posts', created);
  return created;
};

// ─── Revenue model ──────────────────────────────────────────────────────
export const listReferralPartners = () => state.referralPartners;
export const listMarketplaceTransactions = (kitchenId?: string) =>
  state.marketplaceTransactions.filter((t) => !kitchenId || t.kitchen_id === kitchenId);
export const listWhiteLabelConfigs = () => state.whiteLabelConfigs;
export const upsertWhiteLabelConfig = (c: Partial<WhiteLabelConfig> & { org_name: string; brand_name: string }): WhiteLabelConfig => {
  if (c.id) {
    const existing = state.whiteLabelConfigs.find((x) => x.id === c.id);
    if (existing) { Object.assign(existing, c); wt('white_label_configs', existing); return existing; }
  }
  const created: WhiteLabelConfig = {
    id: genId('wl'), primary_color: '#2D4A3E', logo_url: null, custom_domain: null,
    plan: 'pilot', is_active: true, created_at: new Date().toISOString(), ...c,
  } as WhiteLabelConfig;
  state.whiteLabelConfigs.push(created);
  wt('white_label_configs', created);
  return created;
};

// ─── Integrations (outbound webhook) ─────────────────────────────────────
/**
 * Save (or replace) the kitchen's outbound webhook. Deterministic id keyed to
 * the kitchen so re-saving updates the same integrations row (0001 schema:
 * owner_id holds the kitchen id; the URL lives in the metadata JSON column).
 */
export const setKitchenWebhook = (kitchenId: string, url: string) => {
  const row = {
    id: `intg-webhook-${kitchenId}`,
    owner_id: kitchenId,
    provider: 'webhook',
    connected: true,
    metadata: { url },
    created_at: new Date().toISOString(),
  };
  wt('integrations', row);
  return row;
};

/** Record a peer-to-peer marketplace sale and take Culina's commission. */
export const sellClassified = (id: string): MarketplaceTransaction | null => {
  const c = state.classifieds.find((x) => x.id === id);
  if (!c) return null;
  c.status = 'closed';
  const amount = c.price_cents ?? 0;
  const tx: MarketplaceTransaction = {
    id: genId('mt'),
    kitchen_id: c.kitchen_id,
    classified_id: c.id,
    description: c.title,
    amount_cents: amount,
    commission_cents: Math.round(amount * (MARKETPLACE_COMMISSION_PERCENT / 100)),
    created_at: new Date().toISOString(),
  };
  state.marketplaceTransactions.unshift(tx);
  wt('classifieds', c);
  wt('marketplace_transactions', tx);
  return tx;
};

// ─── Tenant import (operator onboarding) ────────────────────────────────
export interface ImportTenantRow {
  business_name: string;
  full_name?: string;
  email: string;
  business_type?: string;
  plan?: string;
  status?: string;
}

/** Bulk-create tenants (profiles + tenant_profiles + memberships) from an import. */
export const importTenants = (kitchenId: string, rows: ImportTenantRow[]): number => {
  let created = 0;
  for (const row of rows) {
    if (!row.email) continue;
    if (state.profiles.some((p) => p.email.toLowerCase() === row.email.toLowerCase())) continue;
    const id = genId('imp');
    const now = new Date().toISOString();
    const profile: Profile = {
      id, email: row.email, full_name: row.full_name ?? row.business_name ?? row.email,
      role: 'tenant', avatar_url: null, phone: null, created_at: now,
    };
    state.profiles.push(profile);
    state.tenantProfiles.push({
      id: genId('tp'), tenant_id: id, business_name: row.business_name ?? row.full_name ?? row.email,
      business_slug: (row.business_name ?? 'maker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-4),
      business_type: row.business_type ?? null, description: null, logo_url: null, banner_url: null,
      instagram_url: null, facebook_url: null, website_url: null, stripe_account_id: null, stripe_onboarded: false,
      ein: null, legal_entity_type: null, state_of_formation: null, annual_revenue_estimate: null,
      years_in_operation: null, graduation_target_date: null, created_at: now, updated_at: now,
    });
    const membershipType = (row.plan ?? '').toLowerCase().includes('month') ? 'monthly' : 'hourly';
    const status = (['active', 'pending', 'suspended', 'graduated'] as const).find((s) => s === (row.status ?? '').toLowerCase()) ?? 'active';
    state.memberships.push({
      id: genId('m'), kitchen_id: kitchenId, tenant_id: id, status, membership_type: membershipType as 'monthly' | 'hourly',
      monthly_hours_included: membershipType === 'monthly' ? 40 : null, hourly_overage_rate_cents: null,
      start_date: now.slice(0, 10), end_date: null, stripe_subscription_id: null,
      notes: 'Imported during onboarding.', created_at: now, updated_at: now,
    });
    created += 1;
  }
  return created;
};
