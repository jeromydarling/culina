import type {
  Profile,
  Kitchen,
  KitchenSpace,
  KitchenEquipment,
  Membership,
  TenantProfile,
  ComplianceDocument,
  Booking,
  Lead,
  Invoice,
  Recipe,
  Product,
  Order,
  Grant,
  LearningResource,
  Announcement,
  Notification,
  TenantSite,
  AccessCredential,
  AccessEvent,
  Mentor,
  MentorRequest,
  Classified,
  CommunityPost,
  EmailSubscriber,
  ReferralPartner,
  MarketplaceTransaction,
  WhiteLabelConfig,
} from '@culina/shared';
import { computeCogs, feeBreakdown } from '@culina/shared';
import { IMG } from './images';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const addDays = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
};
const at = (dayOffset: number, hour: number) => {
  const d = addDays(dayOffset);
  d.setHours(hour, 0, 0, 0);
  return iso(d);
};

export const IDS = {
  operator: '11111111-1111-1111-1111-111111111111',
  sara: '22222222-2222-2222-2222-222222222222',
  marco: '33333333-3333-3333-3333-333333333333',
  amara: '44444444-4444-4444-4444-444444444444',
  admin: '99999999-9999-9999-9999-999999999999',
  kitchen: '55555555-5555-5555-5555-555555555555',
};

export const profiles: Profile[] = [
  { id: IDS.operator, email: 'demo@operator.culina.app', full_name: 'Dana Operator', role: 'operator', avatar_url: null, phone: '(612) 555-0142', created_at: iso(addDays(-120)) },
  { id: IDS.sara, email: 'sara@tenant.culina.app', full_name: 'Sara Bakes', role: 'tenant', avatar_url: null, phone: '(612) 555-0188', created_at: iso(addDays(-90)) },
  { id: IDS.marco, email: 'marco@tenant.culina.app', full_name: 'Marco Salsa', role: 'tenant', avatar_url: null, phone: '(612) 555-0177', created_at: iso(addDays(-40)) },
  { id: IDS.amara, email: 'amara@tenant.culina.app', full_name: 'Amara Foods', role: 'tenant', avatar_url: null, phone: '(612) 555-0199', created_at: iso(addDays(-10)) },
  { id: IDS.admin, email: 'admin@culina.app', full_name: 'Culina Admin', role: 'admin', avatar_url: null, phone: null, created_at: iso(addDays(-200)) },
];

export const kitchens: Kitchen[] = [
  {
    id: IDS.kitchen,
    operator_id: IDS.operator,
    name: 'Midwest Food Hub',
    slug: 'midwest-food-hub',
    description:
      'A 6,000 sq ft licensed shared commercial kitchen in the heart of Minneapolis, built for bakers, caterers, and meal-prep entrepreneurs.',
    address: '1200 Harvest Ave',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401',
    phone: '(612) 555-0142',
    email: 'hello@midwestfoodhub.com',
    website: 'https://midwestfoodhub.com',
    logo_url: null,
    cover_image_url: null,
    amenities: ['Walk-in cooler', 'Three-compartment sinks', 'Dry storage', 'Dish pit', 'Loading dock', 'Free parking', '24/7 access'],
    health_permit_number: 'MN-HP-2024-8841',
    stripe_account_id: 'acct_demo_operator',
    stripe_onboarded: true,
    monthly_price_cents: 4900,
    is_listed: true,
    latitude: 44.9778,
    longitude: -93.265,
    created_at: iso(addDays(-120)),
    updated_at: iso(addDays(-2)),
  },
  {
    id: 'k_secondcity',
    operator_id: 'op_secondcity',
    name: 'Lakeside Commissary',
    slug: 'lakeside-commissary',
    description: 'Bright, modern commissary kitchen with packaging suite, just south of downtown Madison.',
    address: '88 Lake St',
    city: 'Madison',
    state: 'WI',
    zip: '53703',
    phone: '(608) 555-0110',
    email: 'hi@lakesidecommissary.com',
    website: null,
    logo_url: null,
    cover_image_url: null,
    amenities: ['Packaging suite', 'Walk-in freezer', 'Co-packing referrals', 'Loading dock'],
    health_permit_number: 'WI-HP-2025-2210',
    stripe_account_id: null,
    stripe_onboarded: true,
    monthly_price_cents: 5900,
    is_listed: true,
    latitude: 43.0731,
    longitude: -89.4012,
    created_at: iso(addDays(-300)),
    updated_at: iso(addDays(-30)),
  },
  {
    id: 'k_river',
    operator_id: 'op_river',
    name: 'River North Kitchens',
    slug: 'river-north-kitchens',
    description: 'Premium downtown Chicago shared kitchen with 12 private suites and 24/7 access.',
    address: '410 N Halsted',
    city: 'Chicago',
    state: 'IL',
    zip: '60642',
    phone: '(312) 555-0150',
    email: 'team@rivernorthkitchens.com',
    website: null,
    logo_url: null,
    cover_image_url: null,
    amenities: ['Private suites', 'Blast chillers', '24/7 access', 'Cold + dry storage', 'Event space'],
    health_permit_number: 'IL-HP-2024-5567',
    stripe_account_id: null,
    stripe_onboarded: true,
    monthly_price_cents: 7900,
    is_listed: true,
    latitude: 41.891,
    longitude: -87.648,
    created_at: iso(addDays(-500)),
    updated_at: iso(addDays(-60)),
  },
];

