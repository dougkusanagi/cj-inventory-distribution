# ADR 0015 — Soft deletes para entidades da aplicação

## Status

Accepted

## Contexto

A exclusão de produtos, estoque, pedidos, usuários e demais entidades removia
registros definitivamente. Isso inviabilizava recuperação operacional e podia
desconectar dados históricos que ainda precisam ser consultados.

## Decisão

As entidades administrativas e de operação que ainda podem ser corrigidas
usam `SoftDeletes`: produtos, ofertas, sacos, tamanhos, pedidos, itens,
categorias, configurações, usuários e mídia relacionada.

Históricos operacionais não usam `SoftDeletes`: `OrderEvent`,
`StockMovement`, `StockMovementItem` e `AuditLog` são imutáveis e
permanecem consultáveis.

Ao excluir um produto, suas ofertas, sacos e tamanhos também são enviados para
a lixeira. Ao excluir um pedido, seus itens seguem o mesmo ciclo. Eventos do
pedido permanecem fora da lixeira.
Relações usadas no histórico de pedidos incluem registros na lixeira para
preservar o acesso ao produto, saco e autor originais.

Fotos de produtos são preservadas na exclusão lógica e só são removidas em uma
exclusão definitiva, conforme o comportamento da Media Library.

## Consequências

- consultas normais não retornam registros excluídos;
- os dados podem ser restaurados sem recriar identificadores ou fotos;
- índices únicos que precisam permitir recriação após exclusão incluem
  `deleted_at`;
- exclusões definitivas continuam disponíveis somente de forma explícita e
  respeitam as referências dos históricos imutáveis;
- estoque disponível ou reservado não pode ser ocultado por exclusão lógica:
  a regularização deve passar por uma saída registrada.
