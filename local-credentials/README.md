# Credenciais locais (não vão para Git nem Vercel)

Passo a passo detalhado (Stripe, Supabase, “já não dá para ver”, etc.): **`docs/guia-chaves-ambiente.md`**.

## O que fazer uma vez

1. Copia `secrets.example.env` para **`secrets.env`** (na mesma pasta).
2. Preenche `secrets.env` com as tuas chaves reais (Stripe, Supabase, DB, etc.).
3. Na raiz do projeto corre **`npm run env:sync`** — isto copia `secrets.env` → **`.env.local`**, que é o ficheiro que o Next.js carrega automaticamente.
4. Reinicia o `npm run dev`.

## O que o assistente (Cursor) “precisa”

Não guardamos chaves no chat. Para o código e o assistente funcionarem bem no teu PC, basta:

- existir **`.env.local`** na raiz (gerado pelo passo 3), **ou**
- existir **`local-credentials/secrets.env`** e tu avisares para correr `env:sync` / abrires esse ficheiro na conversa.

O assistente só consegue **ler ficheiros que estão no workspace**; não acede à tua conta Stripe na web.

## Ficheiros

| Ficheiro | Commit no Git? | Notas |
|----------|------------------|--------|
| `secrets.example.env` | Sim | Modelo completo com todas as chaves usadas no código |
| `CHAVES-USADAS-NO-PROJETO.txt` | Sim | Lista simples (uma variável por linha) |
| `secrets.env` | **Não** | O teu ficheiro real (gitignored) |
| `.env.local` na raiz | **Não** | Gerado por `npm run env:sync` |

## Vercel / produção

Cola as **mesmas** variáveis no painel Environment Variables da Vercel. Esta pasta **não** substitui isso — só organiza o teu disco local.
