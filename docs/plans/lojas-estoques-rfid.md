# Plano: lojas, vários estoques, ficha técnica e RFID

Tipo: contínuo

Relatório de 17/11/2026, atualizado em 23/11/2026. Reúne as sugestões de
melhoria do sistema e a ordem proposta para as próximas evoluções. As decisões
marcadas como "proposta" ainda precisam de aprovação do usuário e de ADR antes
da implementação.

## Contexto

- `inventario` (este projeto): estoque da fábrica em sacos, catálogo para as
  vendedoras, pedidos e painel de produção.
- `catalogo` (`/home/servidor/www/catalogo`): loja online integrada ao Bling,
  com SKU pai/filha no padrão `SKI01BRA34` (modelo + categoria + aparência +
  tamanho).
- `cj-spec-sheet`: ficha técnica antiga, usada só como referência. A ficha
  foi implementada como módulo próprio (ver [ADR 0027](../adr/0027-ficha-tecnica-versionada.md)).

## Problemas atuais

| # | Problema | Onde | Gravidade |
|---|---|---|---|
| 1 | O painel de produção, a migração de etapas e os ADRs 0033–0036 estão em commits locais e passaram na validação completa. Faltam a integração e a implantação. | `feat/quadro-producao` | Alta |
| 2 | O catálogo público (`/`) aceita pedidos de qualquer pessoa com o link e reserva sacos. Só há limite por IP e sessão. | `routes/web.php`, `CatalogOrderController` | Alta |
| 3 | O login usa só e-mail (`fortify.username = email`) e o link de acesso só sai por e-mail. Vendedoras de loja provavelmente não usam e-mail. | `config/fortify.php`, `SendUserAccessLink` | Alta (bloqueia o acesso das lojas) |
| 4 | A loja do pedido é texto livre (`orders.store_name`). Nomes com grafias diferentes viram lojas diferentes e os relatórios por loja ficam errados. | `StoreOrderRequest`, `catalog.tsx` | Média |
| 5 | O nome e o WhatsApp da vendedora não ficam salvos: o formulário começa vazio em todo pedido. Resolvido pelo login das lojas. | `catalog.tsx` | Baixa |
| 6 | Rotas de experimento `produtos/cards-v2` a `cards-v5` e `card-preview-page.tsx` (1.238 linhas) seguem no código de produção. | `routes/web.php`, `ProductController` | Baixa |
| 7 | Telas muito grandes: `products/index.tsx` (1.751 linhas), `catalog.tsx` (1.597), `product-photo-manager.tsx` (1.466), `product-form.tsx` (1.271), `stock-offer-volume-editor.tsx` (1.078). Dividir ao alterar cada uma. | `resources/js` | Baixa |
| 8 | Não há um código de peça comum entre os sistemas: aqui `CJ-000123` com modelo opcional; no `catalogo`, SKU por tamanho. Lojas, Bling e RFID dependem disso. | Modelo de domínio | Estrutural |
| 9 | Quantidades por tamanho no saco são opcionais. O estoque de uma loja precisa delas. | `StockOfferVolumeItem` | Estrutural |

## Acesso das lojas (proposta)

Pedido do usuário: cada loja com usuário (talvez o WhatsApp) e senha para
entrar e fazer pedidos; senha talvez expirável e sem autopreenchimento do
navegador.

Proposta:

- **Uma conta por vendedora, ligada a uma loja**, e não uma conta por loja.
  Assim o pedido registra quem pediu, e quando uma vendedora sai o admin
  desativa só a conta dela. Uma senha compartilhada pela loja se espalha e não
  pode ser revogada sem afetar todas.
- **Login pelo WhatsApp** (número normalizado, com DDD), como identificador
  único. O e-mail passa a ser opcional para o perfil Loja.
