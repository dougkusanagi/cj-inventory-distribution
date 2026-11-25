# ADR 0027 — Ficha técnica versionada

## Status

Aceito.

## Contexto

A Modelagem precisa registrar o consumo por peça e as instruções. A
aprovação deve deixar uma referência estável para a fábrica enquanto
outra revisão está em preparação.

## Decisão

Cada produto tem um histórico numerado de fichas. A lavagem e a galeria
são consultadas no produto. Uma revisão aberta é rascunho ou está em
revisão. Há no máximo uma revisão aberta e uma aprovada por produto.
Índices únicos parciais garantem esses limites em PostgreSQL e SQLite.

A Modelagem e o Administrador editam dados técnicos em rascunho e enviam
para revisão. O Administrador preenche valores em revisão aberta, devolve
com motivo, aprova e torna obsoleta a revisão aprovada. Uma aprovação
copia os preços vigentes e torna obsoleta a aprovação anterior na mesma
transação. Uma revisão obsoleta permanece disponível no histórico.

Para criar uma nova revisão da aprovada, o sistema copia dados técnicos,
custos-base e preços de venda. A nova revisão consulta os preços de
insumo vigentes até sua própria aprovação. Cada gravação confere a versão
esperada e bloqueia o produto antes de alterar a ficha.

O custo comum inclui os componentes somados aos custos-base. Cada opção
de tecido soma seu consumo ao custo comum. A aprovação exige preço vigente
para todo insumo e preço de venda para cada opção de tecido. O custo de
cada linha é arredondado para centavos com HalfUp. O servidor calcula os
totais, o lucro e a margem. Os valores financeiros exigem acesso de
Administrador, inclusive nas respostas HTTP.

Nome e unidade do insumo e nome do custo-base são copiados para a linha.
Depois que um insumo tem preço ou é usado em ficha, sua unidade é fixa.
Outro cadastro representa o insumo em uma unidade diferente. Inativos
permanecem nos vínculos existentes.

## Alternativas

Copiar o produto inteiro a cada revisão duplicaria estoque, fotos e
pedidos. Permitir várias fichas aprovadas exigiria que a fábrica escolhesse
qual usar e é uma extensão a avaliar para variantes comerciais.

## Consequências

A aprovação anterior segue disponível até ser substituída ou marcada como
obsoleta. Os campos técnicos e financeiros têm gravações separadas, com a
mesma verificação de versão. A impressão e a referência da ficha nos lotes
serão entregues nas próximas fases.
