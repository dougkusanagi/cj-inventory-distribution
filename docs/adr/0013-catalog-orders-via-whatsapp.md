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
gerada dos dados persistidos e dos snapshots do pedido. Na sacola, a confirmação
visual final permanece desabilitada até a lojista abrir esse link. O clique
libera a ação somente no navegador, não altera o status do pedido e não comprova
o envio da mensagem.

## Consequências

- o pedido continua sendo a fonte de verdade;
- o contato pode mudar sem alterar pedidos anteriores;
- falhas ou abandono no WhatsApp deixam um pedido pendente para revisão;
- a sacola só é limpa depois da confirmação visual liberada pelo clique no
  WhatsApp;
- no painel interno, a finalização não depende da abertura do link `wa.me`;
  depende da separação, conferência e ausência de divergências;
- repetir a confirmação com a mesma chave de idempotência retorna o pedido já
  registrado; reutilizar a chave com outro payload é rejeitado.
