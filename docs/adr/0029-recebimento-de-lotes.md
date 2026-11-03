# ADR 0029 — Confirmação de recebimento de lotes

## Status

Aceito — 03/11/2026. Complementa o ADR 0025.

## Contexto

O envio de um lote registrava a mudança de setor, mas não distinguia o que
havia chegado fisicamente daquilo que ainda estava a caminho.

## Decisão

- Um envio para outro setor deixa o lote aguardando recebimento. Um responsável
  pelo setor de destino ou administrador confirma a chegada antes de novo envio.
- O recebimento registra responsável e horário, incrementa a versão do lote e
  acrescenta um evento imutável. A quantidade recebida é a quantidade enviada;
  divergências de quantidade ficam para uma regra própria.
- Lotes existentes na implantação são considerados presentes no setor, com a
  data de entrada já registrada e sem atribuir um responsável presumido.
- Criar um lote o coloca no Corte; concluir é uma etapa terminal e não exige
  confirmação de recebimento. Desfazer um envio devolve o lote ao setor de
  origem como presente, registrando a correção.

## Alternativas e consequências

O envio imediato sem confirmação foi a primeira versão do ADR 0025; não informa
se o setor seguinte recebeu o lote. A confirmação acrescenta uma ação ao fluxo,
mas evita que o lote avance novamente antes de sua chegada ser registrada.
Não altera o estoque nem registra perdas ou quantidades divergentes.
