import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración web de Firebase (Consola → Configuración del proyecto → Tus apps → SDK).
// Estos datos son públicos: la seguridad la dan las reglas de firebase/firestore.rules.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Clave pública VAPID para las notificaciones push (la privada va solo en los secrets de GitHub).
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BJYMdkBCxgIgL2wMj5PkkNt9DC-OY9VsyqGVGSXBP4JfbaPWpie_w9xwyxSMtwYVGz6cF2CgtW2iBxcLVUTDVKg";

const app = config.apiKey ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
