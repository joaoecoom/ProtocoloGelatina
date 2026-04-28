/**
 * Em `next dev`, sem STRIPE_SECRET_KEY, o checkout do quiz devolve URL simulada
 * para não bloquear funis. Produção / `next start` com NODE_ENV=production nunca usa isto.
 * Desliga com STRIPE_DEV_MOCK_CHECKOUT=0 no .env.local.
 */
export function shouldStripeQuizCheckoutDevMock(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.STRIPE_DEV_MOCK_CHECKOUT === "0") return false;
  return !process.env.STRIPE_SECRET_KEY?.trim();
}
