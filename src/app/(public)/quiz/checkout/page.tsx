"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Elements,
  LinkAuthenticationElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { getTrackingContext, initTrackingContext, track } from "@/lib/tracking";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type CreateIntentResponse = {
  clientSecret?: string;
  error?: string;
};

type FunnelStepId =
  | "front"
  | "upsell1"
  | "upsell1_down1"
  | "upsell1_down2"
  | "upsell2"
  | "upsell2_down1"
  | "upsell2_down2";

type StripePlanId = "FRONT" | "UPSELL_1" | "DS1_UP1" | "DS2_UP1" | "UPSELL_2" | "DS1_UP2" | "DS2_UP2";

const FUNNEL_STEPS: Array<{ id: FunnelStepId; dashboardStepId: string; label: string; description: string }> = [
  { id: "front", dashboardStepId: "checkout-front", label: "Oferta Principal", description: "Checkout do plano principal" },
  { id: "upsell1", dashboardStepId: "checkout-upsell-1", label: "Upsell 1", description: "Primeira oferta de aumento de ticket" },
  { id: "upsell1_down1", dashboardStepId: "checkout-downsell-1-1", label: "Downsell 1.1", description: "Fallback do Upsell 1" },
  { id: "upsell1_down2", dashboardStepId: "checkout-downsell-1-2", label: "Downsell 1.2", description: "Segunda alternativa ao Upsell 1" },
  { id: "upsell2", dashboardStepId: "checkout-upsell-2", label: "Upsell 2", description: "Segunda oferta de aumento de ticket" },
  { id: "upsell2_down1", dashboardStepId: "checkout-downsell-2-1", label: "Downsell 2.1", description: "Fallback do Upsell 2" },
  { id: "upsell2_down2", dashboardStepId: "checkout-downsell-2-2", label: "Downsell 2.2", description: "Segunda alternativa ao Upsell 2" },
];

const STEP_INDEX_BY_ID: Record<FunnelStepId, number> = {
  front: 0,
  upsell1: 1,
  upsell1_down1: 2,
  upsell1_down2: 3,
  upsell2: 4,
  upsell2_down1: 5,
  upsell2_down2: 6,
};

const STEP_TRANSITIONS: Record<FunnelStepId, { accept: FunnelStepId | null; reject: FunnelStepId | null }> = {
  front: { accept: "upsell1", reject: null },
  upsell1: { accept: "upsell2", reject: "upsell1_down1" },
  upsell1_down1: { accept: "upsell2", reject: "upsell1_down2" },
  upsell1_down2: { accept: "upsell2", reject: "upsell2" },
  upsell2: { accept: null, reject: "upsell2_down1" },
  upsell2_down1: { accept: null, reject: "upsell2_down2" },
  upsell2_down2: { accept: null, reject: null },
};

const STEP_TO_STRIPE_PLAN: Partial<Record<FunnelStepId, StripePlanId>> = {
  front: "FRONT",
  upsell1: "UPSELL_1",
  upsell1_down1: "DS1_UP1",
  upsell1_down2: "DS2_UP1",
  upsell2: "UPSELL_2",
  upsell2_down1: "DS1_UP2",
  upsell2_down2: "DS2_UP2",
};

