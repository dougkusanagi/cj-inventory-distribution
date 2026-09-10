# Catálogo para lojistas e operação de pedidos

Plano atualizado em 09/09/2026. Este documento distingue o frontend entregue
das etapas futuras. O CRUD de categorias e a gestão interna de pedidos estão
disponíveis. O checkout público registra e reserva os sacos antes de abrir a
mensagem do pedido no WhatsApp configurado pela equipe.

## 1. Escopo e situação atual

**Entregue nesta etapa:** catálogo em `/` e `/catalog`, usando o mesmo
componente e produtos disponíveis consultados no banco. Cards responsivos,
busca por nome/modelo/código,
filtros por categoria e linha Slim/Plus, seleção de sacos distintos e revisão
da sacola funcionam localmente no navegador. Grade Nova nunca aparece.

O `CatalogDemoSeeder` cria categorias, classificação Slim/Plus, ofertas em
sacos e anexa as fotos de demonstração versionadas pela Media Library. Ele
prepara o banco local com `php artisan migrate --seed` e pode ser executado
novamente sem duplicar registros ou mídias. A sacola não persiste ao
recarregar; ao confirmar, porém, coleta a identificação mínima, grava o pedido,
reserva os sacos e abre o `wa.me`. Sem um WhatsApp de destino configurado no
painel, a confirmação fica indisponível.

As factories permitem montar cenários de teste sem repetir atributos:

```php
$category = Category::factory()->create();
$product = Product::factory()->inCategory($category)->plus()->create();
$offer = StockOffer::factory()->replenishment()->for($product)->create();
$volume = StockOfferVolume::factory()->for($offer)->withTotal(20)->create();
StockOfferVolumeItem::factory()->for($volume)->withQuantity(4)->create();
```

Também há os estados `slim`, `plus`, `replenishment`, `brokenGrade`,
`inactive`, `withTotal`, `withQuantity` e `inactive` nos factories
correspondentes. O tipo padrão de `StockOfferFactory` continua sendo Grade
Nova para preservar os testes e o comportamento já existente.

**Referência visual inspecionada:**
`/home/servidor/www/catalogo/current/resources/js/components/CategoryPage.tsx`
e `ProductCard.tsx`. Reutilizamos a composição de cards com imagem,
identificação, informações e ação direta, em grade de 1/2/3 colunas conforme
a largura. Não usamos a home de painéis/colunas verticais, preços, promoções
ou regras de seleção por peça daquele projeto. Mantemos os tokens do estoque,
suporte a claro/escuro, imagens futuras em 4:5 e os componentes shadcn existentes.

**Código existente relevante:** Product, StockOffer, StockOfferVolume,
StockOfferVolumeItem e CRUD de produtos já existem. Categorias e a linha
Slim/Plus já têm model, migration, enum, factories e seeder demonstrativo;
O CRUD de categorias está conectado ao cadastro de produtos. A gestão interna
de pedidos permite registrar pedidos por saco inteiro, consultar, editar os
dados enquanto pendente, cancelar e finalizar, com reserva transacional. O
catálogo público usa os dados persistidos e ainda não registra pedidos. O scope
`StockOffer::availableForCatalog` exclui Grade Nova e sacos reservados ou já
consumidos; o dashboard usa uma consulta interna própria para continuar
mostrando Grade Nova na operação.

## 2. Decisões confirmadas e propostas

### Confirmadas pelo usuário

- Catálogo público substitui a home padrão e lista produtos em cards.
- Filtros simples: categoria e Slim/Plus, além da busca.
- **Grade Nova nunca aparece no catálogo.** Não existe filtro, opção de
  configuração ou exceção de usuário para habilitá-la. Ver ADR 0011.
- Categorias terão CRUD: calça, bermuda, short, cropped e outras cadastradas.
- Pedidos terão seção de separação e conferência dos sacos.
- WhatsApp usa `wa.me`, com um número de destino configurável no sistema.

### Propostas para validar antes da implementação do domínio

1. **Pedir sacos inteiros.** Cada item aponta para um saco físico único,
   escolhido uma única vez. Os tamanhos informam o conteúdo; não fracionam
   o saco. O frontend demonstra essa proposta. Se a fábrica permitir abrir
   sacos e retirar peças, será necessário outro modelo de reserva e baixa.
2. **“Linha: Slim / Plus”.** Tratar como classificação comercial do produto,
   independente do tamanho. Confirmar que “Slim” significa a linha oposta a
   Plus na operação; em outros contextos também significa corte ajustado.
   Não deduzir linha por tamanho, categoria ou nome.
