import { z } from "zod";
import {
  APP_EVENT_NAMES,
  CHECKOUT_EVENT_NAMES,
  FINANCIAL_CATEGORY_EVENT_NAMES,
  QUIZ_EVENT_NAMES,
  TRAFFIC_EVENT_NAMES,
  UPSELL_DOWNSELL_EVENT_NAMES,
  VSL_EVENT_NAMES,
} from "./constants";
import { BaseEventSchema } from "./base-event.schema";

function hasCategoryEvent(names: readonly string[], eventName: string) {
  return names.includes(eventName);
}

export const TrafficEventSchema = BaseEventSchema.refine((d) => hasCategoryEvent(TRAFFIC_EVENT_NAMES, d.event_name), {
  message: "Event does not belong to traffic category.",
});

export const QuizEventSchema = BaseEventSchema.refine((d) => hasCategoryEvent(QUIZ_EVENT_NAMES, d.event_name), {
  message: "Event does not belong to quiz category.",
});

export const VSLEventSchema = BaseEventSchema.refine((d) => hasCategoryEvent(VSL_EVENT_NAMES, d.event_name), {
  message: "Event does not belong to VSL category.",
});

export const CheckoutEventSchema = BaseEventSchema.refine((d) => hasCategoryEvent(CHECKOUT_EVENT_NAMES, d.event_name), {
  message: "Event does not belong to checkout category.",
});

export const FinancialEventSchema = BaseEventSchema.refine(
  (d) => hasCategoryEvent(FINANCIAL_CATEGORY_EVENT_NAMES, d.event_name),
  {
    message: "Event does not belong to financial category.",
  },
);

export const UpsellDownsellEventSchema = BaseEventSchema.refine(
  (d) => hasCategoryEvent(UPSELL_DOWNSELL_EVENT_NAMES, d.event_name),
  {
    message: "Event does not belong to upsell/downsell category.",
  },
);

export const AppEventSchema = BaseEventSchema.refine((d) => hasCategoryEvent(APP_EVENT_NAMES, d.event_name), {
  message: "Event does not belong to app category.",
});

export type TrafficEvent = z.infer<typeof TrafficEventSchema>;
export type QuizEvent = z.infer<typeof QuizEventSchema>;
export type VSLEvent = z.infer<typeof VSLEventSchema>;
export type CheckoutEvent = z.infer<typeof CheckoutEventSchema>;
export type FinancialEvent = z.infer<typeof FinancialEventSchema>;
export type UpsellDownsellEvent = z.infer<typeof UpsellDownsellEventSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;
