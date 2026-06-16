-- 1. Seed Locations
INSERT INTO public.locations (city_name, region_name)
VALUES 
  ('Colombo', 'Western Province'),
  ('Kandy / Digana', 'Central Province'),
  ('Nuwara Eliya', 'Central Province'),
  ('Trincomalee', 'Eastern Province'),
  ('Anuradhapura', 'North Central Province'),
  ('Hambantota', 'Southern Province'),
  ('Koggala', 'Southern Province'),
  ('Diyathalawa', 'Central Province')
ON CONFLICT (city_name) DO UPDATE SET region_name = excluded.region_name;

-- 2. Seed Course Styles
INSERT INTO public.course_styles (name, description)
VALUES 
  ('PARKLAND', 'Manicured fairways with mature trees and traditional routing.'),
  ('COASTAL', 'Exposed to sea breezes with sandy soil and water views.'),
  ('LINKS', 'Firm, fast-running ground with natural contours and minimal trees.'),
  ('DESERT', 'Arid conditions with waste areas and striking contrasts.')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Membership Tiers
INSERT INTO public.membership_tiers (name, discount_percent)
VALUES 
  ('Standard', 0), 
  ('Gold', 10), 
  ('Platinum', 20)
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Golf Courses
INSERT INTO public.golf_courses (
  id,
  title,
  place_query,
  place_id,
  image,
  price,
  rating,
  latitude,
  longitude,
  sort_order,
  location_id,
  style_id
)
VALUES
  (
    '1', 'Royal Colombo Golf Club', 'Royal Colombo Golf Club, Colombo, Sri Lanka', 
    'ChIJ9076Hh7X4zoRDWwU-B87H6k',
    'assets/images/courses/royal_colombo.webp', 
    120, 4.9, 6.905285380135911, 79.88419185299367, 1,
    (SELECT id FROM public.locations WHERE city_name = 'Colombo' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'PARKLAND' LIMIT 1)
  ),
  (
    '2', 'Victoria Golf & Country Resort', 'Victoria Golf & Country Resort, Digana, Sri Lanka', 
    'ChIJsS-7U29X4zoR1i7zY5D6D3A',
    'assets/images/courses/victoria_digana.webp', 
    85, 4.7, 7.264680696986498, 80.77403805582475, 2,
    (SELECT id FROM public.locations WHERE city_name = 'Kandy / Digana' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'COASTAL' LIMIT 1)
  ),
  (
    '3', 'Nuwara Eliya Golf Club', 'Nuwara Eliya Golf Club, Nuwara Eliya, Sri Lanka', 
    'ChIJxR7vFp_r4ToR5Q6_pC9q8Xo',
    'assets/images/courses/nuwara_eliya.webp', 
    145, 4.8, 6.971971282155486, 80.76571996611204, 3,
    (SELECT id FROM public.locations WHERE city_name = 'Nuwara Eliya' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'LINKS' LIMIT 1)
  ),
  (
    '4', 'Eagles Golf Link', 'Eagles Golf Link, Trincomalee, Sri Lanka', 
    'ChIJd7465-H36joR-a6z55Z45-Y',
    'assets/images/courses/trincomalee.webp', 
    110, 4.6, 8.535798504973808, 81.19818322309355, 4,
    (SELECT id FROM public.locations WHERE city_name = 'Trincomalee' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'DESERT' LIMIT 1)
  ),
  (
    '5', 'Eagles Heritage Golf Club', 'Eagles Heritage Golf Club, Anuradhapura, Sri Lanka', 
    'ChIJ2_a82-y9_zoRzB014-9l48A',
    'assets/images/courses/anuradhapura.webp', 
    95, 4.5, 8.296735106202165, 80.42496812379707, 5,
    (SELECT id FROM public.locations WHERE city_name = 'Anuradhapura' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'PARKLAND' LIMIT 1)
  ),
  (
    '6', 'Shangri La Hambantota Golf Resort & Spa', 'Shangri La Hambantota Golf Resort & Spa, Hambantota, Sri Lanka', 
    'ChIJ36t4kRz66joR5tWw4Jz1e5Y',
    'assets/images/courses/hambantota.webp', 
    155, 4.9, 6.112915947036785, 81.06407119678414, 6,
    (SELECT id FROM public.locations WHERE city_name = 'Hambantota' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'COASTAL' LIMIT 1)
  ),
  (
    '7', 'Koggala Golf Club', 'Koggala Golf Club, Koggala, Sri Lanka', 
    'ChIJ4V5OQx3P4joR_s5yL5f9y64',
    'assets/images/courses/koggala.webp', 
    130, 4.8, 5.996820130056448, 80.32463590631559, 7,
    (SELECT id FROM public.locations WHERE city_name = 'Koggala' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'LINKS' LIMIT 1)
  ),
  (
    '8', 'Army Golf Course', 'Army Golf Course, Diyatalawa, Sri Lanka', 
    'ChIJ85g3oGv04joR68Xp4v9G04U',
    'assets/images/courses/diyathalawa.webp', 
    210, 4.7, 6.809702575280297, 80.94806013954602, 8,
    (SELECT id FROM public.locations WHERE city_name = 'Diyathalawa' LIMIT 1),
    (SELECT id FROM public.course_styles WHERE name = 'DESERT' LIMIT 1)
  )
