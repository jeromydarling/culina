-- ═══════════════════════════════════════════════════════════════════════
-- Culina — initial schema
-- All tables use UUID primary keys and have Row Level Security enabled.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── PROFILES (extends auth.users) ──────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text,
  role text check (role in ('operator', 'tenant', 'admin')) not null,
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

-- ─── KITCHENS ───────────────────────────────────────────────────────────
create table if not exists public.kitchens (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.profiles(id) not null,
  name text not null,
  slug text unique not null,
  description text,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  website text,
  logo_url text,
  cover_image_url text,
  amenities jsonb default '[]',
  health_permit_number text,
  stripe_account_id text,
  stripe_onboarded boolean default false,
  monthly_price_cents integer default 4900,
  is_listed boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── KITCHEN SPACES ─────────────────────────────────────────────────────
create table if not exists public.kitchen_spaces (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id) on delete cascade,
  name text not null,
  space_type text check (space_type in ('prep_station','oven_bay','cold_storage','dry_storage','equipment','full_kitchen','room','other')),
  description text,
  hourly_rate_cents integer,
  daily_rate_cents integer,
  monthly_rate_cents integer,
  capacity_persons integer default 1,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── KITCHEN EQUIPMENT ──────────────────────────────────────────────────
create table if not exists public.kitchen_equipment (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id) on delete cascade,
  name text not null,
  hourly_rate_cents integer default 0,
  quantity integer default 1,
  is_active boolean default true
);

-- ─── MEMBERSHIPS ────────────────────────────────────────────────────────
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id) on delete cascade,
  tenant_id uuid references public.profiles(id) not null,
  status text check (status in ('pending','active','suspended','graduated')) default 'pending',
  membership_type text check (membership_type in ('hourly','monthly','annual')) default 'hourly',
  monthly_hours_included integer,
  hourly_overage_rate_cents integer,
  start_date date,
  end_date date,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── TENANT PROFILES ────────────────────────────────────────────────────
create table if not exists public.tenant_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id) unique,
  business_name text,
  business_slug text unique,
  business_type text,
  description text,
  logo_url text,
  banner_url text,
  instagram_url text,
  facebook_url text,
  website_url text,
  stripe_account_id text,
  stripe_onboarded boolean default false,
  ein text,
  legal_entity_type text,
  state_of_formation text,
  annual_revenue_estimate integer,
  years_in_operation integer,
  graduation_target_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── COMPLIANCE DOCUMENTS ───────────────────────────────────────────────
create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid references public.memberships(id) on delete cascade,
  tenant_id uuid references public.profiles(id),
  kitchen_id uuid references public.kitchens(id),
  doc_type text check (doc_type in ('food_handler_cert','business_license','health_permit','liability_insurance','kitchen_agreement','cottage_food_permit','llc_formation','ein_letter','other')) not null,
  doc_name text,
  file_url text,
  expiration_date date,
  status text check (status in ('pending_review','approved','expired','rejected')) default 'pending_review',
  reviewer_notes text,
  uploaded_at timestamptz default now(),
  reviewed_at timestamptz
);

-- ─── BOOKINGS ───────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id),
  space_id uuid references public.kitchen_spaces(id),
  tenant_id uuid references public.profiles(id),
  membership_id uuid references public.memberships(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text check (status in ('pending','confirmed','cancelled','completed','no_show')) default 'pending',
  booking_type text check (booking_type in ('hourly','daily','monthly_block')) default 'hourly',
  subtotal_cents integer,
  platform_fee_cents integer,
  total_cents integer,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  notes text,
  equipment_ids uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── LEADS ──────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id),
  full_name text not null,
  email text not null,
  phone text,
  business_name text,
  business_type text,
  message text,
  source text,
  status text check (status in ('new','contacted','toured','converted','lost')) default 'new',
  notes text,
  follow_up_date date,
  assigned_to uuid references public.profiles(id),
  converted_membership_id uuid references public.memberships(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── INVOICES ───────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id),
  membership_id uuid references public.memberships(id),
  tenant_id uuid references public.profiles(id),
  invoice_number text unique not null,
  period_start date,
  period_end date,
  line_items jsonb not null default '[]',
  subtotal_cents integer not null,
  tax_cents integer default 0,
  total_cents integer not null,
  platform_fee_cents integer default 0,
  status text check (status in ('draft','sent','paid','overdue','void')) default 'draft',
  due_date date,
  stripe_invoice_id text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- ─── RECIPES ────────────────────────────────────────────────────────────
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id),
  name text not null,
  description text,
  yield_quantity numeric,
  yield_unit text,
  prep_time_minutes integer,
  cook_time_minutes integer,
  instructions text,
  ingredients jsonb not null default '[]',
  labor_minutes integer,
  labor_hourly_rate_cents integer,
  overhead_percent numeric default 15,
  target_margin_percent numeric default 35,
  selling_price_cents integer,
  cogs_cents integer,
  gross_margin_percent numeric,
  is_published boolean default false,
  tags text[],
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── PRODUCTS ───────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id),
  recipe_id uuid references public.recipes(id),
  name text not null,
  description text,
  price_cents integer not null,
  compare_at_price_cents integer,
  sku text,
  category text,
  tags text[],
  images jsonb default '[]',
  inventory_count integer,
  track_inventory boolean default false,
  is_active boolean default true,
  is_subscription_eligible boolean default false,
  subscription_interval text check (subscription_interval in ('weekly','biweekly','monthly')),
  stripe_product_id text,
  stripe_price_id text,
  allergens text[],
  ingredients_label text,
  net_weight text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ORDERS ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id),
  customer_email text not null,
  customer_name text,
  customer_phone text,
  order_number text unique not null,
  items jsonb not null default '[]',
  subtotal_cents integer,
  shipping_cents integer default 0,
  tax_cents integer default 0,
  platform_fee_cents integer,
  total_cents integer,
  status text check (status in ('pending','confirmed','preparing','ready','fulfilled','cancelled','refunded')) default 'pending',
  fulfillment_type text check (fulfillment_type in ('pickup','delivery','shipping','subscription')),
  fulfillment_date date,
  shipping_address jsonb,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz default now()
);

