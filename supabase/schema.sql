create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists citext with schema extensions;
alter extension citext set schema extensions;

-- Drop existing tables to ensure clean schema recreation
-- drop table if exists public.tee_time_bookings cascade;
-- drop table if exists public.favorite_courses cascade;
-- drop table if exists public.profiles cascade;
-- drop table if exists public.course_reviews cascade;
-- drop table if exists public.course_detail_items cascade;
-- drop table if exists public.course_content cascade;
-- drop table if exists public.course_tee_slot_templates cascade;
-- drop table if exists public.golf_courses cascade;
-- drop table if exists public.locations cascade;
-- drop table if exists public.course_styles cascade;
-- drop table if exists public.membership_tiers cascade;


create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  city_name text unique not null,
  region_name text,
  created_at timestamptz default now()
);

create table if not exists public.course_styles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  discount_percent decimal default 0,
  created_at timestamptz default now()
);

create table if not exists public.golf_courses (
  id text primary key,
  title text not null,
  location_id uuid references public.locations(id),
  place_query text not null,
  place_id text,
  image text not null,
  style_id uuid references public.course_styles(id),
  price numeric(10, 2) not null,
  rating numeric(2, 1) not null,
  latitude double precision not null,
  longitude double precision not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
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

create table if not exists public.course_content (
  course_id text primary key references public.golf_courses (id) on delete cascade,
  hero_badge text not null default 'SIGNATURE COURSE',
  review_count integer not null default 0,
  experience_description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint course_content_review_count_valid check (review_count >= 0)
);

create table if not exists public.course_detail_items (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.golf_courses (id) on delete cascade,
  category text not null,
  icon text not null,
  title text not null,
  subtitle text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint course_detail_items_category_valid check (category in ('amenity', 'highlight'))
);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.golf_courses (id) on delete cascade,
  author_name text not null,
  author_badge text not null,
  rating integer not null,
  review_text text not null,
  review_date date not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint course_reviews_rating_valid check (rating between 1 and 5)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique,
  full_name text,
  phone text,
  home_club_id text references public.golf_courses(id),
  handicap numeric(4, 1),
  tier_id uuid references public.membership_tiers(id),
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
    taxes >= 0
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
  default_tier_id uuid;
begin
  raw_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  raw_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  raw_handicap := nullif(trim(new.raw_user_meta_data ->> 'handicap'), '');

  -- Get default 'Standard' tier id
  select id into default_tier_id from public.membership_tiers where name = 'Standard' limit 1;

  insert into public.profiles (
    id,
    username,
    full_name,
    handicap,
    tier_id
  )
  values (
    new.id,
    case when raw_username is null then null else lower(raw_username)::extensions.citext end,
    coalesce(raw_full_name, raw_username),
    case when raw_handicap is null then null else raw_handicap::numeric(4, 1) end,
    default_tier_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.save_tee_time_booking(
  target_booking_id uuid default null,
  target_course_id text default null,
  target_tee_date date default null,
  target_tee_time time default null,
  target_time_period text default null,
  target_players integer default null,
  target_payment_method text default 'wallet'
)
returns public.tee_time_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_booking public.tee_time_bookings%rowtype;
  course_record public.golf_courses%rowtype;
  slot_template public.course_tee_slot_templates%rowtype;
  colombo_now timestamp without time zone;
  normalized_tee_date date;
  normalized_tee_time time;
  normalized_time_period text;
  normalized_players integer;
  normalized_payment_method text;
  computed_green_fee numeric(10, 2);
  computed_service_fee numeric(10, 2) := 12.50;
  computed_caddy_fee numeric(10, 2);
  computed_taxes numeric(10, 2);
  saved_booking public.tee_time_bookings;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You need to be signed in to manage a booking.';
  end if;

  colombo_now := timezone('Asia/Colombo', now());

  if target_booking_id is not null then
    select *
    into existing_booking
    from public.tee_time_bookings
    where id = target_booking_id
      and user_id = current_user_id;

    if not found then
      raise exception 'Booking not found.';
    end if;

    if existing_booking.status <> 'confirmed' then
      raise exception 'Only confirmed bookings can be modified.';
    end if;
  end if;

  normalized_tee_date := coalesce(target_tee_date, existing_booking.tee_date);
  normalized_tee_time := coalesce(target_tee_time, existing_booking.tee_time);
  normalized_time_period := upper(trim(coalesce(target_time_period, existing_booking.time_period)));
  normalized_players := coalesce(target_players, existing_booking.players);
  normalized_payment_method := lower(trim(coalesce(target_payment_method, existing_booking.payment_method, 'wallet')));

  if target_course_id is null and target_booking_id is null then
    raise exception 'A course is required to create a booking.';
  end if;

  select *
  into course_record
  from public.golf_courses
  where id = coalesce(target_course_id, existing_booking.course_id)
    and is_active = true;

  if not found then
    raise exception 'The selected course is unavailable.';
  end if;

  if normalized_tee_date is null or normalized_tee_time is null then
    raise exception 'A tee date and time are required.';
  end if;

  if normalized_players is null or normalized_players < 1 or normalized_players > 4 then
    raise exception 'Bookings must be between 1 and 4 players.';
  end if;

  if normalized_time_period not in ('MORNING', 'AFTERNOON') then
    raise exception 'Invalid tee time period.';
  end if;

  if normalized_payment_method not in ('wallet', 'card') then
    raise exception 'Invalid payment method.';
  end if;

  if normalized_tee_date < colombo_now::date then
    raise exception 'Past booking dates are not allowed.';
  end if;

  if normalized_tee_date = colombo_now::date and normalized_tee_time <= colombo_now::time then
    raise exception 'This tee time has already passed.';
  end if;

  select *
  into slot_template
  from public.course_tee_slot_templates
  where course_id = course_record.id
    and tee_time = normalized_tee_time
    and is_active = true;

  if not found then
    raise exception 'The selected tee time is not available for this course.';
  end if;

  if slot_template.time_period <> normalized_time_period then
    raise exception 'The selected tee time period does not match the course slot.';
  end if;

  if normalized_players > slot_template.max_players then
    raise exception 'This tee slot only supports up to % players.', slot_template.max_players;
  end if;

  computed_green_fee := round((course_record.price * normalized_players)::numeric, 2);
  computed_caddy_fee := round((normalized_players * 7.50)::numeric, 2);
  computed_taxes := round((computed_green_fee * 0.0845)::numeric, 2);

  if target_booking_id is null then
    insert into public.tee_time_bookings (
      user_id,
      course_id,
      tee_date,
      tee_time,
      time_period,
      players,
      green_fee,
      service_fee,
      caddy_fee,
      taxes,
      payment_method,
      status,
      canceled_at
    )
    values (
      current_user_id,
      course_record.id,
      normalized_tee_date,
      normalized_tee_time,
      normalized_time_period,
      normalized_players,
      computed_green_fee,
      computed_service_fee,
      computed_caddy_fee,
      computed_taxes,
      normalized_payment_method,
      'confirmed',
      null
    )
    returning *
    into saved_booking;
  else
    update public.tee_time_bookings
    set
      course_id = course_record.id,
      tee_date = normalized_tee_date,
      tee_time = normalized_tee_time,
      time_period = normalized_time_period,
      players = normalized_players,
      green_fee = computed_green_fee,
      service_fee = computed_service_fee,
      caddy_fee = computed_caddy_fee,
      taxes = computed_taxes,
      payment_method = normalized_payment_method,
      status = 'confirmed',
      canceled_at = null
    where id = existing_booking.id
      and user_id = current_user_id
    returning *
    into saved_booking;
  end if;

  return saved_booking;
exception
  when unique_violation then
    raise exception 'That tee time has already been booked. Please choose another slot.';
end;
$$;

create or replace function public.cancel_tee_time_booking(target_booking_id uuid)
returns public.tee_time_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  cancelled_booking public.tee_time_bookings;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You need to be signed in to cancel a booking.';
  end if;

  if exists (
    select 1
    from public.tee_time_bookings booking
    where booking.id = target_booking_id
      and booking.user_id = current_user_id
      and booking.status = 'confirmed'
      and (
        booking.tee_date < timezone('Asia/Colombo', now())::date
        or (
          booking.tee_date = timezone('Asia/Colombo', now())::date
          and booking.tee_time <= timezone('Asia/Colombo', now())::time
        )
      )
  ) then
    raise exception 'Past tee time bookings can no longer be cancelled.';
  end if;

  update public.tee_time_bookings
  set
    status = 'cancelled',
    canceled_at = timezone('utc', now())
  where id = target_booking_id
    and user_id = current_user_id
    and status = 'confirmed'
  returning *
  into cancelled_booking;

  if not found then
    raise exception 'Confirmed booking not found.';
  end if;

  return cancelled_booking;
end;
$$;

drop function if exists public.get_available_tee_slots(text, date);
create or replace function public.get_available_tee_slots(target_course_id text, target_tee_date date)
returns table (
  tee_time time,
  time_period text,
  max_players integer,
  is_available boolean,
  is_past boolean
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
    ) as is_available,
    (
      target_tee_date = timezone('Asia/Colombo', now())::date
      and template.tee_time <= timezone('Asia/Colombo', now())::time
    ) as is_past
  from public.golf_courses course
  join public.course_tee_slot_templates template
    on template.course_id = course.id
  where course.id = target_course_id
    and course.is_active = true
    and template.is_active = true
    and target_tee_date >= timezone('Asia/Colombo', now())::date
  order by template.sort_order asc, template.tee_time asc;
$$;

drop function if exists public.get_next_bookable_tee_slot(text, date);
create or replace function public.get_next_bookable_tee_slot(
  target_course_id text,
  target_start_date date default null
)
returns table (
  tee_date date,
  tee_time time,
  time_period text,
  max_players integer
)
language sql
security definer
set search_path = public
as $$
  with current_context as (
    select
      timezone('Asia/Colombo', now())::date as current_date,
      timezone('Asia/Colombo', now())::time as current_time
  ),
  candidate_dates as (
    select generated_date::date as tee_date
    from current_context context,
    generate_series(
      greatest(coalesce(target_start_date, context.current_date), context.current_date),
      greatest(coalesce(target_start_date, context.current_date), context.current_date) + 63,
      interval '1 day'
    ) as generated_date
  )
  select
    candidate_dates.tee_date,
    template.tee_time,
    template.time_period,
    template.max_players
  from candidate_dates
  cross join current_context context
  join public.golf_courses course
    on course.id = target_course_id
   and course.is_active = true
  join public.course_tee_slot_templates template
    on template.course_id = course.id
   and template.is_active = true
  where (
      candidate_dates.tee_date > context.current_date
      or (
        candidate_dates.tee_date = context.current_date
        and template.tee_time > context.current_time
      )
    )
    and not exists (
      select 1
      from public.tee_time_bookings booking
      where booking.course_id = target_course_id
        and booking.tee_date = candidate_dates.tee_date
        and booking.tee_time = template.tee_time
        and booking.status = 'confirmed'
    )
  order by candidate_dates.tee_date asc, template.sort_order asc, template.tee_time asc
  limit 1;
$$;

revoke execute on function public.get_available_tee_slots(text, date) from public, anon;
grant execute on function public.get_available_tee_slots(text, date) to authenticated;

revoke execute on function public.get_next_bookable_tee_slot(text, date) from public, anon;
grant execute on function public.get_next_bookable_tee_slot(text, date) to authenticated;

revoke execute on function public.save_tee_time_booking(uuid, text, date, time, text, integer, text) from public, anon;
grant execute on function public.save_tee_time_booking(uuid, text, date, time, text, integer, text) to authenticated;

revoke execute on function public.cancel_tee_time_booking(uuid) from public, anon;
grant execute on function public.cancel_tee_time_booking(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_current_timestamp_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.locations enable row level security;
alter table public.course_styles enable row level security;
alter table public.membership_tiers enable row level security;
alter table public.profiles enable row level security;
alter table public.favorite_courses enable row level security;
alter table public.golf_courses enable row level security;
alter table public.course_tee_slot_templates enable row level security;
alter table public.course_content enable row level security;
alter table public.course_detail_items enable row level security;
alter table public.course_reviews enable row level security;
alter table public.tee_time_bookings enable row level security;

drop policy if exists "Allow public read access for locations" on public.locations;
create policy "Allow public read access for locations"
on public.locations
for select
using (auth.role() = 'authenticated');

drop policy if exists "Allow public read access for course styles" on public.course_styles;
create policy "Allow public read access for course styles"
on public.course_styles
for select
using (auth.role() = 'authenticated');

drop policy if exists "Allow public read access for membership tiers" on public.membership_tiers;
create policy "Allow public read access for membership tiers"
on public.membership_tiers
for select
using (auth.role() = 'authenticated');

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

drop trigger if exists course_content_set_updated_at on public.course_content;
create trigger course_content_set_updated_at
before update on public.course_content
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists course_detail_items_set_updated_at on public.course_detail_items;
create trigger course_detail_items_set_updated_at
before update on public.course_detail_items
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists course_reviews_set_updated_at on public.course_reviews;
create trigger course_reviews_set_updated_at
before update on public.course_reviews
for each row
execute function public.set_current_timestamp_updated_at();

-- Trigger to automatically update course rating and review count when reviews are added/updated/deleted
create or replace function public.update_course_rating_and_review_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_course_id text;
  avg_rating numeric(2,1);
  total_reviews integer;
begin
  if tg_op = 'DELETE' then
    target_course_id := old.course_id;
  else
    target_course_id := new.course_id;
  end if;

  -- Calculate the new average rating and total count from published reviews
  select coalesce(round(avg(rating)::numeric, 1), 0.0), count(*)
  into avg_rating, total_reviews
  from public.course_reviews
  where course_id = target_course_id and is_published = true;

  -- Update golf_courses rating
  update public.golf_courses
  set rating = avg_rating
  where id = target_course_id;

  -- Update course_content review_count
  update public.course_content
  set review_count = total_reviews
  where course_id = target_course_id;

  return null;
end;
$$;

drop trigger if exists course_reviews_update_rating on public.course_reviews;
create trigger course_reviews_update_rating
after insert or update or delete
on public.course_reviews
for each row
execute function public.update_course_rating_and_review_count();

drop policy if exists "Course content is readable by authenticated users" on public.course_content;
create policy "Course content is readable by authenticated users"
on public.course_content
for select
using (auth.role() = 'authenticated');

drop policy if exists "Course detail items are readable by authenticated users" on public.course_detail_items;
create policy "Course detail items are readable by authenticated users"
on public.course_detail_items
for select
using (auth.role() = 'authenticated');

drop policy if exists "Course reviews are readable by authenticated users" on public.course_reviews;
create policy "Course reviews are readable by authenticated users"
on public.course_reviews
for select
using (auth.role() = 'authenticated');

drop policy if exists "Course reviews are insertable by authenticated users" on public.course_reviews;
create policy "Course reviews are insertable by authenticated users"
on public.course_reviews
for insert
with check (auth.role() = 'authenticated');


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

-- Grant access to public tables for Data API
grant select, insert, update, delete on table public.locations to anon, authenticated, service_role;
grant select, insert, update, delete on table public.course_styles to anon, authenticated, service_role;
grant select, insert, update, delete on table public.membership_tiers to anon, authenticated, service_role;
grant select, insert, update, delete on table public.golf_courses to anon, authenticated, service_role;
grant select, insert, update, delete on table public.course_tee_slot_templates to anon, authenticated, service_role;
grant select, insert, update, delete on table public.course_content to anon, authenticated, service_role;
grant select, insert, update, delete on table public.course_detail_items to anon, authenticated, service_role;
grant select, insert, update, delete on table public.course_reviews to anon, authenticated, service_role;
grant select, insert, update, delete on table public.profiles to anon, authenticated, service_role;
grant select, insert, update, delete on table public.favorite_courses to anon, authenticated, service_role;
grant select, insert, update, delete on table public.tee_time_bookings to anon, authenticated, service_role;

revoke insert, update on public.tee_time_bookings from authenticated;
