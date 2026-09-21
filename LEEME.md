# Módulo GPS — Puesta en marcha

Este módulo se entrega como **app independiente** (no depende de ningún framework ni build step) para que funcione ya mismo mientras se resuelve la conexión desde el chat. Son 2 archivos:

- `schema.sql` → tablas para Supabase
- `index.html` → la app completa (Resumen GPS, Vehículos, Histórico, Importar Reporte)

## 1. Crear las tablas en Supabase

1. Entrá a tu proyecto **base_vehiculos** en [supabase.com/dashboard](https://supabase.com/dashboard) con la cuenta `cgfabrica1@gmail.com`.
2. Andá a **SQL Editor** → **New query**.
3. Pegá el contenido completo de `schema.sql` y ejecutá (**Run**).
4. Confirmá que se crearon 3 tablas: `vehiculos`, `gps_reportes`, `gps_importaciones`.

## 2. Abrir la app

1. Abrí `index.html` haciendo doble clic (funciona local, sin servidor) o subilo a cualquier hosting estático.
2. La primera vez te va a pedir:
   - **Project URL**: `https://oixzkvkybqexvrzwzwis.supabase.co`
   - **Anon / public API key**: la encontrás en **Project Settings → API → Project API keys → anon public**.
3. Estos datos quedan guardados en el navegador (no se comparten con nadie más). Para cambiarlos después, usá "Configuración de conexión" en el pie del menú lateral.

## 3. Probar con el archivo de mayo

1. Andá a **Importar Reporte**.
2. Subí `GPS resumen Mayo 2026.xlsx`.
3. Revisá la previsualización: deberías ver ~86 filas, casi todas como "Nuevo" la primera vez.
4. Confirmá la importación.
5. Volvé a subir el mismo archivo: el sistema va a avisar que ya fue procesado (por hash). Si continuás igual, todo debería quedar como "Sin cambios" — sin duplicar nada.

## Novedades (importación tolerante a formato + historial de zona)

Se generalizó el importador a pedido tuyo:

- **Ya no depende del layout exacto del archivo**: detecta los encabezados (Dispositivo, Fecha de inicio, Horas motor, Horas en ralentí, Distancia, Velocidad máxima, Litros YPF) busque en la fila que estén, en cualquier orden, en cualquier hoja del libro. Si no encuentra al menos "Dispositivo" + 1 columna más, avisa en vez de importar cualquier cosa.
- **Tolera que los datos vengan ya numéricos** (Excel exporta a veces "Distancia" como número plano en vez de texto "2501 Km", u "Horas motor" como duración cruda de Excel) o como texto con unidad — ambos casos se detectan y normalizan solos.
- **Soporta archivos que traen varios períodos consolidados a la vez** (por ejemplo un histórico de 16 meses en un solo Excel): si el archivo no trae un período único declarado, cada fila toma su propio período a partir de "Fecha de inicio". La previsualización muestra una columna "Período" cuando el archivo trae más de uno.
- **La condición única sigue siendo dispositivo + período**, tal cual pediste — el detector de duplicados dentro del propio archivo y la comparación contra Supabase ahora trabajan con esa combinación, no solo con el dispositivo.
- **Zona como dato histórico**: se agregaron `zona_periodo` y `modelo_periodo` a `gps_reportes` (ver más abajo). Si un vehículo cambió de zona con el tiempo (ej. pasó de NEA NORTE a REDES), cada reporte mensual conserva la zona que tenía *en ese momento*; `vehiculos.region` siempre se actualiza sola al valor del período más reciente conocido, sin pisar con datos de cargas viejas ni con vacíos.

**Importante**: si ya corriste `schema.sql` antes, volvé a correrlo — ahora incluye los `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para sumar `zona_periodo` y `modelo_periodo` a la tabla `gps_reportes` que ya creaste, sin borrar nada.

## Decisiones de diseño a validar con vos

- **Tabla `vehiculos` reutilizada tal cual existe**: `dominio` (patente, primary key), `region` y `label`. El módulo GPS usa `region` como zona y **asume que `label` es el modelo/nombre visible del vehículo** — si algún otro módulo tuyo ya usa `label` con otro significado, avisame para no pisarlo al crear vehículos nuevos desde la importación.
- **Zona/región**: el campo "Dispositivo" del Excel mezcla patente + modelo + zona en un solo texto libre (ej. `AE689NF IVECO REDES`), sin columnas separadas. La app reconoce la región solo si coincide con una lista de zonas conocidas (arranca con `REDES` y `SALTA`, y se amplía sola cada vez que aparece una zona nueva al cargar un vehículo). Cuando no puede identificarla, el vehículo queda "sin asignar" y se puede completar después desde la vista Vehículos.
- **Valores atípicos**: se marca ⚠️ cuando la distancia de un vehículo supera 5 veces la mediana del archivo cargado (esto detecta el caso SAVEIRO REDES · 386.741 km). No bloquea ni modifica el dato, solo lo señala.
- **RLS de `vehiculos`**: como esa tabla ya existía, el script **no toca sus políticas de seguridad**. Si la app no puede leer o crear filas ahí con la anon key, hay que revisar las políticas existentes en Authentication → Policies → vehiculos.
- **RLS de `gps_reportes` / `gps_importaciones`**: quedaron con una política abierta (para que la app funcione con la sola anon key, sin login propio). Cuando integres esto al proyecto principal con su sistema de usuarios/permisos real, hay que reemplazar esa política.
- **usuario_id** en `gps_importaciones` quedó como texto libre (sin autenticación propia todavía) — para linkearlo a usuarios reales del proyecto principal cuando se integre.

## Integración futura al proyecto principal

Esto se armó independiente porque en este chat no tuve acceso al repo del proyecto existente. Cuando quieras integrarlo:

1. Pasame (o abrime con Claude Code) el repo real.
2. La lógica de parseo/normalización de `index.html` (funciones `parseDispositivo`, `parseDistancia`, `parseHoras`, `detectarPeriodo`, y todo el flujo de `buildPreview`/`ejecutarImportacion`) se puede trasladar tal cual a los componentes/rutas del proyecto, reemplazando el cliente Supabase suelto por el centralizado que ya uses, y los estilos sueltos por los componentes/tema ya existentes.
2. `schema.sql` se aplica igual, esté donde esté alojado el proyecto.
