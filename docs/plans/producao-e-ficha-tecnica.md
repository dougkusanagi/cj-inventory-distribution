# Plano: painel de produção e ficha técnica

Tipo: tarefa

## Objetivo

Preparar o inventário para evoluir para um PCP em entregas pequenas e úteis:

1. **Painel de produção:** o gerente vê quantas e quais peças estão em cada
   etapa da fábrica (corte, costura, lavagem, tinturaria, acabamento,
   ensacamento).
2. **Ficha técnica (escopo B):** a modelagem define insumos e consumo de cada
   peça sem ver preços; o administrador completa custos, preço de venda e
   aprova.

O plano termina quando as fases 1 a 6 estiverem integradas no `master`. O PCP
completo (ordens de produção, consumo real, roteiro, tempos e custo realizado)
fica para um plano próprio.

## Decisões já tomadas (30/10/2026)

- Os dados do `cj-spec-sheet` são só de teste. Não haverá importação; o
  projeto serve apenas como referência de regras.
- A ficha técnica entra no inventário como módulo novo, ligado ao `Product`
  existente. Não copiar telas nem a estrutura de dados do `cj-spec-sheet`.
- Só o perfil Administrador vê custos, preços e margens.
- Antes do corte existe a etapa de criação/modelagem. Ela pertence à ficha do
  produto, não ao lote: a modelagem define insumos e consumo (metros de cada
  tecido, zíper, botão, etiqueta…) sem ver preços.
- O painel começa na versão "A mínima": lotes com etapa atual. A versão de
  contagem por etapa (B) foi descartada porque seria reescrita depois.
- As etapas são uma pipeline fixa (enum PHP), que representa o fluxo real da
  fábrica. Cadastro configurável de etapas só se houver revenda do sistema.
- Chegar em "Ensacamento" ou "Concluído" **nunca** cria sacos de estoque. Quem
  ensaca continua cadastrando os sacos à mão. O painel só informa quantas peças
  aguardam ensacamento.
- Ficha técnica no escopo B: insumos, custos-base, margem, revisões,
  impressão, lavagem, instruções e preço do insumo com vigência. Consumo por
  tamanho, tabela de medidas e roteiro com tempos ficam para o PCP.

## Decisões tomadas em 03/11/2026

- A lista de etapas está completa. Novas etapas entram por código (novo caso
  no enum e migration, se preciso), sem tabela de etapas.
- Cada setor tem um responsável com login próprio. Ele vê só o que está no
  seu setor e envia para a próxima etapa. Novo perfil `Produção`, com os
  setores atribuídos a cada usuário.
- Editar uma ficha aprovada cria uma **nova revisão** (rev. 2, rev. 3…) em
  rascunho. A modelagem pode criar a nova revisão; só o admin aprova.
- O acréscimo de custo (ex.: "Mão de obra + 10%") é uma regra editável: cada
  custo-base pode ter um acréscimo em porcentagem **ou** em valor absoluto,
  com padrão no catálogo e ajuste na ficha.
- Adicionar uma biblioteca de máscara está autorizado e é obrigatório para
  dinheiro e para todo campo estruturado sem controle nativo:
  `react-number-format` (`NumericFormat` para dinheiro e quantidades,
  `PatternFormat` para padrões fixos), instalada com `bun add`.
- Produção usa PostgreSQL.

## Erros do `cj-spec-sheet` que este plano previne

