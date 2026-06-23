"use client";
/**
 * symbolNames.ts — Sembol -> {ad, sektör} eşlemesi (paylaşılan, tek sefer çekilir)
 * Tablolarda/listelerde hisse kodunun altına şirket adını ve sektörünü yazmak için.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";

type Info = { name: string; sector: string };

let _cache: Record<string, Info> | null = null;
let _promise: Promise<Record<string, Info>> | null = null;

function loadInfo(): Promise<Record<string, Info>> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = api
      .get("/market/symbols")
      .then((r) => {
        const m: Record<string, Info> = {};
        (r.data?.symbols || []).forEach((s: any) => {
          if (s && s.symbol) {
            m[String(s.symbol).toUpperCase()] = {
              name: s.name || "",
              sector: s.sector || "",
            };
          }
        });
        _cache = m;
        return m;
      })
      .catch(() => ({} as Record<string, Info>));
  }
  return _promise;
}

/**
 * Hook: { nameOf, sectorOf, infoOf }.
 * nameOf(ticker) kod ile aynıysa "" döner (tekrar göstermemek için).
 */
export function useSymbolNames() {
  const [map, setMap] = useState<Record<string, Info>>(_cache || {});
  useEffect(() => {
    if (!_cache) loadInfo().then(setMap);
  }, []);

  const nameOf = (ticker: string): string => {
    const t = String(ticker || "").toUpperCase();
    const n = map[t]?.name;
    return n && n.toUpperCase() !== t ? n : "";
  };
  const sectorOf = (ticker: string): string => {
    const t = String(ticker || "").toUpperCase();
    return map[t]?.sector || "";
  };
  // Geriye uyumluluk: doğrudan fonksiyon gibi de çağrılabilsin diye nameOf'a ek alanlar bağlanır.
  return Object.assign(nameOf, { nameOf, sectorOf });
}
