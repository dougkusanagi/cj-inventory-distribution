# CJ Stock Distribution

Sistema Laravel interno da Crônicas Jeans para organizar estoque disponível para distribuição e permitir que vendedoras montem pedidos de peças para envio pela fábrica.

## Objetivo do MVP

Entregar um fluxo simples:

1. Cadastrar produtos.
2. Quando houver estoque, organizar um ou mais sacos, cada um com sua grade e seu total.
3. Classificar o tipo de grade do produto como:
    - `Reposição`
    - `Grade Nova`
    - `Grade Furada`
4. Compartilhar uma tela de produtos disponíveis com as vendedoras.
5. Permitir que elas montem uma sacola e enviem um pedido.
6. Gerar um texto do pedido pronto para WhatsApp.
7. Listar os pedidos no painel.
8. Permitir finalizar ou cancelar um pedido.

## Conceitos principais

### Produto

Representa a peça de forma genérica.

Exemplos:

- Calça Wide Leg
- Jaqueta Jeans Oversized
- Short Mom

Campos principais:

- até cinco fotos
- nome
- modelo opcional
- código interno automático
- observação
- status ativo/inativo independente do estoque

A listagem administrativa inicia com produtos ativos e permite filtrar por
ativos, inativos ou todos. Limpar os filtros restaura a seleção de ativos.
O filtro de estoque oferece todos, com estoque ou sem estoque, considerando
sacos com quantidade positiva ainda não consumidos, inclusive os reservados.
No celular, usa cartões de escolha com ícones; no desktop, uma seleção.
A listagem permite exibir 12, 24, 48 ou 100 produtos por página. A exclusão
fica disponível nas ações do produto e mantém os bloqueios para estoque
físico, reservas e vínculos com pedidos.

Cada produto pode receber uma categoria (por exemplo, calça, bermuda, short ou
cropped) e uma linha comercial: `Slim` ou `Plus`. Esses campos são opcionais
durante a transição dos produtos antigos e serão usados pelos filtros do
catálogo.

### Tipos de lavagem

Os tipos de lavagem possuem cadastro próprio (`WashType`), com nome único,
ativação e exclusão lógica. O produto guarda um vínculo opcional
`wash_type_id`. O formulário oferece seleção com busca por texto e cadastro
rápido pela última opção da lista, após pesquisar o nome; produtos e catálogo
podem ser filtrados por lavagem.
Tipos inativos permanecem nos vínculos existentes, mas não podem receber
novas atribuições. Tipos vinculados a produtos, inclusive excluídos
logicamente, devem ser desativados em vez de excluídos.

A ficha técnica usa a lavagem cadastrada no produto, preservando os IDs.
Na página da revisão, é possível imprimir a ficha técnica ou um modelo em
branco em A4. Administradores também podem imprimir custos. Ao imprimir pelo
editor, a ficha inclui os valores em edição e indica alterações não salvas.

### Tamanho

Representa um tamanho presente em um saco.

Exemplos:

- `34`
- `36`
- `38`
- `P`
- `M`
- `G`
- `GG`

O sistema não deve assumir que tamanho é numérico. O mesmo tamanho pode existir
em sacos diferentes e possui quantidade opcional em cada saco.

### Saco de estoque

O estoque de um produto é composto por sacos. Cada saco guarda:

- sua ordem de exibição;
- seu total de peças;
- sua própria grade de tamanhos;
- presença e quantidade opcional por tamanho.

Quando alguma quantidade numérica de tamanho ativo é informada, o total do saco
é recalculado no servidor pela soma dessas quantidades. Sem quantidades
conhecidas, o total é manual. O total público do produto é a soma dos sacos.

### Tipo de grade

Todo produto tem um tipo de grade: `Reposição`, `Grade Nova` ou `Grade Furada`
(Grade Nova por padrão). O tipo pertence ao produto e pode ser alterado na
edição; com sacos em estoque, a mudança fica registrada no histórico.

Ativar ou desativar o produto não altera o estoque. Todos os tipos usam sacos
físicos. Para aparecer no catálogo, o produto precisa estar ativo, existir ao
menos um saco disponível com total positivo e não ser Grade Nova.

**Regra atualizada do catálogo para lojistas:** Grade Nova nunca aparece,
mesmo com produto ativo e estoque positivo. A exclusão é aplicada
na consulta real do backend. Veja o
[plano de catálogo e pedidos](docs/CATALOGO-E-PEDIDOS.md), que também documenta
categorias, Slim/Plus, pedidos, conferência e WhatsApp. A home lista o estoque
persistido disponível, registra pedidos com reserva dos sacos e só então gera o
link para abertura da mensagem no WhatsApp.

