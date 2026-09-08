# Arquitetura

## Visão geral

O sistema começa como uma aplicação Laravel monolítica.

O objetivo inicial é manter produto, disponibilidade de estoque e pedido como conceitos separados para permitir evolução posterior sem antecipar um PCP completo.

## Modelo de domínio

```text
Product
  └── StockOffer
        └── StockOfferVolume
              └── StockOfferVolumeItem

Order
  └── OrderItem -> StockOfferVolume
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
disponibilidade. Quando ativa, ela possui ao menos um saco.

## Tamanhos por saco

O tamanho pertence a um `StockOfferVolumeItem`, e não ao produto.
Ele é uma string e é único dentro do saco, mas pode aparecer em sacos
diferentes.

Exemplos de tamanho:

```text
34
36
P
M
G
GG
3G
```

A interface oferece presets para acelerar o cadastro:

- Numérica feminina
- Letras
- Personalizada

Esses presets são apenas conveniência de interface. O domínio aceita qualquer
tamanho válido e não inclui presets masculino ou de tamanho único sem requisito
explícito.

## StockOffer

Representa uma disponibilidade atual de estoque. A classificação e a ativação
pertencem à oferta, não ao produto nem ao saco.

Campos sugeridos:

```text
id
product_id
type
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

O cadastro não infere o tipo a partir das quantidades. Quando a oferta está
ativa, o tipo é informado explicitamente e existe pelo menos um
`StockOfferVolume`.

O estado ativo da oferta controla sua exibição no catálogo, desde que o produto
também esteja ativo. Desativar uma oferta não zera seus sacos nem a
disponibilidade por tamanho. O encerramento do estoque atual é uma ação
explícita e separada.

A disponibilidade usa a soma de `StockOfferVolume.total_quantity`: a oferta
só aparece quando produto e oferta estão ativos, existe ao menos um saco e o
total agregado é maior que zero.

## StockOfferVolume

Representa um saco físico da oferta.

Campos sugeridos:

```text
id
stock_offer_id
sort_order
total_quantity
created_at
updated_at
```

Uma oferta ativa precisa de ao menos um saco. A posição define o nome exibido
(`Saco 1`, `Saco 2`) e pode mudar sem trocar a identidade persistida.

## StockOfferVolumeItem

Representa um tamanho dentro de um saco.

Campos sugeridos:

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

`size` é string e é único dentro do saco, mas pode aparecer em sacos
diferentes. `is_active` registra se o tamanho está presente. Quando falso,
`quantity` deve ser nula; quando verdadeiro, a quantidade continua
opcional.

Cada saco usa um dos dois modos:

- sem quantidade numérica em tamanho ativo, `total_quantity` é manual;
- com ao menos uma quantidade numérica em tamanho ativo,
  `total_quantity` é calculado pela soma das quantidades numéricas ativas.

O segundo modo também é acionado quando a quantidade é zero. Valores nulos
representam contagem desconhecida e não impedem registrar a presença do
tamanho. O total da oferta é a soma dos totais dos seus sacos.

## Migração do modelo de estoque

O modelo vigente nasce diretamente com `StockOfferVolume` e
`StockOfferVolumeItem`. Não há tabelas, colunas ou contratos de compatibilidade
para a estrutura anterior; o total agregado é sempre calculado a partir dos
sacos persistidos.

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
stock_offer_volume_id
product_id
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
- não listar ofertas sem saco físico ou com soma de sacos igual a zero;
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
