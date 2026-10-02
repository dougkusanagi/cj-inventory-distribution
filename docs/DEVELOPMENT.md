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

O `DatabaseSeeder` cria o usuário local `test@example.com` e chama o
`CatalogDemoSeeder`, que é idempotente. Ele cadastra categorias, produtos
classificados como Slim/Plus e ofertas com sacos e quantidades. O produto de
tipo Grade Nova existe apenas para testar a regra de exclusão do catálogo;
fotos reais ainda precisam ser enviadas pelo cadastro de produtos.

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

Um produto pode existir sem oferta de estoque inicialmente; a grade é definida
por saco quando uma oferta é cadastrada.

Um produto pode ser salvo sem oferta de estoque. Ao informar sacos, o tipo deve
ser informado explicitamente e cada saco precisa de total manual ou calculado.

## Validação de oferta

```text
product: obrigatório
type: obrigatório quando houver sacos
stock_volumes: ao menos um saco quando houver oferta
stock_volumes.*.total_quantity: inteiro >= 0; manual ou calculado por saco
stock_volumes.*.items.*.size: string, distinto dentro do saco
stock_volumes.*.items.*.quantity: inteiro >= 0 ou null
```

O tipo não deve ser deduzido das quantidades por tamanho. A ausência de sacos
não cria uma `StockOffer`.

Todos os tipos usam sacos físicos. O catálogo usa a existência de sacos e a
soma dos seus totais, não um contador agregado legado. Encerrar o estoque
remove a oferta e seus sacos.

Em cada saco, o modo por tamanho é inferido quando houver pelo menos uma
quantidade definida em um tamanho ativo, inclusive zero. Nesse modo, o total é
sempre a soma das quantidades numéricas ativas e o valor enviado pelo cliente
não é a fonte de verdade. Quantidades nulas continuam permitidas e não
representam zero conhecido.

Sem quantidades por tamanho, o operador informa o total manualmente de cada
saco. O total público da oferta é a soma dos totais persistidos dos sacos.

Para verificar a integridade das ofertas, execute:

```bash
php artisan stock-offers:audit-volumes
php artisan stock-offers:audit-volumes --json
```

O comando retorna código de falha e lista as ofertas sem saco físico.

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
- estoque total obrigatório quando houver oferta;
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

## Histórico de novidades com Codex CLI

A página pública `/novidades` lê as notas versionadas em
`resources/changelog/pr-<numero>.json`, com paginação e ordem de merge.
Inclui novidades, melhorias, correções e manutenção técnica explicadas em
linguagem leiga. Ela lê somente os arquivos presentes no código implantado;
não busca novidades futuras do GitHub durante uma visita.

O workflow `changelog.yml` gera/atualiza um comentário em PRs destinados à
`master`, usando `codex exec` e o login ChatGPT da CLI, sem chave de API.
Para revisar o texto, copie o bloco `changelog` do comentário para a descrição
do PR e edite o JSON. Essa versão tem prioridade. Mudanças no código invalidam
o comentário anterior pelo SHA; notas manuais continuam sendo responsabilidade
da revisão do PR. O merge registra um arquivo por PR, sem substituir uma nota
já publicada ao repetir a execução. PR fechado sem merge não publica nada.

### Configuração do runner

Cadastre em Settings → Actions → Runners um runner Linux dedicado com o label
`codex-changelog`. Ele precisa de Bash, Python 3, Git e Codex CLI 0.159.3 ou
mais recente. No usuário que executa o serviço do runner, execute
`codex login --device-auth` e confira `codex login status`. Preserve a
configuração de autenticação entre execuções, sem copiá-la para o repositório
ou logs. Não é necessário instalar dependências da aplicação nesse runner.
O modelo é o padrão da CLI; não se usa uma integração direta com API.

Neste servidor de desenvolvimento, o runner está instalado em
`/home/servidor/.local/share/github-runners/inventario-changelog`, registrado
como `inventario-dev-codex-changelog`. O serviço systemd do usuário `servidor`
usa o login ChatGPT existente em `/home/servidor/.codex_mkt`; as credenciais
permanecem fora do repositório. O serviço inicia automaticamente e o usuário
possui linger habilitado, mantendo o runner ativo após logout e reinício.

Gerenciamento pelo usuário `servidor`, sem sudo:

```bash
systemctl --user status inventario-codex-changelog.service
systemctl --user restart inventario-codex-changelog.service
journalctl --user -u inventario-codex-changelog.service -n 50
```

Use o runner somente para workflows confiáveis deste repositório. O workflow
faz checkout da `master`, nunca do código do PR. PRs de forks não executam
automaticamente no runner; depois da revisão, use o acionamento manual.
O subprocesso Codex recebe dados por stdin, roda em pasta temporária com
sandbox somente leitura, sem configuração pessoal/MCP e sem o token GitHub
no ambiente. Diffs são dados para resumo, nunca comandos para execução.

O `GITHUB_TOKEN` precisa poder escrever comentários e conteúdo na `master`.
Se houver proteção que proíba esse commit, a publicação falha explicitamente;
ajuste a política para o bot conforme as regras do repositório. Não desative
proteções para contornar um erro sem avaliar a política vigente.

Para recuperar uma falha, execute o workflow manualmente na `master`, informe
o número do PR e habilite `publish` somente quando já estiver mergeado.
Falha de login, limite de uso, diff grande ou JSON inválido não gera nota
inventada. O merge do código não depende do sucesso do resumo; confira a
execução antes de fazer deploy para incluir a nota na mesma atualização.
No primeiro merge que instalar o workflow, use o acionamento manual caso o
evento ainda não encontre a nova automação.

Verificação local da automação, sem chamar a IA:

```bash
python3 -m unittest discover -s scripts/changelog -p 'test_*.py'
php artisan test --compact tests/Feature/ChangelogTest.php
```

### Bun em produção

Desenvolvimento, CI e produção usam Bun 1.4.2 e o mesmo `bun.lock`.
O deploy executa `bun install --frozen-lockfile`, falhando se o manifesto e o
lockfile estiverem inconsistentes, sem recalcular versões. Na VPS, mantenha
`/usr/local/bin/bun` na versão definida em `package.json`. Não há conversão de
lockfile do npm durante o deploy.
