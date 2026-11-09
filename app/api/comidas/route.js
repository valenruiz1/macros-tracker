import OpenAI from "openai";
import { db, autorizado, noAutorizado } from "../../../lib/db";

export const dynamic = "force-dynamic";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const COMIDAS = ["desayuno", "almuerzo", "merienda", "cena"];

export async function GET(req) {
  if (!autorizado(req)) return noAutorizado();
  const fecha = new URL(req.url).searchParams.get("fecha");
  const { data, error } = await db.from("comidas").select("*").eq("fecha", fecha).order("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req) {
  if (!autorizado(req)) return noAutorizado();
  const { fecha, texto, hora } = await req.json();

  const prompt =
    "Sos un nutricionista. Convertí lo que comió la persona en JSON con esta forma exacta: " +
    '{"comida":"desayuno|almuerzo|merienda|cena|null","items":[{"nombre":"","gramos":0,"kcal":0,"prote":0,"carbos":0,"grasas":0}]}. ' +
    "Reglas: un item por alimento; prote, carbos y grasas en gramos; usá valores nutricionales estándar " +
    "(si dice cocido, valores de cocido); si no da gramos, estimá una porción razonable; " +
    "si la persona dice a qué comida corresponde, ponelo en comida, si no, null.";

  let res;
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: texto },
      ],
    });
    res = JSON.parse(r.choices[0].message.content);
  } catch (e) {
    return Response.json({ error: "No pude interpretar la comida" }, { status: 500 });
  }

  const h = Number(hora);
  const porHora = h < 11 ? "desayuno" : h < 16 ? "almuerzo" : h < 20 ? "merienda" : "cena";
  const comida = COMIDAS.includes(res.comida) ? res.comida : porHora;

  const filas = (res.items || []).map((i) => ({
    fecha,
    comida,
    nombre: String(i.nombre || "Alimento"),
    gramos: Number(i.gramos) || 0,
    kcal: Number(i.kcal) || 0,
    prote: Number(i.prote) || 0,
    carbos: Number(i.carbos) || 0,
    grasas: Number(i.grasas) || 0,
  }));
  if (!filas.length) return Response.json({ error: "No encontré alimentos" }, { status: 400 });

  const { error } = await db.from("comidas").insert(filas);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comida, cantidad: filas.length });
}

export async function DELETE(req) {
  if (!autorizado(req)) return noAutorizado();
  const id = new URL(req.url).searchParams.get("id");
  const { error } = await db.from("comidas").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