3. **Reserva ao registrar o pedido**, não ao adicionar à sacola nem ao abrir
   o WhatsApp. Liberação no cancelamento; baixa na finalização. Impede que
   duas lojas recebam confirmação para o mesmo saco.
4. **Catálogo sem login para lojistas**, identificação curta na confirmação;
   painel restrito à equipe. Não usar o cadastro público atual como forma de
   conceder acesso interno. Definir a distinção equipe/lojista antes de abrir
   pedidos reais.
5. **Finalizado significa separado, conferido e liberado para expedição**,
   não confirmação de recebimento pela loja. Recebimento e rastreamento de
   transportadora ficam fora da primeira versão.

Nenhuma dessas propostas altera as regras persistidas nesta etapa. O ADR
0012 as registra como propostas; somente a exclusão de Grade Nova é definitiva.

## 3. Experiência da lojista

Fluxo: catálogo → escolher sacos → revisar sacola → identificar loja e
responsável → registrar pedido → abrir WhatsApp.

- Cabeçalho pequeno com marca e sacola; produtos aparecem sem um grande banner.
- Busca tolerante a maiúsculas/acentos, por nome, referência e código interno.
- Categoria e linha com “Todas as opções”. Filtros visíveis no desktop e
  expansíveis no celular, com contador e botão para limpar.
- Foto de capa 4:5, nome, referência quando houver, categoria, linha, tamanhos
  presentes e totais de sacos/peças. Fotos reais usarão as miniaturas existentes,
  lazy loading e fallback quando ausentes ou indisponíveis.
- “Escolher sacos” abre seleção simples com identificação do saco, total e grade.
- Quantidade desconhecida por tamanho será exibida como “Não informada”, nunca
  como zero. Tamanhos numéricos e letras continuam válidos.
- Selecionar sacos diferentes soma seus totais; não existe multiplicador para
  um saco físico. Remoção fica na revisão. Sem selecionar todos por padrão.
- Sacola com total e ação fixa; áreas de toque de pelo menos 44 px,
  teclado adequado, foco visível e mensagens objetivas.
- Futuro checkout: loja, nome do responsável, WhatsApp e observação opcional.
  Confirmar se código de cliente já identifica destino; pedir endereço apenas
  se necessário para expedição. Não criar cadastro longo por antecipação.
- Ao perder disponibilidade, manter a sacola e informar quais sacos precisam
  ser removidos. Não substituir mercadoria automaticamente.
- Futuro rascunho local guarda somente IDs dos sacos; revalidar no servidor
  ao recuperar e confirmar. A prévia atual não persiste o rascunho.
- Confirmação real retorna número do pedido; repetir a abertura do WhatsApp
  não cria outro pedido. Sem chamar “Enviado” apenas porque abriu um link.

## 4. Regra do catálogo real

Aplicar no servidor, antes de paginação, contagem, filtros e serialização:

1. Produto ativo e oferta ativa.
2. Oferta **não é Grade Nova** (`new_grade`).
3. Existe saco com total positivo e disponível para pedido.
4. Sacos reservados/baixados não participam de opções nem totais públicos.

Categoria e linha não podem contornar essa regra. Resultados de busca,
detalhes, parâmetros de URL e validação do pedido seguem a mesma elegibilidade.
Não enviar Grade Nova no payload público e apenas escondê-la com JavaScript.
Um produto com mais de uma oferta deve ser avaliado pelas ofertas elegíveis;
não mudar o tipo do produto, pois tipo pertence à oferta.

Criar consulta/resource de catálogo com somente os dados necessários. Utilizar
as relações carregadas e paginação por lotes com botão “Carregar mais”, mantendo
filtros na URL. Não baixar o inventário inteiro no navegador. Usar Actions
de domínio para registro, reserva, cancelamento e finalização; o frontend não
é fonte de verdade para totais nem disponibilidade.

## 5. Categorias e Slim/Plus

### Modelagem proposta

- `categories`: id, name, is_active, timestamps. Nome único normalizado
  (espaços e diferença de caixa não geram duplicatas). Lista plana, sem
  subcategorias, ícones obrigatórios ou configurações avançadas.
- `products.category_id`: FK explícita para categories, exclusão restrita.
- `products.line`: string nullable com enum PHP `Slim` / `Plus`, sem enum do
  banco. Não criar CRUD para dois valores fixos.
- Introduzir campos nullable para produtos existentes e oferecer filtro
  interno “Cadastro incompleto”. Não classificar todo o legado como Slim nem
  inventar categorias por palavras do nome.
