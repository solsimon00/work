import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const CLAVE = "cqp-perfil";
const VACIO = { medios: [], rubros: [], alertas: false };

function leerLocal() {
  try { return { ...VACIO, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch { return { ...VACIO }; }
}
function guardarLocal(p) {
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento: queda en memoria */ }
}

// Perfil del usuario: qué medios de pago tiene, qué rubros le interesan y si quiere alertas.
// Sin sesión se guarda en el dispositivo; con sesión de Google se sincroniza en Supabase.
export function useCuenta() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfilState] = useState(leerLocal);
  const [cargando, setCargando] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user || null); setCargando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Al iniciar sesión: traer el perfil de la nube, o subir el local si es la primera vez.
  useEffect(() => {
    if (!supabase || !user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("medios, rubros, alertas").eq("user_id", user.id).maybeSingle();
      if (data) {
        const p = { ...VACIO, ...data };
        setPerfilState(p); guardarLocal(p);
      } else {
        await supabase.from("profiles").upsert({ user_id: user.id, ...leerLocal() });
      }
    })();
  }, [user]);

  const setPerfil = useCallback(cambio => {
    setPerfilState(prev => {
      const p = { ...prev, ...(typeof cambio === "function" ? cambio(prev) : cambio) };
      guardarLocal(p);
      if (supabase && user) {
        supabase.from("profiles").upsert({ user_id: user.id, ...p, updated_at: new Date().toISOString() }).then(() => {});
      }
      return p;
    });
  }, [user]);

  const login = () => supabase?.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  const logout = () => supabase?.auth.signOut();

  return { user, perfil, setPerfil, login, logout, cargando, nube: Boolean(supabase) };
}
