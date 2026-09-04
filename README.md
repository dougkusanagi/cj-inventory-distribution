# CJ Stock Distribution

Sistema Laravel interno da Crônicas Jeans para organizar estoque disponível para distribuição e permitir que vendedoras montem pedidos de peças para envio pela fábrica.

## Objetivo do MVP

Entregar um fluxo simples:

1. Cadastrar produtos.
2. Quando houver uma oferta, organizar um ou mais sacos, cada um com sua grade e seu total.
3. Classificar a disponibilidade como:
    - `Reposição`
    - `Grade Nova`
    - `Grade Furada`
4. Compartilhar uma tela de produtos disponíveis com as vendedoras.
5. Permitir que elas montem uma sacola e enviem um pedido.
6. Gerar um texto do pedido pronto para WhatsApp.
7. Listar os pedidos no painel.
8. Permitir finalizar ou cancelar um pedido.

## Conceitos principais

### Produto

Representa a peça de forma genérica.

Exemplos:

- Calça Wide Leg
- Jaqueta Jeans Oversized
- Short Mom

Campos principais:

- até cinco fotos
- nome
- modelo opcional
- código interno automático
- observação
- status ativo/inativo independente do estoque

### Tamanho

Representa um tamanho presente em um saco de uma oferta.

Exemplos:

- `34`
- `36`
- `38`
- `P`
- `M`
- `G`
- `GG`

O sistema não deve assumir que tamanho é numérico. O mesmo tamanho pode existir
em sacos diferentes e possui quantidade opcional em cada saco.

### Saco de estoque

Cada oferta ativa é composta por pelo menos um saco. Cada saco guarda:

- sua ordem de exibição;
- seu total de peças;
- sua própria grade de tamanhos;
- presença e quantidade opcional por tamanho.

Quando alguma quantidade numérica de tamanho ativo é informada, o total do saco
é recalculado no servidor pela soma dessas quantidades. Sem quantidades
conhecidas, o total é manual. O total público da oferta é a soma dos sacos.

### Oferta de estoque

Representa uma disponibilidade atual de um produto.

Ela guarda:

- tipo: `Reposição`, `Grade Nova` ou `Grade Furada`
- um ou mais sacos quando houver oferta ativa
- total agregado calculado pela soma dos sacos
- status ativo/inativo

O tipo pertence à oferta de estoque, e não ao produto.
Ativar ou desativar o produto não altera os dados da oferta de estoque.
Desativar a exibição de uma oferta no catálogo também preserva seus dados para
edição ou reativação posterior.
Todos os tipos usam a mesma regra física: a oferta só aparece no catálogo
quando o produto e a oferta estão ativos, existe ao menos um saco e a soma dos
totais dos sacos é maior que zero.

### Pedido

Uma seleção feita por uma vendedora a partir dos produtos disponíveis.

Status iniciais:

- `Pendente`
- `Finalizado`
- `Cancelado`

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Refatoração de estoque por saco](docs/refactors/stock-by-volume/README.md)
- [Tasklist da refatoração](docs/refactors/stock-by-volume/TASKLIST.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [ADRs](docs/adr/README.md)

## Fora do escopo do MVP

Não implementar agora:

- PCP completo
- ordem de produção
- integração com Bling
- emissão fiscal
- sincronização com lojas
- ficha técnica versionada
- regras complexas de reserva de estoque
- permissões avançadas

Esses itens podem ser incorporados futuramente sem transformar o MVP em um sistema maior do que o necessário.
