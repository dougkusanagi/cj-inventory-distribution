# Roadmap

O roadmap descreve direção, não compromisso de implementação imediata.

## Catálogo e pedidos para lojistas — plano vigente

O [plano de catálogo e pedidos](CATALOGO-E-PEDIDOS.md) detalha a sequência atual,
CRUD de categorias, Slim/Plus, reserva de sacos, separação/conferência e WhatsApp.
O catálogo conectado ao banco substitui a home em `/` e também está em
`/catalog`. A persistência da sacola pública, o contato único de WhatsApp e a
gestão interna de pedidos com reserva de sacos já estão implementados. Dois
contatos ou envio automático continuam fora do MVP. As fases históricas abaixo
não significam conclusão desses módulos.

Regra definitiva: Grade Nova nunca aparece no catálogo; não há filtro por tipo.
Busca, categoria e linha Slim/Plus são os filtros da interface. Pedidos por saco
inteiro, reserva transacional e conferência da equipe são as regras vigentes do
fluxo implementado.

## Refatoração de estoque por saco

A mudança da grade e do estoque para sacos individuais possui especificação e
andamento próprios:

- [Visão geral da refatoração](refactors/stock-by-volume/README.md)
- [Tasklist e registro de execução](refactors/stock-by-volume/TASKLIST.md)

A refatoração foi concluída no ambiente de desenvolvimento: cadastro, catálogo,
dashboard e editor mobile usam `StockOfferVolume` como fonte canônica. Como o
sistema ainda não foi lançado, não houve backfill nem reconciliação de dados
legados; as migrations atuais já criam somente o modelo de sacos.

## Fase 1 — Cadastro de produtos

- [x] CRUD de produtos
- [x] código interno automático
- [x] modelo opcional
- [x] ativar/desativar produto
- [x] observação
- [x] upload de até cinco fotos com thumbnails
- [x] captura pela câmera
- [x] corte
- [x] rotação
- [x] espelhamento
- [x] cadastro de tamanhos
- [x] presets de grade
- [x] grade personalizada

## Fase 2 — Estoque disponível

- [ ] criar oferta de estoque
- [ ] tipo `Reposição`
- [ ] tipo `Grade Nova`
- [ ] tipo `Grade Furada`
- [ ] estoque total obrigatório
- [ ] quantidade opcional por tamanho
- [ ] listagem e filtros básicos

## Fase 3 — Tela das vendedoras

- [ ] link compartilhável
- [ ] layout mobile-first
- [ ] catálogo de ofertas disponíveis
- [ ] seleção por tamanho
- [ ] quantidade
- [x] sacola
- [x] persistência local da sacola
- [x] revisão do pedido
- [x] identificação da solicitante
- [x] envio do pedido
- [x] geração de mensagem para WhatsApp
- [x] idempotência no registro público

## Fase 4 — Gestão de pedidos

- [x] listagem de pedidos
- [x] detalhes
- [x] status `Pendente`
- [x] finalizar pedido
- [x] cancelar pedido
- [x] separação e conferência dos sacos
- [x] registro e resolução de divergências
- [x] histórico auditável das alterações
- [x] filtros básicos por status e busca

## Depois do MVP

Possíveis evoluções:

- auditoria geral das entidades da aplicação, registrando ações relevantes,
  autor, valores anteriores e posteriores e contexto mínimo;
- gerenciamento de estoque com entradas, saídas e histórico imutável de
  movimentações, integrado aos sacos e aos pedidos;
- usuários, lojas e permissões;
- ficha técnica versionada;
- integração com catálogo existente;
- integração com Bling;
- sincronização de produtos e estoque;
- criação de pedidos no Bling;
- PCP;
- ordens de produção;
- rastreamento por setor;
- RFID.

Cada evolução deve ser avaliada separadamente antes de entrar no escopo.

### Correções de integridade antes das próximas evoluções

Status: concluída em 15/09/2026. Os índices ativos, validações, tolerância a
relações históricas, política de exclusão/restauração e retenção dos históricos
operacionais foram implementados e cobertos por testes funcionais.

Antes de implementar auditoria geral ou movimentações de estoque, concluir uma
etapa de estabilização das exclusões lógicas e das regras de integridade. Essa
etapa é pré-requisito para que o histórico futuro não seja construído sobre
referências ambíguas ou estados que não podem ser recuperados com segurança.

#### Exclusões lógicas, unicidade e referências

- Corrigir os índices únicos de categorias e tamanhos por saco. Um índice
  composto apenas por chave de negócio e `deleted_at` não garante, em bancos
  que aceitam múltiplos `NULL`, a unicidade entre registros ativos.
