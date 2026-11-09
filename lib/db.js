import { createClient } from "@supabase/supabase-js";

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export function autorizado(req) {
  const clave = req.headers.get("x-app-password");
  return !!clave && clave === process.env.APP_PASSWORD;
}

export const noAutorizado = () => Response.json({ error: "Clave incorrecta" }, { status: 401 });
