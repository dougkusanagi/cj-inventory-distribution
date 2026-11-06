# Plano: painel de produção em uso na fábrica

Tipo: tarefa

## Objetivo

Entregar informação de produção aos gerentes da fábrica, em uso real:

1. Cada setor vê a lista dos lotes (produto e quantidade) que chegaram nele,
   confirma o recebimento e envia o lote para o setor seguinte. O fluxo
   começa no Corte e termina no Ensacamento, que envia o lote para o
   estoque.
2. Na mesma tela, o administrador vê o que há em todos os setores, quantas
   peças e há quanto tempo cada lote está ali. No desktop, os setores ficam
   em colunas lado a lado (quadro horizontal); no celular, um abaixo do outro.

O plano termina quando o painel estiver implantado em produção, com os
responsáveis de cada setor usando o próprio login, e as correções do primeiro
uso real estiverem integradas.

A ficha técnica, o perfil Modelagem e os catálogos de insumos e custos ficam
para depois, em `docs/plans/ficha-tecnica.md`.

## Prioridades (06/11/2026)

1. Informação de produção para os gerentes vem antes de tudo.
2. Implantar e colocar em uso vem antes de qualquer melhoria: o retorno de
   quem usa mostra o que realmente falta.
3. Ficha técnica, modelagem e custos só depois do painel em uso.

## O que já existe (no `master`, PRs #71 e #72)

- Tela `/painel/producao` com lotes por setor (`ProductionBatch`), etapas
  fixas no enum `ProductionStage` e histórico de eventos.
- Perfil `Produção`: cada usuário vê só os setores atribuídos a ele, confirma
  o recebimento ("Recebi") e envia o lote ao setor seguinte. O admin vê e move
  tudo.
- Resumo por setor (peças, lotes, "a receber" e "no setor") e "N dias nesta
  etapa" em cada lote.
- Oficinas, divisão de lote entre oficinas e grade opcional por tamanho.
- Banco local e de testes em PostgreSQL, igual à produção.
- Fora do `master`: aviso de lote parado (mais de 5 dias na mesma etapa) na
  branch `feat/alerta-lote-parado`, commit `500fd18`.

## Decisões

- O último setor continua **Ensacamento**. Sua ação é **"Enviar para o
  estoque"**, e o lote termina em **"No estoque"** (antes "Concluído").
- O valor gravado no banco continua `completed`; muda só o texto exibido.
  Assim não há migração de dados.
- Chegar em "No estoque" **não** cria sacos, movimentações nem pedidos. Quem
  ensaca continua cadastrando os sacos à mão.
- Sem pular setores: o lote só vai para o setor seguinte.

## Passos

### 1. Integrar o que está pronto

- [ ] Integrar `feat/alerta-lote-parado` no `master` (precisa de autorização
      para push e merge).

### 2. Fim do fluxo: "Enviar para o estoque" e "No estoque"

Branch sugerida: `feat/producao-no-estoque`.

- [ ] Trocar o rótulo de `ProductionStage::Completed` para "No estoque" no
      enum e no mapa de rótulos da tela.
- [ ] No Ensacamento, o botão passa a ser "Enviar para o estoque", e a
      confirmação explica que os sacos continuam sendo cadastrados à mão.
- [ ] Revisar os textos que citam "Concluído" (tela, toasts, seeders, README,
      `docs/ARCHITECTURE.md`, ADR 0025 se necessário) e os testes que dependem
      deles.
- [ ] Teste: enviar para o estoque não altera sacos, movimentações nem
      pedidos (já existe para "Concluído"; ajustar o texto).

### 3. Quadro horizontal do admin no desktop

Branch sugerida: `feat/quadro-producao`.

- [ ] No desktop (`md` ou mais), cada setor é uma coluna lado a lado, na
      ordem do fluxo, com rolagem horizontal só no quadro. O topo da coluna
      mostra o nome do setor, peças, lotes, "a receber" e lotes parados.
- [ ] Dentro de cada coluna, os cartões dos lotes com produto, quantidade,
      oficina, há quanto tempo estão ali e a ação principal ("Recebi" ou
      "Enviar para…").
