# Tasklist — Estoque por saco

Esta lista é a fonte de verdade do andamento da refatoração. Uma tarefa pode
estar `blocked`, `ready`, `in_progress` ou `done`.

## Regras de execução

- escolha somente uma tarefa `ready` cujas dependências estejam `done`;
- mantenha no máximo uma tarefa `in_progress` por agente;
- não marque uma tarefa como `done` sem atender seus critérios de aceite;
- registre os comandos de verificação e o commit, quando existir;
- ao concluir uma tarefa, libere para `ready` as tarefas cujas dependências
  estiverem integralmente concluídas;
- não reescreva ADRs aceitos: crie um ADR superseding;
- não remova tabelas ou colunas antigas antes da auditoria do backfill;
- descobertas fora do escopo entram em “Pendências descobertas”, sem ampliar
  silenciosamente a tarefa atual.

## R0 — Decisões e proteção do comportamento atual

- [ ] **SV000 — Fechar regras de domínio pendentes** (`ready`)
  - Saída: decisões D1–D4 de `README.md` confirmadas ou ajustadas.
  - Aceite: regra de `Grade Nova`, migração legada, fonte do total e vínculo de
    pedido não possuem interpretações concorrentes.
  - Evidência: decisões registradas no log desta tasklist.

- [ ] **SV001 — Aceitar ADR superseding** (`blocked`, depende de SV000)
  - Saída: [ADR 0009](../../adr/0009-stock-by-volume.md) revisado e com status
    `Accepted`.
  - Aceite: o ADR identifica explicitamente quais partes dos ADRs 0001, 0004,
    0006 e 0008 foram substituídas, quais permanecem válidas e as decisões
    D1–D4 confirmadas.
  - Docs: `docs/adr/0009-stock-by-volume.md`, `docs/adr/README.md`.

- [ ] **SV002 — Caracterizar o comportamento existente** (`blocked`, depende de SV001)
  - Saída: testes de regressão para criação, edição, visibilidade, total manual,
    total por tamanho e encerramento do estoque atual.
  - Aceite: testes passam antes da troca do schema e protegem todas as regras
    que devem sobreviver à refatoração.
  - Verificação: teste Pest específico de produtos.

**Portão R0:** decisões aceitas e comportamento preservado por testes.

## R1 — Schema aditivo e migração de dados

- [ ] **SV010 — Criar tabelas de sacos e tamanhos** (`blocked`, depende de SV002)
  - Saída: migrations, modelos e factories de `StockOfferVolume` e
    `StockOfferVolumeItem`.
  - Aceite: foreign keys explícitas, cascatas, ordenação, unicidade do tamanho
    por saco e casts seguem as convenções do projeto.
  - Verificação: migrations fresh e testes de relacionamentos/constraints.

- [ ] **SV011 — Implementar backfill não destrutivo** (`blocked`, depende de SV010)
  - Saída: migration ou comando idempotente que converte dados legados conforme
    a estratégia definida em SV000.
  - Aceite: nenhum total é multiplicado; casos ambíguos são identificáveis; uma
    segunda execução não duplica sacos nem itens.
  - Verificação: fixtures para oferta sem sacos, com um saco e com vários sacos.

- [ ] **SV012 — Auditar o backfill** (`blocked`, depende de SV011)
  - Saída: consultas/testes que comparam total legado e soma dos novos sacos e
    identificam ofertas pendentes de reconciliação.
  - Aceite: contagem de ofertas, totais e casos ambíguos estão registrados; não
    há divergência silenciosa.
  - Verificação: relatório reproduzível e testes do processo de auditoria.

**Portão R1:** novo schema preenchido e dados antigos auditados, sem remoções.

## R2 — Escrita e regras de domínio

- [ ] **SV020 — Validar payload de sacos** (`blocked`, depende de SV010)
  - Saída: Form Request normaliza e valida sacos e seus tamanhos.
  - Aceite: cobre total obrigatório, quantidades opcionais, tamanhos distintos
    por saco, valores não negativos e estruturas inválidas.
  - Verificação: testes HTTP de sucesso e de cada falha relevante.

- [ ] **SV021 — Sincronizar oferta e sacos atomicamente** (`blocked`, depende de SV020)
  - Saída: action de sincronização substitui a lógica agregada atual.
  - Aceite: criação, edição, reordenação e remoção preservam IDs existentes
    quando possível; falhas fazem rollback integral.
  - Verificação: testes de criação, atualização, remoção e rollback.

- [ ] **SV022 — Calcular totais no servidor** (`blocked`, depende de SV021)
  - Saída: total de cada saco segue o modo manual/por tamanho e o total da
    oferta/produto é uma soma dos sacos.
  - Aceite: payload divergente não consegue persistir total incorreto e
    quantidades nulas continuam válidas.
  - Verificação: testes para modo manual, soma, zero, `null` e múltiplos sacos.

**Portão R2:** todas as novas gravações usam sacos como fonte de verdade.