- Escolher uma estratégia compatível com o banco de produção para garantir uma
  única categoria ativa por `slug` e um único tamanho ativo por saco. Validar
  essa regra no banco, além da validação da aplicação.
- Permitir reutilizar a chave de negócio de um registro excluído somente quando
  isso não tornar uma restauração ambígua. A regra deve definir se o sistema
  restaura o registro anterior, impede a restauração ou exige renomeá-lo.
- Fazer as validações `unique` e `exists` considerarem explicitamente o estado
  de exclusão. Uma categoria na lixeira não pode ser selecionada por um produto
  novo ou atualizado.
- Tornar as telas e serializers tolerantes a relações históricas ausentes,
  evitando acessar diretamente uma categoria ou outra referência que possa
  estar excluída.
- Revisar o `down()` das migrations de índices únicos. O rollback deve detectar
  ou documentar conflitos criados pela reutilização de chaves depois do soft
  delete, sem prometer uma reversão que possa falhar com dados válidos.

#### Política de exclusão, restauração e retenção

- Revisar o ADR 0015 para definir, por entidade, quem pode excluir, restaurar e
  excluir definitivamente, quais dependentes acompanham cada operação e quais
  registros operacionais devem ser imutáveis.
- Restaurar um produto deve seguir uma regra explícita para oferta, sacos,
  tamanhos e fotos. A restauração não pode recolocar estoque no catálogo sem
  verificar reserva, consumo e movimentações posteriores.
- Restaurar um pedido deve recuperar seus itens e eventos de forma consistente,
  sem recriar reserva ou saldo automaticamente.
- Excluir um pedido pendente deve ser proibido ou tratado por uma operação de
  cancelamento que libere as reservas na mesma transação. Exclusão lógica não
  pode deixar sacos presos a um pedido invisível.
- Definir o comportamento de exclusão definitiva antes de expô-la na interface.
  Chaves estrangeiras restritivas e dependentes já excluídos logicamente devem
  ser considerados na operação completa.
- `OrderEvent`, movimentações de estoque e seus itens são históricos
  operacionais. Avaliar no ADR se devem permanecer fora de `SoftDeletes`, pois
  ocultar ou remover esses registros enfraquece a rastreabilidade.

#### Critérios de aceite da estabilização

- duas categorias ativas não podem possuir o mesmo `slug`, inclusive por
  gravação direta no banco;
- dois tamanhos ativos do mesmo saco não podem possuir o mesmo valor;
- uma chave excluída pode ser reutilizada somente conforme a política definida;
- produto não aceita categoria excluída e o catálogo não falha diante de uma
  referência histórica indisponível;
- exclusão e restauração de produto preservam fotos e recuperam somente os
  dependentes permitidos pela regra;
- pedido pendente não pode ser ocultado mantendo sacos reservados;
- restauração e exclusão definitiva preservam a integridade das chaves
  estrangeiras e do histórico;
- migrations devem ser testadas no mesmo mecanismo de banco usado em produção,
  especialmente para semântica de `NULL`, índices únicos e locks.

### Auditoria geral — implementada

Status: concluída em 15/09/2026, conforme o ADR 0017.

Complementar o `OrderEvent`, que permanece como histórico operacional dos
pedidos, com uma trilha transversal para produtos, categorias, ofertas, sacos,
configurações e usuários. Registrar inicialmente criação, alteração, exclusão
lógica, restauração e exclusão definitiva, com usuário opcional para ações
públicas ou automáticas.

Os registros de auditoria devem ser imutáveis, não usar `SoftDeletes` e nunca
armazenar senhas, tokens, segredos de autenticação ou códigos de recuperação.
Leituras, buscas e outras interações sem alteração de estado ficam fora do
escopo inicial para evitar ruído e crescimento desnecessário.

Como essa implementação afeta várias partes da aplicação e estabelece uma
política durável de retenção de dados, ela deve receber um ADR próprio antes da
implementação.

### Gerenciamento de estoque e movimentações — em estabilização

Status: implementação principal concluída em 15/09/2026, conforme o ADR 0016,
mas ainda não pronta para encerramento. Uma revisão pós-implementação encontrou
pendências de integridade, concorrência, transição do editor legado e cobertura
que precisam ser resolvidas antes de considerar o módulo concluído. A abertura
inicial está disponível pelo comando `stock:open-initial`.

#### Correções obrigatórias encontradas na revisão pós-implementação

