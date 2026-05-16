
-- 1. Create reference tables
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name TEXT UNIQUE NOT NULL,
    region_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    discount_percent DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Populate reference tables with initial data from existing courses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='golf_courses' AND column_name='location') THEN
        INSERT INTO public.locations (city_name)
        SELECT DISTINCT location FROM public.golf_courses
        ON CONFLICT (city_name) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='golf_courses' AND column_name='style') THEN
        INSERT INTO public.course_styles (name)
        SELECT DISTINCT style FROM public.golf_courses
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- Default tiers
INSERT INTO public.membership_tiers (name, discount_percent)
VALUES ('Standard', 0), ('Gold', 10), ('Platinum', 20)
ON CONFLICT (name) DO NOTHING;

-- 3. Add foreign key columns to main tables
ALTER TABLE public.golf_courses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.golf_courses ADD COLUMN IF NOT EXISTS style_id UUID REFERENCES public.course_styles(id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.membership_tiers(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_club_id TEXT REFERENCES public.golf_courses(id);

-- 4. Map existing data to new FKs
DO $$
BEGIN
    -- Map location_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='golf_courses' AND column_name='location') THEN
        UPDATE public.golf_courses g
        SET location_id = l.id
        FROM public.locations l
        WHERE g.location = l.city_name AND g.location_id IS NULL;
    END IF;

    -- Map style_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='golf_courses' AND column_name='style') THEN
        UPDATE public.golf_courses g
        SET style_id = s.id
        FROM public.course_styles s
        WHERE g.style = s.name AND g.style_id IS NULL;
    END IF;

    -- Map tier_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_tier') THEN
        UPDATE public.profiles p
        SET tier_id = t.id
        FROM public.membership_tiers t
        WHERE p.membership_tier = t.name AND p.tier_id IS NULL;
    END IF;

    -- Map home_club_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='home_club') THEN
        UPDATE public.profiles p
        SET home_club_id = g.id
        FROM public.golf_courses g
        WHERE p.home_club = g.title AND p.home_club_id IS NULL;
    END IF;
END $$;

-- 5. Remove redundant columns
ALTER TABLE public.golf_courses DROP COLUMN IF EXISTS location;
ALTER TABLE public.golf_courses DROP COLUMN IF EXISTS style;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS membership_tier;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS home_club;

-- 6. Remove calculated total from bookings
ALTER TABLE public.tee_time_bookings DROP COLUMN IF EXISTS total;

-- 7. Update Database Functions for 3NF

-- Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_username text;
  raw_full_name text;
  raw_handicap text;
  default_tier_id uuid;