export const spaces: KitchenSpace[] = [
  { id: 'sp_a', kitchen_id: IDS.kitchen, name: 'Prep Station A', space_type: 'prep_station', description: '12 ft stainless prep table with reach-in cooler', hourly_rate_cents: 2500, daily_rate_cents: 18000, monthly_rate_cents: 60000, capacity_persons: 2, image_url: null, is_active: true, created_at: iso(addDays(-120)) },
  { id: 'sp_b', kitchen_id: IDS.kitchen, name: 'Prep Station B', space_type: 'prep_station', description: '10 ft prep table near the dish pit', hourly_rate_cents: 2500, daily_rate_cents: 18000, monthly_rate_cents: 60000, capacity_persons: 2, image_url: null, is_active: true, created_at: iso(addDays(-120)) },
  { id: 'sp_cold', kitchen_id: IDS.kitchen, name: 'Cold Storage Bay 1', space_type: 'cold_storage', description: 'Dedicated walk-in shelf, lock-box included', hourly_rate_cents: 800, daily_rate_cents: 5000, monthly_rate_cents: 25000, capacity_persons: 1, image_url: null, is_active: true, created_at: iso(addDays(-120)) },
];

export const equipment: KitchenEquipment[] = [
  { id: 'eq_mixer', kitchen_id: IDS.kitchen, name: '60 Qt Hobart Mixer', hourly_rate_cents: 1500, quantity: 1, is_active: true },
  { id: 'eq_skillet', kitchen_id: IDS.kitchen, name: 'Tilt Skillet', hourly_rate_cents: 1200, quantity: 1, is_active: true },
  { id: 'eq_chiller', kitchen_id: IDS.kitchen, name: 'Blast Chiller', hourly_rate_cents: 1000, quantity: 1, is_active: true },
  { id: 'eq_oven', kitchen_id: IDS.kitchen, name: 'Convection Oven', hourly_rate_cents: 900, quantity: 2, is_active: true },
];

export const memberships: Membership[] = [
  { id: 'm_sara', kitchen_id: IDS.kitchen, tenant_id: IDS.sara, status: 'active', membership_type: 'monthly', monthly_hours_included: 40, hourly_overage_rate_cents: 2500, start_date: iso(addDays(-275)).slice(0, 10), end_date: null, stripe_subscription_id: 'sub_demo_sara', notes: 'Reliable, pays on time. Eyeing graduation in 2027.', created_at: iso(addDays(-275)), updated_at: iso(addDays(-5)) },
  { id: 'm_marco', kitchen_id: IDS.kitchen, tenant_id: IDS.marco, status: 'active', membership_type: 'hourly', monthly_hours_included: null, hourly_overage_rate_cents: null, start_date: iso(addDays(-140)).slice(0, 10), end_date: null, stripe_subscription_id: null, notes: 'Ramping up production for retail pilot.', created_at: iso(addDays(-140)), updated_at: iso(addDays(-12)) },
  { id: 'm_amara', kitchen_id: IDS.kitchen, tenant_id: IDS.amara, status: 'pending', membership_type: 'hourly', monthly_hours_included: null, hourly_overage_rate_cents: null, start_date: null, end_date: null, stripe_subscription_id: null, notes: 'Awaiting insurance doc before activation.', created_at: iso(addDays(-10)), updated_at: iso(addDays(-10)) },
];

export const tenantProfiles: TenantProfile[] = [
  { id: 'tp_sara', tenant_id: IDS.sara, business_name: "Sara's Sourdough", business_slug: 'saras-sourdough', business_type: 'bakery', description: 'Naturally-leavened sourdough breads and pastries baked fresh weekly.', logo_url: null, banner_url: null, instagram_url: 'https://instagram.com/saras.sourdough', facebook_url: null, website_url: null, stripe_account_id: 'acct_demo_sara', stripe_onboarded: true, ein: '88-1234567', legal_entity_type: 'llc', state_of_formation: 'MN', annual_revenue_estimate: 38000, years_in_operation: 2, graduation_target_date: iso(addDays(540)).slice(0, 10), created_at: iso(addDays(-90)), updated_at: iso(addDays(-3)) },
  { id: 'tp_marco', tenant_id: IDS.marco, business_name: "Marco's Salsa Co", business_slug: 'marcos-salsa', business_type: 'packaged', description: 'Small-batch fire-roasted salsas using locally grown peppers.', logo_url: null, banner_url: null, instagram_url: null, facebook_url: null, website_url: null, stripe_account_id: null, stripe_onboarded: false, ein: null, legal_entity_type: 'sole_prop', state_of_formation: 'MN', annual_revenue_estimate: 22000, years_in_operation: 1, graduation_target_date: null, created_at: iso(addDays(-40)), updated_at: iso(addDays(-8)) },
  { id: 'tp_amara', tenant_id: IDS.amara, business_name: 'Amara Catering', business_slug: 'amara-catering', business_type: 'caterer', description: 'West African inspired catering for events across the Twin Cities.', logo_url: null, banner_url: null, instagram_url: null, facebook_url: null, website_url: null, stripe_account_id: null, stripe_onboarded: false, ein: null, legal_entity_type: null, state_of_formation: null, annual_revenue_estimate: 51000, years_in_operation: 3, graduation_target_date: null, created_at: iso(addDays(-10)), updated_at: iso(addDays(-10)) },
];

