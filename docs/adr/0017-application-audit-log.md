# ADR 0017 — Trilha de auditoria administrativa

## Status

Accepted — implementado a partir do Roadmap em 15/09/2026.

## Contexto

`OrderEvent` explica o progresso operacional de pedidos, mas não registra
alterações administrativas em produtos, categorias, ofertas, sacos,
configurações e usuários. A exclusão lógica aumenta a necessidade de saber
quem criou, alterou, excluiu ou restaurou um cadastro.

## Decisão

- `AuditLog` é uma entidade histórica transversal, sem `SoftDeletes`,
  `updated_at` ou edição/exclusão pela aplicação.
- Cada registro contém entidade e identificador, ação (`created`, `updated`,
  `deleted`, `restored` ou `force_deleted`), ator opcional, valores anteriores
  e posteriores, contexto mínimo e data da ocorrência.
- O observador registra somente alterações de estado nas entidades
  administrativas. Leituras, filtros e eventos operacionais de pedidos não
  geram uma segunda trilha.
- O ator vem do usuário autenticado quando disponível. Jobs e comandos podem
  informar ator explicitamente no contexto da execução; ações automáticas
  podem permanecer sem ator.
- Senhas, tokens, segredos, códigos de recuperação, secrets de 2FA e demais
  atributos de autenticação nunca são armazenados. Valores são filtrados antes
  de serializar o snapshot.
- A auditoria não calcula estoque e não substitui `StockMovement` nem
  `OrderEvent`.

## Entidades cobertas inicialmente

`Product`, `Category`, `StockOffer`, `StockOfferVolume`,
`StockOfferVolumeItem`, `CatalogSetting` e `User`.

Pedidos, itens de pedido e eventos de pedido continuam usando o histórico
operacional próprio, evitando duplicar cada passo da separação e conferência.

## Consequências

- A exclusão lógica e a restauração ficam rastreáveis sem ocultar o histórico.
- O armazenamento cresce somente em operações de escrita relevantes.
- A exclusão definitiva é deliberadamente rara e fica sujeita às restrições
  das referências históricas; nenhum endpoint genérico é criado para apagá-la.

