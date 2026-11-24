# ADR 0035 — Produção somente em canvas

## Status

Aceito — 16/11/2026. Substitui o ADR 0033.

## Contexto

Após experimentar o quadro e o fluxo visual, o usuário escolheu manter apenas
a versão em canvas. Manter as duas páginas adicionaria manutenção e uma escolha
que deixou de ser necessária.

## Decisão

- Remover a página `production/index` e abrir `production/flow` na rota principal
  `/painel/producao`.
- Preservar `/painel/producao/fluxo` para os links existentes, com a mesma página.
- Oferecer Fluxo, Novo lote e Oficinas no menu Produção, sem a opção Quadro.
- Manter React Flow, ações e gavetas compartilhadas, busca, modo Atenção,
  navegação por setores, links de lotes e atualização automática.
- Mostrar em No estoque os lotes dos últimos sete dias, preservando os totais
  completos e o histórico. Não criar sacos automaticamente.

## Alternativas e consequências

Manter ambas as páginas preservaria uma interface que o usuário decidiu retirar.
A página única reduz manutenção e mantém as operações existentes. Os testes
funcionais e de navegador passam a validar o canvas também na rota principal.
