# Tasklist — Estoque por saco

Esta lista é a fonte de verdade do andamento da refatoração. Uma tarefa pode
estar `blocked`, `ready`, `in_progress` ou `done`.

## Escopo vigente

O sistema ainda não foi lançado e não possui ambiente de produção. O corte foi
feito diretamente no modelo canônico; backfill e reconciliação de dados legados
não fazem parte do estado final.

## Regras de execução

- escolha somente uma tarefa `ready` cujas dependências estejam `done`;
- mantenha no máximo uma tarefa `in_progress` por agente;
- não marque uma tarefa como `done` sem atender seus critérios de aceite;
- registre os comandos de verificação e o commit, quando existir;
- ao concluir uma tarefa, libere para `ready` as tarefas cujas dependências
  estiverem integralmente concluídas;
- não reescreva ADRs aceitos: crie um ADR superseding;
- não mantenha estruturas antigas apenas por compatibilidade sem consumidor;
- descobertas fora do escopo entram em “Pendências descobertas”, sem ampliar
  silenciosamente a tarefa atual.

## R0 — Decisões e proteção do comportamento atual

- [x] **SV000 — Fechar regras de domínio pendentes** (`done`)
  - Saída: decisões D1–D4 de `README.md` confirmadas ou ajustadas.
  - Aceite: regra de `Grade Nova`, fonte do total e vínculo de pedido não
    possuem interpretações concorrentes.
  - Evidência: decisões registradas no log desta tasklist.

- [x] **SV001 — Aceitar ADR superseding** (`done`)
  - Saída: [ADR 0009](../../adr/0009-stock-by-volume.md) revisado e com status
    `Accepted`.
  - Aceite: o ADR identifica explicitamente quais partes dos ADRs 0001, 0004,
    0006 e 0008 foram substituídas, quais permanecem válidas e as decisões
    D1–D4 confirmadas.
  - Docs: `docs/adr/0009-stock-by-volume.md`, `docs/adr/README.md`.

- [x] **SV002 — Caracterizar o comportamento existente** (`done`)
  - Saída: testes de regressão para criação, edição, visibilidade, total manual,
    total por tamanho e encerramento do estoque atual.
  - Aceite: testes passam antes da troca do schema e protegem todas as regras
    que devem sobreviver à refatoração.
  - Verificação: teste Pest específico de produtos.

**Portão R0:** decisões aceitas e comportamento preservado por testes.

## R1 — Schema canônico e verificação do ambiente

- [x] **SV010 — Criar tabelas de sacos e tamanhos** (`done`)
  - Saída: migrations, modelos e factories de `StockOfferVolume` e
    `StockOfferVolumeItem`.
  - Aceite: foreign keys explícitas, cascatas, ordenação, unicidade do tamanho
    por saco e casts seguem as convenções do projeto.
  - Verificação: migrations fresh e testes de relacionamentos/constraints.

- [x] **SV011 — Confirmar que backfill não se aplica** (`done`)
  - Saída: decisão de corte direto para um sistema ainda não lançado.
  - Aceite: não existe base publicada com ofertas a converter e nenhuma
    migration de backfill permanece na instalação.
  - Verificação: schema canônico validado em instalação limpa de testes.

- [x] **SV012 — Verificar integridade das ofertas físicas** (`done`)
  - Saída: comando de verificação das ofertas ativas sem saco físico.
  - Aceite: o ambiente dev não possui ofertas pendentes nem dados legados para
    reconciliação.
  - Verificação: relatório JSON retornou zero ofertas e zero pendências.

**Portão R1:** schema canônico criado e ambiente sem dados a migrar.

## R2 — Escrita e regras de domínio

- [x] **SV020 — Validar payload de sacos** (`done`)
  - Saída: Form Request normaliza e valida sacos e seus tamanhos.
  - Aceite: cobre total obrigatório, quantidades opcionais, tamanhos distintos
    por saco, valores não negativos e estruturas inválidas.
  - Verificação: testes HTTP de sucesso e de cada falha relevante.

- [x] **SV021 — Sincronizar oferta e sacos atomicamente** (`done`)
  - Saída: action de sincronização substitui a lógica agregada atual.
  - Aceite: criação, edição, reordenação e remoção preservam IDs existentes
    quando possível; falhas fazem rollback integral.
  - Verificação: testes de criação, atualização, remoção e rollback.

