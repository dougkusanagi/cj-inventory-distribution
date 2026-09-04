# Arquitetura

## Visão geral

O sistema começa como uma aplicação Laravel monolítica.

O objetivo inicial é manter produto, disponibilidade de estoque e pedido como conceitos separados para permitir evolução posterior sem antecipar um PCP completo.

## Modelo de domínio

```text
Product
  └── ProductVariant

Product
  └── StockOffer
        └── StockOfferItem -> ProductVariant

Order
  └── OrderItem -> StockOffer / ProductVariant
```

## Product

Representa a identidade da peça.

Campos sugeridos:

```text
id
code
model nullable
name
notes nullable
is_active
created_at
updated_at
```

### `code`

Identificador interno obrigatório e gerado automaticamente.

Exemplo:

```text
CJ-000123
```

Não deve depender do `model`.

### `model`

Código/modelo comercial ou industrial da fábrica.

É opcional.

Exemplo:

```text
2451
```

Um produto sem modelo continua plenamente utilizável.
O produto inicia ativo, mas pode ser desativado independentemente das ofertas
de estoque. Produtos inativos não aparecem no catálogo compartilhado.

Um produto também pode ser salvo sem uma oferta de estoque ativa. A oferta é
criada ou atualizada somente quando o cadastro informar explicitamente que há
disponibilidade; nesse caso, seu tipo e estoque total são obrigatórios.

## ProductVariant

Representa uma variação do produto.

No MVP, a principal variação é tamanho.

Campos sugeridos:

```text
id
product_id
size
sku nullable
sort_order
created_at
updated_at
```

Exemplos de `size`:

```text
34
36
38
P
M
G
GG
```

`size` deve ser string.

Não assumir grade fixa nem tamanho numérico.

### Grades de tamanho

A interface pode oferecer presets para acelerar cadastro:

- Numérica feminina
- Letras
- Personalizada

Esses presets são conveniência de interface. O domínio deve continuar aceitando qualquer tamanho válido.
Presets masculino e de tamanho único não fazem parte da operação atual e não
devem ser reintroduzidos sem um requisito explícito.

## StockOffer

Representa uma disponibilidade atual de estoque.

Campos sugeridos:

```text
id
product_id
type
total_quantity
volumes nullable
is_active
notes nullable
created_at
updated_at
```

Tipos iniciais:

```text
replenishment
new_grade
broken_grade
```

Rótulos:

```text
Reposição
Grade Nova
Grade Furada
```

### Regra importante

O tipo pertence à disponibilidade atual e não ao produto.

O mesmo produto pode aparecer em contextos diferentes ao longo do tempo.

O cadastro de produto não infere o tipo a partir das quantidades por tamanho.
Quando houver oferta, o tipo escolhido pelo operador é persistido.

O estado ativo da oferta controla sua exibição no catálogo, desde que o produto
também esteja ativo. Desativar uma oferta não deve zerar seu estoque, seus
volumes nem a disponibilidade por tamanho. O encerramento do estoque atual é
uma ação explícita e separada.

Para `Reposição` e `Grade Furada`, `volumes` registra quantos sacos ainda estão
disponíveis para distribuição e é obrigatório quando a oferta está ativa.
`Grade Nova` não usa esse controle. Uma oferta ativa desses dois tipos só é
disponível no catálogo enquanto `volumes` for maior que zero. Todos os tipos
exigem estoque total maior que zero para aparecer no catálogo.

## StockOfferItem

Permite detalhar o estoque por tamanho.

Campos sugeridos:

```text
id
stock_offer_id
product_variant_id
is_active
quantity nullable
created_at
updated_at
```

### Tamanho presente e quantidade por tamanho

`is_active` registra se aquele tamanho está presente no lote da oferta. Essa
informação é independente da quantidade e pode ser usada mesmo quando o
estoquista não souber ou não quiser informar números.

A oferta pode usar um dos dois modos de estoque, escolhidos implicitamente
pela interface:

- quando nenhuma quantidade por tamanho é informada, `total_quantity` é
  digitado e representa o estoque total;
- quando pelo menos uma quantidade de um tamanho ativo é informada, o estoque
  passa a ser considerado definido por tamanho e `total_quantity` é calculado
  pela soma das quantidades informadas nos tamanhos ativos.

