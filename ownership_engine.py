"""
ownership_engine.py
====================
S&P 500 / ABD hisseleri için "sahiplik akışı" motoru.

BIST versiyonundaki takas_engine.py'nin (İş Yatırım'dan yabancı yatırımcı
oranı scraping) yerini alır. ABD'de "yabancı oranı" kavramının doğrudan
muadili olmadığından, en yakın ve daha güçlü sinyal olan KURUMSAL SAHİPLİK
verisi kullanılır (13F dosyalarına dayalı, yfinance üzerinden).

ÖNEMLİ - Geriye uyumluluk:
    Sinyal motoru (signals_engine), screener, top_picks vb. modüller takas
    verisini şu dict arayüzüyle tüketir:
        {'foreign_ratio': float, 'daily_change': float}
    Bu arayüz AYNEN korunur; sadece içerik değişir:
        foreign_ratio -> kurumsal sahiplik yüzdesi (institutionsPercentHeld, %)
        daily_change  -> kurumsal akış: son raporlanan çeyrekteki ortalama
                         pay değişimi (%) (institutional flow proxy)
    Böylece sinyal motoruna hiç dokunmadan geçiş yapılır.

Ek (yeni) anahtarlar da döndürülür (insider_ratio, institutions_count,
institutional_quarterly_change) — eski tüketiciler bunları görmezden gelir.

Not: takas verisi GÜNLÜK iken, kurumsal sahiplik ÇEYREKLİK güncellenir.
Dolayısıyla 'daily_change' artık günlük değil çeyreklik bir akış sinyalidir.
"""

import math
import logging

import yfinance as yf
from cache_utils import ttl_cache

logger = logging.getLogger(__name__)

# Boş / hata durumunda dönecek varsayılan yapı (eski arayüzle uyumlu)
_EMPTY = {
    "foreign_ratio": 0.0,          # kurumsal sahiplik % (eski anahtar, uyumluluk)
    "daily_change": 0.0,           # kurumsal akış % (eski anahtar, uyumluluk)
    "insider_ratio": 0.0,          # içeriden sahiplik %
    "institutions_count": 0,       # kurum sayısı
    "institutional_quarterly_change": 0.0,  # daily_change ile aynı (açık isim)
    "source": "none",
}


def _safe_float(value, default=0.0):
    """yfinance'den gelen değeri güvenli şekilde float'a çevirir."""
    try:
        if value is None:
            return default
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def _normalize_pct(value):
    """
    yfinance bazı alanları kesir (0.62), bazılarını yüzde (62.0) olarak döndürür.
    <= 1.5 ise kesir kabul edip 100 ile çarparak yüzdeye normalize eder.
    """
    f = _safe_float(value)
    if f == 0.0:
        return 0.0
    # 1.5'ten küçük mutlak değerler büyük olasılıkla kesir (örn. 0.62 = %62)
    if abs(f) <= 1.5:
        return f * 100.0
    return f


def _extract_major_holders(tkr) -> dict:
    """
    Ticker.major_holders'tan kurumsal/içeriden sahiplik oranlarını çıkarır.
    yfinance sürümleri arasında format değiştiği için iki şekli de dener:
      - DataFrame, index = ['insidersPercentHeld', 'institutionsPercentHeld',
        'institutionsFloatPercentHeld', 'institutionsCount'], sütun = 'Value'
      - Eski 2 sütunlu ham DataFrame
    """
    out = {
        "institutions_pct": 0.0,
        "insider_pct": 0.0,
        "institutions_count": 0,
    }
    try:
        mh = tkr.major_holders
    except Exception as e:
        logger.debug(f"major_holders alınamadı: {e}")
        return out

    if mh is None:
        return out

    # Yeni format: index'li DataFrame ('Value' sütunu)
    try:
        if hasattr(mh, "index") and "Value" in getattr(mh, "columns", []):
            idx = {str(i): v for i, v in mh["Value"].items()}
            out["institutions_pct"] = _normalize_pct(idx.get("institutionsPercentHeld"))
            out["insider_pct"] = _normalize_pct(idx.get("insidersPercentHeld"))
            out["institutions_count"] = int(_safe_float(idx.get("institutionsCount")))
            return out
    except Exception as e:
        logger.debug(f"major_holders yeni format ayrıştırma hatası: {e}")

    # Eski format: 2 sütunlu ham tablo ("62%", "kurumlar tarafından tutuluyor")
    try:
        for _, row in mh.iterrows():
            cells = [str(c) for c in row.values]
            joined = " ".join(cells).lower()
            pct_val = None
            for c in cells:
                if "%" in c:
                    pct_val = _safe_float(c.replace("%", "").strip())
                    break
            if pct_val is None:
                continue
            if "institution" in joined or "kurum" in joined:
                out["institutions_pct"] = pct_val
            elif "insider" in joined or "içeri" in joined:
                out["insider_pct"] = pct_val
    except Exception as e:
        logger.debug(f"major_holders eski format ayrıştırma hatası: {e}")

    return out


