# ADR 0019 — Phosphor duotone como biblioteca de ícones

## Status

Accepted — 30/09/2026.

## Contexto

Os ícones vinham do Lucide, que só oferece traço. Em tamanhos pequenos, como os
cartões de filtro no celular, o traço sozinho expressa pouco. Os ícones das
linhas Slim e Plus já usavam um preenchimento suave sob o traço, o que destoava
do restante da interface.

## Decisão

- Usar `@phosphor-icons/react` (MIT, com tree-shaking) no lugar de `lucide-react`,
  que foi removido.
- O peso padrão é `duotone`, definido uma vez por `IconContext.Provider` em
  `resources/js/app.tsx`, junto com `size: 24` e `aria-hidden`. Os ícones herdam a
  cor atual e a camada secundária usa a mesma cor com 20% de opacidade.
- Indicadores sem significado próprio (`Check`, `Caret*`, `X`, setas e
  reticências) usam `weight="bold"` explícito, e o indicador de rádio usa
  `weight="fill"`, porque o duotone os deixa finos demais em 16px. "Adicionar"
  e "remover" usam `PlusCircleIcon` e `MinusCircleIcon`.
- A Phosphor fixa a camada secundária em 20% de opacidade, que some em 16px.
  `resources/css/app.css` a eleva para 34% com `svg path[opacity='0.2']`.
- Importar sempre os nomes com sufixo `Icon` (`TShirtIcon`, `CaretDownIcon`) e o
  tipo `Icon as PhosphorIcon` quando for necessário tipar um ícone recebido por
  props.
- Ícones sem equivalente (Slim, Plus, "Slim e Plus", sacola de papel) continuam
  em `resources/js/components/icons`, desenhados com o mesmo padrão duotone.
- `components.json` passa a usar `iconLibrary: phosphor` para que novos
  componentes do shadcn nasçam com a mesma biblioteca.

## Consequências

Todos os ícones passam a ter o mesmo estilo e mais expressividade em tamanhos
pequenos. A troca é difícil de reverter em bloco, pois os nomes dos ícones mudam
em toda a interface. A Phosphor não aceita `strokeWidth`; o peso é o único
controle de espessura. O duotone é da mesma cor com opacidade e não permite dois
tons independentes.
