# Desenvolvimento

## Objetivo

Manter o projeto fácil de entender, testar e evoluir sem antecipar complexidade de PCP, ERP ou integração externa.

## Setup

Use os requisitos definidos pelo próprio projeto (`composer.json`, lockfile JavaScript e `.env.example`) como fonte de verdade.

Fluxo esperado em uma instalação nova:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
```

Instale e compile os assets usando o package manager já adotado pelo repositório.

## Convenções Laravel

Preferir recursos nativos:

- Form Requests para validação;
- Policies quando autorização realmente for necessária;
- Eloquent relationships;
- casts;
- PHP enums para estados/tipos;
- Spatie Media Library para imagens de produto;
- transactions para operações compostas;
- Services/Actions apenas quando reduzirem complexidade real.

Evitar controllers com regras de negócio extensas.

## Enums iniciais

Sugestão:

```text
StockOfferType
- Replenishment
- NewGrade
- BrokenGrade

OrderStatus
- Pending
- Completed
- Canceled
```

Os valores persistidos devem ser estáveis e independentes dos rótulos apresentados na interface.

## Código interno de produto

O código deve:

- ser único;
- ser criado pelo sistema;
- não depender do modelo informado pelo usuário.

Exemplo:

```text
CJ-000001
CJ-000002
CJ-000003
```

A estratégia exata de geração pode ser definida durante a implementação, desde que não dependa de contar registros de forma sujeita a colisões concorrentes.

## Validação de produto

Regras mínimas:

```text
name: obrigatório
model: opcional
images: opcional, até cinco imagens
notes: opcional
variants: zero ou mais
```

Um produto pode existir sem grade definida inicialmente.

Um produto pode ser salvo sem oferta de estoque. Quando a oferta for ativada,
o tipo deve ser informado explicitamente e o estoque total passa a ser
obrigatório.

## Validação de oferta

```text
product: obrigatório
type: obrigatório
total_quantity: inteiro >= 0; obrigatório no modo somente total e calculado no modo por tamanho
volumes: inteiro >= 1 quando o tipo for `replenishment` ou `broken_grade`
variant quantities: inteiro >= 0 ou null
```

O tipo não deve ser deduzido das quantidades por tamanho. A ausência de oferta
é representada separadamente e não cria uma `StockOffer` ativa.

O campo `volumes` representa a quantidade de sacos disponíveis para
`Reposição` e `Grade Furada`. Ao chegar a zero, a oferta não deve ser retornada
pela consulta do catálogo compartilhado. O switch do formulário controla a
oferta de estoque; desativá-lo não desativa nem remove o produto.

O modo por tamanho é inferido quando houver pelo menos uma quantidade definida
em um tamanho ativo, inclusive zero. Nesse modo, o total é sempre a soma das
quantidades dos tamanhos ativos e o valor enviado pelo cliente não é a fonte de
verdade. Quantidades nulas continuam permitidas e entram como zero na soma.

Sem quantidades por tamanho, o operador informa o total manualmente, que
continua sendo a referência da oferta.

## Pedido

Na criação:

1. validar itens;
2. validar quantidades positivas;
3. criar pedido;
4. criar itens;
5. preservar snapshots necessários;
6. concluir tudo dentro de uma transação.

Não implementar baixa/reserva complexa de estoque até essa regra ser definida explicitamente.

## Testes prioritários

Cobrir primeiro regras que podem causar inconsistência:

- geração de código único;
- modelo opcional;
- tamanhos numéricos e alfabéticos;
- estoque total obrigatório quando houver oferta;
- quantidade por tamanho nullable;
- criação de pedido;
- pedido sem itens deve falhar;
- transições de status;
- geração do texto de WhatsApp.

## Commits e alterações

Mudanças devem ser pequenas e focadas.

Ao alterar uma regra de domínio:

- atualizar teste;
- atualizar `ARCHITECTURE.md` se necessário;
- criar ADR apenas quando for uma decisão arquitetural relevante.
