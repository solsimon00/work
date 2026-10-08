import { supabase, VAPID_PUBLIC_KEY } from "./supabase.js";

export const pushSoportado = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// En iPhone las notificaciones web solo funcionan con la app agregada a la pantalla de inicio.
export const esIOSSinInstalar = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone);

function claveABytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function activarPush(user) {
  if (!pushSoportado()) throw new Error("Este navegador no soporta notificaciones.");
  if (!supabase || !user) throw new Error("Iniciá sesión para recibir alertas.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste permiso para notificaciones.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error("No se pudo guardar la suscripción: " + error.message);
}

export async function desactivarPush() {
  if (!pushSoportado()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