- **Sem senha para lembrar**: o admin gera um link de acesso de uso único,
  com validade curta (por exemplo 24 h), e envia pelo WhatsApp com um link
  `wa.me` (sem integração paga). Ao abrir, a vendedora cadastra uma **passkey**
  no celular (digital ou rosto). O Fortify do projeto já tem passkeys ativas.
  A senha fica como alternativa para quem não puder usar passkey.
- **O que expira é o acesso, não a senha**: o link de convite expira; a sessão
  expira após um período sem uso; desativar a conta encerra as sessões dela.
  Troca periódica obrigatória de senha não é recomendada pelo NIST
  (SP 800-63B): leva a senhas mais fracas.
- **Não bloquear o autopreenchimento**: os navegadores ignoram
  `autocomplete="off"` em senhas, e o gerenciador de senhas ajuda a usar senhas
  fortes. A proteção certa é passkey, limite de tentativas (já existe: 5 por
  minuto) e sessões revogáveis.
- **Catálogo atrás do login**: a loja vem da conta e a vendedora não digita
  nome, loja nem WhatsApp. O catálogo público sem login deixa de criar pedidos
  (decidir se continua visível só para consulta).
- **Permissões**: o perfil Loja vê só o catálogo, os pedidos da própria loja e,
  depois, as remessas e a contagem da loja. Não vê o painel interno.
- Fase opcional: código de uso único pelo WhatsApp (API oficial da Meta). Tem
  custo por mensagem e é uma integração externa nova; avaliar só se o link
  manual der trabalho demais.

Dúvidas: quantas lojas e vendedoras existem; se as lojas são próprias,
franquias ou revendedoras; se o catálogo sem login deve continuar visível.

## Vários estoques (proposta)

- **Locais de estoque**: Fábrica (modelo atual em sacos) e cada Loja, com saldo
  por produto e tamanho. Não levar sacos para as lojas.
- **Remessa**: finalizar um pedido gera uma remessa "Em trânsito" para a loja.
  A loja confirma o recebimento contando as peças; diferenças viram
  divergências. Mesmo padrão do "Recebi" da produção (ADR 0029) e da
  conferência de pedidos.
- A contagem por tamanho precisa acontecer no envio ou no recebimento. Isso
  muda a regra atual de quantidades opcionais e exige ADR.

## Conferência com o estoque das lojas

- Sem dados de vendas: só dá para comparar o enviado com o recebido. Já pega
  erros de expedição.
- Com vendas (por exemplo Bling com um depósito por loja): saldo esperado =
  recebido − vendido ± transferências, comparado com a contagem. O
  `InventoryCount` existente pode passar a contar por local.

## Sistema separado para as lojas?

Recomendação: não. Um **portal da loja no mesmo app** (perfil Loja) evita
sincronizar dois bancos e reaproveita produtos, fotos, login e auditoria. Um
app separado só se as lojas precisarem trabalhar sem internet ou de um caixa
próprio; nesse caso, integrar com o caixa existente.

## Identidade da peça (pré-requisito)

Proposta: alinhar ao padrão de SKU do `catalogo`. O produto do inventário passa
a ter código pai e aparência, e as variantes por tamanho ganham SKU (e GTIN
opcional). Primeiro só um ADR; não muda o fluxo dos sacos.

O documento `docs/produtos-modelos-e-referencias.md` do catálogo define a
aparência como a combinação de cor e lavagem. O vínculo `wash_type_id` do
inventário identifica apenas a lavagem. Antes de criar o ADR, confirme como a
equipe identifica a aparência de cada produto e vincula as referências antigas.

## RFID (proposta)

1. Etiquetas QR/código de barras em lotes e sacos (ambos já têm `code`): ler
   pelo celular para "Recebi" e para expedir. Valida o processo sem hardware.
2. RFID por lote ou saco: leitores nos setores disparam as ações que já
   existem.
3. RFID por peça, aplicado no Acabamento ou no Ensacamento: contagens rápidas
   nas lojas.

Os leitores só enviam leituras para um endpoint idempotente; as regras ficam
no Laravel. RFID só interno não exige GS1; etiquetar com GTIN exige.

## Ordem proposta

