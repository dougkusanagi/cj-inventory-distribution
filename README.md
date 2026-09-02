# CJ Stock Distribution

Sistema Laravel interno da Crônicas Jeans para organizar estoque disponível para distribuição e permitir que vendedoras montem pedidos de peças para envio pela fábrica.

## Objetivo do MVP

Entregar um fluxo simples:

1. Cadastrar produtos.
2. Quando houver uma oferta, informar estoque total e, opcionalmente, estoque por tamanho.
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

### Variação

Representa uma variação de tamanho do produto.

Exemplos:

- `34`
- `36`
- `38`
- `P`
- `M`
- `G`
- `GG`
- `U`

O sistema não deve assumir que tamanho é numérico.

### Oferta de estoque

Representa uma disponibilidade atual de um produto.

Ela guarda:

- tipo: `Reposição`, `Grade Nova` ou `Grade Furada`
- estoque total obrigatório quando houver oferta ativa
- quantidade de volumes (sacos) obrigatória para `Reposição` e `Grade Furada`
- tamanhos presentes naquele lote, quando informados
- quantidades opcionais por tamanho
- status ativo/inativo

O tipo pertence à oferta de estoque, e não ao produto.
Desativar a exibição no catálogo preserva os dados da oferta para edição ou
reativação posterior.
Nas ofertas com volumes, quando a quantidade de sacos chega a zero, a oferta
deixa de aparecer no catálogo das vendedoras.

### Pedido

Uma seleção feita por uma vendedora a partir dos produtos disponíveis.

Status iniciais:

- `Pendente`
- `Finalizado`
- `Cancelado`

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
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
