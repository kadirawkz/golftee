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

## Local setup

1. Create a Supabase project.
2. In Supabase SQL editor, run [supabase/schema.sql](supabase/schema.sql).
3. Then run [supabase/seed_courses.sql](supabase/seed_courses.sql).
4. Copy [.env.example](.env.example) to `.env`.
5. Set values in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. In Supabase Auth settings:
   - Keep Email provider enabled
   - Configure confirmation policy based on your release needs
   - Configure redirect URLs if you add in-app reset confirmation flow
7. Start the app with `npm run start`.

## Security model

- Client only uses public anon key (never service role key).
- Row Level Security is enabled for user-owned tables.
- Profile, favorites, and bookings are scoped to `auth.uid()`.
- Booking slot availability is exposed via RPC instead of broad booking table reads.
- RPC execution is restricted to `authenticated` in [supabase/schema.sql](supabase/schema.sql).
- Session tokens are persisted in secure storage where available.

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

## Deferred features

The following are intentionally out of scope for this phase:

- Payments
- Notifications
- Media/file uploads
- Analytics and advanced monitoring
- Admin workflows requiring server-side secrets

For admin actions or secret-bearing operations, use Supabase Edge Functions or a private backend.
