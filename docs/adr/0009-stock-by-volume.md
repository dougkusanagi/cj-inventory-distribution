# ADR 0009 — Grade e estoque por saco

## Status

Accepted

## Contexto

Atualmente, `StockOffer.volumes` é apenas uma quantidade agregada de sacos. A
grade de tamanhos e as quantidades por tamanho pertencem à oferta, de modo que
o sistema não representa diferenças reais entre os sacos de uma mesma oferta.

Isso impede registrar cenários em que cada saco contém uma grade própria e
também não fornece uma unidade concreta para a futura seleção e baixa de
estoque nos pedidos.

As ofertas legadas informam somente o total agregado, a grade agregada e, em
alguns casos, a quantidade de sacos. Elas não contêm informação suficiente para
dividir automaticamente peças e tamanhos entre vários sacos.

## Decisão

Substituir o contador agregado de volumes por sacos persistidos:

```text
Product
  └── StockOffer
        └── StockOfferVolume
              └── StockOfferVolumeItem
```

- `StockOfferVolume` representa um saco e armazena seu `total_quantity` e sua
  posição de exibição.
- `StockOfferVolumeItem` representa um tamanho daquele saco, com `size` como
  string, `is_active`, `quantity` opcional e posição de exibição.
- A grade deixa de pertencer ao produto e passa a pertencer ao saco. Um tamanho
  deve ser único dentro do mesmo saco, mas pode existir em vários sacos.
- Quando ao menos uma quantidade de tamanho ativo for informada, o total do
  saco é recalculado no servidor pela soma das quantidades. Sem quantidades
  informadas, o total do saco é manual. Quantidades nulas continuam
  significando contagem desconhecida.
- O total apresentado pela oferta e pelo produto será a soma dos totais dos
  sacos, sem persistir uma cópia independente no produto.
- A classificação (`Reposição`, `Grade Nova` ou `Grade Furada`) e a ativação
  continuam pertencendo à oferta.
- A proposta é que todos os tipos de oferta usem pelo menos um saco, inclusive
  `Grade Nova`, para que cadastro, catálogo e pedidos compartilhem a mesma
  unidade operacional.
- O futuro item de pedido deverá referenciar o saco selecionado.

## Decisões confirmadas

As decisões D1–D4 do plano foram fechadas da seguinte forma:

- **D1:** `Grade Nova` também usa sacos. Toda oferta ativa tem pelo menos um
  `StockOfferVolume`, sem exceção por tipo.
- **D2:** o backfill cria um saco de reconciliação com o total agregado e copia a
  grade legada sem replicar peças. Ofertas legadas de `Reposição` e `Grade
  Furada` com mais de um saco ficam marcadas para reconciliação explícita; a
  aplicação não inventa a distribuição entre sacos.
- **D3:** o total público é calculado pela soma dos totais dos sacos. Durante a
  migração aditiva, as colunas legadas podem permanecer como projeções de
  compatibilidade, mas nunca são a fonte de uma nova gravação.
- **D4:** o futuro `OrderItem` referencia `StockOfferVolume`. Assim, a baixa
  poderá escolher um saco concreto sem voltar ao contador agregado.

## Migração

A implementação será aditiva: criará as tabelas de sacos e tamanhos antes de
remover as estruturas antigas.

Ofertas legadas sem sacos ou com um saco podem ser convertidas sem ambiguidade.
Ofertas com mais de um saco exigem reconciliação explícita; a migração não pode
replicar a grade ou as quantidades agregadas em todos os sacos, pois isso
multiplicaria o estoque.

Somente após a auditoria do backfill e a reconciliação dos casos ambíguos serão
removidos `stock_offers.volumes`, `stock_offers.total_quantity`,
`stock_offer_items` e `product_variants`.

## ADRs substituídos parcialmente

Quando aceita, esta decisão substitui:

- ADR 0001, apenas quanto à propriedade da grade: tamanhos deixam de ser
  variações permanentes do produto;
- ADR 0004, pois a disponibilidade por tamanho passa do item da oferta para o
  item do saco;
- ADR 0006, pois volume deixa de ser um contador na oferta e passa a ser uma
  entidade persistida;
- ADR 0008, apenas quanto ao escopo do cálculo: o modo manual/por tamanho é
  mantido, mas aplicado individualmente a cada saco.

Os demais princípios desses ADRs continuam válidos quando não conflitarem com
esta decisão, em especial o uso de strings para tamanhos, quantidades opcionais
e a preservação de contagens desconhecidas.

## Consequências

Vantagens:

- representa fielmente a unidade física de distribuição;
- permite grades diferentes entre sacos da mesma oferta;
- elimina divergência entre o total público e a soma de sacos;
- prepara pedidos para escolher e baixar um saco específico;
- mantém os totais por tamanho opcionais.

Custos e riscos:

- aumenta o número de registros e exige agregações com eager loading adequado;
- exige uma interface para cadastrar e editar vários sacos em celular;
- dados legados com múltiplos sacos precisam de reconciliação humana;
- demanda uma migração em etapas para não perder dados nem manter duas fontes
  de verdade graváveis.

## Relação com o plano

Esta decisão inicia a implementação aditiva descrita em
[`docs/refactors/stock-by-volume/README.md`](../refactors/stock-by-volume/README.md).
As colunas e tabelas legadas só serão removidas depois da auditoria e da
reconciliação previstas no plano.
