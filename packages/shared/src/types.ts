/** Domain types mirroring the Supabase schema. */

export type UserRole = 'operator' | 'tenant' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface Kitchen {
  id: string;
  operator_id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  amenities: string[];
  health_permit_number: string | null;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  monthly_price_cents: number;
  is_listed: boolean;
  /** Geo coordinates for the discovery map (optional; nullable when ungeocoded). */
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export type SpaceType =
  | 'prep_station'
  | 'oven_bay'
  | 'cold_storage'
  | 'dry_storage'
  | 'equipment'
  | 'full_kitchen'
  | 'room'
  | 'other';

export interface KitchenSpace {
  id: string;
  kitchen_id: string;
  name: string;
  space_type: SpaceType;
  description: string | null;
  hourly_rate_cents: number | null;
  daily_rate_cents: number | null;
  monthly_rate_cents: number | null;
  capacity_persons: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface KitchenEquipment {
  id: string;
  kitchen_id: string;
  name: string;
  hourly_rate_cents: number;
  quantity: number;
  is_active: boolean;
}

export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'graduated';
export type MembershipType = 'hourly' | 'monthly' | 'annual';

export interface Membership {
  id: string;
  kitchen_id: string;
  tenant_id: string;
  status: MembershipStatus;
  membership_type: MembershipType;
  monthly_hours_included: number | null;
  hourly_overage_rate_cents: number | null;
  start_date: string | null;
  end_date: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantProfile {
  id: string;
  tenant_id: string;
  business_name: string | null;
  business_slug: string | null;
  business_type: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  ein: string | null;
  legal_entity_type: string | null;
  state_of_formation: string | null;
  annual_revenue_estimate: number | null;
  years_in_operation: number | null;
  graduation_target_date: string | null;
  created_at: string;
  updated_at: string;
}

export type DocType =
  | 'food_handler_cert'
  | 'business_license'
  | 'health_permit'
  | 'liability_insurance'
  | 'kitchen_agreement'
  | 'cottage_food_permit'
  | 'llc_formation'
  | 'ein_letter'
  | 'other';

export type DocStatus = 'pending_review' | 'approved' | 'expired' | 'rejected';

export interface ComplianceDocument {
  id: string;
  membership_id: string | null;
  tenant_id: string | null;
  kitchen_id: string | null;
  doc_type: DocType;
  doc_name: string | null;
  file_url: string | null;
  expiration_date: string | null;
  status: DocStatus;
  reviewer_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BookingType = 'hourly' | 'daily' | 'monthly_block';

export interface Booking {
  id: string;
  kitchen_id: string;
  space_id: string | null;
  tenant_id: string;
  membership_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  booking_type: BookingType;
  subtotal_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  notes: string | null;
  equipment_ids: string[];
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'toured' | 'converted' | 'lost';

export interface Lead {
  id: string;
  kitchen_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
  converted_membership_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface Invoice {
  id: string;
  kitchen_id: string;
  membership_id: string | null;
  tenant_id: string;
  invoice_number: string;
  period_start: string | null;
  period_end: string | null;
  line_items: InvoiceLineItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  platform_fee_cents: number;
  status: InvoiceStatus;
  due_date: string | null;
  stripe_invoice_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  yield_quantity: number | null;
  yield_unit: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  instructions: string | null;
  ingredients: RecipeIngredient[];
  labor_minutes: number | null;
  labor_hourly_rate_cents: number | null;
  overhead_percent: number;
  target_margin_percent: number;
  selling_price_cents: number | null;
  cogs_cents: number | null;
  gross_margin_percent: number | null;
  is_published: boolean;
  tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly';

export interface Product {
  id: string;
  tenant_id: string;
  recipe_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  sku: string | null;
  category: string | null;
  tags: string[];
  images: string[];
  inventory_count: number | null;
  track_inventory: boolean;
  is_active: boolean;
  is_subscription_eligible: boolean;
  subscription_interval: SubscriptionInterval | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  allergens: string[];
  ingredients_label: string | null;
  net_weight: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  price_cents: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'fulfilled'
  | 'cancelled'
  | 'refunded';
export type FulfillmentType = 'pickup' | 'delivery' | 'shipping' | 'subscription';

export interface Order {
  id: string;
  tenant_id: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_number: string;
  items: OrderItem[];
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  status: OrderStatus;
  fulfillment_type: FulfillmentType | null;
  fulfillment_date: string | null;
  shipping_address: Record<string, unknown> | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  created_at: string;
}

export type GrantType = 'federal' | 'state' | 'local' | 'foundation' | 'loan' | 'other';

export interface Grant {
  id: string;
  title: string;
  description: string | null;
  funder: string | null;
  grant_type: GrantType;
  amount_min: number | null;
  amount_max: number | null;
  eligibility_criteria: string | null;
  application_url: string | null;
  deadline: string | null;
  is_recurring: boolean;
  target_states: string[] | null;
  target_business_types: string[] | null;
  is_active: boolean;
  added_by: string | null;
  created_at: string;
}

export type GrantApplicationStatus = 'researching' | 'drafting' | 'submitted' | 'awarded' | 'rejected';

export interface GrantApplication {
  id: string;
  tenant_id: string;
  grant_id: string;
  status: GrantApplicationStatus;
  amount_requested: number | null;
  amount_awarded: number | null;
  submission_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface TenantSite {
  id: string;
  tenant_id: string;
  site_slug: string;
  theme: string;
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_image_url: string | null;
  about_text: string | null;
  color_primary: string;
  color_secondary: string;
  font_heading: string;
  font_body: string;
  show_products: boolean;
  show_about: boolean;
  show_contact: boolean;
  show_social: boolean;
  custom_domain: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  kitchen_id: string;
  author_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  audience: 'all' | 'active_members' | 'specific';
  created_at: string;
}

export type LearningCategory =
  | 'business_formation'
  | 'food_safety'
  | 'labeling_compliance'
  | 'financial_planning'
  | 'marketing'
  | 'sales_channels'
  | 'scaling'
  | 'graduation_planning'
  | 'grants_funding';

export interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  content_type: 'article' | 'video' | 'checklist' | 'template' | 'guide';
  category: LearningCategory;
  content_url: string | null;
  content_body: string | null;
  duration_minutes: number | null;
  is_free: boolean;
  tags: string[];
  created_at: string;
}

// ─── Tier 1: Access control / smart locks ──────────────────────────────
export interface AccessCredential {
  id: string;
  kitchen_id: string;
  tenant_id: string | null;
  lock_name: string;
  provider: string | null;
  code: string | null;
  status: 'active' | 'revoked' | 'expired';
  schedule: string | null;
  last_used: string | null;
  created_at: string;
}

export interface AccessEvent {
  id: string;
  kitchen_id: string;
  tenant_id: string | null;
  lock_name: string | null;
  event: string;
  created_at: string;
}

// ─── Tier 2: Mentor matching ────────────────────────────────────────────
export interface Mentor {
  id: string;
  name: string;
  expertise: string;
  bio: string;
  availability: string;
  rate: string;
  avatar_emoji: string;
  created_at: string;
}

export interface MentorRequest {
  id: string;
  tenant_id: string;
  mentor_id: string;
  status: 'requested' | 'accepted' | 'completed' | 'declined';
  message: string | null;
  created_at: string;
}

// ─── Tier 2: Email marketing list ───────────────────────────────────────
export interface EmailSubscriber {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
}

// ─── Tier 3: Peer-to-peer marketplace / classifieds ─────────────────────
export interface Classified {
  id: string;
  kitchen_id: string | null;
  author_tenant_id: string | null;
  kind: 'ingredient' | 'packaging' | 'equipment_time' | 'collab' | 'other';
  listing_type: 'offer' | 'request';
  title: string;
  description: string | null;
  price_cents: number | null;
  status: 'active' | 'closed';
  created_at: string;
}

// ─── Tier 3: Community feed ─────────────────────────────────────────────
export interface CommunityPost {
  id: string;
  kitchen_id: string | null;
  author_id: string | null;
  author_name: string | null;
  kind: 'post' | 'spotlight' | 'question';
  body: string;
  created_at: string;
}

// ─── Revenue model ──────────────────────────────────────────────────────
export interface MarketplaceTransaction {
  id: string;
  kitchen_id: string | null;
  classified_id: string | null;
  description: string;
  amount_cents: number;
  commission_cents: number;
  created_at: string;
}

export interface ReferralPartner {
  id: string;
  name: string;
  partner_type: 'cdfi' | 'lender' | 'insurer' | 'grantor';
  description: string;
  url: string | null;
  revenue_share_percent: number;
}

export interface WhiteLabelConfig {
  id: string;
  org_name: string;
  brand_name: string;
  primary_color: string;
  logo_url: string | null;
  custom_domain: string | null;
  plan: 'pilot' | 'standard' | 'enterprise';
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}
