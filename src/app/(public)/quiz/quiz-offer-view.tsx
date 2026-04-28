"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getTrackingContext, initTrackingContext, track, trackWithBeacon } from "@/lib/tracking";

type QuizQuestion = {
  id: string;
  title: string;
  options: { id: string; label: string; score: number; description?: string; icon?: string }[];
};

const PRE_SALES_VIDEO_SRC = "/video/02.mp4";

function formatLeadKgDisplay(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const hasFraction = Math.abs(n - Math.round(n)) > 0.001;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: hasFraction ? 1 : 0 });
}

function PlanoIncluiCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M7.5 12.2 10.3 15 16.5 8.8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      { id: "ate5", label: "ATÉ 5 KG", score: 1 },
      { id: "5a10", label: "5 KG A 10 KG", score: 2 },
      { id: "15a20", label: "15 KG A 20 KG", score: 3 },
      { id: "mais20faixa", label: "MAIS DE 20 KG", score: 3 },
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
      { id: "escadas", label: "Subir as\nescadas", score: 3 },
      { id: "sentar", label: "Se sentar", score: 2 },
      { id: "agachar", label: "Agachar", score: 3 },
      { id: "deitar", label: "Deitar na\ncama", score: 2 },
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
];

function getStepId(params: {
  currentId?: string;
  isIntro: boolean;
  isAnalyzing: boolean;
  isDone: boolean;
  showFinalSalesStep: boolean;
  postPreSalesStep: number;
}) {
  if (params.isIntro) return "intro";
  if (params.currentId) return params.currentId;
  if (params.isAnalyzing) return "analyzing";
  if (!params.isDone) return "step-unknown";
  if (!params.showFinalSalesStep) {
    if (params.postPreSalesStep === 1) return "apoio";
    if (params.postPreSalesStep === 2) return "corpo-sonhos";
    if (params.postPreSalesStep === 3) return "mensagem-receitinha";
  }
  return params.showFinalSalesStep ? "final-sales" : "pre-sales";
}

const CONTINUE_BUTTON_CLASS =
  "quiz-cta-pulse relative flex items-center justify-center rounded-2xl bg-emerald-600 px-6 font-semibold text-white shadow-[0_8px_0_#0b8a61] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_6px_0_#0b8a61] disabled:translate-y-0 disabled:shadow-none disabled:opacity-50 disabled:animate-none";
const SHOW_STEP_DEBUG_NAV = true;
const APOIO_OPTIONS = [
  { id: "passo", label: "Ter o próximo passo claro", score: 3 },
  { id: "lembretes", label: "Lembretes e notificações", score: 2 },
  { id: "comunidade", label: "Sentir acompanhamento diário", score: 1 },
] as const;
const CORPO_SONHOS_OPTIONS = [
  { id: "natural", label: "Natural", score: 2 },
  { id: "em-forma", label: "Em forma", score: 3 },
] as const;

const RESULTADOS_CAROUSEL_SLIDES = [
  {
    src: "/quiz/resultados-carousel-1.jpg",
    width: 682,
    height: 1024,
    alt: "Depoimento — transformação antes e depois com o protocolo (1 de 2)",
  },
  {
    src: "/quiz/resultados-carousel-2.jpg",
    width: 681,
    height: 1024,
    alt: "Depoimento — transformação antes e depois com o protocolo (2 de 2)",
  },
] as const;

