# ADR 0001 — Produto e variações de tamanho

## Status

Accepted

## Contexto

Os produtos da fábrica podem usar grades diferentes.

Exemplos:

```text
34, 36, 38, 40
```

e:

```text
P, M, G, GG
```

Modelar tamanhos como colunas fixas ou assumir valores numéricos dificultaria produtos como jaquetas e futuras grades.

## Decisão

Separar a identidade do produto de suas variações.

`Product` representa a peça.

`ProductVariant` representa uma variação, inicialmente usada para tamanho.

O valor de tamanho será armazenado como string.

## Consequências

Vantagens:

- suporta tamanhos numéricos e alfabéticos;
- suporta grades personalizadas;
- evita alterar schema ao surgir um novo tamanho;
- facilita futura integração com SKUs externos.

Custo:

- exige relacionamento adicional entre produto e variações.
