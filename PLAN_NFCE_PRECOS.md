# Plano: Integração de Preços via NFC-e / App "Menor Preço Brasil" (abordagem MITM)

> Objetivo: coletar preços praticados em lojas (ex.: Assaí, filtrando por CNPJ da unidade)
> usando o tráfego do app governamental **Menor Preço Brasil** (`br.gov.rs.procergs.mpbr`),
> capturado por MITM, e alimentar o OrganizAI com custos/comparativos reais.

## 0. Aviso (curto e honesto)
Você decidiu seguir por MITM. Dois pontos de realidade que o plano já contempla como
obstáculos técnicos (não como "não faça"):
- **SSL Pinning**: app de governo quase sempre trava o certificado. A Fase 1 existe justamente
  para derrotar isso — sem ela, nenhuma ferramenta de proxy funciona.
- **Endpoint privado, sem SLA**: pode mudar sem aviso. Por isso a Fase 4 reconstrói as chamadas
  num coletor próprio e a Fase 5 persiste tudo, pra não depender do app em produção.

## 1. Visão geral da arquitetura
```
[Android: app MPB]  --(HTTPS, com pinning)-->  [Proxy MITM: mitmproxy/Charles/HTTP Toolkit]
                                                        | captura + Frida unlock
                                                        v
                              [Mapear endpoint + contrato da resposta JSON]
                                                        |
                                                        v
                    [Coletor Python/Node: reproduz as chamadas, filtra CNPJ Assaí]
                                                        |
                                                        v
              [Normalização] --> [Supabase: tabela price_collection] --> [UI OrganizAI]
```
Depois de mapeado (Fase 3), o MITM só serve para manter o endpoint descoberto. O coletor
(Fase 4) roda sozinho.

## 2. Pré-requisitos / Ambiente
- **Emulador Android** (Android Studio AVD) OU device físico com root/Magisk.
  - Recomendado: AVD com sistema que permita Frida (ou real device com Magisk + module
    "MagiskTrustUserCerts" para o CA do proxy ser aceito como sistema).
- **mitmproxy** (captura + replay scriptável) — principal.
  - Alternativa de entrada: **HTTP Toolkit** (setup Android 1-click + tenta desabilitar
    pinning em muitos apps automaticamente). Use para validar rápido; migre p/ mitmproxy p/ automação.
  - Charles Proxy também serve (visual, mas menos scriptável).
- **Frida + Frida-tools + Objection** (para o bypass de pinning).
- **APK do app**: `br.gov.rs.procergs.mpbr` (baixar via Play ou APKMirror).
- **Python 3.11** (já tem no host) + `requests`/`httpx` para o coletor.

## 3. Fase 1 — Derrotar o SSL Pinning (o obstáculo real)
1. Instalar o CA do mitmproxy no emulador/device e marcá-lo como confiável.
2. Rodar Frida server no device.
3. Bypass universal (sem root visível necessário p/ apps não-protegidos por RASP forte):
   ```bash
   frida -U --codeshare pcipolloni/universal-android-ssl-pinning-bypass-with-frida \
         -f br.gov.rs.procergs.mpbr
   ```
   Ou via Objection:
   ```bash
   objection --gadget br.gov.rs.procergs.mpbr explore
   # dentro do shell:
   android sslpinning disable
   ```
4. **Validação**: abrir o app e ver no mitmproxy se as requisições aparecem em claro
   (não mais "certificate verify failed"). Se ainda falhar, o app usa RASP/obfuscation mais
   pesado → precisaremos de Frida script custom (hook em `okhttp3.CertificatePinner` ou
   `TrustManager`) — registrar isso como risco R1 (ver seção 10).

## 4. Fase 2 — Capturar e mapear o endpoint
1. No app: fazer buscas representativas:
   - por **palavra-chave** (ex.: "leite");
   - por **EAN/código de barras**;
   - por **lat/long de Campo Grande** (a abrir o mapa/raio de lojas);
   - filtrar/abrir uma loja do **Assaí** (anotar o CNPJ da unidade na resposta).
2. No mitmproxy, isolar as chamadas `GET`/`POST` para o backend (host tipo `*.sefaz.*`,
   `*.procergs.*`, `*.rs.gov.br` ou similar).
3. Salvar os requests/responses em `.har` ou via `mitmdump -w captura.mitm`.

## 5. Fase 3 — Documentar o contrato da API (não inventar — extrair do tráfego real)
Registrar num arquivo `docs/mpb_api_contrato.md`:
- **Base URL + path** (ex.: `https://<host>/api/v?/produtos/preco`).
- **Query params**: `lat`, `lng`, `raio`, `ean`, `q` (palavra-chave), `cnpj` (filtro loja?),
  paginação (`page`/`limit`).
- **Headers**: `Authorization` (Bearer? token fixo no APK?), `User-Agent`, `X-*` (api key?),
  `device-id`.
