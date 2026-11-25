# ADR 0028 — Preço de insumo com vigência

## Status

Aceito.

## Contexto

O preço de um insumo pode mudar entre a elaboração e a aprovação de uma
ficha técnica. A equipe precisa agendar preços e consultar o histórico.

## Decisão

Cada preço registra o insumo, o valor unitário com quatro casas decimais,
a data de vigência e o administrador que o cadastrou. Os registros são
acrescentados ao histórico. Entre as datas até o dia atual da aplicação,
vale a mais recente. Para correções com a mesma data, prevalece o último
registro. Valores com início futuro ficam agendados.

Somente Administrador consulta ou registra preços. Na fase da ficha
versionada, a aprovação copiará o valor vigente para a revisão. A revisão
aprovada consultará essa cópia.

## Alternativas

Guardar apenas o preço atual impediria consultar o histórico e agendar
mudanças. Consultar o preço vigente sempre que uma ficha aprovada fosse
exibida alteraria os custos históricos a cada mudança de preço.

## Consequências

Uma correção mantém o valor anterior no histórico. Uma mudança no catálogo
afeta as próximas aprovações. A precisão da linha da ficha e os
arredondamentos monetários seguem as regras da ficha versionada.
