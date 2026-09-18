-- ============================================
-- IMPORT PRE_ORDERS - SUPABASE DATABASE SCHEMA
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- USER PROFILES
-- Connected to Supabase Authentication users
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,

  username text unique,

  phone text,

  role text not null default 'customer'
    check (role in ('customer', 'admin')),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- ============================================
-- PRODUCT CATALOG
-- ============================================

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),

  name text not null,

  slug text not null unique,

  category text not null,

  subcategory text,

  description text not null,

  price numeric(12, 2) not null default 0
    check (price >= 0),

  currency text not null default 'USD',

  estimated_shipping numeric(12, 2) not null default 0
    check (estimated_shipping >= 0),

  stock_status text not null default 'preorder'
    check (stock_status in ('preorder', 'available', 'sold_out')),

  featured boolean not null default false,

  active boolean not null default true,

  created_by uuid references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- ============================================
-- PRODUCT MEDIA
-- Supports multiple images and videos
-- Files themselves will be stored in Supabase Storage
-- ============================================

create table if not exists public.product_media (
  id uuid primary key default uuid_generate_v4(),

  product_id uuid not null references public.products(id)
    on delete cascade,

  media_type text not null
    check (media_type in ('image', 'video')),

  storage_path text not null,

  public_url text,

  alt_text text,

  sort_order integer not null default 0,

  is_primary boolean not null default false,

  created_at timestamptz not null default now()
);

-- ============================================
-- VIDEO ADVERTISEMENTS
-- Admin can select one advert as active
-- ============================================

create table if not exists public.adverts (
  id uuid primary key default uuid_generate_v4(),

  title text not null,

  video_storage_path text not null,

  video_url text,

  caption text,

  active boolean not null default false,

  created_by uuid references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- ============================================
-- ORDERS
-- Orders can come from the website or WhatsApp
-- ============================================

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),

  order_number text not null unique,

  customer_id uuid references public.profiles(id)
    on delete set null,

  client_name text not null,

  username text,

  contact text not null,

  source text not null default 'website'
    check (source in ('website', 'whatsapp', 'instagram', 'facebook', 'tiktok')),

  destination text not null,

  subtotal numeric(12, 2) not null default 0
    check (subtotal >= 0),

  shipping_total numeric(12, 2) not null default 0
    check (shipping_total >= 0),

  total numeric(12, 2) not null default 0
    check (total >= 0),

  status text not null default 'new'
    check (status in ('new', 'confirmed', 'fulfilled', 'cancelled')),

  notes text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- ============================================
-- ORDER ITEMS
-- Stores the products and quantities in each order
-- ============================================

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),

  order_id uuid not null references public.orders(id)
    on delete cascade,

  product_id uuid references public.products(id)
    on delete set null,

  product_name text not null,

  quantity integer not null default 1
    check (quantity > 0),

  unit_price numeric(12, 2) not null default 0
    check (unit_price >= 0),

  estimated_shipping numeric(12, 2) not null default 0
    check (estimated_shipping >= 0),

  line_total numeric(12, 2) not null default 0
    check (line_total >= 0),

  created_at timestamptz not null default now()
);

-- ============================================
-- UPDATED_AT FUNCTION
-- ============================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at();

drop trigger if exists products_updated_at on public.products;

create trigger products_updated_at
before update on public.products
for each row
execute function public.update_updated_at();

drop trigger if exists adverts_updated_at on public.adverts;

create trigger adverts_updated_at
before update on public.adverts
for each row
execute function public.update_updated_at();

drop trigger if exists orders_updated_at on public.orders;

create trigger orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at();

-- ============================================
-- CREATE PROFILE WHEN A USER SIGNS UP
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    username,
    phone
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================
-- ADMIN CHECK FUNCTION
-- ============================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.adverts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- ============================================
-- PROFILE POLICIES
-- ============================================

drop policy if exists "Users can view their own profile"
on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Users can update their own profile"
on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can manage all profiles"
on public.profiles;

create policy "Admins can manage all profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- PRODUCT POLICIES
-- ============================================

drop policy if exists "Anyone can view active products"
on public.products;

create policy "Anyone can view active products"
on public.products
for select
to anon, authenticated
using (active = true);

drop policy if exists "Admins can manage products"
on public.products;

create policy "Admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- PRODUCT MEDIA POLICIES
-- ============================================

drop policy if exists "Anyone can view media for active products"
on public.product_media;

create policy "Anyone can view media for active products"
on public.product_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_media.product_id
    and products.active = true
  )
);

drop policy if exists "Admins can manage product media"
on public.product_media;

create policy "Admins can manage product media"
on public.product_media
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- ADVERTISEMENT POLICIES
-- ============================================

drop policy if exists "Anyone can view active adverts"
on public.adverts;

create policy "Anyone can view active adverts"
on public.adverts
for select
to anon, authenticated
using (active = true);

drop policy if exists "Admins can manage adverts"
on public.adverts;

create policy "Admins can manage adverts"
on public.adverts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- ORDER POLICIES
-- ============================================

drop policy if exists "Customers can create orders"
on public.orders;

create policy "Customers can create orders"
on public.orders
for insert
to anon, authenticated
with check (
  customer_id is null
  or customer_id = auth.uid()
);

drop policy if exists "Customers can view their own orders"
on public.orders;

create policy "Customers can view their own orders"
on public.orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Admins can manage all orders"
on public.orders;

create policy "Admins can manage all orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- ORDER ITEM POLICIES
-- ============================================

drop policy if exists "Customers can create order items"
on public.order_items;

create policy "Customers can create order items"
on public.order_items
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
    and (
      orders.customer_id is null
      or orders.customer_id = auth.uid()
    )
  )
);

drop policy if exists "Customers can view their own order items"
on public.order_items;

create policy "Customers can view their own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
    and (
      orders.customer_id = auth.uid()
      or public.is_admin()
    )
  )
);

drop policy if exists "Admins can manage order items"
on public.order_items;

create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================
-- INDEXES
-- ============================================

create index if not exists products_category_idx
on public.products(category);

create index if not exists products_subcategory_idx
on public.products(subcategory);

create index if not exists products_active_idx
on public.products(active);

create index if not exists product_media_product_id_idx
on public.product_media(product_id);

create index if not exists orders_customer_id_idx
on public.orders(customer_id);

create index if not exists orders_status_idx
on public.orders(status);

create index if not exists orders_created_at_idx
on public.orders(created_at desc);