ON CONFLICT (id) DO UPDATE
SET
  title = excluded.title,
  place_query = excluded.place_query,
  place_id = excluded.place_id,
  image = excluded.image,
  price = excluded.price,
  rating = excluded.rating,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  sort_order = excluded.sort_order,
  location_id = excluded.location_id,
  style_id = excluded.style_id,
  is_active = true;

-- 4. Seed Tee Slot Templates
insert into public.course_tee_slot_templates (course_id, tee_time, time_period, max_players, sort_order)
values
  ('1', '07:20', 'MORNING', 4, 1), ('1', '07:45', 'MORNING', 4, 2), ('1', '08:00', 'MORNING', 4, 3), ('1', '08:15', 'MORNING', 4, 4), ('1', '08:30', 'MORNING', 4, 5), ('1', '09:00', 'MORNING', 4, 6), ('1', '10:15', 'MORNING', 4, 7), ('1', '11:30', 'MORNING', 4, 8), ('1', '12:15', 'AFTERNOON', 4, 9), ('1', '12:45', 'AFTERNOON', 4, 10), ('1', '13:30', 'AFTERNOON', 4, 11), ('1', '14:00', 'AFTERNOON', 4, 12), ('1', '14:30', 'AFTERNOON', 4, 13), ('1', '15:15', 'AFTERNOON', 4, 14), ('1', '16:00', 'AFTERNOON', 4, 15), ('1', '16:30', 'AFTERNOON', 4, 16),
  ('2', '07:20', 'MORNING', 4, 1), ('2', '07:45', 'MORNING', 4, 2), ('2', '08:00', 'MORNING', 4, 3), ('2', '08:15', 'MORNING', 4, 4), ('2', '08:30', 'MORNING', 4, 5), ('2', '09:00', 'MORNING', 4, 6), ('2', '10:15', 'MORNING', 4, 7), ('2', '11:30', 'MORNING', 4, 8), ('2', '12:15', 'AFTERNOON', 4, 9), ('2', '12:45', 'AFTERNOON', 4, 10), ('2', '13:30', 'AFTERNOON', 4, 11), ('2', '14:00', 'AFTERNOON', 4, 12), ('2', '14:30', 'AFTERNOON', 4, 13), ('2', '15:15', 'AFTERNOON', 4, 14), ('2', '16:00', 'AFTERNOON', 4, 15), ('2', '16:30', 'AFTERNOON', 4, 16),
  ('3', '07:20', 'MORNING', 4, 1), ('3', '07:45', 'MORNING', 4, 2), ('3', '08:00', 'MORNING', 4, 3), ('3', '08:15', 'MORNING', 4, 4), ('3', '08:30', 'MORNING', 4, 5), ('3', '09:00', 'MORNING', 4, 6), ('3', '10:15', 'MORNING', 4, 7), ('3', '11:30', 'MORNING', 4, 8), ('3', '12:15', 'AFTERNOON', 4, 9), ('3', '12:45', 'AFTERNOON', 4, 10), ('3', '13:30', 'AFTERNOON', 4, 11), ('3', '14:00', 'AFTERNOON', 4, 12), ('3', '14:30', 'AFTERNOON', 4, 13), ('3', '15:15', 'AFTERNOON', 4, 14), ('3', '16:00', 'AFTERNOON', 4, 15), ('3', '16:30', 'AFTERNOON', 4, 16),
  ('4', '07:20', 'MORNING', 4, 1), ('4', '07:45', 'MORNING', 4, 2), ('4', '08:00', 'MORNING', 4, 3), ('4', '08:15', 'MORNING', 4, 4), ('4', '08:30', 'MORNING', 4, 5), ('4', '09:00', 'MORNING', 4, 6), ('4', '10:15', 'MORNING', 4, 7), ('4', '11:30', 'MORNING', 4, 8), ('4', '12:15', 'AFTERNOON', 4, 9), ('4', '12:45', 'AFTERNOON', 4, 10), ('4', '13:30', 'AFTERNOON', 4, 11), ('4', '14:00', 'AFTERNOON', 4, 12), ('4', '14:30', 'AFTERNOON', 4, 13), ('4', '15:15', 'AFTERNOON', 4, 14), ('4', '16:00', 'AFTERNOON', 4, 15), ('4', '16:30', 'AFTERNOON', 4, 16),
  ('5', '07:20', 'MORNING', 4, 1), ('5', '07:45', 'MORNING', 4, 2), ('5', '08:00', 'MORNING', 4, 3), ('5', '08:15', 'MORNING', 4, 4), ('5', '08:30', 'MORNING', 4, 5), ('5', '09:00', 'MORNING', 4, 6), ('5', '10:15', 'MORNING', 4, 7), ('5', '11:30', 'MORNING', 4, 8), ('5', '12:15', 'AFTERNOON', 4, 9), ('5', '12:45', 'AFTERNOON', 4, 10), ('5', '13:30', 'AFTERNOON', 4, 11), ('5', '14:00', 'AFTERNOON', 4, 12), ('5', '14:30', 'AFTERNOON', 4, 13), ('5', '15:15', 'AFTERNOON', 4, 14), ('5', '16:00', 'AFTERNOON', 4, 15), ('5', '16:30', 'AFTERNOON', 4, 16),
  ('6', '07:20', 'MORNING', 4, 1), ('6', '07:45', 'MORNING', 4, 2), ('6', '08:00', 'MORNING', 4, 3), ('6', '08:15', 'MORNING', 4, 4), ('6', '08:30', 'MORNING', 4, 5), ('6', '09:00', 'MORNING', 4, 6), ('6', '10:15', 'MORNING', 4, 7), ('6', '11:30', 'MORNING', 4, 8), ('6', '12:15', 'AFTERNOON', 4, 9), ('6', '12:45', 'AFTERNOON', 4, 10), ('6', '13:30', 'AFTERNOON', 4, 11), ('6', '14:00', 'AFTERNOON', 4, 12), ('6', '14:30', 'AFTERNOON', 4, 13), ('6', '15:15', 'AFTERNOON', 4, 14), ('6', '16:00', 'AFTERNOON', 4, 15), ('6', '16:30', 'AFTERNOON', 4, 16),
  ('7', '07:20', 'MORNING', 4, 1), ('7', '07:45', 'MORNING', 4, 2), ('7', '08:00', 'MORNING', 4, 3), ('7', '08:15', 'MORNING', 4, 4), ('7', '08:30', 'MORNING', 4, 5), ('7', '09:00', 'MORNING', 4, 6), ('7', '10:15', 'MORNING', 4, 7), ('7', '11:30', 'MORNING', 4, 8), ('7', '12:15', 'AFTERNOON', 4, 9), ('7', '12:45', 'AFTERNOON', 4, 10), ('7', '13:30', 'AFTERNOON', 4, 11), ('7', '14:00', 'AFTERNOON', 4, 12), ('7', '14:30', 'AFTERNOON', 4, 13), ('7', '15:15', 'AFTERNOON', 4, 14), ('7', '16:00', 'AFTERNOON', 4, 15), ('7', '16:30', 'AFTERNOON', 4, 16),
  ('8', '07:20', 'MORNING', 4, 1), ('8', '07:45', 'MORNING', 4, 2), ('8', '08:00', 'MORNING', 4, 3), ('8', '08:15', 'MORNING', 4, 4), ('8', '08:30', 'MORNING', 4, 5), ('8', '09:00', 'MORNING', 4, 6), ('8', '10:15', 'MORNING', 4, 7), ('8', '11:30', 'MORNING', 4, 8), ('8', '12:15', 'AFTERNOON', 4, 9), ('8', '12:45', 'AFTERNOON', 4, 10), ('8', '13:30', 'AFTERNOON', 4, 11), ('8', '14:00', 'AFTERNOON', 4, 12), ('8', '14:30', 'AFTERNOON', 4, 13), ('8', '15:15', 'AFTERNOON', 4, 14), ('8', '16:00', 'AFTERNOON', 4, 15), ('8', '16:30', 'AFTERNOON', 4, 16)
