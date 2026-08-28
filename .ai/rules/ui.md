---
paths:
  - 'resources/{css,js/components/ui}/**'
---

# Ui

## Tokens e semântica do design system
Use os tokens de resources/css/app.css e os componentes shadcn em resources/js/components/ui. Primary é amarelo com primary-foreground marrom profundo; brand é vermelho institucional; destructive é reservado para erros e exclusões. Drawer é para ações e formulários mobile; Sheet para conteúdo complementar.

## Dark neutro e hierarquia de ações
O tema dark usa fundo preto/quase preto e superfícies neutras inspiradas no cj-catalogo; não aplique o marrom do cj-formularios como fundo global. Botões de aplicação usam default, secondary, destructive e ghost. Brand vermelho é identidade visual, não variante de CTA. Alertas destrutivos precisam de fundo/borda suaves e texto destructive com contraste.

## Contraste de superfícies e highlight
Background, card, secondary, muted, border e input devem ter valores próprios em light e dark, mantendo separação moderada entre os níveis. Primary-foreground é contextual e só aparece sobre primary. Use highlight para texto enfatizado: âmbar profundo no light e dourado no dark; não use highlight como fundo de botão.
