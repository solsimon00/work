// Envía a cada usuario con alertas activas una notificación push con los descuentos que puede usar hoy.
// Corre todos los días desde .github/workflows/alertas.yml. Variables de entorno (secrets de GitHub):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (opcional)
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import DATA from "../ahorro/promos.json";
import { MEDIOS, DIAS, diaSemana, promosDelDia } from "../ahorro/motor.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:alertas@conquepago.app";
const PRUEBA = process.argv.includes("--prueba"); // muestra los mensajes sin enviarlos

// Fecha de hoy en Argentina, sin depender del huso horario del runner.
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

const DONDE = {
  supermercado: "el súper", delivery: "delivery", gastronomia: "restaurantes", servicios: "servicios",
  transporte: "viajes", cercania: "comercios de barrio", general: "cualquier comercio",
};

export function armarMensaje(perfil) {
  const medios = MEDIOS.filter(m => perfil.medios.includes(m.id));
  if (!medios.length) return null;
  let grupos = promosDelDia(DATA.promos, medios, hoy, perfil.rubros || []);
  if (perfil.rubros?.length) grupos = grupos.filter(g => perfil.rubros.includes(g.rubro.id));
  const promos = grupos.flatMap(g => g.promos).sort((a, b) => b.porcentaje - a.porcentaje);
  if (!promos.length) return null;
  const top = promos[0];
  const donde = p => p.comercios[0] || DONDE[p.rubro] || p.rubro;
  const medio = n => n.replace(/\s*\(.*?\)/g, "").replace(" · Dinero en cuenta", "").replace(" · ", " ");
  return {
    title: `Hoy es ${DIAS[diaSemana(hoy)].toLowerCase()}: tenés ${top.porcentaje}% en ${donde(top)}`,
    body: promos.slice(0, 3).map(p => `${p.porcentaje}% en ${donde(p)} con ${medio(p.tusMedios[0])}`).join("\n")
      + (promos.length > 3 ? `\ny ${promos.length - 3} más en la app` : ""),
    url: "./#hoy",
    tag: "promos-" + hoy,
  };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("Faltan secrets de Supabase o VAPID: no se envían alertas.");
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: perfiles, error } = await db.from("profiles").select("user_id, medios, rubros").eq("alertas", true);
  if (error) throw error;
  const { data: subs, error: e2 } = await db.from("push_subscriptions").select("*").in("user_id", perfiles.map(p => p.user_id));
  if (e2) throw e2;

  let enviadas = 0, borradas = 0;
  for (const perfil of perfiles) {
    const msg = armarMensaje(perfil);
    if (!msg) continue;
    for (const s of subs.filter(x => x.user_id === perfil.user_id)) {
      if (PRUEBA) { console.log(perfil.user_id, msg); continue; }
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg));
        enviadas++;
      } catch (err) {
        // 404/410: la suscripción ya no existe (desinstaló la app o revocó el permiso).
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          borradas++;
        } else {
          console.error("Error enviando a", s.endpoint.slice(0, 40), err.statusCode, err.body);
        }
      }
    }
  }
  console.log(`${hoy}: ${perfiles.length} perfiles con alertas, ${enviadas} enviadas, ${borradas} suscripciones vencidas borradas.`);
}

main().catch(e => { console.error(e); process.exit(1); });