| Problema encontrado lá | Prevenção aqui | Teste obrigatório |
| --- | --- | --- |
| Duas revisões aprovadas da mesma referência ao mesmo tempo | Aprovar uma revisão torna obsoleta a aprovada anterior na mesma transação, com `lockForUpdate` | Aprovar rev. 2 deixa rev. 1 obsoleta; nunca há duas aprovadas por produto |
| Obsoleta → Aprovada sem nova revisão | Transições definidas num único lugar (enum + action). Obsoleta é estado final | Tentar aprovar uma ficha obsoleta retorna erro |
| Cada revisão é uma cópia inteira do produto | `technical_sheets` separada: `Product 1─N TechnicalSheet`. Produto, fotos, sacos e pedidos não mudam | Criar revisão não altera produto, fotos nem estoque |
| Preço do insumo digitado em cada ficha | Preço no cadastro do insumo, com histórico por data de vigência. Na aprovação, a ficha guarda uma cópia (snapshot) do preço | Mudar o preço do insumo não altera ficha aprovada; altera o cálculo de rascunhos |
| Custos-base só com nome | Custo-base com valor padrão opcional, sugerido ao montar a ficha | Ficha nova recebe o valor padrão; a alteração na ficha não muda o catálogo |
| Campos de estoque mortos no insumo (`stock_quantity`, `minimum_stock`) | O insumo não tem campos de saldo. Saldo de insumo, quando existir, virá de movimentações (como no ADR 0016) | — |
| Valores derivados aceitos do navegador | Custo, lucro e margem são sempre calculados no servidor com `brick/math`. Requests proíbem campos derivados (`prohibited`) | Enviar `costFinal`/`margin` no request é rejeitado |
| Custos escondidos só na tela | Para quem não é admin, preços nem são enviados nas props do Inertia | Props de Modelagem e Estoque não contêm nenhum campo de preço |
| Edição simultânea sobrescrita | Campo `version` com conferência otimista em toda gravação da ficha e em todo avanço de lote | Segunda gravação com versão antiga recebe aviso de conflito |
| Componentes de 1.000–2.000 linhas | Cada tela dividida em componentes desde o início; reutilizar `resources/js/components` e `ui/` | Revisão de código antes de integrar |
| `lucide-react`, `Sheet`, dois gerenciadores de pacote | Seguir o AGENTS.md: Phosphor duotone, `Drawer`, `Button`, `RadioCard`, bun | `composer ci:verify` (lint) |
| Multiempresa desnecessário | Sem organizações. Permissões pelo `UserRole` atual | — |
| Unidade sem conversão | V1 usa a unidade do insumo, sem conversão. A unidade é copiada para a linha da ficha. Conversão fica para o PCP e é registrada como limitação | Linha da ficha rejeita unidade diferente da unidade do insumo |

## Regras gerais de execução

- Uma branch por fase, a partir do `master`. Cada fase é integrada sozinha.
- Antes de integrar: `composer ci:verify` completo, inclusive testes de
  navegador. Não usar o GitHub Actions para validar.
- Cada fase com mudança visível ao usuário recebe fragmento em
  `changelog/unreleased/<slug>.md` e segue o mecanismo de "Histórico de
  novidades" do projeto.
- Cada fase atualiza `README.md`, `docs/ARCHITECTURE.md` e `docs/ROADMAP.md`
  quando a regra de negócio mudar.
- Operações que alteram vários registros usam transação e `lockForUpdate`.
- Novas entidades seguem os ADRs 0015 (exclusão lógica) e 0017 (auditoria via
  `ModelAuditObserver`).
- Interface pensada primeiro para celular: poucos passos, alvos de toque
  `h-11`, feedback imediato, bloqueio de envio duplicado. Verificar com
  capturas em 390 px e em desktop.
- Seeds de demonstração com dados realistas e casos de borda: nomes longos,
  palavras sem espaço, lotes em todas as etapas, etapas vazias, quantidades
  1 e máximas permitidas.

## Passos

### Fase 0 — Confirmações e ADR do painel

- [x] Confirmar a lista final de etapas.
- [x] Confirmar quem avança lotes (responsável de cada setor).
- [x] Confirmar se uma peça pode pular etapas: não pode; a sequência é
      sempre a mesma.
- [x] Trocar o banco local e o dos testes para PostgreSQL no Podman (serviço
      do lerd), igual à produção. Ajustar `.env`, `.env.example`,
      `phpunit.xml` (hoje SQLite em memória), `composer ci:verify` e o
      README. Rodar a suíte completa e corrigir o que depender de SQLite.
      Commit próprio, antes da Fase 1. Motivo: o SQLite ignora
      `lockForUpdate`, então os testes de concorrência só valem em
      PostgreSQL.
- [x] Escrever `docs/adr/0025-painel-de-producao-por-lotes.md`: lote como
      unidade do painel, etapas fixas em enum, painel não cria estoque.

### Fase 1 — Painel de produção ("A mínima")

Branch sugerida: `feat/painel-producao`.

**Dados**

- Enum `App\Enums\ProductionStage` (string): `cutting` (Corte), `sewing`
  (Costura), `washing` (Lavagem), `dyeing` (Tinturaria), `finishing`
  (Acabamento), `bagging` (Ensacamento), `completed` (Concluído). Métodos
  `label()`, `position()` e `canMoveTo(self $target)`.