### Insumos

Administradores cadastram e editam insumos com código gerado, tipo, unidade
e situação. O perfil Modelagem consulta o catálogo em modo de leitura.
Insumos não representam saldo de estoque. O Administrador registra preços
unitários com data de vigência, consulta o histórico e mantém custos-base
com valor e acréscimo opcionais.

### Fichas técnicas

Modelagem e Administrador podem preparar uma ficha por produto com insumos,
consumo e instruções, e enviá-la para revisão. O Administrador registra os
custos e aprova. A ficha aprovada conserva os preços usados na aprovação.
Uma nova revisão em rascunho mantém a aprovação anterior disponível até
a substituição. As revisões obsoletas ficam no histórico.

### Produção

O painel de produção acompanha lotes de produtos ativos por Planejamento, Corte, Costura,
Lavanderia (lavagem e tintura), Acabamento e Estoque. Cada responsável
acessa os setores atribuídos e envia lotes apenas à próxima etapa. O setor
de destino confirma o recebimento antes de avançar novamente. Costura e Lavanderia (lavagem e tintura) podem ser internas ou atribuídas a uma oficina cadastrada; o
administrador pode desfazer o último envio com motivo, também pelo botão "Desfazer" do aviso de envio, que registra um motivo automático. Um lote pode ser dividido
entre oficinas da próxima etapa; as quantidades devem somar o total original.
O lote original fica no histórico e a divisão não pode ser desfeita pelo painel.
A grade por tamanho é opcional e sua soma deve corresponder ao lote. Ao dividir
uma grade conhecida, informe a quantidade de cada tamanho em cada oficina.
O histórico registra
cada mudança e evita sobrescritas por alterações simultâneas. No Acabamento, a
ação "Enviar para o estoque" leva o lote para "Estoque". Ela não cadastra
sacos de estoque, que continuam sendo registrados manualmente.
O painel busca lotes por código ou produto, oferece atalhos para cada setor e
se atualiza sozinho a cada 30 segundos, exceto com uma gaveta ou confirmação
aberta.

O menu Produção abre somente o canvas em `/painel/producao`. O endereço
`/painel/producao/fluxo` permanece compatível e mostra a mesma página.
A busca destaca lotes, o modo Atenção destaca lotes parados e a receber, e
"Estoque" mostra os últimos 7 dias, preservando os totais completos.
"Novo lote" e "Oficinas" abrem pelo menu Produção. Na criação de lote,
o botão "Escolher produto" abre um painel com fotos, busca e três visualizações:
lista, cards compactos (duas colunas no celular) e cards grandes (uma coluna no
celular). A grade se adapta ao desktop e a escolha mantém os dados do lote.

### Novidades

Antes de cada entrega enviada ao GitHub, atualize `resources/changelog/index.json`
com identificador único, data, título e resumo das mudanças desde a última nota.
Indique em `details_file` um Markdown próprio em `resources/changelog/` com os
detalhes. A página pública lê esse índice e permite expandir os detalhes; as
notas acompanham o código implantado. Não é necessário abrir PR para registrar
uma entrega e repetir um push não deve duplicar a nota.

### Pedido

Uma seleção feita por uma vendedora a partir dos produtos disponíveis.

Status iniciais:

- `Pendente`
- `Finalizado`
- `Cancelado`

## Desenvolvimento e testes

O ambiente local usa PostgreSQL. Configure a conexão no `.env` e crie os
bancos `inventario` e `inventario_testing`; a suíte usa o segundo e recria
suas tabelas. Nunca aponte o banco de testes para dados que precise preservar.
Execute `composer ci:verify` para a conferência completa local.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Refatoração de estoque por saco](docs/refactors/stock-by-volume/README.md)
- [Tasklist da refatoração](docs/refactors/stock-by-volume/TASKLIST.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [ADRs](docs/adr/README.md)

## Fora do escopo do MVP

Não implementar agora:

- PCP completo
- ordem de produção
- integração com Bling
- emissão fiscal
- sincronização com lojas
- ficha técnica versionada
- regras complexas de reserva de estoque
- permissões avançadas

Esses itens podem ser incorporados futuramente sem transformar o MVP em um sistema maior do que o necessário.

No canvas, o menu de elementos (botão ou clique direito no fundo) permite ocultar ou exibir filtros, etapas, minimapa e zoom, individualmente ou todos juntos. Lotes novos começam em Planejamento. A migração unifica os lotes de Lavagem/Tinturaria em Lavanderia e Ensacamento/No estoque em Estoque, preservando os eventos anteriores. Oficinas de lavagem e tintura atendem à Lavanderia.
