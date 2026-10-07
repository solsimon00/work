# Cómo actualizar las promos (instrucciones para el agente semanal)

Objetivo: dejar `ahorro/promos.json` con las promos **vigentes** para los medios de pago de `ahorro/medios.json`.

## Qué buscar

Por cada emisor (Santander Select, Galicia Éminent, Naranja X, YOY, Personal Pay, Buepp, Cuenta DNI, Brubank (plan básico), Mercado Pago, MODO), buscá promos del mes en curso y del siguiente para estos rubros:

- `supermercado`: Día, Carrefour (y cualquier otra cadena con descuento fuerte)
- `delivery`: PedidosYa
- `gastronomia`: restaurantes y bares
- `servicios`: Edenor, Metrogas, AGIP (ABL o Patentes), Personal (internet), expensas
- `transporte`: Uber y Cabify
- `cercania`: comercios de barrio
- `general`: promos que valen en cualquier comercio

Las promos con MODO se cargan con los medios del banco con el que se paga (por ejemplo `san_visa_credito`). Para MODO no hay un medio aparte.

## Fuentes (en orden de preferencia)

WebFetch puede estar bloqueado aunque el contenedor tenga red: usá `curl` (con `-A "Mozilla/5.0"`) o Playwright (Chromium en `/opt/pw-browsers/chromium`).

1. **API pública de MODO** (cubre Galicia, Santander, YOY y Buepp). Es JSON y no necesita navegador:
   - Listado: `https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=<slot>&limit=50&page=<n>&source=web_modo&origin=WEB_MODO&slot_info=true`, con los slots `web-modo-hub-supermercados`, `web-modo-hub-destacadas` y `web-modo-hub-mas-promos`. Paginá hasta `pagination.total_pages`.
   - En cada card: `card.participating_bank`, `card.validity_place`, `offer.outcomes.cashback.amount` (%), `offer.limits.period_cap.amount_by_period` y `reset_by` (tope), `offer.limits.transaction_cap.amount_by_transaction` (tope por compra), `offer.requirements.amount_range.min` (mínimo), `benefit.conditions.schedule` (días y vigencia), `benefit.conditions.payment_methods.methods` (un tipo vacío o `pc` indica dinero en cuenta) y `benefit.publication.slug`. Usá solo las que tengan `calculated_status == "RUNNING"`.
   - Bancos de una promo "Bancos adheridos": `https://www.modo.com.ar/promos/api/rewards/v2/benefit/<slug>/banks`.
   - Detalle: `https://www.modo.com.ar/promos/api/rewards/v2/benefit/<slug>`, con los campos `debit_list`, `credit_list` y `publication_description`.
   - Como fuente, poné `https://www.modo.com.ar/promos/<slug>`.
2. **Personal Pay**: renderizá `https://www.personalpay.com.ar/beneficios` con Playwright y capturá las respuestas JSON. Cada beneficio trae `name`, `days`, `dueDate`, `paymentMethods` y `levels[]` (con `discountValue`, `limitAmount`, `usageLimit` y `paymentMin`).
3. **Naranja X**: `https://www.naranjax.com/promociones-amba` (renderizada). Los términos y condiciones del final traen topes y vigencias exactos. Ojo: algunas promos piden el Plan Turbo o la tarjeta de crédito Naranja X, y el usuario tiene **plan básico, débito y dinero en cuenta**.
4. **Galicia y Cuenta DNI**: notas de calcularsueldo.com.ar ("SUPERMERCADOS: Todos los descuentos con Banco Galicia en <mes> <año>", "Cuenta DNI en supermercados…") con curl. También el buscador de beneficios de Banco Provincia.
4a. **Galicia (API oficial)**: `https://loyalty.bff.bancogalicia.com.ar/api/portal/personalizacion/v1/promociones/catalogo?IdCategoria=<id>&page=1&pageSize=50` con curl y los headers `Origin: https://www.galicia.ar` y `Referer: https://www.galicia.ar/`. Las categorías salen de `.../v1/categorias?idAudiencia=1&SubCategoria=false&Visibles=true` (Transportes = 131); también se puede filtrar por marca con `IdsMarca=<id>&TipoPromocion=marca`. Si `eminent: true`, es la promo Éminent (la del usuario). El tope no viene en el listado.
4b. **Brubank**: `https://help.brubank.com/es/collections/3832828-promociones-disponibles` con curl. Cada artículo trae el detalle y la vigencia. El usuario tiene el **plan básico**, así que no cargues las promos del plan Ultra.
5. **WebSearch** (modo `extended`) para lo que falte: Mercado Pago (su sitio devuelve 403), Santander Amex y Galicia Éminent.

## Formato de cada promo

```json
{
  "id": "emisor-comercio-dia",          // estable entre actualizaciones
  "emisor": "Santander",
  "titulo": "20% en Día viernes y sábados con MODO",
  "medios": ["san_visa_credito"],        // ids de medios.json
  "rubro": "supermercado",
  "comercios": ["Día"],                  // [] = cualquier comercio del rubro
  "dias": [5, 6],                        // 0=Dom, 1=Lun ... 6=Sáb
  "porcentaje": 20,
  "tope": 20000,                         // null = sin tope
  "topePeriodo": "mes",                  // compra | dia | semana | mes | promo | null
  "minimo": 0,
  "canal": "MODO desde la app Santander",
  "desde": "2026-10-01",
  "hasta": "2026-10-31",
  "condiciones": "texto corto",
  "fuente": "https://...",
  "excluyeRubros": ["transporte"],      // opcional: rubros donde no aplica una promo "general" (p. ej. QR en apps)
  "verificado": true                     // false si algún dato (día, tope o vigencia) es dudoso
}
```

## Reglas

1. Borrá las promos con `hasta` anterior a hoy.
2. No inventes datos. Si no encontrás el tope, poné `null` y `verificado: false`, y aclaralo en `condiciones`.
3. Si dos fuentes no coinciden, quedate con la oficial o la más reciente, y marcá `verificado: false`.
4. Actualizá `actualizado` con la fecha de hoy.
5. Validá el JSON y que `npm run build` compile.
6. Hacé commit con el mensaje `Actualiza promos <fecha>` y un resumen de altas, bajas y cambios.

## Datos que informó el usuario

Las promos cuya `condiciones` diga "Dato que el usuario vio en su app" las informó el usuario. No las pises con datos públicos distintos: si ves algo diferente, dejá su dato y avisá la diferencia en el resumen.