- Tabela `production_batches`:
  - `code` único, gerado pelo sistema (ex.: `L-000123`);
  - `product_id` com FK explícita, `restrictOnDelete`;
  - `quantity` inteiro positivo, obrigatório;
  - `stage` string (enum), `stage_entered_at`, `completed_at` nulo;
  - `notes` opcional, `version` inteiro, `created_by`, timestamps, soft
    deletes.
- Tabela `production_batch_events` (imutável, no padrão de `order_events`):
  `production_batch_id`, `from_stage` nulo na criação, `to_stage`, `quantity`,
  `actor_id`, `notes`, `occurred_at`. Sem update nem delete.

**Perfil Produção e setores**

- `UserRole::Production` ("Produção"), mais a tabela
  `production_stage_user` (`user_id`, `stage`, único pelo par). Um usuário
  pode responder por mais de um setor, e um setor pode ter mais de um
  responsável.
- O responsável vê o painel filtrado pelos seus setores e só avança lotes que
  estão neles. O Administrador vê e move tudo. Atribuir setores fica na
  gestão de usuários (só admin).
- Quem cria lotes: Administrador e os responsáveis pelo Corte.
- O perfil Produção não acessa estoque, pedidos, catálogo nem custos.

**Regras**

- Criar lote: produto existente e ativo, quantidade > 0. O lote nasce no
  Corte e gera o primeiro evento.
- Avançar: o request envia a etapa de origem e a `version` esperadas. Se não
  conferirem (toque duplo, outra pessoa já moveu), nada muda e a tela avisa
  "Este lote já foi movido para X por Y".
- Só se move para a etapa seguinte, sem pular etapas.
- Na Fase 1, enviar basta: o lote aparece no setor seguinte assim que é
  enviado. A confirmação de recebimento entra na Fase 2. Para isso, o evento
  de envio já guarda quem enviou e quando, e o lote ganha depois
  `received_at`/`received_by`, sem mudar os dados existentes.
- Corrigir engano: "Desfazer último avanço", só para Administrador, com
  motivo obrigatório. Gera um evento novo; não apaga o anterior.
- `Ensacamento → Concluído` pede confirmação e **não** cria nem altera sacos,
  movimentações ou pedidos.
- Excluir lote: só Administrador, só antes de qualquer avanço, exclusão
  lógica.

**Interface** (`/painel/producao`)

- Resumo no topo: peças e lotes por etapa, com "Aguardando ensacamento" em
  destaque.
- Celular: etapas em lista expansível ou abas, com cartões de lote (código,
  produto, quantidade, há quantos dias está na etapa). Desktop: colunas por
  etapa.
- Cartão de lote com ação principal "Avançar para <próxima etapa>" e menu `⋯`
  para ações raras (desfazer, excluir), conforme o padrão de cartões do
  AGENTS.md.
- Detalhes do lote num `Drawer` (`bottom` no celular, `right` no desktop),
  com os eventos em ordem.
- Novo lote num `Drawer`, com busca de produto (combobox) e quantidade.
- Filtro por produto e por etapa, preservado ao voltar.
- Estados vazio, carregando e erro com textos claros.

**Testes**

- Feature: criar, avançar, conflito de versão, avanço para trás rejeitado,
  concluir sem criar saco (contagem de sacos e movimentações inalterada),
  desfazer com motivo, permissões de cada perfil, produto inativo rejeitado.
- Unit: `ProductionStage::canMoveTo`.
- Browser: criar lote e avançar no celular e no desktop.
- Seeder de demonstração com lotes em todas as etapas.

**Critério de aceite:** o gerente abre o painel no celular e vê, por etapa,
quantas peças e quais lotes existem, e a ação de ensacar continua manual.

### Fase 2 — Evolução do painel

Branch sugerida: `feat/painel-producao-oficinas`. Cada item pode ser uma
entrega separada.

- [ ] **Confirmação de recebimento:** o lote enviado aparece como "A
      receber" no setor seguinte até o responsável tocar em "Recebi". O
      painel mostra separados "a receber" e "no setor". Opcional: informar
      quantidade recebida diferente da enviada, com motivo.
- [ ] **Oficinas e terceiros:** cadastro simples (`workshops`: nome, tipo
      costura/lavanderia/tinturaria, ativo). Ao avançar para uma etapa
      externa, escolher a oficina. Mesmo padrão de cadastro rápido do
      `WashType`.
- [ ] **Divisão de lote:** dividir um lote entre oficinas. Os lotes filhos
      guardam `parent_id`; a soma das quantidades é igual ao total do lote
      original, validada no servidor dentro de transação.