1. **Eliminar gravações físicas pelo CRUD de produto.** O cadastro e a edição
   ainda conseguem criar um saco novo diretamente por
   `SyncProductStockOffer`, inclusive em uma oferta que já contém sacos
   confirmados. Depois da ativação das movimentações, criar produto com estoque,
   adicionar saco, alterar grade ou quantidade e encerrar disponibilidade devem
   passar por entrada, saída ou estorno. O formulário de produto deve manter
   somente identidade, classificação, fotos, observações e ativação comercial;
   estoque existente fica em leitura, acompanhado de atalhos para as operações
   canônicas. Se a criação de produto oferecer estoque inicial, ela deve abrir
   uma entrada em rascunho e somente publicar os sacos depois da confirmação
   transacional da movimentação.
2. **Tornar a idempotência segura sob concorrência.** A chave deve ser adquirida
   ou reservada antes de qualquer criação ou alteração de saco. Duas requisições
   simultâneas com a mesma chave e o mesmo payload devem retornar exatamente a
   mesma movimentação sem criar sacos extras; com payload diferente, uma delas
   deve receber conflito de domínio. A solução não pode depender somente do
   índice único inserido depois dos efeitos físicos. Validar o comportamento no
   banco usado em produção, incluindo isolamento transacional, espera por locks,
   deadlock/retry e rollback integral.
3. **Restaurar somente dependentes pertencentes à mesma exclusão.** A restauração
   de produto, oferta ou saco não pode recuperar indiscriminadamente todos os
   filhos que estiverem na lixeira. É necessário distinguir os dependentes
   excluídos em cascata daqueles que já estavam excluídos antes, bloquear
   conflitos de chaves de negócio e revalidar reserva, consumo e movimentações
   posteriores antes de qualquer republicação. A operação deve ser transacional
   e apresentar erro de domínio compreensível, sem expor exceção de índice.
4. **Implementar busca e carregamento limitado na saída manual.** A seleção deve
   pesquisar no servidor por produto, modelo, código interno e código do saco,
   retornar somente sacos disponíveis e limitar/paginar os resultados. Os sacos
   já selecionados devem permanecer visíveis ao alterar a consulta. A tela não
   pode serializar todo o estoque disponível em uma única resposta nem perder a
   seleção durante busca, paginação ou erro de validação.
5. **Completar a cobertura de aceitação e concorrência.** Adicionar testes no
   banco de produção para entradas simultâneas com chave igual e payload igual ou
   divergente, além de concorrência entre saída e pedido. Cobrir tentativa
   manipulada de criar ou alterar estoque pelo CRUD após a abertura, restauração
   seletiva e conflitos de unicidade. Acrescentar testes de navegador para
   entrada, saída com busca e seleção persistente, histórico responsivo,
   estorno, bloqueio visual do editor legado e mensagens de conflito. Cada teste
   de escrita deve afirmar resposta, estoque persistido, número de sacos,
   movimentações e ausência de efeitos parciais.

Critério de encerramento desta estabilização: nenhuma escrita física ocorre fora
das actions de estoque; retries simultâneos são idempotentes; restauração não
ressuscita dependentes indevidos; a saída manual funciona com grande volume de
dados; e `composer ci:verify`, os testes no banco de produção e os fluxos de
navegador acima passam integralmente.

#### Correções de interface encontradas na auditoria visual

A auditoria de 15/09/2026 capturou todas as páginas React ligadas a rotas: 27
páginas e estados em desktop, 10 superfícies operacionais em `390x844` e quatro
superfícies representativas no tema escuro. Foram verificados catálogo,
autenticação, painel, produtos, categorias, pedidos, movimentações e
configurações. As páginas abriram sem erro de JavaScript e o detector mecânico
do design system não encontrou violações; os itens abaixo vieram da inspeção da
composição renderizada e dos fluxos reais.

1. **P1 — Eliminar overflow horizontal do histórico de movimentações no
   desktop.** A grade atual reserva larguras fixas para busca, quatro selects,
   duas datas, ordenação e botão na mesma linha. Em `1280x800`, filtros,
   contadores e ações ultrapassam a área útil do painel e ficam cortados, tanto
   no tema claro quanto no escuro. Reorganizar filtros em linhas responsivas ou
   em painel recolhível, mantendo busca e ação principal prioritárias. Nenhum
   conteúdo ou controle pode ficar fora da viewport entre 320 e 1440 px; testar
   também zoom de 200%, textos maiores e opções com rótulos longos.
