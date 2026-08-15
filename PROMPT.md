# PROMPT — Sistema de Ficha Técnica e Precificação (Food Service / iFood)

> Cole este bloco inteiro no Claude Code. Ele descreve um sistema completo, com regras exatas de cálculo, para não haver divergência de valores. Siga a ordem de entrega no final.

---

## 1. Papel e objetivo

Você é um engenheiro de software sênior. Construa um sistema de **ficha técnica com precificação automática** para donos de lanchonete/food service. O usuário cadastra insumos com preço de compra e unidade, monta a receita de cada produto do cardápio, define a margem desejada, e o sistema calcula: **custo por porção**, **preço de venda no balcão** e **preço sugerido em cada plataforma de delivery (iFood, 99Food)** já ajustado pela taxa da plataforma.

Trate **todos os cenários de borda** (unidade incompatível, insumo inativo, produto sem receita, custo zero, taxa alta, override manual de preço, múltiplas plataformas, perdas/desperdício). Nenhum valor pode divergir entre backend e frontend — **a matemática vive no banco (fonte única de verdade)**.

## 2. Stack obrigatória

- **Banco:** Supabase (PostgreSQL). Toda a lógica de cálculo em **views + functions SQL** — fonte única de verdade.
- **Sem backend próprio:** o React fala **direto com o Supabase** via `supabase-js` (PostgREST). Não há camada Python/FastAPI. CRUD e leitura das views de preço são feitos pelo cliente Supabase; a segurança é garantida por **RLS** (obrigatório e rigoroso, ver §6).
- **Frontend:** React (Vite). UI extremamente fluida, intuitiva e consolidada, para leigo operar.
- **Deploy:** frontend no Netlify; banco no Supabase. Nada mais a hospedar.

## 3. Regra de conversão de unidades (núcleo do sistema)

Cada unidade pertence a uma **dimensão** (massa, volume ou contagem) e tem um **fator para a unidade base** dessa dimensão:

- Massa → base **grama (g)**: `kg = 1000`, `g = 1`, `mg = 0.001`
- Volume → base **mililitro (ml)**: `L = 1000`, `ml = 1`
- Contagem → base **unidade (un)**: `un = 1`, `duzia = 12`

**Custo por unidade base de um insumo:**
```
custo_base = preco_compra / (quantidade_compra * fator_base(unidade_compra))
```
Exemplo: alface, pacote de 1 kg por R$ 8,00 → `8 / (1 * 1000) = 0,008 por grama`.

**Custo de um item da receita:**
```
qtd_base       = quantidade_uso * fator_base(unidade_uso)
custo_item      = qtd_base * custo_base * (1 + fator_perda)
```
Exemplo: 100 g de alface → `100 * 0,008 = 0,80`.

**Regra rígida:** a dimensão de `unidade_uso` DEVE ser igual à dimensão de `unidade_compra`. Se não for (ex.: comprou em litro e tentou usar em grama), a function deve lançar exceção clara — nunca calcular errado silenciosamente.

## 4. Regras de precificação (fórmulas exatas)

**Custo total do produto:**
```
custo_total = SOMA(custo_item de cada insumo da receita)
              + custo_embalagem
              + custo_operacional   -- opcional, default 0
```

**Preço-alvo (o que o dono quer receber líquido).** Suportar dois modos configuráveis por produto:
- `markup_custo` (padrão, bate com o raciocínio do usuário): `preco_alvo = custo_total * (1 + margem_valor)`
  - Ex.: custo 5,00, margem 20% → `5 * 1,20 = 6,00`.
- `margem_venda`: `preco_alvo = custo_total / (1 - margem_valor)`
  - Ex.: custo 5,00, margem 20% sobre venda → `5 / 0,80 = 6,25`.

**Preço no balcão:** `preco_balcao = preco_alvo` (mais uma versão arredondada psicológica, ex.: para X,90).

**Preço por plataforma (CRÍTICO — dividir, nunca somar).** A taxa incide sobre o preço final; para receber o alvo líquido:
```
preco_plataforma = (preco_alvo + taxa_fixa) / (1 - taxa_percentual)
```
Exemplo: alvo 6,00, iFood 20% → `6 / 0,80 = 7,50`. O iFood retém 1,50 e sobram exatamente 6,00. (Somar 20% daria 7,20 e você receberia só 5,76 — errado. Não faça isso.)

Cada produto pode ter **preço manual de override**; quando preenchido, ele prevalece e o sistema mostra a margem efetiva resultante.

## 5. Modelo de dados (DDL de referência — implemente no Supabase)

