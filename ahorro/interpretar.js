import { norm, isoHoy, sumarDias, diaSemana } from "./motor.js";

// Comercios reconocidos en el texto. El orden importa: los más específicos primero.
const COMERCIOS = [
  { re: /\b(pedidos ?ya|pya) market\b|\bmarket\b/, comercio: "PedidosYa Market", rubro: "delivery" },
  { re: /\bpedidos ?ya\b|\bpya\b/, comercio: "PedidosYa", rubro: "delivery" },
  { re: /\bcarrefour\b|\bcarre\b/, comercio: "Carrefour", rubro: "supermercado" },
  { re: /\bcoto\b/, comercio: "Coto", rubro: "supermercado" },
  { re: /\bchango ?mas\b|\bchango\b/, comercio: "ChangoMás", rubro: "supermercado" },
  // "día" es ambiguo ("¿qué día conviene?"): solo cuenta como comercio después de en/al/del/super.
  { re: /\b(en|al|del|de|super|supermercado|supermercados)\s+(el\s+)?dia\b(?!\s+(de|del)\b)|^dia\b/, comercio: "Día", rubro: "supermercado" },
  { re: /\buber\b/, comercio: "Uber", rubro: "transporte" },
  { re: /\bcabify\b/, comercio: "Cabify", rubro: "transporte" },
  { re: /\bedenor\b|\b(la )?luz\b/, comercio: "Edenor", rubro: "servicios" },
  { re: /\bmetrogas\b|\b(el )?gas\b/, comercio: "Metrogas", rubro: "servicios" },
  { re: /\bagip\b|\babl\b|\bpatentes?\b/, comercio: "AGIP", rubro: "servicios" },
  { re: /\bpersonal\b|\bflow\b|\binternet\b/, comercio: "Personal", rubro: "servicios" },
  { re: /\bexpensas\b/, comercio: "Expensas", rubro: "servicios" },
];

const RUBROS = [
  { re: /\bsuper(mercado)?s?\b|\bcompra(s)? del mes\b|\bmercaderia\b/, rubro: "supermercado" },
  { re: /\bdelivery\b|\bpedir comida\b|\bpedido\b/, rubro: "delivery" },
  { re: /\bcomer\b|\bcena(r)?\b|\balmuerzo\b|\balmorzar\b|\brestaurant(e)?s?\b|\bresto\b|\bbar(es)?\b|\bcafe\b|\bdesayuno\b|\bmerienda\b|\bsalida\b|\bhelado\b|\bgastronomia\b/, rubro: "gastronomia" },
  { re: /\bservicios?\b|\bfactura\b|\bimpuestos?\b/, rubro: "servicios" },
  { re: /\btaxi\b|\bremis\b|\bviaje\b|\btransporte\b/, rubro: "transporte" },
  { re: /\bbarrio\b|\bcercania\b|\bkiosco\b|\bverduleria\b|\bcarniceria\b|\balmacen\b|\bchino\b/, rubro: "cercania" },
];

const DIAS_RE = [
  [/\bdomingo\b/, 0], [/\blunes\b/, 1], [/\bmartes\b/, 2], [/\bmiercoles\b/, 3],
  [/\bjueves\b/, 4], [/\bviernes\b/, 5], [/\bsabado\b/, 6], [/\bfinde\b|\bfin de semana\b/, 6],
];

export const MONTO_DEFAULT = {
  supermercado: 50000, delivery: 20000, gastronomia: 30000, servicios: 30000,
  transporte: 8000, cercania: 15000, general: 20000,
};

