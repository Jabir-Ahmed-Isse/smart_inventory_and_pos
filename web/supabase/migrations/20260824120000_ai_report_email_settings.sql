-- ============================================================================
-- AI Report Agent — in-app EMAIL (SMTP) configuration per organization.
-- Adds SMTP settings to ai_report_settings so owners/admins can configure email
-- delivery entirely in the app (Settings → AI Reports) instead of server env.
-- The App Password is stored here; RLS already restricts this table to the org's
-- owner/admin, and the app never sends the stored password back to the browser.
-- ============================================================================

alter table public.ai_report_settings
  add column if not exists email_smtp_host   text,
  add column if not exists email_smtp_port   integer,
  add column if not exists email_smtp_secure boolean not null default true,
  add column if not exists email_smtp_user   text,
  add column if not exists email_smtp_pass   text,          -- Gmail App Password / SMTP password
  add column if not exists email_from        text,
  add column if not exists email_to          text,          -- where reports are delivered
  add column if not exists email_status      text not null default 'not_configured'; -- not_configured|pending|connected|error
