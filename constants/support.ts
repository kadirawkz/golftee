/**
 * Support & Contact Constants
 *
 * Update these values here to change support contact details across the entire app.
 * In a production backend-driven setup, these could be fetched from a remote config
 * table (e.g. Supabase `app_config`) so updates don't require a new app release.
 */

export const SUPPORT = {
  /** Phone number for the Club Concierge priority support line */
  CONCIERGE_PHONE: "tel:+94123456789",

  /** Email address for the Support Desk */
  SUPPORT_EMAIL: "support@golftee.com",

  /** Pre-filled subject line for support emails */
  SUPPORT_EMAIL_SUBJECT: "GolfTee Support Request",

  /** Display label for the concierge phone (used in toasts/alerts) */
  CONCIERGE_PHONE_DISPLAY: "+94 123 456 789",
} as const;