def _extract_institutional_flow(tkr) -> float:
    """
    Ticker.institutional_holders tablosundaki 'pctChange' (bir önceki çeyreğe
    göre pay değişimi) sütununun ortalamasını alarak kurumsal akış (%) üretir.
    Bu, eski 'daily_change' (yabancı takas değişimi) sinyalinin muadilidir.
    """
    try:
        ih = tkr.institutional_holders
    except Exception as e:
        logger.debug(f"institutional_holders alınamadı: {e}")
        return 0.0

    if ih is None or not hasattr(ih, "columns"):
        return 0.0

    # pctChange sütununu büyük/küçük harf duyarsız bul
    col = None
    for c in ih.columns:
        if str(c).lower() in ("pctchange", "pct_change", "% change"):
            col = c
            break
    if col is None:
        return 0.0

    try:
        series = ih[col].dropna()
        if series.empty:
            return 0.0
        avg = float(series.mean())
        return _normalize_pct(avg)
    except Exception as e:
        logger.debug(f"institutional flow hesaplama hatası: {e}")
        return 0.0


@ttl_cache(ttl_seconds=3600 * 6)  # Kurumsal veri çeyreklik; 6 saat cache yeterli
def get_ownership_data(ticker: str) -> dict:
    """
    Verilen sembol için kurumsal sahiplik özetini döndürür.

    Dönüş (eski takas arayüzüyle uyumlu):
        {
          'foreign_ratio': float,   # kurumsal sahiplik %  (eski anahtar)
          'daily_change': float,    # kurumsal akış %      (eski anahtar)
          'insider_ratio': float,
          'institutions_count': int,
          'institutional_quarterly_change': float,
          'source': str,
        }
    """
    if not ticker:
        return dict(_EMPTY)

    # ABD sembolleri ek istemez; yanlışlıkla gelen .IS ekini temizle
    sym = ticker.upper().strip().replace(".IS", "")
    if not sym:
        return dict(_EMPTY)

    try:
        tkr = yf.Ticker(sym)
        holders = _extract_major_holders(tkr)
        flow = _extract_institutional_flow(tkr)

        inst_pct = holders["institutions_pct"]
        # Kurum sayısı 0 ama oran var ise yine de geçerli kabul et
        if inst_pct == 0.0 and holders["insider_pct"] == 0.0 and holders["institutions_count"] == 0:
            # Hiç veri yok
            return dict(_EMPTY)

        return {
            "foreign_ratio": round(inst_pct, 1),          # uyumluluk anahtarı
            "daily_change": round(flow, 2),               # uyumluluk anahtarı
            "insider_ratio": round(holders["insider_pct"], 1),
            "institutions_count": holders["institutions_count"],
            "institutional_quarterly_change": round(flow, 2),
            "source": "yfinance",
        }
    except Exception as e:
        logger.warning(f"[OWNERSHIP] {sym} için sahiplik verisi alınamadı: {e}")
        return dict(_EMPTY)


# ============================================================
# Geriye uyumluluk takma adları (eski takas_engine API'si)
# ============================================================

def get_takas_data(ticker: str) -> dict:
    """ESKİ API. ownership_engine.get_ownership_data'ya yönlendirir."""
    return get_ownership_data(ticker)


def update_all_takas():
    """ESKİ API. Uyumluluk için korunuyor (artık no-op)."""
    return True


def fetch_all_takas_from_isyatirim():
    """ESKİ API. BIST'e özeldi; ABD versiyonunda no-op."""
    return None
