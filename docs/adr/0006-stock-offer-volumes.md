# ADR 0006 — Volumes nas ofertas acondicionadas em sacos

## Status

Accepted

## Contexto

As ofertas de `Reposição` e `Grade Furada` são distribuídas em sacos. Para
esses tipos, além da quantidade de peças e dos tamanhos presentes, a fábrica
precisa controlar quantos sacos ainda podem ser solicitados pelas lojistas.

`Grade Nova` não depende dessa contagem de sacos.

## Decisão

Adicionar `volumes` como inteiro opcional em `StockOffer`:

- o campo é obrigatório quando a oferta ativa é `Reposição` ou `Grade Furada`;
- o campo permanece nulo para `Grade Nova`;
- a consulta do catálogo compartilhado considera disponíveis somente ofertas
  ativas, com estoque total maior que zero e, nesses dois tipos, com `volumes`
  maior que zero;
- o switch do cadastro controla a exibição da oferta no catálogo, sem apagar
  estoque, volumes ou disponibilidade por tamanho;
- encerrar o estoque atual é uma ação explícita e separada, que oculta a oferta
  e limpa as quantidades do lote.

O fluxo de pedidos futuro será responsável por reduzir `volumes` ao dar baixa
nos sacos. Quando chegar a zero, a oferta continuará preservada para histórico,
mas não será retornada pela consulta de catálogo.

## Consequências

Vantagens:

- representa a unidade operacional usada na distribuição;
- permite ocultar automaticamente ofertas esgotadas do catálogo;
- mantém produtos cadastrados mesmo sem uma oferta ativa;
- preserva a oferta para futura baixa e histórico.

Custo:

- o fluxo de pedidos precisará atualizar `volumes` dentro de uma operação
  consistente quando for implementado;
- ofertas antigas desses tipos precisarão receber volumes antes de serem
  reativadas pelo formulário.
