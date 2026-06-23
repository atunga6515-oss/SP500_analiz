"use client";
/**
 * symbolNames.ts — Sembol -> Şirket adı eşlemesi (paylaşılan, tek sefer çekilir)
 * Tablolarda hisse kodunun altına şirket adını yazmak için kullanılır.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";

let _cache: Record<string, string> | null = null;
let _promise: Promise<Record<string, string>> | null = null;

function loadNames(): Promise<Record<string, string>> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = api
      .get("/market/symbols")
      .then((r) => {
        const m: Record<string, string> = {};
        (r.data?.symbols || []).forEach((s: any) => {
          if (s && s.symbol) m[String(s.symbol).toUpperCase()] = s.name || "";
        });
        _cache = m;
        return m;
      })
      .catch(() => ({} as Record<string, string>));
  }
  return _promise;
}

/**
 * Hook: nameOf(ticker) -> şirket adı (kod ile aynıysa "" döner, tekrar göstermemek için).
 */
export function useSymbolNames() {
  const [map, setMap] = useState<Record<string, string>>(_cache || {});
  useEffect(() => {
    if (!_cache) loadNames().then(setMap);
  }, []);
  return (ticker: string): string => {
    const t = String(ticker || "").toUpperCase();
    const n = map[t];
    return n && n.toUpperCase() !== t ? n : "";
  };
}