O segundo modo também é acionado quando a quantidade informada é zero. Valores
nulos continuam representando uma contagem desconhecida e entram como zero no
cálculo do total; a disponibilidade do tamanho continua sendo controlada por
`is_active`.

Quando `is_active` é `false`, o tamanho não deve aparecer como disponível para
as vendedoras e sua quantidade deve permanecer nula. Quando é `true`, a
quantidade continua opcional.

Isso permite casos como:

```text
Estoque total: 30

34: presente, 4
36: presente, desconhecido
38: ausente
40: presente, desconhecido
```

No modo por tamanho, o total não pode ser editado separadamente nem divergir
da soma persistida pelo servidor. No modo somente total, quantidades nulas por
tamanho não alteram o total informado manualmente.

## Order

Representa um pedido feito pela tela compartilhada.

Campos sugeridos:

```text
id
requester_name
status
notes nullable
submitted_at
completed_at nullable
canceled_at nullable
created_at
updated_at
```

Status:

```text
pending
completed
canceled
```

## OrderItem

Campos sugeridos:

```text
id
order_id
stock_offer_id
product_id
product_variant_id nullable
quantity
product_name_snapshot
product_model_snapshot nullable
size_snapshot nullable
created_at
updated_at
```

Os snapshots preservam o texto original do pedido mesmo que o cadastro do produto seja alterado depois.

## Fluxo de pedido

```text
Vendedora acessa tela compartilhada
        ↓
Visualiza ofertas ativas
        ↓
Seleciona produto/tamanho/quantidade
        ↓
Adiciona à sacola
        ↓
Revisa pedido
        ↓
Informa identificação necessária
        ↓
Envia pedido
        ↓
Pedido fica Pendente
        ↓
Sistema gera texto para WhatsApp
        ↓
Admin finaliza ou cancela
```

## Mensagem de WhatsApp

Exemplo:

```text
*Pedido de estoque*

Calça Wide Leg — Mod. 2451
- 34: 2 peças
- 38: 3 peças

Jaqueta Jeans Oversized
- M: 1 peça
- G: 2 peças

Total: 8 peças
```

A mensagem deve ser gerada dinamicamente a partir do pedido.

## Imagens

O cadastro deve aceitar:

- upload de arquivo;
- captura pela câmera do dispositivo.

As imagens pertencem à coleção `product-images` da Spatie Media Library, com
limite de cinco imagens por produto. As listagens devem preferir a conversão
`thumb`, em WebP, para reduzir o carregamento; o formulário pode usar a imagem
original quando necessário.

Tratamentos necessários:

- corte;
- rotação;
- espelhamento.

O editor é obrigatório para cada foto adicionada ou ajustada. O recorte 4:5 é
canônico para o arquivo final, a miniatura e a exibição no catálogo. Depois do
recorte, o navegador exporta a imagem final em WebP para reduzir o espaço
ocupado; quando o navegador não oferece essa conversão, usa JPEG como fallback.
Imagens muito grandes também são reduzidas antes da abertura do editor.

Preferir realizar manipulações interativas no cliente e enviar ao servidor a imagem final.

No servidor:

- validar formato e tamanho;
- gerar e manter os arquivos pela Spatie Media Library;
- armazenar a mídia no disco público configurado;
- evitar confiar no nome original do arquivo.

## Tela compartilhada

Para o MVP, a tela deve priorizar simplicidade e uso mobile.

Requisitos:

- listar somente ofertas ativas;
- não listar ofertas de `Reposição` ou `Grade Furada` sem volumes disponíveis;
- mostrar a foto de capa, nome, modelo quando houver, tipo e estoque disponível;
- permitir selecionar quantidades;
- manter uma sacola;
- revisar antes de enviar.

A forma de autenticação/compartilhamento deve permanecer simples. Não criar um sistema complexo de usuários e permissões antes de existir necessidade.

## Evolução futura

Esta estrutura deve permitir adicionar posteriormente:

```text
Produto
 ├── Ficha técnica versionada
 ├── Produção / OP
 ├── Estoque
 ├── Distribuição
 └── Integrações externas
```

Integrações com Bling e funcionalidades de PCP devem ser tratadas como módulos futuros, não como dependências do MVP.