- **Corpo da resposta** (JSON): campos de produto, preço, estabelecimento, `cnpj`,
  `data_preco`, marca, unidade.
- **Autenticação**: se exige login Gov.BR, o token tem TTL → o coletor precisará renovar
  (capturar refresh ou reusar sessão). Se o app usa token "público" hardcoded, melhor ainda.
- **Assinatura de request** (HMAC/nonce): se houver, reproduzir exige extrair a função via
  Frida (risco R2).

## 6. Fase 4 — Coletor automatizado (sem app/MITM)
Script (Python) que:
1. Lê o contrato documentado (Fase 3).
2. Reproduz as chamadas com `requests` + headers capturados.
3. Varre: lista de EANs de interesse (ou palavras-chave de cardápio da Jennifer) × raio de
   Campo Grande × filtro `cnpj` do Assaí.
4. Respeita rate-limit (sleep + backoff) para não derrubar o IP.
5. Salva RAW (`json`) por coleta, com timestamp.
6. Se o token expirar, avisa para re-capturar (ou implementa refresh se mapeado).

## 7. Fase 5 — Modelo de dados no OrganizAI (nova tabela)
```sql
CREATE TABLE IF NOT EXISTS public.price_collection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  ean TEXT,
  product_name TEXT NOT NULL,
  brand TEXT,
  cnpj_loja TEXT,
  loja_nome TEXT,
  price NUMERIC(10,2) NOT NULL,
  unit TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'menor_preco_brasil',
  raw_payload JSONB,
  created_by UUID REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_price_collection_family ON public.price_collection(family_id);
CREATE INDEX IF NOT EXISTS idx_price_collection_ean ON public.price_collection(ean);
CREATE INDEX IF NOT EXISTS idx_price_collection_cnpj ON public.price_collection(cnpj_loja);
CREATE INDEX IF NOT EXISTS idx_price_collection_collected ON public.price_collection(collected_at);

-- RLS (mesmo padrão das tabelas de pricing existentes)
ALTER TABLE public.price_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_price_collection"
  ON public.price_collection FOR ALL
  USING (public.is_member_of_family(family_id));
```
> As tabelas `ingredients_base.package_cost` e `products.cost_price` JÁ existem
> (`20260803000002_create_pricing_tables.sql`) — a Fase 6 liga a coleta neles.

## 8. Fase 6 — Normalização e carga
- ETL que cruza `price_collection` (por EAN ou nome) com `ingredients_base` / `products`:
  - atualiza `ingredients_base.package_cost` com o **menor preço** do Assaí (ou média,
    configurável);
  - recalcula `products.cost_price` e, consequentemente, a Calculadora de Precificação.
- Sempre mantém o histórico em `price_collection` (não sobrescreve — registra nova linha),
  para gráficos de evolução de preço.

## 9. Fase 7 — Feature de consumo no OrganizAI (a definir com você)
Duas opções de UI sobre os dados coletados:
- **A) Auto-custo**: ao abrir a Calculadora, sugere o custo do ingrediente pelo menor preço
  coletado (Jennifer confirma). — mais útil pro fluxo de vendas dela.
- **B) Comparador**: tela "Menor Preço" listando lojas × preço por produto (tipo o app do
  governo, mas nos dados da família).
> Decida A ou B antes de codar a UI. O pipeline (Fases 1–6) é igual para ambos.

## 10. Riscos e mitigações
| ID | Risco | Mitigação |
|----|-------|-----------|
| R1 | SSL pinning com RASP/obfuscation forte | Frida script custom (hook `CertificatePinner`/`TrustManager`); senão, replay via proxy |
| R2 | Assinatura HMAC de request | Extrair função de assinatura via Frida; ou replay de request capturado |
| R3 | Token Gov.BR com TTL curto | Re-capturar sessão; ou mapear refresh token se exposto |
| R4 | Rate-limit / bloqueio de IP | Backoff exponencial, janelas de coleta, rodar de IP residencial |
| R5 | Endpoint muda sem aviso | Monitore 1 request canário por dia; alerte em caso de 4xx em massa |
| R6 | **MS/Campo Grande pode não estar na cobertura do MPB** | Verificar no próprio app em CG antes de investir; se não houver dados de MS, o alvo real é outro estado ou a fonte `consultavalorsefaz.ms.gov.br` |

## 11. Próximos passos recomendados
1. **Validação de cobertura (R6)**: abrir o app MPB em Campo Grande e ver se retorna lojas/
   preços de MS. Se não, pivotamos a fonte.
2. **Fase 1 real**: subir AVD + Frida e confirmar que o bypass destrava o tráfego.
3. Documentar o contrato (Fase 3) a partir da primeira captura.

---
Decisões pendentes com você:
- [ ] Objetivo da UI: A (auto-custo) ou B (comparador)?  → define Fase 7
- [ ] Cobertura MS confirmada no app? → destrava R6
- [ ] Quais EANs/palavras-chave varrer (cardápio da Jennifer)?
