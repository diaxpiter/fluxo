-- One-time backfill: from this point on, brand-new signups are routed through the
-- onboarding questionnaire (gated on profiles.onboarding_completed) before landing
-- on the dashboard. Existing accounts never answered it and never should have to,
-- so mark them all as already onboarded.
update public.profiles
set
  onboarding_completed = true;