export const complianceDocuments: ComplianceDocument[] = [
  { id: 'cd_1', membership_id: 'm_sara', tenant_id: IDS.sara, kitchen_id: IDS.kitchen, doc_type: 'food_handler_cert', doc_name: 'ServSafe Certificate', file_url: '#', expiration_date: iso(addDays(220)).slice(0, 10), status: 'approved', reviewer_notes: null, uploaded_at: iso(addDays(-80)), reviewed_at: iso(addDays(-79)) },
  { id: 'cd_2', membership_id: 'm_sara', tenant_id: IDS.sara, kitchen_id: IDS.kitchen, doc_type: 'liability_insurance', doc_name: 'COI 2026', file_url: '#', expiration_date: iso(addDays(20)).slice(0, 10), status: 'approved', reviewer_notes: 'Expiring soon — reminder sent.', uploaded_at: iso(addDays(-60)), reviewed_at: iso(addDays(-59)) },
  { id: 'cd_3', membership_id: 'm_marco', tenant_id: IDS.marco, kitchen_id: IDS.kitchen, doc_type: 'food_handler_cert', doc_name: 'Food Handler Card', file_url: '#', expiration_date: iso(addDays(-5)).slice(0, 10), status: 'expired', reviewer_notes: 'Renewal needed before next booking.', uploaded_at: iso(addDays(-130)), reviewed_at: iso(addDays(-129)) },
  { id: 'cd_4', membership_id: 'm_marco', tenant_id: IDS.marco, kitchen_id: IDS.kitchen, doc_type: 'cottage_food_permit', doc_name: 'Cottage Food Registration', file_url: '#', expiration_date: iso(addDays(140)).slice(0, 10), status: 'pending_review', reviewer_notes: null, uploaded_at: iso(addDays(-3)), reviewed_at: null },
  { id: 'cd_5', membership_id: 'm_amara', tenant_id: IDS.amara, kitchen_id: IDS.kitchen, doc_type: 'liability_insurance', doc_name: null, file_url: null, expiration_date: null, status: 'pending_review', reviewer_notes: 'Not yet uploaded.', uploaded_at: iso(addDays(-10)), reviewed_at: null },
];

function mkBooking(id: string, tenant: string, space: string, dayOffset: number, startHour: number, hours: number, status: Booking['status']): Booking {
  const sp = spaces.find((s) => s.id === space)!;
  const subtotal = (sp.hourly_rate_cents ?? 0) * hours;
  const fb = feeBreakdown(subtotal);
  return {
    id,
    kitchen_id: IDS.kitchen,
    space_id: space,
    tenant_id: tenant,
    membership_id: memberships.find((m) => m.tenant_id === tenant)?.id ?? null,
    start_time: at(dayOffset, startHour),
    end_time: at(dayOffset, startHour + hours),
    status,
    booking_type: 'hourly',
    subtotal_cents: fb.subtotalCents,
    platform_fee_cents: fb.platformFeeCents,
    total_cents: fb.totalCents,
    stripe_payment_intent_id: status === 'confirmed' ? 'pi_demo' : null,
    stripe_charge_id: null,
    notes: null,
    equipment_ids: [],
    created_at: iso(addDays(-3)),
    updated_at: iso(addDays(-1)),
  };
}

export const bookings: Booking[] = [
  mkBooking('bk_1', IDS.sara, 'sp_a', 0, 6, 4, 'confirmed'),
  mkBooking('bk_2', IDS.marco, 'sp_b', 1, 9, 3, 'confirmed'),
  mkBooking('bk_3', IDS.sara, 'sp_a', 2, 5, 5, 'pending'),
  mkBooking('bk_4', IDS.marco, 'sp_b', 4, 13, 4, 'confirmed'),
  mkBooking('bk_5', IDS.sara, 'sp_cold', 6, 7, 6, 'confirmed'),
  mkBooking('bk_6', IDS.sara, 'sp_a', -3, 6, 4, 'completed'),
  mkBooking('bk_7', IDS.marco, 'sp_b', -7, 10, 3, 'completed'),
];

export const leads: Lead[] = [
  { id: 'ld_1', kitchen_id: IDS.kitchen, full_name: 'Priya Nair', email: 'priya@example.com', phone: '(612) 555-0301', business_name: 'Spice Route Snacks', business_type: 'packaged', message: 'Looking for prep + cold storage 2 days a week.', source: 'culina_directory', status: 'new', notes: null, follow_up_date: iso(addDays(2)).slice(0, 10), assigned_to: null, converted_membership_id: null, created_at: iso(addDays(-1)), updated_at: iso(addDays(-1)) },
  { id: 'ld_2', kitchen_id: IDS.kitchen, full_name: 'Tom Becker', email: 'tom@example.com', phone: null, business_name: 'Becker BBQ', business_type: 'caterer', message: 'Need a tilt skillet and smoker access.', source: 'website', status: 'contacted', notes: 'Called, sent pricing.', follow_up_date: iso(addDays(3)).slice(0, 10), assigned_to: IDS.operator, converted_membership_id: null, created_at: iso(addDays(-4)), updated_at: iso(addDays(-2)) },
  { id: 'ld_3', kitchen_id: IDS.kitchen, full_name: 'Lena Ortiz', email: 'lena@example.com', phone: '(612) 555-0444', business_name: 'Dulce Lena', business_type: 'bakery', message: 'Touring next week.', source: 'referral', status: 'toured', notes: 'Loved Prep Station A.', follow_up_date: iso(addDays(1)).slice(0, 10), assigned_to: IDS.operator, converted_membership_id: null, created_at: iso(addDays(-9)), updated_at: iso(addDays(-1)) },
  { id: 'ld_4', kitchen_id: IDS.kitchen, full_name: 'Amara Foods', email: 'amara@tenant.culina.app', phone: '(612) 555-0199', business_name: 'Amara Catering', business_type: 'caterer', message: 'Ready to join!', source: 'walk_in', status: 'converted', notes: 'Converted to pending membership.', follow_up_date: null, assigned_to: IDS.operator, converted_membership_id: 'm_amara', created_at: iso(addDays(-14)), updated_at: iso(addDays(-10)) },
  { id: 'ld_5', kitchen_id: IDS.kitchen, full_name: 'Greg Hahn', email: 'greg@example.com', phone: null, business_name: 'Hahn Pickles', business_type: 'packaged', message: 'Found a different kitchen closer to home.', source: 'social', status: 'lost', notes: 'Location too far.', follow_up_date: null, assigned_to: IDS.operator, converted_membership_id: null, created_at: iso(addDays(-20)), updated_at: iso(addDays(-15)) },
];

