-- ═══════════════════════════════════════════════════════════════════════
-- Culina — seed data for local development & demos
-- NOTE: auth.users rows must be created via Supabase Auth (or the dashboard)
-- before running this. The UUIDs below are illustrative — replace the
-- profile IDs with the real auth.users IDs once accounts exist.
--
-- Demo accounts to create in Supabase Auth:
--   demo@operator.culina.app  / demo1234   (operator)
--   sara@tenant.culina.app    / demo1234   (tenant)
--   marco@tenant.culina.app   / demo1234   (tenant)
--   amara@tenant.culina.app   / demo1234   (tenant)
-- ═══════════════════════════════════════════════════════════════════════

-- Fixed UUIDs so relations line up
-- operator
\set op_id    '11111111-1111-1111-1111-111111111111'
\set t_sara   '22222222-2222-2222-2222-222222222222'
\set t_marco  '33333333-3333-3333-3333-333333333333'
\set t_amara  '44444444-4444-4444-4444-444444444444'
\set kitchen  '55555555-5555-5555-5555-555555555555'

insert into public.profiles (id, email, full_name, role) values
  (:'op_id',   'demo@operator.culina.app', 'Dana Operator', 'operator'),
  (:'t_sara',  'sara@tenant.culina.app',   'Sara Bakes',    'tenant'),
  (:'t_marco', 'marco@tenant.culina.app',  'Marco Salsa',   'tenant'),
  (:'t_amara', 'amara@tenant.culina.app',  'Amara Foods',   'tenant')
on conflict (id) do nothing;

insert into public.kitchens (id, operator_id, name, slug, description, address, city, state, zip, phone, email, amenities, monthly_price_cents, is_listed, stripe_onboarded) values
  (:'kitchen', :'op_id', 'Midwest Food Hub', 'midwest-food-hub',
   'A 6,000 sq ft licensed shared commercial kitchen in the heart of Minneapolis, built for bakers, caterers, and meal-prep entrepreneurs.',
   '1200 Harvest Ave', 'Minneapolis', 'MN', '55401', '(612) 555-0142', 'hello@midwestfoodhub.com',
   '["Walk-in cooler","Three-compartment sinks","Dry storage","Dish pit","Loading dock","Free parking","24/7 access"]'::jsonb,
   4900, true, true)
on conflict (id) do nothing;

insert into public.kitchen_spaces (kitchen_id, name, space_type, description, hourly_rate_cents, daily_rate_cents, monthly_rate_cents, capacity_persons) values
  (:'kitchen', 'Prep Station A',     'prep_station', '12 ft stainless prep table with reach-in cooler', 2500, 18000, 60000, 2),
  (:'kitchen', 'Prep Station B',     'prep_station', '10 ft prep table near the dish pit',              2500, 18000, 60000, 2),
  (:'kitchen', 'Cold Storage Bay 1', 'cold_storage', 'Dedicated walk-in shelf, lock-box included',      800,  5000,  25000, 1)
on conflict do nothing;

insert into public.kitchen_equipment (kitchen_id, name, hourly_rate_cents, quantity) values
  (:'kitchen', '60 Qt Hobart Mixer', 1500, 1),
  (:'kitchen', 'Tilt Skillet',       1200, 1),
  (:'kitchen', 'Blast Chiller',      1000, 1),
  (:'kitchen', 'Convection Oven',    900,  2)
on conflict do nothing;

insert into public.memberships (kitchen_id, tenant_id, status, membership_type, monthly_hours_included, hourly_overage_rate_cents, start_date) values
  (:'kitchen', :'t_sara',  'active',    'monthly', 40, 2500, '2025-09-01'),
  (:'kitchen', :'t_marco', 'active',    'hourly',  null, null, '2026-01-15'),
  (:'kitchen', :'t_amara', 'pending',   'hourly',  null, null, null)
on conflict do nothing;

