# Roadmap

O roadmap descreve direção, não compromisso de implementação imediata.

## Catálogo e pedidos para lojistas — plano vigente

O [plano de catálogo e pedidos](CATALOGO-E-PEDIDOS.md) detalha a sequência atual,
CRUD de categorias, Slim/Plus, reserva de sacos, separação/conferência e WhatsApp.
O catálogo conectado ao banco substitui a home em `/` e também está em
`/catalog`. Persistência da sacola pública e contatos de WhatsApp ainda não
estão implementados. O CRUD de categorias e a gestão interna
de pedidos com reserva de sacos já estão disponíveis. As fases históricas
abaixo não significam conclusão desses módulos.

Regra definitiva: Grade Nova nunca aparece no catálogo; não há filtro por tipo.
Busca, categoria e linha Slim/Plus são os filtros da interface. Pedidos por saco
inteiro e reserva ao registrar são propostas aguardando validação operacional.

## Refatoração de estoque por saco

A mudança da grade e do estoque para sacos individuais possui especificação e
andamento próprios:

- [Visão geral da refatoração](refactors/stock-by-volume/README.md)
- [Tasklist e registro de execução](refactors/stock-by-volume/TASKLIST.md)

A refatoração foi concluída no ambiente de desenvolvimento: cadastro, catálogo,
dashboard e editor mobile usam `StockOfferVolume` como fonte canônica. Como o
sistema ainda não foi lançado, não houve backfill nem reconciliação de dados
legados; as migrations atuais já criam somente o modelo de sacos.

## Fase 1 — Cadastro de produtos

- [x] CRUD de produtos
- [x] código interno automático
- [x] modelo opcional
- [x] ativar/desativar produto
- [x] observação
- [x] upload de até cinco fotos com thumbnails
- [x] captura pela câmera
- [x] corte
- [x] rotação
- [x] espelhamento
- [x] cadastro de tamanhos
- [x] presets de grade
- [x] grade personalizada

## Fase 2 — Estoque disponível

- [ ] criar oferta de estoque
- [ ] tipo `Reposição`
- [ ] tipo `Grade Nova`
- [ ] tipo `Grade Furada`
- [ ] estoque total obrigatório
- [ ] quantidade opcional por tamanho
- [ ] ativar/desativar oferta
- [ ] listagem e filtros básicos

## Fase 3 — Tela das vendedoras

- [ ] link compartilhável
- [ ] layout mobile-first
- [ ] catálogo de ofertas disponíveis
- [ ] seleção por tamanho
- [ ] quantidade
- [ ] sacola
- [ ] revisão do pedido
- [ ] identificação da solicitante
- [ ] envio do pedido
- [ ] geração de mensagem para WhatsApp

## Fase 4 — Gestão de pedidos

- [x] listagem de pedidos
- [x] detalhes
- [x] status `Pendente`
- [x] finalizar pedido
- [x] cancelar pedido
- [x] filtros básicos por status e busca

## Depois do MVP

Possíveis evoluções:

- histórico mais completo de estoque;
- reserva/baixa automática;
- usuários, lojas e permissões;
- ficha técnica versionada;
- integração com catálogo existente;
- integração com Bling;
- sincronização de produtos e estoque;
- criação de pedidos no Bling;
- PCP;
- ordens de produção;
- rastreamento por setor;
- RFID.

Cada evolução deve ser avaliada separadamente antes de entrar no escopo.
