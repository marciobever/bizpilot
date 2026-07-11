# NFS-e para o BizPilot — como emitir nota fiscal das assinaturas

> Documento de decisão (11/07/2026). Nada aqui está implementado — é o mapa
> pra você escolher o caminho e depois virarmos a integração em tarefa.

## O que a lei pede

SaaS é **serviço** → o imposto é **ISS** e o documento é a **NFS-e**
(Nota Fiscal de Serviço eletrônica), emitida no município da empresa.
Todo pagamento recebido (Pix ou cartão via Efí) precisa de nota emitida
para o CNPJ/CPF do cliente. Vender sem emitir é sonegação — e cliente PJ
**vai pedir** a nota pra deduzir a despesa.

Pontos práticos pro contador confirmar:
- **CNAE**: a MMV precisa ter um CNAE de licenciamento/desenvolvimento de
  software (ex.: 6203-1/00 ou 6209-1/00) entre as atividades.
- **Código de serviço municipal** (item da LC 116/03): normalmente 1.05
  (licenciamento de software) ou 1.03 (processamento de dados) — a alíquota
  de ISS varia por município (2% a 5%).
- **Simples Nacional**: se a MMV é optante, a nota sai pelo regime do
  Simples (Anexo III/V conforme fator R) — o contador define.
- Reforma tributária: 2026 é ano de transição (CBS/IBS em fase de teste);
  quem emite via prefeitura/emissor nacional já sai adequado.

## As 3 opções

### 1. Manual (recomendada pra começar)
Emitir na mão a cada pagamento, pelo portal da prefeitura ou pelo
**Emissor Nacional de NFS-e** (nfse.gov.br — grátis, funciona pra maioria
dos municípios e MEI/Simples).

- Custo: R$ 0.
- Esforço: ~2 min por nota. Com <30 clientes, é meia hora por mês.
- Rotina sugerida: 1x por semana, abrir o painel admin → cobranças pagas
  na semana (`billing_charges` com `status=paid`) → emitir uma nota por
  cobrança → mandar o PDF pro e-mail do cliente.
- Dá pra facilitar: posso criar uma tela/export no admin listando as
  cobranças pagas da semana com CNPJ/CPF, valor e descrição prontos pra
  copiar. (Hoje não coletamos CPF/CNPJ no checkout Pix — ver "Gap" abaixo.)

### 2. API de emissão (quando o volume incomodar)
Serviços que emitem NFS-e por API, disparados pelo nosso webhook de
pagamento (mesmo ponto onde hoje mandamos o recibo):

| Serviço  | Modelo de preço (ordem de grandeza) | Nota |
|----------|--------------------------------------|------|
| Focus NFe | mensalidade + por nota (~centavos) | API sólida, boa doc |
| eNotas    | por nota / planos                   | popular em SaaS |
| PlugNotas | por nota, sem mensalidade em planos menores | bom pra volume baixo |
| NFE.io    | planos por volume                   | idem |

Integração: ~1 dia de trabalho no ponto do `applyPaidCharge`
(`src/lib/billing/activate.ts`), com retry e armazenamento do PDF/XML.
Só vale quando emitir na mão virar dor (>50 notas/mês, na prática).

### 3. Contador emite
Mandar o relatório de cobranças pagas pro contador todo mês e ele emite.
Custo embutido no honorário; funciona, mas cria dependência e atraso.

## Gap no produto (pra quando escolher)

O checkout **Pix não coleta CPF/CNPJ** (o de cartão coleta CPF). NFS-e
precisa do documento do tomador. Quando você decidir o caminho, a tarefa
de produto é: campo CPF/CNPJ no checkout Pix + salvar em `billing_charges`.

## Recomendação

**Agora:** opção 1 (manual, via Emissor Nacional), com a tela de apoio no
admin pra listar o que emitir. **Gatilho pra automatizar:** quando passar de
~50 notas/mês ou o processo manual começar a atrasar. Antes de tudo:
**validar CNAE e código de serviço com o contador** — é o único item que
pode travar a emissão e não depende de código.

## Decisão (11/07/2026)

Marcio vai integrar os sites com o **Bling** (ERP) mais pra frente — a
emissão fica nativa por lá, cobrindo todos os produtos do CNPJ de uma vez.
Até a integração existir:
- **Cliente** recebe o recibo automático por e-mail (já no ar desde 11/07).
- **Fisco**: emissão manual em lote mensal no Emissor Nacional.

Quando a integração Bling entrar, o ponto de disparo no código é o
`applyPaidCharge` (`src/lib/billing/activate.ts`) — mesmo lugar que envia o
recibo. Pré-requisito que continua valendo (pro Bling também): coletar
CPF/CNPJ do cliente no checkout Pix.
