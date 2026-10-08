// Envía a cada usuario con alertas activas una notificación push con los descuentos que puede usar hoy.
// Corre todos los días desde .github/workflows/alertas.yml. Variables de entorno (secrets de GitHub):
//   FIREBASE_SERVICE_ACCOUNT (JSON de la cuenta de servicio), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (opcional)
import webpush from "web-push";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import DATA from "../ahorro/promos.json";
import { MEDIOS, DIAS, diaSemana, promosDelDia } from "../ahorro/motor.js";

const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:alertas@example.com";
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
  if (!FIREBASE_SERVICE_ACCOUNT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("Faltan secrets de Firebase o VAPID: no se envían alertas.");
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore();

  const perfiles = await db.collection("profiles").where("alertas", "==", true).get();
  let enviadas = 0, borradas = 0;
  for (const docPerfil of perfiles.docs) {
    const msg = armarMensaje(docPerfil.data());
    if (!msg) continue;
    const subs = await docPerfil.ref.collection("subs").get();
    for (const s of subs.docs) {
      const { endpoint, p256dh, auth } = s.data();
      if (PRUEBA) { console.log(docPerfil.id, msg); continue; }
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(msg));
        enviadas++;
      } catch (err) {
        // 404/410: la suscripción ya no existe (desinstaló la app o revocó el permiso).
        if (err.statusCode === 404 || err.statusCode === 410) { await s.ref.delete(); borradas++; }
        else console.error("Error enviando a", endpoint.slice(0, 40), err.statusCode, err.body);
      }
    }
  }
  console.log(`${hoy}: ${perfiles.size} perfiles con alertas, ${enviadas} enviadas, ${borradas} suscripciones vencidas borradas.`);
}

main().catch(e => { console.error(e); process.exit(1); });
