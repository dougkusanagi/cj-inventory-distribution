# Plano: painel de produção em uso na fábrica

Tipo: tarefa

## Objetivo

Entregar informação de produção aos gerentes da fábrica, em uso real:

1. Cada setor vê a lista dos lotes (produto e quantidade) que chegaram nele,
   confirma o recebimento e envia o lote para o setor seguinte. O fluxo
   começa no Corte e termina no Ensacamento, que envia o lote para o
   estoque.
2. Na mesma tela, o administrador vê o que há em todos os setores, quantas
   peças e há quanto tempo cada lote está ali. No desktop, os setores ficam
   em colunas lado a lado (quadro horizontal); no celular, um abaixo do outro.

O plano termina quando o painel estiver implantado em produção, com os
responsáveis de cada setor usando o próprio login, e as correções do primeiro
uso real estiverem integradas.

A ficha técnica, o perfil Modelagem e os catálogos de insumos e custos seguem
no [plano da ficha técnica](ficha-tecnica.md).

## Prioridades atuais

1. Implantar o painel de produção. Concluído no commit `ac82880`.
2. Entregar as fichas técnicas e o vínculo com os lotes.
3. Colocar o painel em uso com os responsáveis de cada setor e recolher o
   retorno da equipe.

## O que já existe (no `master`, PRs #71 e #72)

- Tela `/painel/producao` com lotes por setor (`ProductionBatch`), etapas
  fixas no enum `ProductionStage` e histórico de eventos.
- Perfil `Produção`: cada usuário vê só os setores atribuídos a ele, confirma
  o recebimento ("Recebi") e envia o lote ao setor seguinte. O admin vê e move
  tudo.
- Resumo por setor (peças, lotes, "a receber" e "no setor") e "N dias nesta
  etapa" em cada lote.
- Oficinas, divisão de lote entre oficinas e grade opcional por tamanho.
- Banco local e de testes em PostgreSQL, igual à produção.
- Fora do `master`: aviso de lote parado (mais de 5 dias na mesma etapa) na
  branch `feat/alerta-lote-parado`, commit `500fd18`.

## Decisões

- O último setor continua **Ensacamento**. Sua ação é **"Enviar para o
  estoque"**, e o lote termina em **"No estoque"** (antes "Concluído").
- O valor gravado no banco continua `completed`; muda só o texto exibido.
  Assim não há migração de dados.
- Chegar em "No estoque" **não** cria sacos, movimentações nem pedidos. Quem
  ensaca continua cadastrando os sacos à mão.
- Sem pular setores: o lote só vai para o setor seguinte.

## Passos

### 1. Integrar o que está pronto

- [ ] Integrar `feat/alerta-lote-parado`, `feat/menu-superior` e
      `feat/quadro-producao` no `master` (precisa de autorização para push e
      merge). `feat/quadro-producao` já contém os outros dois.

### 2. Fim do fluxo: "Enviar para o estoque" e "No estoque"

Branch sugerida: `feat/producao-no-estoque`.

- [x] Trocar o rótulo de `ProductionStage::Completed` para "No estoque" no
      enum e no mapa de rótulos da tela.
- [x] No Ensacamento, o botão passa a ser "Enviar para o estoque", e a
      confirmação explica que os sacos continuam sendo cadastrados à mão.
- [x] Revisar os textos que citam "Concluído" (tela, toasts, seeders, README,
      `docs/ARCHITECTURE.md`, ADR 0025 se necessário) e os testes que dependem
      deles. O ADR 0025 (aceito) não foi editado: o valor gravado continua
      `completed` e só o texto exibido mudou.
- [x] Teste: enviar para o estoque não altera sacos, movimentações nem
      pedidos (já existe para "Concluído"; ajustar o texto).

### 3. Quadro horizontal do admin no desktop

Branch: `feat/quadro-producao` (inclui `feat/menu-superior` e
`feat/alerta-lote-parado`).

- [x] No desktop (`md` ou mais), cada setor é uma coluna lado a lado, na
      ordem do fluxo, com rolagem horizontal só no quadro. O topo da coluna
      mostra peças, lotes, "a receber", "no setor" e lotes parados.
- [x] Cada coluna tem altura limitada à tela e rola por dentro, para a barra
      de rolagem horizontal ficar sempre ao alcance.
- [x] Os cartões de resumo do topo da página saíram; o resumo fica no topo
      de cada coluna (no celular, no topo de cada setor).
- [x] O cartão do lote usa container queries: em coluna estreita, a ação
      fica abaixo do título; em cartão largo, ao lado do título.
