# Guia: chaves que o projecto precisa e como obtê-las

Lista alinhada com `local-credentials/secrets.example.env` e com o código em `src/`.

---

## Níveis: o que é obrigatório quando

| Nível | Variáveis | Quando |
|--------|-----------|--------|
| **A — App + login + base de dados** | Supabase (URL, anon, service_role) + `DATABASE_URL` + `DIRECT_URL` | Sempre que quiseres login, Prisma, avatar, etc. |
| **B — Checkout Stripe real** | `STRIPE_SECRET_KEY` + preço mensal (`STRIPE_PRICE_FRONT` ou `npm run stripe:seed` na mesma conta) | Pagamentos reais no quiz/planos |
| **C — Produção estável** | `NEXT_PUBLIC_APP_URL` (ou site URL) + `STRIPE_WEBHOOK_SECRET` no servidor que recebe webhooks | Emails com URL certa; planos após pagamento via webhook |
| **D — Opcional** | OpenRouter, VAPID, `CRON_SECRET`, `QUIZDASHBOARD_PASSWORD`, `TRACKING_*`, scripts Supabase | Só se usares essas funcionalidades |

Na **Vercel**, repetes **A+B+C** (e o D que precisares) em **Project → Settings → Environment Variables** (Production). Não vão no Git.

---

## 1. Supabase

### 1.1 `NEXT_PUBLIC_SUPABASE_URL`

