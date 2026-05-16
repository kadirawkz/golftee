# GolfTee

GolfTee is an Expo Router mobile app for discovering golf courses and booking tee times.
It uses Supabase for authentication, profiles, favorites, course catalog data, tee-slot availability, and bookings.

## Current backend scope

- Email/password auth (sign up, sign in, sign out)
- Password reset email trigger
- Secure session persistence (`expo-secure-store` with AsyncStorage fallback)
- User profile read/update flow
- Per-user favorites with RLS
- Tee-time booking create/update/cancel flows with slot conflict protection
- Server-calculated booking pricing and backend-enforced slot validation
- Supabase-backed course catalog and tee-slot templates (read-only from client)
- Supabase-backed course detail content, amenities, and reviews

## Tech stack

- React Native + Expo + Expo Router
- TypeScript
- Supabase JS client (`@supabase/supabase-js`)

## Project scripts

- Install deps: `npm install`
- Start dev server: `npm run start`
- Run Android: `npm run android`
- Run iOS: `npm run ios`
- Run web: `npm run web`
- Lint: `npm run lint`

Note: There is currently no test runner configured in this repository.

## Git hygiene

This repo normalizes text files with [.gitattributes](.gitattributes), so line-ending conversion warnings on Windows are expected during staging but commits are stored with LF.

## Local setup

1. Create a Supabase project.
2. In Supabase SQL editor, execute the following scripts in order:
   - [supabase/schema.sql](supabase/schema.sql) (Initial structure)
   - [supabase/migrations/20240516_normalization_3nf.sql](supabase/migrations/20240516_normalization_3nf.sql) (3NF normalization)
   - [supabase/migrations/20240516_cleanup_legacy.sql](supabase/migrations/20240516_cleanup_legacy.sql) (Legacy cleanup)
   - [supabase/seed_courses.sql](supabase/seed_courses.sql) (Professional course data)
3. Copy [.env.example](.env.example) to `.env`.
4. Set your credentials in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. In Supabase Auth settings:
   - Enable the Email provider.
   - Configure redirect URLs if you plan to use password resets.
6. Start the development server: `npm run android` or `npm run ios`.

## Professional Architecture

- **3NF Database**: Fully normalized schema for courses, locations, and styles.
- **Image Mapping**: High-resolution local asset resolution for premium visuals.
- **Colombo Timezone Logic**: Booking slots are strictly synchronized with Sri Lankan local time to prevent "past-slot" booking errors.
- **Secure RPCs**: Critical business logic (booking validation, pricing) is handled via server-side PostgreSQL functions to prevent client-side manipulation.
- **RLS (Row Level Security)**: Data is protected at the database level; users can only access their own profiles and bookings.

## Pre-push checklist

Run from project root:

```bash
npm run lint
npx tsc --noEmit
npm audit --omit=dev
git status --short
```

Before pushing, confirm:

- `.env` is not tracked
- only `.env.example` is committed
- no local credential files (for example `.npmrc`) are staged
- `.gitattributes` is present so Git keeps text files normalized across platforms

## Deferred features

The following are intentionally out of scope for this phase:

- Payments
- Notifications
- Media/file uploads
- Analytics and advanced monitoring
- Admin workflows requiring server-side secrets

For admin actions or secret-bearing operations, use Supabase Edge Functions or a private backend.