- [x] Com um ou dois setores visíveis, as colunas ocupam a largura
      disponível. O filtro "Etapa" some para quem tem um setor só.
- [x] Testes de navegador do quadro (admin no desktop e no celular,
      responsável de um setor) e capturas em 390, 1366 e 1920 px.

### 4. Implantar e colocar em uso

- [x] Rodar a conferência completa, implantar com `./deploy.sh` e verificar
      as migrations e a resposta HTTP em produção.
- [ ] Entregar as fichas técnicas e o vínculo com os lotes antes de iniciar
      o uso na fábrica.
- [ ] Criar os logins dos responsáveis de cada setor (perfil Produção) e
      atribuir os setores. Precisa da lista de nomes e setores.
- [ ] Acompanhar a primeira semana de uso e anotar neste plano o que os
      setores e o gerente pedirem.

### 5. Correções do primeiro uso

- [ ] Itens a definir com o retorno do passo 4.

## Ideias para avaliar

### Fluxo em canvas: feito em 16/11/2026

A visão Fluxo (`/painel/producao/fluxo`) foi feita ao lado do Quadro (ADR
0033). Melhorias que ficaram para depois do uso real:

- Abrir direto na visão em lista para quem tem um setor só.
- Carregar o histórico do lote só ao abrir a gaveta, para as páginas abrirem
  mais rápido.
- Borda do lote que esquenta aos poucos até o limite de lote parado.
- Subgrupos por oficina em Costura, Lavagem e Tinturaria.
- Lote que desliza até o setor seguinte depois de avançar.
- Modo TV (tela cheia, sem menu) para um monitor na fábrica.

## Fora deste plano

- Ficha técnica, perfil Modelagem, insumos, preços e custos:
  `docs/plans/ficha-tecnica.md`.
- Perdas e retrabalho: só se o gerente pedir.
- PCP completo (ordens de produção, consumo real, roteiro, tempos, custo
  realizado, RFID, Bling).

## Tentativas que falharam

- A primeira suíte em PostgreSQL revelou expectativas de IDs sequenciais,
  transações abortadas após violações de unicidade e falta de `bash` no
  contêiner. Os testes afetados foram corrigidos.

## Dúvidas abertas

- Lista dos responsáveis de cada setor (nome, e-mail ou usuário e setor),
  para o passo 4.
- O limite de 5 dias para "lote parado" serve para o gerente?

## Próximo passo

Iniciar a fase 3 do [plano da ficha técnica](ficha-tecnica.md), com o
perfil Modelagem e os catálogos de insumos e custos.

Nota de ambiente: o `composer` do lerd roda no contêiner PHP, que não tem
`bash` e limita a memória a 128 MB. Para a conferência completa, rodar
`bash scripts/ci-verify.sh` no host e, onde faltar memória,
`php -d memory_limit=1G vendor/bin/pest` e
`php vendor/bin/phpstan analyse --memory-limit=1G`. Dois testes de
`DeployScriptTest` falham no contêiner por falta de `bash`.

## Escolha final — 16/11/2026

O usuário escolheu apenas o canvas. A rota principal abre o fluxo, o quadro foi removido e os testes foram adaptados (ADR 0035). Novidades agora usam índice geral e detalhes Markdown (ADR 0034).

Conferência completa local aprovada: `composer ci:verify`, com 437 testes funcionais e 145 de navegador, formatação, lint, TypeScript, PHPStan e build. Capturas de Novidades e produção conferidas em mobile e desktop. Alterações mantidas sem commit, push ou integração.


## Seleção visual de produto — 16/11/2026

Concluída: botão em Novo lote abre painel com fotos navegáveis, busca e modos lista, cards compactos e cards grandes. A escolha preserva o formulário, e o modo de visualização fica salvo no dispositivo. A serialização de fotos foi compartilhada com o catálogo, sem novas dependências.

Conferência completa local aprovada: `composer ci:verify`, com 438 testes funcionais e 148 de navegador. Capturas verificadas em 390, 768 e 1366 px, incluindo nomes longos e produto sem foto. Sem commit ou push.

## Etapas e elementos do canvas — 16/11/2026

Transição autorizada: Planejamento → Corte → Costura → Lavanderia → Acabamento → Estoque. Migração local aplicada, com eventos preservados e permissões reunidas. Lavanderia aceita oficinas de lavagem e tintura. Menu permite alternar os controles do canvas. Decisão registrada no ADR 0036. Conferência completa aprovada: composer ci:verify, com 440 testes funcionais e 151 testes de navegador. Capturas inspecionadas em 390, 768 e 1366 px. Sem commit ou push.
