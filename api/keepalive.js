// Função serverless chamada pelo cron diário (ver vercel.json) só para manter
// o projeto Supabase "acordado" — no plano free ele pausa após ~7 dias sem
// nenhuma requisição. Basta gerar uma requisição por dia; usamos o endpoint
// público de health (não precisa de chave, nada sensível aqui). A URL do
// projeto não é segredo. Se um dia você definir VITE_SUPABASE_URL como env
// var na Vercel, ela é usada automaticamente.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywexautvcopqyszowgux.supabase.co'

export default async function handler(req, res) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`)
    // 200 sempre: o objetivo (gerar uma requisição pro projeto) foi cumprido;
    // devolver erro só faria o cron reportar falha à toa.
    res.status(200).json({ ok: true, supabaseStatus: r.status, at: new Date().toISOString() })
  } catch (e) {
    res.status(200).json({ ok: false, erro: String(e), at: new Date().toISOString() })
  }
}
