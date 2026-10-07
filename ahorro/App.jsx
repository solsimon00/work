import { useEffect, useMemo, useState } from "react";
import DATA from "./promos.json";
import {
  RUBROS, COMERCIOS_SUGERIDOS, DIAS, PERIODO, norm, pesos, isoHoy, diaSemana, ranking, proximos7,
} from "./motor.js";
import Chat from "./Chat.jsx";

// Planilla de Google Sheets publicada como CSV con promos cargadas a mano (opcional).
// Columnas: id, emisor, titulo, medios (ids separados por |), rubro, comercios (separados por |),
// dias (0=Dom..6=Sáb separados por |), porcentaje, tope, topePeriodo, minimo, canal, desde, hasta, condiciones, fuente
// Una fila con el mismo id que una promo de promos.json la reemplaza.
const SHEET_URL = "";


function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function promosDesdeSheet(text) {
  const [head, ...rows] = parseCsv(text);
  const h = head.map(norm);
  const col = (r, k) => (r[h.indexOf(norm(k))] ?? "").trim();
  const lista = s => s.split("|").map(x => x.trim()).filter(Boolean);
  const num = s => (s === "" ? null : Number(s.replace(/[^0-9.]/g, "")));
  return rows
    .filter(r => col(r, "id"))
    .map(r => ({
      id: col(r, "id"),
      emisor: col(r, "emisor"),
      titulo: col(r, "titulo"),
      medios: lista(col(r, "medios")),
      rubro: col(r, "rubro") || "general",
      comercios: lista(col(r, "comercios")),
      dias: lista(col(r, "dias")).map(Number),
      porcentaje: num(col(r, "porcentaje")) || 0,
      tope: num(col(r, "tope")),
      topePeriodo: col(r, "topePeriodo") || null,
      minimo: num(col(r, "minimo")) || 0,
      canal: col(r, "canal"),
      desde: col(r, "desde"),
      hasta: col(r, "hasta"),
      condiciones: col(r, "condiciones"),
      fuente: col(r, "fuente"),
      verificado: true,
      manual: true,
    }));
}


function Detalle({ promo }) {
  const p = promo;
  return (
    <div className="detalle">
      <span>{p.porcentaje}%</span>
      <span>{p.tope != null ? `tope ${pesos(p.tope)} ${PERIODO[p.topePeriodo] || ""}` : "sin tope"}</span>
      {p.minimo > 0 && <span>mínimo {pesos(p.minimo)}</span>}
      {p.canal && <span>{p.canal}</span>}
      {p.comercios.length > 0 && <span>{p.comercios.join(", ")}</span>}
      {p.hasta && <span>hasta {p.hasta.split("-").reverse().join("/")}</span>}
      {!p.verificado && <span className="aviso">a verificar</span>}
      {p.manual && <span className="manual">de tu planilla</span>}
    </div>
  );
}

