import { z } from "zod";
import { BaseEventSchema } from "./base-event.schema";
import {
  ChargebackEventSchema,
  CheckoutSessionCreatedEventSchema,
  PaymentSuccessEventSchema,
  RefundEventSchema,
  StepAnsweredEventSchema,
  VideoProgressEventSchema,
} from "./critical-event.schemas";

export const IngestEventSchema = z.discriminatedUnion("event_name", [
  // Critical strict schemas
  StepAnsweredEventSchema,
  VideoProgressEventSchema,
  CheckoutSessionCreatedEventSchema,
  PaymentSuccessEventSchema,
  RefundEventSchema,
  ChargebackEventSchema,

  // Base fallback schemas for remaining event names
  BaseEventSchema.safeExtend({ event_name: z.literal("page_view") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("landing_view") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("quiz_started") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("step_viewed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("step_completed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("quiz_completed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("quiz_abandoned") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("result_viewed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("result_cta_clicked") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("video_loaded") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("video_played") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("pitch_viewed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("cta_visible") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("cta_clicked") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("checkout_started") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("payment_failed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("upsell_viewed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("upsell_accepted") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("upsell_rejected") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("downsell_viewed") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("downsell_accepted") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("downsell_rejected") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("app_access_created") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("login") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("onboarding_started") }),
  BaseEventSchema.safeExtend({ event_name: z.literal("onboarding_completed") }),
]);

export const IngestEventsBatchSchema = z.object({
  events: z.array(IngestEventSchema).min(1).max(500),
});

export type IngestEvent = z.infer<typeof IngestEventSchema>;
export type IngestEventsBatch = z.infer<typeof IngestEventsBatchSchema>;
