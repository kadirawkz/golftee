create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists citext with schema extensions;
alter extension citext set schema extensions;

create table if not exists public.golf_courses (
  id text primary key,
  title text not null,
  location text not null,
  place_query text not null,
  place_id text,
  image text not null,
  style text not null,
  price numeric(10, 2) not null,
  rating numeric(2, 1) not null,
  latitude double precision not null,
  longitude double precision not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint golf_courses_style_valid check (style in ('LINKS', 'PARKLAND', 'DESERT', 'COASTAL')),
  constraint golf_courses_price_valid check (price >= 0),
  constraint golf_courses_rating_valid check (rating >= 0 and rating <= 5)
);

create table if not exists public.course_tee_slot_templates (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  tee_time time not null,
  time_period text not null,
  max_players integer not null default 4,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint course_tee_slot_templates_time_period_valid check (time_period in ('MORNING', 'AFTERNOON')),
  constraint course_tee_slot_templates_max_players_valid check (max_players between 1 and 4),
  constraint course_tee_slot_templates_course_time_unique unique (course_id, tee_time)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique,
  full_name text,
  phone text,
  home_club text,
  handicap numeric(4, 1),
  membership_tier text not null default 'Free',
  avatar_url text,
  member_since date not null default timezone('utc', now())::date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_length check (username is null or char_length(username) between 3 and 24),
  constraint profiles_handicap_range check (handicap is null or (handicap >= 0 and handicap <= 54))
);

create table if not exists public.favorite_courses (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, course_id),
  constraint favorite_courses_course_id_length check (char_length(course_id) between 1 and 64)
);

create table if not exists public.tee_time_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  booking_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  tee_date date not null,
  tee_time time not null,
  time_period text not null,
  players integer not null,
  green_fee numeric(10, 2) not null,
  service_fee numeric(10, 2) not null,
  caddy_fee numeric(10, 2) not null,
  taxes numeric(10, 2) not null,
  total numeric(10, 2) not null,
  payment_method text not null default 'wallet',
  status text not null default 'confirmed',
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tee_time_bookings_course_id_length check (char_length(course_id) between 1 and 64),
  constraint tee_time_bookings_players_range check (players between 1 and 4),
  constraint tee_time_bookings_positive_costs check (
    green_fee >= 0 and
    service_fee >= 0 and
    caddy_fee >= 0 and
    taxes >= 0 and
    total >= 0
  ),
  constraint tee_time_bookings_valid_time_period check (time_period in ('MORNING', 'AFTERNOON')),
  constraint tee_time_bookings_valid_payment_method check (payment_method in ('wallet', 'card')),
  constraint tee_time_bookings_valid_status check (status in ('confirmed', 'cancelled', 'completed'))
);

create unique index if not exists tee_time_bookings_active_slot_unique
on public.tee_time_bookings (course_id, tee_date, tee_time)
where status = 'confirmed';

create index if not exists tee_time_bookings_user_date_idx
on public.tee_time_bookings (user_id, tee_date, tee_time);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists golf_courses_set_updated_at on public.golf_courses;
create trigger golf_courses_set_updated_at
before update on public.golf_courses
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists course_tee_slot_templates_set_updated_at on public.course_tee_slot_templates;
create trigger course_tee_slot_templates_set_updated_at
before update on public.course_tee_slot_templates
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists tee_time_bookings_set_updated_at on public.tee_time_bookings;
create trigger tee_time_bookings_set_updated_at
before update on public.tee_time_bookings
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  raw_full_name text;
  raw_handicap text;
begin
  raw_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  raw_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  raw_handicap := nullif(trim(new.raw_user_meta_data ->> 'handicap'), '');

  insert into public.profiles (
    id,
    username,
    full_name,
    handicap
  )
  values (
    new.id,
    case when raw_username is null then null else lower(raw_username)::extensions.citext end,
    coalesce(raw_full_name, raw_username),
    case when raw_handicap is null then null else raw_handicap::numeric(4, 1) end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.get_available_tee_slots(target_course_id text, target_tee_date date)
returns table (
  tee_time time,
  time_period text,
  max_players integer,
  is_available boolean
)
language sql
security definer
set search_path = public
as $$
  select
    template.tee_time,
    template.time_period,
    template.max_players,
    not exists (
      select 1
      from public.tee_time_bookings booking
      where booking.course_id = target_course_id
        and booking.tee_date = target_tee_date
        and booking.tee_time = template.tee_time
        and booking.status = 'confirmed'
    ) as is_available
  from public.course_tee_slot_templates template
  where template.course_id = target_course_id
    and template.is_active = true
  order by template.sort_order asc, template.tee_time asc;
$$;

revoke all on function public.get_available_tee_slots(text, date) from public;
grant execute on function public.get_available_tee_slots(text, date) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.favorite_courses enable row level security;
alter table public.golf_courses enable row level security;
alter table public.course_tee_slot_templates enable row level security;
alter table public.tee_time_bookings enable row level security;

drop policy if exists "Profiles are viewable by the owner" on public.profiles;
create policy "Profiles are viewable by the owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by the owner" on public.profiles;
create policy "Profiles are insertable by the owner"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by the owner" on public.profiles;
create policy "Profiles are updatable by the owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Favorite courses are viewable by the owner" on public.favorite_courses;
create policy "Favorite courses are viewable by the owner"
on public.favorite_courses
for select
using (auth.uid() = user_id);

drop policy if exists "Favorite courses are insertable by the owner" on public.favorite_courses;
create policy "Favorite courses are insertable by the owner"
on public.favorite_courses
for insert
with check (auth.uid() = user_id);

drop policy if exists "Favorite courses are deletable by the owner" on public.favorite_courses;
create policy "Favorite courses are deletable by the owner"
on public.favorite_courses
for delete
using (auth.uid() = user_id);

drop policy if exists "Courses are readable by authenticated users" on public.golf_courses;
create policy "Courses are readable by authenticated users"
on public.golf_courses
for select
using (auth.role() = 'authenticated');

drop policy if exists "Course slot templates are readable by authenticated users" on public.course_tee_slot_templates;
create policy "Course slot templates are readable by authenticated users"
on public.course_tee_slot_templates
for select
using (auth.role() = 'authenticated');

drop policy if exists "Bookings are viewable by the owner" on public.tee_time_bookings;
create policy "Bookings are viewable by the owner"
on public.tee_time_bookings
for select
using (auth.uid() = user_id);

drop policy if exists "Bookings are insertable by the owner" on public.tee_time_bookings;
create policy "Bookings are insertable by the owner"
on public.tee_time_bookings
for insert
with check (auth.uid() = user_id);

drop policy if exists "Bookings are updatable by the owner" on public.tee_time_bookings;
create policy "Bookings are updatable by the owner"
on public.tee_time_bookings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