insert into public.tenant_profiles (tenant_id, business_name, business_slug, business_type, description, years_in_operation, annual_revenue_estimate) values
  (:'t_sara',  'Sara''s Sourdough', 'saras-sourdough', 'bakery',  'Naturally-leavened sourdough breads and pastries baked fresh weekly.', 2, 38000),
  (:'t_marco', 'Marco''s Salsa Co', 'marcos-salsa',    'packaged', 'Small-batch fire-roasted salsas using locally grown peppers.', 1, 22000),
  (:'t_amara', 'Amara Catering',    'amara-catering',  'caterer', 'West African inspired catering for events across the Twin Cities.', 3, 51000)
on conflict do nothing;

insert into public.grants (title, description, funder, grant_type, amount_min, amount_max, application_url, target_states) values
  ('USDA Value-Added Producer Grant', 'Helps producers add value to raw commodities.', 'USDA Rural Development', 'federal', 50000, 250000, 'https://www.rd.usda.gov', null),
  ('SBA Microloan Program', 'Loans up to $50k for small businesses and certain non-profit childcare centers.', 'U.S. Small Business Administration', 'loan', 5000, 50000, 'https://www.sba.gov/funding-programs/loans/microloans', null),
  ('Minnesota Emerging Entrepreneur Loan', 'Supports minority- and women-owned small businesses in MN.', 'MN DEED', 'state', 5000, 150000, 'https://mn.gov/deed', '{"MN"}'),
  ('FINNEGAN Foundation Food Innovation', 'Annual grant for food entrepreneurs improving community food access.', 'Finnegan Foundation', 'foundation', 10000, 25000, 'https://example.org/grant', null),
  ('Local First Microgrant', 'City of Minneapolis storefront support microgrant.', 'City of Minneapolis', 'local', 1000, 10000, 'https://minneapolismn.gov', '{"MN"}'),
  ('Hot Bread Kitchen Catalyst', 'Funding + mentorship for women food entrepreneurs.', 'Hot Bread Kitchen', 'foundation', 5000, 20000, 'https://hotbreadkitchen.org', null),
  ('Kiva Crowdfunded Loan', '0% interest crowdfunded microloans.', 'Kiva', 'loan', 1000, 15000, 'https://kiva.org', null),
  ('Comcast RISE Investment Fund', 'Grants for small businesses owned by people of color.', 'Comcast', 'foundation', 5000, 5000, 'https://comcastrise.com', null),
  ('USDA Farmers Market Promotion', 'Grows direct producer-to-consumer markets.', 'USDA AMS', 'federal', 50000, 100000, 'https://www.ams.usda.gov', null),
  ('Regional CDFI Working Capital', 'Flexible working capital from a community development financial institution.', 'Local CDFI', 'loan', 10000, 100000, 'https://example.org/cdfi', '{"MN","WI","IA"}')
on conflict do nothing;

insert into public.learning_resources (title, description, content_type, category, duration_minutes, is_free) values
  ('How to Form an LLC for Your Food Business', 'Step-by-step LLC formation walkthrough.', 'guide', 'business_formation', 15, true),
  ('ServSafe Food Handler Basics', 'Core food safety concepts every kitchen tenant must know.', 'article', 'food_safety', 20, true),
  ('FDA Nutrition Facts Label Requirements', 'What must appear on a packaged food label.', 'checklist', 'labeling_compliance', 10, true),
  ('Pricing for Profit: COGS & Margins', 'Turn recipe costs into sustainable pricing.', 'article', 'financial_planning', 18, true),
  ('Instagram for Food Brands', 'Grow a following and convert it into orders.', 'video', 'marketing', 25, true),
  ('Getting Into Farmers Markets', 'Application tips and what buyers look for.', 'guide', 'sales_channels', 12, true),
  ('From Kitchen to Co-Packer', 'When and how to scale beyond a shared kitchen.', 'guide', 'scaling', 22, false),
  ('Graduation Readiness Checklist', 'Signs you''re ready for your own facility.', 'checklist', 'graduation_planning', 8, true)
on conflict do nothing;

insert into public.announcements (kitchen_id, author_id, title, body, is_pinned) values
  (:'kitchen', :'op_id', 'Walk-in cooler maintenance Friday', 'The walk-in will be serviced Friday 6–8am. Please plan cold storage accordingly.', true),
  (:'kitchen', :'op_id', 'New blast chiller available', 'We added a second blast chiller — book it from the equipment add-ons.', false)
on conflict do nothing;
