# Mi Cartera

**Gestoría privada para autónomos y particulares en España.** Facturas con IVA e IRPF, modelos 303 y 130, cuota de autónomos y tus finanzas personales en una sola app **100 % local**: sin cuentas, sin anuncios, sin nube y sin dependencias externas (solo Node.js).

## Para quién es

Al abrirla por primera vez, un asistente de 4 pasos te pregunta cómo la vas a usar y solo muestra lo que necesitas:

- **Autónomo**: facturas, clientes, gastos del negocio, impuestos trimestrales y cuota de autónomos. Las secciones personales se pueden activar después.
- **Particular**: cuentas, movimientos, presupuestos, objetivos, inversiones y préstamos, sin nada fiscal.
- **Las dos cosas**: todo, separado en grupos «Negocio» y «Personal» en el menú.

Puedes empezar vacío o con datos de ejemplo, y cambiar el perfil o activar/desactivar secciones en **Ajustes → Perfil y secciones**.

## Para autónomos

- **Facturas**: numeración correlativa por serie y año (F2026-0001…), con fechas que no pueden ir hacia atrás. Varias líneas por factura con IVA al 21, 10, 4 o 0 %, retención de IRPF (15 %, 7 % para nuevos autónomos, 19 % o sin retención), recargo de equivalencia y operaciones exentas, intracomunitarias, con inversión del sujeto pasivo o exportaciones (con su mención legal). Totales en vivo, borradores, vista previa y **PDF** desde el navegador. Una factura emitida no se borra: se **rectifica** (factura rectificativa en serie R). Al marcarla **cobrada** se apunta sola como ingreso en tu cuenta.
- **Clientes**: datos fiscales con **validación de NIF, NIE y CIF** al escribir. Se copian en cada factura para que no cambien si editas el cliente.
- **Gastos del negocio**: facturas recibidas con base, IVA deducible y porcentaje de afectación (por ejemplo, 50 % del móvil). Cada gasto genera su movimiento y se mantiene sincronizado.
- **Impuestos**: **modelo 303** (IVA) y **modelo 130** (pago fraccionado del IRPF) de cada trimestre con las casillas que tienes que copiar en la sede de la Agencia Tributaria, cuánto apartar para Hacienda, calendario de plazos con aviso de los días que quedan y nota sobre Verifactu.
- **Cuota de autónomos**: calcula tu tramo de 2026 según tus rendimientos previstos, la cuota mínima, si te conviene cambiar de base, la tarifa plana (y su prórroga) y una estimación de la regularización del año siguiente.

## Para tus finanzas personales

- **Resumen**: patrimonio neto, ingresos, gastos, ahorro y tasa de ahorro del mes, gráfico de los últimos 6 meses, reparto de gastos por categoría, últimos movimientos, presupuestos, próximos cobros y pagos (30 días) y objetivos de ahorro.
- **Movimientos**: ingresos, gastos y transferencias entre cuentas, con categorías, notas, búsqueda y filtros por tipo, categoría, cuenta y mes. Puedes **duplicar** un movimiento o marcar **Repetir automáticamente** para convertirlo en recurrente.
- **Recurrentes**: nómina, alquiler, suscripciones, seguros o traspasos con frecuencia semanal, mensual, trimestral o anual. Se apuntan solos cuando llega la fecha (al abrir la app y cada hora mientras el servidor está en marcha). Puedes pausarlos, ponerles fecha de fin o **saltar el próximo**.
- **Objetivos**: metas de ahorro con cantidad, fecha límite, color e icono. El progreso puede ir por aportaciones manuales o seguir el saldo de una cuenta. Calcula cuánto necesitas apartar al mes.
- **Inversiones**: acciones, ETF, fondos indexados, cripto y depósitos. Las que cotizan se buscan por nombre, ticker o ISIN y se valoran con el **precio real del mercado** (variación del día y gráfico de 3 meses). Cada compra o venta se comprueba con el precio de ese día y se indica si compraste tras una subida o una caída. Se calculan unidades, precio medio, valor actual, ganancia latente y ganancia realizada.
- **Préstamos e hipotecas**: capital, TIN, plazo y fecha de la primera cuota. Calcula la cuota (sistema francés), el capital pendiente, los intereses pagados y por pagar, la fecha de fin y el cuadro de amortización (por años o meses, exportable a CSV). Simulador de **amortización anticipada** (reducir plazo o reducir cuota) con el ahorro en intereses. La cuota puede apuntarse sola en Recurrentes y la deuda se resta del patrimonio neto.
- **Cuentas**: saldo calculado automáticamente (saldo inicial + ingresos − gastos ± transferencias).
- **Presupuestos**: límite mensual por categoría con progreso y disponible.
- **Informes**: resumen anual con comparación frente al año anterior, ingresos y gastos de los 12 meses, evolución del patrimonio, tabla mensual, gastos por categoría, fuentes de ingreso y exportación a CSV.
- **Ajustes**: tema claro/oscuro/automático, moneda, PIN opcional, categorías propias, copias JSON/CSV, importación, datos de ejemplo, **copias automáticas restaurables**, **abrir en el móvil con código QR**, **sincronización cifrada** entre dispositivos y **cotizaciones automáticas** (opcionales).

