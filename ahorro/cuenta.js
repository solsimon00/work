import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink, onAuthStateChanged, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

const CLAVE = "cqp-perfil";
const CLAVE_MAIL = "cqp-mail-login";
const VACIO = { medios: [], rubros: [], alertas: false };

const leer = (k, def) => { try { return localStorage.getItem(k) ?? def; } catch { return def; } };
const escribir = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const leerLocal = () => { try { return { ...VACIO, ...JSON.parse(leer(CLAVE, "{}")) }; } catch { return { ...VACIO }; } };
const guardarLocal = p => escribir(CLAVE, JSON.stringify(p));
const urlApp = () => window.location.origin + window.location.pathname;

// Perfil del usuario: qué medios de pago tiene, qué rubros le interesan y si quiere alertas.
// Sin sesión se guarda en el dispositivo; con sesión (Google o link por mail) se sincroniza en Firestore.
export function useCuenta() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfilState] = useState(leerLocal);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    // Volviendo del link que llegó por mail.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const mail = leer(CLAVE_MAIL, null) || window.prompt("Confirmá tu mail para entrar");
      if (mail) {
        signInWithEmailLink(auth, mail, window.location.href)
          .then(() => { escribir(CLAVE_MAIL, null); window.history.replaceState(null, "", urlApp() + "#perfil"); })
          .catch(() => setError("El link venció o ya se usó. Pedí uno nuevo."));
      }
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Al iniciar sesión: traer el perfil de la nube, o subir el local si es la primera vez.
  useEffect(() => {
    if (!db || !user) return;
    (async () => {
      const ref = doc(db, "profiles", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const p = { ...VACIO, ...snap.data() };
        delete p.updated_at;
        setPerfilState(p); guardarLocal(p);
      } else {
        await setDoc(ref, { ...leerLocal(), updated_at: new Date().toISOString() });
      }
    })().catch(() => setError("No se pudo leer tu perfil de la nube."));
  }, [user]);

  const setPerfil = useCallback(cambio => {
    setPerfilState(prev => {
      const p = { ...prev, ...(typeof cambio === "function" ? cambio(prev) : cambio) };
      guardarLocal(p);
      if (db && user) setDoc(doc(db, "profiles", user.uid), { ...p, updated_at: new Date().toISOString() }).catch(() => {});
      return p;
    });
  }, [user]);

  const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
    if (e.code !== "auth/popup-closed-by-user") setError("No se pudo entrar con Google. Probá con tu mail.");
  });

  async function loginMail(mail) {
    await sendSignInLinkToEmail(auth, mail, { url: urlApp(), handleCodeInApp: true });
    escribir(CLAVE_MAIL, mail);
  }

  const logout = () => signOut(auth);

  return { user, perfil, setPerfil, loginGoogle, loginMail, logout, error, nube: Boolean(auth) };
}