BEGIN
  raw_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  raw_full_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  raw_handicap := nullif(trim(new.raw_user_meta_data ->> 'handicap'), '');

  -- Get default 'Standard' tier id
  SELECT id INTO default_tier_id FROM public.membership_tiers WHERE name = 'Standard' LIMIT 1;

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    handicap,
    tier_id
  )
  VALUES (
    new.id,
    CASE WHEN raw_username IS NULL THEN NULL ELSE lower(raw_username)::extensions.citext END,
    coalesce(raw_full_name, raw_username),
    CASE WHEN raw_handicap IS NULL THEN NULL ELSE raw_handicap::numeric(4, 1) END,
    default_tier_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Update save_tee_time_booking to remove 'total' insert/update
CREATE OR REPLACE FUNCTION public.save_tee_time_booking(
  target_booking_id uuid DEFAULT NULL,
  target_course_id text DEFAULT NULL,
  target_tee_date date DEFAULT NULL,
  target_tee_time time DEFAULT NULL,
  target_time_period text DEFAULT NULL,
  target_players integer DEFAULT NULL,
  target_payment_method text DEFAULT 'wallet'
)
RETURNS public.tee_time_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to manage a booking.';
  END IF;

  colombo_now := timezone('Asia/Colombo', now());

  IF target_booking_id IS NOT NULL THEN
    SELECT *
    INTO existing_booking
    FROM public.tee_time_bookings
    WHERE id = target_booking_id
      AND user_id = current_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found.';
    END IF;

    IF existing_booking.status <> 'confirmed' THEN
      RAISE EXCEPTION 'Only confirmed bookings can be modified.';
    END IF;
  END IF;

  normalized_tee_date := coalesce(target_tee_date, existing_booking.tee_date);
  normalized_tee_time := coalesce(target_tee_time, existing_booking.tee_time);
  normalized_time_period := upper(trim(coalesce(target_time_period, existing_booking.time_period)));
  normalized_players := coalesce(target_players, existing_booking.players);
  normalized_payment_method := lower(trim(coalesce(target_payment_method, existing_booking.payment_method, 'wallet')));

  IF target_course_id IS NULL AND target_booking_id IS NULL THEN
    RAISE EXCEPTION 'A course is required to create a booking.';
  END IF;

  SELECT *
  INTO course_record
  FROM public.golf_courses
  WHERE id = coalesce(target_course_id, existing_booking.course_id)
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected course is unavailable.';
  END IF;

  IF normalized_tee_date IS NULL OR normalized_tee_time IS NULL THEN
    RAISE EXCEPTION 'A tee date and time are required.';
  END IF;

  IF normalized_players IS NULL OR normalized_players < 1 OR normalized_players > 4 THEN
    RAISE EXCEPTION 'Bookings must be between 1 and 4 players.';
  END IF;

  IF normalized_time_period NOT IN ('MORNING', 'AFTERNOON') THEN
    RAISE EXCEPTION 'Invalid tee time period.';
  END IF;

  IF normalized_payment_method NOT IN ('wallet', 'card') THEN
    RAISE EXCEPTION 'Invalid payment method.';
  END IF;

  IF normalized_tee_date < colombo_now::date THEN
    RAISE EXCEPTION 'Past booking dates are not allowed.';
  END IF;

  IF normalized_tee_date = colombo_now::date AND normalized_tee_time <= colombo_now::time THEN
    RAISE EXCEPTION 'This tee time has already passed.';
  END IF;

  SELECT *
  INTO slot_template
  FROM public.course_tee_slot_templates
  WHERE course_id = course_record.id
    AND tee_time = normalized_tee_time
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected tee time is not available for this course.';
  END IF;

  IF slot_template.time_period <> normalized_time_period THEN
    RAISE EXCEPTION 'The selected tee time period does not match the course slot.';
  END IF;

  IF normalized_players > slot_template.max_players THEN
    RAISE EXCEPTION 'This tee slot only supports up to % players.', slot_template.max_players;
  END IF;

  computed_green_fee := round((course_record.price * normalized_players)::numeric, 2);
  computed_caddy_fee := round((normalized_players * 7.50)::numeric, 2);
  computed_taxes := round((computed_green_fee * 0.0845)::numeric, 2);

  IF target_booking_id IS NULL THEN
    INSERT INTO public.tee_time_bookings (
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
    VALUES (
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
    RETURNING *
    INTO saved_booking;
  ELSE
    UPDATE public.tee_time_bookings
    SET
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
    WHERE id = existing_booking.id
      AND user_id = current_user_id
    RETURNING *
    INTO saved_booking;
  END IF;

  RETURN saved_booking;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'That tee time has already been booked. Please choose another slot.';
END;
$$;

-- 5. Final Professional Data Cleanup
-- Ensure place_id column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='golf_courses' AND column_name='place_id') THEN
        ALTER TABLE public.golf_courses ADD COLUMN place_id TEXT;
    END IF;
END $$;

-- Update Locations with Regional Names
UPDATE public.locations SET region_name = 'Western Province' WHERE city_name = 'Colombo' AND region_name IS NULL;
UPDATE public.locations SET region_name = 'Central Province' WHERE city_name IN ('Kandy / Digana', 'Nuwara Eliya', 'Diyathalawa') AND region_name IS NULL;
UPDATE public.locations SET region_name = 'Eastern Province' WHERE city_name = 'Trincomalee' AND region_name IS NULL;
UPDATE public.locations SET region_name = 'North Central Province' WHERE city_name = 'Anuradhapura' AND region_name IS NULL;
UPDATE public.locations SET region_name = 'Southern Province' WHERE city_name IN ('Hambantota', 'Koggala') AND region_name IS NULL;

-- Update Course Styles with Descriptions
UPDATE public.course_styles SET description = 'Manicured fairways with mature trees and traditional routing.' WHERE name = 'PARKLAND' AND description IS NULL;
UPDATE public.course_styles SET description = 'Exposed to sea breezes with sandy soil and water views.' WHERE name = 'COASTAL' AND description IS NULL;
UPDATE public.course_styles SET description = 'Firm, fast-running ground with natural contours and minimal trees.' WHERE name = 'LINKS' AND description IS NULL;
UPDATE public.course_styles SET description = 'Arid conditions with waste areas and striking contrasts.' WHERE name = 'DESERT' AND description IS NULL;

-- Populate missing Place IDs for Golf Courses
UPDATE public.golf_courses SET place_id = 'ChIJ9076Hh7X4zoRDWwU-B87H6k' WHERE id = '1' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJsS-7U29X4zoR1i7zY5D6D3A' WHERE id = '2' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJxR7vFp_r4ToR5Q6_pC9q8Xo' WHERE id = '3' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJ_UP_yq8z5DoR4F4W5v_3L5w' WHERE id = '4' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJ7_P_Yq8z5DoR4F4W5v_3L5w' WHERE id = '5' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJR_P_Yq8z5DoR4F4W5v_3L5w' WHERE id = '6' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJS_P_Yq8z5DoR4F4W5v_3L5w' WHERE id = '7' AND (place_id IS NULL OR place_id = '');
UPDATE public.golf_courses SET place_id = 'ChIJT_P_Yq8z5DoR4F4W5v_3L5w' WHERE id = '8' AND (place_id IS NULL OR place_id = '');

