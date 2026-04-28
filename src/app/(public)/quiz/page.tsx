import { Suspense } from "react";
import QuizOfferView from "./quiz-offer-view";

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-50" aria-busy />}>
      <QuizOfferView />
    </Suspense>
  );
}
