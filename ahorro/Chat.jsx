import { useEffect, useRef, useState } from "react";
import { RUBROS, DIAS, PERIODO, pesos, diaSemana, ranking, proximos7, aplica, calcular } from "./motor.js";
import { interpretar } from "./interpretar.js";

const EJEMPLOS = [
  "80 mil en Día el viernes",
  "Uber mañana",
  "¿Qué día conviene ir al súper?",
  "Cena 30k el sábado",
  "La luz $45.000",
  "¿Qué promos hay hoy?",
];

const fechaCorta = iso => `${DIAS[diaSemana(iso)].toLowerCase()} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nombreRubro = id => RUBROS.find(r => r.id === id)?.nombre.toLowerCase() || id;
const tope = p => (p.tope != null ? `tope ${pesos(p.tope)} ${PERIODO[p.topePeriodo] || ""}`.trim() : "sin tope");
const emisorDe = r => r.medio.emisor;

function Encabezado({ c }) {
  return (
    <div className="ctx">
      {fechaCorta(c.fecha)} · {c.comercio || nombreRubro(c.rubro)} · {pesos(c.monto)}
      {c.montoSupuesto && <span> (monto supuesto: decime cuánto para afinar)</span>}
    </div>
  );
}

function Recomendar({ c, promos }) {
  const res = ranking(promos, c);
  const con = res.filter(r => r.mejor && r.mejor.ahorro > 0);
  const bajoMinimo = res.filter(r => r.mejor && r.mejor.faltaMinimo && !con.includes(r));
  const top = con[0];
  const semana = proximos7(promos, c);
  const mejorDia = semana.reduce((a, b) => (b.ahorro > a.ahorro ? b : a), semana[0]);

  if (!top) {
    return (
      <>
        <Encabezado c={c} />
        <p>No hay promos para esto ese día.</p>
        {mejorDia.ahorro > 0 ? (
          <p>Si podés esperar: el <b>{fechaCorta(mejorDia.fecha)}</b> ahorrás <b>{pesos(mejorDia.ahorro)}</b> con {mejorDia.medio.nombre}.</p>
        ) : (
          <p>En los próximos 7 días tampoco hay. Pagá con tarjeta de crédito para financiarte hasta el resumen.</p>
        )}
        {bajoMinimo.map(r => (
          <p key={r.medio.id} className="nota">{r.medio.nombre} tiene {r.mejor.promo.porcentaje}%, pero pide un mínimo de {pesos(r.mejor.promo.minimo)}.</p>
        ))}
      </>
    );
  }

  const p = top.mejor.promo;
  // Promos que no aplican por no llegar al mínimo, pero que darían más ahorro si se llega.
  const vistas = new Set();
  const cerca = res
    .flatMap(r => [r.mejor, ...r.otras].filter(Boolean).map(o => ({ ...o, medio: r.medio })))
    .filter(o => o.faltaMinimo && calcular(o.promo, o.promo.minimo).ahorro > top.mejor.ahorro)
    .filter(o => !vistas.has(o.promo.id) && vistas.add(o.promo.id))
    .slice(0, 2);
  const otras = con.filter(r => emisorDe(r) !== emisorDe(top)).filter((r, i, a) => a.findIndex(x => emisorDe(x) === emisorDe(r)) === i).slice(0, 2);
  const segura = !p.verificado && con.find(r => r.mejor.promo.verificado);

  // Si se pasa del tope, conviene pagar una parte con otro medio de otro banco (los topes son por banco).
  let division = null;
  if (top.mejor.topeado && p.porcentaje > 0) {
    const cubierto = Math.ceil((p.tope * 100) / p.porcentaje);
    const resto = c.monto - cubierto;
    const alt = ranking(promos, { ...c, monto: resto }).find(r => r.mejor && r.mejor.ahorro > 0 && emisorDe(r) !== emisorDe(top));
    if (alt) division = { cubierto, resto, alt, total: top.mejor.ahorro + alt.mejor.ahorro };
  }

  return (
    <>
      <Encabezado c={c} />
      <p>
        Pagá con <b>{top.medio.nombre}</b>: ahorrás <b className="verde">{pesos(top.mejor.ahorro)}</b>.
      </p>
      <p className="nota">
        {p.titulo} · {tope(p)}{p.minimo > 0 ? ` · mínimo ${pesos(p.minimo)}` : ""}{p.canal ? ` · ${p.canal}` : ""}
      </p>
      {p.parcial && (
        <p className="nota aviso">Ojo: aplica solo a productos seleccionados, así que el ahorro real puede ser menor.</p>
      )}
      {!p.verificado && (
        <p className="nota aviso">
          Esta promo está sin confirmar.{segura ? ` La mejor confirmada: ${segura.medio.nombre} (${pesos(segura.mejor.ahorro)}).` : ""}
        </p>
      )}
      {division && (
        <p>
          Te pasás del tope. Si dividís: <b>{pesos(division.cubierto)}</b> con {top.medio.nombre} y <b>{pesos(division.resto)}</b> con {division.alt.medio.nombre}, ahorrás <b className="verde">{pesos(division.total)}</b> en total.
        </p>
      )}
      {otras.length > 0 && (
        <p className="nota">Otras opciones: {otras.map(r => `${r.medio.nombre} (${pesos(r.mejor.ahorro)})`).join(" · ")}</p>
      )}
      {cerca.map(o => (
        <p key={o.promo.id} className="nota">
          Si llegás a {pesos(o.promo.minimo)} (te faltan {pesos(o.faltaMinimo)}), con {o.medio.nombre} ahorrás {pesos(calcular(o.promo, o.promo.minimo).ahorro)}.
        </p>
      ))}
      {mejorDia.ahorro > top.mejor.ahorro && (
        <p>Si podés esperar: el <b>{fechaCorta(mejorDia.fecha)}</b> ahorrás <b>{pesos(mejorDia.ahorro)}</b> con {mejorDia.medio.nombre}.</p>
      )}
    </>
  );
}

function Cuando({ c, promos }) {
  const semana = proximos7(promos, c);
  const max = Math.max(...semana.map(d => d.ahorro));
  return (
    <>
      <Encabezado c={c} />
      <p>Lo mejor de cada día de la semana que viene:</p>
      <ul className="dias">
        {semana.map(d => (
          <li key={d.fecha} className={d.ahorro === max && max > 0 ? "top" : ""}>
            <span>{fechaCorta(d.fecha)}</span>
            <span>{d.ahorro > 0 ? `${pesos(d.ahorro)} · ${d.medio.nombre}` : "sin promo"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Promos({ c, promos }) {
  const rubros = c.rubro ? [c.rubro] : RUBROS.map(r => r.id);
  const lista = promos
    .filter(p => rubros.some(r => aplica(p, { rubro: r, comercio: c.rubro ? c.comercio : "", fecha: c.fecha })))
    .sort((a, b) => b.porcentaje - a.porcentaje);
  return (
    <>
      <div className="ctx">{fechaCorta(c.fecha)}{c.rubro ? ` · ${c.comercio || nombreRubro(c.rubro)}` : ""}</div>
      {lista.length ? (
        <ul className="promos">
          {lista.map(p => (
            <li key={p.id}><b>{p.emisor}</b>: {p.titulo} <span className="nota">({tope(p)}{p.verificado ? "" : ", a verificar"})</span></li>
          ))}
        </ul>
      ) : <p>No hay promos cargadas para ese día.</p>}
    </>
  );
}

function Ayuda() {
  return (
    <>
      <p>Decime qué vas a pagar y te digo con qué medio ahorrás más. Podés incluir el monto, el comercio y el día.</p>
      <p className="nota">Por ejemplo: "80 mil en Día el viernes", "Uber mañana", "¿qué día conviene ir a Carrefour?", "¿qué promos hay el sábado?". Después podés seguir con "¿y el jueves?" o "¿y con 30 lucas?".</p>
    </>
  );
}

function Respuesta({ c, promos }) {
  if (c.intencion === "ayuda") return <Ayuda />;
  if (c.intencion === "noentendi") {
    return <p>No te entendí. Probá con algo como "80 mil en Día el viernes", "Uber mañana" o "¿qué promos hay hoy?".</p>;
  }
  if (c.intencion === "promos") return <Promos c={c} promos={promos} />;
  if (!c.rubro) {
    return <p>¿En qué vas a gastar? Decime un comercio (Día, Carrefour, Uber, PedidosYa…) o un rubro (súper, cena, la luz…).</p>;
  }
  if (c.intencion === "cuando") return <Cuando c={c} promos={promos} />;
  return <Recomendar c={c} promos={promos} />;
}

export default function Chat({ promos }) {
  const [mensajes, setMensajes] = useState([{ de: "bot", consulta: { intencion: "ayuda" } }]);
  const [texto, setTexto] = useState("");
  const ultima = useRef(null);
  const fin = useRef(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes]);

  function enviar(t) {
    const pregunta = (t ?? texto).trim();
    if (!pregunta) return;
    const consulta = interpretar(pregunta, ultima.current);
    if (consulta.rubro) ultima.current = consulta;
    setMensajes(m => [...m, { de: "yo", texto: pregunta }, { de: "bot", consulta }]);
    setTexto("");
  }

  return (
    <section className="chat">
      <div className="mensajes">
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja ${m.de}`}>
            {m.de === "yo" ? m.texto : <Respuesta c={m.consulta} promos={promos} />}
          </div>
        ))}
        <div ref={fin} />
      </div>
      <div className="chips">
        {EJEMPLOS.map(e => <button key={e} onClick={() => enviar(e)}>{e}</button>)}
      </div>
      <form className="entrada" onSubmit={e => { e.preventDefault(); enviar(); }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ej: 80 mil en Día el viernes" aria-label="Tu pregunta" />
        <button type="submit">Enviar</button>
      </form>
    </section>
  );
}
