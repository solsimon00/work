# Puesta en marcha de la web app

La app funciona sin configurar nada: el perfil se guarda en el dispositivo. Estos pasos suman la URL propia, el login con Google y las alertas push.

## 1. Publicar en Vercel (URL propia)

1. Entrá a https://vercel.com y creá la cuenta con **Continue with GitHub**.
2. **Add New → Project** → importá el repo `solsimon00/work`.
3. En **Project Name** poné el nombre que quieras para la URL (por ejemplo `conquepago` → `conquepago.vercel.app`). No cambies nada más: `vercel.json` ya dice cómo construir la app.
4. **Deploy**. Cada push a `main` vuelve a publicar solo.

## 2. Crear el proyecto de Supabase (login y perfiles)

1. Entrá a https://supabase.com → **Start your project** (podés entrar con GitHub) → **New project**. Región: São Paulo.
2. **SQL Editor → New query**: pegá el contenido de `supabase/schema.sql` y tocá **Run**.
3. **Authentication → URL Configuration**: en **Site URL** poné tu URL de Vercel (ej. `https://conquepago.vercel.app`) y agregala también en **Redirect URLs**.

## 3. Activar "Entrar con Google"

1. En Supabase: **Authentication → Sign In / Providers → Google**. Copiá la **Callback URL** que te muestra.
2. En https://console.cloud.google.com: creá un proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** (tipo Externo, nombre de la app, tu mail) → **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo **Aplicación web** → en **URI de redireccionamiento autorizados** pegá la Callback URL de Supabase.
3. Copiá el **Client ID** y el **Client secret** de Google en la pantalla de Google de Supabase y activá el proveedor.
4. Mientras la app de Google esté "en prueba", agregá en **Usuarios de prueba** los mails de quienes la van a usar (o publicala para que entre cualquiera).

## 4. Conectar la app a Supabase

En Supabase, **Project Settings → API**: pasale a Claude la **Project URL** y la clave **anon public** (son públicas, van en el código). **No** pases la `service_role`.

## 5. Alertas diarias (GitHub)

En GitHub: repo `work` → **Settings → Secrets and variables → Actions → New repository secret**. Creá:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | la Project URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (secreta: solo acá) |
| `VAPID_PUBLIC_KEY` | `BJYMdkBCxgIgL2wMj5PkkNt9DC-OY9VsyqGVGSXBP4JfbaPWpie_w9xwyxSMtwYVGz6cF2CgtW2iBxcLVUTDVKg` |
| `VAPID_PRIVATE_KEY` | la clave privada que te pasó Claude por el chat (secreta: solo acá) |
| `VAPID_SUBJECT` | `mailto:` + tu mail |

El workflow **Alertas diarias de promos** corre todos los días a las 8:45. Para probarlo: **Actions → Alertas diarias de promos → Run workflow**.

## Cómo recibe alertas cada persona

1. Abre la app, va a **Perfil**, entra con Google y tilda sus tarjetas.
2. **Android/compu:** activa "Avisarme cada mañana…" y acepta el permiso.
3. **iPhone (iOS 16.4 o más):** primero Compartir → **Agregar a inicio**, abre la app desde el ícono y ahí activa las alertas.
