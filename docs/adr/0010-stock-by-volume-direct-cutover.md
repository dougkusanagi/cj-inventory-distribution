# ADR 0010 — Corte direto para o estoque por saco

## Status

Accepted

## Contexto

O sistema ainda está em desenvolvimento e não foi lançado. Não existe ambiente
de produção nem base de dados com ofertas reais que precise ser convertida.
Manter backfill, projeções agregadas ou compatibilidade com o modelo anterior
adicionaria código e estados que não têm consumidor.

## Decisão

O modelo de estoque será criado diretamente nesta estrutura:

```text
Product
  └── StockOffer
        └── StockOfferVolume
              └── StockOfferVolumeItem
```

As migrations atuais criam somente as tabelas e colunas canônicas. O código de
produção usa exclusivamente `StockOfferVolume` e `StockOfferVolumeItem`; o
total da oferta é calculado pela soma dos totais dos sacos. As estruturas
anteriores são removidas da sequência de migrations e não há backfill,
fallback de leitura ou `down()` que as reconstrua.

O ADR 0009 continua válido quanto ao modelo de domínio, aos invariantes e à
fonte canônica dos totais. Este ADR substitui apenas sua estratégia de
migração aditiva e reconciliação de dados legados.

## Consequências

- o schema novo fica simples e coerente desde uma instalação limpa;
- não há duas fontes de verdade nem caminhos de compatibilidade sem uso;
- bancos locais criados com a estrutura intermediária precisam ser recriados
  ou passar pela migration de limpeza antes de continuar o desenvolvimento;
- uma eventual importação futura de dados externos será uma decisão nova, com
  requisitos próprios.