export default function QuizOfferView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutDevMock = searchParams.get("checkout") === "dev-mock";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId: string; score: number }>>({});
  const [goalSelections, setGoalSelections] = useState<string[]>([]);
  const [dificuldadeSelections, setDificuldadeSelections] = useState<string[]>([]);
  const [beneficiosSelections, setBeneficiosSelections] = useState<string[]>([]);
  const [frutaSelections, setFrutaSelections] = useState<string[]>([]);
  const [leadName, setLeadName] = useState("");
  const [leadWeight, setLeadWeight] = useState("");
  const [leadHeight, setLeadHeight] = useState("");
  const [leadDesiredWeight, setLeadDesiredWeight] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showFinalSalesStep, setShowFinalSalesStep] = useState(false);
  const [postPreSalesStep, setPostPreSalesStep] = useState(0);
  const [isPreSalesMuted, setIsPreSalesMuted] = useState(false);
  const [apoioSelection, setApoioSelection] = useState<string | null>(null);
  const [corpoSonhosSelection, setCorpoSonhosSelection] = useState<string | null>(null);
  const [analyzingProgress, setAnalyzingProgress] = useState(1);
  const [nextStepAfterAnalyzing, setNextStepAfterAnalyzing] = useState<number | null>(null);
  const [animatedBmiPointer, setAnimatedBmiPointer] = useState(6);
  const [animatedBmiValue, setAnimatedBmiValue] = useState(18.5);
  const [resultadosCarouselIndex, setResultadosCarouselIndex] = useState(0);
  const preSalesVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasTrackedLandingRef = useRef(false);

  const currentQuestionIndex = step - 1;
  const current = currentQuestionIndex >= 0 ? QUESTIONS[currentQuestionIndex] : undefined;
  const isIntro = step === 0;
  const isQuestionStep = step > 0 && step <= QUESTIONS.length;
  const isLastQuestion = step === QUESTIONS.length;
  const isAnalyzing = step === QUESTIONS.length + 1;
  const isDone = step > QUESTIONS.length + 1;
  const progress = Math.round((Math.max(step, 1) / (QUESTIONS.length + 1)) * 100);
  const goalScore = useMemo(() => {
    const goalQuestion = QUESTIONS.find((q) => q.id === "goal");
    if (!goalQuestion) return 0;
    return goalSelections.reduce((acc, selectedId) => {
      const option = goalQuestion.options.find((opt) => opt.id === selectedId);
      return acc + (option?.score ?? 0);
    }, 0);
  }, [goalSelections]);
  const dificuldadeScore = useMemo(() => {
    const dificuldadeQuestion = QUESTIONS.find((q) => q.id === "dificuldade-peso");
    if (!dificuldadeQuestion) return 0;
    return dificuldadeSelections.reduce((acc, selectedId) => {
      const option = dificuldadeQuestion.options.find((opt) => opt.id === selectedId);
      return acc + (option?.score ?? 0);
    }, 0);
  }, [dificuldadeSelections]);
  const beneficiosScore = useMemo(() => {
    const beneficiosQuestion = QUESTIONS.find((q) => q.id === "beneficios");
    if (!beneficiosQuestion) return 0;
    return beneficiosSelections.reduce((acc, selectedId) => {
      const option = beneficiosQuestion.options.find((opt) => opt.id === selectedId);
      return acc + (option?.score ?? 0);
    }, 0);
  }, [beneficiosSelections]);
  const frutaScore = useMemo(() => {
    const frutaQuestion = QUESTIONS.find((q) => q.id === "fruta-preferida");
    if (!frutaQuestion) return 0;
    return frutaSelections.reduce((acc, selectedId) => {
      const option = frutaQuestion.options.find((opt) => opt.id === selectedId);
      return acc + (option?.score ?? 0);
    }, 0);
  }, [frutaSelections]);
  const totalScore = useMemo(() => {
    const otherScores = Object.entries(answers).reduce((acc, [questionId, row]) => {
      if (questionId === "goal" || questionId === "dificuldade-peso" || questionId === "beneficios" || questionId === "fruta-preferida")
        return acc;
      return acc + row.score;
    }, 0);
    return otherScores + goalScore + dificuldadeScore + beneficiosScore + frutaScore;
  }, [answers, goalScore, dificuldadeScore, beneficiosScore, frutaScore]);
  const bodyMassIndex = useMemo(() => {
    const parsedWeight = Number.parseFloat(leadWeight.replace(",", "."));
    const rawHeight = Number.parseFloat(leadHeight.replace(",", "."));
    if (!Number.isFinite(parsedWeight) || !Number.isFinite(rawHeight) || parsedWeight <= 0 || rawHeight <= 0) {
      return null;
    }
    const heightInMeters = rawHeight > 3 ? rawHeight / 100 : rawHeight;
    if (heightInMeters <= 0) return null;
    return parsedWeight / (heightInMeters * heightInMeters);
  }, [leadWeight, leadHeight]);
  const bodyMassIndexLabel =
    bodyMassIndex === null
      ? "Acima do peso ideal"
      : bodyMassIndex < 25
        ? "Saudavel"
        : bodyMassIndex < 30
          ? "Acima do peso ideal"
          : "Sobrepeso";
  const bodyMassIndexStatusText =
    bodyMassIndex === null ? "Acima do peso ideal!" : bodyMassIndex < 25 ? "Saudavel!" : bodyMassIndex < 30 ? "Acima do peso ideal!" : "Sobrepeso!";
  const bodyMassIndexPointerTarget = (() => {
    if (bodyMassIndex === null) return 74;
    const minImc = 18.5;
    const maxImc = 35;
    const clamped = Math.min(maxImc, Math.max(minImc, bodyMassIndex));
    return ((clamped - minImc) / (maxImc - minImc)) * 100;
  })();
  const bodyMassIndexValueTarget = bodyMassIndex === null ? 30 : bodyMassIndex;
  const bubblePointerLeft = Math.min(84, Math.max(16, animatedBmiPointer));
  const markerPointerLeft = Math.min(96, Math.max(4, animatedBmiPointer));
  const adherenceScore = Math.max(72, Math.min(97, 80 + Math.round((totalScore / Math.max(QUESTIONS.length, 1)) * 4)));
  const currentStepId = getStepId({
    currentId: current?.id,
    isIntro,
    isAnalyzing,
    isDone,
    showFinalSalesStep,
    postPreSalesStep,
  });
  const debugStepLabel = useMemo(() => {
    if (showFinalSalesStep) return "29 · final-sales";
    if (isDone) {
      if (postPreSalesStep === 1) return "26 · apoio";
      if (postPreSalesStep === 2) return "27 · corpo-sonhos";
      if (postPreSalesStep === 3) return "28 · mensagem-receitinha";
      return "25 · pre-sales";
    }
    return `${step} · ${currentStepId}`;
  }, [showFinalSalesStep, isDone, postPreSalesStep, step, currentStepId]);

  useEffect(() => {
    if (hasTrackedLandingRef.current) return;
    hasTrackedLandingRef.current = true;
    initTrackingContext();
    void track({
      event_name: "page_view",
      page_type: "quiz",
      funnel_id: "quiz_gelatina",
      metadata_json: { path: "/quiz" },
    });
    void track({
      event_name: "landing_view",
      page_type: "quiz",
      funnel_id: "quiz_gelatina",
      metadata_json: { path: "/quiz" },
    });
  }, []);

  useEffect(() => {
    if (isAnalyzing || isDone) return;
    void track({
      event_name: "step_viewed",
      funnel_id: "quiz_gelatina",
      step_id: currentStepId,
      page_type: "quiz",
      metadata_json: { step: step, question_id: current?.id ?? null },
    });
  }, [isAnalyzing, isDone, currentStepId, step, current?.id]);

  useEffect(() => {
    function sendExitMetric() {
      if (isDone) return;
      trackWithBeacon({
        event_name: "quiz_abandoned",
        funnel_id: "quiz_gelatina",
        step_id: currentStepId,
        page_type: "quiz",
        metadata_json: { step, reason: "page_unload_or_hidden" },
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendExitMetric();
    }

    window.addEventListener("beforeunload", sendExitMetric);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", sendExitMetric);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [step, currentStepId, isDone]);

  useEffect(() => {
    if (!isDone || showFinalSalesStep) return;

    let frameId = 0;
    const durationMs = 3200;
    const startedAt = performance.now();
    const startPointer = 6;
    const startBmiValue = 18.5;

    setAnimatedBmiPointer(startPointer);
    setAnimatedBmiValue(startBmiValue);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progressRatio = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progressRatio) ** 3;
      const nextPointer = startPointer + (bodyMassIndexPointerTarget - startPointer) * eased;
      const nextValue = startBmiValue + (bodyMassIndexValueTarget - startBmiValue) * eased;

      setAnimatedBmiPointer(nextPointer);
      setAnimatedBmiValue(nextValue);

      if (progressRatio < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isDone, showFinalSalesStep, bodyMassIndexPointerTarget, bodyMassIndexValueTarget]);

  useEffect(() => {
    if (!isDone || showFinalSalesStep || postPreSalesStep !== 0) return;
    const video = preSalesVideoRef.current;
    if (!video) return;
    video.currentTime = 0;

    const tryAutoplay = async () => {
      try {
        // Primeiro tenta com som.
        video.muted = false;
        video.volume = 1;
        await video.play();
        setIsPreSalesMuted(false);
      } catch {
        // Em produção, vários browsers bloqueiam autoplay com som.
        // Fallback: garantir autoplay em mute para não travar a etapa.
        video.muted = true;
        video.volume = 1;
        await video.play().catch(() => undefined);
        setIsPreSalesMuted(true);
      }
    };

    void tryAutoplay();
  }, [isDone, showFinalSalesStep, postPreSalesStep]);

  async function enablePreSalesSound() {
    const video = preSalesVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    await video.play().catch(() => undefined);
    setIsPreSalesMuted(false);
  }

  useEffect(() => {
    if (!isAnalyzing) return;

    let finishTimeout: number | undefined;
    const interval = window.setInterval(() => {
      setAnalyzingProgress((prev) => {
        const next = Math.min(100, prev + (prev < 70 ? 3 : prev < 90 ? 2 : 1));
        if (next >= 100 && !finishTimeout) {
          finishTimeout = window.setTimeout(() => {
            if (nextStepAfterAnalyzing !== null) {
              setStep(nextStepAfterAnalyzing);
              setNextStepAfterAnalyzing(null);
              return;
            }
            setStep(QUESTIONS.length + 2);
          }, 350);
        }
        return next;
      });
    }, 35);

    return () => {
      window.clearInterval(interval);
      if (finishTimeout) window.clearTimeout(finishTimeout);
    };
  }, [isAnalyzing]);

  useEffect(() => {
    if (!isDone) {
      setPostPreSalesStep(0);
      setApoioSelection(null);
      setCorpoSonhosSelection(null);
    }
  }, [isDone]);

  function selectOption(questionId: string, optionId: string, score: number) {
    if (questionId === "goal") {
      setGoalSelections((prev) => {
        const isSelected = prev.includes(optionId);
        const next = isSelected ? prev.filter((id) => id !== optionId) : [...prev, optionId];
        void track({
          event_name: "step_answered",
          funnel_id: "quiz_gelatina",
          step_id: questionId,
          page_type: "quiz",
          metadata_json: {
            question_id: questionId,
            answer_id: optionId,
            answer_label: current?.options.find((opt) => opt.id === optionId)?.label ?? optionId,
            score,
            selection_action: isSelected ? "unselect" : "select",
            selected_count: next.length,
            selected_answers: next,
          },
        });
        return next;
      });
      return;
    }
    if (questionId === "dificuldade-peso") {
      setDificuldadeSelections((prev) => {
        const isSelected = prev.includes(optionId);
        const next = isSelected ? prev.filter((id) => id !== optionId) : [...prev, optionId];
        void track({
          event_name: "step_answered",
          funnel_id: "quiz_gelatina",
          step_id: questionId,
          page_type: "quiz",
          metadata_json: {
            question_id: questionId,
            answer_id: optionId,
            answer_label: current?.options.find((opt) => opt.id === optionId)?.label ?? optionId,
            score,
            selection_action: isSelected ? "unselect" : "select",
            selected_count: next.length,
            selected_answers: next,
          },
        });
        return next;
      });
      return;
    }
    if (questionId === "beneficios") {
      setBeneficiosSelections((prev) => {
        const isSelected = prev.includes(optionId);
        const next = isSelected ? prev.filter((id) => id !== optionId) : [...prev, optionId];
        void track({
          event_name: "step_answered",
          funnel_id: "quiz_gelatina",
          step_id: questionId,
          page_type: "quiz",
          metadata_json: {
            question_id: questionId,
            answer_id: optionId,
            answer_label: current?.options.find((opt) => opt.id === optionId)?.label ?? optionId,
            score,
            selection_action: isSelected ? "unselect" : "select",
            selected_count: next.length,
            selected_answers: next,
          },
        });
        return next;
      });
      return;
    }
    if (questionId === "fruta-preferida") {
      setFrutaSelections((prev) => {
        const isSelected = prev.includes(optionId);
        const next = isSelected ? prev.filter((id) => id !== optionId) : [...prev, optionId];
        void track({
          event_name: "step_answered",
          funnel_id: "quiz_gelatina",
          step_id: questionId,
          page_type: "quiz",
          metadata_json: {
            question_id: questionId,
            answer_id: optionId,
            answer_label: current?.options.find((opt) => opt.id === optionId)?.label ?? optionId,
            score,
            selection_action: isSelected ? "unselect" : "select",
            selected_count: next.length,
            selected_answers: next,
          },
        });
        return next;
      });
      return;
    }

    setAnswers((prev) => ({ ...prev, [questionId]: { optionId, score } }));
    void track({
      event_name: "step_answered",
      funnel_id: "quiz_gelatina",
      step_id: questionId,
      page_type: "quiz",
      metadata_json: {
        question_id: questionId,
        answer_id: optionId,
        answer_label: current?.options.find((opt) => opt.id === optionId)?.label ?? optionId,
        score,
      },
    });

    // Nesta etapa, o fluxo avanca automaticamente apos selecionar.
    if (
      questionId === "sono-horas" ||
      questionId === "hidratacao" ||
      questionId === "impede-emagrecer" ||
      questionId === "kilos" ||
      questionId === "area-gordura" ||
      questionId === "impacto-vida" ||
      questionId === "aparencia-fisica" ||
      questionId === "tempo" ||
      questionId === "sexo" ||
      questionId === "idade" ||
      questionId === "meta-quilos" ||
      questionId === "tipo-corpo"
    ) {
      setTimeout(() => {
        setStep((s) => Math.min(QUESTIONS.length + 1, s + 1));
      }, 120);
    }
  }

  function next() {
    if (isIntro) {
      void track({
        event_name: "quiz_started",
        funnel_id: "quiz_gelatina",
        step_id: "intro",
        page_type: "quiz",
        metadata_json: { cta: "start_quiz" },
      });
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
    if (current.id === "goal") {
      if (goalSelections.length === 0) return;
      if (isLastQuestion) {
        setAnalyzingProgress(1);
        void track({
          event_name: "quiz_completed",
          funnel_id: "quiz_gelatina",
          step_id: current.id,
          page_type: "quiz",
          metadata_json: { answered_steps: Object.keys(answers).length + 1 },
        });
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "dificuldade-peso") {
      if (dificuldadeSelections.length === 0) return;
      if (isLastQuestion) {
        setAnalyzingProgress(1);
        void track({
          event_name: "quiz_completed",
          funnel_id: "quiz_gelatina",
          step_id: current.id,
          page_type: "quiz",
          metadata_json: { answered_steps: Object.keys(answers).length + 1 },
        });
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "beneficios") {
      if (beneficiosSelections.length === 0) return;
      if (isLastQuestion) {
        setAnalyzingProgress(1);
        void track({
          event_name: "quiz_completed",
          funnel_id: "quiz_gelatina",
          step_id: current.id,
          page_type: "quiz",
          metadata_json: { answered_steps: Object.keys(answers).length + 1 },
        });
        setStep(QUESTIONS.length + 1);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (current.id === "fruta-preferida") {
      if (frutaSelections.length === 0) return;
      if (isLastQuestion) {
        setAnalyzingProgress(1);
        setNextStepAfterAnalyzing(null);
        void track({
          event_name: "quiz_completed",
          funnel_id: "quiz_gelatina",
          step_id: current.id,
          page_type: "quiz",
          metadata_json: { answered_steps: Object.keys(answers).length + 1 },
        });
        setStep(QUESTIONS.length + 1);
        return;
      }
      setAnalyzingProgress(1);
      setNextStepAfterAnalyzing(step + 1);
      setStep(QUESTIONS.length + 1);
      return;
    }
    if (!answers[current.id]) return;
    if (isLastQuestion) {
      setAnalyzingProgress(1);
      void track({
        event_name: "quiz_completed",
        funnel_id: "quiz_gelatina",
        step_id: current.id,
        page_type: "quiz",
        metadata_json: { answered_steps: Object.keys(answers).length + 1 },
      });
      setStep(QUESTIONS.length + 1);
      return;
    }
    setStep((s) => s + 1);
  }

  function goToFinalSalesStep() {
    setCheckoutError(null);
    void track({
      event_name: "result_cta_clicked",
      funnel_id: "quiz_gelatina",
      step_id: currentStepId,
      page_type: "quiz",
      metadata_json: { cta: "go_to_final_sales" },
    });
    setShowFinalSalesStep(true);
  }

  function selectApoioOption(optionId: string, score: number) {
    setApoioSelection(optionId);
    void track({
      event_name: "step_answered",
      funnel_id: "quiz_gelatina",
      step_id: "apoio",
      page_type: "quiz",
      metadata_json: { question_id: "apoio", answer_id: optionId, score },
    });
  }

  function selectCorpoSonhosOption(optionId: string, score: number) {
    setCorpoSonhosSelection(optionId);
    void track({
      event_name: "step_answered",
      funnel_id: "quiz_gelatina",
      step_id: "corpo-sonhos",
      page_type: "quiz",
      metadata_json: { question_id: "corpo-sonhos", answer_id: optionId, score },
    });
  }

  function continueAfterPreSales() {
    if (postPreSalesStep === 0) {
      setPostPreSalesStep(1);
      return;
    }
    if (postPreSalesStep === 1) {
      if (!apoioSelection) return;
      setPostPreSalesStep(2);
      return;
    }
    if (postPreSalesStep === 2) {
      if (!corpoSonhosSelection) return;
      setPostPreSalesStep(3);
      return;
    }
    goToFinalSalesStep();
  }

  function debugGoPrevStep() {
    if (showFinalSalesStep) {
      setShowFinalSalesStep(false);
      setPostPreSalesStep(3);
      return;
    }
    if (isDone && postPreSalesStep > 0) {
      setPostPreSalesStep((prev) => Math.max(0, prev - 1));
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  }

  function debugGoNextStep() {
    if (showFinalSalesStep) return;
    if (isDone) {
      if (postPreSalesStep < 3) {
        setPostPreSalesStep((prev) => Math.min(3, prev + 1));
        return;
      }
      setShowFinalSalesStep(true);
      return;
    }
    if (step >= QUESTIONS.length + 2) {
      setShowFinalSalesStep(true);
      return;
    }
    setStep((prev) => Math.min(QUESTIONS.length + 2, prev + 1));
  }

  async function startCheckout() {
    if (isStartingCheckout) return;
    setIsStartingCheckout(true);
    setCheckoutError(null);
    void track({
      event_name: "checkout_started",
      funnel_id: "quiz_gelatina",
      step_id: currentStepId,
      page_type: "quiz",
      metadata_json: { plan: "FRONT", source: "quiz_offer_cta" },
    });
    const trackingContext = getTrackingContext();
    try {
      // Pre-aquece o clientSecret antes de navegar para reduzir latência percebida.
      const response = await fetch("/api/stripe/elements-guest-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "FRONT",
          tracking: {
            session_id: trackingContext.sessionId,
            visitor_id: trackingContext.visitorId,
            anonymous_id: trackingContext.anonymousId,
            funnel_id: "quiz_gelatina",
            step_id: currentStepId,
            utm_source: trackingContext.utm_source,
            utm_medium: trackingContext.utm_medium,
            utm_campaign: trackingContext.utm_campaign,
            utm_content: trackingContext.utm_content,
            utm_term: trackingContext.utm_term,
            fbclid: trackingContext.fbclid,
            gclid: trackingContext.gclid,
            ttclid: trackingContext.ttclid,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { clientSecret?: string };
      if (response.ok && data.clientSecret) {
        sessionStorage.setItem("quiz_checkout_client_secret", data.clientSecret);
      }
      router.push("/quiz/checkout");
    } catch {
      setCheckoutError("Falha ao iniciar checkout. Tenta novamente.");
    } finally {
      setIsStartingCheckout(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white px-4 pb-14 pt-7 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        {checkoutDevMock ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold">Modo desenvolvimento — checkout simulado</p>
            <p className="mt-1 text-amber-900/90">
              Não há pagamento real. Para Stripe a sério, coloca{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code> no{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">.env.local</code> e corre{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">npm run stripe:seed</code>.
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/50"
              onClick={() => router.replace("/quiz")}
            >
              Fechar aviso
            </button>
          </div>
        ) : null}
        {SHOW_STEP_DEBUG_NAV ? (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <button
              type="button"
              onClick={debugGoPrevStep}
              className="rounded-md border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-700"
            >
              ← Etapa
            </button>
            <span className="font-medium text-emerald-800">
              Step {debugStepLabel}
            </span>
            <button
              type="button"
              onClick={debugGoNextStep}
              className="rounded-md border border-emerald-300 bg-white px-3 py-1 font-semibold text-emerald-700"
            >
              Etapa →
            </button>
          </div>
        ) : null}
        <div className="mx-auto mb-8 w-fit">
          <BrandLogo variant="auth" className="w-24 sm:w-28" />
        </div>

        {isIntro ? (
          <section className="mx-auto max-w-[860px]">
            <div className="rounded-3xl border border-pg-forest/10 bg-white p-6 sm:p-8">
              <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-pg-forest/10 bg-gradient-to-b from-rose-50 via-white to-emerald-50 px-6 py-10">
                <Image
                  src="/quiz-main-v3.png"
                  alt="Gelatina Inteligente"
                  width={1200}
                  height={1200}
                  priority
                  className="mx-auto h-auto w-full max-w-[520px] rounded-xl object-contain"
                />
              </div>
            </div>

            <p className="mt-8 text-[28px] leading-relaxed text-pg-ink sm:text-[32px]">
              <span className="font-extrabold text-red-600">Atencao:</span> oferecemos apenas{" "}
              <span className="font-extrabold">uma consulta por pessoa.</span> Se voce sair, perdera a sua vez.
              Aproveite essa oportunidade exclusiva!
            </p>

            <button
              type="button"
              onClick={next}
              className={`mt-9 h-16 w-full text-xl ${CONTINUE_BUTTON_CLASS}`}
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
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Quantos quilos voce
                  <br />
                  <span className="text-emerald-600">deseja perder?</span>
                </h1>
              ) : current.id === "idade" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Vamos criar um Plano Personalizado de Emagrecimento com a Receita da Gelatina Emagrecedora,
                  focado nas suas necessidades.
                </h1>
              ) : current.id === "area-gordura" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Em qual área do seu corpo
                  <br />
                  você gostaria de <span className="text-emerald-600">reduzir</span>
                  <br />
                  <span className="text-emerald-600">mais gordura?</span>
                </h1>
              ) : current.id === "meta-quilos" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Quantos quilos deseja perder?
                </h1>
              ) : current.id === "prova-mariana" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Veja o Resultado da Gelatina Emagrecedora na Vida da Mariana
                </h1>
              ) : current.id === "nome" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Vamos lá! Como posso te chamar?
                </h1>
              ) : current.id === "tipo-corpo" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Qual é o seu tipo de corpo atual?
                </h1>
              ) : current.id === "impacto-vida" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  tete com o o seu peso afeta sua vida?
                </h1>
              ) : current.id === "aparencia-fisica" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Você se sente satisfeita com a sua aparência física atual?
                </h1>
              ) : current.id === "dificuldade-peso" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Você enfrenta alguma dificuldade no dia a dia devido ao peso?
                </h1>
              ) : current.id === "impede-emagrecer" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  O que te impede de emagrecer?
                </h1>
              ) : current.id === "explicacao-gelatina" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Te entendemos!
                </h1>
              ) : current.id === "beneficios" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  tete quais desses benefícios gostaria de ter?
                </h1>
              ) : current.id === "depoimento-claudia" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  🔥 Histórias Reais de Transformação!
                </h1>
              ) : current.id === "peso-atual" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Qual é o seu peso atual?
                </h1>
              ) : current.id === "altura" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Qual é sua altura?
                </h1>
              ) : current.id === "peso-desejado" ? (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  Qual é o seu peso desejado?
                </h1>
              ) : current.id === "mensagem-receitinha" ? (
                <h1 className="mx-auto max-w-[560px] text-balance text-sm font-medium leading-relaxed text-pg-ink sm:text-base">
                  Fique tranquila! Assim que você finalizar sua avaliação, você vai receber a sua receitinha no seu
                  E-mail e no seu Whatsapp 💌
                </h1>
              ) : (
                <h1 className="text-balance text-2xl font-semibold leading-tight text-pg-ink sm:text-3xl">
                  {current.title}
                </h1>
              )}
              {current.id === "area-gordura" || current.id === "nome" || current.id === "mensagem-receitinha" ? null : (
                <p className="mt-2 text-base text-pg-ink/80 sm:text-lg">
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
                                ? "🔥  📍 Depoimento: Cláudia — Porto"
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
                <div className="overflow-hidden rounded-2xl border-2 border-emerald-600/80">
                  <Image
                    src="/quiz/prova-mariana.png"
                    alt="Antes e depois da Mariana"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 768px) 92vw, 720px"
                    className="h-auto w-full"
                  />
                </div>
              </div>
            ) : current.id === "explicacao-gelatina" ? (
              <div className="mx-auto max-w-[720px]">
                <div className="rounded-2xl border border-emerald-600/30 bg-white p-5 text-center">
                  <p className="text-[34px] font-black leading-tight text-red-500 sm:text-[40px]">VEJA COMO FUNCIONA A</p>
                  <p className="text-[34px] font-black leading-tight text-red-500 sm:text-[40px]">GELATINA BARIÁTRICA</p>
                  <div className="mx-auto mt-5 w-full max-w-[520px] overflow-hidden rounded-2xl border border-emerald-200">
                    <Image
                      src="/quiz/explicacao-gelatina.png"
                      alt="Como funciona a gelatina bariátrica"
                      width={1024}
                      height={1024}
                      sizes="(max-width: 640px) 88vw, 520px"
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            ) : current.id === "depoimento-claudia" ? (
              <div className="mx-auto max-w-[760px] space-y-5">
                <div className="overflow-hidden rounded-2xl border border-emerald-600/20">
                  <Image
                    src="/quiz/depoimento-claudia-transformacao-v2.png"
                    alt="Transformação da Cláudia"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 768px) 94vw, 760px"
                    className="h-auto w-full"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-600/20 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-emerald-200">
                      <Image src="/quiz/depoimento-claudia-rosto.png" alt="Cláudia" fill sizes="48px" className="object-cover" />
                    </div>
                    <div>
                      <p className="text-[23px] font-semibold leading-tight text-pg-ink sm:text-[28px]">Cláudia</p>
                      <p className="text-[18px] text-pg-ink/70 sm:text-[22px]">Porto</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[18px] leading-snug text-pg-ink/90 sm:text-[22px]">
                    Já tinha experimentado várias abordagens para perder peso e nunca conseguia manter resultados.
                    Depois de incluir a Gelatina Emagrecedora na minha rotina, perdi 12 kg sem mudanças radicais e
                    passei a sentir muito mais controlo do apetite e menos ansiedade ao longo do dia.
                  </p>
                  <p className="mt-3 text-[24px] text-yellow-500 sm:text-[28px]">★★★★★</p>
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
                  <p className="text-[24px] font-bold leading-tight text-pg-ink sm:text-[28px]">
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
                  <p className="text-[24px] font-bold leading-tight text-pg-ink sm:text-[28px]">
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
                  <p className="text-[24px] font-bold leading-tight text-pg-ink sm:text-[28px]">
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
                  const selected =
                    current.id === "goal"
                      ? goalSelections.includes(option.id)
                      : current.id === "dificuldade-peso"
                        ? dificuldadeSelections.includes(option.id)
                        : current.id === "beneficios"
                          ? beneficiosSelections.includes(option.id)
                          : current.id === "fruta-preferida"
                            ? frutaSelections.includes(option.id)
                        : answers[current.id]?.optionId === option.id;
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
                              ? "relative min-h-[180px] overflow-hidden rounded-2xl border-2 p-0 transition sm:min-h-[210px]"
                            : current.id === "impede-emagrecer"
                              ? "relative min-h-[120px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "beneficios"
                              ? "relative min-h-[126px] overflow-hidden rounded-2xl border-2 p-0 transition sm:min-h-[138px]"
                            : current.id === "meta-quilos"
                            ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : current.id === "sexo"
                            ? "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition"
                            : "flex min-h-[108px] items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition",
                        selected
                          ? current.id === "kilos"
                            ? "border-emerald-600 bg-emerald-100 ring-2 ring-emerald-200"
                            : current.id === "area-gordura"
                              ? "border-emerald-600 bg-emerald-100 ring-2 ring-emerald-200"
                            : "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200"
                          : current.id === "kilos"
                            ? "border-emerald-600/90 bg-emerald-50/60 hover:bg-emerald-100/70"
                            : current.id === "area-gordura"
                              ? "border-emerald-600/90 bg-emerald-50/60 hover:bg-emerald-100/70"
                            : "border-emerald-600/90 bg-white hover:bg-emerald-50/50",
                      ].join(" ")}
                    >
                      {selected && current.id !== "beneficios" ? (
                        <span className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                          ✓
                        </span>
                      ) : null}
                      {current.id === "idade" ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
                          <div className="absolute left-1/2 top-6 h-36 w-[72%] -translate-x-1/2 overflow-hidden rounded-xl ring-1 ring-black/5">
                            <Image
                              src={
                                option.id === "18-26"
                                  ? "/quiz/idade-18-26.png"
                                  : option.id === "27-38"
                                    ? "/quiz/idade-27-38.png"
                                    : option.id === "39-50"
                                      ? "/quiz/idade-39-50.png"
                                      : "/quiz/idade-46-plus.png"
                              }
                              alt={`Faixa etaria ${option.label}`}
                              fill
                              sizes="(max-width: 640px) 42vw, 220px"
                              className="object-contain"
                            />
                          </div>
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-lg font-medium text-pg-ink sm:text-xl">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "tipo-corpo" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <div className="absolute left-5 top-1/2 h-20 w-20 -translate-y-1/2 overflow-hidden rounded-md ring-1 ring-black/5">
                            <Image
                              src={
                                option.id === "regular"
                                  ? "/quiz/tipo-corpo-regular.png"
                                  : option.id === "flacido"
                                    ? "/quiz/tipo-corpo-flacido.png"
                                    : "/quiz/tipo-corpo-sobrepeso.png"
                              }
                              alt={`Tipo de corpo ${option.label}`}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-medium text-pg-ink sm:text-2xl">
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
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-base font-medium leading-tight text-pg-ink sm:text-lg">
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
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-base font-medium leading-tight text-pg-ink sm:text-lg">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "dificuldade-peso" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span
                            className={[
                              "absolute left-4 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-2 border-emerald-600 sm:left-5 sm:h-8 sm:w-8",
                              selected ? "bg-emerald-600 shadow-[inset_0_0_0_4px_white]" : "bg-white",
                            ].join(" ")}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span className="text-5xl sm:text-6xl">
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
                            <span className="w-[82%] whitespace-pre-line text-center text-[18px] font-medium leading-tight text-pg-ink sm:text-[22px]">
                              {option.label}
                            </span>
                          </div>
                        </>
                      ) : current.id === "impede-emagrecer" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl">{option.icon ?? "•"}</span>
                          <div className="absolute left-24 right-4 top-1/2 -translate-y-1/2 text-left">
                            <p className="text-base font-semibold leading-tight text-pg-ink sm:text-lg">{option.label}</p>
                            <p className="mt-1 text-sm leading-tight text-pg-ink/70 sm:text-base">{option.description}</p>
                          </div>
                        </>
                      ) : current.id === "beneficios" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span
                            className={[
                              "absolute left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-emerald-600 sm:left-5 sm:h-9 sm:w-9",
                              selected ? "bg-emerald-600 shadow-[inset_0_0_0_4px_white]" : "bg-white",
                            ].join(" ")}
                          />
                          <span className="absolute left-16 right-3 top-1/2 -translate-y-1/2 text-left text-[17px] font-medium leading-tight text-pg-ink sm:left-20 sm:text-[20px]">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "meta-quilos" ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-white" />
                          <div className="absolute left-1/2 top-6 h-32 w-[72%] -translate-x-1/2 overflow-hidden rounded-xl ring-1 ring-black/5">
                            <Image
                              src="/quiz/meta-kilos.png"
                              alt="Balança com fita métrica"
                              fill
                              sizes="(max-width: 640px) 42vw, 220px"
                              className="object-contain"
                            />
                          </div>
                          <span className="absolute bottom-5 left-1/2 w-[88%] -translate-x-1/2 text-center text-sm font-medium leading-tight text-pg-ink sm:text-base">
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
                          <div className="absolute left-1/2 top-3 h-[188px] w-[138px] -translate-x-1/2 overflow-hidden rounded-xl ring-1 ring-black/5">
                            <Image
                              src={option.id === "mulher" ? "/quiz/sexo-mulher.png" : "/quiz/sexo-homem.png"}
                              alt={option.id === "mulher" ? "Mulher" : "Homem"}
                              fill
                              sizes="138px"
                              className="object-cover object-top"
                            />
                          </div>
                          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-emerald-500 px-4 py-1 text-xl font-bold text-white">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "tempo" || current.id === "sono-horas" || current.id === "hidratacao" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl">{option.icon ?? "•"}</span>
                          <span className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 text-center text-base font-medium leading-tight text-pg-ink sm:text-lg">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "fruta-preferida" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <span
                            className={[
                              "absolute left-4 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-emerald-600",
                              selected ? "bg-emerald-600 shadow-[inset_0_0_0_4px_white]" : "bg-white",
                            ].join(" ")}
                          />
                          <span className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 text-6xl">
                            {option.icon ?? "•"}
                          </span>
                          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-base font-medium leading-tight text-pg-ink sm:text-lg">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "corpo-sonhos" ? (
                        <>
                          <div className="absolute inset-0 bg-white" />
                          <div className="absolute left-1/2 top-4 h-[170px] w-[108px] -translate-x-1/2 overflow-hidden rounded-xl ring-1 ring-black/5">
                            <Image
                              src={
                                option.id === "em-forma"
                                  ? "/quiz/corpo-sonhos-em-forma.png"
                                  : "/quiz/corpo-sonhos-natural.png"
                              }
                              alt={`Corpo dos sonhos ${option.label}`}
                              fill
                              sizes="(max-width: 640px) 34vw, 180px"
                              className="object-cover object-top"
                            />
                          </div>
                          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-lg font-medium text-pg-ink sm:text-xl">
                            {option.label}
                          </span>
                        </>
                      ) : current.id === "kilos" || current.id === "area-gordura" ? null : (
                        <span
                          className={[
                            "h-7 w-7 rounded-full border-2 transition",
                            selected ? "border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_4px_white]" : "border-emerald-600 bg-white",
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
                        <span className="text-base font-medium leading-snug text-pg-ink sm:text-lg">{option.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {current.id === "sexo" ? (
              <div className="mt-8 rounded-2xl border-2 border-emerald-600/60 bg-emerald-50/35 p-5">
                <p className="text-[24px] font-bold leading-tight text-pg-ink sm:text-[27px]">
                  As informacoes sao para fazer ajustes em seu plano exclusivo e personalizado.
                </p>
                <p className="mt-3 text-[21px] leading-relaxed text-pg-ink/90 sm:text-[24px]">
                  O sexo biologico e um fator que afeta a sua TMB (taxa metabolica), que determina quantas calorias
                  voce queima por dia.
                </p>
              </div>
            ) : null}

            {current.id !== "sono-horas" &&
            current.id !== "hidratacao" &&
            current.id !== "impede-emagrecer" &&
            current.id !== "kilos" &&
            current.id !== "area-gordura" &&
            current.id !== "impacto-vida" &&
            current.id !== "aparencia-fisica" &&
            current.id !== "tempo" &&
            current.id !== "sexo" &&
            current.id !== "idade" &&
            current.id !== "meta-quilos" &&
            current.id !== "tipo-corpo" ? (
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
                      ((current.id === "goal"
                        ? goalSelections.length === 0
                        : current.id === "dificuldade-peso"
                          ? dificuldadeSelections.length === 0
                          : current.id === "beneficios"
                            ? beneficiosSelections.length === 0
                            : current.id === "fruta-preferida"
                              ? frutaSelections.length === 0
                          : !answers[current.id]))) ||
                    (current.id === "nome" && !leadName.trim()) ||
                    (current.id === "peso-atual" && !leadWeight.trim()) ||
                    (current.id === "altura" && !leadHeight.trim()) ||
                    (current.id === "peso-desejado" && !leadDesiredWeight.trim())
                  }
                  className={`h-14 w-full text-lg ${CONTINUE_BUTTON_CLASS}`}
                >
                  {current.id === "nome" ? "Enviar" : isLastQuestion ? "Ver resultado" : "Continuar"}
                </button>
              </div>
            ) : null}
          </section>
        ) : isAnalyzing ? (
          <section className="mx-auto max-w-[820px]">
            <div className="rounded-[28px] border-2 border-dashed border-pink-300 bg-white px-5 py-8 text-center">
              <div className="mx-auto mb-2 h-24 w-24 rounded-full bg-gradient-to-b from-pink-200 via-pink-100 to-white p-2 shadow-sm">
                <BrandLogo variant="auth" className="h-full w-full object-contain" />
              </div>
              <p className="text-[34px] font-black leading-tight text-pink-600 sm:text-[40px]">Gelatina Bariátrica</p>
              <p className="mt-2 text-[30px] font-black leading-tight text-pink-600 sm:text-[36px]">Estamos analisando suas respostas...</p>
            </div>

            <div className="mx-auto mt-14 max-w-[640px]">
              <div className="h-8 rounded-full bg-neutral-100 p-1 shadow-inner">
                <div
                  className="flex h-full items-center justify-center rounded-full bg-emerald-600 text-[24px] font-black text-white transition-all duration-75"
                  style={{ width: `${Math.max(analyzingProgress, 1)}%` }}
                >
                  {analyzingProgress}%
                </div>
              </div>
            </div>
          </section>
        ) : !showFinalSalesStep ? (
          <section className="mx-auto max-w-[430px] space-y-3">
            {postPreSalesStep === 0 ? (
              <>
            <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-4 text-center">
              <p className="text-[22px] font-black leading-tight text-pg-ink">
                {leadName.trim()
                  ? `${leadName.trim()}, veja e ouça minha mensagem urgente!`
                  : "Veja e ouça minha mensagem urgente!"}
              </p>
              <div className="mx-auto mt-3 w-full max-w-[300px] overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-sm sm:max-w-[320px]">
                <div className="relative aspect-[9/16] w-full">
                  <video
                    ref={preSalesVideoRef}
                    className="h-full w-full object-cover object-center"
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <source src={PRE_SALES_VIDEO_SRC} type="video/mp4" />
                  </video>
                  {isPreSalesMuted ? (
                    <button
                      type="button"
                      onClick={enablePreSalesSound}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-neutral-900 shadow"
                    >
                      Ativar som
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-4 text-[18px] font-black leading-tight text-pg-ink sm:text-[22px]">
                <span className="text-red-600">⚠️ ATENÇÃO, este!</span> Pelas suas respostas, seu corpo tá no modo{" "}
                <span className="text-red-600">ACÚMULO DE GORDURA</span>. Se não agir HOJE, essa situação tende a{" "}
                <span className="text-red-600">PIORAR</span>.
              </p>
              <div
                className="mt-4 rounded-2xl p-4 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #4dbf22 0%, #b57c18 54%, #ff1c28 100%), linear-gradient(to right, rgba(255,255,255,0.07), rgba(255,255,255,0.03), rgba(255,255,255,0.07)), repeating-linear-gradient(to right, transparent, transparent 42px, rgba(255,255,255,0.08) 42px, rgba(255,255,255,0.08) 43px), repeating-linear-gradient(to bottom, transparent, transparent 21px, rgba(255,255,255,0.06) 21px, rgba(255,255,255,0.06) 22px)",
                }}
              >
                <div className="flex items-start justify-between gap-4 text-left">
                  <p className="text-[17px] font-black leading-tight">
                    Índice de massa corporal
                    <br />
                    (IMC)
                  </p>
                  <p className="max-w-[140px] text-[14px] font-black leading-tight">{bodyMassIndexStatusText}</p>
                </div>

                <div className="relative mt-5">
                  <div className="relative h-[11px] rounded-full bg-[#f1df64]">
                    <div
                      className="absolute -top-11 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-3 py-1 text-[12px] font-bold text-pg-ink shadow"
                      style={{ left: `${bubblePointerLeft}%` }}
                    >
                      este, voce esta aqui
                    </div>
                    <div
                      className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.22)]"
                      style={{ left: `${markerPointerLeft}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] font-black">
                  <span>Saudável</span>
                  <span>Acima do peso</span>
                  <span>Sobrepeso</span>
                </div>
                <p className="mt-1 text-right text-[12px] font-semibold text-white/95">IMC: {animatedBmiValue.toFixed(1).replace(".", ",")}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#e5f665] px-6 py-5 text-pg-ink">
              <p className="text-[40px] leading-none">〽️</p>
              <p className="mt-1 text-[21px] font-black leading-tight">
                Seu metabolismo pode estar te sabotando sem que você perceba!
              </p>
              <p className="mt-3 text-[18px] leading-snug text-pg-ink/90">
                Mesmo estando no peso normal, seu corpo pode estar retendo toxinas e trabalhando de forma mais lenta,
                dificultando a queima de gordura e deixando você com menos energia.
              </p>
            </div>

            <div className="rounded-2xl bg-[#ff1717] px-6 py-5 text-white">
              <p className="text-[22px] font-black leading-tight">❗️🚨 Alguns sinais de alerta:</p>
              <ul className="mt-3 space-y-2 text-[17px] leading-snug">
                <li>✗ Metabolismo lento e dificuldade para emagrecer mesmo comendo pouco.</li>
                <li>✗ Cansaço constante e sensação de inchaço.</li>
                <li>✗ Acúmulo de gordura em áreas específicas do corpo, principalmente na barriga.</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-[#8f8df2] px-6 py-5 text-white">
              <p className="text-[21px] font-black leading-tight">♡ 💡 Com a Gelatina Bariátrica, seu corpo acelera a queima de</p>
              <p className="mt-1 text-[21px] font-black leading-tight">gordura naturalmente!</p>
              <p className="mt-3 text-[17px] leading-snug text-white/90">
                A combinação ideal de ingredientes pode ativar seu metabolismo, reduzir a retenção de líquidos e aumentar sua
                disposição.
              </p>
              <p className="mt-2 text-[17px] font-semibold leading-snug text-white/95">
                ✅ Descubra agora como o Mounjaro de Pobre pode transformar seu corpo!
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-neutral-200 bg-[#fafafa] p-2.5 text-center">
                  <p className="text-[14px] font-extrabold leading-tight text-pg-ink">Índice de massa corporal: Muito alto!</p>
                  <div className="mx-auto mt-2.5 grid h-32 w-32 place-items-center rounded-full bg-neutral-200">
                    <div
                      className="grid h-28 w-28 place-items-center rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 210deg, #ff1717 0deg, #d24a00 120deg, #9d7d00 220deg, #46b814 300deg, #e5e7eb 300deg 360deg)",
                      }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-[18px] font-extrabold text-pg-ink">
                        {adherenceScore}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded-xl border border-neutral-200 bg-[#fafafa] px-2 py-3 text-center">
                    <p className="text-[16px] font-black text-pg-ink">Sobrepeso</p>
                  </div>
                  <div className="relative h-[172px] overflow-hidden rounded-xl border border-neutral-200 bg-[#f3f3f3]">
                    <Image src="/quiz/depoimento-claudia-rosto-v2.png" alt="Perfil corporal atual" fill className="object-contain object-bottom" />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-[20px] font-black leading-tight text-pg-ink">
                Você pode perder de <span className="text-red-600">9KG a 15KG</span> em <span className="text-red-600">3 semanas</span> com as
                gelatinas ideais!
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="grid grid-cols-3 divide-x divide-neutral-200">
                {[
                  { title: "1 Semana", inside: "7D", loss: "-5 KG", daysTop: "7 dias", daysBottom: "7 dias", fill: "22%" },
                  { title: "2 Semands", inside: "14D", loss: "-9 KG", daysTop: "14 Dias", daysBottom: "14 Dias", fill: "46%" },
                  { title: "3 Semands", inside: "21D", loss: "-15 KG", daysTop: "21 Dias", daysBottom: "21 Dias", fill: "70%" },
                ].map((item) => (
                  <div key={item.title} className="px-2 text-center">
                    <p className="text-[12px] font-black text-pg-ink">{item.title}</p>
                    <div className="mx-auto mt-3 h-[92px] w-8 overflow-hidden rounded-[10px] bg-[#d9dbe1]">
                      <div className="flex h-full items-end justify-center">
                        <div
                          className="flex w-full items-center justify-center rounded-b-[10px] bg-emerald-600 text-[10px] font-black text-white"
                          style={{ height: item.fill }}
                        >
                          {item.inside}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] font-black text-pg-ink">{item.loss}</p>
                    <p className="mt-1 text-[12px] font-semibold text-pg-ink/65">{item.daysBottom}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-center text-[22px] font-black text-pg-ink">Veja a transformação da Tania!</p>
              <div className="relative mt-3 h-[250px] overflow-hidden rounded-md bg-neutral-100">
                <Image src="/quiz/transformacao-tania-v2.png" alt="Transformação da Tania" fill className="object-contain object-center" />
              </div>
            </div>
              </>
            ) : null}

            {postPreSalesStep === 1 ? (
              <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                <h3 className="text-center text-2xl font-semibold leading-tight text-pg-ink">O que te faria manter o plano ativo?</h3>
                <p className="mt-2 text-center text-lg text-pg-ink/80">Escolhe a opção que mais combina contigo.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {APOIO_OPTIONS.map((option) => {
                    const selected = apoioSelection === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectApoioOption(option.id, option.score)}
                        className={[
                          "flex min-h-[108px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                          selected
                            ? "border-emerald-600 bg-emerald-100 ring-2 ring-emerald-200"
                            : "border-emerald-600/90 bg-emerald-50/60 hover:bg-emerald-100/70",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-8 w-8 shrink-0 rounded-full border-2 transition",
                            selected ? "border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_4px_white]" : "border-emerald-600 bg-white",
                          ].join(" ")}
                        />
                        <span className="break-words text-base font-medium leading-snug text-pg-ink sm:text-lg">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {postPreSalesStep === 2 ? (
              <section className="rounded-2xl border border-neutral-200 bg-white p-4">
                <h3 className="text-center text-2xl font-semibold leading-tight text-pg-ink">Qual o corpo dos seus sonhos?</h3>
                <p className="mt-2 text-center text-lg text-pg-ink/80">Escolha a opção abaixo:</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {CORPO_SONHOS_OPTIONS.map((option) => {
                    const selected = corpoSonhosSelection === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectCorpoSonhosOption(option.id, option.score)}
                        className={[
                          "relative min-h-[250px] overflow-hidden rounded-2xl border-2 p-0 transition",
                          selected
                            ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200"
                            : "border-emerald-600/90 bg-white hover:bg-emerald-50/50",
                        ].join(" ")}
                      >
                        {selected ? (
                          <span className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                            ✓
                          </span>
                        ) : null}
                        <div className="absolute inset-0 bg-white" />
                        <div className="absolute left-1/2 top-4 h-[170px] w-[108px] -translate-x-1/2 overflow-hidden rounded-xl ring-1 ring-black/5">
                          <Image
                            src={option.id === "em-forma" ? "/quiz/corpo-sonhos-em-forma.png" : "/quiz/corpo-sonhos-natural.png"}
                            alt={`Corpo dos sonhos ${option.label}`}
                            fill
                            sizes="(max-width: 640px) 34vw, 180px"
                            className="object-cover object-top"
                          />
                        </div>
                        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-lg font-medium text-pg-ink sm:text-xl">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {postPreSalesStep === 3 ? (
              <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-center">
                <p className="mx-auto max-w-[560px] text-sm font-medium leading-relaxed text-pg-ink sm:text-base">
                  Fique tranquila! Assim que você finalizar sua avaliação, você vai receber a sua receitinha no seu
                  E-mail e no seu Whatsapp 💌
                </p>
              </section>
            ) : null}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={continueAfterPreSales}
                disabled={
                  (postPreSalesStep === 1 && !apoioSelection) || (postPreSalesStep === 2 && !corpoSonhosSelection)
                }
                className={`h-14 w-full text-base font-black ${CONTINUE_BUTTON_CLASS}`}
              >
                {postPreSalesStep < 3 ? "Continuar" : "Quero Transformar Minha Vida Hoje!"}
              </button>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[430px] space-y-4">
            <div className="text-center">
              <p className="text-2xl font-black leading-tight text-pg-ink sm:text-3xl">
                tete, você está pronta
                <br />
                para <span className="text-emerald-500">transformar</span> seu <span className="text-emerald-500">corpo</span> e
                sua <span className="text-emerald-500">saúde</span>?
              </p>
              <p className="mt-2 text-lg text-pg-ink/85">Escolha a opção abaixo.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="grid grid-cols-2 divide-x divide-neutral-200">
                <div className="flex flex-col items-center p-4 text-center">
                  <div className="relative mx-auto h-48 w-36 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                    <Image
                      src="/quiz/final-sales-antes.png"
                      alt="Antes da transformação"
                      width={144}
                      height={192}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <p className="mt-4 text-sm font-bold leading-snug text-pg-ink sm:text-[15px]">
                    Esta é você com{" "}
                    <span className="font-black text-red-500">
                      {formatLeadKgDisplay(leadWeight, "143")} kg
                    </span>
                    , antes da Gelatina Emagrecedora
                  </p>
                  <div className="relative mx-auto mt-4 h-4 w-full max-w-[152px]">
                    <div className="absolute inset-0 rounded-full bg-red-200" />
                    <div className="absolute inset-y-0 left-0 w-full rounded-full bg-red-500" />
                    <div
                      className="absolute right-0 top-1/2 z-10 h-7 w-7 -translate-y-1/2 translate-x-1/2 rounded-full border-[3px] border-white bg-red-500 shadow-md"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-4 flex w-full max-w-[168px] flex-col items-center justify-center gap-1 rounded-2xl bg-red-500 px-3 py-3.5 text-white shadow-sm">
                    <svg
                      className="h-7 w-7 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4" />
                      <path d="M12 16h.01" />
                    </svg>
                    <span className="text-[13px] font-bold leading-tight sm:text-sm">Riscos de doenças</span>
                    <span className="text-lg font-black leading-none sm:text-xl">Alto</span>
                  </div>
                </div>
                <div className="flex flex-col items-center p-4 text-center">
                  <div className="relative mx-auto h-48 w-36 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    <Image
                      src="/quiz/final-sales-depois.png"
                      alt="Depois da transformação"
                      width={144}
                      height={192}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <p className="mt-4 text-sm font-bold leading-snug text-pg-ink sm:text-[15px]">
                    E esta é você com{" "}
                    <span className="font-black text-emerald-600">
                      {formatLeadKgDisplay(leadDesiredWeight, "65")} kg
                    </span>
                    , depois de usar a gelatina ideal para o seu corpo
                  </p>
                  <div className="relative mx-auto mt-4 h-4 w-full max-w-[152px]">
                    <div className="absolute inset-0 rounded-full bg-emerald-200/90" />
                    <div className="absolute inset-y-0 left-0 w-full rounded-full bg-emerald-500" />
                    <div
                      className="absolute right-0 top-1/2 z-10 h-7 w-7 -translate-y-1/2 translate-x-1/2 rounded-full border-[3px] border-white bg-emerald-500 shadow-md"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-4 flex w-full max-w-[168px] flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500 px-3 py-3.5 text-white shadow-sm">
                    <svg
                      className="h-7 w-7 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M7 10v12" />
                      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                    </svg>
                    <span className="text-[13px] font-bold leading-tight sm:text-sm">Riscos de doenças</span>
                    <span className="text-lg font-black leading-none sm:text-xl">Baixo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-black sm:text-3xl">
                <span className="text-[#32cd32]">Como funciona </span>
                <span className="text-pg-ink">o Plano?</span>
              </p>
              <p className="mt-2 text-base leading-relaxed text-pg-ink sm:text-lg">
                <span className="font-bold text-[#32cd32]">Com base nas suas informações pessoais e objetivos, </span>
                <span className="font-bold">
                  criamos um plano 100% personalizado para você usar os ingredientes ideais para você.{" "}
                </span>
                <span className="font-normal">
                  Nossa abordagem estratégica foi feita para que você consiga potencializar sua perda de peso em 4
                  semanas, respeitando seu estilo de vida, sua rotina e o que você gosta de comer.
                </span>
              </p>
            </div>

            <div className="rounded-[22px] border border-[#dceee0] bg-[#f1f9f1] px-5 py-8 sm:px-9 sm:py-10">
              <p className="mb-7 text-center text-xl font-black tracking-wide text-[#1b852e] sm:mb-8 sm:text-2xl">
                SEU PLANO INCLUI
              </p>
              <ul className="m-0 list-none space-y-6 p-0 text-[#1a1a1a] sm:space-y-7">
                <li className="flex gap-3 sm:gap-4">
                  <PlanoIncluiCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#2d2d2d] sm:h-7 sm:w-7" />
                  <p className="text-left text-[15px] leading-[1.55] sm:text-base">
                    <span className="font-bold">Quais os ingredientes ideais para o seu corpo:</span>{" "}
                    Baseado nas pesquisas mais recentes de universidades famosas como Havard, desenvolvemos o
                    Protocolo{" "}
                    <span className="font-bold">Rotina da Gelatina Bariátrica</span>, a forma mais eficaz de usar os
                    melhores chás para perder peso de acordo com o seu corpo sem que você perca músculos ou sinta muita
                    fome.
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <PlanoIncluiCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#2d2d2d] sm:h-7 sm:w-7" />
                  <p className="text-left text-[15px] leading-[1.55] sm:text-base">
                    <span className="font-bold">Definição de metas diárias:</span> para você se manter no caminho certo
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <PlanoIncluiCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#2d2d2d] sm:h-7 sm:w-7" />
                  <p className="text-left text-[15px] leading-[1.55] sm:text-base">
                    <span className="font-bold">Planilha de acompanhamento:</span> Saiba exatamente quanto você está
                    evoluindo.
                  </p>
                </li>
                <li className="flex gap-3 sm:gap-4">
                  <PlanoIncluiCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#2d2d2d] sm:h-7 sm:w-7" />
                  <p className="text-left text-[15px] font-bold leading-[1.55] sm:text-base">+ 4 Bônus Exclusivos</p>
                </li>
              </ul>
            </div>

            <p className="text-center text-2xl font-black leading-tight text-pg-ink sm:text-3xl">
              Ao Garantir Sua Rotina da Gelatina Bariátrica, <span className="text-emerald-500">Você Recebe Todos os Bônus de Presente!</span>
            </p>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
              <Image
                src="/quiz/final-sales-bonus-banners.jpg"
                alt="Bônus: queima de gordura, desinchar em 7 dias, anti-efeito sanfona e metabolismo"
                width={681}
                height={1024}
                className="h-auto w-full object-contain object-top"
                sizes="(max-width: 430px) 100vw, 430px"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-pink-200/70 bg-white shadow-sm">
              <Image
                src="/quiz/gelatina-bariatrica-promo-banner.jpg"
                alt="Protocolo Gelatina Inteligente — o segredo para emagrecer com prazer"
                width={768}
                height={1024}
                className="h-auto w-full object-contain object-top"
                sizes="(max-width: 430px) 100vw, 430px"
              />
            </div>

            <div className="rounded-2xl border-2 border-emerald-600 bg-[#fffdf4] p-4 text-center">
              <p className="text-2xl font-black text-emerald-700 sm:text-3xl">GELATINA BARIÁTRICA</p>
              <p className="mt-2 text-base font-black text-pg-ink sm:text-lg">Preço atualizado no checkout</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-center text-sm text-pg-ink/75">
              Pagamento seguro no checkout oficial da Stripe.
            </div>

            <p className="text-center text-2xl font-black leading-tight text-pg-ink sm:text-3xl">
              Quem Usa <span className="text-emerald-500">Tem Resultado</span> 😉👇
            </p>

            <div className="mt-3 space-y-3 rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="relative overflow-hidden rounded-xl bg-neutral-100">
                <Image
                  key={RESULTADOS_CAROUSEL_SLIDES[resultadosCarouselIndex].src}
                  src={RESULTADOS_CAROUSEL_SLIDES[resultadosCarouselIndex].src}
                  alt={RESULTADOS_CAROUSEL_SLIDES[resultadosCarouselIndex].alt}
                  width={RESULTADOS_CAROUSEL_SLIDES[resultadosCarouselIndex].width}
                  height={RESULTADOS_CAROUSEL_SLIDES[resultadosCarouselIndex].height}
                  className="h-auto w-full object-contain object-top"
                  sizes="(max-width: 430px) 100vw, 430px"
                />
                <button
                  type="button"
                  aria-label="Foto anterior"
                  className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/95 text-xl font-black leading-none text-pg-ink shadow-md backdrop-blur-[2px] sm:left-2"
                  onClick={() =>
                    setResultadosCarouselIndex(
                      (i) => (i - 1 + RESULTADOS_CAROUSEL_SLIDES.length) % RESULTADOS_CAROUSEL_SLIDES.length,
                    )
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próxima foto"
                  className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/95 text-xl font-black leading-none text-pg-ink shadow-md backdrop-blur-[2px] sm:right-2"
                  onClick={() =>
                    setResultadosCarouselIndex((i) => (i + 1) % RESULTADOS_CAROUSEL_SLIDES.length)
                  }
                >
                  ›
                </button>
              </div>
              <div className="flex justify-center gap-2 pb-0.5">
                {RESULTADOS_CAROUSEL_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ver depoimento ${i + 1}`}
                    aria-current={i === resultadosCarouselIndex}
                    className={`h-2 rounded-full transition-all ${
                      i === resultadosCarouselIndex ? "w-6 bg-emerald-600" : "w-2 bg-neutral-300"
                    }`}
                    onClick={() => setResultadosCarouselIndex(i)}
                  />
                ))}
              </div>
            </div>

            <div className="mx-auto mt-5 flex w-full max-w-[300px] justify-center px-2">
              <Image
                src="/quiz/garantia-30d-selo.png"
                alt="Garantia 30 dias"
                width={500}
                height={500}
                className="h-auto w-full object-contain drop-shadow-[0_14px_28px_rgba(4,50,45,0.35)]"
                sizes="(max-width: 430px) 100vw, 300px"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-center shadow-sm">
              <p className="text-base leading-relaxed text-pg-ink sm:text-lg">
                A compra deste material é totalmente sem risco para si.
                <br />
                <br />
                Se não corresponder totalmente às suas expectativas nos primeiros 30 dias após a compra, devolvemos o
                valor integral que pagou, sem perguntas.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xl font-black text-pg-ink">Isabela Soares</p>
              <p className="text-sm text-pg-ink/70 sm:text-base">Lisboa</p>
              <p className="mt-2 text-base leading-relaxed text-pg-ink sm:text-lg">
                Literalmente fiquei sem palavras! Vejam isto! Foram dois meses e meio a seguir o plano à risca — é
                incrível, não estava nada à espera, estou estupefacta! 😱😅
              </p>
              <p className="mt-2 text-2xl text-yellow-400">★★★★★</p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xl font-black text-pg-ink">Bruna Gonçalves</p>
              <p className="text-sm text-pg-ink/70 sm:text-base">Porto</p>
              <p className="mt-2 text-base leading-relaxed text-pg-ink sm:text-lg">
                Só eu sei o quanto sofri a tentar emagrecer. Isto foi diferente de tudo o que já tinha experimentado:
                jurava que era treta, mas eis o resultado. Aposto que em breve as canetas baixam de preço — ninguém vai
                querer andar sempre a picar-se — isto é mesmo do outro mundo. 🤯💃
              </p>
              <p className="mt-2 text-2xl text-yellow-400">★★★★★</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
              <Image
                src="/quiz/depoimento-antes-depois.jpg"
                alt="Transformação de uma cliente — antes e depois"
                width={1024}
                height={819}
                className="h-auto w-full rounded-xl object-contain"
                sizes="(max-width: 430px) 100vw, 430px"
              />
            </div>

            <div className="relative w-full rounded-full bg-gradient-to-br from-pink-300 via-rose-400 to-pink-600 p-[1.5px] shadow-[0_16px_48px_-14px_rgba(219,39,119,0.38),0_8px_24px_-8px_rgba(15,23,42,0.12)]">
              <div
                className="relative flex w-full items-center gap-3 rounded-full bg-white/98 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),inset_0_0_0_1px_rgba(255,255,255,0.5)] backdrop-blur-md sm:gap-5 sm:px-6 sm:py-[0.95rem]"
                role="group"
                aria-label="Protocolo Gelatina Inteligente, 6,99 euros"
              >
                <span className="relative shrink-0 drop-shadow-[0_4px_10px_rgba(219,39,119,0.28)]" aria-hidden>
                  <Image
                    src="/quiz/gelatina-premium-icon-v3.png"
                    alt=""
                    width={84}
                    height={82}
                    sizes="48px"
                    className="h-11 w-auto object-contain object-center sm:h-[3.35rem]"
                    style={{ width: "auto" }}
                  />
                </span>
                <p className="min-w-0 flex-1 text-center text-[13px] font-bold leading-snug tracking-[0.04em] text-neutral-900 antialiased sm:text-[15px] sm:tracking-[0.055em]">
                  Protocolo Gelatina Inteligente
                </p>
                <span className="shrink-0 rounded-full bg-gradient-to-b from-pink-50 via-pink-100/95 to-pink-100 px-3 py-1.5 text-base font-bold tabular-nums tracking-tight text-pink-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_8px_-2px_rgba(219,39,119,0.2)] ring-1 ring-pink-200/70 sm:px-3.5 sm:py-2 sm:text-lg">
                  6,99€
                </span>
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
