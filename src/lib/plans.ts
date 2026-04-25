import type { PlanId, User } from "@prisma/client";

export type { PlanId };

/** Plano efectivo para gates de conteúdo: superadmin equivale a UPSELL_2. */
export function effectivePlanForAccess(user: Pick<User, "plan" | "isSuperAdmin">): PlanId {
  if (user.isSuperAdmin) return "UPSELL_2";
  return user.plan;
}

export type JessicaTier = "limited" | "medium" | "unlimited" | "priority";

export const PLAN_CATALOG: Record<
  PlanId,
  {
    label: string;
    trialEuro: number;
    monthlyEuro: number;
    description: string;
  }
> = {
  FRONT: {
    label: "Protocolo da Gelatina",
    trialEuro: 6.99,
    monthlyEuro: 29.99,
    description: "Gelatina completa, dashboard, tracking e Jéssica limitada.",
  },
  UPSELL_1: {
    label: "Plano X",
    trialEuro: 4.99,
    monthlyEuro: 29.99,
    description: "Kiwi, banana, combinações, planos avançados, cursos e ebooks completos.",
  },
  DS1_UP1: {
    label: "Plano X · Desinchar",
    trialEuro: 3.99,
    monthlyEuro: 19.99,
    description: "Kiwi + pepino, 1 curso, Jéssica nível médio.",
  },
  DS2_UP1: {
    label: "Plano X · 7 dias",
    trialEuro: 2.99,
    monthlyEuro: 12.99,
    description: "Plano estruturado de 7 dias + 1 ebook.",
  },
  DS3_UP1: {
    label: "Plano X · Rotina noturna",
    trialEuro: 1.99,
    monthlyEuro: 9.99,
    description: "Rotina noturna + mini guia.",
  },
  UPSELL_2: {
    label: "Plano X Pro",
    trialEuro: 7.99,
    monthlyEuro: 19.99,
    description: "Tudo do nível anterior + alimentação, receitas, treino e prioridade na Jéssica.",
  },
  DS1_UP2: {
    label: "Plano X Pro · Alimentação",
    trialEuro: 4.99,
    monthlyEuro: 12.99,
    description: "Alimentação simples, rotina e cursos (sem treino).",
  },
  DS2_UP2: {
    label: "Plano X Pro · Mentalidade",
    trialEuro: 2.99,
    monthlyEuro: 9.99,
    description: "Cursos de mentalidade e controlo da fome.",
  },
  DS3_UP2: {
    label: "Plano X Pro · Biblioteca",
    trialEuro: 1.99,
    monthlyEuro: 4.99,
    description: "Ebooks completos + plano simples.",
  },
};

const premiumSlugs = new Set(["kiwi", "banana", "combinacoes"]);

export function canAccessPremiumGelatina(plan: PlanId, slug: string): boolean {
  if (!premiumSlugs.has(slug)) return true;
  if (slug === "kiwi" && (plan === "DS1_UP1" || plan === "UPSELL_1" || plan === "UPSELL_2"))
    return true;
  if (
    (slug === "banana" || slug === "combinacoes") &&
    (plan === "UPSELL_1" || plan === "UPSELL_2")
  )
    return true;
  return false;
}

export function canAccessAdvancedProtocols(plan: PlanId): boolean {
  return (
    plan === "UPSELL_1" ||
    plan === "UPSELL_2" ||
    plan === "DS1_UP2" ||
    plan === "DS2_UP2"
  );
}

export function canAccessUsagePlans(plan: PlanId): boolean {
  return plan === "UPSELL_1" || plan === "UPSELL_2" || plan === "DS3_UP2";
}

export function courseAccessMode(
  plan: PlanId,
  courseSlug: string,
): "none" | "partial" | "full" {
  const fullPlans: PlanId[] = [
    "UPSELL_1",
    "UPSELL_2",
    "DS1_UP2",
    "DS2_UP2",
    "DS1_UP1",
  ];
  if (fullPlans.includes(plan)) return "full";

  if (plan === "DS2_UP2") {
    return courseSlug === "mentalidade" || courseSlug === "fome" ? "full" : "none";
  }

  if (plan === "FRONT") {
    return courseSlug === "mentalidade" ? "partial" : "none";
  }

  if (plan === "DS2_UP1") {
    return courseSlug === "inchaco" ? "full" : "none";
  }

  if (plan === "DS3_UP1") {
    return "none";
  }

  if (plan === "DS3_UP2") {
    return "none";
  }

  return "none";
}

export type EbookAccess = "locked" | "preview" | "full";

export function ebookAccess(plan: PlanId, slug: string): EbookAccess {
  if (plan === "UPSELL_1" || plan === "UPSELL_2" || plan === "DS3_UP2") {
    return "full";
  }
  if (plan === "FRONT") {
    if (slug === "receitas") return "full";
    return "preview";
  }
  if (plan === "DS2_UP1") {
    if (slug === "plano-7") return "full";
    return "preview";
  }
  return "preview";
}

export function jessicaConfig(plan: PlanId): {
  tier: JessicaTier;
  dailyCap: number;
} {
  switch (plan) {
    case "UPSELL_2":
      return { tier: "priority", dailyCap: Number.POSITIVE_INFINITY };
    case "UPSELL_1":
      return { tier: "unlimited", dailyCap: Number.POSITIVE_INFINITY };
    case "DS1_UP1":
    case "DS1_UP2":
      return { tier: "medium", dailyCap: 40 };
    case "DS2_UP1":
    case "DS3_UP1":
      return { tier: "limited", dailyCap: 18 };
    case "DS2_UP2":
      return { tier: "limited", dailyCap: 22 };
    case "DS3_UP2":
      return { tier: "limited", dailyCap: 16 };
    default:
      return { tier: "limited", dailyCap: 8 };
  }
}

export function canAccessNutritionRecipes(plan: PlanId): boolean {
  return (
    plan === "UPSELL_2" ||
    plan === "DS1_UP2" ||
    plan === "DS3_UP2"
  );
}

export function canAccessTraining(plan: PlanId): boolean {
  return plan === "UPSELL_2";
}

export function canAccessNightRoutinePack(plan: PlanId): boolean {
  return plan === "UPSELL_2" || plan === "DS3_UP1" || plan === "DS1_UP2";
}

export function canAccessDebloatPack(plan: PlanId): boolean {
  return plan === "DS1_UP1" || plan === "UPSELL_1" || plan === "UPSELL_2";
}
