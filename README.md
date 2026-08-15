# Sistema de Ficha Técnica e Precificação

Sistema para donos de lanchonete/food service cadastrarem insumos, montarem a
ficha técnica (receita) de cada produto e obterem automaticamente o **custo
por porção**, o **preço de venda no balcão** e o **preço sugerido em cada
plataforma de delivery** (iFood, 99Food) já ajustado pela taxa da plataforma.

Toda a matemática de custo e preço vive no **banco de dados** (Supabase
PostgreSQL — functions e views), não no frontend. Isso garante que o valor
mostrado na tela é sempre exatamente o valor gravado, sem risco de divergência.

## Stack

- **Banco:** Supabase (PostgreSQL) — schema, functions e views em [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
- **Frontend:** React + Vite, falando direto com o Supabase via `supabase-js` (PostgREST) — sem backend próprio
- **Segurança:** Row Level Security (RLS) em todas as tabelas, multi-lojista via `owner_id`
- **Deploy:** Netlify (frontend) + Supabase (banco)

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, cole e execute o conteúdo de
   [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) na íntegra
   (ou use a Supabase CLI: `supabase db push`, se preferir versionar as migrations).
3. Em **Authentication → Providers**, confirme que **Email** está habilitado.
   Por padrão o Supabase exige confirmação de e-mail — para testar rápido em
   desenvolvimento, você pode desativar "Confirm email" em
   **Authentication → Settings**.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

Ao criar o primeiro usuário (via tela de cadastro do app), um trigger no
banco (`trg_seed_plataformas_novo_usuario`) já cria automaticamente as
plataformas padrão **Balcão (0%)**, **iFood (20%)** e **99Food (20%)** para
aquele usuário — cada dono de loja tem suas próprias plataformas e taxas,
editáveis em **Configurações**.

## 2. Configurar o frontend

```bash
npm install
cp .env.example .env
```

Edite `.env` com os valores copiados do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Rodar os testes das fórmulas de custo/precificação:

```bash
npm test
```

Build de produção:

```bash
npm run build
```

## 3. Deploy no Netlify

1. Suba o repositório para o GitHub/GitLab.
2. No Netlify, "Add new site" → "Import an existing project" → aponte para o repositório.
3. Build command: `npm run build` · Publish directory: `dist` (já configurado em [netlify.toml](netlify.toml)).
4. Em **Site settings → Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Nada mais a hospedar — o banco continua no Supabase.

## Como o cálculo funciona

- **Custo por unidade base do insumo:** `preco_compra / (quantidade_compra * fator_base(unidade_compra))`.
  Ex.: pacote de alface de 1 kg por R$ 8,00 → R$ 0,008 por grama.
- **Custo de um item da receita:** `quantidade_uso * fator_base(unidade_uso) * custo_base * (1 + fator_perda)`.
- **Unidade incompatível é bloqueada:** a dimensão (massa/volume/contagem) da unidade de uso precisa bater
  com a dimensão da unidade de compra do insumo — validado tanto ao salvar o item da receita quanto ao
  ler a ficha técnica, nunca calculado errado silenciosamente.
- **Preço-alvo:** `custo_total * (1 + margem)` (markup sobre custo) ou `custo_total / (1 - margem)` (margem sobre venda).
- **Preço por plataforma:** `(preco_alvo + taxa_fixa) / (1 - taxa_percentual)` — a taxa é **dividida**, nunca somada,
  para que o dono realmente receba o preço-alvo líquido depois que a plataforma retém a taxa.

Todas essas fórmulas estão implementadas como functions/views SQL (fonte única de verdade) e espelhadas em
JS puro em [src/utils/calculo.js](src/utils/calculo.js) apenas para feedback visual imediato na tela antes
de salvar — os testes em [tests/formulas.test.js](tests/formulas.test.js) garantem que os dois lados batem,
incluindo o caso de referência do projeto: custo 5,00 → alvo 6,00 → iFood 7,50.

## Estrutura do projeto

```
supabase/migrations/0001_init.sql   # schema, seeds, functions, views, RLS
src/lib/supabaseClient.js           # cliente supabase-js
src/contexts/AuthContext.jsx        # sessão/autenticação
src/data/                           # módulo de acesso a dados (CRUD + views de preço)
src/utils/calculo.js                # espelho JS das fórmulas SQL (prévia ao vivo)
src/utils/format.js                 # formatação BRL e preço psicológico (X,90)
src/pages/                          # telas: Login, Insumos, Produtos, Ficha Técnica, Configurações
tests/formulas.test.js              # testes unitários das fórmulas
```

## Notas sobre decisões de projeto (ver PROMPT.md para o histórico completo)

O arquivo [PROMPT.md](PROMPT.md) contém a especificação original do sistema,
já atualizada com as decisões de implementação tomadas durante a construção
(seção final "Registro de decisões de implementação").
