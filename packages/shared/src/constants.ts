/** Culina platform-wide constants. */

/** The platform transaction fee Culina takes on bookings & storefront sales. */
export const PLATFORM_FEE_PERCENT = 1.5;

/** Commission Culina takes on peer-to-peer marketplace transactions. */
export const MARKETPLACE_COMMISSION_PERCENT = 5;

/** Referral fee share Culina earns when a tenant is funded via a partner. */
export const GRANT_REFERRAL_FEE_PERCENT = 2;

/** Monthly price for a white-label license (universities, municipalities, nonprofits). */
export const WHITE_LABEL_PRICE_CENTS = 49900;

export const REVENUE_STREAMS = [
  { id: 'transaction', label: 'Transaction fees', desc: '1.5% on bookings & storefront sales' },
  { id: 'subscription', label: 'Operator subscriptions', desc: '$19–$199 / mo per kitchen' },
  { id: 'tenant_pro', label: 'Maker Pro', desc: '$9 / mo premium tools' },
  { id: 'marketplace', label: 'Marketplace commissions', desc: '5% on peer-to-peer + co-packing' },
  { id: 'referral', label: 'Grant & capital referrals', desc: 'Revenue share with CDFI / lenders' },
  { id: 'white_label', label: 'White-label licensing', desc: '$499 / mo branded platform' },
] as const;

export const BRAND = {
  name: 'Culina',
  tagline: 'Where food businesses are born and grow',
  heroLine: 'The kitchen is ready. Is your food business?',
} as const;

export const COLORS = {
  primaryGreen: '#2D4A3E',
  secondaryCream: '#F5E6C8',
  accentGold: '#C8963E',
  lightGray: '#F8F9FA',
  textDark: '#1A1A1A',
  textMedium: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const OPERATOR_PLANS = [
  { id: 'starter', name: 'Starter', priceCents: 1900, tenants: 'Up to 10 tenants' },
  { id: 'growth', name: 'Growth', priceCents: 4900, tenants: 'Up to 30 tenants' },
  { id: 'pro', name: 'Pro', priceCents: 9900, tenants: 'Unlimited tenants' },
  { id: 'enterprise', name: 'Enterprise', priceCents: 19900, tenants: 'Unlimited + multi-kitchen' },
] as const;

export const TENANT_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    priceCents: 0,
    features: ['Booking', 'Compliance docs', 'Storefront', 'Recipe lab'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 900,
    features: ['Everything in Basic', 'AI tools', 'Grant finder', 'Business plan builder', 'Premium themes'],
  },
] as const;

export const SPACE_TYPES = [
  'prep_station',
  'oven_bay',
  'cold_storage',
  'dry_storage',
  'equipment',
  'full_kitchen',
  'room',
  'other',
] as const;

export const SPACE_TYPE_LABELS: Record<string, string> = {
  prep_station: 'Prep Station',
  oven_bay: 'Oven Bay',
  cold_storage: 'Cold Storage',
  dry_storage: 'Dry Storage',
  equipment: 'Equipment',
  full_kitchen: 'Full Kitchen',
  room: 'Room',
  other: 'Other',
};

export const DOC_TYPES = [
  'food_handler_cert',
  'business_license',
  'health_permit',
  'liability_insurance',
  'kitchen_agreement',
  'cottage_food_permit',
  'llc_formation',
  'ein_letter',
  'other',
] as const;

export const DOC_TYPE_LABELS: Record<string, string> = {
  food_handler_cert: 'Food Handler Cert',
  business_license: 'Business License',
  health_permit: 'Health Permit',
  liability_insurance: 'Liability Insurance',
  kitchen_agreement: 'Kitchen Agreement',
  cottage_food_permit: 'Cottage Food Permit',
  llc_formation: 'LLC Formation',
  ein_letter: 'EIN Letter',
  other: 'Other',
};

export const LEAD_STAGES = ['new', 'contacted', 'toured', 'converted', 'lost'] as const;

export const LEARNING_CATEGORIES = [
  'business_formation',
  'food_safety',
  'labeling_compliance',
  'financial_planning',
  'marketing',
  'sales_channels',
  'scaling',
  'graduation_planning',
  'grants_funding',
] as const;
