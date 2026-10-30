# remoteTerrify

Webapp local que reproduce un audio cuando el acelerómetro del móvil cumple unas condiciones, y lo para cuando se cumplen otras. Todo corre en el navegador del móvil; el PC solo sirve la página por la WiFi local. El audio sale por la salida activa del móvil (p. ej. un altavoz Bluetooth emparejado).

## Requisitos

- Node.js 22 y npm
- PC y móvil en la misma red WiFi

## Uso desde el móvil

```bash
npm install
npm run dev:phone
```

1. La primera vez se genera un certificado HTTPS local (mkcert); en Windows puede pedir confirmar la instalación de su CA.
2. Averigua la IP del PC (`ipconfig` → "Dirección IPv4", p. ej. `192.168.1.40`).
3. En el móvil abre `https://192.168.1.40:3000`. Aparecerá un aviso de certificado: "Configuración avanzada" → "Continuar".
4. Pestaña **Audio**: sube un MP3/WAV (se guarda en el propio móvil).
5. Pestañas **Inicio** y **Final**: configura las condiciones por eje, el tiempo que deben mantenerse y el delay.
6. Pulsa **ARMAR** (concede el permiso de sensores si lo pide) y deja la app en primer plano.

> **HTTPS es obligatorio**: sin él el navegador no entrega datos del acelerómetro.
> **La pantalla debe seguir encendida**: con la pantalla apagada o la app en segundo plano el sensor se detiene. La app la mantiene encendida mientras está armada (Wake Lock).

Opcional: para quitar el aviso de certificado, instala en el móvil la CA de mkcert (`mkcert -CAROOT` muestra dónde está `rootCA.pem`).

## Cómo funciona

```
DESARMADO → ARMADO → (inicio + mantener) → INICIANDO (delay) → REPRODUCIENDO
          ↑                                                         │
          └──────── PARANDO (delay) ← (final + mantener) ───────────┘
```

- **Condiciones**: por eje X/Y/Z y magnitud total, operador (`>`, `<`, `|valor|>`, `|valor|<`) y umbral en m/s², combinadas con Y/O.
- **Mantener**: la condición debe cumplirse sin interrupción ese tiempo (evita falsos disparos).
- **Delay**: espera entre el disparo y la acción; se puede cancelar desde la pantalla.
- **Fuente**: "sin gravedad" mide solo el movimiento; "con gravedad" permite detectar la orientación (~9,8 m/s² en el eje vertical).
- Sin móvil, la pestaña **Sensor** tiene un simulador para probar las reglas en el PC (`npm run dev` → <http://localhost:3000>).

## Estructura

```text
src/
  lib/motion/       tipos, configuración por defecto y evaluación de condiciones
  lib/engine/       máquina de estados pura (testeada)
  lib/storage/      configuración (localStorage) y audios (IndexedDB)
  hooks/            sensor, audio, wake lock y useEngine que los une
  components/dashboard/  UI del panel
```

## Comandos

```bash
npm run dev        # desarrollo en http://localhost:3000 (PC)
npm run dev:phone  # desarrollo en HTTPS accesible desde la red local (móvil)
npm test           # tests unitarios (vitest)
npm run lint
npm run build
```

## Versión 2 (prevista)

Encender/apagar por voz, siempre en local. La máquina de estados ya acepta disparos `TRIGGER_START` / `TRIGGER_STOP` con origen `voice`, así que bastará con añadir una fuente nueva en `src/lib/triggers/`:

- Palabras clave: [vosk-browser](https://github.com/ccoreilly/vosk-browser) (WASM + modelo español pequeño servido desde `/public`). La Web Speech API no sirve: en Chrome envía el audio a servidores externos.
- Tono de voz: Web Audio API + detección de pitch (autocorrelación/YIN) con rango de Hz configurable.
