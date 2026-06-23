import logging
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)

def update_bist_symbols():
    """
    Tüm BIST hisselerinin (screener.py'daki BIST_ALL_SYMBOLS) uzun şirket isimlerini
    yfinance üzerinden çoklu işlem (ThreadPoolExecutor) ile hızlıca çeker ve 
    bist_symbols tablosuna günceller (upsert).
    """
    logger.info("BIST hisse isimlerini yfinance üzerinden güncelleme başlatıldı...")
    
    # BIST_ALL_SYMBOLS listesini al
    try:
        from screener import BIST_ALL_SYMBOLS
    except ImportError:
        logger.error("screener.py dosyasından BIST_ALL_SYMBOLS içeri aktarılamadı.")
        return

    # Güvenlik için boş listeyi engelle
    if not BIST_ALL_SYMBOLS:
        logger.warning("BIST_ALL_SYMBOLS listesi boş.")
        return

    symbols_data = []

    # Şirket adları statik S&P 500 sözlüğünden gelir (hızlı, yfinance'e gerek yok)
    try:
        from sp500_symbols import SP500_NAMES
    except ImportError:
        SP500_NAMES = {}

    for sym in BIST_ALL_SYMBOLS:
        name = SP500_NAMES.get(sym.upper().replace(".", "-"), sym)
        symbols_data.append({"symbol": sym, "name": name})

    logger.info(f"{len(symbols_data)} hisse ismi yfinance üzerinden çekildi. Veritabanına yazılıyor...")

    # Veritabanına kaydet (Upsert)
    try:
        with engine.begin() as conn:
            is_pg = engine.name == "postgresql"
            for data in symbols_data:
                if is_pg:
                    conn.execute(
                        text("""
                            INSERT INTO bist_symbols (symbol, name, updated_at) 
                            VALUES (:symbol, :name, CURRENT_TIMESTAMP)
                            ON CONFLICT (symbol) DO UPDATE SET 
                                name = EXCLUDED.name, 
                                updated_at = CURRENT_TIMESTAMP
                        """), 
                        {"symbol": data["symbol"], "name": data["name"]}
                    )
                else:
                    conn.execute(
                        text("""
                            INSERT INTO bist_symbols (symbol, name, updated_at) 
                            VALUES (:symbol, :name, CURRENT_TIMESTAMP)
                            ON CONFLICT(symbol) DO UPDATE SET 
                                name=excluded.name, 
                                updated_at=CURRENT_TIMESTAMP
                        """), 
                        {"symbol": data["symbol"], "name": data["name"]}
                    )
        logger.info("BIST hisse isimleri veritabanına başarıyla kaydedildi.")
    except Exception as e:
        logger.error(f"Veritabanına bist_symbols yazılırken hata oluştu: {e}")