on conflict (course_id, tee_time) do update
set
  time_period = excluded.time_period,
  max_players = excluded.max_players,
  sort_order = excluded.sort_order,
  is_active = true;

-- 5. Seed Course Content
insert into public.course_content (
  course_id,
  hero_badge,
  review_count,
  experience_description
)
values
  ('1', 'SIGNATURE COURSE', 128, 'Founded in 1879, the Royal Colombo Golf Club is the oldest in Sri Lanka and a sanctuary of tranquility in the heart of the capital. The course features lush fairways, strategic bunkering, and the famous Kelani Valley railway line that traverses the property.'),
  ('2', 'HIGHLANDS ESCAPE', 96, 'Designed by Donald Steel, Victoria is ranked among the top 100 most beautiful courses in the world. Set on a peninsula overlooking the Victoria Reservoir, it offers dramatic undulations and vistas of the Knuckles Mountain Range.'),
  ('3', 'HERITAGE CLASSIC', 114, 'Established in 1889, the Nuwara Eliya Golf Club is one of Asia''s oldest. Located 6,000 feet above sea level, the cool-climate course winds through tea plantations and the historic town center, preserving its colonial charm.'),
  ('4', 'EAST COAST CHALLENGE', 82, 'Eagles’ Golf Link is located on the picturesque east coast. Built on a peninsula, the course offers stunning views of the Indian Ocean and China Bay, with breezy coastal conditions that challenge players of all levels.'),
  ('5', 'ANCIENT CITY FAVORITE', 74, 'Set in the historic city of Anuradhapura, Eagles’ Heritage offers a serene parkland experience. The course is flat and inviting, surrounded by mature tropical trees and the peaceful atmosphere of the ancient kingdom.'),
  ('6', 'RESORT SHOWPIECE', 143, 'Sri Lanka''s first resort golf course, designed by Rodney Wright. The championship layout features three distinct zones—coconut plantations, dune landscapes, and former sapphire mines—with breathtaking ocean views.'),
  ('7', 'SOUTH COAST LINKS', 88, 'Koggala Golf Club is a natural links-style course on the southern coast. The sea breeze and natural contours define the round, demanding creative shot-making and offering an authentic seaside test.'),
  ('8', 'HILL COUNTRY TEST', 69, 'The Army Golf Course in Diyatalawa offers a unique high-altitude mountain experience. Set within a military cantonment, it features rolling terrain, crisp mountain air, and scenic pine forests.')
