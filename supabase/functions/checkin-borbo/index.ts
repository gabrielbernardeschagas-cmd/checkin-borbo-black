// Check-in VIP — Borbô Black Vitalícia (Clube da Borboleta / Meraki)
// POST multipart: nome, email, whatsapp, instagram, confirmou, foto (arquivo), utm (json opcional)
// Regra: uma aluna = um número da sorte. Se e-mail, WhatsApp ou Instagram já existem,
// devolve o registro original (mesmo número) em vez de gerar outro.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "borbo-checkin";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function limparWhatsapp(v: string) {
  let d = (v || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
function limparInstagram(v: string) {
  return (v || "").trim().toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/[/?].*$/, "")
    .replace(/^@+/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ erro: "envie multipart/form-data" }, 400); }

  const nome = String(form.get("nome") || "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const whatsapp = limparWhatsapp(String(form.get("whatsapp") || ""));
  const instagram = limparInstagram(String(form.get("instagram") || ""));
  const confirmou = ["1", "true", "on", "sim"].includes(String(form.get("confirmou") || "").toLowerCase());
  const foto = form.get("foto");
  let utm: unknown = null;
  try { utm = form.get("utm") ? JSON.parse(String(form.get("utm"))) : null; } catch { utm = null; }

  if (nome.length < 3) return json({ erro: "Informe seu nome completo." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
  if (whatsapp.length < 12 || whatsapp.length > 13) return json({ erro: "WhatsApp inválido. Use DDD + número." }, 400);
  if (!/^[a-z0-9._]{1,30}$/.test(instagram)) return json({ erro: "Instagram inválido. Informe só o @." }, 400);
  if (!confirmou) return json({ erro: "Confirme que estará presente no dia 05/11 às 20h." }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
  const p_ua = req.headers.get("user-agent");
  const base = { p_nome: nome, p_email: email, p_whatsapp: whatsapp, p_instagram: instagram, p_ip: ip, p_ua, p_utm: utm };

  // 1) Já fez check-in? Devolve o mesmo número — nunca gera um segundo. (RPC em public: schema os não é exposto)
  const c1 = await db.rpc("checkin_borbo_registrar", { ...base, p_foto_url: null });
  if (c1.error) return json({ erro: "Falha ao consultar: " + c1.error.message }, 500);
  if (c1.data?.ja_existe) return json(c1.data);

  // 2) Nova aluna: sobe a foto e grava
  if (!(foto instanceof File) || foto.size === 0) return json({ erro: "Envie uma foto sua." }, 400);
  if (foto.size > 8 * 1024 * 1024) return json({ erro: "Foto muito grande (máx. 8 MB)." }, 400);
  const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(caminho, foto, { contentType: foto.type || "image/jpeg", upsert: false });
  if (up.error) return json({ erro: "Falha ao salvar a foto: " + up.error.message }, 500);
  const foto_url = db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;

  const c2 = await db.rpc("checkin_borbo_registrar", { ...base, p_foto_url: foto_url });
  if (c2.error) return json({ erro: "Falha ao gravar: " + c2.error.message }, 500);
  if (c2.data?.ok) return json(c2.data);
  return json({ erro: "Não consegui gerar um número único. Tente de novo." }, 500);
});