- Após revisão do legado, exigir categoria e linha nos novos cadastros e
  edições completas. Produtos legados sem classificação continuam encontráveis
  em “Todos” durante a transição; não exibem selos inventados.
- Não criar novos presets de tamanho a partir da linha Plus. Manter numérica
  feminina, letras e personalizada. A grade continua pertencendo ao saco.

### CRUD da equipe

- Listagem com nome, status e número de produtos; buscar, criar e editar.
- Formulário com nome e Switch existente para ativo/inativo.
- Exclusão permitida somente sem produtos vinculados; caso contrário,
  apresentar “Categoria em uso. Desative ou reclassifique os produtos”.
- Desativada: indisponível para novas atribuições, mas preservada nos produtos
  existentes e históricos. Não ocultar automaticamente estoque pelo status
  da categoria; filtros públicos continuam úteis para produtos vinculados.
- No produto: seletor “Categoria” e opções exclusivas “Linha: Slim / Plus”.
  Atalho para cadastrar categoria só para equipe autorizada, preservando
  o formulário em andamento.

## 6. Pedidos e estoque

### Estrutura proposta

| Entidade | Dados principais |
| --- | --- |
| Order | código automático, loja, responsável, WhatsApp, observações, status, token de acesso público, chave de idempotência, datas de envio/finalização/cancelamento, responsáveis internos |
| OrderItem | order_id, stock_offer_volume_id, product_id, snapshots de produto/código/modelo/categoria/linha/tipo, identificação do saco, total de peças e grade, separated_at/by, checked_at/by, divergência e resolução |
| StockOfferVolume | código físico imutável, referência da reserva atual, consumed_at para saída definitiva, dados existentes da grade/total |
| OrderEvent | evento, autor, data, motivo e dados mínimos da mudança; trilha de conferência, divergência, cancelamento e finalização |

FKs explícitas. `OrderItem` único por `(order_id, stock_offer_volume_id)`.
O pedido não usa a posição “Saco 1” como identificador; ela muda ao reordenar.
Propor código legível e imutável, por exemplo `SC-000123`, para etiquetar o
saco físico. Impressão simples de etiqueta pode entrar nesta fase;
leitor QR/código de barras fica como melhoria posterior.

Snapshots preservam o que foi solicitado mesmo que o produto seja renomeado.
A mensagem WhatsApp é derivada desses dados, não um campo que substitui itens.
Para saco inteiro, o item representa uma unidade física e armazena o total
de peças; não sobrecarregar `quantity` com significados diferentes.

### Concorrência e reserva simples

- Registrar pedido e reservar todos os sacos em uma única transação.
- Bloquear linhas de sacos em ordem estável, revalidar oferta, produto, tipo,
  quantidade e reserva; se um falhar, não registrar parcialmente o pedido.
- Uma referência de reserva no próprio saco fornece um único proprietário;
  não depender apenas de uma consulta “não existe item pendente”.
- Chave de idempotência única evita pedidos duplicados por toque duplo,
  retry de rede ou reabertura do WhatsApp. Mesmo identificador com payload
  diferente deve gerar conflito, não reaproveitar silenciosamente outro pedido.
- Reservar não altera totais físicos; disponibilidade pública desconta a
  reserva. Cancelar libera reserva. Finalizar marca saída definitiva e remove
  a reserva na mesma transação. Nenhuma repetição causa segunda baixa.
- Não implementar expiração automática inicialmente; listar pedidos antigos
  pendentes para equipe revisar. Definir prazo operacional antes de automatizar.
- Revisar a edição atual: `SyncProductStockOffer` apaga sacos omitidos e itens
  removidos. Bloquear exclusão/alteração do conteúdo de sacos reservados ou
  consumidos. Desativar produto/oferta pode ocultar disponibilidade sem apagar
  pedidos; encerrar estoque deve bloquear quando existirem reservas.
- Produtos/sacos referenciados por pedidos não podem ser apagados em cascata.
  Usar restrição de exclusão e arquivamento quando necessário.
- Revisar agregado interno, dashboard, auditoria de estoque e resource para
  distinguir estoque físico, reservado e disponível sem contar sacos já baixados.

### Operações do pedido

Manter somente `Pendente → Finalizado` ou `Pendente → Cancelado`.
Separação e conferência são progresso dentro de Pendente, não novos status.

- Listar por número, loja, data, status e progresso; prioridade para pendentes.
- Criar pela lojista; equipe pode registrar em nome da loja usando as mesmas
  validações. Detalhar, cancelar e finalizar; não oferecer exclusão definitiva.