2. **P1 — Impedir que a barra fixa de salvamento cubra o formulário de
   produto.** Em `390x844`, a barra “Cadastrar produto” atravessa o cartão de
   informações e oculta título, descrição e campos durante a rolagem; no
   desktop ela também sobrepõe o conteúdo inferior. Reservar no fluxo da página
   espaço igual à altura real da barra e `safe-area`, ou limitar o sticky ao
   contêiner apropriado. Todos os campos, erros, títulos e ações destrutivas
   precisam poder ser rolados para uma posição totalmente visível acima da
   barra, inclusive com teclado virtual aberto.
3. **P1 — Remover detalhes técnicos da experiência operacional.** As telas de
   entrada e saída expõem uma “Chave da operação” editável, transferindo ao
   usuário a responsabilidade pela idempotência. Gerar e manter a chave
   internamente durante retries, sem campo visível, e oferecer uma mensagem de
   recuperação compreensível quando houver conflito. No detalhe da movimentação,
   traduzir valores como `replenishment` e substituir os blocos de JSON bruto
   `{}` de estado anterior/posterior por diferenças legíveis: disponibilidade,
   reserva/consumo, total e grade. Estados ausentes devem aparecer como “Não se
   aplica”, nunca como objeto técnico vazio.
4. **P1 — Localizar completamente autenticação e passkeys.** O login mistura
   português com “Sign in with a passkey” e “Or continue with email”, e o estado
   de carregamento padrão também está em inglês. Todos os rótulos, mensagens,
   erros e estados de autenticação, confirmação de senha, recuperação, 2FA e
   passkeys devem estar em português consistente. Adicionar teste de navegador
   que habilite suporte a passkey e afirme os textos renderizados, pois o botão
   não existe quando a API não é suportada.
5. **P2 — Aumentar a densidade informacional dos resumos no celular.** O painel
   usa um cartão alto para cada uma das quatro métricas e o histórico usa sete
   cartões de largura inteira, fazendo as ações e os lançamentos começarem
   somente após várias telas de rolagem. No mobile, agrupar métricas relacionadas
   em grade compacta de duas colunas ou resumo progressivo, mantendo legibilidade
   e alvos de toque de pelo menos 44 px. No histórico, ações, busca e lançamentos
   recentes devem aparecer antes das métricas secundárias ou estas devem poder
   ser expandidas.
6. **P2 — Melhorar estados sem conteúdo e ações indisponíveis.** Pedido pendente
   sem sacos mostra instrução para separar/conferir e um botão “Finalizar pedido”
   desabilitado, mas não oferece o próximo passo correto. Exibir estado vazio
   específico com ação para editar/adicionar sacos ou cancelar. No catálogo e
   nos cards internos, “Produto sem foto” ocupa grande área vazia; usar fallback
   visual compacto e informativo, preservando a proporção fotográfica apenas
   quando houver imagem real. Botões desabilitados devem manter contraste
   suficiente e explicar junto ao controle o requisito que falta.
7. **P2 — Revisar localização de datas e consistência entre páginas de acesso.**
   Os filtros de data podem aparecer como `mm/dd/yyyy` apesar de toda a interface
   estar em português. Usar controle ou indicação inequívoca no formato
   `dd/mm/aaaa`, com nome acessível para início e fim. Padronizar recuperação de
   senha, redefinição, confirmação de e-mail e confirmação de senha com a mesma
   estrutura de marca, espaçamento e navegação de retorno do login, evitando que
   algumas páginas pareçam pertencer a outro sistema.

Critérios gerais da correção visual: repetir capturas em desktop, `390x844`,
tema claro e escuro; não permitir overflow horizontal; validar navegação por
teclado, foco visível, zoom de 200%, áreas de toque, contraste WCAG AA, estados
vazio/carregando/erro/desabilitado e ausência de erros no console. Os testes de
navegador devem comprovar comportamento e não apenas presença de texto.

#### Objetivo

Evoluir a disponibilidade atual para um gerenciamento operacional de estoque
que permita:

- registrar a entrada de um ou mais sacos;
- registrar saídas manuais justificadas;
- registrar automaticamente a saída causada pela finalização de um pedido;
- consultar um histórico cronológico e imutável de entradas e saídas;
- identificar quem realizou cada operação e qual foi sua origem;
- preservar snapshots suficientes para compreender a movimentação mesmo depois
  de alterações ou exclusões lógicas no cadastro;
- manter a disponibilidade do catálogo derivada do estado atual dos sacos, sem
  transformar o histórico em uma segunda fonte gravável para o saldo.

