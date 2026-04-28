# Recap da conversa — Stripe, checkout do quiz e credenciais

Este ficheiro é um **resumo** do que foi tratado nesta thread (não é uma cópia literal de cada mensagem do chat no Cursor). Para guardar o **chat palavra por palavra**, usa a opção de exportar / copiar conversa no próprio Cursor, se o teu plano o permitir.

---

## 1. Problema inicial

- Erro ao clicar no botão de checkout do quiz.
- Pedido para perceber o que acontecia.

---

## 2. O que se descobriu (causas)

- Respostas **500** sem JSON quando o Stripe ou `getStripe()` falhavam → o browser mostrava erro genérico.
- Muitas vezes faltava **`STRIPE_PRICE_FRONT`** (ou variável vazia) → **400** com mensagem explícita.
- Sem **`STRIPE_SECRET_KEY`** no ambiente do servidor → falha ao criar sessão ou **503** depois das alterações.
- Chaves coladas **no chat** não entram sozinhas no disco: têm de existir em **`.env.local`** ou no cofre local (ver secção 7).

---

## 3. Alterações feitas no código (backend Stripe)

- **`src/lib/stripe.ts`**: `resolveCheckoutHandlerError`, `stripeCatalogMonthlyLookupKey`, `planIdFromCatalogMonthlyLookupKey`, `resolveStripeMonthlyPriceIdWithStripe` (env → `prices.list` por lookup_key → fallback `products.search` por metadata `gelatina_plan_id`), `getPlanIdForStripePriceId`, `trim()` em envs de preço.
- **`src/app/api/stripe/checkout-guest/route.ts`**: `try/catch` na criação da sessão, `tax_behavior` no `price_data`, metadata `monthlyPriceId` / `trialDays`, resolução de preço com a instância Stripe já criada, verificação de secret + **checkout simulado em dev** (ver secção 5).
- **`src/app/api/stripe/checkout/route.ts`**: mesmo padrão que guest (logged-in).
- **`src/app/api/stripe/webhook/route.ts`**: `readPlanFromSubscription` async + mapeamento de plano via env ou `lookup_key` no Price.

---

## 4. Script e catálogo Stripe

- **`scripts/stripe-seed-prices.ts`** + **`npm run stripe:seed`**: cria (ou reutiliza) produtos/preços mensais em EUR com `lookup_key` fixo `pgi_plan_<PLAN>_monthly_eur`.
- **`.env.example`**: notas sobre seed e mock de dev.

---

## 5. Checkout simulado em desenvolvimento

- **`src/lib/stripe-dev-mock.ts`**: em `NODE_ENV === "development"` e **sem** `STRIPE_SECRET_KEY`, o guest checkout devolve URL para `/quiz?checkout=dev-mock` em vez de 503.
- **`quiz-offer-view.tsx`**: `console.error` com mensagem do servidor em falhas; aviso visual para `checkout=dev-mock`; ajuste `next/image` (`style={{ width: "auto" }}`) no ícone premium.
- **`src/app/(public)/quiz/page.tsx`**: `Suspense` à volta do quiz (por causa de `useSearchParams`).
- Desligar mock em dev: **`STRIPE_DEV_MOCK_CHECKOUT=0`** no `.env.local`.

---

## 6. Cofre local de chaves (organização)

- Pasta **`local-credentials/`**: `secrets.example.env` (modelo, vai ao Git), `README.md`, script **`npm run env:sync`** copia `secrets.env` → `.env.local`.
- **`.gitignore`**: ignora `local-credentials/secrets.env` e `.env` dentro dessa pasta.
- **`.vercelignore`**: pasta `local-credentials` não sobe para builds Vercel.
- **`AGENTS.md`**: nota para assistentes sobre onde estão credenciais.

---

## 7. Lista de variáveis e “onde buscar” (resumo)

Ver mensagem dedicada na conversa: Supabase (URL, anon, service_role), `DATABASE_URL` / `DIRECT_URL`, Stripe (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`), opcionais OpenRouter, VAPID, `CRON_SECRET`, `QUIZDASHBOARD_PASSWORD`, URLs públicos, tracking.

---

## 8. Expectativas realistas (assistente vs. utilizador)

- O assistente **lê ficheiros no workspace** (ex.: `local-credentials/secrets.env`) se existirem; **não** faz login nas tuas contas Stripe/Supabase/Vercel.
- Para **produção**, variáveis têm de estar também no **painel da Vercel** (ou outro host).

---

## Ficheiros tocados (referência rápida)

| Área | Ficheiros principais |
|------|----------------------|
| Stripe lib | `src/lib/stripe.ts`, `src/lib/stripe-dev-mock.ts` |
| API | `src/app/api/stripe/checkout-guest/route.ts`, `checkout/route.ts`, `webhook/route.ts` |
| Quiz UI | `src/app/(public)/quiz/quiz-offer-view.tsx`, `quiz/page.tsx` |
| Scripts | `scripts/stripe-seed-prices.ts`, `scripts/sync-local-credentials.mjs` |
| Config | `package.json`, `.gitignore`, `.vercelignore`, `.env.example`, `AGENTS.md` |
| Docs | `local-credentials/README.md`, este ficheiro |

Data do recap: conforme a sessão em que foi gerado (2026).
