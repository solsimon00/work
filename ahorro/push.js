import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, VAPID_PUBLIC_KEY } from "./firebase.js";

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

// Id de documento estable por dispositivo (el endpoint es largo y tiene "/").
async function idDe(endpoint) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function activarPush(user) {
  if (!pushSoportado()) throw new Error("Este navegador no soporta notificaciones.");
  if (!db || !user) throw new Error("Iniciá sesión para recibir alertas.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("No diste permiso para notificaciones.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLIC_KEY) }));
  const { endpoint, keys } = sub.toJSON();
  await setDoc(doc(db, "profiles", user.uid, "subs", await idDe(endpoint)), {
    endpoint, p256dh: keys.p256dh, auth: keys.auth, creada: new Date().toISOString(),
  });
}

export async function desactivarPush(user) {
  if (!pushSoportado()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (db && user) await deleteDoc(doc(db, "profiles", user.uid, "subs", await idDe(sub.endpoint))).catch(() => {});
  await sub.unsubscribe();
}
