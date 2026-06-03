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
} from '@culina/shared';
import { computeCogs, feeBreakdown } from '@culina/shared';
import * as seed from './mockData';
import { genId } from './utils';

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
};

export const IDS = seed.IDS;

// ─── Profiles ─────────────────────────────────────────────────────────────
export const getProfile = (id: string) => state.profiles.find((p) => p.id === id) ?? null;

// ─── Kitchens ─────────────────────────────────────────────────────────────
export const listKitchens = () => state.kitchens;
export const getKitchenBySlug = (slug: string) => state.kitchens.find((k) => k.slug === slug) ?? null;
export const getKitchenByOperator = (operatorId: string) =>
  state.kitchens.find((k) => k.operator_id === operatorId) ?? null;
export const updateKitchen = (id: string, patch: Partial<typeof state.kitchens[number]>) => {
  const k = state.kitchens.find((x) => x.id === id);
  if (k) Object.assign(k, patch, { updated_at: new Date().toISOString() });
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
  return created;
};
export const deleteSpace = (id: string) => {
  state.spaces = state.spaces.filter((s) => s.id !== id);
};

// ─── Equipment ────────────────────────────────────────────────────────────
export const listEquipment = (kitchenId: string) => state.equipment.filter((e) => e.kitchen_id === kitchenId);
export const upsertEquipment = (eq: Partial<KitchenEquipment> & { kitchen_id: string }): KitchenEquipment => {
  if (eq.id) {
    const existing = state.equipment.find((e) => e.id === eq.id);
    if (existing) {
      Object.assign(existing, eq);
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
  return created;
};
export const deleteEquipment = (id: string) => {
  state.equipment = state.equipment.filter((e) => e.id !== id);
};

// ─── Memberships ──────────────────────────────────────────────────────────
export const listMemberships = (kitchenId: string) =>
  state.memberships.filter((m) => m.kitchen_id === kitchenId);
export const getMembershipForTenant = (tenantId: string) =>
  state.memberships.find((m) => m.tenant_id === tenantId) ?? null;
export const updateMembership = (id: string, patch: Partial<Membership>) => {
  const m = state.memberships.find((x) => x.id === id);
  if (m) Object.assign(m, patch, { updated_at: new Date().toISOString() });
  return m ?? null;
};

// ─── Tenant profiles ──────────────────────────────────────────────────────
export const getTenantProfile = (tenantId: string) =>
  state.tenantProfiles.find((t) => t.tenant_id === tenantId) ?? null;
export const getTenantProfileBySlug = (slug: string) =>
  state.tenantProfiles.find((t) => t.business_slug === slug) ?? null;
export const updateTenantProfile = (tenantId: string, patch: Partial<TenantProfile>) => {
  const t = state.tenantProfiles.find((x) => x.tenant_id === tenantId);
  if (t) Object.assign(t, patch, { updated_at: new Date().toISOString() });
  return t ?? null;
};

// ─── Compliance ───────────────────────────────────────────────────────────
export const listComplianceForKitchen = (kitchenId: string) =>
  state.complianceDocuments.filter((d) => d.kitchen_id === kitchenId);
export const listComplianceForTenant = (tenantId: string) =>
  state.complianceDocuments.filter((d) => d.tenant_id === tenantId);
export const updateComplianceDoc = (id: string, patch: Partial<ComplianceDocument>) => {
  const d = state.complianceDocuments.find((x) => x.id === id);
  if (d) Object.assign(d, patch);
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
  return booking;
};
export const updateBooking = (id: string, patch: Partial<Booking>) => {
  const b = state.bookings.find((x) => x.id === id);
  if (b) Object.assign(b, patch, { updated_at: new Date().toISOString() });
  return b ?? null;
};

// ─── Leads ────────────────────────────────────────────────────────────────
export const listLeads = (kitchenId: string) => state.leads.filter((l) => l.kitchen_id === kitchenId);
export const updateLead = (id: string, patch: Partial<Lead>) => {
  const l = state.leads.find((x) => x.id === id);
  if (l) Object.assign(l, patch, { updated_at: new Date().toISOString() });
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
  return created;
};

// ─── Invoices ─────────────────────────────────────────────────────────────
export const listInvoices = (kitchenId: string) => state.invoices.filter((i) => i.kitchen_id === kitchenId);
export const listInvoicesForTenant = (tenantId: string) =>
  state.invoices.filter((i) => i.tenant_id === tenantId);
export const getInvoice = (id: string) => state.invoices.find((i) => i.id === id) ?? null;
export const updateInvoice = (id: string, patch: Partial<Invoice>) => {
  const i = state.invoices.find((x) => x.id === id);
  if (i) Object.assign(i, patch);
  return i ?? null;
};
export const createInvoice = (input: Omit<Invoice, 'id' | 'invoice_number' | 'created_at'>) => {
  const num = `INV-2026-${String(state.invoices.length + 1).padStart(4, '0')}`;
  const created: Invoice = { id: genId('inv'), invoice_number: num, created_at: new Date().toISOString(), ...input };
  state.invoices.push(created);
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
  return created;
};
export const deleteRecipe = (id: string) => {
  state.recipes = state.recipes.filter((r) => r.id !== id);
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
  return created;
};
export const deleteProduct = (id: string) => {
  state.products = state.products.filter((p) => p.id !== id);
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
  return created;
};

// ─── Notifications ────────────────────────────────────────────────────────
export const listNotifications = (userId: string) =>
  state.notifications.filter((n) => n.user_id === userId);
export const markNotificationRead = (id: string) => {
  const n = state.notifications.find((x) => x.id === id);
  if (n) n.is_read = true;
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
    if (existing) { Object.assign(existing, c); return existing; }
  }
  const created: AccessCredential = {
    id: genId('ac'), tenant_id: null, provider: 'SmartLock (Kisi)',
    code: String(Math.floor(1000 + Math.random() * 9000)), status: 'active',
    schedule: '24/7', last_used: null, created_at: new Date().toISOString(), ...c,
  } as AccessCredential;
  state.accessCredentials.push(created);
  return created;
};
export const revokeAccessCredential = (id: string) => {
  const c = state.accessCredentials.find((x) => x.id === id);
  if (c) c.status = 'revoked';
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
  return created;
};
export const closeClassified = (id: string) => {
  const c = state.classifieds.find((x) => x.id === id);
  if (c) c.status = 'closed';
};
export const listCommunityPosts = (kitchenId: string) =>
  [...state.communityPosts].filter((p) => p.kitchen_id === kitchenId).reverse();
export const createCommunityPost = (p: { kitchen_id: string; author_id: string; author_name: string; body: string; kind?: CommunityPost['kind'] }): CommunityPost => {
  const created: CommunityPost = {
    id: genId('cp'), kind: 'post', created_at: new Date().toISOString(), ...p,
  } as CommunityPost;
  state.communityPosts.push(created);
  return created;
};
