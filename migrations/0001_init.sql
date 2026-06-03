-- ═══════════════════════════════════════════════════════════════════════
-- Culina — Cloudflare D1 (SQLite) schema
-- 100% Cloudflare: D1 for data, R2 for files, Worker JWT for auth.
-- Access control is enforced in the Worker (no RLS in SQLite). Booleans are
-- integers (0/1); JSON columns store stringified JSON; timestamps are ISO text.
-- ═══════════════════════════════════════════════════════════════════════

-- Auth credentials (replaces Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL CHECK (role IN ('operator','tenant','admin')),
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kitchens (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT, city TEXT, state TEXT, zip TEXT,
  phone TEXT, email TEXT, website TEXT,
  logo_url TEXT, cover_image_url TEXT,
  amenities TEXT DEFAULT '[]',
  health_permit_number TEXT,
  stripe_account_id TEXT,
  stripe_onboarded INTEGER DEFAULT 0,
  monthly_price_cents INTEGER DEFAULT 4900,
  is_listed INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kitchen_spaces (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  name TEXT NOT NULL,
  space_type TEXT CHECK (space_type IN ('prep_station','oven_bay','cold_storage','dry_storage','equipment','full_kitchen','room','other')),
  description TEXT,
  hourly_rate_cents INTEGER, daily_rate_cents INTEGER, monthly_rate_cents INTEGER,
  capacity_persons INTEGER DEFAULT 1,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kitchen_equipment (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hourly_rate_cents INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','active','suspended','graduated')) DEFAULT 'pending',
  membership_type TEXT CHECK (membership_type IN ('hourly','monthly','annual')) DEFAULT 'hourly',
  monthly_hours_included INTEGER,
  hourly_overage_rate_cents INTEGER,
  start_date TEXT, end_date TEXT,
  stripe_subscription_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE,
  business_name TEXT, business_slug TEXT UNIQUE, business_type TEXT,
  description TEXT, logo_url TEXT, banner_url TEXT,
  instagram_url TEXT, facebook_url TEXT, website_url TEXT,
  stripe_account_id TEXT, stripe_onboarded INTEGER DEFAULT 0,
  ein TEXT, legal_entity_type TEXT, state_of_formation TEXT,
  annual_revenue_estimate INTEGER, years_in_operation INTEGER,
  graduation_target_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id TEXT PRIMARY KEY,
  membership_id TEXT, tenant_id TEXT, kitchen_id TEXT,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('food_handler_cert','business_license','health_permit','liability_insurance','kitchen_agreement','cottage_food_permit','llc_formation','ein_letter','other')),
  doc_name TEXT, file_url TEXT, expiration_date TEXT,
  status TEXT CHECK (status IN ('pending_review','approved','expired','rejected')) DEFAULT 'pending_review',
  reviewer_notes TEXT,
  uploaded_at TEXT NOT NULL, reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT, space_id TEXT, tenant_id TEXT, membership_id TEXT,
  start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')) DEFAULT 'pending',
  booking_type TEXT CHECK (booking_type IN ('hourly','daily','monthly_block')) DEFAULT 'hourly',
  subtotal_cents INTEGER, platform_fee_cents INTEGER, total_cents INTEGER,
  stripe_payment_intent_id TEXT, stripe_charge_id TEXT,
  notes TEXT, equipment_ids TEXT DEFAULT '[]',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT,
  full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  business_name TEXT, business_type TEXT, message TEXT, source TEXT,
  status TEXT CHECK (status IN ('new','contacted','toured','converted','lost')) DEFAULT 'new',
  notes TEXT, follow_up_date TEXT, assigned_to TEXT, converted_membership_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT, membership_id TEXT, tenant_id TEXT,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start TEXT, period_end TEXT,
  line_items TEXT NOT NULL DEFAULT '[]',
  subtotal_cents INTEGER NOT NULL, tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL, platform_fee_cents INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('draft','sent','paid','overdue','void')) DEFAULT 'draft',
  due_date TEXT, stripe_invoice_id TEXT, paid_at TEXT, notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT NOT NULL, description TEXT,
  yield_quantity REAL, yield_unit TEXT,
  prep_time_minutes INTEGER, cook_time_minutes INTEGER,
  instructions TEXT, ingredients TEXT NOT NULL DEFAULT '[]',
  labor_minutes INTEGER, labor_hourly_rate_cents INTEGER,
  overhead_percent REAL DEFAULT 15, target_margin_percent REAL DEFAULT 35,
  selling_price_cents INTEGER, cogs_cents INTEGER, gross_margin_percent REAL,
  is_published INTEGER DEFAULT 0, tags TEXT DEFAULT '[]', image_url TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT, recipe_id TEXT,
  name TEXT NOT NULL, description TEXT,
  price_cents INTEGER NOT NULL, compare_at_price_cents INTEGER,
  sku TEXT, category TEXT, tags TEXT DEFAULT '[]', images TEXT DEFAULT '[]',
  inventory_count INTEGER, track_inventory INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1, is_subscription_eligible INTEGER DEFAULT 0,
  subscription_interval TEXT CHECK (subscription_interval IN ('weekly','biweekly','monthly')),
  stripe_product_id TEXT, stripe_price_id TEXT,
  allergens TEXT DEFAULT '[]', ingredients_label TEXT, net_weight TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  customer_email TEXT NOT NULL, customer_name TEXT, customer_phone TEXT,
  order_number TEXT NOT NULL UNIQUE,
  items TEXT NOT NULL DEFAULT '[]',
  subtotal_cents INTEGER, shipping_cents INTEGER DEFAULT 0, tax_cents INTEGER DEFAULT 0,
  platform_fee_cents INTEGER, total_cents INTEGER,
  status TEXT CHECK (status IN ('pending','confirmed','preparing','ready','fulfilled','cancelled','refunded')) DEFAULT 'pending',
  fulfillment_type TEXT CHECK (fulfillment_type IN ('pickup','delivery','shipping','subscription')),
  fulfillment_date TEXT, shipping_address TEXT,
  stripe_payment_intent_id TEXT, stripe_subscription_id TEXT, notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, description TEXT, funder TEXT,
  grant_type TEXT CHECK (grant_type IN ('federal','state','local','foundation','loan','other')),
  amount_min INTEGER, amount_max INTEGER, eligibility_criteria TEXT,
  application_url TEXT, deadline TEXT, is_recurring INTEGER DEFAULT 0,
  target_states TEXT, target_business_types TEXT,
  is_active INTEGER DEFAULT 1, added_by TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL, description TEXT,
  content_type TEXT CHECK (content_type IN ('article','video','checklist','template','guide')),
  category TEXT,
  content_url TEXT, content_body TEXT, duration_minutes INTEGER,
  is_free INTEGER DEFAULT 1, tags TEXT DEFAULT '[]', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT, author_id TEXT,
  title TEXT NOT NULL, body TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  audience TEXT CHECK (audience IN ('all','active_members','specific')) DEFAULT 'all',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_sites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE,
  site_slug TEXT NOT NULL UNIQUE,
  theme TEXT DEFAULT 'warm_artisan',
  hero_headline TEXT, hero_subheadline TEXT, hero_image_url TEXT, about_text TEXT,
  color_primary TEXT DEFAULT '#2D4A3E', color_secondary TEXT DEFAULT '#F5E6C8',
  font_heading TEXT DEFAULT 'Playfair Display', font_body TEXT DEFAULT 'Inter',
  show_products INTEGER DEFAULT 1, show_about INTEGER DEFAULT 1,
  show_contact INTEGER DEFAULT 1, show_social INTEGER DEFAULT 1,
  custom_domain TEXT, is_published INTEGER DEFAULT 0,
  meta_title TEXT, meta_description TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT, title TEXT NOT NULL, body TEXT, type TEXT,
  is_read INTEGER DEFAULT 0, action_url TEXT, created_at TEXT NOT NULL
);

-- ─── New feature tables (Tier 1–3 gaps) ─────────────────────────────────

-- Tier 1: Access control / smart locks
CREATE TABLE IF NOT EXISTS access_credentials (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL, tenant_id TEXT,
  lock_name TEXT NOT NULL, provider TEXT,
  code TEXT, status TEXT CHECK (status IN ('active','revoked','expired')) DEFAULT 'active',
  schedule TEXT, last_used TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS access_events (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT NOT NULL, tenant_id TEXT, lock_name TEXT,
  event TEXT, created_at TEXT NOT NULL
);

-- Tier 2: Mentor matching
CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, expertise TEXT, bio TEXT,
  availability TEXT, rate TEXT, avatar_emoji TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mentor_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL, mentor_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('requested','accepted','completed','declined')) DEFAULT 'requested',
  message TEXT, created_at TEXT NOT NULL
);

