# Copilot instructions for GolfTee

## Build, test, and lint commands

Use npm scripts from `package.json`:

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Start Expo dev server | `npm run start` (or `npx expo start`) |
| Run on Android | `npm run android` |
| Run on iOS | `npm run ios` |
| Run on Web | `npm run web` |
| Lint | `npm run lint` |
| Typecheck compiler | `npm run typecheck` |
| Run tests | `npm run test` |
| Reset starter scaffold | `npm run reset-project` |

### Testing Framework

Jest is configured as the test runner. Core test suites are organized as follows:
- **Service Tests**: Located under [services/__tests__/](file:///d:/repos/golftee/services/__tests__/) (e.g., `course-data.test.ts`)
- **Utility Tests**: Located under [utils/__tests__/](file:///d:/repos/golftee/utils/__tests__/) (e.g., `colombo-time.test.ts`)

---

## High-level architecture

This is an Expo Router app (`main: expo-router/entry`) with file-based routing in `app/`.

- **App shell and navigation**:
  - `app/_layout.tsx` owns the root `Stack`, route guarding (`getIsLoggedIn()`), and system background color updates.
  - `components/app-bottom-tabs.tsx` wraps all screens, renders custom header + bottom nav, and applies per-route chrome config.
  - Route transitions are centralized in `components/theme.ts` (`theme.motion.getScreenOptions`).

- **State/data modules in `components/`**:
  - `course-data.ts` is the source of truth for course records and derived collections (`featuredHomeCourses`, `nearbyHomeCourses`, etc.).
  - `favorites.ts` manages favorite course IDs with AsyncStorage + in-memory cache + `useSyncExternalStore`.
  - `auth.ts` manages logged-in state with AsyncStorage + in-memory cache.
  - `weather.ts` fetches 14-day forecasts from Open-Meteo with request de-duplication and in-memory caching.
  - `map-links.ts` encapsulates Google Maps deep linking with iOS app-scheme fallback.

- **Primary user flows**:
  - Auth gate: `/` and `/launch` redirect to `/splash` or `/home` based on `getIsLoggedIn()`.
  - Booking journey: `home/explore/profile` -> `/course-details?id=...` -> `/tee-time-booking?id=...` -> `/booking-checkout?...`.
  - Existing booking management: `/bookings` -> `/manage-booking` (param-driven).

---

## Key conventions in this codebase

- Use `AnimatedPressable` (`components/animated-pressable.tsx`) instead of raw `Pressable` for tappable UI; set `variant` (`button`, `cta`, `chip`, `card`, `icon`, `tab`) to match motion style.
- Use the centralized `theme` token set for colors, typography, spacing, radii, shadows, and route transition presets. Avoid hardcoding design values unless already patterned in file.
- Keep route metadata synchronized across multiple files when adding/removing screens:
  - `app/_layout.tsx` Stack screen list
  - `components/app-bottom-tabs.tsx` header/tab route config
  - `components/theme.ts` route transition mapping unions
- Route params are passed via Expo Router `params` and defensively parsed on receipt (see `tee-time-booking.tsx` and `booking-checkout.tsx` helpers).
- Storage keys are namespaced (`golftee:*`) and modules keep an in-memory cache to reduce AsyncStorage reads.
- Most screens follow a consistent mobile scroll pattern: `SafeAreaView` + `ScrollView` with `bounces={false}` and `overScrollMode="never"`.
- For heavier async UI work, this codebase often defers via `InteractionManager.runAfterInteractions` before fetching/mounting expensive pieces (weather/map flows).
