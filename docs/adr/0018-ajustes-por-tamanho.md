# ADR 0018 — Ajustes manuais por tamanho conhecido

## Status

Accepted — 15/09/2026.

## Contexto

O estoque é organizado por sacos, mas a conferência física pode encontrar uma
diferença em apenas um tamanho. Consumir ou criar um saco inteiro nesse caso
não representa o fato ocorrido e aumenta o trabalho da equipe.

## Decisão

- Uma recontagem pode alterar presença e quantidade de todos os tamanhos de um
  saco disponível. Uma quantidade vazia significa desconhecida; zero permanece
  uma quantidade conhecida.
- Quando houver qualquer quantidade conhecida, o total é calculado pela soma
  dessas quantidades. Sem contagens por tamanho, o total é informado manualmente.
- A recontagem cria uma movimentação imutável com origem `adjustment` e
  snapshots anterior e posterior. Se o total não mudar, o tipo é `adjustment`;
  entradas e saídas só são usadas quando houver diferença líquida no total.
- Sacos reservados ou consumidos não podem ser recontados por esse fluxo.
- Ajustes por tamanho não usam o estorno de sacos inteiros. Uma correção é
  registrada por um novo ajuste.

## Correções de cadastro e seleção de vários sacos

A correção permite selecionar vários sacos do mesmo produto, corrigindo a
contagem de cada um ou removendo cadastros feitos por engano. Todas as mudanças
da seleção são aplicadas na mesma transação; uma reserva, versão desatualizada
ou saco de outro produto impede a operação inteira.

A remoção exige motivo e registra um ajuste com autor, total anterior, total
zero e indicação explícita de cadastro removido no snapshot posterior. O saco
é zerado, encerrado e excluído logicamente, preservando seus vínculos e o
histórico. Não é uma saída manual operacional: a origem permanece `adjustment`,
e a redução de saldo usa o tipo `out`, como nas demais recontagens negativas.
Uma repetição da mesma solicitação não cria novos ajustes.

## Consequências

O produto pode oferecer a conferência e a recontagem sem abandonar sua tela. O
histórico registra também redistribuições entre tamanhos, sem transformá-las em
uma entrada ou saída inexistente.