-- Tier 2: Email marketing list
CREATE TABLE IF NOT EXISTS email_subscribers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL, email TEXT NOT NULL, name TEXT,
  source TEXT, created_at TEXT NOT NULL
);

-- Tier 3: Peer-to-peer marketplace / classifieds
CREATE TABLE IF NOT EXISTS classifieds (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT, author_tenant_id TEXT,
  kind TEXT CHECK (kind IN ('ingredient','packaging','equipment_time','collab','other')) DEFAULT 'other',
  listing_type TEXT CHECK (listing_type IN ('offer','request')) DEFAULT 'offer',
  title TEXT NOT NULL, description TEXT, price_cents INTEGER,
  status TEXT CHECK (status IN ('active','closed')) DEFAULT 'active',
  created_at TEXT NOT NULL
);

-- Tier 3: Community feed posts (operator + tenant)
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  kitchen_id TEXT, author_id TEXT, author_name TEXT,
  kind TEXT CHECK (kind IN ('post','spotlight','question')) DEFAULT 'post',
  body TEXT NOT NULL, created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kitchens_operator ON kitchens(operator_id);
CREATE INDEX IF NOT EXISTS idx_spaces_kitchen ON kitchen_spaces(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_memberships_kitchen ON memberships(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_bookings_kitchen ON bookings(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classifieds_kitchen ON classifieds(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_access_kitchen ON access_credentials(kitchen_id);
