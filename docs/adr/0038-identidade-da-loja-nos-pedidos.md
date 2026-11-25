# ADR 0038 — Identidade da loja nos pedidos

## Status

Aceito.

## Contexto

Pedidos registram o nome da loja em texto livre. O destino precisa ter uma
identidade estável para agrupar peças enviadas e servir de base ao futuro
acesso das vendedoras. O formulário atual aceita pedidos sem login e há
pedidos existentes sem uma loja conferida.

## Decisão

- Lojas têm nome, estado ativo e chave de nome única. A chave ignora
  maiúsculas e diferenças de espaçamento. Administrador e Estoque gerenciam
  o cadastro em rotas internas e a aplicação audita as mudanças.
- A chave estrangeira `orders.store_id` é opcional e restringe a exclusão
  definitiva de uma loja referenciada. `orders.store_name` preserva o
  nome registrado no pedido.
- O registro de pedido vincula a loja ativa quando o nome informado
  corresponde à chave. Na edição de um pedido pendente, informar o nome
  cadastrado permite corrigir a associação. Se o pedido já estiver vinculado
  e a chave de nome permanecer igual, a edição preserva o vínculo.
- A listagem de lojas soma as peças dos itens de pedidos finalizados.
  Pedidos finalizados sem vínculo contribuem para um total separado.

## Alternativas consideradas

- Vincular todos os pedidos anteriores por semelhança de nome exigiria
  conferência dos destinos antes de alterar o histórico.
- Exigir uma lista de lojas no formulário público exigiria publicar o
  cadastro e mudar o preenchimento antes da etapa de acesso com login.

## Consequências

Renomear ou desativar uma loja não altera os pedidos anteriores. Uma grafia
sem correspondência continua aceita no catálogo e fica sem vínculo.
Pedidos existentes conservam seus nomes e seus vínculos vazios até uma
correção explícita em pedido pendente. Os totais representam peças em
pedidos finalizados e não conferem o recebimento físico.
