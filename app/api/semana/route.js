import { db, autorizado, noAutorizado } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!autorizado(req)) return noAutorizado();
  const p = new URL(req.url).searchParams;
  const desde = p.get("desde");
  const hasta = p.get("hasta");

  const { data: comidas, error } = await db
    .from("comidas")
    .select("fecha,kcal,prote,carbos,grasas")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: dias } = await db.from("dias").select("fecha,pasos").gte("fecha", desde).lte("fecha", hasta);

  const porDia = {};
  const vacio = () => ({ kcal: 0, prote: 0, carbos: 0, grasas: 0, pasos: 0 });
  (comidas || []).forEach((c) => {
    const d = (porDia[c.fecha] = porDia[c.fecha] || vacio());
    d.kcal += c.kcal;
    d.prote += c.prote;
    d.carbos += c.carbos;
    d.grasas += c.grasas;
  });
  (dias || []).forEach((x) => {
    const d = (porDia[x.fecha] = porDia[x.fecha] || vacio());
    d.pasos = x.pasos;
  });
  return Response.json(porDia);
}
