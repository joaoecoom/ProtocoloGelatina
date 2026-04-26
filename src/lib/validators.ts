import { z } from "zod";
import { PROTOCOL_PLAN_TEMPLATES } from "@/lib/protocol-plans";

const planIds = [
  "FRONT",
  "UPSELL_1",
  "DS1_UP1",
  "DS2_UP1",
  "DS3_UP1",
  "UPSELL_2",
  "DS1_UP2",
  "DS2_UP2",
  "DS3_UP2",
] as const;

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const onboardingSchema = z.object({
  age: z.coerce.number().int().min(14).max(90),
  heightCm: z.coerce.number().min(130).max(220),
  weightKg: z.coerce.number().min(35).max(250),
  goalWeightKg: z.coerce.number().min(35).max(250).optional(),
  goal: z.string().min(2).max(200),
  mainProblem: z.enum([
    "barriga-inchada",
    "fome-descontrolada",
    "energia-baixa",
    "sono-fraco",
    "stress-alto",
    "pos-parto",
    "menopausa",
  ]),
  quiz: z
    .object({
      sleepDifficulty: z.coerce.number().int().min(1).max(5),
      digestiveDiscomfort: z.coerce.number().int().min(1).max(5),
      stressLevel: z.coerce.number().int().min(1).max(5),
      afternoonEnergyDip: z.coerce.number().int().min(1).max(5),
      mealRegularity: z.coerce.number().int().min(1).max(5),
      hydrationConsistency: z.coerce.number().int().min(1).max(5),
    })
    .optional(),
});

export const trackingSchema = z.object({
  waterMl: z.coerce.number().int().min(0).max(8000).optional(),
  moodNote: z.string().max(500).optional(),
  bloating: z.coerce.number().int().min(0).max(5).optional(),
  energy: z.coerce.number().int().min(0).max(5).optional(),
  hunger: z.coerce.number().int().min(0).max(5).optional(),
  sleep: z.coerce.number().int().min(0).max(5).optional(),
  markManha: z.boolean().optional(),
  markAlmoco: z.boolean().optional(),
  markLanche: z.boolean().optional(),
  markJanta: z.boolean().optional(),
});

export const planUpdateSchema = z.object({
  plan: z.enum(planIds),
});

const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/);

export const mealReminderScheduleSchema = z.object({
  markManha: hhmm,
  markAlmoco: hhmm,
  markLanche: hhmm,
  markJanta: hhmm,
});

export const pushSubscribeBodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().min(20),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
    expirationTime: z.number().nullable().optional(),
  }),
  timeZone: z.string().min(1).max(80).optional(),
});

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().min(20),
});

export const notificationPrefsBodySchema = z.object({
  daily: z.boolean(),
  progress: z.boolean(),
  reactivation: z.boolean(),
});

const storedActivePlanSchema = z.object({
  id: z.string().refine((id) => PROTOCOL_PLAN_TEMPLATES.some((t) => t.id === id)),
  startedAt: z.string().min(16).max(40),
});

export const protocolPlansStateSchema = z.object({
  activePlans: z.array(storedActivePlanSchema).max(20),
  checkins: z.record(z.string().max(120), z.literal(true)).optional(),
});

export const quizMetricEventSchema = z.object({
  sessionId: z.string().min(8).max(80),
  eventType: z.string().min(2).max(64),
  step: z.number().int().min(0).max(200).optional(),
  stepId: z.string().min(1).max(80).optional(),
  questionId: z.string().min(1).max(80).optional(),
  optionId: z.string().min(1).max(120).optional(),
  buttonId: z.string().min(1).max(120).optional(),
  path: z.string().min(1).max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
