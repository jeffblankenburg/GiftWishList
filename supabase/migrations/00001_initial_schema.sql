-- GiftWishList Database Schema
-- This migration creates all tables, indexes, and RLS policies

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CREATE ALL TABLES FIRST
-- ============================================

-- USERS TABLE
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone varchar(15) unique not null,
  display_name varchar(100),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- GROUPS TABLE
create table groups (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  code varchar(8) unique not null,
  owner_id uuid references users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- GROUP MEMBERSHIPS TABLE
create table group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  group_id uuid references groups(id) on delete cascade not null,
  role varchar(20) default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(user_id, group_id)
);

-- WISHLIST ITEMS TABLE
create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  group_id uuid references groups(id) on delete cascade not null,
  url text,
  title varchar(500) not null,
  site_name varchar(100),
  image_url text,
  price varchar(50),
  notes text,
  priority int default 0,
  created_at timestamptz default now() not null
);

-- PURCHASES TABLE
create table purchases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references wishlist_items(id) on delete cascade unique not null,
  buyer_id uuid references users(id) on delete cascade not null,
  buyer_notes text,
  purchased_at timestamptz default now() not null
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
alter table users enable row level security;
alter table groups enable row level security;
alter table group_memberships enable row level security;
alter table wishlist_items enable row level security;
alter table purchases enable row level security;

-- ============================================
-- RLS POLICIES FOR USERS
-- ============================================
create policy "Users can read all users"
  on users for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on users for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on users for insert
  to authenticated
  with check (auth.uid() = id);

-- ============================================
-- RLS POLICIES FOR GROUPS
-- ============================================
create policy "Users can read groups they belong to"
  on groups for select
  to authenticated
  using (
    exists (
      select 1 from group_memberships
      where group_memberships.group_id = groups.id
      and group_memberships.user_id = auth.uid()
    )
  );

create policy "Users can create groups"
  on groups for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update groups"
  on groups for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owners can delete groups"
  on groups for delete
  to authenticated
  using (auth.uid() = owner_id);

-- ============================================
-- RLS POLICIES FOR GROUP MEMBERSHIPS
-- ============================================
create policy "Users can read memberships for their groups"
  on group_memberships for select
  to authenticated
  using (
    exists (
      select 1 from group_memberships gm
      where gm.group_id = group_memberships.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Users can join groups"
  on group_memberships for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on group_memberships for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR WISHLIST ITEMS
-- ============================================
create policy "Users can read items in their groups"
  on wishlist_items for select
  to authenticated
  using (
    exists (
      select 1 from group_memberships
      where group_memberships.group_id = wishlist_items.group_id
      and group_memberships.user_id = auth.uid()
    )
  );

create policy "Users can insert own items"
  on wishlist_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on wishlist_items for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own items"
  on wishlist_items for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR PURCHASES (PRIVACY CRITICAL)
-- ============================================

-- CRITICAL: Users can see purchases EXCEPT on their own items
create policy "Users can see purchases except on own items"
  on purchases for select
  to authenticated
  using (
    auth.uid() != (
      select user_id from wishlist_items where id = purchases.item_id
    )
  );

create policy "Users can mark items as purchased"
  on purchases for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
    and auth.uid() != (
      select user_id from wishlist_items where id = item_id
    )
  );

create policy "Users can update own purchases"
  on purchases for update
  to authenticated
  using (auth.uid() = buyer_id);

create policy "Users can delete own purchases"
  on purchases for delete
  to authenticated
  using (auth.uid() = buyer_id);

-- ============================================
-- INDEXES
-- ============================================
create index idx_users_phone on users(phone);
create index idx_groups_code on groups(code);
create index idx_group_memberships_user_id on group_memberships(user_id);
create index idx_group_memberships_group_id on group_memberships(group_id);
create index idx_wishlist_items_user_id on wishlist_items(user_id);
create index idx_wishlist_items_group_id on wishlist_items(group_id);
create index idx_purchases_item_id on purchases(item_id);
create index idx_purchases_buyer_id on purchases(buyer_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate random 8-character invite code
create or replace function generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for users updated_at
create trigger users_updated_at
  before update on users
  for each row
  execute function update_updated_at();
