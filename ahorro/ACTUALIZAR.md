# Cómo actualizar las promos (instrucciones para el agente semanal)

Objetivo: dejar `ahorro/promos.json` con las promos **vigentes** para los medios de pago de `ahorro/medios.json`.

## Qué buscar

Por cada emisor (Santander Select, Galicia Éminent, Naranja X, YOY, Personal Pay, Buepp, Cuenta DNI, Mercado Pago, MODO), buscá promos del mes en curso y del siguiente para estos rubros:

- `supermercado`: Día, Carrefour (y cualquier otra cadena con descuento fuerte)
- `delivery`: PedidosYa
- `gastronomia`: restaurantes y bares
- `servicios`: Edenor, Metrogas, AGIP (ABL o Patentes), Personal (internet), expensas
- `cercania`: comercios de barrio
- `general`: promos que valen en cualquier comercio

Las promos con MODO se cargan con los medios del banco con el que se paga (por ejemplo `san_visa_credito`). Para MODO no hay un medio aparte.

Usá WebSearch en modo `extended`, con búsquedas como "<emisor> promociones <mes> <año> supermercados". Si tenés WebFetch y el dominio no está bloqueado, leé la fuente. Preferí fuentes oficiales (sitios de los bancos, modo.com.ar) antes que medios de noticias.

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
