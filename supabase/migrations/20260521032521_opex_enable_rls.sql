-- Phase 21.2 / OPS-501-FIX: enable RLS on opex_* tables.
--
-- The Phase 21 init migration (20260520120000_opex_init.sql) created three
-- tables in the public schema with RLS disabled, reasoning that they are
-- service-role-only by design. Supabase advisors flagged this as ERROR-level
-- (rls_disabled_in_public + sensitive_columns_exposed for session_id on
-- opex_event / opex_session_budget) - the public schema is exposed to the
-- Data API, so any anon/authenticated grant added later would expose these.
--
-- Per the Supabase agent skill's principle 5: enable RLS on every table in
-- any exposed schema. service_role bypasses RLS by default, so the Vercel
-- server functions that use SUPABASE_SERVICE_ROLE_KEY continue to read/write
-- normally. With RLS enabled and no policies created, anon and authenticated
-- have zero access - which is exactly the contract these tables need.
--
-- If a future FinOps dashboard needs read access for an admin role, add a
-- narrow SELECT policy at that point. For now, no policies = no public access.

ALTER TABLE public.opex_state          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opex_session_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opex_event          ENABLE ROW LEVEL SECURITY;
