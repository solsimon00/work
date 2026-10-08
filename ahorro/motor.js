import MEDIOS from "./medios.json";

export { MEDIOS };

export const RUBROS = [
  { id: "supermercado", nombre: "Supermercado" },
  { id: "delivery", nombre: "Delivery (PedidosYa)" },
  { id: "gastronomia", nombre: "Salidas a comer" },
  { id: "servicios", nombre: "Servicios e impuestos" },
  { id: "transporte", nombre: "Uber / Cabify" },
  { id: "cercania", nombre: "Comercios de barrio" },
  { id: "general", nombre: "Otro" },
];

export const COMERCIOS_SUGERIDOS = {
  supermercado: ["Día", "Carrefour", "Coto", "ChangoMás"],
  delivery: ["PedidosYa", "PedidosYa Market"],
  gastronomia: [],
  servicios: ["Edenor", "Metrogas", "AGIP", "Personal", "Expensas"],
  transporte: ["Uber", "Cabify"],
  cercania: [],
  general: [],
};

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const PERIODO = { compra: "por compra", dia: "por día", semana: "por semana", mes: "por mes", promo: "en total" };

export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
export const pesos = n => "$" + Math.round(n).toLocaleString("es-AR");
export const isoHoy = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const diaSemana = iso => new Date(iso + "T12:00:00").getDay();
export const sumarDias = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function aplica(p, { rubro, comercio, fecha }) {
  if (p.rubro !== rubro && p.rubro !== "general") return false;
  if (p.excluyeRubros?.includes(rubro)) return false;
  if (p.desde && fecha < p.desde) return false;
  if (p.hasta && fecha > p.hasta) return false;
  if (!p.dias.includes(diaSemana(fecha))) return false;
  if (comercio && p.comercios.length && !p.comercios.some(c => norm(c) === norm(comercio))) return false;
  return true;
}

export function calcular(p, monto) {
  const bruto = (monto * p.porcentaje) / 100;
  const faltaMinimo = p.minimo && monto < p.minimo ? p.minimo - monto : 0;
  const ahorro = faltaMinimo ? 0 : p.tope != null ? Math.min(bruto, p.tope) : bruto;
  return { ahorro, topeado: p.tope != null && bruto > p.tope, faltaMinimo };
}

// Para cada medio, la mejor promo aplicable ese día.
export function ranking(promos, consulta, medios = MEDIOS) {
  const monto = Number(consulta.monto) || 0;
  return medios.map(m => {
    const opciones = promos
      .filter(p => p.medios.includes(m.id) && aplica(p, consulta))
      .map(p => ({ promo: p, ...calcular(p, monto) }))
      .sort((a, b) => b.ahorro - a.ahorro);
    return { medio: m, mejor: opciones[0] || null, otras: opciones.slice(1) };
  }).sort((a, b) => (b.mejor?.ahorro || 0) - (a.mejor?.ahorro || 0));
}

// Mejor ahorro posible en cada uno de los próximos 7 días (desde la fecha dada).
export function proximos7(promos, consulta, medios = MEDIOS) {
  return [...Array(7)].map((_, i) => {
    const fecha = sumarDias(consulta.fecha, i);
    const top = ranking(promos, { ...consulta, fecha }, medios)[0];
    return { fecha, ahorro: top?.mejor?.ahorro || 0, medio: top?.mejor ? top.medio : null, promo: top?.mejor?.promo || null };
  });
}

// Promos que se pueden usar en una fecha con los medios del perfil, agrupadas por rubro.
export function promosDelDia(promos, medios, fecha, rubrosInteres = []) {
  const ids = new Set(medios.map(m => m.id));
  const nombre = id => medios.find(m => m.id === id)?.nombre;
  const vigentes = promos
    .filter(p => p.medios.some(id => ids.has(id)))
    .filter(p => aplica(p, { rubro: p.rubro, comercio: "", fecha }))
    .map(p => ({ ...p, tusMedios: p.medios.filter(id => ids.has(id)).map(nombre) }))
    .sort((a, b) => b.porcentaje - a.porcentaje);
  const orden = [...rubrosInteres, ...RUBROS.map(r => r.id).filter(r => !rubrosInteres.includes(r))];
  return orden
    .map(r => ({ rubro: RUBROS.find(x => x.id === r), promos: vigentes.filter(p => p.rubro === r) }))
    .filter(g => g.rubro && g.promos.length);
}
