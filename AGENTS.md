# Instruções para agentes de código

## Antes de implementar

Leia nesta ordem:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/ROADMAP.md`
4. Os ADRs relacionados à tarefa em `docs/adr/`

Depois, inspecione o código e os componentes relacionados antes de propor ou implementar mudanças.

## Princípios

- Prefira a solução mais simples que satisfaça o requisito atual, sem antecipar funcionalidades mencionadas apenas no roadmap.
- Use convenções nativas do Laravel sempre que forem suficientes.
- Não duplique regras de negócio entre controllers, jobs, commands ou componentes.
- Mantenha regras de domínio fora de componentes puramente visuais.
- Não introduza abstrações sem necessidade concreta.

## Regras de domínio

- Preserve compatibilidade com tamanhos numéricos e alfabéticos.
- O campo `model` do produto é opcional.
- O código interno do produto é obrigatório e gerado pelo sistema.
- `Reposição`, `Grade Nova` e `Grade Furada` classificam uma oferta de estoque, não o produto.
- O estoque total é obrigatório.
- Quantidades por tamanho são opcionais.
- Não assuma que a soma por tamanho sempre estará disponível.

## Banco e domínio

Ao alterar o schema:

- use migrations com nomes claros;
- mantenha chaves estrangeiras explícitas;
- prefira string + enum PHP a enums de banco quando essa representação for suficiente.

Use transações quando uma operação alterar múltiplos registros que precisam permanecer consistentes, especialmente ao finalizar ou cancelar pedidos.

## Interface

Priorize uso simples em celular, poucos passos, estados visuais claros, feedback imediato e uma experiência de compartilhamento fácil para as vendedoras.

No frontend, prefira componentes shadcn existentes ou bibliotecas React maduras e leves a implementações próprias. Crie uma solução customizada somente quando as opções existentes não atenderem ao requisito ou adicionarem complexidade desnecessária.

Ao implementar a captura de foto, aceite:

- upload;
- câmera do dispositivo quando suportado;
- corte;
- rotação;
- espelhamento.

Evite transformar o editor de imagem em uma ferramenta avançada.

## Pedidos

O fluxo inicial deve permanecer `Pendente -> Finalizado` ou `Pendente -> Cancelado`. Não crie novos estados sem necessidade real.

A mensagem para WhatsApp deve ser gerada a partir dos dados do pedido e não armazenada como fonte de verdade.

## Qualidade

Ao concluir uma mudança:

1. execute os testes relacionados;
2. execute o formatter/linter já adotado pelo projeto;
3. verifique migrations e validações quando aplicável;
4. atualize a documentação existente quando a regra de negócio tiver mudado.

Não troque package manager, stack de frontend, banco ou bibliotecas principais sem autorização explícita.

## Decisões arquiteturais

Crie um ADR em `docs/adr/` quando uma decisão:

- afetar várias partes do sistema;
- for difícil de reverter;
- alterar o modelo de domínio;
- introduzir integração externa importante.

Não crie ADR para detalhes triviais de implementação.

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.5. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:

- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- Do not create standalone documentation unless explicitly requested. ADRs required by the project rules above are the exception.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

## Design System

- Para tokens, componentes e critérios de uso de Drawer, Sheet e Dialog, consulte `docs/design-system.md`. A página viva está em `/design-system`.

=== boost rules ===
</laravel-boost-guidelines>
