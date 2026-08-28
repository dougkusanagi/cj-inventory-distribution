# ADR 0002 — Modelo opcional e código interno automático

## Status

Accepted

## Contexto

Nem todo produto necessariamente possui um modelo informado no momento do cadastro.

Ao mesmo tempo, o sistema precisa de um identificador estável para cada produto.

Gerar automaticamente o próprio campo de modelo misturaria um conceito interno do software com um possível código comercial ou industrial da fábrica.

## Decisão

O produto terá dois conceitos distintos:

```text
code
model
```

`code`:

- obrigatório;
- único;
- gerado automaticamente pelo sistema.

`model`:

- opcional;
- informado pelo usuário;
- representa o modelo real utilizado pela fábrica quando existir.

## Consequências

O sistema consegue identificar qualquer produto mesmo sem modelo.

Uma futura integração pode mapear separadamente:

- código interno;
- modelo;
- SKU;
- identificadores externos.