function Consultar({ promos }) {
  const [rubro, setRubro] = useState("supermercado");
  const [comercio, setComercio] = useState("");
  const [monto, setMonto] = useState("50000");
  const [fecha, setFecha] = useState(isoHoy());

  const consulta = { rubro, comercio, monto, fecha };
  const res = useMemo(() => ranking(promos, consulta), [promos, rubro, comercio, monto, fecha]);
  const conPromo = res.filter(r => r.mejor);
  const sinPromo = res.filter(r => !r.mejor);
  const segura = conPromo.find(r => r.mejor.promo.verificado && r.mejor.ahorro > 0);

  // ¿Conviene esperar? Mejor ahorro en cada uno de los próximos 7 días.
  const semana = useMemo(() => proximos7(promos, consulta), [promos, rubro, comercio, monto, fecha]);
  const mejorDia = semana.reduce((a, b) => (b.ahorro > a.ahorro ? b : a), semana[0]);

  const sugeridos = useMemo(() => {
    const s = new Set(COMERCIOS_SUGERIDOS[rubro]);
    promos.filter(p => p.rubro === rubro).forEach(p => p.comercios.forEach(c => s.add(c)));
    return [...s];
  }, [promos, rubro]);

  return (
    <>
      <section className="form">
        <label>Rubro
          <select value={rubro} onChange={e => { setRubro(e.target.value); setComercio(""); }}>
            {RUBROS.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label>Comercio (opcional)
          <input list="comercios" value={comercio} placeholder="Ej: Día" onChange={e => setComercio(e.target.value)} />
          <datalist id="comercios">{sugeridos.map(c => <option key={c} value={c} />)}</datalist>
        </label>
        <label>Monto
          <input type="number" inputMode="numeric" min="0" step="1000" value={monto} onChange={e => setMonto(e.target.value)} />
        </label>
        <label>Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </label>
      </section>

      {conPromo.length ? (
        <section className="ganador">
          <div className="etiqueta">Te conviene pagar con</div>
          <div className="medio">{conPromo[0].medio.nombre}</div>
          <div className="monto">Ahorrás {pesos(conPromo[0].mejor.ahorro)}</div>
          <div className="titulo">{conPromo[0].mejor.promo.titulo}</div>
          <Detalle promo={conPromo[0].mejor.promo} />
          {conPromo[0].mejor.topeado && <p className="nota">Llegás al tope: por encima de este monto no ahorrás más con esta promo. Podés dividir la compra con otro medio.</p>}
          {!conPromo[0].mejor.promo.verificado && segura && (
            <p className="nota">Esta promo está sin confirmar. La mejor confirmada: <b>{segura.medio.nombre}</b>, ahorrás {pesos(segura.mejor.ahorro)} ({segura.mejor.promo.titulo}).</p>
          )}
        </section>
      ) : (
        <section className="ganador vacio">
          <div className="etiqueta">{DIAS[diaSemana(fecha)]}</div>
          <div className="medio">No hay promos cargadas para este gasto</div>
          <div className="titulo">Pagá con la tarjeta de crédito para financiarte, o mirá abajo si te conviene esperar.</div>
        </section>
      )}

      {mejorDia.ahorro > (conPromo[0]?.mejor.ahorro || 0) && (
        <section className="esperar">
          Si podés esperar: el <b>{DIAS[diaSemana(mejorDia.fecha)].toLowerCase()} {mejorDia.fecha.split("-").reverse().slice(0, 2).join("/")}</b> ahorrás <b>{pesos(mejorDia.ahorro)}</b> con {mejorDia.medio.nombre}.
        </section>
      )}

      <h2>Todas las opciones para el {DIAS[diaSemana(fecha)].toLowerCase()}</h2>
      <ul className="lista">
        {conPromo.map(({ medio, mejor, otras }) => (
          <li key={medio.id}>
            <div className="fila">
              <b>{medio.nombre}</b>
              <span className="ahorro">{mejor.faltaMinimo ? `faltan ${pesos(mejor.faltaMinimo)} para el mínimo` : pesos(mejor.ahorro)}</span>
            </div>
            <div className="titulo">{mejor.promo.titulo}</div>
            <Detalle promo={mejor.promo} />
            {otras.length > 0 && <div className="otras">También: {otras.map(o => o.promo.titulo).join(" · ")}</div>}
          </li>
        ))}
      </ul>
      {sinPromo.length > 0 && <p className="sin">Sin promo este día: {sinPromo.map(r => r.medio.nombre).join(", ")}.</p>}
    </>
  );
}

function Calendario({ promos }) {
  const [rubro, setRubro] = useState("todos");
  const hoy = isoHoy();
  const vigentes = promos.filter(p => (!p.hasta || p.hasta >= hoy) && (rubro === "todos" || p.rubro === rubro));
  return (
    <>
      <section className="form">
        <label>Rubro
          <select value={rubro} onChange={e => setRubro(e.target.value)}>
            <option value="todos">Todos</option>
            {RUBROS.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
      </section>
      {[1, 2, 3, 4, 5, 6, 0].map(d => {
        const delDia = vigentes.filter(p => p.dias.includes(d)).sort((a, b) => b.porcentaje - a.porcentaje);
        return (
          <section key={d}>
            <h2>{DIAS[d]}</h2>
            {delDia.length ? (
              <ul className="lista">
                {delDia.map(p => (
                  <li key={p.id}>
                    <div className="fila"><b>{p.emisor}</b><span className="ahorro">{p.porcentaje}%</span></div>
                    <div className="titulo">{p.fuente ? <a href={p.fuente} target="_blank" rel="noreferrer">{p.titulo}</a> : p.titulo}</div>
                    <Detalle promo={p} />
                    {p.condiciones && <div className="otras">{p.condiciones}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="sin">Nada cargado.</p>}
          </section>
        );
      })}
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [manuales, setManuales] = useState([]);

  useEffect(() => {
    if (!SHEET_URL) return;
    fetch(SHEET_URL + (SHEET_URL.includes("?") ? "&" : "?") + "_=" + Date.now())
      .then(r => r.text())
      .then(t => setManuales(promosDesdeSheet(t)))
      .catch(() => {});
  }, []);

  const promos = useMemo(() => {
    const ids = new Set(manuales.map(p => p.id));
    return [...DATA.promos.filter(p => !ids.has(p.id)), ...manuales];
  }, [manuales]);

  return (
    <main>
      <header>
        <h1>¿Con qué pago?</h1>
        <p>Promos actualizadas al {DATA.actualizado.split("-").reverse().join("/")}{manuales.length ? ` + ${manuales.length} de tu planilla` : ""}. Antes de pagar, confirmá el tope que te queda en la app de cada banco.</p>
        <nav>
          <button className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>Chat</button>
          <button className={tab === "consultar" ? "on" : ""} onClick={() => setTab("consultar")}>Calculadora</button>
          <button className={tab === "calendario" ? "on" : ""} onClick={() => setTab("calendario")}>Por día</button>
        </nav>
      </header>
      <div hidden={tab !== "chat"}><Chat promos={promos} /></div>
      {tab === "consultar" && <Consultar promos={promos} />}
      {tab === "calendario" && <Calendario promos={promos} />}
    </main>
  );
}
