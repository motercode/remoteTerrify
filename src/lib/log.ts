/** Log en memoria que se muestra en la consola de la parte inferior del panel. */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  time: Date;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 300;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function log(level: LogLevel, message: string): void {
  entries = [...entries, { id: nextId++, time: new Date(), level, message }].slice(-MAX_ENTRIES);
  emit();
}

export function clearLog(): void {
  entries = [];
  emit();
}

export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLogEntries(): LogEntry[] {
  return entries;
}

/** Texto legible de cualquier error (DOMException incluye el nombre: NotAllowedError…). */
export function describeError(e: unknown): string {
  if (e instanceof Error) return e.name && e.name !== "Error" ? `${e.name}: ${e.message}` : e.message;
  return String(e);
}

let globalHandlersInstalled = false;

/** Captura errores no controlados de la página para que también aparezcan en el log. */
export function installGlobalLogHandlers(): void {
  if (globalHandlersInstalled || typeof window === "undefined") return;
  globalHandlersInstalled = true;
  window.addEventListener("error", (e) => log("error", `Error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) =>
    log("error", `Promesa rechazada: ${describeError(e.reason)}`),
  );
}