A experiência deve tomar como referência o histórico de lançamentos existente
em `/var/www/catalogo/current`: resumo por tipo, busca, filtros, paginação,
ordenação e itens com saldos anterior e posterior. A modelagem não deve copiar
os detalhes exclusivos daquela integração, como empresa, depósito, webhook,
saldo virtual ou identificadores do Bling, enquanto não houver requisito para
integração externa.

#### Decisões de domínio a formalizar em ADR

Antes da implementação, criar um ADR que consolide as decisões abaixo e resolva
qualquer conflito com os ADRs de estoque existentes:

1. `StockOfferVolume` continua sendo a fonte canônica do estoque físico atual.
   Uma movimentação registra uma operação ocorrida; ela não substitui os sacos
   nem mantém um saldo independente editável.
2. A entrada cria uma nova disponibilidade ou adiciona sacos a uma oferta
   compatível do produto. A regra exata para reaproveitar uma oferta deve ser
   explícita; não combinar automaticamente ofertas com tipo ou observação
   diferentes.
3. A primeira versão mantém saídas por saco inteiro, coerente com os pedidos.
   Saída parcial de peças, transferência entre locais e abertura de sacos ficam
   fora do escopo até que tenham regras próprias para redistribuir grade e
   quantidades.
4. Finalizar um pedido gera uma única movimentação de saída para os sacos do
   pedido, na mesma transação que marca os sacos como consumidos e finaliza o
   pedido. Repetir a operação não pode gerar outra baixa.
5. Cancelar um pedido pendente apenas libera a reserva; não gera entrada nem
   saída, pois o estoque físico não mudou.
6. Uma saída manual só pode consumir saco disponível, não reservado e ainda não
   consumido. Deve exigir um motivo operacional.
7. Movimentações confirmadas são imutáveis e não usam `SoftDeletes`. Correções
   são feitas por estorno vinculado à movimentação original, preservando os dois
   registros e o motivo.
8. Estornar uma saída só restaura o saco quando não existir operação posterior
   incompatível. Estornar uma entrada só será permitido quando todos os sacos
   daquela entrada continuarem disponíveis e sem referências operacionais.
9. Totais por tamanho continuam opcionais. O histórico não pode inventar uma
   distribuição por tamanho nem interpretar quantidade desconhecida como zero.
10. `Reposição`, `Grade Nova` e `Grade Furada` continuam classificando a oferta
    criada ou abastecida pela entrada, nunca o produto nem a movimentação.
11. Depois que o módulo de movimentações entrar em operação, quantidade total,
    grade, presença e quantidade por tamanho, consumo e disponibilidade física
    de um saco não podem ser alterados diretamente pelo CRUD de produto ou por
    um endpoint administrativo genérico.
12. O cadastro do produto continua responsável por identidade, classificação,
    fotos, observações e ativação comercial. Entrada, saída, estorno e correção
    física passam obrigatoriamente por actions de estoque que atualizam o saco e
    gravam a movimentação na mesma transação.
13. Um lançamento ainda não confirmado pode ser editado como rascunho. Depois
    da confirmação, nem a movimentação nem o conteúdo físico correspondente
    podem ser reescritos silenciosamente.
14. Correção de total ou grade deve ser representada por estorno e novo
    lançamento ou por um tipo explícito de ajuste. O ADR deve escolher uma das
    estratégias, definir seus efeitos no saco e exigir motivo e autor.
15. Excluir logicamente produto, oferta ou saco não substitui uma saída de
    estoque. Um saco disponível só pode deixar o saldo físico por uma operação
    registrada; exclusão administrativa deve ser bloqueada enquanto houver
    estoque ou exigir que a regularização ocorra primeiro.
16. Definir um marco inicial para os sacos existentes quando o módulo for
    ativado. O processo deve gerar uma abertura de estoque identificável e
    idempotente, com data de implantação e snapshots, sem inventar uma entrada
    histórica anterior ao sistema.
17. Todos os pontos de escrita, incluindo futuras importações e integrações,
    devem usar a mesma camada de actions de estoque. Controllers, commands,
    jobs e webhooks não podem atualizar saldo ou estado físico diretamente.

#### Transição do cadastro atual para lançamentos

O formulário atual de produto também cria, altera e encerra ofertas e sacos.
Essa responsabilidade deve ser migrada de forma explícita para evitar dois
caminhos concorrentes de alteração do estoque:

1. Implementar e validar as actions de entrada, saída, ajuste/estorno e abertura
   inicial antes de bloquear o editor atual.
2. Migrar os sacos existentes para o marco de abertura em uma operação
   idempotente, com relatório de totais e inconsistências para conferência.
