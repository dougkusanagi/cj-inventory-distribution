# ADR 0022 — Rastreio de erros com Bugsink

## Status

Accepted

## Contexto

Precisamos centralizar erros do Laravel e do navegador na instância Bugsink
da Crônicas, sem alterar regras de domínio ou respostas da aplicação.

## Decisão

Usar os SDKs oficiais compatíveis com Bugsink: `sentry/sentry-laravel` no
backend e `@sentry/react` no frontend. O handler nativo do Laravel envia
exceções reportáveis e preserva o logging existente. O frontend captura
erros não tratados e rejeições de promises.

O DSN público HTTPS fica no ambiente, sem credenciais versionadas. Ambiente
e release são configuráveis; o frontend incorpora esses valores no build.
Traces, logs independentes e métricas não são enviados. A coleta automática
de dados pessoais e corpos de requisição fica desativada. Os testes
automatizados não enviam eventos à instância.

## Consequências

Erros ficam agrupados no projeto do inventário no Bugsink. O rastreio depende
da disponibilidade da instância, e mudanças das variáveis do frontend exigem
novo build. Sem DSN, o envio fica desativado. Alertas por email dependem do
SMTP da instância. Mensagens de exceção ainda podem conter dados fornecidos
pelo próprio código; a aplicação deve evitar incluir segredos nesses textos.
