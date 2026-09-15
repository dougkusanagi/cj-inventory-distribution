# ADR 0015 — Soft deletes para entidades da aplicação

## Status

Accepted

## Contexto

A exclusão de produtos, estoque, pedidos, usuários e demais entidades removia
registros definitivamente. Isso inviabilizava recuperação operacional e podia
desconectar dados históricos que ainda precisam ser consultados.

## Decisão

Todas as entidades Eloquent da aplicação usam `SoftDeletes`.

Ao excluir um produto, suas ofertas, sacos e tamanhos também são enviados para
a lixeira. Ao excluir um pedido, seus itens e eventos seguem o mesmo ciclo.
Relações usadas no histórico de pedidos incluem registros na lixeira para
preservar o acesso ao produto, saco e autor originais.

Fotos de produtos são preservadas na exclusão lógica e só são removidas em uma
exclusão definitiva, conforme o comportamento da Media Library.

## Consequências

- consultas normais não retornam registros excluídos;
- os dados podem ser restaurados sem recriar identificadores ou fotos;
- índices únicos que precisam permitir recriação após exclusão incluem
  `deleted_at`;
- exclusões definitivas continuam disponíveis somente de forma explícita.