export const invoices: Invoice[] = [
  {
    id: 'inv_1', kitchen_id: IDS.kitchen, membership_id: 'm_sara', tenant_id: IDS.sara, invoice_number: 'INV-2026-0001',
    period_start: iso(addDays(-30)).slice(0, 10), period_end: iso(addDays(-1)).slice(0, 10),
    line_items: [
      { description: 'Monthly membership (40 hrs)', qty: 1, unit_price: 600, total: 600 },
      { description: 'Overage hours', qty: 6, unit_price: 25, total: 150 },
    ],
    subtotal_cents: 75000, tax_cents: 0, total_cents: 76125, platform_fee_cents: 1125, status: 'paid',
    due_date: iso(addDays(-5)).slice(0, 10), stripe_invoice_id: 'in_demo_paid', paid_at: iso(addDays(-6)), notes: null, created_at: iso(addDays(-12)),
  },
  {
    id: 'inv_2', kitchen_id: IDS.kitchen, membership_id: 'm_marco', tenant_id: IDS.marco, invoice_number: 'INV-2026-0002',
    period_start: iso(addDays(-30)).slice(0, 10), period_end: iso(addDays(-1)).slice(0, 10),
    line_items: [{ description: 'Hourly bookings (14 hrs)', qty: 14, unit_price: 25, total: 350 }],
    subtotal_cents: 35000, tax_cents: 0, total_cents: 35525, platform_fee_cents: 525, status: 'overdue',
    due_date: iso(addDays(-3)).slice(0, 10), stripe_invoice_id: null, paid_at: null, notes: 'Second reminder sent.', created_at: iso(addDays(-14)),
  },
];

function buildRecipe(partial: Partial<Recipe> & Pick<Recipe, 'id' | 'tenant_id' | 'name'>): Recipe {
  const ingredients = partial.ingredients ?? [];
  const cogs = computeCogs({
    ingredients,
    laborMinutes: partial.labor_minutes ?? 0,
    laborHourlyRateCents: partial.labor_hourly_rate_cents ?? 0,
    overheadPercent: partial.overhead_percent ?? 15,
    targetMarginPercent: partial.target_margin_percent ?? 35,
    yieldQuantity: partial.yield_quantity ?? 1,
  });
  return {
    description: null, yield_quantity: 12, yield_unit: 'units', prep_time_minutes: 30, cook_time_minutes: 30,
    instructions: null, labor_minutes: 60, labor_hourly_rate_cents: 2000, overhead_percent: 15, target_margin_percent: 35,
    is_published: false, tags: [], image_url: null, created_at: iso(addDays(-30)), updated_at: iso(addDays(-2)),
    selling_price_cents: cogs.suggestedPriceCents, cogs_cents: cogs.cogsPerUnitCents, gross_margin_percent: cogs.grossMarginPercent,
    ...partial,
    ingredients,
  } as Recipe;
}

export const recipes: Recipe[] = [
  buildRecipe({
    id: 'rc_1', tenant_id: IDS.sara, name: 'Country Sourdough Loaf', description: 'Naturally-leavened, 24h cold ferment.',
    yield_quantity: 12, yield_unit: 'loaves', prep_time_minutes: 45, cook_time_minutes: 45, labor_minutes: 90, labor_hourly_rate_cents: 2200,
    tags: ['bread', 'bestseller'], is_published: true,
    ingredients: [
      { name: 'Bread flour', quantity: 10, unit: 'lb', cost_per_unit: 0.9, total_cost: 9.0 },
      { name: 'Whole wheat flour', quantity: 2, unit: 'lb', cost_per_unit: 1.1, total_cost: 2.2 },
      { name: 'Sea salt', quantity: 0.25, unit: 'lb', cost_per_unit: 1.5, total_cost: 0.38 },
      { name: 'Levain', quantity: 1, unit: 'batch', cost_per_unit: 1.0, total_cost: 1.0 },
    ],
  }),
  buildRecipe({
    id: 'rc_2', tenant_id: IDS.sara, name: 'Cinnamon Morning Bun', description: 'Laminated dough, brown butter cinnamon.',
    yield_quantity: 24, yield_unit: 'buns', prep_time_minutes: 60, cook_time_minutes: 25, labor_minutes: 120, labor_hourly_rate_cents: 2200,
    tags: ['pastry'], is_published: true, target_margin_percent: 45,
    ingredients: [
      { name: 'AP flour', quantity: 6, unit: 'lb', cost_per_unit: 0.8, total_cost: 4.8 },
      { name: 'Butter', quantity: 3, unit: 'lb', cost_per_unit: 4.2, total_cost: 12.6 },
      { name: 'Brown sugar', quantity: 2, unit: 'lb', cost_per_unit: 1.3, total_cost: 2.6 },
      { name: 'Cinnamon', quantity: 0.2, unit: 'lb', cost_per_unit: 8, total_cost: 1.6 },
    ],
  }),
  buildRecipe({
    id: 'rc_3', tenant_id: IDS.marco, name: 'Fire-Roasted Salsa (Medium)', description: '16 oz jars, fire-roasted tomatoes + chiles.',
    yield_quantity: 48, yield_unit: 'jars', prep_time_minutes: 60, cook_time_minutes: 90, labor_minutes: 150, labor_hourly_rate_cents: 1800,
    tags: ['salsa', 'retail'], is_published: true,
    ingredients: [
      { name: 'Roma tomatoes', quantity: 40, unit: 'lb', cost_per_unit: 1.1, total_cost: 44 },
      { name: 'Poblano + jalapeño', quantity: 6, unit: 'lb', cost_per_unit: 1.8, total_cost: 10.8 },
      { name: 'Onion + garlic', quantity: 5, unit: 'lb', cost_per_unit: 0.9, total_cost: 4.5 },
      { name: '16oz jars + lids', quantity: 48, unit: 'ea', cost_per_unit: 0.85, total_cost: 40.8 },
    ],
  }),
];