- [x] **SV022 — Calcular totais no servidor** (`done`)
  - Saída: total de cada saco segue o modo manual/por tamanho e o total da
    oferta/produto é uma soma dos sacos.
  - Aceite: payload divergente não consegue persistir total incorreto e
    quantidades nulas continuam válidas.
  - Verificação: testes para modo manual, soma, zero, `null` e múltiplos sacos.

**Portão R2:** todas as novas gravações usam sacos como fonte de verdade.

## R3 — Leituras, catálogo e indicadores

- [x] **SV030 — Expor sacos no ProductResource** (`done`)
  - Saída: recurso retorna cada saco, sua grade, seu total e o total agregado.
  - Aceite: contrato TypeScript correspondente e ausência de queries N+1.
  - Verificação: assertions Inertia e inspeção do número de queries quando útil.

- [x] **SV031 — Atualizar disponibilidade do catálogo** (`done`)
  - Saída: escopo de catálogo usa existência e soma dos sacos.
  - Aceite: oferta oculta, produto oculto, oferta vazia e oferta com estoque são
    classificados corretamente para todos os tipos.
  - Verificação: testes do scope e dos estados exibidos.

- [x] **SV032 — Atualizar dashboard e listagem** (`done`)
  - Saída: indicadores e cards usam totais e quantidade de sacos reais.
  - Aceite: agregações não duplicam valores por join e paginação permanece
    funcional.
  - Verificação: testes de dashboard e catálogo administrativo.

**Portão R3:** nenhuma leitura funcional depende do contador ou total legado.

## R4 — Formulário mobile-first

- [x] **SV040 — Refatorar estado e tipos do formulário** (`done`)
  - Saída: tipos React e estado do `useForm` representam a coleção de sacos.
  - Aceite: edição reconstitui fielmente sacos, tamanhos, presença, quantidades e
    ordem recebidos do servidor.
  - Verificação: TypeScript e build do frontend.

- [x] **SV041 — Criar editor de sacos** (`done`)
  - Saída: interface permite adicionar, duplicar, reordenar e remover sacos.
  - Aceite: cada saco edita sua própria grade; ações destrutivas pedem
    confirmação; componentes shadcn existentes são reutilizados.
  - Verificação: lint/build e roteiro manual em viewport móvel.

- [x] **SV042 — Exibir totais e feedback de disponibilidade** (`done`)
  - Saída: total do saco e total geral têm feedback imediato, sem criar outra
    fonte de verdade no cliente.
  - Aceite: modo manual/por tamanho é compreensível, erros aninhados levam ao
    campo correto e estados claro/escuro permanecem legíveis.
  - Verificação: lint/build e roteiro manual de sucesso e validação.

**Portão R4:** cadastro e edição completos funcionam em celular e desktop.

## R5 — Corte direto da estrutura antiga

- [x] **SV050 — Confirmar ausência de dados legados** (`done`, depende de SV012 e SV042)
  - Saída: confirmação de que o ambiente de desenvolvimento não possui ofertas
    nem casos legados para reconciliar.
  - Aceite: não existe ambiente de produção ou base publicada a ser migrada.
  - Evidência: auditoria local retornou zero ofertas e zero pendências.

- [x] **SV051 — Remover escrita e leitura de compatibilidade** (`done`, depende de SV031, SV032 e SV050)
  - Saída: código não usa mais `StockOffer.volumes`,
    `StockOffer.total_quantity`, `StockOfferItem` ou `ProductVariant`.
  - Aceite: nenhum modelo, factory, contrato público ou leitura funcional
    legada permanece.
  - Verificação: `rg`, testes relacionados, lint e build.

- [x] **SV052 — Remover schema legado** (`done`, depende de SV051)
  - Saída: migrations de instalação criam somente as tabelas canônicas; uma
    migration de limpeza atualiza bancos locais intermediários.
  - Aceite: tabelas e colunas antigas não existem no schema dev e não há
    `down()` que reconstrua compatibilidade.
  - Verificação: testes de migration e suíte relacionada.

- [x] **SV053 — Atualizar documentação definitiva** (`done`, depende de SV052)
  - Saída: `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` e índice de ADRs
    descrevem somente o modelo vigente.
  - Aceite: não há regra ativa dizendo que grade pertence ao produto ou que
    volumes são um contador agregado.

- [x] **SV054 — Verificação final da refatoração** (`done`, depende de SV053)
  - Saída: formatter, testes relacionados, análise TypeScript e build executados.
  - Aceite: verificações executadas; limitações do ambiente, como a extensão GD
    ausente, estão registradas; nenhuma tarefa obrigatória permanece aberta.

**Portão R5:** estrutura antiga removida e documentação alinhada ao código.

