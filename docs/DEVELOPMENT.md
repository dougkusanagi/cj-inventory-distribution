# Desenvolvimento

## Objetivo

Manter o projeto fácil de entender, testar e evoluir sem antecipar complexidade de PCP, ERP ou integração externa.

## Setup

Use os requisitos definidos pelo próprio projeto (`composer.json`, lockfile JavaScript e `.env.example`) como fonte de verdade.

Fluxo esperado em uma instalação nova:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
```

Use Bun 1.4.2, definido em `package.json`, com o `bun.lock` versionado:

```bash
bun install --frozen-lockfile
bun run build
```

Para adicionar dependências, use `bun add`; não gere `package-lock.json`.

Para visualizar o catálogo com dados demonstrativos, execute:

```bash
php artisan migrate --seed
```

O `DatabaseSeeder` só executa em ambientes `local` e `testing`. Ele cria as
contas demonstrativas que ainda não existem, sem redefinir senhas ou perfis
de contas existentes. Nunca use essas contas como contas reais de produção;
crie usuários da equipe com `php artisan user:create`. O painel exige a
verificação do e-mail, inclusive depois de alterar o endereço no perfil.

Administradores também podem criar contas e gerenciar acessos pela tela
“Usuários”. A pessoa define a própria senha pelo link enviado por e-mail;
configure um transporte real de e-mail em produção. O mailer `log` serve
somente para conferir mensagens em desenvolvimento. Nenhuma senha provisória
é mostrada na interface. O broker limita reenvios a um por minuto e expira
os links em 60 minutos. Após uma falha de envio, use “Enviar link” na conta
já criada, em vez de criar outra conta.

O seeder cria o usuário local `test@example.com` e chama o
`CatalogDemoSeeder`, que é idempotente. Ele cadastra categorias, produtos
classificados como Slim/Plus e estoque com sacos e quantidades. O produto de
tipo Grade Nova existe apenas para testar a regra de exclusão do catálogo;
fotos reais ainda precisam ser enviadas pelo cadastro de produtos.

## Rastreio de erros com Bugsink

O Laravel usa `sentry/sentry-laravel` para enviar exceções reportáveis e o
React usa `@sentry/react` para erros não tratados e rejeições de promises.
Configure `SENTRY_LARAVEL_DSN` com o DSN HTTPS público do projeto no Bugsink;
o hostname deve ser `bugsink.cronicasjeans.com.br`, mesmo se a tela de setup
mostrar `localhost`. `VITE_SENTRY_DSN` reutiliza esse valor no frontend.
Sem DSN configurado, o envio fica desativado.

`SENTRY_ENVIRONMENT` distingue os ambientes e `SENTRY_RELEASE` pode receber
a versão ou SHA implantado; as variáveis `VITE_SENTRY_*` correspondentes são
incorporadas durante o build. Após alterar o ambiente, refaça o build e o
cache de configuração. Não versione o `.env` preenchido.

Para verificar a comunicação, execute `php artisan sentry:test` e confira
o evento no projeto do inventário no Bugsink. Esse comando envia um evento
de teste real. Traces, métricas e logs independentes não são enviados;
a coleta automática de dados pessoais e corpos de requisição está desativada.
Alertas por email dependem da configuração SMTP da instância Bugsink.

## Convenções Laravel

Preferir recursos nativos:

- Form Requests para validação;
- Policies quando autorização realmente for necessária;
- Eloquent relationships;
- casts;
- PHP enums para estados/tipos;
- Spatie Media Library para imagens de produto;
- transactions para operações compostas;
- Services/Actions apenas quando reduzirem complexidade real.

Evitar controllers com regras de negócio extensas.

## Enums iniciais

Sugestão:

```text
StockOfferType
- Replenishment
- NewGrade
- BrokenGrade

OrderStatus
- Pending
- Completed
- Canceled