1. [supabase.com/dashboard](https://supabase.com/dashboard) → abre o **projecto**.
2. **Project Settings** (ícone engrenagem) → **API**.
3. Em **Project URL** copia o URL (ex. `https://xxxxx.supabase.co`).

**Volta a ver?** Sim, está sempre visível nesta página.

---

### 1.2 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

1. Mesma página **Settings → API**.
2. Secção **Project API keys** → chave **`anon` `public`** → **Copy**.

**Volta a ver?** Sim. Se **rotares** a JWT secret do projecto (raro), as chaves mudam e tens de atualizar em todo o lado.

---

### 1.3 `SUPABASE_SERVICE_ROLE_KEY`

1. Mesma página **Settings → API**.
2. Chave **`service_role` `secret`** → **Reveal** / **Copy**.

**Cuidado:** tem poder total na base e Storage. **Nunca** `NEXT_PUBLIC_*` nem no frontend.

**Se “já não aparece” ou perdeste:**  
- Continua a haver **Reveal** na mesma página enquanto tens acesso ao projecto.  
- Se alguém **revogou/rotacionou** API keys a nível de projecto, o Supabase pode exigir gerar novo par — segue avisos no dashboard.  
- Em último caso: **Project Settings → API** e documentação Supabase sobre *rotate JWT* (só se te mandarem fazer rotação explícita).

---

### 1.4 `DATABASE_URL` e `DIRECT_URL` (Postgres / Prisma)

1. No Supabase: **Project Settings → Database**.
2. Abre **Connect** (ou “Connection string”).
3. **Prisma** (recomendado pela doc Supabase + Prisma):
   - **Transaction / Pooled** (porta **6543**, `?pgbouncer=true&connection_limit=1`) → isto é o típico **`DATABASE_URL`**.
   - **Session / Direct** (porta **5432**, SSL) → típico **`DIRECT_URL`** para migrações / `prisma db push`.

Substitui `[YOUR-PASSWORD]` pela password da base (**Database Settings** → reset password se precisares).

**Volta a ver a password?** **Não** — só na altura em que defines ou resets. Se perdeste: **Database → Database password → Reset** e atualizas as duas URLs.

---

## 2. Stripe

### 2.1 `STRIPE_SECRET_KEY` (`sk_test_...` ou `sk_live_...`)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → canto superior: **Developers**.
2. **API keys**.
3. **Standard keys** → **Secret key** → **Reveal test key** / **Reveal live key** (conforme modo **Test data** on/off no Stripe).

**Se já não mostra (só na criação inicial):**  
- Usa **Roll key** (ou “Create new key” conforme UI): gera **nova** secret → copia **na hora** → atualiza `.env.local` e Vercel. A antiga deixa de funcionar.

**O que seleccionar ao criar:** para este projecto usa a **Standard secret key** (não precisas de Restricted key a menos que queiras limitar por IP/recurso).

---

### 2.2 `STRIPE_PRICE_FRONT` (e outros `STRIPE_PRICE_*`)

**Opção A — Dashboard**

1. **Product catalog** → produto → **Pricing** → copia o **Price ID** (`price_...`) do plano **mensal recorrente em EUR** que queres para o quiz FRONT.

**Volta a ver?** **Sim**, o `price_...` está sempre no produto/preço.

**Opção B — No teu PC (recomendado se não quiseres copiar à mão)**

1. Com `STRIPE_SECRET_KEY` no `.env.local`, na raiz do projecto:  
   `npm run stripe:seed`  
2. Copia as linhas `STRIPE_PRICE_...=` que o comando imprime.

---

### 2.3 `STRIPE_WEBHOOK_SECRET` (`whsec_...`)

**Produção (Vercel)**

1. Stripe **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL:** `https://O-TEU-DOMINIO.com/api/stripe/webhook` (HTTPS, path exact deste repo).
3. **Events to send:** pelo menos os que o teu `webhook/route.ts` trata (ex.: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, etc.) — podes começar com **“Select events”** e escolher esses; ou “Send all events” em teste (não ideal em live).
4. Depois de criar, abre o endpoint → **Signing secret** → **Reveal** → copia `whsec_...`.

**Se perdeste o `whsec`:**  
- No mesmo endpoint, **Reveal** ainda pode existir.  
- Se não: **Add endpoint** de novo (novo URL ou mesmo URL) **ou** no Stripe CLI cada `stripe listen` gera um `whsec` novo para local.

**Local com Stripe CLI**

1. Instala [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. `stripe login`
3. `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. O terminal mostra **`whsec_...`** — usa isso em `STRIPE_WEBHOOK_SECRET` **só para dev**.

---

### 2.4 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_...`)

1. **Developers → API keys** → **Publishable key** → Copy.

**Volta a ver?** Sim. O projecto **ainda não usa** esta chave no `src/`; só faz sentido se no futuro usares Stripe.js no browser.

---

### 2.5 `STRIPE_DEV_MOCK_CHECKOUT`

- Opcional. Valor **`0`** desliga o checkout **simulado** em `npm run dev` quando **não** há `STRIPE_SECRET_KEY`.
- Se não definires, em dev sem secret o quiz usa redirect simulado.

---

## 3. URLs da app

### `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`

- **Produção:** `https://teu-dominio.com` (sem barra final ou consistente com o que usas nos emails).
- **Local:** podes usar `http://localhost:3000` para testes.

Usadas em layout, links de recuperação de password, redirects de checkout.

---

## 4. OpenRouter (Jéssica)

1. [openrouter.ai/keys](https://openrouter.ai/keys) → **Create key**.
2. Copia **`OPENROUTER_API_KEY`** na hora.

**Se não mostra de novo:** cria **nova key** e apaga ou ignora a antiga.

Opcionais: `OPENROUTER_MODEL`, `OPENROUTER_HTTP_REFERER`.

---

## 5. Web Push (VAPID)

No projecto:

```bash
npm run vapid:generate
```

Copia o que o script imprimir para `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e define `VAPID_SUBJECT=mailto:teu@email.pt`.

**Se perdeste a private key:** corre de novo o generate e atualiza subscrições / prefs conforme a tua lógica.

---

## 6. `CRON_SECRET` (Vercel Cron)

1. Inventa uma string longa e aleatória (ex. 32+ caracteres).
2. Cola em **Vercel → Environment Variables** como `CRON_SECRET`.
3. No **cron job** da Vercel, o header deve ser `Authorization: Bearer <o_mesmo_valor>` (como o teu `/api/cron/push-reminders` espera).

**Se perdeste:** define outro valor e atualiza o cron na Vercel ao mesmo tempo.

---

## 7. `QUIZDASHBOARD_PASSWORD`

- Tu escolhes a password; colas na env do servidor. Não “vem” de lado nenhum.

---

## 8. Tracking (`TRACKING_*`)

- URLs e tokens vêm das **tuas** ferramentas (Meta CAPI, TikTok, Google, Utmify, etc.). Cada uma tem o seu painel de “server-side” / webhook / token.

---

## 9. Variáveis só da Vercel (não defines no `.env` local)

- `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` — injetadas automaticamente em deploys Vercel.

---

## Onde guardar no teu disco (sem Git)

1. Copia `local-credentials/secrets.example.env` → `local-credentials/secrets.env`.
2. Preenche com os valores reais.
3. Na raiz: `npm run env:sync` → gera/atualiza `.env.local`.

O ficheiro `secrets.env` **não** deve ir para o Git (já está no `.gitignore`).

---

## Checklist rápido “100% funcional” mínimo

- [ ] Supabase: URL + anon + service_role  
- [ ] Postgres: `DATABASE_URL` + `DIRECT_URL` (strings do modal Connect)  
- [ ] Stripe: `STRIPE_SECRET_KEY`  
- [ ] Stripe: `STRIPE_PRICE_FRONT` **ou** `npm run stripe:seed` na mesma conta  
- [ ] Produção: `NEXT_PUBLIC_APP_URL`  
- [ ] Produção: webhook Stripe → `STRIPE_WEBHOOK_SECRET` + URL do endpoint correcta  
- [ ] Vercel: as mesmas chaves no painel + redeploy  
