"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  | "upsell1_down3"
  | "upsell2"
  | "upsell2_down1"
  | "upsell2_down2"
  | "upsell2_down3";

const FUNNEL_STEPS: Array<{ id: FunnelStepId; dashboardStepId: string; label: string; description: string }> = [
  { id: "front", dashboardStepId: "checkout-front", label: "Oferta Principal", description: "Checkout do plano principal" },
  { id: "upsell1", dashboardStepId: "checkout-upsell-1", label: "Upsell 1", description: "Primeira oferta de aumento de ticket" },
  { id: "upsell1_down1", dashboardStepId: "checkout-downsell-1-1", label: "Downsell 1.1", description: "Fallback do Upsell 1" },
  { id: "upsell1_down2", dashboardStepId: "checkout-downsell-1-2", label: "Downsell 1.2", description: "Segunda alternativa ao Upsell 1" },
  { id: "upsell1_down3", dashboardStepId: "checkout-downsell-1-3", label: "Downsell 1.3", description: "Terceira alternativa ao Upsell 1" },
  { id: "upsell2", dashboardStepId: "checkout-upsell-2", label: "Upsell 2", description: "Segunda oferta de aumento de ticket" },
  { id: "upsell2_down1", dashboardStepId: "checkout-downsell-2-1", label: "Downsell 2.1", description: "Fallback do Upsell 2" },
  { id: "upsell2_down2", dashboardStepId: "checkout-downsell-2-2", label: "Downsell 2.2", description: "Segunda alternativa ao Upsell 2" },
  { id: "upsell2_down3", dashboardStepId: "checkout-downsell-2-3", label: "Downsell 2.3", description: "Terceira alternativa ao Upsell 2" },
];

function PaymentForm({ onError }: { onError: (msg: string) => void }) {
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
        return_url: `${window.location.origin}/quiz?checkout=success`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      onError(result.error.message ?? "Falha ao confirmar pagamento.");
      setIsPaying(false);
      return;
    }
    window.location.assign("/quiz?checkout=success");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <LinkAuthenticationElement />
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(10 * 60);
  const [selectedOffer, setSelectedOffer] = useState<"1w" | "4w" | "12w">("1w");
  const [stepIndex, setStepIndex] = useState(0);

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

  async function prepareCheckout() {
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
          tracking: {
            session_id: tracking.sessionId,
            visitor_id: tracking.visitorId,
            anonymous_id: tracking.anonymousId,
            funnel_id: "quiz_gelatina",
            step_id: currentStep.dashboardStepId,
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
    } catch {
      setCheckoutError("Falha ao preparar pagamento.");
    } finally {
      setIsPreparing(false);
    }
  }

  useEffect(() => {
    const cached = sessionStorage.getItem("quiz_checkout_client_secret");
    if (cached) {
      setClientSecret(cached);
      sessionStorage.removeItem("quiz_checkout_client_secret");
    }
  }, []);

  useEffect(() => {
    if (!clientSecret && !isPreparing) {
      void prepareCheckout();
    }
  }, [clientSecret, isPreparing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerLabel = `${String(minutes)}:${String(seconds).padStart(2, "0")}`;

  function scrollToPayment() {
    const payment = document.getElementById("quiz-payment-form");
    payment?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const currentStep = FUNNEL_STEPS[stepIndex];
  const isFrontStep = currentStep.id === "front";

  function goPrevStep() {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  function goNextStep() {
    setStepIndex((prev) => Math.min(FUNNEL_STEPS.length - 1, prev + 1));
  }

  const legalCopyByOffer: Record<"1w" | "4w" | "12w", string> = {
    "1w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 6.99 para o teste de 7 dias. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 33.30 todos os meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
    "4w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 12.99. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 33.30 todos os meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
    "12w":
      "Ao continuar, voce esta se inscrevendo em pagamentos automaticos com o preco promocional EUR 22.49. Voce concorda que o plano selecionado sera automaticamente prorrogado pelo preco total para periodos de renovacao sucessivos e que sera cobrado o preco total de EUR 57.67 a cada 3 meses ate cancelar a assinatura. Voce pode cancelar a assinatura entrando em contato com nossa equipe de atendimento ao cliente.",
  };

  useEffect(() => {
    initTrackingContext();
  }, []);

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

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#fff_0%,#fff7fb_56%,#ffffff_100%)] px-4 pb-12 pt-6 sm:px-6">
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <div className="sticky top-2 z-20 rounded-2xl border border-neutral-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Vaga reservada por</p>
              <p className="text-3xl font-black leading-none text-pg-ink">{timerLabel}</p>
            </div>
            <button
              type="button"
              onClick={scrollToPayment}
              className="h-11 rounded-full bg-neutral-900 px-5 text-sm font-black text-white shadow-[inset_0_0_0_3px_rgba(255,255,255,0.2)]"
            >
              {isFrontStep ? "Ir para pagamento" : "Ir para a oferta"}
            </button>
          </div>
        </div>

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
                    <p className="text-[13px] text-neutral-500">Inchaco abdominal</p>
                    <p className="text-2xl font-black text-neutral-800">Alto</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[13px] text-neutral-500">Inchaco abdominal</p>
                    <p className="text-2xl font-black text-emerald-600">Controlado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-neutral-200">
                  <div className="border-r border-neutral-200 px-3 py-3">
                    <p className="text-[13px] text-neutral-500">Energia diaria</p>
                    <div className="mt-1 flex gap-1.5">
                      <span className="h-2.5 w-10 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-10 rounded-full bg-neutral-200" />
                      <span className="h-2.5 w-10 rounded-full bg-neutral-200" />
                      <span className="h-2.5 w-10 rounded-full bg-neutral-200" />
                    </div>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[13px] text-neutral-500">Energia diaria</p>
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

            <div className="order-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
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

              <div id="quiz-payment-form" className="mt-4">
                {!clientSecret ? (
                  <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="h-11 w-full animate-pulse rounded-xl bg-white" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-white" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-white" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-emerald-100" />
                  </div>
                ) : (
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <PaymentForm onError={setCheckoutError} />
                  </Elements>
                )}
              </div>

              <p className="mt-4 text-[11px] leading-tight text-neutral-500">
                {legalCopyByOffer[selectedOffer]}
              </p>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <p className="text-center text-2xl font-black text-neutral-900">Garantia de reembolso de 30 dias</p>
                <p className="mt-2 text-center text-sm leading-relaxed text-neutral-600">
                  Acreditamos que nosso plano funciona para voce, e voce deve ver resultados visiveis em ate 4
                  semanas. Estamos tao prontos para devolver seu dinheiro se voce conseguir demonstrar que seguiu o
                  plano, mas nao viu resultados.
                </p>
              </div>
            </div>
        </div>
      </section>
    </main>
  );
}