```sql
-- Unidades e dimensões
create table unidades_medida (
  id serial primary key,
  nome text not null,
  sigla text not null unique,
  dimensao text not null check (dimensao in ('massa','volume','contagem')),
  fator_base numeric not null check (fator_base > 0)
);

insert into unidades_medida (nome, sigla, dimensao, fator_base) values
 ('Quilograma','kg','massa',1000),('Grama','g','massa',1),('Miligrama','mg','massa',0.001),
 ('Litro','L','volume',1000),('Mililitro','ml','volume',1),
 ('Unidade','un','contagem',1),('Dúzia','duzia','contagem',12);

create table categorias (
  id serial primary key,
  nome text not null,
  tipo text not null check (tipo in ('insumo','produto'))
);

-- Insumos (estoque)
create table insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id int references categorias(id),
  unidade_compra_id int not null references unidades_medida(id),
  quantidade_compra numeric not null check (quantidade_compra > 0),
  preco_compra numeric not null check (preco_compra >= 0),
  estoque_atual numeric default 0,
  estoque_minimo numeric default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Plataformas de venda
create table plataformas (
  id serial primary key,
  nome text not null,
  taxa_percentual numeric not null check (taxa_percentual >= 0 and taxa_percentual < 1),
  taxa_fixa numeric not null default 0,
  ativo boolean default true
);
insert into plataformas (nome, taxa_percentual, taxa_fixa) values
 ('Balcão',0,0),('iFood',0.20,0),('99Food',0.20,0);

-- Produtos do cardápio
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id int references categorias(id),
  margem_tipo text not null default 'markup_custo'
     check (margem_tipo in ('markup_custo','margem_venda')),
  margem_valor numeric not null default 0.20 check (margem_valor >= 0 and margem_valor < 1),
  custo_embalagem numeric not null default 0,
  custo_operacional numeric not null default 0,
  preco_manual numeric,               -- override opcional
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Receita: itens de cada produto
create table produto_insumos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  insumo_id uuid not null references insumos(id),
  quantidade_uso numeric not null check (quantidade_uso > 0),
  unidade_uso_id int not null references unidades_medida(id),
  fator_perda numeric not null default 0 check (fator_perda >= 0)
);
```

**Functions e views a criar:**

```sql
-- custo por unidade base de um insumo
create or replace function fn_custo_base(p_insumo insumos) returns numeric as $$
  select p_insumo.preco_compra
       / (p_insumo.quantidade_compra
          * (select fator_base from unidades_medida where id = p_insumo.unidade_compra_id));
$$ language sql stable;

-- custo de um item de receita, com validação de dimensão
create or replace function fn_custo_item(p_item produto_insumos) returns numeric as $$
declare
  v_ins insumos;
  v_dim_uso text; v_dim_compra text; v_fator_uso numeric;
begin
  select * into v_ins from insumos where id = p_item.insumo_id;
  select dimensao, fator_base into v_dim_uso, v_fator_uso
    from unidades_medida where id = p_item.unidade_uso_id;
  select dimensao into v_dim_compra
    from unidades_medida where id = v_ins.unidade_compra_id;
  if v_dim_uso <> v_dim_compra then
    raise exception 'Unidade incompatível: insumo % comprado em % mas usado em % (dimensões diferentes)',
      v_ins.nome, v_dim_compra, v_dim_uso;
  end if;
  return (p_item.quantidade_uso * v_fator_uso)
         * fn_custo_base(v_ins)
         * (1 + p_item.fator_perda);
end;
$$ language plpgsql stable;

-- custo total por produto
create or replace view vw_produto_custo as
select p.id as produto_id,
       coalesce(sum(fn_custo_item(pi.*)),0)
         + p.custo_embalagem + p.custo_operacional as custo_total
from produtos p
left join produto_insumos pi on pi.produto_id = p.id
group by p.id, p.custo_embalagem, p.custo_operacional;

-- preço-alvo por produto
create or replace view vw_produto_preco_alvo as
select p.id as produto_id, c.custo_total,
       case p.margem_tipo
         when 'markup_custo' then c.custo_total * (1 + p.margem_valor)
         when 'margem_venda' then c.custo_total / (1 - p.margem_valor)
       end as preco_alvo,
       p.preco_manual
from produtos p
join vw_produto_custo c on c.produto_id = p.id;

-- preço final por produto x plataforma
create or replace view vw_produto_precos as
select a.produto_id, pl.id as plataforma_id, pl.nome as plataforma,
       a.custo_total,
       coalesce(a.preco_manual, a.preco_alvo) as preco_alvo,
       (coalesce(a.preco_manual, a.preco_alvo) + pl.taxa_fixa) / (1 - pl.taxa_percentual)
         as preco_sugerido,
       -- lucro líquido real após taxa
       (coalesce(a.preco_manual, a.preco_alvo)) - a.custo_total as lucro_liquido,
       case when a.custo_total > 0
            then (coalesce(a.preco_manual,a.preco_alvo) - a.custo_total)/a.custo_total
            else null end as markup_efetivo
from vw_produto_preco_alvo a
cross join plataformas pl
where pl.ativo = true;
```

