insert into public.golf_courses (
  id,
  title,
  location,
  place_query,
  image,
  style,
  price,
  rating,
  latitude,
  longitude,
  sort_order
)
values
  ('1', 'Royal Colombo Golf Club', 'Colombo', 'Royal Colombo Golf Club, Colombo, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFQTuBLe-u9FmukU3SbNqqdu9ybgr516nOv7pIwNqJMyOdvzkJNlpecYklTJRLn23WmSdej7h_1PeRAbRY5NwkwjlKUVeMwzNz4otStyk8hkhwncL_f1zt8JxrDJS0l0n0QdXzQalyyxCB3o1Uh9DT7uEEjnKspurv5JeH7qNQ9l4bV9ykKP8NbNSqMPlmAjZ-m6UDxUCAnzOJsLvH3kgFViRtbYyM2sHrH640XNMpsIKPFpJYb-WTFF2gOmZ24dEDrtC8ohCD6Gw', 'PARKLAND', 120, 4.9, 6.905285380135911, 79.88419185299367, 1),
  ('2', 'Victoria Golf & Country Resort', 'Kandy / Digana', 'Victoria Golf & Country Resort, Digana, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjFo59jzOkI8-rO5frZNhtdjOiYRt03WfnXDDG2L4auf1lfvlvQFfKkwCIJ0F-kPui754kDVL6wn2X4vSigAzfQnCCjPEQo1gOOVWiPHa146pimZe5ClBkkz64WVvNTd6IWiNt3FBjdA3tvbyNTLJJcT3oRe8Edt0286YpuVJPrSmJJkeZyl3cNnGIKyvBSS7BwfPo7yRTbQpHkA5jsQUcq1Hiw3CVBky9zg4demJUXPsKxHvcuNIM1cdkM6HX0Mg7UI0wnvyBmNc', 'COASTAL', 85, 4.7, 7.264680696986498, 80.77403805582475, 2),
  ('3', 'Nuwara Eliya Golf Club', 'Nuwara Eliya', 'Nuwara Eliya Golf Club, Nuwara Eliya, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBR2vOLXJsdBEqWB6Q9upkrN10Svhfc246lYZU4Fni0ScD-0JEHntcZj8NMErKGhaqy74dz5jvl6jlTO1W4n5T6q3a-GDJQiq1E5SGB91pMi5cqGoYrHgdFDQzDjDomSDVuNFk2Ihl7RABF3xVnk6-R8B__IgTG624jx4CIL43zQviW_lEl0Sz8un_M0iV16w5nyOaB5ZYmNAV4IytXOyuCrE6jwGwO9S462sVb2WKw9GxCtcf3O-F0tM_ULIW875SVwC111cm1Jc8', 'LINKS', 145, 4.8, 6.971971282155486, 80.76571996611204, 3),
  ('4', 'Eagles Golf Link', 'Trincomalee', 'Eagles Golf Link, Trincomalee, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpvFBwGBjyRw5Mem3SVr2AHnm794__vb9sSGUsv0QxbHyUH0YcGJZyWjAjb66vrbEc_EZCcQSpZyMghcTdy95ZkH26Mw4qmKUbrrfyOUKUlka8C0e8l3J8BRMgMfCkaDsNPWckcGbGO_Jo_gAg-DPXkYt6PN__50HZieWdaiTLYRltjVFHz7tZAWur9Q-B2g67T5-i-CF73a-w6KAAo17EmNI40zaJbdTOEnz1Dzphn0lJDPCFHhwmdnjJmsUerwBOEzSggKyuqms', 'DESERT', 110, 4.6, 8.535798504973808, 81.19818322309355, 4),
  ('5', 'Eagles Heritage Golf Club', 'Anuradhapura', 'Eagles Heritage Golf Club, Anuradhapura, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXVAcC8Jz0cxWoEcL8HzY41-Xl0S7u8IJAyeDp58DmmhgwWPAqeD8HgZUchre51G5mu6x7XO3__KfQHSnC5eer3jPdBsvGjSs1VPZkGCDDHwspT8ro3Za5Jnk_e4KeOeNDGSDCj3MoCGUXJBUfGt9AniK9XZtnt7hYfujjT_FKIFXBLRzGYZCkZpmtlXI-BwsmjH-EZ7IpGSUsABmjjyM8uXvjd9_Fra4ulzKVRmOyIyUu36KFG0O4_Apl8QjuDCxtFr2EBXKmh7w', 'PARKLAND', 95, 4.5, 8.296735106202165, 80.42496812379707, 5),
  ('6', 'Shangri La Hambantota Golf Resort & Spa', 'Hambantota', 'Shangri La Hambantota Golf Resort & Spa, Hambantota, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBut3NJMZaZTZ2-bmwu4OkdeZWK3U-d1wyW1gmn99dV80PF4sd-8KusqMSGria4aB7Jyt80OaWM7ZetSr59mdfzzHxTSNUVhOLYXhQu867Y_O-5GSAWAJATeVjYd8CNZa1WKQRDRycSVR8ZleCz-5AhlfmyBaO-zAesitS1YzQjkPXZGT_JeGibjGF5x1gbVlBh3lkh7Oac6cIcF-BM0iA0NBFT7cgy38VUNHuheRaMvFlOAU_jylr-jXkogprFvozbmSvjgg2aoto', 'COASTAL', 155, 4.9, 6.112915947036785, 81.06407119678414, 6),
  ('7', 'Koggala Golf Club', 'Koggala', 'Koggala Golf Club, Koggala, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0640pZ_20kbgD7XrQUbBD5Pjpy4xkGtvKNPjjj4L1hitNXjYktH26mbFSwUQIaHspT0a-U5N0jnLe745HI-aDY9i9Su2SfrtizuLtTpZI3DLzCALg_C9LMEDDsGkWTjZc-0CilhSDw-CVsFmxNvE6jqqVL6AE1DyXwXc1_fmWILIa94wLMRxBazupMapu8HyNDTTsn5ahjIy-ka34UlslSTcuSRrCFsSeQa8F6voYhIfN5MaObRDLhIei3L5w926oyavHx9I5A20', 'LINKS', 130, 4.8, 5.996820130056448, 80.32463590631559, 7),
  ('8', 'Army Golf Course', 'Diyathalawa', 'Army Golf Course, Diyatalawa, Sri Lanka', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD31va63-poQTz5DcokODagG8JILUhhL-OdfABzYz32H9Ai45HxghyORQuW-Fn6CERGSBCHBNBk_JkINDdjugFA2bd84JXqM5xXR995T0nPgCq12n3wqlMdxu3mJM6B_pNCIXdWbBdEN4_rxEjYCZJMpyP86-lfqZsixsCKnqTaG0TVh0wMTMoTYGndn6E7JXPlqBH3rHQIaL45Ymb8OgfPBxUKKOfyXSbSHnNDavOLwz5SGZem6kOq_e6cA7vSQeJe7FfuelZPZo8', 'DESERT', 210, 4.7, 6.809702575280297, 80.94806013954602, 8)
on conflict (id) do update
set
  title = excluded.title,
  location = excluded.location,
  place_query = excluded.place_query,
  image = excluded.image,
  style = excluded.style,
  price = excluded.price,
  rating = excluded.rating,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  sort_order = excluded.sort_order,
  is_active = true;

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
