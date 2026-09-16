# ADR 0016 — Movimentações imutáveis para o estoque físico

## Status

Accepted — implementado a partir do Roadmap em 15/09/2026.

## Contexto

Os sacos de uma oferta representam o estoque físico disponível, mas o cadastro
de produtos também podia editar diretamente total, grade e quantidades. Isso
impede saber por que um saco deixou de aparecer e permite que uma alteração
administrativa apague a explicação de uma saída ou de uma entrada.

O sistema precisa registrar entradas, saídas manuais e a saída produzida pela
finalização de um pedido sem criar um segundo saldo editável. O histórico deve
continuar legível mesmo quando os cadastros relacionados forem enviados para a
lixeira.

## Decisão

- `StockOfferVolume` continua sendo a fonte canônica do estado físico atual.
  `StockMovement` registra operações, mas não mantém saldo agregado.
- Uma entrada reutiliza somente a oferta mais recente do mesmo produto, tipo e
  observação normalizada. Caso algum desses atributos seja diferente, uma nova
  oferta é criada; ofertas não são combinadas silenciosamente.
- A primeira versão movimenta sacos inteiros. Saída parcial, abertura de saco,
  transferência e múltiplos depósitos permanecem fora do escopo.
- Movimentações confirmadas têm `type` (`in`/`out`) e `source` (`manual`,
  `order` ou `opening`). Não usam `SoftDeletes`, não podem ser editadas nem
  apagadas e guardam snapshots mínimos do produto, oferta, saco, grade e estado
  anterior/posterior.
- Entradas e saídas manuais exigem usuário da equipe, motivo quando aplicável
  e chave de idempotência. A abertura inicial usa uma chave estável por
  operação e pode ser repetida sem criar outro lançamento.
- A finalização de pedido cria exatamente uma saída de origem `order` na mesma
  transação que consome os sacos e muda o pedido para `Finalizado`. O
  identificador do pedido é a chave de idempotência dessa saída.
- Cancelar pedido somente libera a reserva e não cria movimentação.
- Estorno é outro lançamento, ligado por `reversal_of_id`. A primeira versão
  permite estornar apenas lançamentos manuais; uma saída libera os sacos e uma
  entrada consome os mesmos sacos. Cada lançamento pode ser estornado uma vez,
  somente se não houver operação posterior incompatível.
- Um saco que já possui movimento não pode ter seu conteúdo físico alterado
  pelo editor de produto. Novas alterações físicas passam pelas actions de
  estoque. Sacos criados pelo fluxo legado continuam editáveis até a abertura
  inicial idempotente ser executada.
- Exclusão lógica não substitui saída. Produto, oferta ou saco com estoque
  disponível ou reserva ativa não pode ser excluído; referências históricas
  continuam apontando para snapshots e relações `withTrashed`.

## Modelo

```text
StockMovement
  ├── StockMovementItem -> StockOfferVolume (incluindo lixeira)
  ├── actor -> User (incluindo lixeira)
  ├── order nullable -> Order (incluindo lixeira)
  └── reversalOf nullable -> StockMovement
```

As entidades de movimentação não têm `updated_at` nem `deleted_at`. Referências
podem ficar nulas em uma exclusão definitiva, mas os snapshots não dependem
delas para exibir o histórico.

## Consequências

- O catálogo e o dashboard continuam lendo o estado dos sacos, sem somar o
  histórico como se ele fosse estoque.
- Uma correção fica explícita como estorno e novo lançamento, preservando a
  cadeia de auditoria.
- A migração de um ambiente já usado exige uma abertura inicial identificável;
  ela não inventa datas ou entradas anteriores ao sistema.
- O editor de produto deixa de ser o caminho apropriado para ajustar estoque
  depois que o saco entra no módulo de movimentações.