function leerFecha(t, hoy) {
  if (/\bpasado manana\b/.test(t)) return { fecha: sumarDias(hoy, 2) };
  if (/\bmanana\b/.test(t)) return { fecha: sumarDias(hoy, 1) };
  if (/\bhoy\b|\bahora\b/.test(t)) return { fecha: hoy };
  let m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    let anio = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : hoy.slice(0, 4);
    let f = `${anio}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (!m[3] && f < hoy) f = `${Number(anio) + 1}${f.slice(4)}`;
    return { fecha: f, span: m[0] };
  }
  for (const [re, d] of DIAS_RE) {
    if (re.test(t)) return { fecha: sumarDias(hoy, (d - diaSemana(hoy) + 7) % 7) };
  }
  m = t.match(/\bel (\d{1,2})\b(?!\s*(%|mil|k\b|lucas?))/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
    let f = `${hoy.slice(0, 8)}${m[1].padStart(2, "0")}`;
    if (f < hoy) f = sumarDias(`${hoy.slice(0, 8)}01`, 32).slice(0, 8) + m[1].padStart(2, "0");
    return { fecha: f, span: m[0] };
  }
  return null;
}

function leerMonto(t) {
  const num = s => Number(s.replace(/\./g, "").replace(",", "."));
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(millon(es)?|palos?)\b/);
  if (m) return Math.round(num(m[1]) * 1e6);
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(mil|k|lucas?)\b/);
  if (m) return Math.round(num(m[1]) * 1000);
  const cands = [...t.matchAll(/\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?!\s*%)/g)].map(x => num(x[1])).filter(n => n >= 100);
  return cands.length ? Math.max(...cands) : null;
}

// Convierte una frase en una consulta { rubro, comercio, monto, fecha, intencion }.
// `previo` es la consulta anterior: lo que no se dice en la frase nueva se hereda de ahí.
export function interpretar(texto, previo, hoy = isoHoy()) {
  let t = norm(texto).replace(/[¿?¡!.,;:]+(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();

  const f = leerFecha(t, hoy);
  if (f?.span) t = t.replace(f.span, " ");
  const monto = leerMonto(t);

  let comercio = null, rubro = null;
  for (const c of COMERCIOS) if (c.re.test(t)) { comercio = c.comercio; rubro = c.rubro; break; }
  if (!rubro) for (const r of RUBROS) if (r.re.test(t)) { rubro = r.rubro; break; }

  let intencion = "recomendar";
  if (/\b(que|cual|en que) dia\b|\bcuando\b|\bmejor dia\b|\bconviene esperar\b/.test(t)) intencion = "cuando";
  else if (/\bque promos?\b|\bpromos? (hay|de|del|para)\b|\bque hay\b|\bque descuentos?\b|\blista(r)?\b/.test(t)) intencion = "promos";
  else if (!comercio && !rubro && !monto && !f && /\bhola\b|\bayuda\b|\bque podes\b|\bcomo (funciona|te uso)\b|\bque sabes\b/.test(t)) intencion = "ayuda";

  // Nada reconocible: no repetir la respuesta anterior.
  if (intencion === "recomendar" && !comercio && !rubro && monto == null && !f) {
    return { intencion: "noentendi" };
  }
  // "¿Qué promos hay hoy?" sin rubro: todas las del día, sin heredar el rubro anterior.
  if (intencion === "promos" && !comercio && !rubro) {
    return { rubro: null, comercio: "", monto: null, fecha: f?.fecha || hoy, intencion };
  }

  const temaNuevo = Boolean(comercio || rubro);
  const mismoRubro = !rubro || rubro === previo?.rubro;
  const heredaMonto = monto == null && mismoRubro && previo?.monto != null;
  const consulta = {
    rubro: rubro || previo?.rubro || null,
    // Nombrar otro comercio o un rubro sin comercio ("¿y en el súper?") reemplaza al anterior.
    comercio: comercio || (rubro ? "" : previo?.comercio || ""),
    monto: monto ?? (heredaMonto ? previo.monto : null),
    montoSupuesto: heredaMonto ? Boolean(previo.montoSupuesto) : false,
    fecha: f?.fecha || (temaNuevo ? hoy : previo?.fecha || hoy),
    intencion,
  };
  if (consulta.monto == null && consulta.rubro) {
    consulta.monto = MONTO_DEFAULT[consulta.rubro];
    consulta.montoSupuesto = true;
  }
  return consulta;
}