export const products: Product[] = [
  { id: 'pr_1', tenant_id: IDS.sara, recipe_id: 'rc_1', name: 'Country Sourdough Loaf', description: 'Crusty, open crumb, 24h fermented.', price_cents: 900, compare_at_price_cents: null, sku: 'SS-LOAF', category: 'Bread', tags: ['bestseller'], images: [IMG.bread], inventory_count: 30, track_inventory: true, is_active: true, is_subscription_eligible: true, subscription_interval: 'weekly', stripe_product_id: null, stripe_price_id: null, allergens: ['wheat'], ingredients_label: 'Bread flour, water, whole wheat flour, sea salt, levain.', net_weight: '24 oz', created_at: iso(addDays(-60)), updated_at: iso(addDays(-2)) },
  { id: 'pr_2', tenant_id: IDS.sara, recipe_id: 'rc_2', name: 'Cinnamon Morning Bun (4-pack)', description: 'Buttery, laminated, brown-butter cinnamon.', price_cents: 1600, compare_at_price_cents: 1800, sku: 'SS-BUN4', category: 'Pastry', tags: [], images: [IMG.pastry], inventory_count: 18, track_inventory: true, is_active: true, is_subscription_eligible: false, subscription_interval: null, stripe_product_id: null, stripe_price_id: null, allergens: ['wheat', 'milk', 'eggs'], ingredients_label: 'Flour, butter, sugar, eggs, cinnamon, salt, yeast.', net_weight: '16 oz', created_at: iso(addDays(-50)), updated_at: iso(addDays(-2)) },
  { id: 'pr_3', tenant_id: IDS.sara, recipe_id: null, name: 'Baker’s Dozen Bagels', description: 'Hand-rolled, boiled, baked.', price_cents: 2400, compare_at_price_cents: null, sku: 'SS-BAGEL13', category: 'Bread', tags: [], images: [IMG.bagels], inventory_count: 12, track_inventory: true, is_active: true, is_subscription_eligible: true, subscription_interval: 'weekly', stripe_product_id: null, stripe_price_id: null, allergens: ['wheat'], ingredients_label: 'Flour, water, malt, salt, yeast.', net_weight: '52 oz', created_at: iso(addDays(-30)), updated_at: iso(addDays(-2)) },
];

export const orders: Order[] = [
  { id: 'or_1', tenant_id: IDS.sara, customer_email: 'janed@example.com', customer_name: 'Jane Doe', customer_phone: null, order_number: 'SS-1042', items: [{ product_id: 'pr_1', name: 'Country Sourdough Loaf', qty: 2, price_cents: 900 }], subtotal_cents: 1800, shipping_cents: 0, tax_cents: 0, platform_fee_cents: 27, total_cents: 1800, status: 'fulfilled', fulfillment_type: 'pickup', fulfillment_date: iso(addDays(-2)).slice(0, 10), shipping_address: null, stripe_payment_intent_id: 'pi_demo1', stripe_subscription_id: null, notes: null, created_at: iso(addDays(-3)) },
  { id: 'or_2', tenant_id: IDS.sara, customer_email: 'sam@example.com', customer_name: 'Sam Lee', customer_phone: null, order_number: 'SS-1043', items: [{ product_id: 'pr_2', name: 'Cinnamon Morning Bun (4-pack)', qty: 1, price_cents: 1600 }, { product_id: 'pr_1', name: 'Country Sourdough Loaf', qty: 1, price_cents: 900 }], subtotal_cents: 2500, shipping_cents: 0, tax_cents: 0, platform_fee_cents: 38, total_cents: 2500, status: 'preparing', fulfillment_type: 'pickup', fulfillment_date: iso(addDays(1)).slice(0, 10), shipping_address: null, stripe_payment_intent_id: 'pi_demo2', stripe_subscription_id: null, notes: 'Pickup Saturday AM', created_at: iso(addDays(-1)) },
];

