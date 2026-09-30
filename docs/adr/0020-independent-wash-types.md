# ADR 0020 — Tipos de lavagem independentes do produto

## Status

Accepted — 30/09/2026.

## Contexto

Produtos e catálogo precisam de seleção e filtro por tipo de lavagem, com
cadastro rápido e gerenciamento. Essa classificação deverá pertencer à
ficha técnica quando o módulo de produção for implementado.

## Decisão

- `WashType` possui cadastro próprio com nome normalizado e único entre
  registros não excluídos, ativação, exclusão lógica e auditoria.
- O vínculo atual é `products.wash_type_id`, opcional e com chave estrangeira
  explícita. O produto não armazena uma cópia do nome.
- Tipos inativos mantêm os vínculos existentes, mas não recebem novas
  atribuições. Tipos vinculados a produtos, inclusive excluídos logicamente,
  não podem ser excluídos; devem ser desativados ou reclassificados.
- Seleção e filtros usam busca por texto. O painel permite criar um tipo
  pelo botão “+” sem abandonar a tela atual. O catálogo público apenas filtra.
- A futura ficha técnica poderá referenciar os mesmos IDs de `WashType` e
  migrar os vínculos atuais. Não é criada uma ficha técnica antecipadamente.

## Consequências

O vocabulário de lavagens permanece reutilizável, sem depender de estoque ou
da identidade de um produto. A futura mudança de propriedade exigirá uma
migration para transferir os vínculos, preservando o cadastro de tipos.