- [ ] **Grade opcional por tamanho:** `production_batch_items` (tamanho,
      quantidade). Quando informada, a soma é igual à quantidade do lote.
      Exibir com o componente de mini cards compartilhado
      (`stock-size-breakdown`).
- [ ] **Alerta de lote parado:** destacar lotes há mais de N dias na mesma
      etapa (N fixo em configuração, sem tela de ajuste).
- [ ] **Perdas e retrabalho (avaliar):** registrar peças perdidas num avanço,
      com motivo. Só se o gerente pedir.

### Fase 3 — Perfil Modelagem e catálogos

Branch sugerida: `feat/catalogo-insumos`.

- [ ] ADR `0026-perfil-modelagem-e-confidencialidade-de-custos.md`.
- [ ] `UserRole::Modeling` ("Modelagem"): acessa fichas técnicas e o
      catálogo de insumos sem preços; não acessa estoque, pedidos nem custos.
      Atualizar `UserPolicy`, middlewares, navegação e
      `tests/Feature/UserRoleAccessTest.php`.
- [ ] Catálogo de insumos (`materials`): código gerado, nome, tipo (enum:
      tecido, aviamento, linha, botão, zíper, etiqueta, embalagem), unidade
      (enum: m, cm, un, par, kg, g), ativo, soft deletes. Sem campos de saldo.
      Insumo inativo continua nas fichas existentes, mas não entra em fichas
      novas.
- [ ] Preços do insumo (`material_prices`): `material_id`, `unit_price`
      decimal(12,4), `effective_from`, `created_by`. Só Administrador vê e
      cadastra. O preço vigente é o mais recente com `effective_from <= hoje`.
- [ ] Custos-base (`cost_items`): nome, valor padrão opcional (admin), ativo,
      e acréscimo padrão opcional: `surcharge_type` (`percent` ou `fixed`) e
      `surcharge_value`. Ex.: Mão de obra R$ 8,20 + 10% = R$ 9,02; ou
      R$ 8,20 + R$ 0,80 = R$ 9,00. Porcentagem não negativa, com limite
      definido na validação.
- [ ] Instalar `react-number-format` com `bun add` e criar componentes
      compartilhados em `resources/js/components/ui`: `MoneyInput` (BRL,
      `pt-BR`, entrada bancária pela menor unidade: `3950` → `39,50`),
      `QuantityInput` (até 3 casas, sem negativos) e `PercentInput`. Usar
      `type="text" inputmode="numeric"`. O valor enviado ao servidor é
      decimal sem formatação; a validação no servidor continua obrigatória.

### Fase 4 — Ficha técnica (escopo B)

Branch sugerida: `feat/ficha-tecnica`.

- [ ] ADR `0027-ficha-tecnica-versionada.md` e ADR
      `0028-preco-de-insumo-com-vigencia.md`.
- [ ] `technical_sheets`: `product_id` (FK), `revision`, `status`
      (`draft`, `in_review`, `approved`, `obsolete`), `version`,
      `instructions` (texto), `approved_by/at`, `obsoleted_by/at`,
      `created_by`, timestamps. Único por (`product_id`, `revision`).
- [ ] `technical_sheet_materials`: `technical_sheet_id`, `material_id`
      (`restrictOnDelete`), `role` (componente da peça / opção de tecido),
      `quantity` decimal(12,3) > 0, cópia de `unit` e `material_name`,
      `sort_order`; e, só preenchidos pelo admin, `unit_price_snapshot` e
      `sale_price` (por opção de tecido).
- [ ] `technical_sheet_costs`: `technical_sheet_id`, `cost_item_id`, `amount`,
      `surcharge_type` e `surcharge_value` (copiados do catálogo e editáveis
      na ficha). O valor final da linha é calculado no servidor.
- [ ] Garantir no banco uma única revisão aprovada por produto: índice único
      parcial em (`product_id`) onde `status = 'approved'` (PostgreSQL e
      SQLite aceitam), além da regra na action.
- [ ] A lavagem vem do `wash_type_id` do produto. A ficha mostra a lavagem,
      mas não duplica o campo.
- [ ] A foto vem da galeria do produto (media library). A ficha não tem foto
      própria.
