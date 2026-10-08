# Puesta en marcha de la web app

La app funciona sin configurar nada: el perfil se guarda en el dispositivo. Estos pasos suman la URL propia, el login (Google o mail) y las alertas push. Son todos gratis.

## 1. Publicar en Vercel (URL propia)

1. Entrá a https://vercel.com y creá la cuenta con **Continue with GitHub**.
2. **Add New → Project** → importá el repo `solsimon00/work`.
3. En **Project Name** poné el nombre de la URL (por ejemplo `conquepago` → `conquepago.vercel.app`). No cambies nada más.
4. **Deploy**. Cada push a `main` vuelve a publicar solo.

## 2. Crear el proyecto de Firebase (login y perfiles)

1. Entrá a https://console.firebase.google.com con tu cuenta de Google → **Crear un proyecto** (podés desactivar Google Analytics).
2. **Compilación → Authentication → Comenzar → Método de acceso**:
   - **Google** → Habilitar → elegí tu mail de asistencia → Guardar.
   - **Correo electrónico/contraseña** → Habilitar también **Vínculo de correo electrónico (acceso sin contraseña)** → Guardar.
3. **Authentication → Configuración → Dominios autorizados → Agregar dominio**: tu dominio de Vercel (ej. `conquepago.vercel.app`).
4. **Compilación → Firestore Database → Crear base de datos** → ubicación `southamerica-east1` (São Paulo) → modo producción. En la pestaña **Reglas**, pegá el contenido de `firebase/firestore.rules` y tocá **Publicar**.
5. **⚙️ Configuración del proyecto → General → Tus apps → ícono `</>` (Web)** → poné un nombre → **Registrar app**. Te muestra un bloque `firebaseConfig`: **pasale a Claude** `apiKey`, `authDomain`, `projectId` y `appId` (son públicos, van en el código).

## 3. Alertas diarias (GitHub)

1. En Firebase: **⚙️ Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo `.json` (secreto: no lo compartas).
2. En GitHub: repo `work` → **Settings → Secrets and variables → Actions → New repository secret**. Creá:

| Nombre | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | todo el contenido del archivo `.json` del paso anterior |
| `VAPID_PUBLIC_KEY` | `BJYMdkBCxgIgL2wMj5PkkNt9DC-OY9VsyqGVGSXBP4JfbaPWpie_w9xwyxSMtwYVGz6cF2CgtW2iBxcLVUTDVKg` |
| `VAPID_PRIVATE_KEY` | la clave privada que te pasó Claude por el chat |
| `VAPID_SUBJECT` | `mailto:` + tu mail |

El workflow **Alertas diarias de promos** corre todos los días a las 8:45. Para probarlo: **Actions → Alertas diarias de promos → Run workflow**.

## Cómo entra y recibe alertas cada persona

1. Abre la app → **Perfil** → **Entrar con Google**, o escribe su mail y toca el link que le llega.
2. Tilda sus tarjetas y los rubros que más usa.
3. **Android/compu:** activa "Avisarme cada mañana…" y acepta el permiso.
4. **iPhone (iOS 16.4 o más):** primero Compartir → **Agregar a inicio**, abre la app desde el ícono, entra con Google (el link por mail se abre en Safari, no en la app instalada) y activa las alertas.