export const grants: Grant[] = [
  { id: 'gr_1', title: 'USDA Value-Added Producer Grant', description: 'Helps producers add value to raw commodities through planning or working capital.', funder: 'USDA Rural Development', grant_type: 'federal', amount_min: 50000, amount_max: 250000, eligibility_criteria: 'Independent producers, farmer/rancher coops, majority-controlled producer-based businesses.', application_url: 'https://www.rd.usda.gov', deadline: iso(addDays(60)).slice(0, 10), is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-100)) },
  { id: 'gr_2', title: 'SBA Microloan Program', description: 'Loans up to $50k for small businesses through intermediary lenders.', funder: 'U.S. Small Business Administration', grant_type: 'loan', amount_min: 5000, amount_max: 50000, eligibility_criteria: 'Most for-profit small businesses.', application_url: 'https://www.sba.gov/funding-programs/loans/microloans', deadline: null, is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-100)) },
  { id: 'gr_3', title: 'Minnesota Emerging Entrepreneur Loan', description: 'Supports minority- and women-owned small businesses in MN.', funder: 'MN DEED', grant_type: 'state', amount_min: 5000, amount_max: 150000, eligibility_criteria: 'MN-based, low-income area or minority/women-owned.', application_url: 'https://mn.gov/deed', deadline: iso(addDays(30)).slice(0, 10), is_recurring: false, target_states: ['MN'], target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-90)) },
  { id: 'gr_4', title: 'Finnegan Foundation Food Innovation', description: 'Annual grant for food entrepreneurs improving community food access.', funder: 'Finnegan Foundation', grant_type: 'foundation', amount_min: 10000, amount_max: 25000, eligibility_criteria: 'Mission-aligned food businesses.', application_url: 'https://example.org/grant', deadline: iso(addDays(90)).slice(0, 10), is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-80)) },
  { id: 'gr_5', title: 'Local First Microgrant', description: 'City of Minneapolis storefront support microgrant.', funder: 'City of Minneapolis', grant_type: 'local', amount_min: 1000, amount_max: 10000, eligibility_criteria: 'Minneapolis storefront businesses.', application_url: 'https://minneapolismn.gov', deadline: iso(addDays(45)).slice(0, 10), is_recurring: false, target_states: ['MN'], target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-70)) },
  { id: 'gr_6', title: 'Hot Bread Kitchen Catalyst', description: 'Funding + mentorship for women food entrepreneurs.', funder: 'Hot Bread Kitchen', grant_type: 'foundation', amount_min: 5000, amount_max: 20000, eligibility_criteria: 'Women food entrepreneurs.', application_url: 'https://hotbreadkitchen.org', deadline: null, is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-60)) },
  { id: 'gr_7', title: 'Kiva Crowdfunded Loan', description: '0% interest crowdfunded microloans.', funder: 'Kiva', grant_type: 'loan', amount_min: 1000, amount_max: 15000, eligibility_criteria: 'Open to most US businesses.', application_url: 'https://kiva.org', deadline: null, is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-55)) },
  { id: 'gr_8', title: 'Comcast RISE Investment Fund', description: 'Grants for small businesses owned by people of color.', funder: 'Comcast', grant_type: 'foundation', amount_min: 5000, amount_max: 5000, eligibility_criteria: 'BIPOC-owned small businesses.', application_url: 'https://comcastrise.com', deadline: iso(addDays(15)).slice(0, 10), is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-50)) },
  { id: 'gr_9', title: 'USDA Farmers Market Promotion', description: 'Grows direct producer-to-consumer markets.', funder: 'USDA AMS', grant_type: 'federal', amount_min: 50000, amount_max: 100000, eligibility_criteria: 'Producer networks, coops, local governments.', application_url: 'https://www.ams.usda.gov', deadline: iso(addDays(120)).slice(0, 10), is_recurring: true, target_states: null, target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-40)) },
  { id: 'gr_10', title: 'Regional CDFI Working Capital', description: 'Flexible working capital from a community development financial institution.', funder: 'Local CDFI', grant_type: 'loan', amount_min: 10000, amount_max: 100000, eligibility_criteria: 'Underserved small businesses in MN/WI/IA.', application_url: 'https://example.org/cdfi', deadline: null, is_recurring: true, target_states: ['MN', 'WI', 'IA'], target_business_types: null, is_active: true, added_by: IDS.admin, created_at: iso(addDays(-30)) },
];

export const learningResources: LearningResource[] = [
  { id: 'lr_1', title: 'How to Form an LLC for Your Food Business', description: 'Step-by-step LLC formation walkthrough.', content_type: 'guide', category: 'business_formation', content_url: '#', content_body: null, duration_minutes: 15, is_free: true, tags: ['llc', 'formation'], created_at: iso(addDays(-60)) },
  { id: 'lr_2', title: 'ServSafe Food Handler Basics', description: 'Core food safety concepts every kitchen tenant must know.', content_type: 'article', category: 'food_safety', content_url: '#', content_body: null, duration_minutes: 20, is_free: true, tags: ['safety'], created_at: iso(addDays(-58)) },
  { id: 'lr_3', title: 'FDA Nutrition Facts Label Requirements', description: 'What must appear on a packaged food label.', content_type: 'checklist', category: 'labeling_compliance', content_url: '#', content_body: null, duration_minutes: 10, is_free: true, tags: ['label', 'fda'], created_at: iso(addDays(-55)) },
  { id: 'lr_4', title: 'Pricing for Profit: COGS & Margins', description: 'Turn recipe costs into sustainable pricing.', content_type: 'article', category: 'financial_planning', content_url: '#', content_body: null, duration_minutes: 18, is_free: true, tags: ['pricing'], created_at: iso(addDays(-50)) },
  { id: 'lr_5', title: 'Instagram for Food Brands', description: 'Grow a following and convert it into orders.', content_type: 'video', category: 'marketing', content_url: '#', content_body: null, duration_minutes: 25, is_free: true, tags: ['social'], created_at: iso(addDays(-45)) },
  { id: 'lr_6', title: 'Getting Into Farmers Markets', description: 'Application tips and what buyers look for.', content_type: 'guide', category: 'sales_channels', content_url: '#', content_body: null, duration_minutes: 12, is_free: true, tags: ['markets'], created_at: iso(addDays(-40)) },
  { id: 'lr_7', title: 'From Kitchen to Co-Packer', description: 'When and how to scale beyond a shared kitchen.', content_type: 'guide', category: 'scaling', content_url: '#', content_body: null, duration_minutes: 22, is_free: false, tags: ['scaling'], created_at: iso(addDays(-35)) },
  { id: 'lr_8', title: 'Graduation Readiness Checklist', description: "Signs you're ready for your own facility.", content_type: 'checklist', category: 'graduation_planning', content_url: '#', content_body: null, duration_minutes: 8, is_free: true, tags: ['graduation'], created_at: iso(addDays(-30)) },
];

