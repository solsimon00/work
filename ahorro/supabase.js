import { createClient } from "@supabase/supabase-js";

// Datos públicos del proyecto de Supabase (la anon key está pensada para ir en el frontend:
// la seguridad la dan las políticas RLS de supabase/schema.sql).
// Se pueden pisar con las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
const URL = import.meta.env.VITE_SUPABASE_URL || "";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Clave pública VAPID para las notificaciones push (la privada va solo en los secrets de GitHub).
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BJYMdkBCxgIgL2wMj5PkkNt9DC-OY9VsyqGVGSXBP4JfbaPWpie_w9xwyxSMtwYVGz6cF2CgtW2iBxcLVUTDVKg";

export const supabase = URL && ANON_KEY ? createClient(URL, ANON_KEY) : null;
