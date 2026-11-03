# ADR 0030 — Oficinas nas etapas de produção

## Status

Aceito — 03/11/2026. Complementa os ADRs 0025 e 0029.

## Contexto

Costura, lavagem e tinturaria podem ocorrer na fábrica ou em oficinas. O
painel precisa indicar o destino sem perder o histórico quando uma oficina é
renomeada ou desativada.

## Decisão

- Cada oficina tem nome, tipo e situação. O nome é único dentro do tipo entre
  os cadastros não excluídos. Responsáveis de produção e administradores podem
  cadastrar; apenas administradores alteram o nome ou a situação.
- Ao enviar para Costura, Lavagem ou Tinturaria, escolhe-se produção interna ou
  uma oficina ativa do tipo correspondente. A operação valida a escolha na
  transação e bloqueia o cadastro para impedir desativação simultânea.
- O lote guarda a oficina atual. Eventos guardam os vínculos e nomes no momento
  da operação. Desfazer o avanço recupera a oficina anterior, inclusive quando
  ela foi desativada depois. Oficinas usadas não podem mudar de tipo.
- Envios anteriores à implantação continuam internos, sem inferir uma oficina.

## Alternativas e consequências

Atribuir oficinas sem tipo permitiria escolher um destino incompatível com a
etapa. A classificação limita as opções e protege o histórico. Esta decisão
não divide lotes, registra custo, nem altera o estoque.
