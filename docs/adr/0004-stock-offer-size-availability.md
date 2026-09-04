# ADR 0004 — Disponibilidade de tamanhos na oferta de estoque

## Status

Accepted; a regra de definição do total foi parcialmente substituída pela ADR
0008.

## Contexto

Uma oferta de estoque pode estar acondicionada em sacos e o estoquista pode
saber quais tamanhos estão presentes sem conseguir contar as peças de cada
tamanho. A quantidade por tamanho, portanto, não é suficiente para representar
a disponibilidade para as vendedoras.

## Decisão

`StockOfferItem` terá o campo booleano `is_active` para registrar se a variação
de tamanho está presente naquele lote.

O campo é independente de `quantity`:

- `is_active = true` informa que o tamanho está presente;
- `quantity` pode continuar nula quando a contagem não for conhecida;
- tamanhos inativos não ficam disponíveis para pedidos.

O formulário só exibe o campo de quantidade quando o tamanho está ativo, mas
persiste o estado ativo mesmo sem quantidade.

## Consequências

Vantagens:

- permite informar disponibilidade parcial sem inventário detalhado;
- prepara a tela das vendedoras para mostrar apenas tamanhos presentes;
- não força a soma das quantidades por tamanho a representar o total.

Custo:

- cada item da oferta precisa carregar um estado de disponibilidade além da
  quantidade.
