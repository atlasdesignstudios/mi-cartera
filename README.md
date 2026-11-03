# Mi Cartera

App de finanzas personales **100 % local** para tu ordenador y tu móvil. Sin cuentas, sin anuncios, sin nube y sin dependencias externas: solo Node.js.

## Qué incluye

- **Resumen**: patrimonio neto, ingresos, gastos, ahorro y tasa de ahorro del mes, gráfico de los últimos 6 meses, reparto de gastos por categoría, últimos movimientos, presupuestos, próximos cobros y pagos (30 días) y objetivos de ahorro.
- **Movimientos**: ingresos, gastos y transferencias entre cuentas, con categorías, notas, búsqueda y filtros por tipo, categoría, cuenta y mes. Puedes **duplicar** un movimiento o marcar **Repetir automáticamente** para convertirlo en recurrente.
- **Recurrentes**: nómina, alquiler, suscripciones, seguros o traspasos con frecuencia semanal, mensual, trimestral o anual. Se apuntan solos cuando llega la fecha (al abrir la app y cada hora mientras el servidor está en marcha). Puedes pausarlos, ponerles fecha de fin o **saltar el próximo**.
- **Objetivos**: metas de ahorro con cantidad, fecha límite, color e icono. El progreso puede ir por aportaciones manuales o seguir el saldo de una cuenta. Calcula cuánto necesitas apartar al mes.
- **Inversiones**: acciones, ETF, fondos, cripto y depósitos. Registra compras y ventas (editables desde el historial), opcionalmente cargadas o abonadas en una cuenta; se calculan unidades, precio medio, valor actual, ganancia latente y ganancia realizada.
- **Cuentas**: saldo calculado automáticamente (saldo inicial + ingresos − gastos ± transferencias).
- **Presupuestos**: límite mensual por categoría con progreso y disponible.
- **Informes**: resumen anual con comparación frente al año anterior, ingresos y gastos de los 12 meses, evolución del patrimonio, tabla mensual, gastos por categoría, fuentes de ingreso y exportación a CSV.
- **Ajustes**: tema claro/oscuro/automático, moneda, PIN opcional, categorías propias, copias JSON/CSV, importación y datos de ejemplo.

En el móvil, la barra inferior tiene **Más** para llegar a Cuentas, Presupuestos, Recurrentes, Objetivos, Informes y Ajustes.

## Arrancar

Requisito: [Node.js](https://nodejs.org) 20 o superior (probado con Node 24).

- **Windows**: doble clic en `iniciar.bat`.
- O desde una terminal, en esta carpeta:

```bash
node server.js
```

Se abre el navegador en `http://localhost:4321`. Para detenerlo, `Ctrl+C` o cierra la ventana.

> No hace falta `npm install`. La app no usa paquetes externos.

## Usarla desde el móvil

1. Arranca el servidor en el ordenador.
2. Conecta el móvil a **la misma Wi-Fi**.
3. Abre la dirección que aparece en la consola, por ejemplo `http://192.168.1.50:4321`.
4. Añádela a la pantalla de inicio del navegador para tenerla a mano.

Si Windows pregunta por el firewall la primera vez, permite el acceso en **redes privadas**. El ordenador debe estar encendido y con el servidor en marcha para que el móvil pueda entrar.

> En una IP local por HTTP el móvil no puede instalar la app como PWA con caché offline (los service workers requieren HTTPS o localhost). La app funciona igualmente en el navegador. Si quieres instalarla como app, puedes servirla con HTTPS en tu red mediante un proxy inverso.

## Tus datos

- Se guardan en `data/db.json` (texto legible).
- Cada día se crea una copia en `data/backups/db-AAAA-MM-DD.json` y se conservan los últimos 14 días.
- **Exportar copia** (Ajustes → Datos) descarga un JSON con todo. **Importar** lo restaura.
- Para una copia manual, cierra la app y copia la carpeta `data/`.
- El navegador guarda además una copia de solo lectura para poder mostrar algo si el servidor no responde.

La app no envía nada a Internet. No hay analítica, ni CDN, ni fuentes externas.

## PIN y seguridad

- Puedes activar un PIN de 4 a 8 dígitos en **Ajustes → Seguridad**. Se guarda con `scrypt` y sal aleatoria en `data/db.json`; la sesión se recuerda 30 días por dispositivo.
- Está pensado para una **red doméstica de confianza**. No hay HTTPS: no expongas el puerto a Internet ni lo abras en el router.
- Si olvidas el PIN: cierra la app, edita `data/db.json` y pon `"pinHash": null`, o restaura una copia anterior.

## Cómo se calcula

- **Saldo de una cuenta** = saldo inicial + ingresos − gastos + transferencias recibidas − transferencias enviadas − compras de inversión cargadas en ella (unidades × precio + comisiones) + ventas abonadas (unidades × precio − comisiones).
- **Patrimonio neto** = suma de saldos de cuentas + valor actual de las inversiones.
- **Precio medio** por coste medio ponderado. Las ventas reducen el coste a precio medio y generan ganancia realizada.
- **Valor de la cartera** = unidades × precio actual. Los precios se actualizan a mano (botón de refresco en cada inversión).
- Los **presupuestos** son mensuales y se repiten cada mes; 0 significa sin límite.
- **Transferencias** no cuentan como ingreso ni gasto.
- **Recurrentes**: si el día elegido no existe en un mes (p. ej. día 31), se usa el último día de ese mes. Al reactivar una regla pausada no se rellenan los meses atrasados.
- **Objetivos** vinculados a una cuenta usan su saldo actual; los manuales, la suma de aportaciones y retiradas.
- **Patrimonio en Informes**: los meses cerrados valoran las inversiones a precio de coste; el mes actual, a valor de mercado.

La moneda solo cambia el símbolo de visualización: no convierte importes históricos.

## Estructura

```
server.js              servidor HTTP + API + persistencia (sin dependencias)
public/index.html      interfaz
public/styles.css      estilos (claro/oscuro, móvil)
public/app.js          lógica y vistas
public/sw.js           caché offline del shell
public/icons/          iconos
scripts/make-icons.js  regenera los PNG (opcional)
data/db.json           tus datos (se crea al arrancar)
data/backups/          copias diarias
```

## Problemas frecuentes

- **El puerto 4321 está ocupado**: cierra la otra instancia o ejecuta `set PORT=4322 && node server.js`.
- **El móvil no entra**: comprueba la Wi-Fi, la IP impresa y el firewall de Windows (red privada).
- **El navegador muestra datos antiguos**: recarga con `Ctrl+F5`; el service worker usa red primero, pero puede tardar un instante.
- **Restaurar una copia**: cierra la app, sustituye `data/db.json` por el contenido de la copia y vuelve a arrancar.
- **Cambiar de ordenador**: copia la carpeta del proyecto (o solo `data/`) y arranca allí.

## Ideas para más adelante

Préstamos e hipotecas, actualización de precios desde APIs y sincronización cifrada entre dispositivos. La base está preparada para crecer sin reescribir nada.
