export type ProtocolPlanCategory = "advanced" | "usage";

export type ProtocolPlanTemplate = {
  id: string;
  category: ProtocolPlanCategory;
  title: string;
  description: string;
  gelatinaSlug: string;
  recommendedHour: number;
  durationDays: number;
  color: string;
};

export type ActiveProtocolPlan = ProtocolPlanTemplate & {
  startedAt: string;
};

export const PROTOCOL_PLAN_TEMPLATES: ProtocolPlanTemplate[] = [
  {
    id: "advanced-debloat-14",
    category: "advanced",
    title: "Desinchar 14 dias",
    description: "Rotação focada em reduzir retenção e desconforto abdominal.",
    gelatinaSlug: "pepino",
    recommendedHour: 11,
    durationDays: 14,
    color: "#2F855A",
  },
  {
    id: "advanced-energy-21",
    category: "advanced",
    title: "Energia 21 dias",
    description: "Combinações para estabilidade de energia ao longo do dia.",
    gelatinaSlug: "cha-verde",
    recommendedHour: 16,
    durationDays: 21,
    color: "#D53F8C",
  },
  {
    id: "advanced-night-21",
    category: "advanced",
    title: "Sono e recuperação",
    description: "Plano noturno para rotina de relaxamento e sono consistente.",
    gelatinaSlug: "noturna",
    recommendedHour: 21,
    durationDays: 21,
    color: "#5A67D8",
  },
  {
    id: "usage-before-lunch-30",
    category: "usage",
    title: "Antes do almoço",
    description: "Tomar diariamente antes do almoço para controlar picos de fome.",
    gelatinaSlug: "limao",
    recommendedHour: 12,
    durationDays: 30,
    color: "#B7791F",
  },
  {
    id: "usage-afternoon-30",
    category: "usage",
    title: "Lanche estratégico",
    description: "Lanche da tarde com foco em saciedade e foco mental.",
    gelatinaSlug: "gengibre",
    recommendedHour: 17,
    durationDays: 30,
    color: "#319795",
  },
];

const ACTIVE_PLANS_KEY = "pg-active-protocol-plans-v1";
const PLAN_CHECKINS_KEY = "pg-plan-checkins-v1";

export function normalizeYmd(date: Date) {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function readActiveProtocolPlans(): ActiveProtocolPlan[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ACTIVE_PLANS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ActiveProtocolPlan[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p?.id === "string" && typeof p?.startedAt === "string");
  } catch {
    return [];
  }
}

export function writeActiveProtocolPlans(plans: ActiveProtocolPlan[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_PLANS_KEY, JSON.stringify(plans));
}

function readCheckins(): Record<string, true> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(PLAN_CHECKINS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCheckins(map: Record<string, true>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAN_CHECKINS_KEY, JSON.stringify(map));
}

export function activateProtocolPlan(template: ProtocolPlanTemplate) {
  const current = readActiveProtocolPlans();
  if (current.some((p) => p.id === template.id)) return current;
  const next: ActiveProtocolPlan[] = [
    ...current,
    {
      ...template,
      startedAt: new Date().toISOString(),
    },
  ];
  writeActiveProtocolPlans(next);
  return next;
}

export function deactivateProtocolPlan(planId: string) {
  const next = readActiveProtocolPlans().filter((p) => p.id !== planId);
  writeActiveProtocolPlans(next);
  return next;
}

export function markPlanCheckin(planId: string, dateYmd: string) {
  const map = readCheckins();
  map[`${planId}:${dateYmd}`] = true;
  writeCheckins(map);
}

export function hasPlanCheckin(planId: string, dateYmd: string) {
  const map = readCheckins();
  return Boolean(map[`${planId}:${dateYmd}`]);
}

export function isPlanActiveOnDate(plan: ActiveProtocolPlan, dateYmd: string) {
  const start = new Date(plan.startedAt);
  const date = new Date(`${dateYmd}T12:00:00`);
  const diffMs = date.getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12).getTime();
  const day = Math.floor(diffMs / 86_400_000);
  return day >= 0 && day < plan.durationDays;
}