ProductLine
- Slim
- Plus
```

Os valores persistidos devem ser estáveis e independentes dos rótulos apresentados na interface.

## Código interno de produto

O código deve:

- ser único;
- ser criado pelo sistema;
- não depender do modelo informado pelo usuário.

Exemplo:

```text
CJ-000001
CJ-000002
CJ-000003
```

A estratégia exata de geração pode ser definida durante a implementação, desde que não dependa de contar registros de forma sujeita a colisões concorrentes.

## Validação de produto

Regras mínimas:

```text
name: obrigatório
model: opcional
images: opcional, até cinco imagens
notes: opcional
stock_volumes: zero ou mais; quando informados, ao menos um saco
```

Um produto pode ser salvo sem sacos em estoque. O tipo de grade pertence ao
produto (Grade Nova por padrão) e cada saco precisa de total manual ou
calculado.

## Validação do estoque

```text
product: obrigatório
stock_offer_type: do produto; não é enviado na entrada
stock_volumes: ao menos um saco por entrada
stock_volumes.*.total_quantity: inteiro >= 0; manual ou calculado por saco
stock_volumes.*.items.*.size: string, distinto dentro do saco
stock_volumes.*.items.*.quantity: inteiro >= 0 ou null
```

O tipo não deve ser deduzido das quantidades por tamanho.

Todos os tipos usam sacos físicos. O catálogo usa a existência de sacos e a
soma dos seus totais, não um contador agregado legado.

Em cada saco, o modo por tamanho é inferido quando houver pelo menos uma
quantidade definida em um tamanho ativo, inclusive zero. Nesse modo, o total é
sempre a soma das quantidades numéricas ativas e o valor enviado pelo cliente
não é a fonte de verdade. Quantidades nulas continuam permitidas e não
representam zero conhecido.

Sem quantidades por tamanho, o operador informa o total manualmente de cada
saco. O total público do produto é a soma dos totais persistidos dos sacos.

## Pedido

Na criação:

1. validar itens;
2. validar quantidades positivas;
3. criar pedido;
4. criar itens;
5. preservar snapshots necessários;
6. concluir tudo dentro de uma transação.

Não implementar baixa/reserva complexa de estoque até essa regra ser definida explicitamente.

## Testes prioritários

Cobrir primeiro regras que podem causar inconsistência:

- geração de código único;
- modelo opcional;
- tamanhos numéricos e alfabéticos;
- grades diferentes em sacos diferentes;
- estoque total obrigatório em cada saco;
- total manual por saco quando não houver quantidade conhecida;
- soma server-side dos totais dos sacos;
- quantidade por tamanho nullable;
- criação de pedido;
- pedido sem itens deve falhar;
- transições de status;
- geração do texto de WhatsApp.

## Commits e alterações

Mudanças devem ser pequenas e focadas.

Ao alterar uma regra de domínio:

- atualizar teste;
- atualizar `ARCHITECTURE.md` se necessário;
- criar ADR apenas quando for uma decisão arquitetural relevante.

## Histórico de novidades por entrega

A página pública `/novidades` lê `resources/changelog/index.json`, o documento
geral com os resumos das atualizações. Cada entrada tem `id` único, `title`,
`merged_at` (data da atualização, mantida por compatibilidade), `changes` e
`details_file`. As categorias continuam `added`, `improved` e `fixed`.
Os campos de PR das notas antigas são metadados históricos; entregas novas
não dependem de PR. Use `pr_number: 0` quando não houver PR.

Antes de enviar uma entrega ao GitHub, revise as mudanças desde a última nota,
acrescente o resumo ao índice e escreva os detalhes em um Markdown próprio em
`resources/changelog/`. Use data e identificador descritivo no nome, por exemplo
`2026-11-16-producao-canvas.md`. Repetir o push da mesma entrega não cria outra
nota. Inclua correções e manutenção em português simples, sem afirmar testes ou
publicações que não ocorreram.

A página ordena as atualizações por data, mantém a paginação e permite expandir
os detalhes. HTML embutido e links inseguros nos detalhes são desativados. Os
arquivos acompanham o código implantado; não há consulta ao GitHub em runtime.

O workflow de geração e publicação por PR foi removido. Os JSON antigos foram
preservados como histórico e migrados para o índice e os detalhes Markdown.
Os scripts antigos em `scripts/changelog` permanecem como código legado e não
alimentam a página. O runner dedicado antigo não é mais necessário para esse
fluxo; esta mudança não remove serviços da máquina.

Verificação local:

```bash
php artisan test --compact tests/Feature/ChangelogTest.php
composer ci:verify
```

### Bun em produção

Desenvolvimento, CI e produção usam Bun 1.4.2 e o mesmo `bun.lock`.
O deploy executa `bun install --frozen-lockfile`, falhando se o manifesto e o
lockfile estiverem inconsistentes, sem recalcular versões. Na VPS, mantenha
`/usr/local/bin/bun` na versão definida em `package.json`. Não há conversão de
lockfile do npm durante o deploy.
