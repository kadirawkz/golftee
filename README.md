# GolfTee 🏌️‍♂️

GolfTee is an Expo Router mobile application designed for discovering premium golf courses and booking tee times. It integrates Supabase for secure authentication, user profiles, favorites management, course catalog data, tee-slot availability, and real-time bookings.

---

## 📖 Table of Contents

- [Features](#-features)
- [📂 Directory Structure](#-directory-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Local Setup & Installation](#-local-setup--installation)
- [📦 Available Scripts](#-available-scripts)
- [🏗️ Professional Architecture](#️-professional-architecture)
- [🔄 CI/CD Pipeline & Git Hygiene](#-cicd-pipeline--git-hygiene)
- [📱 EAS Build & Deployment](#-eas-build--deployment)
- [✅ Pre-Push Checklist](#-pre-push-checklist)
- [⏳ Deferred Features](#-deferred-features)

---

## ✨ Features

- **Email & Password Authentication**: Seamless registration, login, logout, and secure session management.
- **Secure Session Persistence**: Hybrid storage engine (`expo-secure-store` with `AsyncStorage` fallback) featuring a user-controlled "Remember Me" toggle.
- **User Profile Management**: Flow for reading and updating user profile data.
- **Tee-Time Bookings**: Conflict-protected booking creations, updates, and cancellations with server-side validations.
- **Real-Time Synchronized Notifications**: Push and in-app alerts powered by Supabase Realtime replication.
- **Location-Based Services**: Nearby golf course recommendations based on user proximity using `expo-location`.
- **Dynamic Weather Integration**: Localized weather forecast details for golf courses fetched via Open-Meteo API.

---

## 📂 Directory Structure

Below is the directory map of the codebase to help you navigate:

```text
golftee/
├── .github/                  # GitHub configuration
│   └── workflows/
│       └── ci.yml            # CI/CD pipeline definition
├── app/                      # Expo Router pages & routing logic
│   ├── (tabs)/               # Bottom-tab bar screen routes (home, explore, etc.)
│   ├── _layout.tsx           # Application layout shell & auth guard logic
│   ├── tee-time-booking.tsx  # Booking slot selection screen
│   └── booking-checkout.tsx  # Final checkout page
├── assets/                   # Static images, app icons, and branding materials
│   └── images/
│       └── courses/          # Golf course thumbnail visual assets
├── components/               # Reusable UI components
│   ├── animated-pressable.tsx# Motion-wrapped interactive buttons
│   ├── theme.tsx             # Design system tokens (colors, animations, sizes)
│   └── app-bottom-tabs.tsx   # Custom bottom navigation bar configuration
├── constants/                # Project wide static constants
├── hooks/                    # Custom React hooks (e.g., useResponsiveLayout)
├── lib/                      # Base client setup and shared storage configs
│   ├── supabase.ts           # Supabase client instantiation
│   └── database.types.ts     # Database TypeScript types generated from Supabase
├── services/                 # Business logic, state, and API wrappers
│   ├── auth.ts               # Auth state manager & secure storage wrapper
│   ├── bookings.ts           # Tee time booking CRUD logic
│   ├── course-data.ts        # Course list & detail fetcher
│   └── __tests__/            # Jest unit tests for core services
├── supabase/                 # Supabase migration scripts and SQL database files
│   ├── schema.sql            # Database tables, triggers, and RPC definitions
│   └── seed.sql              # Core initial catalog lookup records
└── utils/                    # Common helper modules
    ├── colombo-time.ts       # Time zone converter to prevent past-slot bookings
    └── map-links.ts          # External map deep linking helpers
```

---

## 🛠️ Tech Stack

- **Framework**: React Native + Expo (SDK 54) + Expo Router
- **Language**: TypeScript
- **Database / Backend**: Supabase (Database, Auth, RPC, Realtime, RLS)
- **Styling**: Native styling using theme configuration tokens
- **Testing**: Jest + `jest-expo` + `ts-jest`

---

## 🚀 Local Setup & Installation

Follow these steps to get a local development instance running:

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Git](https://git-scm.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for migrations)

### 2. Database Provisioning
1. Create a project in the [Supabase Dashboard](https://database.new).
2. Open the **SQL Editor** in your Supabase dashboard and execute:
   - [supabase/schema.sql](file:///d:/repos/golftee/supabase/schema.sql) (Table structures, constraints, and RLS policies)
   - [supabase/seed.sql](file:///d:/repos/golftee/supabase/seed.sql) (Initial courses and locations)

### 3. Local Project Setup
```bash
# Clone the repository and navigate to the directory
cd golftee

# Install dependencies
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

Open `.env` and set:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Running the Application
Start the development server on your preferred platform:
```bash
# Start dev server
npm run start

# Launch on Android (requires emulator or connected device)
npm run android

# Launch on iOS (requires macOS and Simulator/Xcode)
npm run ios

# Launch on Web
npm run web
```

---

## 📦 Available Scripts

These npm scripts are defined in `package.json` for development, styling, and verification:

| Script | Description | Command |
| :--- | :--- | :--- |
| `start` | Starts the Expo development server | `npm run start` |
| `android` | Builds and runs the native Android client | `npm run android` |
| `ios` | Builds and runs the native iOS client | `npm run ios` |
| `web` | Runs the web version in a local browser | `npm run web` |
| `lint` | Analyzes code for stylistic and linting issues | `npm run lint` |
| `typecheck` | Verifies TypeScript code compliance | `npm run typecheck` |
| `test` | Runs the Jest test suites | `npm run test` |
| `reset-project` | Resets the starter template directory structure | `npm run reset-project` |

---

## 🏗️ Professional Architecture

- **3NF Database Design**: Highly normalized database structure for courses, styles, locations, and users to prevent redundancy.
- **Secure RPCs**: Business logic rules (like booking checks and pricing calculations) are executed server-side via PostgreSQL RPC functions, preventing client manipulation.
- **Timezone Synchronization**: Booking validations are synchronized to the local time of golf courses (Sri Lanka/Colombo timezone) to prevent booking past slots.
- **Row-Level Security (RLS)**: Enforced on all tables in Supabase. Users can only modify or access their own bookings, profiles, and favorites.
- **Asset Resolution Mapping**: High-definition local imagery maps dynamically to online courses to deliver a fast, offline-first visual feel.

---

## 🔄 CI/CD Pipeline & Git Hygiene

- **Automated Validation**: A GitHub Actions workflow at [.github/workflows/ci.yml](file:///d:/repos/golftee/.github/workflows/ci.yml) executes on pushes and pull requests to `main`. It automatically runs code linting (`npm run lint`) and compiler type checking (`npm run typecheck`).
- **Line Ending Conversions**: The [.gitattributes](file:///d:/repos/golftee/.gitattributes) file normalizes files to LF line endings upon commit, preventing Windows CRLF mismatch warnings.

---

## 📱 EAS Build & Deployment

This project uses **Expo Application Services (EAS)** for building native packages:
- **Project ID**: Configured in `app.json` (`projectId: 2563be69-491d-4cd7-a07f-671d568260a8`).
- **Profiles**: Configured inside [eas.json](file:///d:/repos/golftee/eas.json) for `development`, `preview`, and `production`.
- Refer to [PRODUCTION.md](file:///d:/repos/golftee/PRODUCTION.md) for full deployment workflows.

---

## ✅ Pre-Push Checklist

Before pushing changes to GitHub, run the following verification checks from the project root:

```bash
# 1. Run eslint check
npm run lint

# 2. Run typescript compilations
npm run typecheck

# 3. Run Jest tests
npm run test

# 4. Check package safety
npm audit --omit=dev
```

Ensure:
- `.env` files are excluded from commits.
- All code styles conform to existing patterns.

---

## ⏳ Deferred Features

The following functionalities are intentionally deferred:
- **Direct Payment Gateway Integrations**: Simulated checkouts are used for demo purposes.
- **Media Uploading**: Course thumbnails and profiles use static URLs.
- **Administrative Portals**: Admin workflows must be managed through the Supabase console or separate admin services.
