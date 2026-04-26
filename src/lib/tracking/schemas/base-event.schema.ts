import { z } from "zod";
import { EVENT_NAMES, FINANCIAL_EVENT_SET, FUNNEL_EVENT_SET, STEP_EVENT_SET } from "./constants";

export const EventNameSchema = z.enum(EVENT_NAMES);
export const CurrencySchema = z.string().length(3).regex(/^[A-Z]{3}$/);

export const BaseEventSchema = z
  .object({
    event_id: z.string().min(8),
    event_name: EventNameSchema,
    event_version: z.number().int().min(1).default(1),
    timestamp: z.string().datetime({ offset: true }),
    schema_name: z.string().min(1),
    schema_version: z.number().int().min(1).default(1),

    session_id: z.string().min(1).optional(),
    visitor_id: z.string().min(1).optional(),
    anonymous_id: z.string().min(1).optional(),
    lead_id: z.string().min(1).optional(),
    user_id: z.string().min(1).optional(),
    order_id: z.string().min(1).optional(),

    funnel_id: z.string().min(1).optional(),
    step_id: z.string().min(1).optional(),
    page_type: z.string().min(1).optional(),

    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    fbclid: z.string().optional(),
    gclid: z.string().optional(),
    ttclid: z.string().optional(),

    ip: z.string().optional(),
    country: z.string().optional(),
    device: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    referrer: z.string().optional(),

    revenue: z.number().finite().optional(),
    currency: CurrencySchema.optional(),

    metadata_json: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((data, ctx) => {
    const hasAnyIdentifier =
      Boolean(data.session_id) ||
      Boolean(data.visitor_id) ||
      Boolean(data.anonymous_id) ||
      Boolean(data.lead_id) ||
      Boolean(data.user_id);

    if (!hasAnyIdentifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one identifier is required: session_id, visitor_id, anonymous_id, lead_id or user_id.",
        path: ["session_id"],
      });
    }

    if (FUNNEL_EVENT_SET.has(data.event_name) && !data.funnel_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "funnel_id is required for funnel events.",
        path: ["funnel_id"],
      });
    }

    if (STEP_EVENT_SET.has(data.event_name) && !data.step_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "step_id is required for step events.",
        path: ["step_id"],
      });
    }

    if (FINANCIAL_EVENT_SET.has(data.event_name)) {
      if (!data.order_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "order_id is required for financial events.",
          path: ["order_id"],
        });
      }
      if (typeof data.revenue !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "revenue is required for financial events.",
          path: ["revenue"],
        });
      }
      if (!data.currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "currency is required for financial events.",
          path: ["currency"],
        });
      }
    }
  });

export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type EventName = z.infer<typeof EventNameSchema>;
