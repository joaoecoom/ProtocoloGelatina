import { z } from "zod";
import { BaseEventSchema, CurrencySchema } from "./base-event.schema";
import { VIDEO_PROGRESS_MARKS } from "./constants";

export const StepAnsweredEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("step_answered"),
  metadata_json: z.object({
    question_id: z.string().min(1),
    answer_id: z.string().min(1),
    answer_label: z.string().min(1),
    score: z.number().optional(),
  }),
});

export const VideoProgressEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("video_progress"),
  metadata_json: z.object({
    video_id: z.string().min(1),
    progress: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(95)]),
    video_time: z.number().nonnegative().optional(),
  }),
}).superRefine((d, ctx) => {
  if (!VIDEO_PROGRESS_MARKS.includes(d.metadata_json.progress as (typeof VIDEO_PROGRESS_MARKS)[number])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "video_progress progress must be one of: 25, 50, 75, 95.",
      path: ["metadata_json", "progress"],
    });
  }
});

export const CheckoutSessionCreatedEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("checkout_session_created"),
  metadata_json: z.object({
    stripe_checkout_session_id: z.string().min(1),
    offer_id: z.string().min(1),
    plan_id: z.string().min(1).optional(),
  }),
});

export const PaymentSuccessEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("payment_success"),
  order_id: z.string().min(1),
  revenue: z.number().finite(),
  currency: CurrencySchema,
  metadata_json: z
    .object({
      stripe_event_id: z.string().min(1),
      stripe_payment_intent_id: z.string().min(1).optional(),
      stripe_checkout_session_id: z.string().min(1).optional(),
      product_id: z.string().optional(),
      access_email: z.string().optional(),
    })
    .passthrough(),
});

export const RefundEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("refund"),
  order_id: z.string().min(1),
  revenue: z.number().finite(),
  currency: CurrencySchema,
  metadata_json: z.object({
    stripe_event_id: z.string().min(1),
    refund_id: z.string().min(1),
    reason: z.string().optional(),
  }),
});

export const ChargebackEventSchema = BaseEventSchema.safeExtend({
  event_name: z.literal("chargeback"),
  order_id: z.string().min(1),
  revenue: z.number().finite(),
  currency: CurrencySchema,
  metadata_json: z.object({
    stripe_event_id: z.string().min(1),
    dispute_id: z.string().min(1),
    reason: z.string().optional(),
  }),
});

export type StepAnsweredEvent = z.infer<typeof StepAnsweredEventSchema>;
export type VideoProgressEvent = z.infer<typeof VideoProgressEventSchema>;
export type CheckoutSessionCreatedEvent = z.infer<typeof CheckoutSessionCreatedEventSchema>;
export type PaymentSuccessEvent = z.infer<typeof PaymentSuccessEventSchema>;
export type RefundEvent = z.infer<typeof RefundEventSchema>;
export type ChargebackEvent = z.infer<typeof ChargebackEventSchema>;
