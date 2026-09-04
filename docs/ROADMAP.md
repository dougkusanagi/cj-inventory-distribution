# Roadmap

O roadmap descreve direção, não compromisso de implementação imediata.

## Refatoração ativa

A mudança da grade e do estoque para sacos individuais possui especificação e
andamento próprios:

- [Visão geral da refatoração](refactors/stock-by-volume/README.md)
- [Tasklist e registro de execução](refactors/stock-by-volume/TASKLIST.md)

Enquanto a refatoração estiver aberta, sua tasklist é a fonte de verdade para
a ordem das tarefas, dependências, critérios de aceite e evidências.

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

- [ ] listagem de pedidos
- [ ] detalhes
- [ ] status `Pendente`
- [ ] finalizar pedido
- [ ] cancelar pedido
- [ ] filtros básicos por status/data

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
