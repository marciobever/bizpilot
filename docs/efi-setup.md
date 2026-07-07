# Setup do billing Efí (Pix + cartão)

A Efí Bank é o PSP único do BizPilot (decisão de jul/2026, Stripe abandonada).
Sem as envs abaixo, o checkout cai automaticamente no fallback Stripe — nada
quebra, mas nada é cobrado via Efí.

## Como funciona

- **Pix (avulso mensal)**: o checkout gera um QR (cobrança `cob`, expira em 1h).
  Pagou → 30 dias de acesso (`profiles.current_period_end`). O painel dá 7 dias
  de carência após vencer e então bloqueia até renovar (novo QR em Minha Conta →
  Plano e Cobrança → "Renovar agora").
- **Cartão**: assinatura recorrente da própria Efí (renova sozinha). O número do
  cartão vira `payment_token` no browser (`payment-token-efi`) — não passa pelo
  nosso servidor.
- Ativação **não depende do webhook**: a tela de checkout faz polling no
  `/api/efi/confirm`, que consulta a Efí direto. O webhook é reforço (renovações
  de cartão e Pix pago com a aba fechada).
- Tabelas: `billing_charges` (cada cobrança), `efi_plans` (cache dos planos de
  cartão), colunas novas em `profiles`/`user_addons` — migration
  `019_billing_efi.sql`. **Aplicar a migration ANTES do deploy** (o código tem
  fallback se ela faltar, mas o checkout Efí não funciona sem ela).

## Passo a passo (Marcio)

1. **Criar a aplicação na Efí**: painel Efí → API → Aplicações → Nova aplicação.
   Habilitar **API Pix** (escopos: cob.write, cob.read, pix.read, webhook.write,
   webhook.read, payloadlocation.write) e **API Cobranças** (cartão/assinaturas).
   Começar em **homologação**.
2. **Certificado .p12**: painel → API → Meus certificados → criar (um por
   ambiente). Converter pra base64 SEM quebras de linha:
   `base64 -w0 certificado-homolog.p12` (Git Bash) e guardar o resultado.
3. **Chave Pix**: cadastrar/usar uma chave Pix da conta Efí (painel → Pix →
   Minhas chaves). Em homologação a chave é fictícia (qualquer e-mail serve).
4. **Identificador de conta (cartão)**: painel → API → Introdução →
   Identificador de conta (payee code) — usado pelo tokenizador no frontend.
5. **Envs na Vercel** (Production; repetir em Preview se quiser testar lá):

   | Env | Valor |
   |---|---|
   | `EFI_CLIENT_ID` | Client ID da aplicação |
   | `EFI_CLIENT_SECRET` | Client Secret |
   | `EFI_CERT_BASE64` | .p12 em base64 (passo 2) |
   | `EFI_PIX_KEY` | chave Pix recebedora |
   | `EFI_SANDBOX` | `true` (homolog) / `false` (produção) |
   | `EFI_WEBHOOK_SECRET` | string aleatória forte (ex: `openssl rand -hex 24`) |
   | `NEXT_PUBLIC_EFI_PAYEE_CODE` | identificador de conta (passo 4) |
   | `NEXT_PUBLIC_EFI_SANDBOX` | igual ao `EFI_SANDBOX` |

6. **Aplicar a migration** `supabase/migrations/019_billing_efi.sql` no Supabase.
7. **Redeploy** na Vercel (envs novas exigem rebuild).
8. **Registrar o webhook Pix** (uma vez por ambiente):
   ```bash
   curl -X POST https://www.bizpilot.com.br/api/efi/register-webhook \
     -H "x-internal-secret: $INTERNAL_API_SECRET"
   ```
9. **Testar em homologação**: assinar um plano com Pix (na homolog a Efí tem
   simulador de pagamento) e com o cartão de teste da Efí. Conferir
   `profiles.subscription_status/plan/current_period_end` e `billing_charges`.
10. **Produção**: repetir passos 1–2 com credenciais de produção, trocar as
    envs (`EFI_SANDBOX=false`), rodar o passo 8 de novo.

## Cartão — atenção

Habilitar cartão na conta Efí pede os dados do site/descritor da fatura — é
onde a marca **BizPilot** aparece. Se o compliance cruzar com o homônimo do
MATCH, usar o mesmo dossiê da contestação Stripe (PDF do WHOIS).

## O que ainda NÃO está feito (fase 2)

- Dunning via bot no WhatsApp (mandar o QR do mês, pausar agente em D+7) —
  hoje o bloqueio é só no painel (carência de 7 dias após vencer).
- Add-ons Pix não têm botão de renovação na UI (a coluna
  `user_addons.current_period_end` já existe; o `addonRowId` do
  `/api/efi/checkout` já renova a linha certa).
- Migrar assinantes Stripe existentes (conta suspensa — quando expirar o
  período deles, renovam via Efí pelo próprio checkout).
