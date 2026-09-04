# Refatoração de estoque por saco

Este documento descreve o objetivo e os limites da refatoração que transforma
o volume de uma oferta de estoque em um saco individual, com sua própria grade
e suas próprias quantidades.

O andamento executável, as dependências e as evidências ficam em
[`TASKLIST.md`](TASKLIST.md). A decisão proposta está documentada no
[ADR 0009](../../adr/0009-stock-by-volume.md), com status `Proposed`; ela só
passa a valer depois de aceita.

## Objetivo

Hoje, `StockOffer.volumes` informa apenas quantos sacos existem, enquanto a
grade e o estoque por tamanho ficam agregados na oferta. Depois da refatoração:

```text
Product
  └── StockOffer
        └── StockOfferVolume (saco)
              └── StockOfferVolumeItem (tamanho e quantidade)
```

- cada saco possui sua própria grade;
- cada tamanho do saco pode ter uma quantidade opcional;
- cada saco possui um estoque total obrigatório;
- o total exibido para a oferta/produto é a soma dos totais dos sacos;
- tamanhos continuam aceitando valores numéricos, alfabéticos e personalizados;
- a classificação `Reposição`, `Grade Nova` ou `Grade Furada` continua
  pertencendo à oferta, não ao produto nem ao saco.

## Resultado esperado

Um produto poderá representar, por exemplo:

```text
Produto: Calça Wide Leg
Total disponível: 38 peças

Saco 1 — 20 peças
  36: 4
  38: 8
  40: 8

Saco 2 — 18 peças
  38: quantidade desconhecida
  40: quantidade desconhecida
  42: quantidade desconhecida
```

Os dois sacos podem ter grades diferentes. Quando as quantidades por tamanho
forem conhecidas, o servidor calcula o total do saco. Quando nenhuma quantidade
for informada, o total do saco é informado manualmente.

## Invariantes que devem ser preservadas

- `Product.model` continua opcional.
- O código interno do produto continua obrigatório e gerado pelo sistema.
- Produto e oferta continuam com estados de ativação independentes.
- Quantidade por tamanho continua opcional.
- Um tamanho ativo pode ter quantidade desconhecida (`null`).
- Tamanho inativo não pode manter quantidade.
- Não se pode assumir que a soma por tamanho estará sempre disponível.
- Não serão adicionados presets masculino ou de tamanho único.
- Operações que sincronizam produto, oferta, sacos e tamanhos são atômicas.
- A mensagem futura de WhatsApp continua sendo gerada, não persistida como
  fonte de verdade.

## Modelo proposto

### `StockOffer`

Mantém a disponibilidade atual e sua classificação:

```text
id
product_id
type
is_active
notes nullable
created_at
updated_at
```

`total_quantity` deixa de ser uma entrada independente. O total é obtido pela
soma de `StockOfferVolume.total_quantity`.

### `StockOfferVolume`

Representa um saco físico:

```text
id
stock_offer_id
sort_order
total_quantity
created_at
updated_at
```

O nome exibido pode ser derivado da posição (`Saco 1`, `Saco 2`) enquanto não
houver requisito para um identificador operacional próprio.

### `StockOfferVolumeItem`

Representa um tamanho dentro de um saco:

```text
id
stock_offer_volume_id
size
sort_order
is_active
quantity nullable
created_at
updated_at
```

O tamanho é uma string e deve ser único apenas dentro do mesmo saco. O mesmo
tamanho pode aparecer em sacos diferentes.

## Decisões que precisam ser fechadas primeiro

### D1 — `Grade Nova` também usa sacos?

Proposta: sim. Todas as ofertas passam a ter ao menos um saco, eliminando a
exceção atual e oferecendo uma única regra para cadastro, catálogo e pedidos.

### D2 — Como migrar ofertas existentes com mais de um saco?

O banco atual possui somente o total agregado, a grade agregada e a quantidade
de sacos. Não há informação suficiente para dividir corretamente os tamanhos e
as peças entre sacos.

Proposta: migrar automaticamente apenas os casos inequivocamente representáveis
e exigir reconciliação explícita para ofertas com `volumes > 1`. Nunca duplicar
as quantidades agregadas em cada saco, pois isso aumentaria o estoque.

### D3 — O total será armazenado no produto ou na oferta?

Proposta: não persistir outra cópia. O total público do produto/oferta será uma
agregação dos sacos (`SUM(stock_offer_volumes.total_quantity)`), evitando fontes
de verdade divergentes.

### D4 — Como pedidos identificarão o estoque escolhido?

Proposta: o futuro item de pedido deve referenciar o saco. A baixa poderá então
consumir um saco específico, em vez de decrementar um contador abstrato.

## Estratégia de entrega

A mudança será feita em etapas verificáveis:

1. fechar as decisões e registrar o ADR superseding;
2. caracterizar o comportamento atual com testes;
3. adicionar as novas tabelas sem remover as antigas;
4. migrar e auditar os dados existentes;
5. trocar escrita, leitura e agregações para o novo modelo;
6. refatorar o formulário e as listagens;
7. remover a estrutura antiga somente após validação;
8. atualizar a arquitetura e encerrar o rastreador.

Durante a transição, nenhuma etapa deve manter duas fontes de verdade graváveis
por tempo indeterminado. Se for necessário compatibilizar leituras, a fonte
canônica de escrita precisa estar indicada na tarefa correspondente.

## Fora do escopo

- novos estados de pedido;
- reservas complexas de estoque;
- PCP, produção ou RFID;
- integração com Bling;
- identificação física avançada de sacos;
- histórico completo de movimentações;
- novos presets de tamanho.

## Como continuar em outra sessão

1. Leia `AGENTS.md` e a documentação obrigatória do projeto.
2. Leia este documento e os ADRs citados na tarefa.
3. Abra [`TASKLIST.md`](TASKLIST.md).
4. Escolha somente uma tarefa `ready` cujas dependências estejam `done`.
5. Mude a tarefa para `in_progress` e registre o início da execução.
6. Implemente apenas a saída e os critérios de aceite daquela tarefa.
7. Execute as verificações e registre as evidências antes de marcar `done`.