En el móvil, la barra inferior tiene **Más** para llegar a Cuentas, Presupuestos, Recurrentes, Objetivos, Préstamos, Informes y Ajustes.

## Arrancar

Requisito: [Node.js](https://nodejs.org) 20 o superior (probado con Node 24).

- **Windows**: doble clic en `iniciar.bat`.
- O desde una terminal, en esta carpeta:

```bash
node server.js
```

Se abre el navegador en `http://localhost:4321`. Si ya tenías Mi Cartera abierta, simplemente te la vuelve a abrir; si otro programa usa ese puerto, prueba sola con el 4322, 4323… Para detenerlo, `Ctrl+C` o cierra la ventana.

> No hace falta `npm install`. La app no usa paquetes externos.

## Versión web (GitHub Pages)

Puedes abrirla como página web en **https://atlasdesignstudios.github.io/mi-cartera/**.

- No necesita servidor: la misma lógica de `server.js` se ejecuta dentro del navegador y los datos se guardan en su `localStorage`. **No se envían a ningún sitio**, ni siquiera a GitHub.
- Cada navegador y dispositivo tiene sus propios datos. La primera visita abre el asistente de inicio, donde eliges empezar vacío o con datos de ejemplo.
- El PIN de la versión web solo bloquea la interfaz: **no cifra** los datos de `localStorage`. Cualquier persona con acceso al perfil del navegador o a sus herramientas de desarrollo puede acceder a ellos. Protege el dispositivo con la seguridad del sistema operativo y exporta copias periódicas. La versión web todavía no tiene cuentas ni sincronización cloud.
- Si borras los datos del navegador, se pierden: usa **Exportar** a menudo. Las copias son compatibles con la versión local (puedes pasar datos de una a otra con Exportar/Importar).
- Se publica sola con cada `push` a `main` (`.github/workflows/pages.yml`). Para generarla a mano: `node scripts/build-web.js` (crea `dist/`).

## Desarrollo y pruebas

Requisitos: Node.js 20 o superior.

- Ejecutar las pruebas automatizadas: `npm test`.
- Generar la versión web localmente: `npm run build:web` (crea `dist/`).
- Comprobar la sintaxis de los módulos principales: `node --check server.js`, `node --check public/app.js` y `node --check dist/local-api.js`.

GitHub Actions ejecuta las pruebas, genera la versión web y comprueba la sintaxis antes de publicar. Las solicitudes de cambio hacia `main` ejecutan las mismas comprobaciones sin desplegar la web.

## Usarla desde el móvil

1. Arranca el servidor en el ordenador.
2. Conecta el móvil a **la misma Wi-Fi**.
3. En el ordenador, ve a **Ajustes → Tus dispositivos → Abrir en el móvil** y escanea el código QR con la cámara (o escribe la dirección que aparece en la consola, por ejemplo `http://192.168.1.50:4321`).
4. Añádela a la pantalla de inicio del navegador para tenerla a mano.

Si el móvil no carga, haz doble clic en **`permitir-movil.bat`**: pide permiso de administrador y abre el puerto solo en **redes privadas**. Tu Wi-Fi debe estar marcada como red privada en Windows. El ordenador debe estar encendido y con el servidor en marcha para que el móvil pueda entrar.

> En una IP local por HTTP el móvil no puede instalar la app como PWA con caché offline (los service workers requieren HTTPS o localhost). La app funciona igualmente en el navegador. Si quieres instalarla como app, puedes servirla con HTTPS en tu red mediante un proxy inverso.

## Tus datos

- Se guardan en `data/db.json` (texto legible).
- Cada día se crea una copia en `data/backups/db-AAAA-MM-DD.json` y se conservan los últimos 14 días. Además se guarda una copia antes de importar, sincronizar, cargar la demo, borrar todo o restaurar.
- **Ajustes → Datos → Copias automáticas** muestra todas las copias y las restaura con un clic (la versión web guarda las suyas en el navegador).
- **Exportar copia** (Ajustes → Datos) descarga un JSON con todo. **Importar** lo restaura.
- Para una copia manual, cierra la app y copia la carpeta `data/`.
- El navegador guarda además una copia de solo lectura para poder mostrar algo si el servidor no responde.

La app no envía datos a ninguna nube propia ni usa analítica, CDN o fuentes externas. La función de **Precios automáticos** (activada por defecto) consulta el símbolo de tus inversiones y la fecha en Yahoo Finance, Coinbase, Finnhub (si has puesto tu clave) y el Banco Central Europeo; nunca envía importes ni datos personales. Puedes desactivar la actualización automática en **Ajustes → Cotizaciones**; las búsquedas y actualizaciones manuales puntuales seguirán consultando esas fuentes.

### Sincronización cifrada

**Ajustes → Tus dispositivos → Sincronización cifrada** crea un archivo `.mcsync` con todos tus datos cifrados con AES-256-GCM (clave derivada de tu contraseña con PBKDF2-SHA256, 310 000 iteraciones). Llévalo como quieras (pendrive, nube, correo) y ábrelo en el otro dispositivo:

- **Combinar**: une los datos. Si algo se cambió en los dos sitios gana el cambio más reciente, lo que borraste se queda borrado y los recurrentes no se duplican.
- **Reemplazar todo**: para cambiar de ordenador.

### Precios de mercado

- Acciones, ETF, fondos indexados y cripto se buscan en el mercado al crearlas (por nombre, ticker como `IWDA.AS` o `AAPL`, o ISIN como `IE00B03HD191`). El valor de la cartera sale siempre del precio real, no de lo que escribas. Los depósitos y «Otro» siguen siendo manuales.
- **Precios en directo** con la app abierta, en la versión local y en la web. Cada tipo de activo usa la fuente más fiable que se puede consultar gratis:
  - **Cripto**: [Coinbase Exchange](https://docs.cdp.coinbase.com/exchange/websocket-feed/overview), canal público en tiempo real, sin clave. También da el histórico diario para comprobar cada compra.
  - **Acciones y ETF de EE. UU.**: [Finnhub](https://finnhub.io/pricing), operaciones en tiempo real. Necesita una clave gratuita ([registro](https://finnhub.io/register)) que se pega en **Ajustes → Cotizaciones**. Sin clave se usa Yahoo.
  - **Cambio de divisas**: tipos de referencia oficiales del [Banco Central Europeo](https://data.ecb.europa.eu/).
  - **ETF europeos y fondos indexados**: Yahoo Finance como respaldo, porque ninguna fuente oficial ofrece gratis estas bolsas en directo ni el valor de los fondos. Los fondos publican un valor liquidativo al día y se actualizan cada 15 minutos.
  - Cada inversión indica de qué fuente viene su precio. Fuera del horario de bolsa se mantiene el último cierre. Se puede desactivar en Ajustes.
- **Compras y ventas comprobadas**: al elegir la fecha se consulta el cierre de ese día y se usa como precio. Si tu bróker te dio otro precio, marca «precio de ejecución»: se acepta si cabe en el rango de ese día (mínimo y máximo, con un margen del 1,5 %). Si no, no se guarda.
- **Contexto de cada compra**: variación de ese día y del mes anterior («compraste tras una caída del 8 %…») y cuánto ha cambiado el precio desde entonces.
- Las operaciones de versiones anteriores se contrastan solas y, si su precio no encaja con el mercado, se marcan con un aviso y un botón para corregirlo.
- Sin conexión con el mercado puedes guardar el precio de tu bróker: queda como «pendiente de comprobar» y se contrasta en la siguiente actualización.
- Solo se envía el símbolo y la fecha, nunca importes ni datos personales. Es información orientativa, no asesoramiento financiero.

**En la versión web** Coinbase, Finnhub y el BCE se consultan directamente desde el navegador. Solo las consultas a Yahoo (histórico de acciones, bolsas europeas y fondos) pasan por intermediario, porque Yahoo no permite esas consultas desde el navegador: pasan por un intermediario público (allorigins o codetabs). Si fallan a menudo, crea el tuyo gratis en Cloudflare Workers con `tools/cloudflare-worker.js` y pega su dirección en **Ajustes → Cotizaciones → Intermediario propio**. La versión local consulta Yahoo directamente.

## PIN y seguridad

- Puedes activar un PIN de 4 a 8 dígitos en **Ajustes → Seguridad**. Se guarda con `scrypt` y sal aleatoria en `data/db.json`; la sesión se recuerda 30 días por dispositivo.
- Está pensado para una **red doméstica de confianza**. No hay HTTPS: no expongas el puerto a Internet ni lo abras en el router. Si solo lo vas a usar en el ordenador, arranca con `MC_HOST=127.0.0.1` (PowerShell: `$env:MC_HOST="127.0.0.1"; npm start`).
- La API solo acepta peticiones cuyo `Host` y `Origin` coinciden con la máquina o su red local, y exige `Content-Type: application/json` en las peticiones con cuerpo. Eso bloquea el *DNS rebinding* y los envíos de formularios desde otras webs (CSRF).
- Si entras por un nombre de host que no es el de la máquina ni una de sus IPs (por ejemplo, un dominio propio o Tailscale con DNS), añádelo a la variable de entorno `MC_ALLOWED_HOSTS` separado por comas.
- Si olvidas el PIN: cierra la app, edita `data/db.json` y pon `"pinHash": null`, o restaura una copia anterior.

## Cómo se calcula

- **Saldo de una cuenta** = saldo inicial + ingresos − gastos + transferencias recibidas − transferencias enviadas − compras de inversión cargadas en ella (unidades × precio + comisiones) + ventas abonadas (unidades × precio − comisiones).
- **Patrimonio neto** = suma de saldos de cuentas + valor actual de las inversiones − capital pendiente de los préstamos.
- **Préstamos**: sistema francés (cuota constante). Interés del mes = pendiente × TIN / 12. Una amortización anticipada en «reducir plazo» mantiene la cuota y acorta el préstamo; en «reducir cuota» mantiene el plazo y recalcula la cuota.
- **Precio medio** por coste medio ponderado. Las ventas reducen el coste a precio medio y generan ganancia realizada.
- **Valor de la cartera** = unidades × precio actual. Los precios se actualizan a mano (botón de refresco en cada inversión) o automáticamente si lo activas.
- Los **presupuestos** son mensuales y se repiten cada mes; 0 significa sin límite.
- **Transferencias** no cuentan como ingreso ni gasto.
- **Recurrentes**: si el día elegido no existe en un mes (p. ej. día 31), se usa el último día de ese mes. Al reactivar una regla pausada no se rellenan los meses atrasados.
- **Objetivos** vinculados a una cuenta usan su saldo actual; los manuales, la suma de aportaciones y retiradas.
- **Patrimonio en Informes**: los meses cerrados valoran las inversiones a precio de coste; el mes actual, a valor de mercado.

La moneda solo cambia el símbolo de visualización: no convierte importes históricos.

## Cálculos fiscales

Están en `public/fiscal.js`, sin dependencias, y sirven para **estimación directa simplificada en territorio común** (no País Vasco, Navarra, Canarias, Ceuta ni Melilla). Son orientativos: compruébalos antes de presentar y, si tienes dudas, consulta con un asesor.

- **Factura**: base = Σ (unidades × precio × (1 − descuento)); IVA por tipo; IRPF = base × retención; total = base + IVA + recargo − IRPF. En exentas, intracomunitarias, inversión del sujeto pasivo y exportaciones no se repercute IVA.
- **Modelo 303**: IVA repercutido de las facturas emitidas del trimestre − IVA soportado deducible de los gastos (× afectación). Si sale negativo, se compensa en trimestres siguientes (o se pide devolución en el 4T).
- **Modelo 130**: acumulado del 1 de enero al final del trimestre. Rendimiento = ingresos − gastos deducibles − gastos de difícil justificación solo cuando el perfil fiscal confirma estimación directa simplificada, no se aplica la reducción incompatible y corresponde el territorio (5 % general; 10 % Ceuta en 2026; máximo 2.000 €). Si el régimen figura como desconocido, no se aplica automáticamente. Se paga el 20 % menos los pagos de trimestres anteriores y las retenciones soportadas. La exoneración del modelo 130 se evalúa solo para actividad profesional: al menos el 70 % de los ingresos del año anterior tuvo retención; si la actividad se inició durante el año, se evalúa el período trimestral correspondiente.
- **Plazos**: 1-20 de abril, julio y octubre, y 1-30 de enero para el 4T. Si domicilias el pago, el plazo acaba 5 días antes.
- **Cuota de autónomos**: rendimiento computable = (ingresos − gastos deducibles) × 0,93 (7 % de gastos genéricos) / 12. Con él se busca el tramo de la tabla de 2026 y se aplica el 31,5 % a la base mínima. La tarifa plana es de 80 € al mes (88,64 € con el MEI) durante 12 meses, prorrogables otros 12 si los rendimientos no superan el SMI anual.
- **Cuota estimada**: si no has apuntado el recibo de la Seguridad Social de un mes, la app lo estima con tu cuota mensual, pero solo para los meses de actividad (entre la fecha de alta y la de baja) y solo si ese mes no tiene ya un gasto de tipo `reta`. Así no se duplica la cuota ni se inventan meses anteriores al alta.

Las tablas de cotización son las de la Orden PJC/297/2026 (BOE-A-2026-7296), verificadas contra el texto oficial. Para actualizarlas, sigue `docs/ACTUALIZACION-NORMATIVA-FISCAL.md`; las reglas y tablas deben revisarse y versionarse por ejercicio, no sobrescribirse sin pruebas.

> **Verifactu (SIF) y factura electrónica B2B son obligaciones distintas.** El RD 1007/2023, modificado por el Real Decreto-ley 15/2025, fija el 1 de enero de 2027 para sociedades del Impuesto sobre Sociedades y el 1 de julio de 2027 para autónomos e IRPF. En octubre de 2026 Hacienda anunció su intención de ampliar el plazo, pero **mientras no se publique en el BOE sigue vigente el calendario anterior**. La factura electrónica B2B (RD 238/2026 y Orden HAC/1028/2026) será exigible el 6 de octubre de 2027 para grandes empresas y el 6 de octubre de 2028 para el resto. Mi Cartera **no es un sistema Verifactu certificado ni emite facturas electrónicas B2B**: solo cumple el contenido del Reglamento de facturación (RD 1619/2012) y conserva la numeración y la inmutabilidad de las facturas emitidas.

## Estructura

```
server.js              servidor HTTP + API + persistencia (sin dependencias)
public/index.html      interfaz
public/styles.css      estilos (claro/oscuro, móvil)
public/app.js          lógica y vistas
public/fiscal.js       IVA, IRPF, NIF, modelos 303/130 y cuota de autónomos
public/glyphs.js       iconos de línea (categorías y objetivos)
tools/cloudflare-worker.js intermediario propio para las cotizaciones de la versión web
public/sw.js           caché offline del shell
public/vendor/qrcode.js generador de QR (MIT, Kazuhiko Arase), incluido en local
permitir-movil.bat     abre el puerto en el cortafuegos de Windows (redes privadas)
public/icons/          iconos
scripts/make-icons.js  regenera los PNG (opcional)
scripts/build-web.js   genera la versión web estática en dist/
.github/workflows/     publicación automática en GitHub Pages
data/db.json           tus datos (se crea al arrancar)
data/backups/          copias diarias
```

## Problemas frecuentes

Los que antes había que resolver a mano ya los resuelve la app:

- **El puerto 4321 está ocupado**: si es otra Mi Cartera, la app te la abre; si es otro programa, usa sola el siguiente puerto libre (4322, 4323…). Para fijar uno: `set PORT=4400 && node server.js`.
- **El móvil no entra**: **Ajustes → Abrir en el móvil** muestra la dirección correcta con código QR y los pasos. En Windows, ejecuta una vez `permitir-movil.bat` y marca tu Wi-Fi como red privada.
- **El navegador muestra datos antiguos**: el service worker ya no reutiliza archivos guardados por el navegador, la app detecta si el servidor tiene una versión más nueva y se recarga sola, y los datos se refrescan al volver a la pestaña. Si aun así ves algo raro: **Ajustes → Forzar actualización**.
- **Restaurar una copia**: **Ajustes → Datos → Copias automáticas → Restaurar**. Antes se guarda una copia de lo que tienes ahora, así que se puede deshacer.
- **Cambiar de ordenador**: **Ajustes → Sincronización cifrada → Crear** en el antiguo y **Abrir → Reemplazar todo** en el nuevo (o copia la carpeta `data/`).

## Novedades de la 1.7.2

- **Tema oscuro más profundo y microinteracciones**: transiciones suaves en botones, tarjetas y listas, con respeto a «reducir movimiento» del sistema.
- **Auditoría técnica**: pruebas automáticas (`npm test`) y comprobación de sintaxis antes de publicar la versión web, y límite de memoria para las sesiones y los intentos fallidos de PIN.

## Novedades de la 1.7.1

- Si el servicio de cotizaciones no responde al crear una inversión, ya no se bloquea: se crea igualmente, se valora a lo que pagaste y el precio se carga solo (se reintenta cada minuto). El formulario muestra un botón «Reintentar».
- La versión web reintenta los intermediarios públicos antes de rendirse y, si fallan, usa el último precio bueno.

## Novedades de la 1.7

- **Fuentes oficiales y más estables**: cripto en directo desde Coinbase, acciones de EE. UU. en directo desde Finnhub (clave gratuita) y cambio de divisas del Banco Central Europeo. Yahoo queda solo como respaldo para bolsas europeas y fondos.
- Cada inversión muestra la fuente de su precio («En directo · Coinbase»).

## Novedades de la 1.6

- **Precios en directo** sin intermediarios ni coste, en la versión local y en la web: la cartera se revaloriza en cuanto se mueve el mercado.

## Novedades de la 1.5

- Inversiones con **precio real del mercado**: búsqueda por nombre, ticker o ISIN, variación del día, gráfico y actualización automática.
- Cada compra o venta se **comprueba con el precio de ese día**; ya no se puede apuntar un precio imposible. Muestra si compraste tras una subida o una caída y cómo ha ido desde entonces.
- Fuera los emojis: categorías, objetivos y avisos usan **iconos de línea** coherentes con el resto de la app. Los datos existentes se convierten solos.

## Novedades de la 1.4

- Nuevo enfoque: gestoría privada para autónomos y particulares en España.
- Asistente de inicio y perfiles: la app solo muestra lo que usas.
- Facturas, clientes, gastos del negocio, impuestos (303 y 130) y cuota de autónomos.
- Menú lateral agrupado en «Negocio» y «Personal» y resumen adaptado a cada perfil.

## Novedades de la 1.3

Hechas las ideas que quedaban pendientes: **préstamos e hipotecas**, **actualización de precios desde APIs** y **sincronización cifrada entre dispositivos**, además de copias restaurables desde la app y acceso al móvil con QR.
