-- ═══════════════════════════════════════════════════════════════════════
-- Culina — Row Level Security policies
-- ═══════════════════════════════════════════════════════════════════════

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: does the current user operate the given kitchen?
create or replace function public.operates_kitchen(k uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.kitchens where id = k and operator_id = auth.uid()
  );
$$;

-- Enable RLS on every table
alter table public.profiles            enable row level security;
alter table public.kitchens            enable row level security;
alter table public.kitchen_spaces      enable row level security;
alter table public.kitchen_equipment   enable row level security;
alter table public.memberships         enable row level security;
alter table public.tenant_profiles     enable row level security;
alter table public.compliance_documents enable row level security;
alter table public.bookings            enable row level security;
alter table public.leads               enable row level security;
alter table public.invoices            enable row level security;
alter table public.recipes             enable row level security;
alter table public.products            enable row level security;
alter table public.orders              enable row level security;
alter table public.grants              enable row level security;
alter table public.grant_applications  enable row level security;
alter table public.tenant_sites        enable row level security;
alter table public.announcements       enable row level security;
alter table public.learning_resources  enable row level security;
alter table public.notifications       enable row level security;

-- ─── PROFILES ───────────────────────────────────────────────────────────
create policy "profiles_self_read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_self_write" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ─── KITCHENS ───────────────────────────────────────────────────────────
create policy "kitchens_public_read" on public.kitchens
  for select using (is_listed = true or operator_id = auth.uid() or public.is_admin());
create policy "kitchens_operator_write" on public.kitchens
  for all using (operator_id = auth.uid() or public.is_admin())
  with check (operator_id = auth.uid() or public.is_admin());

-- ─── SPACES & EQUIPMENT ─────────────────────────────────────────────────
create policy "spaces_public_read" on public.kitchen_spaces
  for select using (true);
create policy "spaces_operator_write" on public.kitchen_spaces
  for all using (public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (public.operates_kitchen(kitchen_id) or public.is_admin());

create policy "equipment_public_read" on public.kitchen_equipment
  for select using (true);
create policy "equipment_operator_write" on public.kitchen_equipment
  for all using (public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── MEMBERSHIPS ────────────────────────────────────────────────────────
create policy "memberships_read" on public.memberships
  for select using (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin());
create policy "memberships_operator_write" on public.memberships
  for all using (public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── TENANT PROFILES ────────────────────────────────────────────────────
create policy "tenant_profiles_read" on public.tenant_profiles
  for select using (true); -- public storefronts need read
create policy "tenant_profiles_self_write" on public.tenant_profiles
  for all using (tenant_id = auth.uid() or public.is_admin())
  with check (tenant_id = auth.uid() or public.is_admin());

-- ─── COMPLIANCE DOCS ────────────────────────────────────────────────────
create policy "compliance_read" on public.compliance_documents
  for select using (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin());
create policy "compliance_tenant_write" on public.compliance_documents
  for insert with check (tenant_id = auth.uid());
create policy "compliance_operator_review" on public.compliance_documents
  for update using (public.operates_kitchen(kitchen_id) or tenant_id = auth.uid() or public.is_admin());

-- ─── BOOKINGS ───────────────────────────────────────────────────────────
create policy "bookings_read" on public.bookings
  for select using (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin());
create policy "bookings_write" on public.bookings
  for all using (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── LEADS ──────────────────────────────────────────────────────────────
create policy "leads_operator_read" on public.leads
  for select using (public.operates_kitchen(kitchen_id) or public.is_admin());
create policy "leads_public_insert" on public.leads
  for insert with check (true); -- public lead intake forms
create policy "leads_operator_write" on public.leads
  for update using (public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── INVOICES ───────────────────────────────────────────────────────────
create policy "invoices_read" on public.invoices
  for select using (tenant_id = auth.uid() or public.operates_kitchen(kitchen_id) or public.is_admin());
create policy "invoices_operator_write" on public.invoices
  for all using (public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── RECIPES ────────────────────────────────────────────────────────────
create policy "recipes_owner" on public.recipes
  for all using (tenant_id = auth.uid() or public.is_admin())
  with check (tenant_id = auth.uid() or public.is_admin());

-- ─── PRODUCTS ───────────────────────────────────────────────────────────
create policy "products_public_read" on public.products
  for select using (is_active = true or tenant_id = auth.uid() or public.is_admin());
create policy "products_owner_write" on public.products
  for all using (tenant_id = auth.uid() or public.is_admin())
  with check (tenant_id = auth.uid() or public.is_admin());

-- ─── ORDERS ─────────────────────────────────────────────────────────────
create policy "orders_owner_read" on public.orders
  for select using (tenant_id = auth.uid() or public.is_admin());
create policy "orders_public_insert" on public.orders
  for insert with check (true); -- storefront checkout
create policy "orders_owner_write" on public.orders
  for update using (tenant_id = auth.uid() or public.is_admin());

-- ─── GRANTS ─────────────────────────────────────────────────────────────
create policy "grants_public_read" on public.grants
  for select using (true);
create policy "grants_admin_write" on public.grants
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── GRANT APPLICATIONS ─────────────────────────────────────────────────
create policy "grant_apps_owner" on public.grant_applications
  for all using (tenant_id = auth.uid() or public.is_admin())
  with check (tenant_id = auth.uid() or public.is_admin());

-- ─── TENANT SITES ───────────────────────────────────────────────────────
create policy "sites_public_read" on public.tenant_sites
  for select using (is_published = true or tenant_id = auth.uid() or public.is_admin());
create policy "sites_owner_write" on public.tenant_sites
  for all using (tenant_id = auth.uid() or public.is_admin())
  with check (tenant_id = auth.uid() or public.is_admin());

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────
create policy "announcements_read" on public.announcements
  for select using (
    public.operates_kitchen(kitchen_id)
    or exists (select 1 from public.memberships m where m.kitchen_id = announcements.kitchen_id and m.tenant_id = auth.uid())
    or public.is_admin()
  );
create policy "announcements_operator_write" on public.announcements
  for all using (public.operates_kitchen(kitchen_id) or public.is_admin())
  with check (public.operates_kitchen(kitchen_id) or public.is_admin());

-- ─── LEARNING RESOURCES ─────────────────────────────────────────────────
create policy "learning_public_read" on public.learning_resources
  for select using (true);
create policy "learning_admin_write" on public.learning_resources
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
