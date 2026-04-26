"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

type QuizQuestion = {
  id: string;
  title: string;
  options: { id: string; label: string; score: number; description?: string; icon?: string }[];
};

const QUESTIONS: QuizQuestion[] = [
  {
    id: "goal",
    title: "Qual é o objetivo com seu corpo?",
    options: [
      { id: "perder-peso", label: "Perder peso", score: 3 },
      { id: "figado", label: "Queimar gordura no figado", score: 3 },
      { id: "retencao", label: "Eliminar a retencao de liquidos", score: 3 },
      { id: "metabolismo", label: "Acelerar o metabolismo", score: 2 },
      { id: "expectativa", label: "Aumento na expectativa de vida", score: 1 },
      { id: "menopausa", label: "Emagrecer na menopausa", score: 2 },
      { id: "desejo", label: "Acabar com desejo de comer besteira", score: 2 },
      { id: "colesterol", label: "Reducao nos niveis de colesterol", score: 1 },
    ],
  },
  {
    id: "kilos",
    title: "Quantos quilos voce\ndeseja perder?",
    options: [
      { id: "ate5", label: "Ate 5kg", score: 1 },
      { id: "6a10", label: "De 6 a 10 kg", score: 2 },
      { id: "11a15", label: "De 11 a 15 kg", score: 3 },
      { id: "16a20", label: "De 16 a 20 kg", score: 3 },
      { id: "mais20", label: "Mais de 20 kg", score: 3 },
    ],
  },
  {
    id: "sexo",
    title: "Qual seu Sexo?",
    options: [
      { id: "mulher", label: "MULHER", score: 2 },
      { id: "homem", label: "HOMEM", score: 2 },
    ],
  },
  {
    id: "area-gordura",
    title: "Em qual área do seu corpo você gostaria de reduzir mais gordura?",
    options: [
      { id: "culotes", label: "Região dos Culotes", score: 2 },
      { id: "coxas", label: "Região das Coxas", score: 2 },
      { id: "abdomen", label: "Região do Abdômen (barriga)", score: 3 },
      { id: "gluteos", label: "Região dos Glúteos", score: 2 },
      { id: "bracos", label: "Região dos Braços", score: 2 },
    ],
  },
  {
    id: "idade",
    title: "Vamos criar um Plano Personalizado de Emagrecimento com a Receita da Gelatina Emagrecedora, focado nas suas necessidades.",
    options: [
      { id: "18-26", label: "18 a 26", score: 1 },
      { id: "27-38", label: "27 a 38", score: 2 },
      { id: "39-50", label: "39 a 50", score: 3 },
      { id: "46+", label: "46+", score: 3 },
    ],
  },
  {
    id: "meta-quilos",
    title: "Quantos quilos deseja perder?",
    options: [
      { id: "5a10", label: "5KG A 10KG", score: 2 },
      { id: "15a20", label: "15KG A 20KG", score: 3 },
      { id: "mais20faixa", label: "MAIS DE 20KG", score: 3 },
      { id: "sem-meta", label: "Não tenho uma meta exata", score: 1 },
    ],
  },
  {
    id: "prova-mariana",
    title: "Veja o Resultado da Gelatina Emagrecedora na Vida da Mariana",
    options: [],
  },
  {
    id: "nome",
    title: "Vamos lá! Como posso te chamar?",
    options: [],
  },
  {
    id: "tipo-corpo",
    title: "Qual é o seu tipo de corpo atual?",
    options: [
      { id: "regular", label: "Regular", score: 1 },
      { id: "flacido", label: "Flácido", score: 2 },
      { id: "sobrepeso", label: "Sobrepeso", score: 3 },
    ],
  },
  {
    id: "impacto-vida",
    title: "tete com o o seu peso afeta sua vida?",
    options: [
      { id: "vergonha-fotos", label: "Tenho vergonha de tirar fotos", score: 3 },
      { id: "parceiro-saude", label: "Meu parceiro está preocupado com minha saúde", score: 3 },
      { id: "julgado", label: "Sinto-me julgado por amigos e colegas", score: 3 },
      { id: "romanticos", label: "Evito encontros românticos por não me sentir atraente", score: 3 },
      { id: "nenhuma", label: "Nenhuma das opções", score: 1 },
    ],
  },
  {
    id: "aparencia-fisica",
    title: "Você se sente satisfeita com a sua aparência física atual?",
    options: [
      { id: "nao-autoestima", label: "Não, porque me sinto acima do peso e isso afeta minha autoestima", score: 3 },
      { id: "sim-saude", label: "Sim, mas sei que posso melhorar minha saúde", score: 1 },
      { id: "nao-bemestar", label: "Não, gostaria de perder peso para melhorar meu bem-estar", score: 3 },
      {
        id: "nao-objetivos",
        label: "Não, minha aparência física não corresponde aos meus objetivos de saúde",
        score: 3,
      },
    ],
  },
  {
    id: "dificuldade-peso",
    title: "Você enfrenta alguma dificuldade no dia a dia devido ao peso?",
    options: [
      { id: "escadas", label: "Subir as escadas", score: 3 },
      { id: "sentar", label: "Se sentar", score: 2 },
      { id: "agachar", label: "Agachar", score: 3 },
      { id: "deitar", label: "Deitar na cama", score: 2 },
      { id: "outros", label: "Outros", score: 1 },
      { id: "nenhuma", label: "Não tenho dificuldades", score: 0 },
    ],
  },
  {
    id: "impede-emagrecer",
    title: "O que te impede de emagrecer?",
    options: [
      { id: "tempo", label: "Falta de tempo", description: "Rotina agitada.", icon: "⏰", score: 3 },
      {
        id: "autocontrole",
        label: "Autocontrole",
        description: "Dificuldade em resistir a tentações alimentares.",
        icon: "😬",
        score: 3,
      },
      {
        id: "financeiro",
        label: "Financeiro",
        description: "Achar opções saudáveis mais caras do que alimentos processados.",
        icon: "💸",
        score: 2,
      },
    ],
  },
  {
    id: "explicacao-gelatina",
    title: "Te entendemos!",
    options: [],
  },
  {
    id: "beneficios",
    title: "tete quais desses benefícios gostaria de ter?",
    options: [
      { id: "sono", label: "Sono mais profundo", score: 2 },
      { id: "dores", label: "Menos dores e inflamações", score: 2 },
      { id: "energia", label: "Mais energia e disposição ao longo do dia", score: 2 },
      { id: "estresse", label: "Redução do estresse e ansiedade", score: 2 },
      { id: "autoestima", label: "Aumento da autoestima e confiança", score: 2 },
      { id: "metabolicas", label: "Proteção contra doenças metabólicas", score: 2 },
      { id: "emagrecer", label: "Emagrecer sem esforço e sem efeito sanfona", score: 3 },
    ],
  },
  {
    id: "depoimento-claudia",
    title: "🔥 Histórias Reais de Transformação!",
    options: [],
  },
  {
    id: "peso-atual",
    title: "Qual é o seu peso atual?",
    options: [],
  },
  {
    id: "altura",
    title: "Qual é sua altura?",
    options: [],
  },
  {
    id: "peso-desejado",
    title: "Qual é o seu peso desejado?",
    options: [],
  },
  {
    id: "tempo",
    title: "Como é sua rotina diária?",
    options: [
      { id: "trabalho-fora", label: "Trabalho fora e tenho uma rotina agitada", icon: "🤯", score: 3 },
      { id: "home-office", label: "Trabalho em casa e tenho uma rotina flexível", icon: "🤭", score: 2 },
      { id: "familia", label: "Em casa cuidando da família", icon: "👥", score: 2 },
      { id: "outro", label: "Outro", icon: "😶", score: 1 },
    ],
  },
  {
    id: "sono-horas",
    title: "Quantas horas de sono você costuma ter por noite?",
    options: [
      { id: "menos5", label: "Menos de 5 horas", icon: "⏰", score: 3 },
      { id: "5a7", label: "Entre 5 e 7 horas", icon: "⏰", score: 2 },
      { id: "7a9", label: "Entre 7 e 9 horas", icon: "⏰", score: 1 },
      { id: "mais9", label: "Mais de 9 horas", icon: "⏰", score: 2 },
    ],
  },
  {
    id: "hidratacao",
    title: "Quantos copos de água você bebe por dia?",
    options: [
      { id: "cha-cafe", label: "Apenas chá ou café", icon: "☕", score: 3 },
      { id: "1a2", label: "1-2 copos por dia", icon: "💧", score: 2 },
      { id: "2a6", label: "2-6 copos por dia", icon: "💧", score: 1 },
      { id: "mais6", label: "Mais de 6 copos", icon: "💧", score: 1 },
    ],
  },
  {
    id: "fruta-preferida",
    title: "Qual dessas frutas você costuma preferir mais no seu dia a dia?",
    options: [
      { id: "limao", label: "Limão", icon: "🍋", score: 2 },
      { id: "laranja", label: "Laranja", icon: "🍊", score: 2 },
      { id: "banana", label: "Banana", icon: "🍌", score: 1 },
      { id: "maca", label: "Maçã", icon: "🍎", score: 1 },
      { id: "morango", label: "Morango", icon: "🍓", score: 3 },
      { id: "abacaxi", label: "Abacaxi", icon: "🍍", score: 2 },
    ],
  },
  {
    id: "corpo-sonhos",
    title: "Qual o corpo dos seus sonhos?",
    options: [
      { id: "natural", label: "Natural", score: 2 },
      { id: "em-forma", label: "Em forma", score: 3 },
    ],
  },
  {
    id: "mensagem-receitinha",
    title: "Fique tranquila! Assim que você finalizar sua avaliação, você vai receber a sua receitinha no seu E-mail e no seu Whatsapp",
    options: [],
  },
  {
    id: "apoio",
    title: "O que te faria manter o plano ativo?",
    options: [
      { id: "passo", label: "Ter o próximo passo claro", score: 3 },
      { id: "lembretes", label: "Lembretes e notificações", score: 2 },
      { id: "comunidade", label: "Sentir acompanhamento diário", score: 1 },
    ],
  },
];

