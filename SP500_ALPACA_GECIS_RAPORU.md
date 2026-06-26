# yfinance → Alpaca Geçiş Fizibilite Raporu

**Tarih:** 23 Haziran 2026
**Soru:** Tüm modüllerde veri kaynağı yfinance'ten Alpaca'ya taşınabilir mi? yfinance yedek kalsın, `.env`'de yorum satırı olarak dursun.

**Kısa cevap:** ✅ **Kısmen ve doğru mimariyle EVET.** Fiyat/mum (OHLCV) ve anlık fiyat verisi Alpaca'ya taşınabilir ve Alpaca burada yfinance'ten **daha güvenilir/gerçek zamanlı**dır. Ancak **temel analiz (F/K, PD/DD, EPS…) ve kurumsal sahiplik verisi Alpaca'da YOKTUR** — bu iki modül yfinance'te kalmak zorunda. Önerilen yol: bir **veri sağlayıcı soyutlama katmanı** ekleyip Alpaca'yı birincil, yfinance'i otomatik yedek yapmak.

---

## 1. Mevcut yfinance kullanımı (modül bazında)

| Modül / dosya | Ne çekiyor | Veri tipi | Alpaca karşılığı |
|---|---|---|---|
| `data_loader.py` (`_download_from_yfinance`, `get_live_price*`, `get_batch_live_prices`) | OHLCV mumlar (1d/1wk/1h/4h/5d/1m) + anlık fiyat + günlük değişim | **Fiyat/Bar + Quote** | ✅ Var (bars + snapshot) |
| `api/robot_engine.py` | 5 dakikalık mumlar (toplu) | **Bar (5Min)** | ✅ Var |
| `api/analysis_routes.py` | 6 aylık günlük mum + `fast_info` (anlık/önceki kapanış) | **Bar + Quote** | ✅ Var |
| `api/top_picks_15d_routes.py` | 6 aylık günlük mum (grafik için) | **Bar** | ✅ Var |
| `fundamental_analyzer.py` | `ticker.info` → F/K, PD/DD, EPS, defter değeri, temettü | **Temel veri** | ❌ **YOK** |
| `ownership_engine.py` | `institutional_holders`, `major_holders` → kurumsal sahiplik | **Sahiplik verisi** | ❌ **YOK** |
| `api/symbol_service.py` | (artık statik `SP500_NAMES` kullanıyor) | İsim | — (yfinance'e gerek yok) |

**Sonuç:** 4 modül (data_loader, robot_engine, analysis_routes, top_picks_15d) tamamen Alpaca'ya geçebilir. 2 modül (fundamental_analyzer, ownership_engine) yfinance'te kalır.

---

## 2. Alpaca neyi sağlar / sağlamaz

**Sağlar (Market Data API — `data.alpaca.markets`):**
- **Tarihsel barlar:** `/v2/stocks/bars` — çoklu sembol, timeframe `1Min … 59Min, 1Hour … 23Hour, 1Day, 1Week, 1Month`, `adjustment=split/all`. (Senin `1d→1Day`, `1wk→1Week`, `1h→1Hour`, `4h→4Hour`, `5m→5Min` ihtiyaçların karşılanıyor.)
- **Anlık fiyat:** `/v2/stocks/snapshots` (çoklu sembol; son işlem + günlük bar + önceki kapanış tek çağrıda) — `get_batch_live_prices` için ideal.
- **Haber:** `/v1beta1/news` (manşetler) — opsiyonel; mevcut Google News + Gemini akışı korunabilir.

**Sağlamaz:**
- ❌ **Temel rasyolar** (PE, PB, EPS, bookValue, dividendYield) → `fundamental_analyzer.py` yfinance'te kalır.
- ❌ **Kurumsal/yabancı sahiplik** (13F/holders) → `ownership_engine.py` yfinance'te kalır.
- ❌ **Endeksler** (`^GSPC` gibi). Alpaca yalnızca hisse/ETF/kripto/opsiyon verir. **Benchmark `^GSPC` → `SPY` ETF'ine** çevrilmeli (Alpaca modunda).

---

## 3. Dikkat edilecek teknik farklar

1. **Sembol formatı:** Alpaca sınıf hisselerinde **nokta** kullanır (`BRK.B`), yfinance **tire** (`BRK-B`). Sağlayıcıya göre format dönüşümü gerekir (`sp500_symbols`'ta zaten her ikisi türetilebilir).
2. **Endeks yok:** `^GSPC` benchmark'ı Alpaca'da çalışmaz → SPY'a map'le. (Kod 7 yerde benchmark çekiyor; tek sabitle çözülür.)
3. **Veri feed'i (önemli):** Ücretsiz Alpaca planı **IEX** feed'i verir (kısmi hacim, bazı sembollerde boşluk olabilir). Tam piyasa (**SIP**) verisi **ücretli** (Algo Trader Plus) abonelik ister. Analiz kalitesi için planını kontrol et; `ALPACA_DATA_FEED=iex|sip` ile yönetilmeli.
4. **Rate limit:** Alpaca'nın dakikalık istek limiti var; toplu (multi-symbol) uçlar kullanılmalı (snapshots/bars çoklu sembol destekler — 500 hisseyi tek tek değil toplu çek).
5. **Kütüphane:** `alpaca-py` SDK veya doğrudan `requests` ile REST. SDK eklenirse `requirements.txt`'e `alpaca-py` girer.

---

## 4. Önerilen mimari (yfinance yedekli)

Yeni bir **soyutlama katmanı**: `market_data.py`

```
get_ohlcv(symbol, interval, period/start) ->
    DATA_PROVIDER=alpaca ise Alpaca'dan çek; hata/boşsa yfinance'e düş.
get_latest_prices(symbols) ->
    Alpaca snapshots; hata/boşsa yfinance batch.
```

- `data_loader`, `robot_engine`, `analysis_routes`, `top_picks_15d` → bu katmanı çağırır (doğrudan `yf.download` yerine).
- `fundamental_analyzer` + `ownership_engine` → **değişmez** (yfinance).
- Benchmark sabiti: Alpaca modunda `^GSPC` yerine `SPY`.

Bu sayede: Alpaca birincil, **yfinance otomatik yedek** (Alpaca erişilemezse veya anahtar yoksa sistem çalışmaya devam eder).

---

## 5. `.env` tasarımı (talebine uygun)

```env
# === Veri Sağlayıcı ===
# alpaca = birincil (gerçek zamanlı). Hata olursa otomatik yfinance'e düşer.
DATA_PROVIDER=alpaca
ALPACA_API_KEY_ID=PKxxxxxxxxxxxxxxxx
ALPACA_API_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
ALPACA_DATA_FEED=iex          # ücretli SIP aboneliğin varsa: sip

# Tamamen yfinance'e dönmek istersen üstteki DATA_PROVIDER'ı silip bunu aç:
# DATA_PROVIDER=yfinance
```

> Not: Temel analiz ve sahiplik her durumda yfinance'ten gelmeye devam eder (Alpaca'da bu veriler yok).

---

## 6. İş yükü ve risk

| Konu | Değerlendirme |
|---|---|
| Efor | **Orta.** `market_data.py` (~150 satır) + 4 modülde çağrı değişimi + benchmark map. 1 oturumda yapılabilir. |
| Risk | Düşük–orta. Soyutlama + yfinance fallback sayesinde Alpaca patlasa bile sistem ayakta kalır. |
| Maliyet | IEX ücretsiz; tam veri için SIP aboneliği gerekebilir. |
| Kazanç | Gerçek zamanlı/daha güvenilir fiyat, daha az yfinance rate-limit/ban riski, kurumsal API. |
| Kısıt | Temel + sahiplik yfinance'te kalır (Alpaca alternatifi yok). Endeks → SPY. |

---

## 7. Tavsiye / Sonuç

**Yapılabilir ve mantıklı.** Önerilen yol:
1. `market_data.py` soyutlama katmanını ekle (Alpaca birincil + yfinance fallback, env kontrollü).
2. OHLCV ve anlık fiyat çeken 4 modülü bu katmana yönlendir.
3. Benchmark'ı Alpaca modunda `SPY` yap.
4. `fundamental_analyzer` ve `ownership_engine`'i yfinance'te bırak.
5. `.env`'i yukarıdaki gibi düzenle; `alpaca-py`'yi `requirements.txt`'e ekle.

Onay verirsen bu mimariyi kurup geçişi uçtan uca yapayım. Anahtarların IEX mi SIP mi olduğunu da belirtirsen feed ayarını ona göre yaparım.