on conflict (course_id) do update
set
  hero_badge = excluded.hero_badge,
  review_count = excluded.review_count,
  experience_description = excluded.experience_description;

-- 6. Seed Course Detail Items
insert into public.course_detail_items (
  id,
  course_id,
  category,
  icon,
  title,
  subtitle,
  sort_order
)
values
  ('d0000000-0000-0000-0000-000000000001', '1', 'amenity', 'home', 'Clubhouse', 'Colonial lounge and terrace views', 1),
  ('d0000000-0000-0000-0000-000000000002', '1', 'amenity', 'bag', 'Pro Shop', 'Premium gear and fitting support', 2),
  ('d0000000-0000-0000-0000-000000000003', '1', 'amenity', 'restaurant', 'Dining', 'All-day service after the round', 3),
  ('d0000000-0000-0000-0000-000000000004', '1', 'amenity', 'car', 'Carts', 'GPS-guided comfort on course', 4),
  ('d0000000-0000-0000-0000-000000000005', '1', 'highlight', 'leaf', 'Pristine Turf Management', 'Fast greens and tidy landing areas daily.', 1),
  ('d0000000-0000-0000-0000-000000000006', '1', 'highlight', 'water', 'Railway-Line Strategy', 'Signature risk-reward lines shape club selection.', 2),
  ('d0000000-0000-0000-0000-000000000007', '2', 'amenity', 'home', 'Resort Clubhouse', 'Panoramic views over Victoria', 1),
  ('d0000000-0000-0000-0000-000000000008', '2', 'amenity', 'bag', 'Practice Centre', 'Range, putting green, and short game zone', 2),
  ('d0000000-0000-0000-0000-000000000009', '2', 'amenity', 'restaurant', 'Lakeside Dining', 'Resort dining between rounds', 3),
  ('d0000000-0000-0000-0000-000000000010', '2', 'amenity', 'car', 'Carts', 'Resort fleet with course navigation', 4),
  ('d0000000-0000-0000-0000-000000000011', '2', 'highlight', 'leaf', 'Elevation Variety', 'Every stretch asks for a different trajectory.', 1),
  ('d0000000-0000-0000-0000-000000000012', '2', 'highlight', 'water', 'Reservoir Edge Holes', 'Water-framed approaches reward commitment.', 2),
  ('d0000000-0000-0000-0000-000000000013', '3', 'amenity', 'home', 'Heritage Clubhouse', 'Classic hill-country atmosphere', 1),
  ('d0000000-0000-0000-0000-000000000014', '3', 'amenity', 'bag', 'Pro Shop', 'Essentials and warm-weather layers', 2),
  ('d0000000-0000-0000-0000-000000000015', '3', 'amenity', 'restaurant', 'Tea Lounge', 'Post-round drinks with valley views', 3),
  ('d0000000-0000-0000-0000-000000000016', '3', 'amenity', 'car', 'Caddies', 'Walking-friendly support on course', 4),
  ('d0000000-0000-0000-0000-000000000017', '3', 'highlight', 'leaf', 'Cool-Climate Greens', 'Firm putting surfaces reward touch.', 1),
  ('d0000000-0000-0000-0000-000000000018', '3', 'highlight', 'water', 'Tight Approaches', 'Precision into greens matters all day.', 2),
  ('d0000000-0000-0000-0000-000000000019', '4', 'amenity', 'home', 'Clubhouse', 'Relaxed coastal base before tee-off', 1),
  ('d0000000-0000-0000-0000-000000000020', '4', 'amenity', 'bag', 'Rental Gear', 'Travel-friendly club rental service', 2),
  ('d0000000-0000-0000-0000-000000000021', '4', 'amenity', 'restaurant', 'Refreshments', 'Light bites and cold drinks', 3),
  ('d0000000-0000-0000-0000-000000000022', '4', 'amenity', 'car', 'Carts', 'Comfort rides for warm afternoons', 4),
  ('d0000000-0000-0000-0000-000000000023', '4', 'highlight', 'leaf', 'Wind Management', 'Flighted shots beat raw power here.', 1),
  ('d0000000-0000-0000-0000-000000000024', '4', 'highlight', 'water', 'Firm Coastal Roll', 'Ground game options stay in play.', 2),
  ('d0000000-0000-0000-0000-000000000025', '5', 'amenity', 'home', 'Member Lounge', 'Comfortable clubhouse setting', 1),
  ('d0000000-0000-0000-0000-000000000026', '5', 'amenity', 'bag', 'Golf Services', 'Rental sets and starter support', 2),
  ('d0000000-0000-0000-0000-000000000027', '5', 'amenity', 'restaurant', 'Garden Dining', 'Casual meals with course outlook', 3),
  ('d0000000-0000-0000-0000-000000000028', '5', 'amenity', 'car', 'Carts', 'Easy-moving pace across the property', 4),
  ('d0000000-0000-0000-0000-000000000029', '5', 'highlight', 'leaf', 'Playable Routing', 'Inviting landing zones for all levels.', 1),
  ('d0000000-0000-0000-0000-000000000030', '5', 'highlight', 'water', 'Balanced Risk-Reward', 'Scoring chances appear without over-penalty.', 2),
  ('d0000000-0000-0000-0000-000000000031', '6', 'amenity', 'home', 'Resort Clubhouse', 'Luxury arrival and locker facilities', 1),
  ('d0000000-0000-0000-0000-000000000032', '6', 'amenity', 'bag', 'Performance Shop', 'Premium retail and fittings', 2),
  ('d0000000-0000-0000-0000-000000000033', '6', 'amenity', 'restaurant', 'Resort Dining', 'Signature dining after play', 3),
  ('d0000000-0000-0000-0000-000000000034', '6', 'amenity', 'car', 'Carts', 'Fully serviced resort fleet', 4),
  ('d0000000-0000-0000-0000-000000000035', '6', 'highlight', 'leaf', 'Championship Conditioning', 'Premium presentation from tee to green.', 1),
  ('d0000000-0000-0000-0000-000000000036', '6', 'highlight', 'water', 'Ocean-Air Exposure', 'Wind and bunkering define scoring lines.', 2),
  ('d0000000-0000-0000-0000-000000000037', '7', 'amenity', 'home', 'Beachside Clubhouse', 'Relaxed south-coast atmosphere', 1),
  ('d0000000-0000-0000-0000-000000000038', '7', 'amenity', 'bag', 'Practice Corner', 'Warm-up range and putting area', 2),
  ('d0000000-0000-0000-0000-000000000039', '7', 'amenity', 'restaurant', 'Seafood Grill', 'Fresh plates near the fairways', 3),
  ('d0000000-0000-0000-0000-000000000040', '7', 'amenity', 'car', 'Carts', 'Quick access across exposed holes', 4),
  ('d0000000-0000-0000-0000-000000000041', '7', 'highlight', 'leaf', 'Links Creativity', 'Low runners and recovery shots thrive.', 1),
  ('d0000000-0000-0000-0000-000000000042', '7', 'highlight', 'water', 'Sea Breeze Control', 'Shot windows shift through the round.', 2),
  ('d0000000-0000-0000-0000-000000000043', '8', 'amenity', 'home', 'Mountain Clubhouse', 'Warm interiors for cool mornings', 1),
  ('d0000000-0000-0000-0000-000000000044', '8', 'amenity', 'bag', 'Starter Desk', 'Guest support and golf basics', 2),
  ('d0000000-0000-0000-0000-000000000045', '8', 'amenity', 'restaurant', 'Mess Hall Dining', 'Hearty meals after the round', 3),
  ('d0000000-0000-0000-0000-000000000046', '8', 'amenity', 'car', 'Carts', 'Optional transport on rolling terrain', 4),
  ('d0000000-0000-0000-0000-000000000047', '8', 'highlight', 'leaf', 'Altitude Advantage', 'Ball flight and distance play differently.', 1),
  ('d0000000-0000-0000-0000-000000000048', '8', 'highlight', 'water', 'Second-Shot Test', 'Approaches decide whether rounds hold together.', 2)