**RLS é a camada de segurança** (o cliente acessa o banco diretamente, então não pode haver tabela exposta sem policy):
- Habilite RLS em **todas** as tabelas.
- Policies liberadas apenas ao usuário autenticado (`auth.role() = 'authenticated'`).
- Deixe pronto para multi-lojista: adicione `owner_id uuid default auth.uid()` nas tabelas de dados (insumos, produtos, produto_insumos, plataformas, categorias) e faça as policies filtrarem por `owner_id = auth.uid()`, para um dono nunca ver dados de outro.
- `unidades_medida` pode ser leitura pública (dados de referência).
- Exponha as views de preço com `security_invoker = true` para que herdem o RLS das tabelas base.

## 6. Acesso a dados (React ↔ Supabase direto)

Sem backend intermediário. Crie um módulo de acesso a dados no frontend usando `@supabase/supabase-js`:
- CRUD de `unidades_medida`, `categorias`, `insumos`, `plataformas`, `produtos`, `produto_insumos` via `supabase.from(...)`.
- Preços: `supabase.from('vw_produto_precos').select('*').eq('produto_id', id)` → custo, preço-alvo, preço por plataforma, lucro, markup efetivo.
- Ficha técnica completa (itens, quantidades, custo item a item): consultar `produto_insumos` com join dos insumos, ou criar uma view `vw_produto_ficha` dedicada e ler dela.
- Autenticação via Supabase Auth (email/senha). Envolva o app num contexto de sessão.
- **Tratamento de erro:** as functions SQL lançam exceção legível (ex.: unidade incompatível); capture o `error.message` retornado pelo supabase-js e mostre na UI. Nunca deixe o cálculo divergir — a matemática é só das views.

## 7. Frontend React (prioridade máxima em UX)

Interface limpa, fluida, para leigo:
- **Insumos:** lista com busca; formulário mostra "custo por g/ml/un" calculado em tempo real ao digitar preço e quantidade. Alerta de estoque abaixo do mínimo.
- **Montagem de produto (ficha técnica):** adicionar insumo à receita escolhendo quantidade + unidade; a unidade só oferece opções da mesma dimensão do insumo (bloqueia erro na origem). Custo do item e custo total atualizam ao vivo.
- **Precificação:** slider/campo de margem, toggle `markup sobre custo` × `margem sobre venda`, campos de embalagem/operacional. Card em destaque com: custo total, preço no balcão, e **cards por plataforma** (iFood, 99Food) mostrando preço sugerido e lucro líquido. Campo de preço manual com aviso da margem efetiva resultante.
- **Configurações:** cadastrar plataformas e ajustar taxas.
- Feedback visual imediato, estados de loading/erro, valores em BRL, arredondamento correto (2 casas + sugestão psicológica X,90).

## 8. Qualidade e cenários de borda (obrigatório)

- Unidade incompatível → erro claro na UI, nunca cálculo silencioso.
- Produto sem receita → custo 0, sinalizado (não vender por 0).
- Insumo inativo em receita ativa → aviso.
- Taxa de plataforma → validar `0 <= taxa < 1`.
- Override manual → recalcular e exibir margem efetiva.
- Divisão por zero e custo zero tratados.
- Testes: unitários das fórmulas (usar o caso custo 5 → alvo 6 → iFood 7,50) e de conversão de unidades.

## 9. Ordem de entrega

1. Migration SQL do Supabase (tabelas, seeds, functions, views, RLS com `owner_id` e `security_invoker`).
2. Módulo de acesso a dados no React (`supabase-js`) + contexto de autenticação.
3. Frontend React com as telas descritas.
4. README com passos de setup (variáveis de ambiente Supabase, deploy Netlify).
5. Testes das fórmulas de custo e precificação (caso 5 → 6 → iFood 7,50).

Comece pela migration SQL completa e me mostre antes de seguir para o frontend.

---

## Registro de decisões de implementação

Esta seção documenta onde a implementação real (em `supabase/migrations/0001_init.sql`
e no frontend) **foi além ou ajustou** a lógica descrita acima — para que a
especificação e o código nunca fiquem divergentes.

