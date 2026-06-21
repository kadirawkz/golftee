# GolfTee Production Deployment & Environment Isolation Manual

This document outlines the step-by-step procedure for deploying the **GolfTee** mobile application to a production environment. Follow these guidelines to establish a secure, isolated database backend, optimize database performance under heavy traffic, and manage application configurations safely.

---

## 1. Environment Segregation (Staging vs. Production)

To prevent developmental testing from altering or destroying real customer records, development/staging resources must be completely isolated from production.

### Supabase Isolation Checklist
1. **Create Two Separate Projects** in the Supabase Dashboard:
   - `golftee-staging` (for development and QA verification)
   - `golftee-production` (for live customer traffic)
2. **Update Environment Files:**
   - Dev/Staging should point to the staging project in `.env`.
   - Production builds must refer to the production project in `.env.production` (or equivalent CI environment variables).

### EAS Build Env Integration
When configuring EAS build commands, specify env files using profile variables in [eas.json](file:///d:/repos/golftee/eas.json):
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-production-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-anon-key"
      }
    }
  }
}
```

---

## 2. Database Schema & Policy Migration

Deploy the database schema, functions, constraints, and Row Level Security (RLS) policies using the Supabase CLI.

### CLI Deployment Workflow
1. **Initialize Supabase CLI** in the project directory:
   ```bash
   npx supabase init
   ```
2. **Link CLI to Staging & Production** projects:
   ```bash
   npx supabase link --project-ref <production-project-id>
   ```
3. **Apply Database Migration Script:**
   Push the contents of the database schema file [schema.sql](file:///d:/repos/golftee/supabase/schema.sql) directly to the linked database:
   ```bash
   npx supabase db push
   ```
4. **Seed Static Data (Locations, Courses, Tiers):**
   Apply [seed.sql](file:///d:/repos/golftee/supabase/seed.sql) to populate structural metadata. Ensure **no mock user records** are seeded into the production database.
5. **Real-time Replication Enablement:**
   Ensure the `supabase_realtime` publication is configured to include the `notifications` table so clients receive instant server updates:
   ```sql
   alter publication supabase_realtime add table public.notifications;
   ```

### Security Reinforcement (Least Privilege)
To safeguard user data, execute the revoke grants to restrict anonymous write access on structural catalog tables:
```sql
REVOKE INSERT, UPDATE, DELETE ON public.locations, public.course_styles, public.membership_tiers, public.golf_courses FROM anon, authenticated;
```

- **Function Security (Invoker vs Definer)**: Critical functions (e.g., `create_tee_time_booking` and `cancel_tee_time_booking`) run under `SECURITY INVOKER` to guarantee they respect the active user's permissions and Row-Level Security (RLS) instead of executing with administrative permissions.

---

## 3. High-Scale Connection Pooling (pgBouncer)

Mobile applications querying databases directly via client libraries open individual client sessions. In high-traffic periods, postgres connections can be quickly exhausted.

### Transaction Mode Pooling Config
To resolve this, route all production requests through Supabase's transaction-pooler.
1. In the Supabase Dashboard, navigate to **Settings** > **Database**.
2. Locate the **Connection Pooler** section and copy the **Pooler Connection String**.
3. Ensure the port is set to **`6543`** (which runs in **Transaction Mode**, reusing active database connections on demand).
4. Update `EXPO_PUBLIC_SUPABASE_URL` in `.env.production` to point to the pooled domain:
   - String template: `postgres://[db-user].[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/[db-name]?pgbouncer=true`

---

## 4. Key Rotation & Security Checklist

Before building binary release candidates for the Google Play Store or Apple App Store, verify that security tokens have been rotated from dev values.

| Secret Key | Description | Storage/Source | Rotation Policy |
| :--- | :--- | :--- | :--- |
| **Supabase Anon Key** | Client-side public key for anonymous API requests. | `.env.production` | Change if the dev keys are accidentally checked into Git history. |
| **JWT Secret Key** | Cryptographic key used to sign database authentication tokens. | Supabase Console | Rotate periodically (every 180 days) via the settings dashboard. |
| **Database Password** | Administrative credentials for migrations. | CLI Environment | Must be strong, unique, and stored in a password manager. |
| **Service Role Key** | Superuser bypass key with full database access. | CLI environment | **NEVER** expose to the client-side app bundle. |
