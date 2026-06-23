from fastapi import APIRouter, Depends
from pydantic import BaseModel
import yfinance as yf
from api.auth_routes import get_current_user
import pandas as pd

router = APIRouter(prefix="/api/market", tags=["market"])

# S&P 500 GICS sektörleri — her sektörden temsili büyük-cap hisseler (heatmap için)
BIST_SECTORS = {
    "Technology": ["AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "AMD", "ADBE"],
    "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "TMUS", "VZ"],
    "Consumer Discretionary": ["AMZN", "TSLA", "HD", "MCD", "NKE", "LOW"],
    "Consumer Staples": ["WMT", "PG", "KO", "PEP", "COST", "PM"],
    "Financials": ["JPM", "V", "MA", "BAC", "WFC", "GS"],
    "Health Care": ["LLY", "UNH", "JNJ", "ABBV", "MRK", "TMO"],
    "Industrials": ["GE", "CAT", "RTX", "HON", "UNP", "BA"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
    "Utilities": ["NEE", "SO", "DUK", "CEG"],
    "Materials": ["LIN", "SHW", "FCX", "ECL"],
    "Real Estate": ["PLD", "AMT", "EQIX", "WELL"],
}

@router.get("/heatmap")
def fetch_heatmap(current_user: str = Depends(get_current_user)):
    """
    Treemap (Heatmap) için BIST ana hisselerinin anlık performansını ve sektörünü döner.
    """
    from data_loader import get_batch_live_prices
    
    tickers = []
    ticker_to_sector = {}
    for sector, t_list in BIST_SECTORS.items():
        for t in t_list:
            tickers.append(t)
            ticker_to_sector[t] = sector
            
    heatmap_data = []
    
    try:
        ssot_results = get_batch_live_prices(tickers)
        for t in tickers:
            info = ssot_results.get(t, {})
            if info.get("price", 0) > 0:
                heatmap_data.append({
                    "ticker": t,
                    "sector": ticker_to_sector[t],
                    "price": info.get("price", 0),
                    "change": info.get("change", 0),
                    "volume": info.get("volume", 0)
                })
    except Exception as e:
        print("Heatmap fetch error:", e)
        
    return {"data": heatmap_data}

@router.get("/calendar")
def fetch_macro_calendar(current_user: str = Depends(get_current_user)):
    """
    Önemli Makroekonomik takvim verilerini döner (TCMB, FED, Enflasyon).
    Not: Gerçek bir API bağlamadan önce statik bir veri seti ile simüle edilmektedir.
    """
    import datetime
    from dateutil.relativedelta import relativedelta

    now = datetime.datetime.now()

    # ABD makro takvimi: NFP (ayın ilk Cuma'sı), CPI (ayın ortası), FED (≈6 haftada bir)
    events = []

    def _first_friday(d):
        f = d.replace(day=1)
        while f.weekday() != 4:  # 4 = Cuma
            f += datetime.timedelta(days=1)
        return f

    for i in range(3):
        target_month = now + relativedelta(months=i)

        # Tarım Dışı İstihdam (NFP) — ayın ilk Cuma'sı, 08:30 ET
        nfp_date = _first_friday(target_month)
        events.append({
            "id": i*10 + 1,
            "date": nfp_date.strftime("%Y-%m-%d"),
            "time": "08:30",
            "country": "US",
            "event": "Nonfarm Payrolls (NFP)",
            "importance": "High",
            "forecast": "-",
            "previous": "-"
        })

        # TÜFE / CPI — ayın ~13'ü, 08:30 ET
        cpi_date = target_month.replace(day=13)
        if cpi_date.weekday() >= 5:
            cpi_date += datetime.timedelta(days=(7 - cpi_date.weekday()))
        events.append({
            "id": i*10 + 2,
            "date": cpi_date.strftime("%Y-%m-%d"),
            "time": "08:30",
            "country": "US",
            "event": "CPI (YoY)",
            "importance": "High",
            "forecast": "-",
            "previous": "-"
        })

        # FED faiz kararı — yaklaşık 6 haftada bir (her iki ayda bir), ayın ortası 14:00 ET
        if i % 2 == 0:
            fed_date = target_month.replace(day=18)
            if fed_date.weekday() >= 5:
                fed_date -= datetime.timedelta(days=(fed_date.weekday() - 3))
            events.append({
                "id": i*10 + 3,
                "date": fed_date.strftime("%Y-%m-%d"),
                "time": "14:00",
                "country": "US",
                "event": "FOMC Rate Decision",
                "importance": "High",
                "forecast": "-",
                "previous": "-"
            })
            
    # Geçmiş tarihli olanları filtrele (sadece bugün ve sonrasını göster) ve tarihe göre sırala
    today_str = now.strftime("%Y-%m-%d")
    events = [e for e in events if e["date"] >= today_str]
    events = sorted(events, key=lambda x: x["date"])
    
    # En fazla 7 etkinlik göster
    events = events[:7]
    
    return {"data": events}

@router.get("/symbols")
def get_symbols(current_user: str = Depends(get_current_user)):
    """
    Tüm S&P 500 hisselerinin sembollerini ve şirket adlarını döner.
    Statik sp500_symbols listesinden gelir (DB'ye bağımlı değil; isimler hep dolu).
    """
    try:
        from sp500_symbols import get_symbols_with_names
        return {"symbols": get_symbols_with_names()}
    except Exception as e:
        print("Error fetching symbols:", e)
        from sp500_symbols import SP500_ALL
        return {"symbols": [{"symbol": sym, "name": sym} for sym in sorted(SP500_ALL)]}
