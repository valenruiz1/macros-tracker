import { db, autorizado, noAutorizado } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!autorizado(req)) return noAutorizado();
  const fecha = new URL(req.url).searchParams.get("fecha");
  const { data } = await db.from("dias").select("pasos").eq("fecha", fecha).maybeSingle();
  return Response.json({ pasos: data ? data.pasos : 0 });
}

export async function POST(req) {
  if (!autorizado(req)) return noAutorizado();
  const { fecha, pasos } = await req.json();
  const { error } = await db.from("dias").upsert({ fecha, pasos: Number(pasos) || 0 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