- No painel, abrir o link `wa.me` do pedido é pré-requisito para finalizar. O
  clique libera a ação apenas no navegador e não comprova que a mensagem foi
  enviada ou entregue.
- Alteração de contato/observação em Pendente com histórico. Na primeira versão,
  mudar os sacos exige cancelar e registrar novo pedido, evitando um editor
  complexo que invalide silenciosamente a separação.
- Cancelamento exige motivo; se já houver saco separado, avisar que precisa
  voltar ao local de estoque. Cancelar não apaga as conferências do histórico.
- Pedidos finalizados/cancelados ficam somente leitura. Correções posteriores
  de devolução/reabertura ficam fora da primeira versão.

## 7. Separação e conferência no chão de fábrica

Dentro do pedido, mostrar “Separação e conferência” com progresso, por exemplo
“2 de 4 sacos conferidos”. Cada cartão apresenta foto, nome e código da peça,
código físico do saco, total, grade e duas ações com texto:

1. **Marcar como separado**: funcionário encontrou e separou o saco; gravar
   data/autor imediatamente com retorno “Salvo”.
2. **Conferir saco**: verificar identidade e total, depois marcar conferido.
   Só habilitar após separação. Quantidades por tamanho podem ficar desconhecidas.

Botão “Registrar divergência” abre nota curta; divergência aberta bloqueia a
finalização. Não forçar o funcionário a inventar quantidade por tamanho.
Para identidade/conteúdo errado, cancelar e refazer após ajuste de estoque;
para apontamento incorreto, resolver com motivo e nova conferência. Não trocar
um saco por outro sem revisão da loja. Desfazer separação desfaz conferência,
registra evento e atualiza progresso.

Finalizar só quando todos os sacos estiverem separados, conferidos, sem
divergências e ainda reservados ao pedido. Fazer uma última verificação no
servidor dentro da transação. Preservar autoria/data, com controle de versão
ou checagem do estado esperado para ações concorrentes da equipe.

Não exigir dois funcionários diferentes no MVP; permitir o mesmo funcionário
executar as etapas, mantendo autoria. Não usar ações só por ícone, arrastar,
gestos ocultos ou confirmação repetida para cada marcação comum. Oferecer
desfazer para enganos; confirmação explícita para cancelar/finalizar.

## 8. WhatsApp: um ou dois números