-- ─── GRANTS ─────────────────────────────────────────────────────────────
create table if not exists public.grants (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  funder text,
  grant_type text check (grant_type in ('federal','state','local','foundation','loan','other')),
  amount_min integer,
  amount_max integer,
  eligibility_criteria text,
  application_url text,
  deadline date,
  is_recurring boolean default false,
  target_states text[],
  target_business_types text[],
  is_active boolean default true,
  added_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ─── GRANT APPLICATIONS ─────────────────────────────────────────────────
create table if not exists public.grant_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id),
  grant_id uuid references public.grants(id),
  status text check (status in ('researching','drafting','submitted','awarded','rejected')) default 'researching',
  amount_requested integer,
  amount_awarded integer,
  submission_date date,
  notes text,
  created_at timestamptz default now()
);

-- ─── TENANT SITES ───────────────────────────────────────────────────────
create table if not exists public.tenant_sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id) unique,
  site_slug text unique not null,
  theme text default 'warm_artisan',
  hero_headline text,
  hero_subheadline text,
  hero_image_url text,
  about_text text,
  color_primary text default '#2D4A3E',
  color_secondary text default '#F5E6C8',
  font_heading text default 'Playfair Display',
  font_body text default 'Inter',
  show_products boolean default true,
  show_about boolean default true,
  show_contact boolean default true,
  show_social boolean default true,
  custom_domain text,
  is_published boolean default false,
  meta_title text,
  meta_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens(id),
  author_id uuid references public.profiles(id),
  title text not null,
  body text not null,
  is_pinned boolean default false,
  audience text check (audience in ('all','active_members','specific')) default 'all',
  created_at timestamptz default now()
);

-- ─── LEARNING RESOURCES ─────────────────────────────────────────────────
create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content_type text check (content_type in ('article','video','checklist','template','guide')),
  category text check (category in ('business_formation','food_safety','labeling_compliance','financial_planning','marketing','sales_channels','scaling','graduation_planning','grants_funding')),
  content_url text,
  content_body text,
  duration_minutes integer,
  is_free boolean default true,
  tags text[],
  created_at timestamptz default now()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text not null,
  body text,
  type text,
  is_read boolean default false,
  action_url text,
  created_at timestamptz default now()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────
create index if not exists idx_kitchens_operator on public.kitchens(operator_id);
create index if not exists idx_spaces_kitchen on public.kitchen_spaces(kitchen_id);
create index if not exists idx_memberships_kitchen on public.memberships(kitchen_id);
create index if not exists idx_memberships_tenant on public.memberships(tenant_id);
create index if not exists idx_bookings_kitchen on public.bookings(kitchen_id);
create index if not exists idx_bookings_tenant on public.bookings(tenant_id);
create index if not exists idx_bookings_start on public.bookings(start_time);
create index if not exists idx_leads_kitchen on public.leads(kitchen_id);
create index if not exists idx_invoices_kitchen on public.invoices(kitchen_id);
create index if not exists idx_recipes_tenant on public.recipes(tenant_id);
create index if not exists idx_products_tenant on public.products(tenant_id);
create index if not exists idx_orders_tenant on public.orders(tenant_id);
