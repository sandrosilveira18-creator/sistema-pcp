# Especificação — Barbearia Alemão do Corte (sistema de automação)

## Visão
App **mobile-first** operado 100% pelo celular do barbeiro. Não é um sistema de
recepção em computador: é rápido de usar entre um corte e outro. Instalável como
PWA na tela inicial.

Barbearia de referência: [@alemao_doo_corte](https://instagram.com/alemao_doo_corte).
O nome é editável em Perfil, então o mesmo app serve para qualquer barbearia.

## Decisões de escopo (MVP)
- **Quem agenda:** só o barbeiro registra os horários (cliente não marca sozinho — fica para depois).
- **Dores priorizadas:** (1) agenda do dia, (2) lembrete no WhatsApp, (3) caixa do dia.
- **Base de código:** app novo, mantendo a stack React + Vite + Supabase (sem backend próprio).

## Funcionalidades
1. **Agenda do dia** (tela principal)
   - Lista os agendamentos do dia por horário; destaca o **próximo** (primeiro ainda "agendado").
   - Ações por card: **atendido**, **faltou**, **lembrete WhatsApp**, reabrir, excluir.
   - Navegação entre dias; atalho "voltar pra hoje". Total previsto do dia no rodapé.
2. **Novo agendamento**
   - Cliente (nome), WhatsApp (opcional), serviço, data, hora, observação.
   - Grava **snapshot** do serviço (nome, preço, duração) no agendamento.
3. **Serviços** — CRUD com preço e duração; ativar/desativar.
4. **Caixa do dia** — total faturado (só atendidos), atendidos, ticket médio, faltas, quebra por serviço.
5. **Perfil** — nome da barbearia (assina o lembrete) e Instagram; sair.

## Modelo de dados (Supabase)
- `perfil(owner_id PK, barbearia_nome, instagram, atualizado_em)`
- `servicos(id, owner_id, nome, preco, duracao_min, ativo, created_at)`
- `agendamentos(id, owner_id, cliente_nome, cliente_telefone, servico_id,
  servico_nome*, preco*, duracao_min*, data, hora, status, lembrete_enviado,
  observacao, created_at)` — campos `*` são snapshot.
  - `status ∈ {agendado, atendido, faltou, cancelado}`.
  - Índice único parcial por `(owner_id, data, hora)` ignorando cancelados: evita
    dois clientes no mesmo horário.
- `vw_faturamento_dia` — agrega atendidos/faltas/total por dia (fonte do caixa).

## Regras / segurança
- **RLS** em todas as tabelas por `owner_id = auth.uid()` (multi-barbeiro).
- Trigger `trg_seed_novo_usuario` cria perfil + serviços padrão no signup.
- Financeiro conta **apenas** agendamentos com status `atendido`.

## WhatsApp (automação sem custo)
- Telefone normalizado para `55 + DDD + número` (aceita formatação livre).
- Mensagem de lembrete assinada pela barbearia, aberta via `https://wa.me/<num>?text=`.
- Sem API paga: o barbeiro só toca "enviar". `lembrete_enviado` marca o envio.

## Não-metas do MVP (roadmap)
- Cliente agendar sozinho (link público), ficha do cliente, múltiplos barbeiros
  com comissão, lembrete automático agendado (exigiria WhatsApp Business API).

## Registro de decisões de implementação
- Datas tratadas em fuso **local** (helpers em `src/utils/format.js`) para o "dia"
  nunca escorregar por causa de UTC.
- Toda a matemática do caixa vive em função pura (`src/utils/financeiro.js`) +
  view SQL espelhada, coberta por testes.
- PWA com service worker **network-first** (sem servir asset velho); ícones PNG
  gerados por script Node puro em `scripts/gera-icones.mjs`.
