"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearLog, getLogEntries, subscribeLog, type LogLevel } from "@/lib/log";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-zinc-300",
  warn: "text-amber-300",
  error: "text-red-400",
};

const LEVEL_TAG: Record<LogLevel, string> = { info: "INF", warn: "AVI", error: "ERR" };

function time(d: Date): string {
  return d.toLocaleTimeString("es-ES", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

export function LogConsole() {
  const entries = useSyncExternalStore(subscribeLog, getLogEntries, getLogEntries);
  const box = useRef<HTMLDivElement>(null);
  const errors = entries.filter((e) => e.level === "error").length;

  // Se pega al final mientras el usuario no haya subido a leer entradas anteriores.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const copy = () => {
    const text = entries
      .map((e) => `${time(e.time)} ${LEVEL_TAG[e.level]} ${e.message}`)
      .join("\n");
    void navigator.clipboard?.writeText(text);
  };

  return (
    <section className="overflow-hidden rounded-lg border bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="font-mono text-xs text-zinc-400">
          log · {entries.length} entradas
          {errors > 0 && <span className="text-red-400"> · {errors} errores</span>}
        </span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={copy} aria-label="Copiar log">
            <Copy />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={clearLog} aria-label="Borrar log">
            <Trash2 />
          </Button>
        </div>
      </div>
      <div ref={box} className="h-48 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {entries.length === 0 ? (
          <p className="text-zinc-600">Sin entradas.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className={cn("break-words", LEVEL_CLASS[e.level])}>
              <span className="text-zinc-600">{time(e.time)}</span> {LEVEL_TAG[e.level]} {e.message}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