- [ ] Fluxo de status num único lugar:
  - Rascunho → Em revisão (Modelagem ou Admin).
  - Em revisão → Rascunho (Admin devolve, com motivo).
  - Em revisão → Aprovada (Admin, com custos preenchidos). Na mesma
    transação: copia os preços vigentes para a ficha e torna obsoleta a
    revisão aprovada anterior.
  - Aprovada → Obsoleta (Admin).
  - "Criar nova revisão" a partir da aprovada (Modelagem ou Admin) gera a
    próxima revisão em rascunho, copiando insumos, instruções e custos. A
    aprovada continua valendo até a nova ser aprovada. Só pode existir uma
    revisão em rascunho ou em revisão por produto. Obsoleta é estado final.
- [ ] `CalculateTechnicalSheetCost` com `brick/math`: arredondamento
      `HalfUp` a 2 casas por operação monetária, como no `cj-spec-sheet`. O
      frontend só mostra uma prévia; o servidor recalcula ao salvar e ao
      exibir.
- [ ] Props separadas: dados técnicos para todos com acesso e um bloco
      `costs` incluído só para Administrador.
- [ ] Telas: lista de fichas por produto, formulário dividido em seções
      (identificação, insumos, instruções, custos só admin), histórico de
      revisões num `Drawer`.
- [ ] Testes: transições válidas e inválidas, uma única aprovada por
      produto, snapshot de preço, confidencialidade nas props e nas rotas,
      conflito de versão, insumo inativo, unidade divergente, campos
      derivados proibidos, envio vazio e edição de registro existente.

### Fase 5 — Impressões

Branch sugerida: `feat/ficha-tecnica-impressao`.

- [ ] Impressão técnica (sem preços), para todos com acesso à ficha.
- [ ] Impressão de custo (só Administrador).
- [ ] Ficha em branco para preenchimento à mão.
- [ ] CSS de impressão A4, alto contraste, sem botões nem campos. A
      impressão usa o estado atual da tela e mostra "Alterações não salvas"
      quando for o caso.
- [ ] Teste de navegador para os três modos e para a ausência de preços na
      impressão técnica.

### Fase 6 — Integrações leves

- [ ] O lote guarda a ficha aprovada vigente no momento da criação
      (`technical_sheet_id` nulo para lotes sem ficha). Mudanças posteriores
      na ficha não alteram o lote.
- [ ] No cadastro manual de um saco, permitir indicar o lote de origem
      (opcional), para abater "aguardando ensacamento". O saco nunca é criado
      automaticamente.

## Revisão ou variante

- **Revisão** substitui a versão anterior da mesma peça (correção de
  consumo, troca de fornecedor). Só uma revisão vale para produzir, e aprovar
  a nova torna a anterior obsoleta.
- **Variante em teste** (ex.: com fita de enviés) é outra peça à venda: ela
  precisa de estoque, sacos, pedidos e vendas próprios para comparar qual
  sai mais. Proposta: ação "Duplicar como novo produto", que cria um produto
  com código novo e copia a ficha aprovada como rascunho. As duas peças
  ficam aprovadas ao mesmo tempo e podem ser produzidas juntas.
- Alternativa em avaliação: permitir várias revisões aprovadas no mesmo
  produto e escolher a revisão ao criar o lote. Ponto contra: estoque e
  pedidos não separam as versões, então não dá para medir qual vende mais.

## Fora deste plano (PCP)

Ordens de produção, consumo real de insumos, estoque de insumos por
movimentação, consumo por tamanho, tabela de medidas, roteiro com tempo
padrão, apontamentos, custo realizado, RFID e integração com Bling.

## Tentativas que falharam

- A primeira suíte PostgreSQL revelou expectativas de IDs sequenciais, transações abortadas após violações de unicidade e ausência de Bash no contêiner. Os testes afetados foram corrigidos e passam no host; a primeira execução de navegador também revelou expectativas de IDs, corrigidas e verificadas. A conferência completa foi reiniciada no host.

## Dúvidas abertas

- Versões em teste de venda (ex.: a mesma calça com e sem fita de enviés):
  usar "Duplicar como novo produto" (recomendado) ou permitir mais de uma
  revisão aprovada por produto? Ver a seção "Revisão ou variante".

## Próximo passo

A Fase 1 passou em `composer ci:verify` no PostgreSQL: 398 testes funcionais e
unitários e 117 testes de navegador, além de formatadores, análises e build.
Revisar e integrar a branch `feat/painel-producao` antes da Fase 2. O SQLite
anterior permanece no disco, sem importação.