3. Remover do formulário de produto a edição de total, grade e quantidades de
   sacos confirmados. A tela pode exibir o estoque em modo de leitura e oferecer
   atalhos para as operações autorizadas.
4. Permitir que o fluxo de criação de produto abra uma entrada em rascunho, mas
   somente considerar o saco disponível após a confirmação transacional do
   lançamento.
5. Bloquear no backend qualquer atualização direta, mesmo que uma interface
   antiga ou requisição manual envie os campos removidos.
6. Atualizar factories, seeders e importadores para criar estados de teste por
   meio das operações canônicas quando o teste precisar representar histórico
   real. Factories podem continuar criando registros diretamente apenas em
   testes unitários ou cenários de preparação que não afirmem existir uma
   movimentação.
7. Remover o caminho legado somente depois que catálogo, dashboard, pedidos e
   conferência consumirem corretamente o estado produzido pelas novas actions.

#### Modelo de dados proposto

Usar nomes finais definidos pelo ADR, mantendo inicialmente esta separação:

```text
StockMovement
  ├── StockMovementItem -> StockOfferVolume (incluindo registros na lixeira)
  ├── actor -> User (incluindo registros na lixeira)
  ├── order nullable -> Order (quando a origem for finalização de pedido)
  └── reversal_of nullable -> StockMovement
```

`stock_movements` deve conter, no mínimo:

```text
id
type: in | out
source: manual | order | opening
actor_id nullable
order_id nullable
reversal_of_id nullable
reason nullable
notes nullable
idempotency_key nullable e única quando aplicável
occurred_at
created_at
```

`stock_movement_items` deve conter, no mínimo:

```text
id
stock_movement_id
stock_offer_volume_id nullable
product_id nullable
stock_offer_id nullable
product_code_snapshot
product_name_snapshot
product_model_snapshot nullable
offer_type_snapshot
volume_code_snapshot
total_quantity
size_grid_snapshot nullable
previous_state
resulting_state
created_at
```

As referências podem aceitar `null` diante de exclusão definitiva, mas os
snapshots precisam manter o histórico legível. Avaliar se `previous_state` e
`resulting_state` devem ser strings controladas ou snapshots JSON mínimos. Não
duplicar payloads completos de models nem dados sem utilidade operacional.

Não criar uma tabela de saldo agregado. Totais atuais de produto e oferta
continuam calculados a partir dos sacos não consumidos. Índices devem atender
as consultas reais: data, tipo, origem, autor, pedido, produto e saco. Usar
strings com enums PHP para tipo e origem, sem enum de banco.

#### Fluxo de entrada

1. A equipe abre “Nova entrada” pelo gerenciamento de estoque ou pelo produto.
2. Seleciona o produto, o tipo da oferta, observação opcional e cadastra um ou
   mais sacos usando o mesmo editor e as mesmas regras atuais de grade.
3. Cada saco exige total positivo. Quantidades por tamanho são opcionais; quando
   alguma quantidade ativa for informada, o total é recalculado no servidor.
4. Uma prévia mostra quantidade de sacos, total de peças e grade antes da
   confirmação.
5. O servidor valida novamente e, em uma transação, cria ou seleciona a oferta,
   cria os sacos e itens e grava uma movimentação de entrada com seus snapshots.
6. Após confirmar, exibir feedback imediato e link para o detalhe da
   movimentação e do produto.

O formulário deve prevenir envio duplicado. Uma repetição com a mesma chave e
o mesmo payload retorna o resultado original; a mesma chave com payload
diferente gera conflito.

#### Fluxo de saída manual

1. A equipe inicia a saída pelo estoque ou pelo produto.
2. Pesquisa e seleciona apenas sacos disponíveis, mostrando produto, código do
   saco, total e grade.
3. Informa um motivo obrigatório e observação opcional.
4. A confirmação destaca que os sacos deixarão o catálogo e não poderão ser
   usados em pedidos.
5. O servidor bloqueia os sacos em ordem estável com `lockForUpdate`, revalida
   disponibilidade e registra consumo e movimentação em uma única transação.
6. Se qualquer saco estiver reservado, consumido ou indisponível, nenhuma
   alteração parcial é persistida e a interface informa quais itens mudaram.

#### Saída por pedido

- Reutilizar a action de finalização de pedido como único ponto da operação;
- criar a movimentação dentro da mesma transação da finalização e da baixa;
- usar o identificador do pedido como origem rastreável e aplicar idempotência;
- armazenar snapshots dos itens no momento da saída;
- manter `OrderEvent::Completed` como evento operacional do pedido e relacionar
  a movimentação correspondente, sem duplicar toda a auditoria no metadata;
