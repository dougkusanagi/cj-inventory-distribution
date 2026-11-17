# ADR 0036 — Etapas de produção unificadas

## Status

Aceito — 16/11/2026. Substitui a sequência de etapas do ADR 0025.

## Contexto

O usuário definiu Planejamento antes de Corte, Lavanderia incluindo lavagem e tintura e Estoque como destino final, reunindo Ensacamento e No estoque. Autorizou migrar os lotes existentes preservando o histórico.

## Decisão

- Usar Planejamento → Corte → Costura → Lavanderia → Acabamento → Estoque.
- Manter os valores antigos no enum para ler os eventos históricos, mas excluí-los das etapas disponíveis e rejeitá-los em novos avanços e atribuições.
- Migrar lotes de Tinturaria para Lavanderia e Ensacamento para o destino final completed, preservando os eventos. Aumentar a versão dos lotes migrados para rejeitar formulários antigos.
- Reunir atribuições dos responsáveis sem duplicar permissões nem reativar atribuições removidas, salvo quando a origem estiver ativa.
- Manter os tipos de oficina e aceitar lavagem e tintura na Lavanderia.
- Não criar sacos nem movimentações físicas ao chegar ao Estoque.

## Alternativas e consequências

Alterar apenas os nomes deixaria etapas e permissões duplicadas. A migração reúne os estados atuais; os eventos mantêm os valores de origem. Não há reversão automática, pois a unificação perde a distinção do estado atual anterior. Novos lotes exigem permissão de Planejamento; administradores podem atribuí-la.