export const announcements: Announcement[] = [
  { id: 'an_1', kitchen_id: IDS.kitchen, author_id: IDS.operator, title: 'Walk-in cooler maintenance Friday', body: 'The walk-in will be serviced Friday 6–8am. Please plan cold storage accordingly.', is_pinned: true, audience: 'all', created_at: iso(addDays(-1)) },
  { id: 'an_2', kitchen_id: IDS.kitchen, author_id: IDS.operator, title: 'New blast chiller available', body: 'We added a second blast chiller — book it from the equipment add-ons.', is_pinned: false, audience: 'all', created_at: iso(addDays(-5)) },
];

export const tenantSites: TenantSite[] = [
  { id: 'ts_sara', tenant_id: IDS.sara, site_slug: 'saras-sourdough', theme: 'warm_artisan', hero_headline: 'Bread with a soul', hero_subheadline: 'Naturally leavened, baked fresh every week in Minneapolis.', hero_image_url: IMG.heroBread, about_text: "Sara's Sourdough began with a single jar of starter on a windowsill. Today we bake small batches of naturally-leavened bread for our neighbors — slow-fermented, never rushed.", color_primary: '#2D4A3E', color_secondary: '#F5E6C8', font_heading: 'Playfair Display', font_body: 'Inter', show_products: true, show_about: true, show_contact: true, show_social: true, custom_domain: null, is_published: true, meta_title: "Sara's Sourdough — Naturally leavened bread", meta_description: 'Fresh sourdough bread and pastries, baked weekly in Minneapolis.', created_at: iso(addDays(-50)), updated_at: iso(addDays(-2)) },
];

export const accessCredentials: AccessCredential[] = [
  { id: 'ac_1', kitchen_id: IDS.kitchen, tenant_id: IDS.sara, lock_name: 'Main Entrance', provider: 'SmartLock (Kisi)', code: '4821', status: 'active', schedule: 'Mon–Sun 5am–11pm', last_used: iso(addDays(0)), created_at: iso(addDays(-200)) },
  { id: 'ac_2', kitchen_id: IDS.kitchen, tenant_id: IDS.sara, lock_name: 'Cold Storage Bay 1', provider: 'SmartLock (Kisi)', code: '7740', status: 'active', schedule: '24/7', last_used: iso(addDays(-1)), created_at: iso(addDays(-200)) },
  { id: 'ac_3', kitchen_id: IDS.kitchen, tenant_id: IDS.marco, lock_name: 'Main Entrance', provider: 'SmartLock (Kisi)', code: '5093', status: 'active', schedule: 'Mon–Fri 7am–9pm', last_used: iso(addDays(-2)), created_at: iso(addDays(-140)) },
  { id: 'ac_4', kitchen_id: IDS.kitchen, tenant_id: IDS.marco, lock_name: 'Dry Storage', provider: 'Keypad', code: '1188', status: 'revoked', schedule: '—', last_used: iso(addDays(-30)), created_at: iso(addDays(-140)) },
];

export const accessEvents: AccessEvent[] = [
  { id: 'ae_1', kitchen_id: IDS.kitchen, tenant_id: IDS.sara, lock_name: 'Main Entrance', event: 'Unlocked', created_at: iso(addDays(0)) },
  { id: 'ae_2', kitchen_id: IDS.kitchen, tenant_id: IDS.marco, lock_name: 'Main Entrance', event: 'Unlocked', created_at: iso(addDays(-1)) },
  { id: 'ae_3', kitchen_id: IDS.kitchen, tenant_id: IDS.sara, lock_name: 'Cold Storage Bay 1', event: 'Unlocked', created_at: iso(addDays(-1)) },
  { id: 'ae_4', kitchen_id: IDS.kitchen, tenant_id: IDS.marco, lock_name: 'Main Entrance', event: 'Access denied (outside schedule)', created_at: iso(addDays(-2)) },
];

export const mentors: Mentor[] = [
  { id: 'me_1', name: 'Carla Whitfield', expertise: 'Food law & compliance', bio: '20 years guiding CPG brands through FDA labeling and state permitting.', availability: '2 slots/week', rate: 'Free (volunteer)', avatar_emoji: '⚖️', created_at: iso(addDays(-100)) },
  { id: 'me_2', name: 'Devon Park', expertise: 'Wholesale & distribution', bio: 'Former grocery buyer; helps makers land their first retail accounts.', availability: 'Monthly office hours', rate: 'Free (volunteer)', avatar_emoji: '📦', created_at: iso(addDays(-100)) },
  { id: 'me_3', name: 'Aisha Rahman', expertise: 'Branding & marketing', bio: 'Built three food brands from farmers market to national shelf.', availability: '1 slot/week', rate: '$50/session', avatar_emoji: '🎨', created_at: iso(addDays(-100)) },
  { id: 'me_4', name: 'Luis Moreno', expertise: 'Scaling & co-packing', bio: 'Operations consultant for small-batch to mid-scale production.', availability: 'By request', rate: '$75/session', avatar_emoji: '🏭', created_at: iso(addDays(-100)) },
  { id: 'me_5', name: 'Grace Lin', expertise: 'Financing & grants', bio: 'CDFI lender; helps makers prepare loan and grant applications.', availability: '2 slots/month', rate: 'Free (volunteer)', avatar_emoji: '💰', created_at: iso(addDays(-100)) },
];

