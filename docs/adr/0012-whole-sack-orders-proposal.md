# ADR 0012 — Pedidos de sacos inteiros com reserva e conferência

## Status

Accepted — implemented in the order workflow.

## Contexto

Lojistas precisam solicitar estoque e a equipe precisa separar/conferir os
sacos. O modelo atual identifica sacos reais, enquanto a prévia anterior
permitia multiplicar o mesmo saco e escolher tamanhos sem representar baixas.

## Decisão

Pedir unidades físicas inteiras, uma linha por saco. Registrar e reservar em
transação com bloqueio e idempotência; cancelar libera, finalizar baixa.
Preservar snapshots e identidade física imutável. Separação/conferência são
progresso em Pendente, mantendo Pendente/Finalizado/Cancelado.

Finalizar exige todos os sacos conferidos e sem divergência; representa
liberação para expedição. WhatsApp é compartilhamento de pedido já registrado,
sem ser fonte de verdade ou confirmação de envio. Categoria e linha são
atributos do produto; tipo de estoque permanece na oferta.

## Consequências

Impede reservar o mesmo saco para duas lojas. Exige proteger edição e exclusão
de sacos vinculados, ajustar disponibilidade pública e distinguir perfis de
acesso. Não atende fracionamento de sacos nem recebimento pela loja.

O fluxo registra e reserva os sacos físicos transacionalmente, mantém separação
e conferência como progresso dentro de `Pendente` e grava um evento de auditoria
para cada mudança operacional. Chaves de idempotência protegem as tentativas
repetidas do checkout público. Detalhes e validações operacionais restantes
estão no [plano de catálogo e pedidos](../CATALOGO-E-PEDIDOS.md).
