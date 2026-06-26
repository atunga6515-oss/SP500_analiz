"""
alpaca_client.py — Alpaca Market Data (IEX) ile ANLIK / CANLI fiyat istemcisi
============================================================================
HİBRİT MODEL:
  - Geçmiş OHLCV + HACİM  -> yfinance (hacim doğru kalsın diye)  [data_loader._download_from_yfinance]
  - Anlık / gerçek-zamanlı fiyat -> Alpaca (IEX)                  [bu modül]
  - Alpaca erişilemezse / anahtar yoksa / endeks ise -> yfinance otomatik yedek

Notlar:
  - IEX feed'inde fiyat S&P 500 gibi likit hisselerde konsolide fiyata çok yakındır.
  - Endeksler (^GSPC) Alpaca'da YOKTUR; bu semboller yfinance'e bırakılır.
  - Alpaca sınıf hisselerinde NOKTA kullanır (BRK.B); bizim listede TİRE var (BRK-B) -> çevrilir.

.env:
  DATA_PROVIDER=alpaca            # 'yfinance' yaparsan Alpaca devre dışı kalır
  ALPACA_API_KEY_ID=...
  ALPACA_API_SECRET_KEY=...
  ALPACA_DATA_FEED=iex            # ücretli SIP aboneliği varsa: sip
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

_BASE = "https://data.alpaca.markets/v2/stocks/snapshots"
_TIMEOUT = 8


def _provider() -> str:
    return (os.getenv("DATA_PROVIDER", "alpaca") or "alpaca").strip().lower()


def _keys():
    return os.getenv("ALPACA_API_KEY_ID"), os.getenv("ALPACA_API_SECRET_KEY")


def _feed() -> str:
    return (os.getenv("ALPACA_DATA_FEED", "iex") or "iex").strip().lower()


def is_enabled() -> bool:
    """Alpaca canlı fiyat kullanılabilir mi? (provider=alpaca ve anahtarlar mevcut)"""
    kid, secret = _keys()
    return _provider() == "alpaca" and bool(kid) and bool(secret)


def is_index(symbol: str) -> bool:
    """Endeks/özel sembol mü? (Alpaca bunları sağlamaz -> yfinance)"""
    s = str(symbol).upper()
    return s.startswith("^") or "=" in s


def to_alpaca_symbol(symbol: str) -> str:
    """Bizim format (BRK-B) -> Alpaca format (BRK.B)."""
    return str(symbol).upper().strip().replace("-", ".")


def _headers():
    kid, secret = _keys()
    return {"APCA-API-KEY-ID": kid or "", "APCA-API-SECRET-KEY": secret or ""}


def get_snapshots(symbols: list) -> dict:
    """
    Verilen (endeks olmayan) semboller için Alpaca snapshot'tan
    {orijinal_sembol: {"price": float, "change": float(%), "volume": float}} döndürür.
    Hata olursa boş dict döner (çağıran yfinance'e düşer).
    """
    if not is_enabled() or not symbols:
        return {}

    # Endeksleri ele (Alpaca veremez)
    equities = [s for s in symbols if not is_index(s)]
    if not equities:
        return {}

    # Alpaca formatına çevir; orijinal<->alpaca eşlemesi tut
    to_alp = {s: to_alpaca_symbol(s) for s in equities}
    alp_to_orig = {v: k for k, v in to_alp.items()}

    out = {}
    feed = _feed()
    # 100'erli parçalar halinde sorgula (URL/limit güvenliği)
    alp_syms = list(alp_to_orig.keys())
    for i in range(0, len(alp_syms), 100):
        chunk = alp_syms[i:i + 100]
        try:
            resp = requests.get(
                _BASE,
                params={"symbols": ",".join(chunk), "feed": feed},
                headers=_headers(),
                timeout=_TIMEOUT,
            )
            if resp.status_code != 200:
                logger.warning(f"[ALPACA] snapshot HTTP {resp.status_code}: {resp.text[:160]}")
                continue
            data = resp.json() or {}
            # Cevap ya doğrudan {SYM: {...}} ya da {"snapshots": {SYM: {...}}}
            snaps = data.get("snapshots", data)
            for alp_sym, snap in snaps.items():
                if not isinstance(snap, dict):
                    continue
                orig = alp_to_orig.get(alp_sym, alp_sym)
                latest = (snap.get("latestTrade") or {}).get("p")
                daily = snap.get("dailyBar") or {}
                prev = snap.get("prevDailyBar") or {}
                price = latest if latest else daily.get("c")
                prev_close = prev.get("c") or daily.get("o")
                volume = daily.get("v") or 0.0
                if not price:
                    continue
                change = 0.0
                if prev_close:
                    try:
                        change = ((float(price) - float(prev_close)) / float(prev_close)) * 100.0
                    except (ZeroDivisionError, ValueError, TypeError):
                        change = 0.0
                out[orig] = {
                    "price": round(float(price), 2),
                    "change": round(change, 2),
                    "volume": float(volume),
                }
        except Exception as e:
            logger.warning(f"[ALPACA] snapshot isteği başarısız: {e}")
            continue
    return out


def get_latest_price(symbol: str) -> float:
    """Tek sembol için anlık fiyat (Alpaca). Bulunamazsa 0.0."""
    if is_index(symbol):
        return 0.0
    snaps = get_snapshots([symbol])
    info = snaps.get(symbol)
    return float(info["price"]) if info and info.get("price") else 0.0
