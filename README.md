# Barbearia Alemão do Corte — Sistema de automação

App **mobile-first** para o barbeiro operar a barbearia direto do celular:
agenda do dia, lembrete de horário no WhatsApp e caixa do dia — tudo em
poucos toques. Instalável na tela inicial como **PWA** (parece um app nativo).

> Feito para o perfil [@alemao_doo_corte](https://instagram.com/alemao_doo_corte).
> O nome da barbearia é editável em **Perfil**, então serve para qualquer barbearia.

## O que o app faz

- **Agenda do dia** — lista os horários do dia por ordem, destaca o **próximo**
  cliente e permite marcar **atendido / faltou** com um toque. Navega entre dias.
- **Novo agendamento** — nome do cliente, WhatsApp (opcional), serviço, data e hora.
  O serviço entra como *snapshot* (nome, preço e duração são gravados no
  agendamento), então mudar o catálogo depois não altera o histórico nem o caixa.
- **Lembrete no WhatsApp** — botão que abre o WhatsApp já com a mensagem pronta,
  assinada pela barbearia (`wa.me`, sem API paga). O barbeiro só toca em *enviar*.
- **Serviços** — cadastro de corte, barba, combo… com **preço e duração**, ativar/desativar.
- **Caixa do dia** — total faturado (só o que foi atendido), nº de atendimentos,
  ticket médio, faltas e quebra **por serviço**.

## Stack

- **Banco:** Supabase (PostgreSQL) — schema, view de faturamento e seed em
  [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
- **Frontend:** React + Vite falando direto com o Supabase via `supabase-js`
  (PostgREST) — sem backend próprio
- **Segurança:** Row Level Security (RLS) em todas as tabelas, multi-barbeiro via `owner_id`
- **PWA:** manifest + service worker (`public/`), instalável no celular
- **Deploy:** Netlify (frontend) + Supabase (banco)

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e execute o conteúdo de
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) na íntegra.
3. Em **Authentication → Providers**, confirme que **Email** está habilitado.
   Para testar rápido em desenvolvimento, dá para desativar "Confirm email" em
   **Authentication → Settings**.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

Ao criar o primeiro usuário (tela de cadastro do app), um trigger no banco
(`trg_seed_novo_usuario`) já cria o **perfil da barbearia** e os **serviços
padrão** (Corte, Barba, Corte + Barba, Sobrancelha, Pezinho) — todos editáveis.

## 2. Configurar o frontend

```bash
npm install
cp .env.example .env
```

Edite `.env` com os valores do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Rodar os testes das funções (WhatsApp, caixa, datas):

```bash
npm test
```

Build de produção:

```bash
npm run build
```

Os ícones do PWA em `public/` já vêm versionados; para regerá-los:

```bash
npm run icones
```

## 3. Deploy no Netlify

1. Suba o repositório para o GitHub.
2. No Netlify, "Add new site" → "Import an existing project" → aponte para o repositório.
3. Build command: `npm run build` · Publish directory: `dist` (já em [netlify.toml](netlify.toml)).
4. Em **Site settings → Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Deploy. No celular, abra o site e use **"Adicionar à tela inicial"** para instalar como app.

## Estrutura do projeto

```
supabase/migrations/0001_init.sql   # schema, view de faturamento, seed e RLS
public/                             # manifest, service worker e ícones do PWA
src/lib/supabaseClient.js           # cliente supabase-js
src/contexts/AuthContext.jsx        # sessão / autenticação
src/data/                           # acesso a dados (servicos, agendamentos, perfil)
src/utils/whatsapp.js               # normalização de telefone + mensagem + link wa.me
src/utils/financeiro.js             # resumo do caixa (função pura)
src/utils/format.js                 # datas locais, hora e BRL
src/components/Layout.jsx           # navegação inferior (tab bar)
src/pages/                          # Login, Agenda, Serviços, Financeiro, Perfil
tests/barbearia.test.js             # testes das funções puras
```

## Próximos passos (fora do MVP)

- Agendamento pelo próprio cliente (link público com horários livres)
- Ficha do cliente (histórico de cortes, aniversário, frequência)
- Múltiplos barbeiros na mesma barbearia com comissão
- Lembrete automático agendado (exige um serviço de envio, ex.: WhatsApp Business API)