## R3 — Leituras, catálogo e indicadores

- [ ] **SV030 — Expor sacos no ProductResource** (`blocked`, depende de SV022)
  - Saída: recurso retorna cada saco, sua grade, seu total e o total agregado.
  - Aceite: contrato TypeScript correspondente e ausência de queries N+1.
  - Verificação: assertions Inertia e inspeção do número de queries quando útil.

- [ ] **SV031 — Atualizar disponibilidade do catálogo** (`blocked`, depende de SV030)
  - Saída: escopo de catálogo usa existência e soma dos sacos.
  - Aceite: oferta oculta, produto oculto, oferta vazia e oferta com estoque são
    classificados corretamente para todos os tipos.
  - Verificação: testes do scope e dos estados exibidos.

- [ ] **SV032 — Atualizar dashboard e listagem** (`blocked`, depende de SV030)
  - Saída: indicadores e cards usam totais e quantidade de sacos reais.
  - Aceite: agregações não duplicam valores por join e paginação permanece
    funcional.
  - Verificação: testes de dashboard e catálogo administrativo.

**Portão R3:** nenhuma leitura funcional depende do contador ou total legado.

## R4 — Formulário mobile-first

- [ ] **SV040 — Refatorar estado e tipos do formulário** (`blocked`, depende de SV030)
  - Saída: tipos React e estado do `useForm` representam a coleção de sacos.
  - Aceite: edição reconstitui fielmente sacos, tamanhos, presença, quantidades e
    ordem recebidos do servidor.
  - Verificação: TypeScript e build do frontend.

- [ ] **SV041 — Criar editor de sacos** (`blocked`, depende de SV040)
  - Saída: interface permite adicionar, duplicar, reordenar e remover sacos.
  - Aceite: cada saco edita sua própria grade; ações destrutivas pedem
    confirmação; componentes shadcn existentes são reutilizados.
  - Verificação: lint/build e roteiro manual em viewport móvel.

- [ ] **SV042 — Exibir totais e feedback de disponibilidade** (`blocked`, depende de SV041)
  - Saída: total do saco e total geral têm feedback imediato, sem criar outra
    fonte de verdade no cliente.
  - Aceite: modo manual/por tamanho é compreensível, erros aninhados levam ao
    campo correto e estados claro/escuro permanecem legíveis.
  - Verificação: lint/build e roteiro manual de sucesso e validação.

**Portão R4:** cadastro e edição completos funcionam em celular e desktop.

## R5 — Corte da estrutura antiga

- [ ] **SV050 — Reconciliar casos legados ambíguos** (`blocked`, depende de SV012 e SV042)
  - Saída: todas as ofertas sinalizadas pelo backfill foram distribuídas em
    sacos reais ou encerradas conscientemente.
  - Aceite: auditoria retorna zero casos pendentes.
  - Evidência: resultado da auditoria registrado no log.

- [ ] **SV051 — Remover escrita e leitura de compatibilidade** (`blocked`, depende de SV031, SV032 e SV050)
  - Saída: código não usa mais `StockOffer.volumes`,
    `StockOffer.total_quantity`, `StockOfferItem` ou `ProductVariant`.
  - Aceite: busca no repositório encontra apenas migrations/documentação
    histórica e nenhum contrato público legado permanece sem justificativa.
  - Verificação: `rg`, testes relacionados, lint e build.

- [ ] **SV052 — Remover schema legado** (`blocked`, depende de SV051)
  - Saída: migration remove colunas/tabelas antigas na ordem compatível com as
    foreign keys.
  - Aceite: migrate, rollback previsto pela estratégia, migrate fresh e testes
    passam sem perda dos dados novos.
  - Verificação: testes de migration e suíte relacionada.

- [ ] **SV053 — Atualizar documentação definitiva** (`blocked`, depende de SV052)
  - Saída: `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` e índice de ADRs
    descrevem somente o modelo vigente.
  - Aceite: não há regra ativa dizendo que grade pertence ao produto ou que
    volumes são um contador agregado.

- [ ] **SV054 — Verificação final da refatoração** (`blocked`, depende de SV053)
  - Saída: formatter, testes relacionados, análise TypeScript e build executados.
  - Aceite: todos passam; riscos restantes e resultado da migração estão
    registrados; nenhuma tarefa obrigatória permanece aberta.

**Portão R5:** estrutura antiga removida e documentação alinhada ao código.

## Pendências descobertas

Registre aqui problemas encontrados que não pertencem à tarefa em andamento:

```text
YYYY-MM-DD | origem | descrição | decisão (nova tarefa/backlog/descartada)
```

Nenhuma pendência registrada.

## Registro de execução

Ao iniciar ou concluir uma tarefa, acrescente uma linha sem apagar o histórico:

```text
YYYY-MM-DD | SVNNN | status | agente | commit | verificações/observação
```

Registro inicial:

```text
2026-09-04 | planejamento | created | Codex | — | rastreador criado; SV000 liberada
```
