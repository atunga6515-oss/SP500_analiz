"""
takas_engine.py — GERİYE UYUMLULUK KATMANI
==========================================
BIST versiyonunda bu dosya İş Yatırım'dan yabancı takas oranını scrape ediyordu.
S&P 500 versiyonunda yerini ownership_engine.py (yfinance kurumsal sahiplik) aldı.

Bu dosya, mevcut tüm import'ların (signals_engine, screener, top_picks, api/*)
hiç değişmeden çalışmaya devam etmesi için ince bir yönlendirme katmanıdır.
Yeni kod doğrudan ownership_engine kullanmalıdır.
"""

from ownership_engine import (  # noqa: F401
    get_ownership_data,
    get_takas_data,
    update_all_takas,
    fetch_all_takas_from_isyatirim,
)

__all__ = [
    "get_ownership_data",
    "get_takas_data",
    "update_all_takas",
    "fetch_all_takas_from_isyatirim",
]