ON CONFLICT (id) DO UPDATE SET
  course_id = excluded.course_id,
  category = excluded.category,
  icon = excluded.icon,
  title = excluded.title,
  subtitle = excluded.subtitle,
  sort_order = excluded.sort_order;

-- 7. Seed Course Reviews
insert into public.course_reviews (
  id,
  course_id,
  author_name,
  author_badge,
  rating,
  review_text,
  review_date,
  sort_order
)
values
  ('f0000000-0000-0000-0000-000000000001', '1', 'Marcus Thorne', 'Handicap: 4', 5, 'The most immersive golfing experience I''ve had in years. The routing keeps asking for a smarter shape into the next fairway.', '2026-03-12', 1),
  ('f0000000-0000-0000-0000-000000000002', '1', 'Elena Rodriguez', 'Executive Member', 5, 'Clubhouse amenities are first-class, and the finishing stretch feels polished without losing personality.', '2026-02-27', 2),
  ('f0000000-0000-0000-0000-000000000003', '2', 'Nimal Perera', 'Handicap: 9', 5, 'Victoria has the kind of scenery that distracts you for a second and then punishes the next swing if you lose focus.', '2026-03-18', 1),
  ('f0000000-0000-0000-0000-000000000004', '2', 'Sophie Lane', 'Resort Guest', 4, 'Great conditioning and a memorable back nine. Elevation changes make every club choice feel important.', '2026-02-08', 2),
  ('f0000000-0000-0000-0000-000000000005', '3', 'Daniel Hooper', 'Handicap: 6', 5, 'Cool air, classic layout, and greens that absolutely demand touch. One of the most character-rich rounds in the region.', '2026-03-05', 1),
  ('f0000000-0000-0000-0000-000000000006', '3', 'Ayesha Karim', 'Weekend Golfer', 4, 'Tighter than it first appears, but very fair if you stay patient and keep the ball below the wind.', '2026-01-29', 2),
  ('f0000000-0000-0000-0000-000000000007', '4', 'Harith Silva', 'Handicap: 12', 4, 'The breeze changes the whole feel of the round. It rewards players who can stay creative and accept the odd bounce.', '2026-03-14', 1),
  ('f0000000-0000-0000-0000-000000000008', '4', 'Grace Miller', 'Travel Member', 4, 'A laid-back setting with enough bite in the wind and run-out to keep things interesting.', '2026-02-11', 2),
  ('f0000000-0000-0000-0000-000000000009', '5', 'Kavindu Senanayake', 'Club Member', 4, 'Very playable and well-paced. It''s the kind of course you''d happily book again for a relaxed morning game.', '2026-03-09', 1),
  ('f0000000-0000-0000-0000-000000000010', '5', 'Mina Joseph', 'Handicap: 16', 4, 'Friendly routing and a nice balance between scoring chances and enough trouble to stay engaged.', '2026-01-22', 2),
  ('f0000000-0000-0000-0000-000000000011', '6', 'Oliver Bennett', 'Handicap: 3', 5, 'A premium resort course with strong visuals and a few holes that really ask for commitment into the wind.', '2026-03-21', 1),
  ('f0000000-0000-0000-0000-000000000012', '6', 'Chathuri Fernando', 'Member Guest', 5, 'Beautiful presentation, smooth service, and a round that feels special from arrival to the last putt.', '2026-02-16', 2),
  ('f0000000-0000-0000-0000-000000000013', '7', 'Ruwan Dias', 'Handicap: 8', 5, 'Koggala lets you play imaginative golf. The ground game matters more than most modern resort players expect.', '2026-03-03', 1),
  ('f0000000-0000-0000-0000-000000000014', '7', 'Isla Moore', 'Links Enthusiast', 4, 'Not overly severe, but the breeze and contours keep you thinking all the way through.', '2026-01-31', 2),
  ('f0000000-0000-0000-0000-000000000015', '8', 'James Hewitt', 'Handicap: 7', 4, 'Cool conditions and rolling terrain make this one feel distinct. It''s a satisfying mountain test.', '2026-03-07', 1),
  ('f0000000-0000-0000-0000-000000000016', '8', 'Pabasara Wijesinghe', 'Army Guest', 4, 'You feel the altitude and the challenge builds nicely as the round goes on. Worth the trip.', '2026-02-03', 2)
ON CONFLICT (id) DO UPDATE SET
  course_id = excluded.course_id,
  author_name = excluded.author_name,
  author_badge = excluded.author_badge,
  rating = excluded.rating,
  review_text = excluded.review_text,
  review_date = excluded.review_date,
  sort_order = excluded.sort_order;