function PaymentForm({
  onError,
  onSuccess,
  onEmailCaptured,
}: {
  onError: (msg: string) => void;
  onSuccess: () => void;
  onEmailCaptured: (email: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || isPaying) return;
    setIsPaying(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/quiz/checkout?front=success`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      onError(result.error.message ?? "Falha ao confirmar pagamento.");
      setIsPaying(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <LinkAuthenticationElement
        onChange={(event: { value?: { email?: string } }) => {
          const email = event.value?.email?.trim().toLowerCase();
          if (!email) return;
          onEmailCaptured(email);
        }}
      />
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isPaying}
        className="h-12 w-full rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-60"
      >
        {isPaying ? "A processar..." : "Pagar e iniciar avaliacao"}
      </button>
    </form>
  );
}

export default function QuizEmbeddedCheckoutPage() {
  const router = useRouter();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<"1w" | "4w" | "12w">("1w");
  const [stepIndex, setStepIndex] = useState(0);
  const [hasPaidFront, setHasPaidFront] = useState(false);
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [upsellFakeSeconds, setUpsellFakeSeconds] = useState(9 * 60 + 57);
  const [isChargingOffer, setIsChargingOffer] = useState(false);
  const decisionLockRef = useRef(false);
  const clientSecretOfferRef = useRef<"1w" | "4w" | "12w">("1w");

  const elementsOptions = useMemo<StripeElementsOptions | undefined>(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe",
            },
          }
        : undefined,
    [clientSecret],
  );

  const prepareCheckout = useCallback(async () => {
    if (isPreparing) return;
    setCheckoutError(null);
    setIsPreparing(true);
    try {
      const tracking = getTrackingContext();
      const response = await fetch("/api/stripe/elements-guest-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "FRONT",
          offer: selectedOffer,
          tracking: {
            session_id: tracking.sessionId,
            visitor_id: tracking.visitorId,
            anonymous_id: tracking.anonymousId,
            funnel_id: "quiz_gelatina",
            step_id: "checkout-front",
            utm_source: tracking.utm_source,
            utm_medium: tracking.utm_medium,
            utm_campaign: tracking.utm_campaign,
            utm_content: tracking.utm_content,
            utm_term: tracking.utm_term,
            fbclid: tracking.fbclid,
            gclid: tracking.gclid,
            ttclid: tracking.ttclid,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as CreateIntentResponse;
      if (!response.ok || !data.clientSecret) {
        setCheckoutError(data.error ?? "Nao foi possivel preparar o pagamento.");
        return;
      }
      setClientSecret(data.clientSecret);
      clientSecretOfferRef.current = selectedOffer;
    } catch {
      setCheckoutError("Falha ao preparar pagamento.");
    } finally {
      setIsPreparing(false);
    }
  }, [isPreparing, selectedOffer]);

  useEffect(() => {
    const cached = sessionStorage.getItem("quiz_checkout_client_secret");
    if (cached) {
      setClientSecret(cached);
      clientSecretOfferRef.current = "1w";
      sessionStorage.removeItem("quiz_checkout_client_secret");
    }
    const paid = sessionStorage.getItem("quiz_front_paid") === "1";
    if (paid) setHasPaidFront(true);
    const email = sessionStorage.getItem("quiz_checkout_email");
    if (email) setPurchaseEmail(email);
  }, []);

  useEffect(() => {
    if (stepIndex !== 0 || isPreparing) return;
    if (!clientSecret || clientSecretOfferRef.current !== selectedOffer) {
      void prepareCheckout();
    }
  }, [clientSecret, isPreparing, prepareCheckout, selectedOffer, stepIndex]);

  useEffect(() => {
    const fakeTimer = window.setInterval(() => {
      setUpsellFakeSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(fakeTimer);
  }, []);

  const upsellMinutes = Math.floor(upsellFakeSeconds / 60);
  const upsellSeconds = upsellFakeSeconds % 60;
  const currentStep = FUNNEL_STEPS[stepIndex];
  const isFrontStep = currentStep.id === "front";
  const isUpsell1Step = currentStep.id === "upsell1";
  const isDownsell1Step = currentStep.id === "upsell1_down1";
  const isDownsell2Step = currentStep.id === "upsell1_down2";
  const isUpsell2Step = currentStep.id === "upsell2";
  const isDownsell21Step = currentStep.id === "upsell2_down1";
  const isDownsell22Step = currentStep.id === "upsell2_down2";
  const isCustomOfferStep =
    isUpsell1Step ||
    isDownsell1Step ||
    isDownsell2Step ||
    isUpsell2Step ||
    isDownsell21Step ||
    isDownsell22Step;
  const currentTransition = STEP_TRANSITIONS[currentStep.id];

  function goPrevStep() {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  function goNextStep() {
    setStepIndex((prev) => Math.min(FUNNEL_STEPS.length - 1, prev + 1));
  }

  function goToThankYou(reason: string) {
    if (!hasPaidFront) {
      window.location.assign("/quiz");
      return;
    }
    const query = new URLSearchParams({
      from: currentStep.id,
      decision: reason,
      paid: "1",
    });
    if (purchaseEmail) query.set("email", purchaseEmail);
    window.location.assign(`/quiz/obrigado?${query.toString()}`);
  }

  function resolveStepIndexById(stepId: FunnelStepId) {
    return STEP_INDEX_BY_ID[stepId];
  }

  async function chargeOfferOneClick(currentStepId: FunnelStepId, currentDashboardStepId: string) {
    const plan = STEP_TO_STRIPE_PLAN[currentStepId];
    if (!plan || currentStepId === "front") return false;
    if (!purchaseEmail) {
      setCheckoutError("Nao conseguimos identificar o email da compra para cobrar esta oferta.");
      return false;
    }
    const tracking = getTrackingContext();
    const response = await fetch("/api/stripe/offer-charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        email: purchaseEmail,
        tracking: {
          session_id: tracking.sessionId,
          visitor_id: tracking.visitorId,
          anonymous_id: tracking.anonymousId,
          funnel_id: "quiz_gelatina",
          step_id: currentDashboardStepId,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          ttclid: tracking.ttclid,
        },
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setCheckoutError(data.error ?? "Nao foi possivel cobrar esta oferta automaticamente.");
      return false;
    }
    return true;
  }

  async function handleDecision(accepted: boolean) {
    if (decisionLockRef.current || isChargingOffer) return;
    decisionLockRef.current = true;
    try {
      const nextStepId = accepted ? currentTransition.accept : currentTransition.reject;
      if (!isFrontStep) {
        const decisionEvent = accepted
          ? currentStep.id.includes("downsell")
            ? "downsell_accepted"
            : "upsell_accepted"
          : currentStep.id.includes("downsell")
            ? "downsell_rejected"
            : "upsell_rejected";

        void track({
          event_name: decisionEvent,
          funnel_id: "quiz_gelatina",
          step_id: currentStep.dashboardStepId,
          page_type: "checkout",
          metadata_json: {
            checkout_stage: currentStep.id,
            checkout_step: stepIndex + 1,
            decision: accepted ? "accepted" : "rejected",
          },
        });
      }

      if (!isFrontStep && accepted) {
        try {
          setIsChargingOffer(true);
          const charged = await chargeOfferOneClick(currentStep.id, currentStep.dashboardStepId);
          if (!charged) return;
          setCheckoutError(null);
        } finally {
          setIsChargingOffer(false);
        }
      }

      if (!nextStepId) {
        goToThankYou(accepted ? "accepted" : "rejected");
        return;
      }
      setStepIndex(resolveStepIndexById(nextStepId));
    } finally {
      decisionLockRef.current = false;
    }
  }

  const legalCopyByOffer: Record<"1w" | "4w" | "12w", string> = {
    "1w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 6.99 para o teste de 7 dias. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 33.30 todos os meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
    "4w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 12.99. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 33.30 todos os meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
    "12w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 22.49. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 33.30 todos os meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
  };

  useEffect(() => {
    initTrackingContext();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const frontPaid = params.get("front") === "success";
    if (frontPaid && stepIndex === 0) {
      setHasPaidFront(true);
      sessionStorage.setItem("quiz_front_paid", "1");
      void track({
        event_name: "upsell_viewed",
        funnel_id: "quiz_gelatina",
        step_id: FUNNEL_STEPS[1].dashboardStepId,
        page_type: "checkout",
        metadata_json: { checkout_stage: "upsell1", source: "front_payment_success" },
      });
      setStepIndex(1);
      router.replace("/quiz/checkout");
      return;
    }

  }, [router, stepIndex]);

  useEffect(() => {
    const firstStep = FUNNEL_STEPS[0];
    void track({
      event_name: "checkout_started",
      funnel_id: "quiz_gelatina",
      step_id: firstStep.dashboardStepId,
      page_type: "checkout",
      metadata_json: { checkout_stage: firstStep.id, checkout_step: 1 },
    });
  }, []);

  useEffect(() => {
    void track({
      event_name: "step_viewed",
      funnel_id: "quiz_gelatina",
      step_id: currentStep.dashboardStepId,
      page_type: "checkout",
      metadata_json: { checkout_stage: currentStep.id, checkout_step: stepIndex + 1 },
    });
  }, [currentStep.dashboardStepId, currentStep.id, stepIndex]);

  useEffect(() => {
    if (isFrontStep) return;
    void track({
      event_name: currentStep.id.includes("downsell") ? "downsell_viewed" : "upsell_viewed",
      funnel_id: "quiz_gelatina",
      step_id: currentStep.dashboardStepId,
      page_type: "checkout",
      metadata_json: { checkout_stage: currentStep.id, checkout_step: stepIndex + 1 },
    });
  }, [currentStep.dashboardStepId, currentStep.id, isFrontStep, stepIndex]);

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#fff_0%,#fff7fb_56%,#ffffff_100%)] px-4 pb-12 pt-6 sm:px-6">
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Etapa do funil
              </p>
              <p className="text-lg font-black text-neutral-900">
                {stepIndex + 1}/{FUNNEL_STEPS.length} · {currentStep.label}
              </p>
              <p className="text-xs text-neutral-600">{currentStep.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goPrevStep}
                disabled={stepIndex === 0}
                className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={goNextStep}
                disabled={stepIndex === FUNNEL_STEPS.length - 1}
                className="h-10 rounded-lg border border-neutral-900 bg-neutral-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Proximo
              </button>
            </div>
          </div>
        </div>

        {checkoutError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {checkoutError}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
            {isUpsell1Step ? (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-[#0f0f12] text-white shadow-sm">
                <div className="border-b border-amber-300/30 bg-[#17171c] px-4 py-2 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-300">
                    Oferta exclusiva pos-compra - nao aparecera novamente
                  </p>
                </div>
                <div className="space-y-4 px-4 py-5 sm:px-5">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-neutral-300">
                    PARABENS PELA COMPRA DO PROTOCOLO GELATINA INTELIGENTE! MAS...
                  </p>
                  <p className="text-center text-2xl font-black leading-tight sm:text-3xl">
                    Voce quer <span className="text-emerald-400">dobrar os seus resultados</span> por apenas{" "}
                    <span className="text-emerald-400">EUR 6,99</span>?
                  </p>
                  <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-center text-sm font-semibold text-amber-200">
                    Esta oferta expira nesta pagina e nao volta a aparecer.
                  </div>
                  <div className="rounded-xl border border-amber-300/30 bg-black/40 px-3 py-3">
                    <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.08em] text-amber-300">
                      ⏰ Esta oferta expira em:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="min-w-24 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-4xl font-black leading-none text-amber-300">
                          {String(upsellMinutes).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="pb-1 text-3xl font-black text-amber-300">:</span>
                      <div className="min-w-24 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-4xl font-black leading-none text-amber-300">
                          {String(upsellSeconds).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="px-2 text-center text-lg font-semibold leading-relaxed text-neutral-200 sm:text-xl">
                    Ao clicar em "SIM", o Protocolo do Ch&#225; Bari&#225;trico ser&#225; adicionado ao seu pedido atual
                    por apenas <span className="font-black text-amber-300">EUR 6,99</span>.
                  </p>
                  <ul className="space-y-2 text-sm text-neutral-100">
                    <li>✅ Acelera o metabolismo em ate 3x</li>
                    <li>✅ Ajuda a reduzir retencao e inchaco nos primeiros dias</li>
                    <li>✅ Potencializa o efeito do Protocolo do Cha Bariatrico</li>
                    <li>✅ Resultados visiveis mais cedo no espelho e na balanca</li>
                  </ul>
                  <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-left">
                    <p className="text-lg leading-relaxed text-neutral-100">
                      Vou ser <span className="font-black">honesto contigo</span>...
                    </p>
                    <p className="mt-3 text-lg leading-relaxed text-neutral-100">
                      O <span className="font-black">Protocolo do Cha Bariatrico funciona</span>. Mas, sozinho,
                      pode atuar ao teu ritmo natural.{" "}
                      <span className="font-black text-amber-300">
                        Isso pode demorar semanas, ou at&#233; meses,
                      </span>{" "}
                      at&#233; veres resultados realmente vis&#237;veis no espelho.
                    </p>
                    <p className="mt-3 text-lg leading-relaxed text-neutral-100">
                      Entretanto, cresce a frustra&#231;&#227;o. Olhas para ti todos os dias e pensas:
                      <span className="italic"> "ser&#225; que est&#225; mesmo a resultar?"</span>
                    </p>
                    <p className="mt-4 text-2xl font-black leading-tight text-red-500">
                      E depois desistes. Como noutras vezes.
                    </p>
                  </div>
                  <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-neutral-300">
                      QUEM COMBINOU, NAO VOLTOU ATRAS
                    </p>
                    <p className="text-xl italic leading-relaxed text-neutral-100">
                      "Eu j&#225; estava a usar o protocolo, mas quando adicionei o ch&#225;, perdi 4kg logo na
                      primeira semana. Nunca tinha visto nada assim."
                    </p>
                    <p className="text-sm font-semibold text-neutral-400">- Maria S., 43 anos</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-center">
                    <p className="text-lg text-neutral-200">
                      O Ch&#225; Bari&#225;trico &#233; normalmente vendido por{" "}
                      <span className="font-black text-red-400 line-through">EUR 13,90</span>
                    </p>
                    <p className="mt-3 text-2xl font-black leading-tight text-neutral-100">
                      Mas como acabaste de comprar, tenho um pre&#231;o que{" "}
                      <span className="text-amber-300">n&#227;o volta a aparecer</span>:
                    </p>
                    <p className="mt-3 text-6xl font-black leading-none text-emerald-400">EUR 6,99</p>
                    <p className="mt-2 text-sm text-neutral-400">
                      Fica mais barato do que um caf&#233; por dia. A s&#233;rio.
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM! QUERO ACELERAR AGORA OS RESULTADOS
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">
                      🔒 Compra segura · Satisfação garantida
                    </p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 6,99 e
                      renovação de EUR 33,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não... prefiro continuar tendo resultados mais lentos
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-300/35 bg-[#101114] px-4 py-4">
                    <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.08em] text-amber-400">
                      ⏰ Esta oferta expira em:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="min-w-20 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-3xl font-black leading-none text-amber-300">
                          {String(upsellMinutes).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="pb-1 text-3xl font-black text-amber-300">:</span>
                      <div className="min-w-20 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-3xl font-black leading-none text-amber-300">
                          {String(upsellSeconds).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-base font-semibold leading-relaxed text-neutral-200">
                      Ao clicar em "SIM", o Protocolo do Ch&#225; Bari&#225;trico ser&#225; adicionado ao seu pedido atual por
                      apenas <span className="font-black text-amber-300">EUR 6,99</span>.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isDownsell1Step ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="space-y-5 px-4 py-5 text-center sm:px-5 sm:py-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-600">⚠️ Espera!</p>
                  <p className="text-3xl font-black leading-tight text-neutral-900 sm:text-4xl">Não precisa ser assim...</p>
                  <div className="space-y-3 text-left text-[17px] leading-relaxed text-neutral-700 sm:text-lg">
                    <p>Eu entendo... talvez não queiras investir mais agora.</p>
                    <p>
                      Mas sair daqui <span className="font-black text-neutral-900">sem nenhuma estratégia para acelerar</span>{" "}
                      seu resultado pode ser o verdadeiro erro...
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left sm:px-5 sm:py-5">
                    <p className="text-3xl font-black leading-tight text-neutral-900 sm:text-4xl">
                      A Gelatina Inteligente funciona. <br />
                      Mas...
                    </p>
                    <p className="mt-3 text-xl leading-relaxed text-neutral-700 sm:text-2xl">
                      Sem um <span className="font-black text-neutral-900">acelerador natural</span>, os seus resultados
                      podem demorar <span className="font-black text-neutral-900">semanas a mais</span> do que precisavam.
                    </p>
                    <p className="mt-3 text-xl leading-relaxed text-neutral-700 sm:text-2xl">
                      É como ter um carro potente... mas andar na primeira marcha.
                    </p>
                  </div>

                  <p className="text-2xl font-black leading-tight text-neutral-900 sm:text-[2rem]">
                    Por isso criei uma versão <span className="text-emerald-600">mais acessível</span> para ti:
                  </p>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left sm:px-5 sm:py-5">
                    <p className="text-[1.75rem] font-black leading-tight text-neutral-900 sm:text-4xl">Protocolo do Chá Bariátrico</p>
                    <p className="text-sm font-semibold uppercase tracking-[0.04em] text-neutral-500">
                      Versão simplificada · Fórmula essencial
                    </p>
                    <ul className="mt-3 space-y-2 text-base leading-relaxed text-neutral-700">
                      <li>✅ Receita prática e rápida de preparar</li>
                      <li>✅ Ingredientes acessíveis do supermercado</li>
                      <li>✅ Ação termogênica e desinchaço diário</li>
                      <li>✅ Controle natural da fome</li>
                      <li>✅ Complemento ideal ao Protocolo Gelatina Inteligente</li>
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-2xl font-black leading-tight text-neutral-900 sm:text-3xl">Em poucos dias vais sentir:</p>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      🔥 Menos inchaço abdominal
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      🍽️ Menos fome fora de hora
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      ⚡ Mais disposição e energia
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      📉 Resultados mais rápidos na balança
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-5">
                    <p className="text-sm text-neutral-500">Valor original:</p>
                    <p className="text-3xl font-black leading-none text-red-500 line-through sm:text-4xl">EUR 9,90</p>
                    <p className="text-sm font-semibold text-emerald-600">Oferta especial só nesta página:</p>
                    <p className="text-5xl font-black leading-none text-emerald-500 sm:text-6xl">EUR 2,99</p>
                    <p className="text-xs text-neutral-500">Pagamento único · acesso imediato</p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM! QUERO ESSA VERSÃO MAIS ACESSÍVEL
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">
                      🔒 Compra 100% segura · Satisfação garantida
                    </p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 2,99 e
                      renovação de EUR 33,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não, vou continuar apenas com o protocolo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isDownsell2Step ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="space-y-5 px-4 py-5 text-center sm:px-5 sm:py-6">
                  <div className="rounded-xl border border-red-200 bg-red-400/80 px-3 py-2">
                    <p className="text-sm font-black uppercase tracking-[0.06em] text-white">
                      ⚠️ Esta oferta não vai aparecer novamente
                    </p>
                  </div>

                  <p className="text-3xl font-black uppercase leading-tight text-neutral-900 sm:text-4xl">
                    ÚLTIMA CHANCE
                    <br />
                    <span className="text-red-500">ANTES DE SAIR</span>
                  </p>

                  <div className="mx-auto h-1 w-20 rounded-full bg-emerald-500" />

                  <div className="space-y-3 text-left text-[17px] leading-relaxed text-neutral-700 sm:text-lg">
                    <p className="text-center font-semibold text-neutral-900">Vou ser direto contigo...</p>
                    <p>
                      Sem algo que <span className="font-black text-neutral-900">acelere o seu metabolismo</span>, o
                      resultado com a Gelatina Inteligente pode ser{" "}
                      <span className="font-black text-red-500">muito mais lento</span>.
                    </p>
                    <p>
                      Então aqui vai a <span className="font-black text-neutral-900">última oportunidade</span> que posso
                      te oferecer:
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left sm:px-5 sm:py-5">
                    <p className="text-center text-sm font-black uppercase tracking-[0.06em] text-neutral-500">
                      Versão básica
                    </p>
                    <p className="mt-1 text-center text-4xl font-black leading-tight text-neutral-900">
                      Protocolo do Chá Bariátrico
                    </p>
                    <ul className="mt-4 space-y-2 text-base leading-relaxed text-neutral-700">
                      <li>⚡ Acelera a queima de gordura</li>
                      <li>🕒 Resultados mais rápidos com a Gelatina Inteligente</li>
                      <li>🛡️ 100% natural e seguro</li>
                    </ul>

                    <div className="mt-5 space-y-1 text-center">
                      <p className="text-xl font-bold text-neutral-400 line-through">EUR 4,90</p>
                      <p className="text-2xl font-semibold text-neutral-800">Por apenas</p>
                      <p className="text-6xl font-black leading-none text-emerald-500">EUR 1,99</p>
                      <p className="text-xs text-neutral-500">Pagamento único · Sem assinatura</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM, QUERO APROVEITAR POR EUR 1,99
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">
                      🔒 Compra segura · Satisfação garantida
                    </p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 1,99 e
                      renovação de EUR 33,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não, quero seguir sem isso mesmo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isUpsell2Step ? (
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-[#0f0f12] text-white shadow-sm">
                <div className="border-b border-amber-300/30 bg-[#17171c] px-4 py-2 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-300">
                    Oferta exclusiva pós-compra — não aparecerá novamente
                  </p>
                </div>
                <div className="space-y-4 px-4 py-5 sm:px-5">
                  <p className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-neutral-300">
                    Protocolo Anti-Platô Metabólico
                  </p>
                  <p className="text-center text-3xl font-black leading-tight sm:text-4xl">
                    ⚠️ Antes de continuares...
                  </p>
                  <p className="text-center text-xl font-semibold leading-tight text-amber-200 sm:text-2xl">
                    O teu corpo pode travar os resultados nas próximas semanas.
                  </p>

                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-left text-[17px] leading-relaxed text-neutral-100 sm:text-lg">
                    <p className="font-semibold">Vou ser direto contigo...</p>
                    <p>
                      Mesmo quando o Protocolo Gelatina Inteligente começa a funcionar, existe uma fase em que o corpo
                      se adapta.
                    </p>
                    <p>E quando isso acontece, o peso pode simplesmente parar.</p>
                    <p>
                      A balança deixa de mexer.
                      <br />
                      O espelho parece igual.
                      <br />E começas a pensar: "será que isto deixou de resultar?"
                    </p>
                    <p>Mas o problema não é falta de esforço.</p>
                    <p>É o corpo a entrar em modo de defesa.</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-left">
                    <p className="text-2xl font-black leading-tight text-red-400 sm:text-3xl">É aqui que muitas pessoas desistem.</p>
                    <p className="mt-3 text-[17px] leading-relaxed text-neutral-100 sm:text-lg">
                      Não porque o protocolo não funciona.
                      <br />
                      Mas porque não sabem o que fazer quando o peso trava.
                    </p>
                    <p className="mt-3 text-xl font-black text-neutral-100 sm:text-2xl">Por isso criámos o:</p>
                    <p className="mt-1 text-3xl font-black text-emerald-400 sm:text-4xl">Protocolo Anti-Platô Metabólico</p>
                    <ul className="mt-4 space-y-2 text-base leading-relaxed text-neutral-100 sm:text-[17px]">
                      <li>✅ Ajuda a evitar que o corpo se adapte demasiado rápido</li>
                      <li>✅ Reativa o metabolismo quando o peso começa a travar</li>
                      <li>✅ Dá-te ajustes simples para continuares a ver progresso</li>
                      <li>✅ Ajuda a manter a motivação quando a balança abranda</li>
                      <li>✅ Complemento ideal ao Protocolo Gelatina Inteligente</li>
                    </ul>
                  </div>

                  <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-neutral-300">
                      QUEM SE PREPAROU, NÃO FICOU PRESO NO MESMO PESO
                    </p>
                    <p className="text-lg italic leading-relaxed text-neutral-100 sm:text-xl">
                      "Na segunda semana o meu peso começou a parar e eu achei que ia desistir outra vez. Usei o
                      Anti-Platô e em poucos dias voltei a ver a balança mexer."
                    </p>
                    <p className="text-sm font-semibold text-neutral-400">- Ana R., 46 anos</p>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-center">
                    <p className="text-base text-neutral-200">
                      O Protocolo Anti-Platô Metabólico é normalmente vendido por{" "}
                      <span className="font-black text-red-400 line-through">EUR 19,90</span>
                    </p>
                    <p className="text-xl font-black leading-tight text-neutral-100 sm:text-2xl">
                      Mas como acabaste de comprar, podes adicionar agora por apenas:
                    </p>
                    <p className="text-6xl font-black leading-none text-emerald-400">EUR 4,99</p>
                    <p className="text-xs text-neutral-400">Pagamento único · Acesso imediato</p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM! QUERO EVITAR QUE O MEU PESO TRAVE
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">🔒 Compra segura · Satisfação garantida</p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 4,99 e
                      renovação de EUR 15,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não... prefiro arriscar ficar sem estratégia quando o peso travar
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-300/35 bg-[#101114] px-4 py-4">
                    <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.08em] text-amber-400">
                      ⏰ Esta oferta expira em:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="min-w-20 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-3xl font-black leading-none text-amber-300">
                          {String(upsellMinutes).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="pb-1 text-3xl font-black text-amber-300">:</span>
                      <div className="min-w-20 rounded-2xl bg-[#202126] px-4 py-2 text-center">
                        <span className="text-3xl font-black leading-none text-amber-300">
                          {String(upsellSeconds).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-base font-semibold leading-relaxed text-neutral-200">
                      Ao clicar em "SIM", o Protocolo Anti-Platô Metabólico será adicionado ao teu pedido atual por
                      apenas <span className="font-black text-amber-300">EUR 4,99</span>.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isDownsell21Step ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="space-y-5 px-4 py-5 text-center sm:px-5 sm:py-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-600">⚠️ Espera!</p>
                  <p className="text-3xl font-black leading-tight text-neutral-900 sm:text-4xl">
                    Não precisas sair daqui sem esta proteção.
                  </p>

                  <div className="space-y-3 text-left text-[17px] leading-relaxed text-neutral-700 sm:text-lg">
                    <p>Eu entendo...</p>
                    <p>Talvez não queiras investir mais agora.</p>
                    <p>
                      Mas sair daqui sem nenhuma estratégia para quando o peso travar pode custar-te semanas de
                      progresso.
                    </p>
                    <p>O Protocolo da Gelatina Inteligente pode funcionar muito bem.</p>
                    <p>Mas, quando o corpo se adapta, os resultados podem abrandar.</p>
                    <p>E nessa fase, a maioria das pessoas pensa que falhou.</p>
                    <p>Quando, na verdade, só precisava de um ajuste certo.</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left sm:px-5 sm:py-5">
                    <p className="text-[1.75rem] font-black leading-tight text-neutral-900 sm:text-4xl">
                      Protocolo Anti-Platô Metabólico
                    </p>
                    <p className="text-sm font-semibold uppercase tracking-[0.04em] text-neutral-500">
                      A mesma solução · Preço especial nesta página
                    </p>
                    <ul className="mt-3 space-y-2 text-base leading-relaxed text-neutral-700">
                      <li>✅ Estratégias para quando o peso trava</li>
                      <li>✅ Ajustes simples ao protocolo base</li>
                      <li>✅ Ajuda a reativar o metabolismo</li>
                      <li>✅ Mantém o progresso mesmo quando a balança abranda</li>
                      <li>✅ Ideal para não desistires a meio</li>
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-2xl font-black leading-tight text-neutral-900 sm:text-3xl">
                      Em poucos dias podes sentir:
                    </p>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      🔥 Menos frustração com a balança
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      ⚡ Mais confiança para continuar
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      📉 Progresso novamente visível
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-left text-xl font-semibold text-neutral-900 sm:text-2xl">
                      🧠 Clareza sobre o que fazer quando o corpo trava
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-5">
                    <p className="text-sm text-neutral-500">Valor original:</p>
                    <p className="text-3xl font-black leading-none text-red-500 line-through sm:text-4xl">EUR 19,90</p>
                    <p className="text-sm font-semibold text-emerald-600">Oferta especial só nesta página:</p>
                    <p className="text-5xl font-black leading-none text-emerald-500 sm:text-6xl">EUR 2,49</p>
                    <p className="text-xs text-neutral-500">Pagamento único · Acesso imediato</p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM! QUERO FICAR PREPARADO POR EUR 2,49
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">
                      🔒 Compra 100% segura · Satisfação garantida
                    </p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 2,49 e
                      renovação de EUR 15,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não, vou arriscar continuar sem isto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isDownsell22Step ? (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="space-y-5 px-4 py-5 text-center sm:px-5 sm:py-6">
                  <div className="rounded-xl border border-red-200 bg-red-400/80 px-3 py-2">
                    <p className="text-sm font-black uppercase tracking-[0.06em] text-white">
                      ⚠️ Esta oferta não vai aparecer novamente
                    </p>
                  </div>

                  <p className="text-3xl font-black uppercase leading-tight text-neutral-900 sm:text-4xl">
                    ÚLTIMA CHANCE
                    <br />
                    <span className="text-red-500">ANTES DE SAIR</span>
                  </p>

                  <div className="space-y-3 text-left text-[17px] leading-relaxed text-neutral-700 sm:text-lg">
                    <p className="text-center font-semibold text-neutral-900">Vou ser direto contigo...</p>
                    <p>
                      Se o teu peso travar nas próximas semanas e não souberes o que ajustar, podes acabar por perder
                      motivação.
                    </p>
                    <p>E é exatamente aí que muitas pessoas desistem.</p>
                    <p>
                      Então aqui vai a <span className="font-black text-neutral-900">última oportunidade</span> que posso
                      oferecer:
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left sm:px-5 sm:py-5">
                    <p className="text-center text-sm font-black uppercase tracking-[0.06em] text-neutral-500">
                      Versão completa
                    </p>
                    <p className="mt-1 text-center text-4xl font-black leading-tight text-neutral-900">
                      Protocolo Anti-Platô Metabólico
                    </p>
                    <ul className="mt-4 space-y-2 text-base leading-relaxed text-neutral-700">
                      <li>⚡ Ajuda a desbloquear o peso quando a balança trava</li>
                      <li>🧠 Dá-te ajustes simples para continuares</li>
                      <li>🔥 Ajuda a reativar o metabolismo</li>
                      <li>🛡️ Estratégia natural e segura</li>
                    </ul>

                    <div className="mt-5 space-y-1 text-center">
                      <p className="text-xl font-bold text-neutral-400 line-through">EUR 19,90</p>
                      <p className="text-2xl font-semibold text-neutral-800">Por apenas</p>
                      <p className="text-6xl font-black leading-none text-emerald-500">EUR 1,49</p>
                      <p className="text-xs text-neutral-500">Pagamento único · Sem assinatura</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM, QUERO APROVEITAR POR EUR 1,49
                    </button>
                    <p className="mt-3 text-center text-sm font-semibold text-neutral-500">🔒 Compra segura · Satisfação garantida</p>
                    <p className="mt-2 text-center text-[11px] leading-tight text-neutral-500">
                      Ao continuar, estás a aderir a pagamentos automáticos com entrada promocional de EUR 1,49 e
                      renovação de EUR 15,30 por mês até cancelamento.
                    </p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não, quero seguir sem isto mesmo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isCustomOfferStep ? null : (
              <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                  Evolucao esperada com o protocolo
                </p>
                <div className="overflow-hidden rounded-2xl border border-neutral-200">
                  <div className="grid grid-cols-2 bg-neutral-50 text-center text-emerald-600">
                    <div className="border-r border-neutral-200 py-2 text-lg font-black">Agora</div>
                    <div className="py-2 text-lg font-black">Meta</div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="border-r border-neutral-200 p-3">
                      <Image
                        src="/quiz/antes-real-v1.png"
                        alt="Antes do protocolo"
                        width={1344}
                        height={768}
                        className="h-40 w-full rounded-xl object-cover object-top"
                      />
                    </div>
                    <div className="p-3">
                      <Image
                        src="/quiz/depois-real-v1.png"
                        alt="Depois do protocolo"
                        width={1536}
                        height={864}
                        className="h-40 w-full rounded-xl object-cover object-top"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-neutral-200">
                    <div className="border-r border-neutral-200 px-3 py-2">
                    <p className="text-[13px] font-semibold text-neutral-700">Excesso de peso</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Inchaço abdominal</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Falta de energia</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Fome compulsiva</p>
                    <p className="mt-2 text-4xl font-black leading-none text-red-500">Alto</p>
                    </div>
                    <div className="px-3 py-2">
                    <p className="text-[13px] font-semibold text-neutral-700">Peso controlado</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Barriga lisa</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Vitalidade e disposição</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-700">Fome saudável</p>
                    <p className="mt-2 text-4xl font-black leading-none text-emerald-600">Controlado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-neutral-200">
                  <div className="border-r border-neutral-200 px-3 py-3">
                    <div className="mt-1 flex gap-1.5">
                      <span className="h-2.5 w-10 rounded-full bg-red-500" />
                      <span className="h-2.5 w-10 rounded-full bg-red-500" />
                      <span className="h-2.5 w-10 rounded-full bg-red-500" />
                      <span className="h-2.5 w-10 rounded-full bg-red-500" />
                      </div>
                    </div>
                    <div className="px-3 py-3">
                      <div className="mt-1 flex gap-1.5">
                        <span className="h-2.5 w-10 rounded-full bg-emerald-500" />
                        <span className="h-2.5 w-10 rounded-full bg-emerald-500" />
                        <span className="h-2.5 w-10 rounded-full bg-emerald-500" />
                        <span className="h-2.5 w-10 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-neutral-500">
                  Simulacao visual para motivacao. Resultados variam de pessoa para pessoa.
                </p>
              </div>
            )}

            {isCustomOfferStep ? null : (
              <div className="order-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              {isCustomOfferStep ? null : (
                <>
                  <h2 className="text-center text-[1.9rem] font-black leading-tight text-neutral-900 sm:text-[2.1rem]">
                    Seu plano personalizado esta pronto!
                  </h2>

                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer("1w")}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                        selectedOffer === "1w"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-neutral-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black text-neutral-900">Teste de 1 semana</p>
                          <p className="text-sm text-neutral-500">
                            <span className="line-through">EUR 15.35</span> {"->"}{" "}
                            <span className="font-semibold text-neutral-800">EUR 6.99</span>
                          </p>
                        </div>
                        <p className="text-right text-3xl font-black text-neutral-900">
                          EUR 0.99
                          <span className="block text-base font-semibold text-neutral-500">por dia</span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOffer("4w")}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                        selectedOffer === "4w"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-neutral-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      <div className="mb-2 inline-flex rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-black text-white">
                        Mais popular
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black text-neutral-900">Plano de 4 semanas</p>
                          <p className="text-sm text-neutral-500">
                            <span className="line-through">EUR 33.30</span> {"->"}{" "}
                            <span className="font-semibold text-neutral-800">EUR 12.99</span>
                          </p>
                        </div>
                        <p className="text-right text-3xl font-black text-neutral-900">
                          EUR 0.42
                          <span className="block text-base font-semibold text-neutral-500">por dia</span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOffer("12w")}
                      className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                        selectedOffer === "12w"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-neutral-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl font-black text-neutral-900">Plano de 12 semanas</p>
                          <p className="text-sm text-neutral-500">
                            <span className="line-through">EUR 57.67</span> {"->"}{" "}
                            <span className="font-semibold text-neutral-800">EUR 22.49</span>
                          </p>
                        </div>
                        <p className="text-right text-3xl font-black text-neutral-900">
                          EUR 0.25
                          <span className="block text-base font-semibold text-neutral-500">por dia</span>
                        </p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <div id="quiz-payment-form" className="mt-4">
                {isFrontStep ? (
                  !clientSecret ? (
                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="h-11 w-full animate-pulse rounded-xl bg-white" />
                      <div className="h-12 w-full animate-pulse rounded-xl bg-white" />
                      <div className="h-12 w-full animate-pulse rounded-xl bg-white" />
                      <div className="h-12 w-full animate-pulse rounded-xl bg-emerald-100" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Elements stripe={stripePromise} options={elementsOptions}>
                        <PaymentForm
                          onError={setCheckoutError}
                          onEmailCaptured={(email) => {
                            setPurchaseEmail(email);
                            sessionStorage.setItem("quiz_checkout_email", email);
                          }}
                          onSuccess={() => {
                            setHasPaidFront(true);
                            sessionStorage.setItem("quiz_front_paid", "1");
                            handleDecision(true);
                          }}
                        />
                      </Elements>
                      <button
                        type="button"
                        onClick={() => window.location.assign("/quiz")}
                        className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"
                      >
                        Sair
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <button
                      type="button"
                      onClick={() => handleDecision(true)}
                      className="h-14 w-full rounded-2xl bg-emerald-500 px-4 text-base font-black uppercase tracking-[0.02em] text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] transition hover:brightness-105"
                    >
                      SIM! QUERO ACELERAR AGORA OS RESULTADOS
                    </button>
                    <p className="text-center text-sm font-semibold text-neutral-500">🔒 Compra segura · Satisfação garantida</p>
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDecision(false)}
                        className="text-xs font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Não... prefiro continuar tendo resultados mais lentos
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isCustomOfferStep ? null : (
                <p className="mt-4 text-[11px] leading-tight text-neutral-500">{legalCopyByOffer[selectedOffer]}</p>
              )}

              {isCustomOfferStep ? null : (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                  <p className="text-center text-2xl font-black text-neutral-900">Garantia de reembolso de 30 dias</p>
                  <p className="mt-2 text-center text-sm leading-relaxed text-neutral-600">
                    Acreditamos que nosso plano funciona para voce, e voce deve ver resultados visiveis em ate 4
                    semanas. Estamos tao prontos para devolver seu dinheiro se voce conseguir demonstrar que seguiu o
                    plano, mas nao viu resultados.
                  </p>
                </div>
              )}
              </div>
            )}
        </div>
      </section>
    </main>
  );
}