- uma falha ao registrar a movimentação deve impedir a finalização, evitando
  pedido finalizado sem histórico de saída.

#### Estorno e correções

- Não editar nem excluir uma movimentação confirmada.
- Disponibilizar “Estornar” somente para equipe autorizada e exigir motivo.
- O estorno cria uma movimentação inversa ligada por `reversal_of_id` e registra
  autor e data.
- Uma movimentação só pode ser estornada uma vez.
- O detalhe deve mostrar claramente o vínculo entre original e estorno.
- Na primeira versão, não permitir estorno de saída originada por pedido sem
  uma regra também definida para o pedido finalizado. Até essa decisão, essas
  correções devem exigir procedimento administrativo fora do sistema.

#### Histórico e interface

Criar uma página interna “Histórico de estoque”, mobile-first, contendo:

- cartões com totais de todas as movimentações, entradas, saídas, saídas por
  pedido, saídas manuais e estornos;
- busca por nome, modelo, código interno do produto, código do saco, pedido e
  usuário responsável;
- filtros por tipo, origem, usuário, produto e intervalo de datas;
- ordenação por mais recentes ou mais antigas;
- paginação no servidor preservando filtros na URL;
- estados vazios distintos para ausência de movimentações e filtros sem
  resultado;
- detalhe expansível ou página de detalhe com data, autor, origem, motivo,
  observação, pedido relacionado e sacos movimentados;
- para cada item, snapshots do produto e saco, total, grade conhecida e estado
  anterior/posterior;
- indicadores visuais claros para entrada, saída, saída por pedido e estorno;
- links para produto, pedido e saco somente quando o destino ainda existir e o
  usuário tiver autorização.

Os contadores devem partir da mesma consulta-base dos filtros, como no sistema
de referência, evitando números que representem outro recorte. Consultas devem
usar eager loading, ordenação determinística por `occurred_at` e `id` e não
carregar o histórico inteiro no navegador.

#### Autorizações e auditoria

- Somente usuários da equipe podem consultar o histórico ou registrar
  movimentações manuais.
- Definir policies para visualizar, criar saída, criar entrada e estornar.
- `actor_id` pode ser nulo somente para origens automáticas claramente
  identificadas; ações manuais sempre exigem usuário autenticado.
- A movimentação é o registro operacional da mudança de estoque. A futura
  auditoria geral registra alterações administrativas nos cadastros, mas não
  deve criar outra movimentação nem ser usada para calcular disponibilidade.
- Não armazenar segredos, dados de autenticação ou payloads integrais sem
  necessidade.

#### Plano de implementação

1. Criar e aprovar o ADR de movimentações, incluindo regras de oferta,
   estorno, retenção e vínculo com pedidos.
2. Criar enums PHP, migrations, models, relações, factories e policies.
3. Implementar actions transacionais e idempotentes para entrada, saída manual,
   saída por pedido e estorno.
4. Integrar a finalização de pedido sem alterar o fluxo
   `Pendente -> Finalizado` ou `Pendente -> Cancelado`.
5. Implementar requests, controllers e resources/props necessários.
6. Criar a interface mobile-first reutilizando o editor de sacos e os
   componentes shadcn existentes; usar Wayfinder para todas as rotas.
7. Adicionar o histórico com filtros, contadores, paginação e detalhes.
8. Atualizar dashboard e telas de produto somente com atalhos e indicadores que
   tenham utilidade operacional comprovada.
9. Atualizar arquitetura, ADRs afetados e documentação das regras de estoque.

#### Cobertura e critérios de aceite

Os testes devem comprovar comportamento observável e invariantes de domínio;
não basta verificar que um model usa determinado trait ou que uma tela contém
um texto. Cada alteração deve começar pelo teste funcional mais estreito que
exercite o fluxo real e seus efeitos persistidos.

Adicionar testes Pest para, no mínimo:

- entrada com um e vários sacos, grades numéricas, alfabéticas e personalizadas;
- entrada com total manual e com quantidades por tamanho;
- preservação de quantidades desconhecidas;
- rejeição de total zero, payload inválido e idempotência conflitante;
- saída manual somente de sacos disponíveis e motivo obrigatório;
- concorrência entre saída manual e criação/finalização de pedido;
- atomicidade quando um dos sacos deixa de estar disponível;
- finalização cria exatamente uma movimentação e uma repetição não duplica a
  baixa;
