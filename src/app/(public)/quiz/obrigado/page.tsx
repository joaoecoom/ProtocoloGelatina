"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { initTrackingContext, track } from "@/lib/tracking";

export default function QuizObrigadoPage() {
  const [from, setFrom] = useState("checkout");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paidParam = params.get("paid") === "1";
    const paidSession = sessionStorage.getItem("quiz_front_paid") === "1";
    if (!paidParam && !paidSession) {
      window.location.replace("/quiz");
      return;
    }
    const fromParam = params.get("from") ?? "checkout";
    const decisionParam = params.get("decision") ?? "unknown";
    const emailParam = params.get("email") ?? sessionStorage.getItem("quiz_checkout_email") ?? "";
    setFrom(fromParam);
    setEmail(emailParam);

    initTrackingContext();
    void track({
      event_name: "step_viewed",
      funnel_id: "quiz_gelatina",
      step_id: "checkout-thank-you",
      page_type: "checkout",
      metadata_json: { from: fromParam, decision: decisionParam },
    });
  }, []);

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#fff_0%,#fff7fb_56%,#ffffff_100%)] px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.1em] text-emerald-600">Compra concluida</p>
        <h1 className="mt-2 text-center text-3xl font-black text-pg-ink sm:text-4xl">Obrigado!</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-neutral-600">
          O teu acesso esta confirmado. Entra com o email da compra. Palavra-passe inicial: 123456.
        </p>
        <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <span className="font-semibold text-neutral-900">Ultima etapa:</span> {from}
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href={email ? `/entrar/checkout?email=${encodeURIComponent(email)}` : "/entrar/checkout"}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"
          >
            Entrar e aceder ao conteudo
          </Link>
        </div>
      </section>
    </main>
  );
}
