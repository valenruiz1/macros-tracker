"use client";
import { useEffect, useState, useCallback } from "react";

const META = { kcal: 1750, prote: 131, carbos: 175, grasas: 58, pasos: 10000 };
const COMIDAS = ["desayuno", "almuerzo", "merienda", "cena"];
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const r0 = (n) => Math.round(n || 0);

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