| # | Etapa | Depende de |
|---|---|---|
| 0 | Integrar `feat/quadro-producao`, implantar e colocar o painel em uso (problema 1) | — |
| 1 | Cadastro de lojas, `store_id` no pedido (o nome digitado vira cópia histórica) e relatório "para onde vão as peças" (problema 4) | 0 |
| 2 | Acesso das lojas: perfil Loja, login pelo WhatsApp, link de acesso, passkey, catálogo atrás do login (problemas 2, 3 e 5) | 1 |
| 3 | Limpeza: remover as rotas e a tela de experimento dos cards (problema 6) | 0 |
| 4 | ADR de identidade: SKU pai/aparência/tamanho (problema 8) | — |
| 5 | Ficha técnica (implementada) | 0 |
| 6 | Variantes com SKU no produto (problema 8) | 4 |
| 7 | Locais de estoque, remessas, recebimento e contagem pela loja (problema 9) | 2, 6 |
| 8 | Vendas por loja (Bling ou caixa) e conferência completa | 7 |
| 9 | Etiquetas QR/código de barras em lotes e sacos | 0 |
| 10 | RFID por lote/saco, depois por peça | 6, 9 |

O problema 7 (telas grandes) não tem etapa própria: cada tela é dividida
quando outra etapa precisar alterá-la.

## Dúvidas abertas

1. Que sistema as lojas usam para vender hoje (Bling com depósito por loja,
   outro caixa ou nenhum)?
2. As lojas são próprias, franquias ou revendedoras?
3. Um produto do inventário corresponde a "modelo + aparência" do SKU do
   `catalogo`? A lavagem é a aparência?
4. Quem integra com o Bling: só o `catalogo` ou também o inventário?
   Recomendação: um dono só.
5. A grade por tamanho pode ser obrigatória no envio para a loja?
6. O catálogo sem login continua visível só para consulta?
7. Quantas lojas e vendedoras existem? (necessário antes da etapa 2)

## Tentativas que falharam

- Em 23/11/2026, a primeira execução de `composer ci:verify` parou por
  formatação em `.lerd.yaml` e `flow-edge.tsx`. Os dois arquivos foram
  formatados e as verificações estáticas e o build passaram.
- A execução seguinte falhou na conexão dos testes com o PostgreSQL:
  `regente-postgres` não é resolvido pelo PHP no host, e o PostgreSQL na porta
  local padrão rejeitou a credencial da aplicação. Em um PostgreSQL
  descartável, com PHP 8.5, os 440 testes funcionais e unitários passaram.
- A execução completa foi interrompida durante os testes de navegador
  (código 143). O teste do painel em 1366 px também atingiu o tempo limite
  no recebimento de um lote. O cenário passou a esperar pelo lote na etapa
  de Corte antes de confirmar o recebimento.
- Os testes de navegador agora usam o build local mesmo com o Vite em
  execução. Os seis testes de fotos passaram com essa configuração.
- Na rodada seguinte, o seletor de produtos ainda falhou em desktop e um
  rebuild simultâneo invalidou parte da execução. O seletor e o formulário
  agora compartilham a mesma gaveta. Os cinco testes focados de seleção e
  grade passaram em 390, 768 e 1366 px, conforme o cenário.
- A primeira rodada completa passou em 150 de 151 testes de navegador.
  O teste de cadastro de produto consultava o banco antes da confirmação
  do envio. Agora aguarda a confirmação na interface e passou isoladamente.

## Próximo passo

A validação local da etapa 0 em `feat/quadro-producao` foi concluída com
`composer ci:verify` em PHP 8.5 e PostgreSQL descartável. Passaram 440 testes
funcionais e unitários, 151 testes de navegador, a análise estática e o build.
A pedido do usuário, a entrega desta etapa fica local. A integração em
`master` e a implantação seguem pendentes. As etapas dependentes aguardam
esse marco. A etapa 4 aguarda a definição de como vincular a aparência do
inventário à do catálogo.
