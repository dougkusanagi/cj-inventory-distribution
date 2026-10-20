# ADR 0023 — Perfis de acesso Administrador, Estoque e Marketing

## Status

Accepted — 19/10/2026.

## Contexto

Todo usuário com acesso ao painel podia operar produtos, estoque, pedidos e
configurações do catálogo. A equipe de marketing precisa apenas gerenciar as
fotos dos produtos, sem ver ou alterar estoque, pedidos e cadastros.

## Decisão

- `users.role` guarda o perfil como texto, representado pelo enum
  `App\Enums\UserRole`: `admin`, `stock` ou `marketing`. Sem perfil, o
  usuário não entra no painel. A coluna `is_staff` foi substituída, e as contas
  que tinham acesso viraram `admin`.
- Administrador e Estoque têm as mesmas permissões operacionais
  (`User::isStaff()`). Somente Administrador gerencia contas de usuários.
- Marketing acessa somente a tela “Fotos dos produtos”, além das próprias
  configurações de conta. O painel inicial o redireciona para essa tela.
  Administrador também acessa a tela; Estoque continua gerenciando fotos pelo
  formulário do produto.
- As rotas usam os middlewares `panel` (qualquer perfil) e `staff`
  (Administrador e Estoque), e a tela de fotos usa a habilidade
  `managePhotos` da `ProductPolicy`. O menu apenas reflete essas regras; a
  proteção é feita no servidor.
- A tela de fotos reutiliza a validação (`ValidatesProductImages`), o editor
  (`ProductPhotoManager`) e o fluxo transacional de `UpdateProduct`, alterando
  somente fotos, ordem e capa.
- Usuários são criados por `php artisan user:create`, que pergunta o perfil.
- A tela “Usuários”, exclusiva do Administrador, lista e filtra as contas por
  nome/e-mail, perfil e acesso ativo. Permite criar contas individuais, editar
  nome/e-mail/perfil, desativar ou reativar acesso e enviar links para definir
  a senha. O cadastro público permanece fechado.
- `users.is_active` controla a desativação sem excluir o usuário ou seus
  vínculos históricos. Contas existentes começam ativas. Contas desativadas
  não autenticam por senha e são desconectadas pelo middleware web, inclusive
  quando chegam por uma sessão anterior ou autenticação com passkey.
- Mudanças de e-mail, perfil ou ativação renovam o token de lembrança,
  invalidam links de senha pendentes e revogam sessões armazenadas no banco.
  O perfil Administrador não pode remover seu próprio acesso pela gestão;
  a atualização e a exclusão do próprio perfil preservam ao menos um
  administrador ativo, com validação dentro de transação e locks.
- O administrador não escolhe nem vê a senha de uma nova conta. A aplicação
  atribui uma senha aleatória e envia um link pelo broker nativo de recuperação
  do Laravel. O token expira em 60 minutos, só pode ser usado uma vez e o
  reenvio respeita o intervalo de um minuto. Um token válido confirma a posse
  do e-mail ao definir a senha, dispensando um segundo e-mail de confirmação.
- O envio ocorre depois de persistir a conta. Se o transporte de e-mail
  falhar, a conta permanece cadastrada e a tela orienta reenviar o link.
  Nomes, perfis e ativação são auditados; senhas e tokens continuam excluídos
  dos snapshots. Nenhum endpoint administrativo apaga usuários.

## Consequências

Novas telas operacionais ficam restritas automaticamente ao grupo `staff`.
A gestão de contas passa a ser a primeira permissão exclusiva do Administrador.
Convites e recuperação de senha exigem transporte de e-mail configurado; não
dependem de worker de fila. O command continua disponível para a administração
via terminal.
