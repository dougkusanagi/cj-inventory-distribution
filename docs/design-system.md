# Design system

A documentação visual viva está em `/design-system`. Ela é a referência de implementação dos componentes e dos tokens.

## Direção visual

- Light: superfícies em marfim e tons quentes, inspirados no `cj-spec-sheet`.
- Dark: fundo noir, marfim e bronze, inspirados no `cj-catalogo`.
- Ação principal: amarelo `primary` com texto marrom profundo `primary-foreground`, extraído da combinação usada em `cj-formularios` (`#f3a000` e `#120503`).
- Ação principal: `action`, mapeado para `primary` por compatibilidade com o shadcn. Amarelo é ação, não o nome genérico da marca.
- Identidade expressiva: `brand-expressive`, com alias `brand`. Não use `secondary` para vermelho; esse token é neutro para ações de baixa ênfase.
- Perigo: `destructive` é semanticamente reservado para exclusão e erros e não deve ser substituído pela cor `brand`.
- Botões de aplicação usam quatro papéis principais: `default`, `secondary`, `destructive` e `ghost`. O vermelho `brand` não é uma variante de botão.
- `highlight` é uma cor exclusiva para texto em destaque: âmbar profundo no light e dourado claro no dark. Não a use como fundo de botão.
- `primary-foreground` é contextual e deve aparecer somente sobre `primary`; não é uma superfície escura independente.
- `secondary`, `muted`, `border` e `input` possuem valores próprios por tema para manter separação moderada entre superfícies.
- `brand-expressive` usa vermelho terroso; `destructive` usa vermelho puro e mais saturado. Nunca os substitua um pelo outro.
- Inputs mantêm borda com contraste mínimo de 3:1 contra a superfície do campo. Textos normais, placeholders e `highlight` devem manter pelo menos 4.5:1.

## Modalidades

- `Drawer`: ações e formulários em telas móveis.
- `Sheet`: navegação ou conteúdo complementar, em qualquer breakpoint.
- `Dialog`: confirmações e formulários em desktop.

## Marca

Os arquivos em `public/images/brand/` são derivados dos assets originais de `cj-catalogo`: use a versão colorida em superfícies claras e a branca em fundos escuros.
