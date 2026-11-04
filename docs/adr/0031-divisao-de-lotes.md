# ADR 0031 — Divisão de lotes entre oficinas

## Status

Aceito — 04/11/2026. Complementa os ADRs 0025, 0029 e 0030.

## Contexto

Um lote recebido pode precisar seguir para mais de uma oficina da próxima
etapa. O painel precisa manter o total de peças correto e preservar a origem
sem criar sacos de estoque.

## Decisão

- A divisão acompanha o envio à próxima etapa e exige duas ou mais oficinas
  ativas e diferentes, compatíveis com essa etapa. Quantidades positivas dos
  filhos devem somar exatamente a quantidade do lote original.
- A operação bloqueia o usuário, o lote e as oficinas e valida tudo na mesma
  transação. Cria filhos com vínculo ao original, registra os eventos e marca o
  original como dividido. Os filhos aguardam recebimento.
- O original dividido permanece consultável no histórico dos filhos, mas não
  aparece nos totais ativos nem aceita novas operações. Filhos não podem ser
  excluídos pelo fluxo de exclusão de lotes que ainda não avançaram.
- A operação não cria nem altera sacos, pedidos ou movimentações de estoque.

## Alternativas e consequências

Manter o original nos totais junto aos filhos contaria as mesmas peças duas
vezes. A marcação de divisão preserva a trilha e deixa os filhos como unidades
ativas. A primeira versão não permite desfazer a divisão; uma correção exige
uma regra própria para reunir novamente lotes que podem ter avançado.