1. **`plataformas` também recebeu `owner_id`, como o §5 já mandava** ("adicione
   `owner_id` ... nas tabelas de dados: insumos, produtos, produto_insumos,
   **plataformas**, categorias"), mas o DDL de referência do §5 ainda mostrava
   um `insert` estático global de 3 plataformas — incompatível com uma tabela
   multi-lojista. Isso foi substituído por um **trigger em `auth.users`**
   (`fn_seed_plataformas_novo_usuario` / `trg_seed_plataformas_novo_usuario`):
   toda vez que um usuário novo se cadastra, ele automaticamente ganha
   Balcão (0%), iFood (20%) e 99Food (20%) já configuradas, editáveis em
   Configurações. `categorias` não é seedada — cada dono cria as suas.

2. **Validação de unidade incompatível antecipada para o INSERT/UPDATE de
   `produto_insumos`**, não só para a leitura (`fn_custo_item`, chamada pelas
   views). O §3 exige que a dimensão incompatível "nunca calcule errado
   silenciosamente", e o §8 pede erro claro na UI — com a regra apenas na
   function de leitura, um item de receita mal cadastrado só estouraria erro
   quando alguém abrisse a tela de precificação, não no momento de montar a
   receita. Um trigger (`fn_valida_produto_insumos` /
   `trg_valida_produto_insumos`) agora valida a dimensão **e** o cross-tenant
   (produto e insumo do mesmo dono) já no `insert`/`update` da linha da
   receita. `fn_custo_item` continua existindo e validando de novo na leitura,
   como defesa em profundidade.

3. **View adicional `vw_produto_ficha`**, item já previsto no §6 ("ou criar
   uma view `vw_produto_ficha` dedicada e ler dela") mas ausente do DDL do
   §5. Criada com `security_invoker = true`, retorna cada item da receita já
   com `custo_item` calculado e a flag `insumo_ativo`, usada pela tela de
   ficha técnica para o aviso de "insumo inativo em receita ativa" (§8).

4. **Coluna `qtd_itens_receita` adicionada a `vw_produto_custo` /
   `vw_produto_preco_alvo`.** O §8 exige sinalizar "produto sem receita → custo
   0"; como `custo_total` pode ser zero por coincidência (embalagem e
   operacional também zerados) mesmo com itens cadastrados, a contagem de
   itens é o sinal correto e inequívoco para a UI decidir quando mostrar o
   aviso.

5. **Preço "psicológico" (X,90) sempre arredonda PARA CIMA**, nunca para
   baixo: `precoPsicologico` em `src/utils/format.js` encontra o menor valor
   da forma `N,90` que seja `>=` o preço-alvo calculado. Arredondar para baixo
   reduziria a margem efetiva abaixo do que o dono configurou; a versão atual
   só pode igualar ou melhorar a margem. É puramente uma sugestão de exibição
   — o valor que entra no cálculo de lucro continua sendo o `preco_sugerido`
   exato vindo do banco.

6. **Constraint de `produtos.margem_valor` tornada condicional ao `margem_tipo`**
   (migration `0002_ajusta_constraint_margem_valor.sql`). O DDL original do
   §5 usava `check (margem_valor >= 0 and margem_valor < 1)` para a coluna
   inteira. Isso é matematicamente necessário para o modo `margem_venda`
   (fração do preço de venda, tem que ser < 100% para não dividir por
   zero/negativo — ver §4), mas para `markup_custo` o teto de 99% é artificial:
   em food service é comum markup de 150%–200% sobre o custo (ex.: um
   hambúrguer que custa R$ 8 sendo vendido a R$ 20+). A constraint agora é:
   ```sql
   check (
     (margem_tipo = 'margem_venda' and margem_valor >= 0 and margem_valor < 1)
     or
     (margem_tipo = 'markup_custo' and margem_valor >= 0)
   )
   ```
   O campo de margem na tela de Precificação (`src/pages/ProdutoFichaPage.jsx`)
   só limita a 99% quando o modo selecionado é `margem_venda`.

7. **Espelho client-side das fórmulas (`src/utils/calculo.js`).** A
   especificação é enfática que "a matemática vive no banco". Esse módulo não
   contradiz isso: ele existe só para dar feedback imediato na UI *antes* de
   salvar (ex.: custo por grama enquanto o usuário digita preço/quantidade do
   insumo, ou a prévia de preço por plataforma enquanto edita a margem sem
   ainda ter clicado em "Salvar"). Assim que qualquer dado é persistido, a
   tela volta a usar os valores lidos de `vw_produto_custo` /
   `vw_produto_preco_alvo` / `vw_produto_precos` como fonte de verdade. Os
   testes em `tests/formulas.test.js` (incluindo o caso de referência
   5 → 6 → 7,50) garantem que o espelho em JS bate exatamente com as fórmulas
   SQL, para que as duas versões nunca divirjam.
