export const EVENT_NAMES = [
  // Traffic
  "page_view",
  "landing_view",
  // Quiz
  "quiz_started",
  "step_viewed",
  "step_answered",
  "step_completed",
  "quiz_completed",
  "quiz_abandoned",
  "result_viewed",
  "result_cta_clicked",
  // VSL / VTurb
  "video_loaded",
  "video_played",
  "video_progress",
  "pitch_viewed",
  "cta_visible",
  "cta_clicked",
  // Checkout / Stripe
  "checkout_started",
  "checkout_session_created",
  "payment_success",
  "payment_failed",
  "refund",
  "chargeback",
  // Upsell / Downsell
  "upsell_viewed",
  "upsell_accepted",
  "upsell_rejected",
  "downsell_viewed",
  "downsell_accepted",
  "downsell_rejected",
  // App
  "app_access_created",
  "login",
  "onboarding_started",
  "onboarding_completed",
] as const;

export const FUNNEL_EVENT_NAMES = [
  "landing_view",
  "quiz_started",
  "step_viewed",
  "step_answered",
  "step_completed",
  "quiz_completed",
  "quiz_abandoned",
  "result_viewed",
  "result_cta_clicked",
  "video_loaded",
  "video_played",
  "video_progress",
  "pitch_viewed",
  "cta_visible",
  "cta_clicked",
  "checkout_started",
  "checkout_session_created",
  "upsell_viewed",
  "upsell_accepted",
  "upsell_rejected",
  "downsell_viewed",
  "downsell_accepted",
  "downsell_rejected",
] as const;

export const STEP_EVENT_NAMES = ["step_viewed", "step_answered", "step_completed"] as const;

export const FINANCIAL_EVENT_NAMES = ["payment_success", "refund", "chargeback"] as const;

export const VIDEO_PROGRESS_MARKS = [25, 50, 75, 95] as const;

export const TRAFFIC_EVENT_NAMES = ["page_view", "landing_view"] as const;
export const QUIZ_EVENT_NAMES = [
  "quiz_started",
  "step_viewed",
  "step_answered",
  "step_completed",
  "quiz_completed",
  "quiz_abandoned",
  "result_viewed",
  "result_cta_clicked",
] as const;
export const VSL_EVENT_NAMES = [
  "video_loaded",
  "video_played",
  "video_progress",
  "pitch_viewed",
  "cta_visible",
  "cta_clicked",
] as const;
export const CHECKOUT_EVENT_NAMES = ["checkout_started", "checkout_session_created"] as const;
export const FINANCIAL_CATEGORY_EVENT_NAMES = ["payment_success", "payment_failed", "refund", "chargeback"] as const;
export const UPSELL_DOWNSELL_EVENT_NAMES = [
  "upsell_viewed",
  "upsell_accepted",
  "upsell_rejected",
  "downsell_viewed",
  "downsell_accepted",
  "downsell_rejected",
] as const;
export const APP_EVENT_NAMES = ["app_access_created", "login", "onboarding_started", "onboarding_completed"] as const;

export const FUNNEL_EVENT_SET = new Set<string>(FUNNEL_EVENT_NAMES);
export const STEP_EVENT_SET = new Set<string>(STEP_EVENT_NAMES);
export const FINANCIAL_EVENT_SET = new Set<string>(FINANCIAL_EVENT_NAMES);
