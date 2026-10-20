# ADR 0024 — Tipo de grade no produto e fim da oferta de estoque

## Status

Accepted — 20/10/2026. Substitui a `StockOffer` descrita nos ADRs 0004, 0009
e 0014.

## Contexto

O tipo de grade (Reposição, Grade Nova, Grade Furada) pertencia à
`StockOffer`, que agrupava os sacos de uma entrada. Um produto podia ter várias
ofertas, criadas quando uma entrada mudava o tipo ou a observação. A gerência
confirmou que, na fábrica, um produto nunca tem estoque de tipos diferentes ao
mesmo tempo: o tipo funciona como classificação do produto e filtro. A oferta
apenas repetia o produto e dificultava mudar o tipo pelo formulário.

## Decisão

- `products.stock_offer_type` guarda o tipo como texto com o enum
  `StockOfferType`, com Grade Nova como padrão. Todo produto tem tipo, mesmo
  sem estoque.
- `StockOfferVolume` pertence diretamente ao produto (`product_id`). A tabela
  `stock_offers` e a coluna `stock_movement_items.stock_offer_id` foram
  removidas. A observação da oferta, que repetia a da movimentação de entrada,
  deixou de existir.
- A entrada de estoque usa o tipo do produto e não pede mais o tipo. Grade
  Furada continua exigindo motivo e permitindo tamanhos por saco.
- A edição do produto pode mudar o tipo a qualquer momento. Com sacos em
  estoque, a mudança grava uma movimentação de origem `reclassification`, sem
  alterar quantidades, com o tipo anterior e o novo nos estados de cada saco.
  Mudar para Grade Nova é bloqueado enquanto houver sacos reservados em
  pedidos, porque Grade Nova não entra em pedidos.
- As regras de Grade Nova (fora do catálogo e dos pedidos, ADR 0011) passam a
  ler o tipo do produto.

## Consequências

- Pedidos e movimentações continuam com o tipo nos próprios snapshots; o
  histórico não muda.
- A migration copia para o produto o tipo da oferta mais recente, liga os sacos
  ao produto e converte os `deleted_child_ids` de produtos excluídos para os
  ids dos sacos. O `down` recria uma oferta por produto com sacos.
- O comando `stock-offers:audit-volumes` foi removido, porque não existe mais
  oferta sem sacos.
- Os nomes `StockOfferVolume`, `StockOfferType` e o campo `stock_offer_type`
  foram mantidos para limitar a mudança.
- Misturar tipos num mesmo produto deixa de ser possível; se surgir esse caso,
  ele exige uma nova decisão.
