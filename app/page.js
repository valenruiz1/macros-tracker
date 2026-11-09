"use client";
import { useEffect, useState, useCallback } from "react";

const META = { kcal: 1750, prote: 131, carbos: 175, grasas: 58, pasos: 10000 };
const COMIDAS = ["desayuno", "almuerzo", "merienda", "cena"];
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const r0 = (n) => Math.round(n || 0);

const lunes = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const INICIALES = ["L", "M", "M", "J", "V", "S", "D"];

function Semana({ dia, datos }) {
  const ini = lunes(dia);
  const hoy = iso(new Date());
  const dias = INICIALES.map((l, i) => {
    const d = new Date(ini);
    d.setDate(ini.getDate() + i);
    const f = iso(d);
    return { f, l, ...(datos[f] || { kcal: 0, prote: 0, carbos: 0, grasas: 0, pasos: 0 }) };
  });
  const tot = dias.reduce(
    (a, d) => ({ kcal: a.kcal + d.kcal, prote: a.prote + d.prote, carbos: a.carbos + d.carbos, grasas: a.grasas + d.grasas, pasos: a.pasos + d.pasos }),
    { kcal: 0, prote: 0, carbos: 0, grasas: 0, pasos: 0 }
  );
  const conDatos = dias.filter((d) => d.kcal > 0).length || 1;
  const metaSem = META.kcal * 7;
  const max = Math.max(META.kcal * 1.3, ...dias.map((d) => d.kcal));
  const fin = new Date(ini);
  fin.setDate(ini.getDate() + 6);
  const rango = ini.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) + " – " + fin.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  return (
    <div className="card">
      <div className="row">
        <h3 style={{ margin: 0 }}>Semana</h3>
        <span className="mu">{rango}</span>
      </div>
      <div className="big" style={{ marginTop: 6 }}>
        {r0(tot.kcal).toLocaleString("es-AR")} <span className="mu">/ {metaSem.toLocaleString("es-AR")} kcal</span>
      </div>
      <Barra valor={tot.kcal} meta={metaSem} color="#d9822b" />

      <div style={{ position: "relative", height: 110, display: "flex", alignItems: "flex-end", gap: 6 }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: (META.kcal / max) * 100 + "%", borderTop: "1px dashed var(--mu)" }} />
        {dias.map((d) => (
          <div key={d.f} style={{ flex: 1, height: (d.kcal / max) * 100 + "%", minHeight: d.kcal ? 3 : 0, background: d.kcal > META.kcal ? "#d9822b" : "var(--ac)", borderRadius: "5px 5px 0 0", opacity: d.f === hoy ? 1 : 0.8 }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {dias.map((d) => (
          <div key={d.f} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: d.f === hoy ? 700 : 400 }}>
            {d.l}
            <div className="mu" style={{ fontSize: 11 }}>{d.kcal ? r0(d.kcal) : "–"}</div>
          </div>
        ))}
      </div>
      <div className="mu" style={{ marginTop: 6 }}>Línea punteada: tu meta diaria de {META.kcal} kcal.</div>

      <div className="mac" style={{ marginTop: 12 }}>
        <div><span className="mu">Prom. proteína</span><b style={{ display: "block" }}>{r0(tot.prote / conDatos)} g</b></div>
        <div><span className="mu">Prom. carbos</span><b style={{ display: "block" }}>{r0(tot.carbos / conDatos)} g</b></div>
        <div><span className="mu">Prom. grasas</span><b style={{ display: "block" }}>{r0(tot.grasas / conDatos)} g</b></div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="mu">Pasos de la semana</span>
        <b>{tot.pasos.toLocaleString("es-AR")} / {(META.pasos * 7).toLocaleString("es-AR")}</b>
      </div>
      <Barra valor={tot.pasos} meta={META.pasos * 7} color="#7a5bc4" />
    </div>
  );
}

function Barra({ valor, meta, color }) {
  return (
    <div className="bar">
      <i style={{ width: Math.min(100, (valor / meta) * 100) + "%", background: color }} />
    </div>
  );
}