## Pendências descobertas

Registre aqui problemas encontrados que não pertencem à tarefa em andamento:

```text
YYYY-MM-DD | origem | descrição | decisão (nova tarefa/backlog/descartada)
```

2026-09-04 | SV002 | ambiente | testes de imagens dependem da extensão GD, ausente no ambiente atual | executar novamente no CI/ambiente com GD

## Registro de execução

Ao iniciar ou concluir uma tarefa, acrescente uma linha sem apagar o histórico:

```text
YYYY-MM-DD | SVNNN | status | agente | commit | verificações/observação
```

Registro inicial:

```text
2026-09-04 | planejamento | created | Codex | — | rastreador criado; SV000 liberada
2026-09-04 | SV000 | in_progress | Codex | — | decisões D1–D4 confirmadas para implementação; início da refatoração no worktree existente
2026-09-04 | SV000 | done | Codex | — | D1: todos os tipos usam sacos; D2: backfill sem multiplicação e reconciliação explícita; D3: soma dos sacos; D4: pedido futuro referencia o saco
2026-09-04 | SV001 | done | Codex | — | ADR 0009 aceito e índice atualizado
2026-09-04 | SV002 | in_progress | Codex | — | regressão existente executada; falhas de imagens dependem da extensão GD ausente no ambiente
2026-09-04 | SV002 | done | Codex | — | regressão legada e novos cenários de sacos cobertos; testes de imagem permanecem condicionados à extensão GD
2026-09-04 | SV010 | done | Codex | — | tabelas, foreign keys, ordenação, unicidade, modelos, casts e factories adicionados
2026-09-04 | SV011 | done | Codex | — | backfill idempotente cria um saco de reconciliação sem multiplicar totais e marca multi-saco legado
2026-09-04 | SV012 | done | Codex | — | comando stock-offers:audit-volumes com saída tabular/JSON e testes de divergência/ambiguidade
2026-09-04 | SV020 | done | Codex | — | payload normalizado, totais manuais, quantidades opcionais e unicidade de tamanho por saco validados
2026-09-04 | SV021 | done | Codex | — | sincronização transacional com preservação de IDs, reordenação, remoção e compatibilidade controlada
2026-09-04 | SV022 | done | Codex | — | totais por saco e da oferta recalculados no servidor, inclusive zero e null
2026-09-04 | SV030 | done | Codex | — | ProductResource e tipos React expõem sacos, grades, totais e contagem física
2026-09-04 | SV031 | done | Codex | — | catálogo usa soma/existência de sacos e mantém fallback somente durante a transição
2026-09-04 | SV032 | done | Codex | — | dashboard e listagem usam totais físicos e exibem contagem real de sacos
2026-09-04 | SV040 | done | Codex | — | estado do formulário migrado para stock_volumes
2026-09-04 | SV041 | done | Codex | — | editor mobile-first permite adicionar, duplicar, reordenar, remover e confirmar ações destrutivas
2026-09-04 | SV042 | done | Codex | — | feedback imediato por saco/oferta e foco em erros aninhados implementados
2026-09-04 | SV042 | revalidated | Codex | — | PHPStan, ESLint, TypeScript, Prettier dos arquivos alterados e build passaram; testes funcionais de sacos passaram; testes de imagem seguem condicionados à GD ausente; migração de produção não foi forçada e auditoria local não encontrou ofertas
2026-09-04 | SV050 | done | Codex | — | ambiente dev confirmado sem ofertas; não existe ambiente de produção e não há casos legados para reconciliar
2026-09-04 | SV051 | done | Codex | — | modelos, factories, actions, requests, resources, controllers, frontend e testes usam somente sacos físicos
2026-09-04 | SV052 | done | Codex | — | migrations antigas removidas da instalação; migration de limpeza aplicada no banco dev; stock_offers e stock_offer_volumes ficaram somente com o schema canônico
2026-09-04 | SV053 | done | Codex | — | arquitetura, roadmap, desenvolvimento, tasklist e ADR 0010 atualizados para o corte direto
2026-09-04 | SV054 | done | Codex | — | testes não relacionados a imagens passaram; falhas restantes dependem da extensão GD ausente
2026-09-04 | SV054 | revalidated | Codex | — | Pest: 76/92 passaram e 16 testes de imagem foram bloqueados pela GD ausente; Pint, PHPStan, ESLint, TypeScript, Prettier dos arquivos alterados e build passaram; Prettier global ainda aponta três arquivos preexistentes fora do escopo
```
