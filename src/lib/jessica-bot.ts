import type { PlanId } from "@prisma/client";
import { jessicaConfig } from "@/lib/plans";

const upgradeHint = (plan: PlanId) => {
  if (plan === "FRONT") {
    return "Queres respostas sem limite? O upgrade para o **Plano X** desbloqueia a Jéssica ilimitada e receitas premium.";
  }
  if (plan !== "UPSELL_2") {
    return "Para prioridade e plano alimentar completo, o nível **Plano X Pro** é o ideal.";
  }
  return "Estou aqui contigo — continua com o ritual diário da gelatina.";
};

export function jessicaReply(plan: PlanId, message: string) {
  const lower = message.toLowerCase();
  const cfg = jessicaConfig(plan);

  if (lower.includes("gelatina") && lower.includes("quando")) {
    return "O melhor horário é 20–30 minutos antes da refeição principal ou como lanche estruturado. Mantém a consistência todos os dias.";
  }
  if (lower.includes("limão") || lower.includes("limao")) {
    return "A gelatina de limão ajuda na sensação de leveza e no ritmo digestivo. Prepara com água morna para dissolver bem a gelatina sem açúcar.";
  }
  if (lower.includes("fome")) {
    return "Combina a gelatina com proteína magra na refeição seguinte e hidratação fracionada. Se quiseres um plano completo anti-fome, veja o curso **Controlo da fome**.";
  }
  if (lower.includes("inchaço") || lower.includes("inchaco")) {
    return "Prioriza a gelatina de **pepino** ou **gengibre** e reduz ultraprocessados ao jantar. O módulo desinchar no protocolo avançado acelera isto.";
  }
  if (lower.includes("preço") || lower.includes("plano") || lower.includes("upgrade")) {
    return upgradeHint(plan);
  }
  if (lower.includes("oi") || lower.includes("olá") || lower.includes("ola")) {
    return `Olá! Sou a Jéssica. ${cfg.tier === "priority" ? "Tens prioridade nas minhas respostas 💚" : "Vamos simplificar o teu dia com o protocolo certo."}`;
  }

  return `Percebo. ${upgradeHint(plan)}`;
}

export { upgradeHint };