`wa.me` abre **uma conversa com um destinatário por link**, com texto
preenchido. A pessoa ainda precisa tocar em enviar. Não envia automaticamente,
não confirma entrega e não endereça dois telefones em um único link.
Fonte: [Central de Ajuda do WhatsApp](https://faq.whatsapp.com/5913398998672934/?locale=pt_BR).

Proposta de configuração interna simples, registro único `order_settings`:

- Contato principal obrigatório ao habilitar pedidos: nome amigável e telefone.
- Segundo contato opcional: nome e telefone; impedir duplicação do principal.
- Validar e normalizar telefone internacional (DDI + DDD + número, somente
  dígitos no link). O formato não comprova que o telefone tem WhatsApp.
- Somente equipe autorizada edita; botão para testar abre conversa e não
  transmite pedido. Na ausência de contato válido, mostrar indisponibilidade
  antes do checkout; não registrar pedidos sem uma rota operacional definida.

Após registrar o pedido: “Pedido PED-000123 registrado” e botão
“Enviar para Atendimento”. Se houver segundo número: “Enviar também para
Expedição”. São duas ações independentes, com o mesmo número de pedido;
não abrir duas janelas automaticamente. A etiqueta pode indicar “Conversa
aberta” após clique, nunca “Mensagem entregue”.

Mensagem: número, loja/responsável, contato, produtos/referências, códigos dos
sacos, totais e observação relevante. Criar `OrderWhatsAppMessage` para montar
o texto a partir dos snapshots. Codificar o parâmetro `text`; não armazenar
a mensagem como fonte de verdade e não confiar nos totais enviados pelo browser.

Para pedidos longos, gerar resumo e referência ao pedido; acesso da equipe
via link autenticado, e acesso da lojista por token aleatório não enumerável
com conteúdo mínimo. Oferecer “Copiar mensagem” como alternativa se o aplicativo
não abrir. Não depender de um limite universal de URL: verificar compatibilidade
em aparelhos reais e manter a mensagem curta por padrão.

Envio automático garantido para dois números exigiria outra integração e
outras regras operacionais; não faz parte da solução `wa.me` solicitada.

## 9. Acesso e proteção operacional

- Catálogo pode ser público; pedidos completos e conferência são privados.
- A aplicação tem autenticação e cadastro público do starter kit. Antes de
  pedidos reais, restringir admissão da equipe ou aplicar autorização explícita;
  `auth` sozinho não distingue funcionário de lojista recém-cadastrado.
- Token público de alta entropia, revogável, sem IDs sequenciais como segredo;
  não listar todos os pedidos por telefone informado. Evitar dados pessoais
  no catálogo e em logs. Checkout com validação e limitação de tentativas.
- Form Requests, policies, transações, enums PHP e componentes existentes;
  manter stack, dependências e Wayfinder. Não criar integrações ERP, pagamentos,
  contas de lojistas ou permissões granulares sem necessidade confirmada.

## 10. Sequência de implementação

| Fase | Entrega | Critério de conclusão |
| --- | --- | --- |
| 0 — atual | Frontend demonstrativo da home e catálogo | Cards, busca, filtros, sacola sem duplicação; Grade Nova ausente; testes e build |
| 1 | Categorias, linha e migração gradual | CRUD autorizado, exclusão protegida, produto classificado, legado sem classificação inventada |
| 2 | Catálogo com dados reais | Consulta paginada; fotos reais; Grade Nova excluída no servidor de qualquer resposta pública; totais elegíveis |
| 3 | Pedido, reserva e proteção de estoque | Checkout idempotente, transações concorrentes, bloqueio de edição/exclusão dos sacos vinculados |
| 4 | Painel e conferência | Separar/conferir/desfazer/divergência; finalização/cancelamento consistentes e auditados |
| 5 | Configuração e WhatsApp | Um/dois contatos, mensagem derivada, copiar, nenhum envio automático alegado |
| 6 | Piloto na operação | Testar com lojista e funcionário em celulares reais; validar etiqueta, nomes e tempo para montar/conferir pedido |

Fases 3–5 devem estar completas antes de liberar pedidos reais. A home atual
continua marcada como demonstração até conexão real e validação operacional.

## 11. Testes e aceite futuro

- Categoria: criar/editar/inativar, duplicatas e exclusão vinculada; autorização.
- Linha: enum válido, legado sem classificação, modelos opcionais, nenhuma
  interferência nos tamanhos numéricos/alfabéticos.
- Catálogo: nunca revelar Grade Nova mesmo por busca, detalhe ou URL manipulada;
  produto/oferta inativos, saco vazio/reservado/baixado, total correto e paginação.
- Pedido: saco duplicado, total adulterado, saco de Grade Nova, indisponibilidade,
  duas lojas concorrendo, retry idempotente e falha com rollback completo.
- Conferência: ordem das ações, divergência bloqueante, desfazer, concorrência,
  autorização, tentativa de finalizar incompleto e dupla finalização.
- Cancelamento: liberar somente suas reservas, preservar eventos e impedir
  cancelamento de finalizado. Proteger exclusões em produtos/ofertas/sacos.
- WhatsApp: um/dois números, normalização, duplicatas, acentos/caracteres especiais,
  texto derivado dos snapshots, mensagem longa e retorno sem criar outro pedido.
- Browser: 320/390/768/1280 px, claro/escuro, toque e teclado, filtros vazios,
  foco em drawers, rolagem interna, sacola vazia e erro sem perda dos dados.
- Toda fase: testes relacionados, formatter/linter e `composer ci:verify` local.

## 12. Melhorias recomendadas antes de liberar

Prioridade alta: código físico do saco, reserva sem duplicação, proteção contra
exclusão do estoque vinculado, distinção de equipe/lojista e clareza entre
“pedido registrado” e “mensagem enviada”. São condições para uma operação
confiável, não funcionalidades cosméticas.

Também revisar a clareza da contagem antes do piloto: pela regra vigente,
preencher uma única quantidade por tamanho já substitui o total manual pela
soma das quantidades conhecidas. O catálogo usa o total canônico do saco,
sem inferir a soma dos tamanhos nem tratar desconhecido como ausência.
Explicitar esse comportamento no cadastro; permitir contagem parcial junto
com um total manual independente exigiria decisão de domínio adicional.

Confirmar em uma conversa curta com a operação: sacos sempre fechados; significado
de Slim; campos que identificam a loja/destino; momento exato de finalizar;
se o segundo contato é alternativo ou também deve receber. As propostas acima
permitem avançar no frontend sem antecipar essas mudanças no banco.
