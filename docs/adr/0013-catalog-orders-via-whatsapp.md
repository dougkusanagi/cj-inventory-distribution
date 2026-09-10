# ADR 0013 — Pedidos do catálogo enviados via WhatsApp

## Status

Accepted

## Contexto

As lojistas montam pedidos no catálogo público e a equipe precisa recebê-los
em um contato controlado pela empresa. Abrir uma conversa sem registrar o
pedido antes poderia perder a reserva dos sacos ou transformar o WhatsApp na
fonte de verdade.

## Decisão

O painel possui um único número brasileiro de WhatsApp para os pedidos do
catálogo, configurado com DDI e DDD. Sem esse número, a confirmação pública
fica indisponível.

Ao confirmar, o servidor valida a disponibilidade, registra o pedido e reserva
os sacos em transação. Somente depois retorna um link `wa.me` com uma mensagem
gerada dos dados persistidos e dos snapshots do pedido. A abertura do link não
altera o status do pedido e não comprova o envio da mensagem.

## Consequências

- o pedido continua sendo a fonte de verdade;
- o contato pode mudar sem alterar pedidos anteriores;
- falhas ou abandono no WhatsApp deixam um pedido pendente para revisão;
- no painel, a finalização exige a abertura do link `wa.me`; essa confirmação é
  transitória e não representa envio ou entrega da mensagem;
- repetir a confirmação ainda exige uma estratégia própria de idempotência em
  uma evolução futura.