export const mentorRequests: MentorRequest[] = [
  { id: 'mr_1', tenant_id: IDS.sara, mentor_id: 'me_2', status: 'accepted', message: 'Want help approaching co-ops for wholesale.', created_at: iso(addDays(-12)) },
];

export const classifieds: Classified[] = [
  { id: 'cl_1', kitchen_id: IDS.kitchen, author_tenant_id: IDS.sara, kind: 'ingredient', listing_type: 'offer', title: 'Surplus organic bread flour (50 lb)', description: 'Over-ordered a pallet — selling a sack at cost.', price_cents: 3500, status: 'active', created_at: iso(addDays(-2)) },
  { id: 'cl_2', kitchen_id: IDS.kitchen, author_tenant_id: IDS.marco, kind: 'equipment_time', listing_type: 'offer', title: 'Splitting tilt-skillet block, Tue AM', description: 'Booked 4 hrs, only need 2. Split the cost?', price_cents: null, status: 'active', created_at: iso(addDays(-1)) },
  { id: 'cl_3', kitchen_id: IDS.kitchen, author_tenant_id: IDS.amara, kind: 'packaging', listing_type: 'request', title: 'Looking for 8oz kraft deli containers', description: 'Anyone have a spare case to sell?', price_cents: null, status: 'active', created_at: iso(addDays(-3)) },
  { id: 'cl_4', kitchen_id: IDS.kitchen, author_tenant_id: IDS.sara, kind: 'collab', listing_type: 'offer', title: 'Holiday market booth share', description: 'Splitting a farmers-market booth in December — one spot left.', price_cents: 6000, status: 'active', created_at: iso(addDays(-5)) },
];

export const communityPosts: CommunityPost[] = [
  { id: 'cp_1', kitchen_id: IDS.kitchen, author_id: IDS.operator, author_name: 'Dana (Operator)', kind: 'post', body: 'Welcome to the Midwest Food Hub community board! Share wins, asks, and surplus here.', created_at: iso(addDays(-6)) },
  { id: 'cp_2', kitchen_id: IDS.kitchen, author_id: IDS.sara, author_name: "Sara's Sourdough", kind: 'spotlight', body: 'Hit 50 loaves/week this month — thank you all for the referrals! 🥖', created_at: iso(addDays(-2)) },
  { id: 'cp_3', kitchen_id: IDS.kitchen, author_id: IDS.marco, author_name: "Marco's Salsa Co", kind: 'question', body: 'Anyone know a good local label printer for short runs?', created_at: iso(addDays(-1)) },
];

export const emailSubscribers: EmailSubscriber[] = [
  { id: 'es_1', tenant_id: IDS.sara, email: 'fan1@example.com', name: 'Jordan', source: 'storefront', created_at: iso(addDays(-20)) },
  { id: 'es_2', tenant_id: IDS.sara, email: 'fan2@example.com', name: null, source: 'market', created_at: iso(addDays(-10)) },
];

export const referralPartners: ReferralPartner[] = [
  { id: 'rp_1', name: 'Local CDFI Fund', partner_type: 'cdfi', description: 'Community development loans for underserved food makers in MN/WI/IA.', url: 'https://example.org/cdfi', revenue_share_percent: 2 },
  { id: 'rp_2', name: 'FLIP Food Liability Insurance', partner_type: 'insurer', description: 'Affordable product-liability insurance for shared-kitchen tenants.', url: 'https://www.fliprogram.com', revenue_share_percent: 10 },
  { id: 'rp_3', name: 'Kiva Microfunds', partner_type: 'lender', description: '0% interest crowdfunded microloans up to $15k.', url: 'https://kiva.org', revenue_share_percent: 0 },
  { id: 'rp_4', name: 'Hot Bread Kitchen', partner_type: 'grantor', description: 'Grants + mentorship for women food entrepreneurs.', url: 'https://hotbreadkitchen.org', revenue_share_percent: 0 },
];

export const marketplaceTransactions: MarketplaceTransaction[] = [
  { id: 'mt_1', kitchen_id: IDS.kitchen, classified_id: 'cl_1', description: 'Surplus organic bread flour (50 lb)', amount_cents: 3500, commission_cents: 175, created_at: iso(addDays(-1)) },
];

export const whiteLabelConfigs: WhiteLabelConfig[] = [
  { id: 'wl_1', org_name: 'University Food Innovation Center', brand_name: 'HarvestHub', primary_color: '#6D28D9', logo_url: null, custom_domain: 'kitchen.universityfoodlab.edu', plan: 'pilot', is_active: true, created_at: iso(addDays(-45)) },
];

export const notifications: Notification[] = [
  { id: 'nt_1', user_id: IDS.operator, title: 'New lead: Priya Nair', body: 'Spice Route Snacks inquired via the directory.', type: 'lead', is_read: false, action_url: '/operator/leads', created_at: iso(addDays(-1)) },
  { id: 'nt_2', user_id: IDS.operator, title: 'Invoice overdue', body: "Marco's Salsa Co invoice INV-2026-0002 is overdue.", type: 'invoice_due', is_read: false, action_url: '/operator/invoices', created_at: iso(addDays(-3)) },
  { id: 'nt_3', user_id: IDS.sara, title: 'Booking confirmed', body: 'Your Prep Station A booking is confirmed.', type: 'booking_confirmed', is_read: false, action_url: '/tenant/bookings', created_at: iso(addDays(0)) },
  { id: 'nt_4', user_id: IDS.sara, title: 'Insurance expiring soon', body: 'Your liability insurance expires in 20 days.', type: 'document_expiring', is_read: true, action_url: '/tenant/documents', created_at: iso(addDays(-2)) },
];