function getResultMessage(score: number) {
  if (score >= 12) {
    return {
      level: "Perfil ideal para aceleração",
      text: "Tens tudo para ter uma transformação rápida com uma rotina simples e guiada.",
    };
  }
  if (score >= 8) {
    return {
      level: "Perfil com alto potencial",
      text: "Com estrutura diária e lembretes certos, tens alta probabilidade de manter consistência.",
    };
  }
  return {
    level: "Perfil em construção",
    text: "Um plano curto e objetivo vai ajudar a criar ritmo sem pressão.",
  };
}

export default function QuizOfferView() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId: string; score: number }>>({});
  const [leadName, setLeadName] = useState("");
  const [leadWeight, setLeadWeight] = useState("");
  const [leadHeight, setLeadHeight] = useState("");
  const [leadDesiredWeight, setLeadDesiredWeight] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showFinalSalesStep, setShowFinalSalesStep] = useState(false);

  const currentQuestionIndex = step - 1;
  const current = currentQuestionIndex >= 0 ? QUESTIONS[currentQuestionIndex] : undefined;
  const isIntro = step === 0;
  const isQuestionStep = step > 0 && step <= QUESTIONS.length;
  const isLastQuestion = step === QUESTIONS.length;
  const isAnalyzing = step === QUESTIONS.length + 1;
  const isDone = step > QUESTIONS.length + 1;
  const progress = Math.round((Math.max(step, 1) / (QUESTIONS.length + 1)) * 100);

  const totalScore = useMemo(
    () => Object.values(answers).reduce((acc, row) => acc + row.score, 0),
    [answers],
  );
  const result = getResultMessage(totalScore);
  const adherenceScore = Math.max(72, Math.min(97, 80 + Math.round((totalScore / Math.max(QUESTIONS.length, 1)) * 4)));

  useEffect(() => {
    if (!isAnalyzing) return;
    const timeout = window.setTimeout(() => {
      setStep(QUESTIONS.length + 2);
    }, 2800);
    return () => window.clearTimeout(timeout);
  }, [isAnalyzing]);

  function selectOption(questionId: string, optionId: string, score: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { optionId, score } }));
  }

  function next() {
    if (isIntro) {
      setStep(1);
      return;
    }
    if (!current) return;
    if (current.id === "prova-mariana") {
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "explicacao-gelatina") {
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "depoimento-claudia") {
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "mensagem-receitinha") {
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "peso-atual") {
      if (!leadWeight.trim()) return;
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "altura") {
      if (!leadHeight.trim()) return;
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "peso-desejado") {
      if (!leadDesiredWeight.trim()) return;
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "nome") {
      if (!leadName.trim()) return;
      if (isLastQuestion) {
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (!answers[current.id]) return;
    if (isLastQuestion) {
      setStep(QUESTIONS.length + 1);
      return;
    }
    setStep((s) => s + 1);
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setCheckoutError(null);
    setShowFinalSalesStep(false);
  }

  function goToFinalSalesStep() {
    setCheckoutError(null);
    setShowFinalSalesStep(true);
  }

  async function startCheckout() {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "FRONT" }),
      });

      if (response.status === 401) {
        const guestResponse = await fetch("/api/stripe/checkout-guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "FRONT" }),
        });
        if (!guestResponse.ok) {
          const guestData = (await guestResponse.json().catch(() => ({}))) as { error?: string };
          setCheckoutError(guestData.error ?? "Nao foi possivel abrir o checkout.");
          return;
        }
        const guestData = (await guestResponse.json()) as { url?: string };
        if (!guestData.url) {
          setCheckoutError("Sessao de checkout invalida.");
          return;
        }
        window.location.assign(guestData.url);
        return;
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setCheckoutError(data.error ?? "Nao foi possivel abrir o checkout.");
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        setCheckoutError("Sessao de checkout invalida.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setCheckoutError("Falha ao iniciar checkout. Tenta novamente.");
    } finally {
      setIsStartingCheckout(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white px-4 pb-14 pt-7 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto mb-8 w-fit">
          <BrandLogo variant="auth" className="w-24 sm:w-28" />
        </div>

        {isIntro ? (
          <section className="mx-auto max-w-[860px]">
            <div className="rounded-3xl border border-pg-forest/10 bg-white p-6 sm:p-8">
              <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-pg-forest/10 bg-gradient-to-b from-rose-50 via-white to-emerald-50 px-6 py-10">
                <BrandLogo variant="hero" className="mx-auto w-full max-w-[420px]" priority />
              </div>
            </div>

            <p className="mt-8 text-[35px] leading-relaxed text-pg-ink">
              <span className="font-extrabold text-red-600">Atencao:</span> oferecemos apenas{" "}
              <span className="font-extrabold">uma consulta por pessoa.</span> Se voce sair, perdera a sua vez.
              Aproveite essa oportunidade exclusiva!
            </p>

            <button
              type="button"
              onClick={next}
              className="mt-9 flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-xl font-semibold text-white"
            >
              FAZER TESTE GRATIS
            </button>
          </section>
        ) : !isDone && isQuestionStep && current ? (
          <section className="mx-auto max-w-[820px]">
            <div className="mx-auto mb-10 max-w-[640px]">
              <div className="h-3 rounded-full bg-neutral-100">
                <div
                  className="h-3 rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.max(progress, 8)}%` }}
                />
              </div>
            </div>

            <div className="mb-8 text-center">
              {current.id === "kilos" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Quantos quilos voce
                  <br />
                  <span className="text-emerald-600">deseja perder?</span>
                </h1>
              ) : current.id === "idade" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Vamos criar um Plano Personalizado de Emagrecimento com a Receita da Gelatina Emagrecedora,
                  focado nas suas necessidades.
                </h1>
              ) : current.id === "area-gordura" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Em qual área do seu corpo
                  <br />
                  você gostaria de <span className="text-emerald-600">reduzir</span>
                  <br />
                  <span className="text-emerald-600">mais gordura?</span>
                </h1>
              ) : current.id === "meta-quilos" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Quantos quilos deseja perder?
                </h1>
              ) : current.id === "prova-mariana" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Veja o Resultado da Gelatina Emagrecedora na Vida da Mariana
                </h1>
              ) : current.id === "nome" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Vamos lá! Como posso te chamar?
                </h1>
              ) : current.id === "tipo-corpo" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Qual é o seu tipo de corpo atual?
                </h1>
              ) : current.id === "impacto-vida" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  tete com o o seu peso afeta sua vida?
                </h1>
              ) : current.id === "aparencia-fisica" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Você se sente satisfeita com a sua aparência física atual?
                </h1>
              ) : current.id === "dificuldade-peso" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Você enfrenta alguma dificuldade no dia a dia devido ao peso?
                </h1>
              ) : current.id === "impede-emagrecer" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  O que te impede de emagrecer?
                </h1>
              ) : current.id === "explicacao-gelatina" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Te entendemos!
                </h1>
              ) : current.id === "beneficios" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  tete quais desses benefícios gostaria de ter?
                </h1>
              ) : current.id === "depoimento-claudia" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  🔥 Histórias Reais de Transformação!
                </h1>
              ) : current.id === "peso-atual" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Qual é o seu peso atual?
                </h1>
              ) : current.id === "altura" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Qual é sua altura?
                </h1>
              ) : current.id === "peso-desejado" ? (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  Qual é o seu peso desejado?
                </h1>
              ) : current.id === "mensagem-receitinha" ? (
                <h1 className="mx-auto max-w-[760px] text-balance text-[52px] font-semibold leading-[1.25] text-pg-ink sm:text-[56px]">
                  Fique tranquila! Assim que você finalizar sua avaliação, você vai receber a sua receitinha no seu
                  E-mail e no seu Whatsapp 💌
                </h1>
              ) : (
                <h1 className="text-balance text-[34px] font-semibold leading-tight text-pg-ink sm:text-[40px]">
                  {current.title}
                </h1>
              )}
              {current.id === "area-gordura" || current.id === "nome" || current.id === "mensagem-receitinha" ? null : (
                <p className="mt-2 text-[31px] underline underline-offset-2 text-pg-ink/85">
                  {current.id === "goal"
                    ? "Escolha seus maiores interesses abaixo:"
                    : current.id === "kilos"
                      ? "O protocolo Gelatina Emagrecedora ajuda a eliminar gordura de forma acelerada."
                      : current.id === "idade"
                        ? "Selecione sua idade abaixo:"
                      : current.id === "meta-quilos"
                        ? "A Gelatina Emagrecedora pode eliminar gordura de forma acelerada."
                        : current.id === "tipo-corpo"
                          ? "Vamos personalizar as Gelatinas que funcionem para seu tipo de corpo."
                        : current.id === "impacto-vida"
                          ? ""
                          : current.id === "aparencia-fisica"
                            ? ""
                            : current.id === "dificuldade-peso"
                              ? "Selecione abaixo"
                            : current.id === "impede-emagrecer"
                              ? ""
                              : current.id === "explicacao-gelatina"
                                ? "Os Chás Bariátricos age enquanto você dorme, queimando gordura de forma acelerada!"
                              : current.id === "beneficios"
                                ? "Vamos personalizar a sua fórmula para maximizar seus resultados."
                              : current.id === "depoimento-claudia"
                                ? "🔥  📍 Depoimento: Claudia - Porto Alegre, RS"
                                : current.id === "peso-atual"
                                  ? "Estamos quase lá! Vamos ajustar seu plano de acordo com seu corpo."
                                  : current.id === "altura"
                                    ? "Sua altura também influencia no metabolismo!"
                                    : current.id === "peso-desejado"
                                      ? "Estamos quase lá! Vamos ajustar seu plano de acordo com seu corpo."
                                      : current.id === "tempo"
                                        ? "Vamos personalizar seu plano conforme sua Rotina diária"
                                        : current.id === "sono-horas"
                                          ? "A qualidade do seu sono impacta diretamente no seu emagrecimento!"
                                          : current.id === "hidratacao"
                                            ? "Seu nível de hidratação também influencia na sua perda de peso."
                                            : current.id === "fruta-preferida"
                                              ? "Suas preferências alimentares também ajudam no processo!"
                                              : current.id === "corpo-sonhos"
                                                ? "Escolha a opção abaixo:"
                        : current.id === "prova-mariana"
                          ? "Com dificuldades para emagrecer e muita ansiedade, Mariana incluiu a Gelatina Emagrecedora em sua rotina noturna. Em apenas três semanas, perdeu 9 kg, melhorando sua autoestima e vida."
                      : "Escolhe a opção que mais combina contigo."}
                </p>
              )}
            </div>

            {current.id === "prova-mariana" ? (
              <div className="mx-auto max-w-[720px]">
                <div className="grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-emerald-600/80">
                  <div className="relative h-[360px] bg-gradient-to-b from-amber-100 to-rose-100">
                    <div className="absolute inset-x-0 bottom-0 h-44 bg-neutral-300/60" />
                  </div>
                  <div className="relative h-[360px] bg-gradient-to-b from-neutral-200 to-fuchsia-100">
                    <div className="absolute inset-x-0 bottom-0 h-44 bg-neutral-300/60" />
                  </div>
                </div>
              </div>
            ) : current.id === "explicacao-gelatina" ? (
              <div className="mx-auto max-w-[720px]">
                <div className="rounded-2xl border border-emerald-600/30 bg-white p-5 text-center">
                  <p className="text-[44px] font-black leading-tight text-red-500">VEJA COMO FUNCIONA A</p>
                  <p className="text-[44px] font-black leading-tight text-red-500">GELATINA BARIÁTRICA</p>
                  <div className="mx-auto mt-5 h-[340px] w-full max-w-[520px] rounded-2xl bg-gradient-to-b from-rose-50 via-white to-emerald-50" />
                </div>
              </div>
            ) : current.id === "depoimento-claudia" ? (
              <div className="mx-auto max-w-[760px] space-y-5">
                <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-emerald-600/20">
                  <div className="h-[260px] bg-gradient-to-b from-rose-200 to-rose-100" />
                  <div className="h-[260px] bg-gradient-to-b from-emerald-200 to-emerald-100" />
                  <div className="h-[260px] bg-gradient-to-b from-blue-200 to-blue-100" />
                </div>

                <div className="rounded-2xl border border-emerald-600/20 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-300 to-rose-200" />
                    <div>
                      <p className="text-[34px] font-semibold leading-tight text-pg-ink">Claudia</p>
                      <p className="text-[28px] text-pg-ink/70">Porto Alegre, RS</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[33px] leading-tight text-pg-ink/90">
                    Eu já tinha tentado de tudo para emagrecer, mas nada funcionava. Depois de incluir a Gelatina
                    Emagrecedora na minha rotina, perdi 12kg sem mudar nada na minha alimentação! O mais incrível é
                    que minha fome e ansiedade diminuíram naturalmente!
                  </p>
                  <p className="mt-3 text-[32px] text-yellow-500">★★★★★</p>
                </div>
              </div>
            ) : current.id === "peso-atual" ? (
              <div className="mx-auto max-w-[760px] space-y-5">
                <div className="flex h-[74px] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base text-white">
                    •
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={leadWeight}
                    onChange={(e) => setLeadWeight(e.target.value)}
                    placeholder="Digite o seu peso aqui"
                    className="w-full border-0 bg-transparent text-2xl text-pg-ink placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <p className="text-[35px] font-bold leading-tight text-pg-ink">
                    ✓ Baseado nisso, ajustaremos a dosagem ideal para os melhores resultados!
                  </p>
                </div>
              </div>
            ) : current.id === "altura" ? (
              <div className="mx-auto max-w-[760px] space-y-5">
                <div className="flex h-[74px] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base text-white">
                    •
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={leadHeight}
                    onChange={(e) => setLeadHeight(e.target.value)}
                    placeholder="Digite a sua altura aqui"
                    className="w-full border-0 bg-transparent text-2xl text-pg-ink placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <p className="text-[35px] font-bold leading-tight text-pg-ink">
                    ✓ Isso nos ajudará a calcular a quantidade exata dos ingredientes para seu corpo.
                  </p>
                </div>
              </div>
            ) : current.id === "peso-desejado" ? (
              <div className="mx-auto max-w-[760px] space-y-5">
                <div className="flex h-[74px] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base text-white">
                    •
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={leadDesiredWeight}
                    onChange={(e) => setLeadDesiredWeight(e.target.value)}
                    placeholder="Digite o seu peso desejado"
                    className="w-full border-0 bg-transparent text-2xl text-pg-ink placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <p className="text-[35px] font-bold leading-tight text-pg-ink">
                    ✓ Baseado nisso, ajustaremos a dosagem ideal para os melhores resultados!
                  </p>
                </div>
              </div>
            ) : current.id === "nome" ? (
              <div className="mx-auto max-w-[720px] space-y-5">
                <div className="flex h-[74px] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-base text-white">
                    •
                  </span>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Digite o seu nome aqui"
                    className="w-full border-0 bg-transparent text-2xl text-pg-ink placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : current.id === "mensagem-receitinha" ? null : (
              <div
                className={
                  current.id === "kilos"
                    ? "grid grid-cols-1 gap-3"
                    : current.id === "area-gordura"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "idade"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "tempo"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "sono-horas"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "hidratacao"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "fruta-preferida"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "corpo-sonhos"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "tipo-corpo"
                    ? "grid grid-cols-1 gap-3"
                    : current.id === "impacto-vida"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "aparencia-fisica"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "dificuldade-peso"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "impede-emagrecer"
                      ? "grid grid-cols-1 gap-3"
                    : current.id === "beneficios"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "meta-quilos"
                      ? "grid grid-cols-2 gap-3"
                    : current.id === "sexo"
                      ? "grid grid-cols-2 gap-3"
                      : "grid grid-cols-2 gap-3"
                }
              >
                {current.options.map((option) => {
                  const selected = answers[current.id]?.optionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(current.id, option.id, option.score)}
                      className={[
                        current.id === "idade"
                          ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                          : current.id === "tipo-corpo"
                            ? "relative min-h-[108px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "impacto-vida"
                              ? "relative min-h-[108px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "aparencia-fisica"
                              ? "relative min-h-[108px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "tempo"
                              ? "relative min-h-[124px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "sono-horas"
                              ? "relative min-h-[124px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "hidratacao"
                              ? "relative min-h-[124px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "fruta-preferida"
                              ? "relative min-h-[210px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "corpo-sonhos"
                              ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "dificuldade-peso"
                              ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "impede-emagrecer"
                              ? "relative min-h-[120px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "beneficios"
                              ? "relative min-h-[170px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "meta-quilos"
                            ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "sexo"
                            ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : "flex min-h-[108px] items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition",
                        selected
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-emerald-600/90 bg-white hover:bg-emerald-50/50",
                      ].join(" ")}
                    >
                      {current.id === "idade" ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
                          <div
                            className={[
                              "absolute left-1/2 top-6 h-36 w-[72%] -translate-x-1/2 rounded-xl",
                              option.id === "18-26"
                                ? "bg-gradient-to-r from-emerald-200 to-sky-200"
                                : option.id === "27-38"
                                  ? "bg-gradient-to-r from-orange-200 to-cyan-200"
                                  : option.id === "39-50"
                                    ? "bg-gradient-to-r from-pink-200 to-emerald-200"
                                    : "bg-gradient-to-r from-blue-200 to-violet-200",
                            ].join(" ")}
                          />
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[34px] font-medium text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "tipo-corpo" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <div
                            className={[
                              "absolute left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-md",
                              option.id === "regular"
                                ? "bg-gradient-to-b from-rose-200 to-red-300"
                                : option.id === "flacido"
                                  ? "bg-gradient-to-b from-red-200 to-red-300"
                                  : "bg-gradient-to-b from-red-300 to-red-400",
                            ].join(" ")}
                          />
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[38px] font-medium text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "impacto-vida" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl">
                            {option.id === "vergonha-fotos"
                              ? "🤦"
                              : option.id === "parceiro-saude"
                                ? "😞"
                                : option.id === "julgado"
                                  ? "😢"
                                  : option.id === "romanticos"
                                    ? "💔"
                                    : "👋"}
                          </span>
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-[34px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "aparencia-fisica" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl">
                            {option.id === "nao-autoestima"
                              ? "😢"
                              : option.id === "sim-saude"
                                ? "😞"
                                : option.id === "nao-bemestar"
                                  ? "😪"
                                  : "🤦"}
                          </span>
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-[34px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "dificuldade-peso" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-8 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-emerald-600" />
                          <span className="absolute left-1/2 top-10 -translate-x-1/2 text-6xl">
                            {option.id === "escadas"
                              ? "🤦"
                              : option.id === "sentar"
                                ? "🪑"
                                : option.id === "agachar"
                                  ? "🦵"
                                  : option.id === "deitar"
                                    ? "🛏️"
                                    : option.id === "outros"
                                      ? "😶"
                                      : "✅"}
                          </span>
                          <span className="absolute bottom-5 left-1/2 w-[80%] -translate-x-1/2 text-center text-[31px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "impede-emagrecer" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl">{option.icon ?? "•"}</span>
                          <div className="absolute left-24 right-4 top-1/2 -translate-y-1/2 text-left">
                            <p className="text-[35px] font-semibold leading-tight text-pg-ink">{option.label}</p>
                            <p className="mt-1 text-[29px] leading-tight text-pg-ink/70">{option.description}</p>
                          </div>
                        </>
                      ) : current.id === "beneficios" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-8 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-emerald-600" />
                          <span className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 text-center text-[34px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "meta-quilos" ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
                          <div
                            className={[
                              "absolute left-1/2 top-6 h-32 w-[72%] -translate-x-1/2 rounded-xl",
                              option.id === "sem-meta"
                                ? "bg-gradient-to-r from-neutral-200 to-neutral-300"
                                : "bg-gradient-to-r from-yellow-100 to-neutral-200",
                            ].join(" ")}
                          />
                          <span className="absolute bottom-5 left-1/2 w-[88%] -translate-x-1/2 text-center text-[31px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "sexo" ? (
                        <>
                          <div
                            className={[
                              "absolute inset-0",
                              option.id === "mulher"
                                ? "bg-gradient-to-b from-rose-100 via-rose-50 to-white"
                                : "bg-gradient-to-b from-sky-100 via-sky-50 to-white",
                            ].join(" ")}
                          />
                          <div className="absolute left-1/2 top-6 h-36 w-24 -translate-x-1/2 rounded-2xl bg-neutral-300/70" />
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-emerald-500 px-4 py-1 text-xl font-bold text-white">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "tempo" || current.id === "sono-horas" || current.id === "hidratacao" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl">{option.icon ?? "•"}</span>
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-[32px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "fruta-preferida" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-4 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-emerald-600" />
                          <span className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 text-6xl">
                            {option.icon ?? "•"}
                          </span>
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[30px] font-medium leading-tight text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "corpo-sonhos" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <div className="absolute left-1/2 top-5 h-36 w-24 -translate-x-1/2 rounded-2xl bg-gradient-to-b from-amber-100 via-rose-100 to-red-200" />
                          <div className="absolute left-1/2 top-[112px] h-16 w-24 -translate-x-1/2 rounded-b-2xl bg-gradient-to-b from-red-300 to-red-400" />
                          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[35px] font-medium text-pg-ink">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "kilos" || current.id === "area-gordura" ? null : (
                        <span
                          className={[
                            "h-7 w-7 rounded-full border-2 transition",
                            selected ? "border-emerald-600 bg-emerald-600/10" : "border-emerald-600 bg-white",
                          ].join(" ")}
                        />
                      )}
                      {current.id === "sexo" ||
                      current.id === "idade" ||
                      current.id === "meta-quilos" ||
                      current.id === "tipo-corpo" ||
                      current.id === "tempo" ||
                      current.id === "sono-horas" ||
                      current.id === "hidratacao" ||
                      current.id === "fruta-preferida" ||
                      current.id === "corpo-sonhos" ||
                      current.id === "impacto-vida" ||
                      current.id === "aparencia-fisica" ||
                      current.id === "dificuldade-peso" ||
                      current.id === "impede-emagrecer" ||
                      current.id === "beneficios" ? null : (
                        <span className="text-[30px] font-medium leading-snug text-pg-ink">{option.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {current.id === "sexo" ? (
              <div className="mt-8 rounded-2xl border-2 border-emerald-600/60 bg-emerald-50/35 p-5">
                <p className="text-[30px] font-bold leading-tight text-pg-ink">
                  As informacoes sao para fazer ajustes em seu plano exclusivo e personalizado.
                </p>
                <p className="mt-3 text-[30px] leading-relaxed text-pg-ink/90">
                  O sexo biologico e um fator que afeta a sua TMB (taxa metabolica), que determina quantas calorias
                  voce queima por dia.
                </p>
              </div>
            ) : null}

            <div className="mt-10">
              <button
                type="button"
                onClick={next}
                disabled={
                  (current.id !== "prova-mariana" &&
                    current.id !== "explicacao-gelatina" &&
                    current.id !== "depoimento-claudia" &&
                    current.id !== "mensagem-receitinha" &&
                    current.id !== "peso-atual" &&
                    current.id !== "altura" &&
                    current.id !== "peso-desejado" &&
                    current.id !== "nome" &&
                    !answers[current.id]) ||
                  (current.id === "nome" && !leadName.trim()) ||
                  (current.id === "peso-atual" && !leadWeight.trim()) ||
                  (current.id === "altura" && !leadHeight.trim()) ||
                  (current.id === "peso-desejado" && !leadDesiredWeight.trim())
                }
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-[35px] font-semibold text-white disabled:opacity-50"
              >
                {current.id === "nome" ? "Enviar" : isLastQuestion ? "Ver resultado" : "Continuar"}
              </button>
            </div>
          </section>
        ) : isAnalyzing ? (
          <section className="mx-auto max-w-[820px]">
            <div className="rounded-[28px] border-2 border-dashed border-pink-300 bg-white px-5 py-8 text-center">
              <div className="mx-auto mb-2 h-24 w-24 rounded-full bg-gradient-to-b from-pink-200 via-pink-100 to-white p-2 shadow-sm">
                <BrandLogo variant="auth" className="h-full w-full object-contain" />
              </div>
              <p className="text-[48px] font-black leading-tight text-pink-600">Gelatina Bariátrica</p>
              <p className="mt-2 text-[44px] font-black leading-tight text-pink-600">Estamos analisando suas respostas...</p>
            </div>

            <div className="mx-auto mt-14 max-w-[640px]">
              <div className="h-8 rounded-full bg-neutral-100 p-1 shadow-inner">
                <div className="flex h-full w-[99%] items-center justify-center rounded-full bg-emerald-600 text-[24px] font-black text-white">
                  99%
                </div>
              </div>
            </div>
          </section>
        ) : !showFinalSalesStep ? (
          <section className="mx-auto max-w-[430px] space-y-3">
            <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-4 text-center">
              <p className="text-[22px] font-black leading-tight text-pg-ink">ro, ouçe meu audio urgente !</p>
              <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
                <audio controls preload="none" className="w-full">
                  <source src="/audio/quiz-urgente.mp3" type="audio/mpeg" />
                  O seu navegador não suporta áudio.
                </audio>
              </div>
            </div>

            <div className="rounded-2xl bg-[#f5ffef] px-3 py-4 text-center">
              <p className="text-[22px] font-black leading-tight text-pg-ink">
                Você pode perder <span className="text-red-600">9KG a 15KG</span> em apenas <span className="text-emerald-600">3 semanas</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-neutral-200 bg-white p-2">
                  <p className="text-xs font-semibold">1 Semana</p>
                  <p className="mt-1 text-sm font-black text-emerald-600">-5 KG</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-2">
                  <p className="text-xs font-semibold">2 Semana</p>
                  <p className="mt-1 text-sm font-black text-emerald-600">-9 KG</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-2">
                  <p className="text-xs font-semibold">3 Semana</p>
                  <p className="mt-1 text-sm font-black text-emerald-600">-15 KG</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-lime-200 bg-[#f1ffd8] p-3">
              <p className="text-[18px] font-black leading-tight text-pg-ink">⚡ Seus hábitos estão a travar o seu emagrecimento.</p>
              <p className="mt-1 text-sm leading-snug text-pg-ink/80">
                Mudanças simples no protocolo certo podem acelerar muito os seus resultados.
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-[#ff5a5a] p-3 text-white">
              <p className="text-[18px] font-black leading-tight">🚫 Principais riscos do seu perfil hoje:</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Metabolismo lento</li>
                <li>• Acúmulo de gordura abdominal</li>
                <li>• Dificuldade para manter resultados</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-center text-lg font-black text-pg-ink">Resultado da Avaliação</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-2 text-center">
                  <p className="text-[11px] text-pg-ink/70">Índice corporal</p>
                  <p className="text-xl font-black text-pg-ink">{adherenceScore}%</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-center">
                  <p className="text-[11px] text-pg-ink/70">Risco atual</p>
                  <p className="text-xl font-black text-pg-ink">ALTO</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-center text-base font-black text-pg-ink">Transformações reais</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="h-32 rounded-lg bg-neutral-200" />
                <div className="h-32 rounded-lg bg-neutral-300" />
                <div className="h-32 rounded-lg bg-neutral-300" />
                <div className="h-32 rounded-lg bg-neutral-200" />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-[#fff4dd] p-3 text-center">
              <p className="text-base font-black text-pg-ink">Garantia de 30 dias</p>
              <p className="mt-1 text-sm text-pg-ink/80">Se não notar resultados, devolvemos o valor.</p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={goToFinalSalesStep}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-base font-black text-white"
              >
                Quero Transformar Minha Vida Hoje!
              </button>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[430px] space-y-4">
            <div className="text-center">
              <p className="text-[36px] font-black leading-tight text-pg-ink">
                tete, você está pronta
                <br />
                para <span className="text-emerald-500">transformar</span> seu <span className="text-emerald-500">corpo</span> e
                sua <span className="text-emerald-500">saúde</span>?
              </p>
              <p className="mt-2 text-[28px] text-pg-ink/85">Escolha a opção abaixo.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="grid grid-cols-2 divide-x divide-neutral-200">
                <div className="p-3 text-center">
                  <p className="text-[26px] font-black">ANTES</p>
                  <div className="mx-auto mt-2 h-48 w-36 rounded-xl bg-neutral-300" />
                  <p className="mt-2 text-[24px] font-black leading-tight text-red-500">
                    Esta é você com 143 kg, antes da Gelatina Emagrecedora
                  </p>
                  <div className="mt-3 h-3 rounded-full bg-red-400" />
                  <p className="mt-2 rounded-xl bg-red-500 px-2 py-2 text-[22px] font-black text-white">Riscos de doenças Alto</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-[26px] font-black">DEPOIS</p>
                  <div className="mx-auto mt-2 h-48 w-36 rounded-xl bg-neutral-200" />
                  <p className="mt-2 text-[24px] font-black leading-tight text-emerald-600">
                    E esta é você com 65 kg, depois de usar a gelatina ideal para o seu corpo
                  </p>
                  <div className="mt-3 h-3 rounded-full bg-emerald-500" />
                  <p className="mt-2 rounded-xl bg-emerald-500 px-2 py-2 text-[22px] font-black text-white">Riscos de doenças Baixo</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[42px] font-black text-pg-ink">Como funciona o Plano?</p>
              <p className="mt-2 text-[31px] leading-tight text-pg-ink">
                Com base nas suas informações pessoais e objetivos, criamos um plano 100% personalizado para você usar
                os ingredientes ideais para você. Nossa abordagem estratégica foi feita para que você consiga
                potencializar sua perda de peso em 4 semanas, respeitando seu estilo de vida, sua rotina e o que você
                gosta de comer.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-[#f2ffe9] p-4">
              <p className="text-center text-[38px] font-black text-pg-ink">SEU PLANO INCLUI</p>
              <div className="mt-3 space-y-3 text-[30px] leading-tight text-pg-ink">
                <p>✅ <span className="font-black">Quais os ingredientes ideais para o seu corpo:</span> Baseado nas pesquisas mais recentes de universidades famosas como Havard, desenvolvemos o Protocolo Rotina da Gelatina Bariátrica, a forma mais eficaz de usar os melhores chás para perder peso de acordo com o seu corpo sem que você perca músculos ou sinta muita fome.</p>
                <p>✅ <span className="font-black">Definição de metas diárias:</span> para você se manter no caminho certo</p>
                <p>✅ <span className="font-black">Planilha de acompanhamento:</span> Saiba exatamente quanto você está evoluindo.</p>
                <p>✅ <span className="font-black">+ 4 Bônus Exclusivos</span></p>
              </div>
            </div>

            <p className="text-center text-[40px] font-black leading-tight text-pg-ink">
              Ao Garantir Sua Rotina da Gelatina Bariátrica, <span className="text-emerald-500">Você Recebe Todos os Bônus de Presente!</span>
            </p>

            <div className="space-y-2">
              <div className="rounded-2xl bg-[#4caf50] p-3 text-[30px] font-black leading-tight text-white">Potencialize a Queima de Gordura</div>
              <div className="rounded-2xl bg-[#d97706] p-3 text-[30px] font-black leading-tight text-white">Desinchar em 7 Dias</div>
              <div className="rounded-2xl bg-[#a855f7] p-3 text-[30px] font-black leading-tight text-white">Anti-Efeito Sanfona</div>
              <div className="rounded-2xl bg-[#e11d48] p-3 text-[30px] font-black leading-tight text-white">Metabolismo PRO 5x</div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-600 bg-[#fffdf4] p-4 text-center">
              <p className="text-[44px] font-black text-emerald-700">GELATINA BARIÁTRICA</p>
              <p className="mt-2 text-[30px] font-black text-pg-ink">Preço atualizado no checkout</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-center text-sm text-pg-ink/75">
              Pagamento seguro no checkout oficial da Stripe.
            </div>

            <p className="text-center text-[42px] font-black leading-tight text-pg-ink">
              Quem Usa <span className="text-emerald-500">Tem Resultado</span> 😉👇
            </p>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="h-56 rounded-xl bg-neutral-200" />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-4 text-center">
              <p className="text-[40px] font-black text-pg-ink">GARANTIA 30 DIAS</p>
              <p className="mt-2 text-[31px] leading-tight text-pg-ink">
                A compra deste material é totalmente sem risco para você.
                <br />
                <br />
                Se ele não atender às suas expectativas nos primeiros 30 dias após a compra, nós reembolsaremos todo o
                valor que você pagou, sem fazer perguntas.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[32px] font-black text-pg-ink">Isabela Soares</p>
              <p className="text-[26px] text-pg-ink/70">São Paulo, SP</p>
              <p className="mt-2 text-[29px] leading-tight text-pg-ink">
                Eu literalmente estou sem palavras! Olha isso ai gente! Foram 2 meses e meio seguindo sem errar,
                gente é incrível isso, não esperava, tô passada real! 😱😅
              </p>
              <p className="mt-2 text-2xl text-yellow-400">★★★★★</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[32px] font-black text-pg-ink">Bruna Gonçalves</p>
              <p className="text-[26px] text-pg-ink/70">Itajaí, SC</p>
              <p className="mt-2 text-[29px] leading-tight text-pg-ink">
                Só eu sei o quanto eu sofri tentando emagrecer. Isso aqui foi único eu jurava que era balela, mas ta
                ai o resultado, certeza que logo as canetas caem o preço, ninguem vai querer ficar se furando, isso
                aqui é divino kkkk 🤯💃
              </p>
              <p className="mt-2 text-2xl text-yellow-400">★★★★★</p>
            </div>

            <div className="rounded-2xl border-2 border-emerald-500 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[28px] font-black leading-tight text-pg-ink">GELATINA BARIÁTRICA</p>
                <p className="rounded-xl bg-[#eef7f2] px-4 py-2 text-[44px] font-black text-pg-ink">R$37,90</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={isStartingCheckout}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-base font-black text-white disabled:opacity-60"
            >
              {isStartingCheckout ? "A abrir checkout..." : "Quero Começar Hoje! 😍"}
            </button>
            {checkoutError ? <p className="text-center text-sm text-red-600">{checkoutError}</p> : null}
          </section>
        )}
      </div>
    </main>
  );
}