- cancelamento libera reserva sem criar movimentação física;
- snapshots continuam legíveis depois de soft delete de produto, oferta, saco
  ou usuário;
- movimentações não podem ser editadas ou excluídas pela aplicação;
- regras e bloqueios de estorno;
- autorização para histórico e operações;
- filtros combinados, busca, ordenação, paginação e isolamento de contadores;
- catálogo e dashboard refletem imediatamente a disponibilidade resultante.

Acrescentar cobertura específica para a transição e para as correções de
integridade:

- edição do produto não consegue alterar total, grade ou quantidades de um saco
  confirmado, tanto pela interface quanto por requisição manipulada;
- entrada em rascunho pode ser alterada e sua confirmação cria uma única
  movimentação com o mesmo estado persistido no saco;
- ajuste ou estorno exige motivo, preserva o lançamento original e produz o
  saldo esperado sem dupla aplicação;
- exclusão lógica não retira estoque disponível sem movimentação;
- abertura inicial é idempotente e reconcilia a contagem de sacos e peças;
- unicidade de categorias e tamanhos ativos é garantida pela validação e por uma
  tentativa direta no banco;
- categorias excluídas não podem ser atribuídas a produtos, e uma relação
  histórica ausente não derruba catálogo ou painel;
- restauração em cascata segue a política definida e não republica saco
  reservado, consumido ou incompatível;
- excluir ou restaurar pedido não deixa reserva órfã;
- exclusão definitiva respeita histórico e chaves estrangeiras.

Distribuir a verificação por camada:

- testes funcionais para validação, autorização, transações, snapshots,
  idempotência, soft deletes, restauração e efeitos no banco;
- testes de integração com o banco de produção para índices únicos, locks,
  concorrência e comportamento de `NULL` que SQLite em memória não reproduza;
- testes de navegador somente para interações que dependem de JavaScript ou da
  composição real da tela: criação e confirmação de entrada, bloqueio visual da
  edição, saída, estorno/ajuste, erro de concorrência, filtros e consulta mobile;
- em todo teste de escrita, afirmar resposta, estado persistido e efeitos
  colaterais relevantes, como reserva, consumo, evento e movimentação;
- evitar testes que apenas repetem implementação do framework. Testes
  arquiteturais podem exigir traits e convenções, mas não substituem os testes
  comportamentais correspondentes.

Criar testes de navegador apenas para os fluxos críticos de entrada, saída,
confirmação, erro por concorrência e consulta mobile do histórico. Ao concluir,
executar os testes relacionados, formatter/linters e `composer ci:verify`.

O `composer ci:verify` só é considerado aprovado quando todas as etapas passam,
inclusive os testes de navegador. Corrigir expectativas antigas depois de uma
mudança de regra e manter cenários que detectem regressões reais, sem tornar a
suíte verde apenas removendo assertions relevantes.

#### Preparação para integração e PCP

As movimentações tornam o estoque rastreável e fornecem uma boa fronteira para
integrações, mas não constituem um PCP completo. A evolução futura deve preservar
a separação entre identidade comercial do produto, estoque físico, oferta para
distribuição e produção.

- Tratar `StockOfferVolume` como unidade física atual da distribuição, sem
  transformá-lo antecipadamente em lote ou ordem de produção.
- Fazer integrações consumirem comandos idempotentes de entrada e saída, com
  identificador externo, origem, tentativas e reconciliação, em vez de gravarem
  diretamente nas tabelas de sacos.
- Antes do PCP, criar ADR específico para variantes/SKUs industriais, unidades
  de medida, ficha técnica versionada, matérias-primas, lotes, ordens e etapas
  de produção.
- Avaliar quando o estoque físico deverá existir independentemente de uma oferta
  comercial. Hoje o saco pertence à oferta; um PCP poderá produzir ou armazenar
  itens antes de eles serem disponibilizados às lojistas.
- Não inferir ficha técnica, consumo de matéria-prima ou planejamento de
  capacidade a partir da grade dos sacos. Esses dados têm ciclo de vida e
  versionamento próprios.
- Manter snapshots e identificadores estáveis para que pedidos e movimentações
  continuem legíveis após mudanças futuras no cadastro industrial.

#### Fora do escopo inicial

- integração ou sincronização com Bling;
- múltiplos depósitos ou transferências entre locais;
- saída parcial de um saco;
- inventário físico e reconciliação em massa;
- custo médio, valorização financeira ou contabilidade;
- lotes de produção, validade, RFID ou rastreamento por setor;
- edição ou exclusão de movimentações confirmadas;
- importação de histórico externo.
