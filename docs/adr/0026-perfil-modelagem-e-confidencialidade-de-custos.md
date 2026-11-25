# ADR 0026 — Perfil Modelagem e confidencialidade de custos

## Status

Aceito. A implementação começa pelo cadastro de insumos.

## Contexto

A Modelagem precisa consultar os insumos e definir seu consumo antes do corte.
O Administrador mantém os cadastros e completa os custos da ficha técnica.
Preços, custos e margens são informações restritas.

## Decisão

- O painel usa o perfil `Modelagem` no mesmo mecanismo de contas existente.
  Esse perfil consulta o catálogo de insumos e futuramente prepara as fichas.
  O Administrador cadastra e edita insumos. A Modelagem não opera estoque,
  pedidos, catálogo público, produção nem contas de outras pessoas.
- As regras de acesso são verificadas no servidor. A consulta técnica usa uma
  lista explícita de campos. Preços, custos, margens e históricos financeiros
  exigem permissão de Administrador também na resposta e na impressão.
- O código de cada insumo é gerado pelo sistema e permanece estável. A
  inativação preserva referências históricas e retira o insumo da seleção
  para novas fichas.

## Alternativas

Usar o perfil Estoque daria à Modelagem acesso a operações de outros setores.
Ocultar valores apenas na interface manteria os dados nas respostas do servidor.

## Consequências

A conta Modelagem entra diretamente em Insumos. A gestão de preços, os
custos-base e as fichas serão entregues nas próximas etapas, respeitando as
mesmas permissões. As permissões dos perfis existentes são preservadas.
