# ADR 0008 — Modo de definição do estoque total

## Status

Accepted

## Contexto

O formulário permitia informar simultaneamente um estoque total manual e
quantidades por tamanho. Esses valores podiam divergir e não ficava claro qual
era a fonte de verdade da oferta.

## Decisão

Não será persistido um campo adicional para o modo. Ele será inferido a partir
do payload:

- sem quantidade em tamanho ativo, o estoque é definido somente por
  `total_quantity`;
- com pelo menos uma quantidade em tamanho ativo, inclusive zero, o estoque é
  definido por tamanho e o total é a soma das quantidades dos tamanhos ativos.

No modo por tamanho, o formulário torna o total somente leitura e o servidor
recalcula o valor, ignorando qualquer total divergente enviado pelo cliente.
Quantidades nulas permanecem permitidas e representam contagem desconhecida;
para o cálculo, elas contribuem com zero. `is_active` continua representando a
presença do tamanho, independentemente da quantidade.

## Consequências

- elimina duas fontes de verdade para o total;
- mantém compatibilidade com tamanhos ativos cuja quantidade ainda é
  desconhecida;
- não exige migration, pois o modo é derivado dos itens da oferta;
- ofertas antigas potencialmente divergentes são corrigidas quando editadas e
  salvas.