- [ ] Os cartões de resumo atuais saem do topo para não repetir a mesma
      informação; o resumo fica no topo de cada coluna.
- [ ] No celular, os setores continuam um abaixo do outro.
- [ ] O responsável de setor vê o mesmo layout, só com os seus setores; com
      um setor só, a coluna ocupa a largura disponível.
- [ ] Capturas em 390, 768, 1366 e 1920 px, com nomes longos e setores
      vazios; teste de navegador sem rolagem horizontal da página.

### 4. Implantar e colocar em uso

- [ ] Rodar a conferência completa e fazer o deploy com `./deploy.sh`
      (precisa de autorização). Conferir as migrations da produção antes.
- [ ] Criar os logins dos responsáveis de cada setor (perfil Produção) e
      atribuir os setores. Precisa da lista de nomes e setores.
- [ ] Acompanhar a primeira semana de uso e anotar neste plano o que os
      setores e o gerente pedirem.

### 5. Correções do primeiro uso

- [ ] Itens a definir com o retorno do passo 4.

## Ideias para avaliar

### Quadro como fluxograma em canvas infinito (06/11/2026)

Ideia do usuário para a visão do admin: mostrar a produção como um
fluxograma num canvas infinito, em estilo moderno.

- Cada setor é um nó (Corte → Costura → Lavagem → Tinturaria → Acabamento →
  Ensacamento → No estoque), com nome, peças, lotes, "a receber" e lotes
  parados.
- Os nós ficam ligados por linhas animadas que mostram o sentido do fluxo. A
  animação pode indicar onde há lotes "a receber" (enviados e ainda não
  confirmados).
- O canvas permite arrastar e dar zoom. Ao tocar num setor, os lotes dele
  abrem num `Drawer`, com as mesmas ações de hoje ("Recebi", "Enviar
  para…").
- Biblioteca candidata: `@xyflow/react` (React Flow), madura e própria para
  isso. Adicionar a dependência precisa de aprovação.

Pontos a resolver antes de implementar:

- **Relação com o passo 3:** substitui o quadro horizontal ou vira uma
  segunda visão ("Quadro" e "Fluxo")? Recomendação: entregar primeiro o
  quadro horizontal, mais simples e útil no dia a dia, e avaliar o fluxograma
  depois do uso real.
- **Celular:** arrastar e dar zoom num canvas é ruim com o polegar e conflita
  com a rolagem. No celular, manter a lista vertical; o canvas fica para o
  desktop.
- **Acessibilidade:** o canvas precisa de navegação por teclado e de uma
  alternativa em lista com os mesmos dados.
- **Movimento:** respeitar `prefers-reduced-motion`, parando as animações.
- **Desempenho:** com muitos lotes, mostrar nos nós só os totais e carregar
  os lotes ao abrir o setor.

## Fora deste plano

- Ficha técnica, perfil Modelagem, insumos, preços e custos:
  `docs/plans/ficha-tecnica.md`.
- Perdas e retrabalho: só se o gerente pedir.
- PCP completo (ordens de produção, consumo real, roteiro, tempos, custo
  realizado, RFID, Bling).

## Tentativas que falharam

- A primeira suíte em PostgreSQL revelou expectativas de IDs sequenciais,
  transações abortadas após violações de unicidade e falta de `bash` no
  contêiner. Os testes afetados foram corrigidos.

## Dúvidas abertas

- Lista dos responsáveis de cada setor (nome, e-mail ou usuário e setor),
  para o passo 4.
- O limite de 5 dias para "lote parado" serve para o gerente?

## Próximo passo

Pedir autorização para integrar `feat/alerta-lote-parado` e começar o passo 2
na branch `feat/producao-no-estoque`.

Nota de ambiente: o `composer` do lerd roda no contêiner PHP, que não tem
`bash` e limita a memória a 128 MB. Para a conferência completa, rodar
`bash scripts/ci-verify.sh` no host e, onde faltar memória,
`php -d memory_limit=1G vendor/bin/pest` e
`php vendor/bin/phpstan analyse --memory-limit=1G`. Dois testes de
`DeployScriptTest` falham no contêiner por falta de `bash`.