export default function Home() {
  const [clave, setClave] = useState(null);
  const [dia, setDia] = useState(new Date());
  const [items, setItems] = useState([]);
  const [pasos, setPasos] = useState(0);
  const [semana, setSemana] = useState({});
  const [texto, setTexto] = useState("");
  const [pasosIn, setPasosIn] = useState("");
  const [msg, setMsg] = useState("");
  const [cargando, setCargando] = useState(false);
  const fecha = iso(dia);

  useEffect(() => {
    setClave(localStorage.getItem("clave") || "");
  }, []);

  const api = useCallback(
    async (url, opts = {}) => {
      const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", "x-app-password": clave } });
      if (r.status === 401) {
        localStorage.removeItem("clave");
        setClave("");
        throw new Error("Clave incorrecta");
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      return data;
    },
    [clave]
  );

  const cargar = useCallback(async () => {
    try {
      setItems(await api("/api/comidas?fecha=" + fecha));
      setPasos((await api("/api/pasos?fecha=" + fecha)).pasos);
      const ini = lunes(new Date(fecha + "T12:00:00"));
      const fin = new Date(ini);
      fin.setDate(ini.getDate() + 6);
      setSemana(await api("/api/semana?desde=" + iso(ini) + "&hasta=" + iso(fin)));
    } catch (e) {
      setMsg(e.message);
    }
  }, [api, fecha]);

  useEffect(() => {
    if (clave) cargar();
  }, [clave, cargar]);

  async function agregar() {
    if (!texto.trim()) return;
    setCargando(true);
    setMsg("Calculando macros…");
    try {
      const r = await api("/api/comidas", {
        method: "POST",
        body: JSON.stringify({ fecha, texto, hora: new Date().getHours() }),
      });
      setTexto("");
      setMsg("Listo: " + r.cantidad + " alimento(s) en " + r.comida + ".");
      cargar();
    } catch (e) {
      setMsg("No pude cargarlo: " + e.message);
    }
    setCargando(false);
  }

  async function borrar(id) {
    await api("/api/comidas?id=" + id, { method: "DELETE" });
    cargar();
  }

  async function guardarPasos() {
    const v = parseInt(pasosIn, 10);
    if (isNaN(v)) return;
    await api("/api/pasos", { method: "POST", body: JSON.stringify({ fecha, pasos: v }) });
    setPasosIn("");
    cargar();
  }

  if (clave === null) return null;

  if (!clave) {
    return (
      <main>
        <div className="card">
          <h3>Entrar</h3>
          <input
            type="password"
            placeholder="Tu clave"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value) {
                localStorage.setItem("clave", e.target.value);
                setClave(e.target.value);
              }
            }}
          />
          <p className="mu">Escribila y apretá Enter. Se guarda en este celular.</p>
        </div>
      </main>
    );
  }

  const t = items.reduce(
    (a, i) => ({ kcal: a.kcal + i.kcal, prote: a.prote + i.prote, carbos: a.carbos + i.carbos, grasas: a.grasas + i.grasas }),
    { kcal: 0, prote: 0, carbos: 0, grasas: 0 }
  );
  const resta = META.kcal - t.kcal;
  const mover = (n) => setDia(new Date(dia.getTime() + n * 864e5));

  return (
    <main>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={() => mover(-1)}>‹</button>
        <b style={{ textTransform: "capitalize" }}>
          {dia.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
        </b>
        <button onClick={() => mover(1)}>›</button>
      </div>

      <div className="card">
        <textarea
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: almuerzo: 200 g de pollo cocido y 200 g de arroz"
        />
        <button className="pri" style={{ width: "100%", marginTop: 8 }} disabled={cargando} onClick={agregar}>
          Cargar comida
        </button>
        <div className="mu" style={{ marginTop: 8 }}>{msg}</div>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <span className="mu">Calorías</span>
            <div className="big">
              {r0(t.kcal)} <span className="mu">/ {META.kcal}</span>
            </div>
          </div>
          <div className="mu">{resta >= 0 ? "Te quedan " + r0(resta) + " kcal" : "Te pasaste " + r0(-resta) + " kcal"}</div>
        </div>
        <Barra valor={t.kcal} meta={META.kcal} color="#d9822b" />
        <div className="mac">
          {[["Proteína", "prote", "#3b6fd4"], ["Carbos", "carbos", "#c9a227"], ["Grasas", "grasas", "#c4547a"]].map(([n, k, c]) => (
            <div key={k}>
              <span className="mu">{n}</span>
              <b style={{ display: "block" }}>{r0(t[k])} / {META[k]} g</b>
              <Barra valor={t[k]} meta={META[k]} color={c} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <span className="mu">Pasos</span>
          <b>{pasos.toLocaleString("es-AR")} / {META.pasos.toLocaleString("es-AR")}</b>
        </div>
        <Barra valor={pasos} meta={META.pasos} color="#7a5bc4" />
        <div className="row">
          <input type="number" inputMode="numeric" placeholder="Pasos de hoy" value={pasosIn} onChange={(e) => setPasosIn(e.target.value)} />
          <button onClick={guardarPasos}>Guardar</button>
        </div>
      </div>

      <Semana dia={dia} datos={semana} />

      {COMIDAS.map((c) => {
        const its = items.filter((i) => i.comida === c);
        if (!its.length) return null;
        return (
          <div className="card" key={c}>
            <h3>{c} · {r0(its.reduce((a, i) => a + i.kcal, 0))} kcal</h3>
            {its.map((i) => (
              <div className="it" key={i.id}>
                <div>
                  {i.nombre}{i.gramos ? " (" + r0(i.gramos) + " g)" : ""}
                  <small>{r0(i.kcal)} kcal · P {r0(i.prote)} · C {r0(i.carbos)} · G {r0(i.grasas)}</small>
                </div>
                <button className="x" onClick={() => borrar(i.id)}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </main>
  );
}
