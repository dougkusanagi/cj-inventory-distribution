# ADR 0033 — Fluxo de produção em canvas com React Flow

## Status

Substituído por 0035 — 16/11/2026. Complementava o ADR 0025.

## Contexto

O quadro de produção mostra os setores em colunas. O usuário pediu uma visão
nova, em canvas infinito no estilo de editores de fluxo: lotes como nós,
setores como grupos e linhas animadas entre os setores, com uso bom no
celular. O quadro continua em uso e não pode perder as ações de hoje.

## Decisão

- Criar a rota `GET /painel/producao/fluxo` (`production.flow`) com a página
  `production/flow`. O quadro em `/painel/producao` continua igual. O menu
  Produção tem os subitens Quadro, Fluxo, Novo lote e Oficinas.
- Usar a biblioteca `@xyflow/react` (React Flow 12, licença MIT) para pan,
  zoom, linhas, fundo em padrão e minimapa. As posições dos setores são fixas
  e calculadas no código, sem biblioteca de layout automático e sem arrastar
  nós: a etapa de um lote só muda pelas ações existentes.
- Cada setor é um nó do React Flow e os lotes são cartões dentro dele. Assim a
  altura do setor acompanha o conteúdo, e os cartões e gavetas do quadro são
  reaproveitados.
- No celular, os setores ficam de cima para baixo; no desktop, lado a lado.
- O fluxo mostra em "No estoque" só os lotes dos últimos 7 dias, porque esse
  setor cresce sem limite. Os totais por setor continuam completos.
- "Novo lote" e "Oficinas" saem do cabeçalho do quadro e abrem pelo parâmetro
  `abrir` da página de produção atual.

## Alternativas

- Desenhar o canvas à mão com transformações CSS: mais código e mais defeitos
  em gestos, zoom e acessibilidade.
- Cada lote como nó próprio do React Flow, filho do setor: exigiria medir e
  posicionar cada cartão à mão e não ganharia função para o usuário.
- Substituir o quadro pelo fluxo: o usuário pediu acesso às duas versões.

## Consequências

- Uma dependência nova no frontend, carregada só na página do fluxo.
- Duas páginas com a mesma regra de ação; ela fica em
  `useProductionActions` para não se duplicar.
- Os testes de navegador cobrem as duas visões.
