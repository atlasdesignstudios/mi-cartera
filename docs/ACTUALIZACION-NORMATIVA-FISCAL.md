# Actualización anual de normativa fiscal

**Estado:** procedimiento operativo. La versión fiscal vigente se identifica mediante `FISCAL_YEAR` en `public/fiscal.js`.

## Antes de publicar un nuevo ejercicio

1. Revisar en la AEAT el calendario del contribuyente, las instrucciones de los modelos 130 y 303 y las reglas de presentación/domiciliación.
2. Revisar en BOE la Ley del IRPF, su Reglamento, normativa de IVA y órdenes anuales de cotización RETA; contrastar también Seguridad Social/Import@ss.
3. Confirmar para cada territorio y actividad: régimen de estimación, porcentaje/límite de gastos de difícil justificación, reducciones incompatibles, retenciones y supuestos de exoneración.
4. Incorporar los cambios como reglas explícitas por ejercicio. No reutilizar porcentajes de un año anterior sin comprobar su vigencia.
5. Actualizar `FISCAL_YEAR`, tablas y fuentes oficiales en `public/fiscal.js`; revisar el formulario y las validaciones de `server.js`.
6. Actualizar los festivos nacionales, autonómicos y locales del calendario aplicable. Mientras no exista una fuente oficial sincronizada, el usuario debe introducir los festivos de su municipio en **Mi negocio**. No presentar esa lista como calendario completo.
7. Añadir pruebas de regresión para cada cambio y casos negativos: régimen no elegible, actividad empresarial/profesional, inicio de actividad, reducción incompatible, territorios especiales, festivos y fines de semana.
8. Actualizar este documento y el apartado fiscal del README con fecha, norma, fuente oficial y alcance territorial.
9. Ejecutar `npm test`, `npm run build:web`, `node --check server.js` y `node --check public/app.js`. Revisar el resultado del workflow de GitHub Actions y la versión publicada antes de dar la actualización por finalizada.

## Reglas de seguridad del cálculo (versión 2026)

- El gasto de difícil justificación solo se calcula automáticamente si el usuario confirma **estimación directa simplificada** y no marca la reducción incompatible por autónomo dependiente/cliente único. Si el régimen es desconocido, normal, objetivo o atribución de rentas, el cálculo no aplica el porcentaje.
- En régimen común se usa el 5 % con límite anual de 2.000 €. En Ceuta durante 2026, la AEAT publica el 10 % con el mismo límite. Las reglas especiales deben revisarse por territorio y ejercicio.
- La exoneración del modelo 130 del artículo 109 RIRPF se limita a actividad profesional y al umbral del 70 % de ingresos sujetos a retención: año natural anterior; si se inicia actividad, período trimestral correspondiente. No se extrapola a actividad empresarial.
- Los plazos trimestrales se desplazan por fines de semana y por los festivos que el usuario haya introducido. La aplicación no incluye una base completa y mantenida de festivos nacionales, autonómicos y locales.

## Fuentes oficiales para revisión

- [AEAT: instrucciones del modelo 130](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html)
- [AEAT: estimación directa simplificada](https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-individuales-profesionales/regimenes-determinar-rendimiento-actividad/estimacion-directa-simplificada.html)
- [AEAT: calendario 2026 y vencimientos en días inhábiles](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/recuerde/vencimientos-dias-inhabiles-sabados-festivos.html)
- [BOE](https://www.boe.es/)
- [Seguridad Social - Import@ss](https://portal.seg-social.gob.es/)

> Mi Cartera ofrece estimaciones y no sustituye la revisión de un asesor ni la comprobación del calendario y de las obligaciones particulares en la sede de la AEAT.
