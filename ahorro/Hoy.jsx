import { useMemo } from "react";
import { DIAS, PERIODO, pesos, isoHoy, sumarDias, diaSemana, promosDelDia } from "./motor.js";

const tope = p => (p.tope != null ? `tope ${pesos(p.tope)} ${PERIODO[p.topePeriodo] || ""}`.trim() : "sin tope");

function Tarjeta({ p }) {
  return (
    <li className="promo">
      <div className="pct">{p.porcentaje}%</div>
      <div className="info">
        <b>{p.titulo}</b>
        <div className="usa">Pagá con {p.tusMedios.join(" o ")}</div>
        <div className="detalle">
          <span>{tope(p)}</span>
          {p.minimo > 0 && <span>mínimo {pesos(p.minimo)}</span>}
          {p.canal && <span>{p.canal}</span>}
          {p.parcial && <span className="aviso">solo productos seleccionados</span>}
          {!p.verificado && <span className="aviso">a verificar</span>}
        </div>
      </div>
    </li>
  );
}

export default function Hoy({ promos, medios, perfil, irA }) {
  const hoy = isoHoy();
  const grupos = useMemo(() => promosDelDia(promos, medios, hoy, perfil.rubros), [promos, medios, hoy, perfil.rubros]);
  const manana = useMemo(() => promosDelDia(promos, medios, sumarDias(hoy, 1), perfil.rubros), [promos, medios, hoy, perfil.rubros]);
  const destacadaManana = manana.flatMap(g => g.promos).sort((a, b) => b.porcentaje - a.porcentaje)[0];

  if (!perfil.medios.length) {
    return (
      <section className="vacio-perfil">
        <h2>Contanos qué tarjetas tenés</h2>
        <p>Tildá tus tarjetas y billeteras, y esta pantalla te va a mostrar solo los descuentos que podés usar hoy.</p>
        <button className="primario" onClick={() => irA("perfil")}>Elegir mis tarjetas</button>
      </section>
    );
  }

  const total = grupos.reduce((n, g) => n + g.promos.length, 0);
  return (
    <>
      <section className="hoy-head">
        <h2>{DIAS[diaSemana(hoy)]} {hoy.slice(8, 10)}/{hoy.slice(5, 7)}</h2>
        <p>{total ? `Tenés ${total} ${total === 1 ? "descuento" : "descuentos"} para usar hoy con tus ${medios.length} medios de pago.` : "Hoy no hay descuentos para tus medios de pago."}</p>
      </section>
      {grupos.map(g => (
        <section key={g.rubro.id}>
          <h3>{g.rubro.nombre}</h3>
          <ul className="lista-promos">{g.promos.map(p => <Tarjeta key={p.id} p={p} />)}</ul>
        </section>
      ))}
      {destacadaManana && (
        <section className="manana">
          <b>Mañana ({DIAS[diaSemana(sumarDias(hoy, 1))].toLowerCase()}):</b> {destacadaManana.titulo} con {destacadaManana.tusMedios[0]}.
        </section>
      )}
      <p className="sin">¿Vas a pagar algo puntual? Preguntale al <a href="#chat" onClick={e => { e.preventDefault(); irA("chat"); }}>chat</a>.</p>
    </>
  );
}
