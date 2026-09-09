# ADR 0011 — Grade Nova nunca aparece no catálogo para lojistas

## Status

Accepted — requisito explícito do usuário em 09/09/2026.

## Contexto

Os documentos e o scope de disponibilidade anteriores permitiam qualquer tipo
de oferta ativa. O catálogo para lojistas deve excluir Grade Nova permanentemente.

## Decisão

- Ofertas `new_grade` nunca são expostas no catálogo, independentemente de
  produto/oferta ativos, estoque, filtros ou identidade da pessoa.
- Não há filtro por tipo de estoque, opção administrativa ou exceção para
  habilitar Grade Nova no catálogo.
- Tipo continua pertencendo à oferta; Grade Nova continua disponível para
  cadastro e gestão interna.
- Busca, detalhes, totais, opções de filtro e registro de pedidos públicos
  devem compartilhar essa elegibilidade. O servidor não deve serializar
  ofertas proibidas para o cliente.

## Implementação e consequências

A prévia de frontend já exclui Grade Nova. A consulta real
`StockOffer::availableForCatalog` e seus consumidores ainda precisam ser
adaptados na fase de backend, explicitamente fora da entrega atual.

Esta decisão substitui as afirmações anteriores de que todos os tipos podem
aparecer no catálogo. Não modifica a estrutura física dos sacos nem os tipos
aceitos no cadastro interno. Plano em [Catálogo e pedidos](../CATALOGO-E-PEDIDOS.md).
