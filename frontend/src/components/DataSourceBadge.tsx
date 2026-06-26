"use client";
/**
 * DataSourceBadge — Aktif canlı-veri kaynağını gösterir.
 * Alpaca gerçekten çalışıyorsa "🟢 Live: Alpaca (IEX)", aksi halde "🟡 Live: yfinance (fallback)".
 * Backend /api/market/data-source Alpaca'ya gerçek ping atar (60 sn cache).
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function DataSourceBadge({ className = "" }: { className?: string }) {
  const t = useT();
  const [info, setInfo] = useState<any>(null);

  const load = () => {
    api.get("/market/data-source").then((r) => setInfo(r.data)).catch(() => setInfo(null));
  };
  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000); // 1 dk'da bir tazele
    return () => window.clearInterval(id);
  }, []);

  if (!info) {
    return (
      <span className={`text-xs text-[var(--color-b-muted)] ${className}`}>
        {t("ds.checking")}
      </span>
    );
  }

  const alpaca = info.live_source === "alpaca";
  const feed = (info.feed || "iex").toUpperCase();
  return (
    <span
      title={`${t("ds.bars")}: yfinance · ${t("ds.live")}: ${alpaca ? "Alpaca " + feed : "yfinance"}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
        alpaca
          ? "bg-green-900/30 border-green-700/50 text-green-400"
          : "bg-yellow-900/30 border-yellow-700/50 text-yellow-400"
      } ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${alpaca ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}></span>
      {alpaca ? `${t("ds.alpacaActive")} (${feed})` : t("ds.yfFallback")}
    </span>
  );
}
