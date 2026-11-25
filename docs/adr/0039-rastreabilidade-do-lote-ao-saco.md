# ADR 0039 — Rastreabilidade do lote ao saco

## Status

Aceito.

## Contexto

A aprovação de uma ficha pode mudar enquanto lotes da revisão anterior
ainda estão em produção. A etapa Estoque reúne o ensacamento e a chegada
ao estoque. A equipe registra os sacos pela entrada manual.

## Decisão

O lote grava a ficha aprovada na criação, sob o mesmo bloqueio de produto
usado na aprovação. Lotes sem aprovação ficam sem vínculo, inclusive
lotes legados. Os filhos de uma divisão herdam a revisão do lote original.

A entrada manual aceita um lote opcional para todos os sacos da operação.
Ele deve ser do mesmo produto, estar na etapa Estoque e ter peças
suficientes aguardando ensacamento. Cada saco guarda a origem e a quantidade
registrada na entrada. A entrada valida o total sob bloqueio e registra
os sacos e a movimentação na mesma transação.

O saldo de ensacamento é a quantidade do lote menos a quantidade registrada
nos sacos vinculados. Saídas, ajustes e exclusão lógica do saco preservam
o abatimento. O estorno da entrada recompõe o saldo e mantém a origem
para consulta no histórico. Para desfazer a chegada ao Estoque, primeiro
é preciso estornar as entradas vinculadas.

## Alternativas e consequências

Consultar a ficha aprovada ao abrir o lote trocaria a revisão usada após
uma nova aprovação. Calcular o ensacamento a partir do saldo físico
faria uma saída reabrir peças para ensacamento. Os vínculos registram
qual revisão e quais entradas pertencem ao lote. O cadastro dos sacos
continua manual e entradas de lotes diferentes são registradas separadamente.
