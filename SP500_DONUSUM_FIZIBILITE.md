# BIST → S&P 500 Dönüşüm Fizibilite Raporu

**Proje:** borsa-analiz-appv5 uygulamasının S&P 500 için uyarlanması
**Tarih:** 22 Haziran 2026
**Karar:** ✅ **Yapılabilir.** Hatta beklenenden kolay — mimari buna uygun.

---

## 1. Özet Karar

Uygulama **yapılabilir** ve teknik olarak BIST versiyonundan **daha sağlam** çalışacaktır. Sebebi şu: uygulamanın iki ana katmanı var ve her ikisi de dönüşüme elverişli.

- **Analiz / indikatör katmanı** (indicators.py, signals_engine.py, screener.py, scorecard.py, patterns.py, support_resistance.py, risk_manager.py, strategy_comparator.py, advanced_backtest.py): Tamamen saf matematik (`ta`, `pandas-ta`, `numpy`, `scipy`). Pazardan tamamen **bağımsız**. Hisse ister BIST ister S&P 500 olsun, RSI/MACD/SuperTrend/Bollinger aynı şekilde hesaplanır. **Bu katmana neredeyse hiç dokunmaya gerek yok.**
- **Veri katmanı** (data_loader.py): Zaten **yfinance** kullanıyor — yani Yahoo Finance. yfinance ABD hisseleri için BIST'ten **daha eksiksiz ve güvenilir** veri sağlar. Tek bağ, sembollere otomatik eklenen `.IS` ekidir.

Türkiye'ye özel olan ve değiştirilmesi gereken sadece **birkaç sınırlı nokta** var (aşağıda). Bunların hepsinin uluslararası muadili mevcut.

---

## 2. Mimari Değerlendirme: Ne Kalır, Ne Değişir

| Katman | Dosyalar | Durum |
|---|---|---|
| İndikatör hesaplama | indicators.py, signals_engine.py, patterns.py, support_resistance.py | ✅ Aynen kullanılır (saf matematik) |
| Sinyal / skor / tarama | screener.py, scorecard.py, alpharank_engine.py, strategy_comparator.py | ✅ Mantık aynı, sadece sembol listesi + benchmark değişir |
| Risk / portföy / backtest | risk_manager.py, portfolio_optimizer.py, advanced_backtest.py, top_picks*.py | ✅ Aynen kullanılır, benchmark değişir |
| Fiyat verisi | data_loader.py | 🔧 Küçük: `.IS` eki ve İstanbul saati kaldırılır |
| Temel analiz | fundamental_analyzer.py | 🔧 Küçük: `.IS` kaldırılır (yfinance ABD için daha zengin) |
| **Takas (yabancı oranı)** | takas_engine.py | ⚠️ Yeniden yazılır (İş Yatırım scraping → kurumsal sahiplik) |
| **Haber / sentiment** | kap_news.py | 🔧 Orta: Google News RSS dili + AI prompt İngilizce'ye |
| Sembol listesi | screener.py, symbol_service.py | 🔧 BIST listesi → S&P 500 bileşenleri |
| Sektör / makro takvim | market_routes.py | 🔧 BIST sektörleri → GICS sektörleri; TCMB/TÜFE → FED/CPI |
| Frontend | frontend/ | 🔧 Etiketler, para birimi (₺→$), endeks adı (XU100→S&P 500) |

---

## 3. BIST'e Özel Veri Kaynakları ve Uluslararası Muadilleri

Veri çekilen yerleri tek tek inceledim. Türkiye'ye bağlı **4 nokta** var:

### 3.1 Fiyat / Mum Verisi — `data_loader.py`
- **Mevcut:** `yf.download("THYAO.IS")` — yfinance üzerinden, `.IS` ekiyle.
- **Sorun yok.** yfinance global. S&P 500 için ek gerekmez: `AAPL`, `MSFT`, `NVDA` doğrudan çalışır.
- **Yapılacak:** `_make_ticker()` fonksiyonundaki `.IS` ekleme mantığını kaldır. İstanbul saat dilimini (`Europe/Istanbul`) ABD borsa saatine (`America/New_York`) çevir.

### 3.2 Yabancı Takas Oranı — `takas_engine.py` (⚠️ tek "gerçek" değişiklik)
- **Mevcut:** İş Yatırım web sitesini (`isyatirim.com.tr`) scrape ederek her hissenin **yabancı yatırımcı oranını** çekiyor. Bu tamamen Türkiye'ye özgü bir kavram ve veri kaynağı.
- **ABD'de doğrudan muadili yok**, ama daha güçlü alternatifler var:
  - **Kurumsal sahiplik oranı (institutional ownership):** yfinance `Ticker.institutional_holders`, `major_holders` — kurumların elindeki pay yüzdesi, kurum sayısı, çeyreklik değişim. (13F dosyalarına dayanır.)
  - **İçeriden işlemler (insider transactions):** yfinance `Ticker.insider_transactions` — yöneticilerin alım/satımı.
  - **Açığa satış oranı (short interest):** yfinance `info` içinde mevcut.
- **Öneri:** `takas_engine.py`'yi `ownership_engine.py` olarak yeniden yaz; "yabancı oranı + günlük değişim" yerine "kurumsal sahiplik % + çeyreklik değişim" döndür. Sinyal motoruna giren arayüz (dict) aynı kalır, sadece içerik değişir — yani **signals_engine'e dokunmadan** geçiş yapılır.

### 3.3 Haber / Duygu Analizi — `kap_news.py`
- **Mevcut:** Google News RSS'ten **Türkçe** (`hl=tr&gl=TR`) "{ticker} KAP hisse haberi" araması + Gemini AI ile **Türkçe prompt**'la sentiment skoru.
- **Mimari sorun yok** — Google News global, Gemini çok dilli. Sadece **dil/sorgu** ABD'ye uyarlanır.
- **Yapılacak:**
  - RSS sorgusunu İngilizce'ye çevir: `hl=en-US&gl=US`, sorgu `"{ticker} stock news"`.
  - AI prompt'unu İngilizce'ye ve ABD bağlamına (earnings, guidance, buyback, SEC, M&A) çevir.
- **Opsiyonel güçlendirme:** Daha kaliteli, yapılandırılmış haber için ücretsiz katmanlı API'ler: **Finnhub** (`company-news` + hazır news-sentiment), **Alpha Vantage** (`NEWS_SENTIMENT`, AI skorlu), **Marketaux** veya **EODHD**. yfinance `Ticker.news` de bedava bir başlangıç sağlar.

### 3.4 Sembol Listesi & Endeks Benchmark
- **Mevcut:** `BIST_ALL_SYMBOLS` (elle yazılmış ~500 BIST kodu), benchmark olarak `XU100`.
- **Yapılacak:**
  - S&P 500 bileşen listesi: Wikipedia tablosundan (`pandas.read_html` ile "List of S&P 500 companies") veya statik liste olarak güncellenir. ~503 sembol.
  - Benchmark `XU100` → **`^GSPC`** (S&P 500 endeksi) veya **`SPY`** ETF'i. (Kod 6 dosyada `XU100`/`XU100.IS` geçiyor — hepsi tek bir sabite bağlanmalı.)

### 3.5 Sektör Haritası & Makro Takvim — `market_routes.py`
- BIST sektör grupları → GICS 11 sektörü (Technology, Health Care, Financials, vb.). yfinance her hissenin sektörünü `info["sector"]` ile zaten veriyor; elle haritalamaya gerek kalmadan otomatik üretilebilir.
- Makro takvim TCMB/TÜFE → FED/CPI/NFP. (Zaten statik/simüle; gerçek veri için **FRED API** veya ekonomik takvim API'si bağlanabilir.)

---

## 4. Değiştirilecek Sabit Kodlanmış Noktalar (kesin liste)

`.IS` ekinin geçtiği yerler (dönüştürülecek):

- `data_loader.py:32-37` — `_make_ticker()` (ana nokta)
- `fundamental_analyzer.py:11`
- `alpharank_engine.py:15,41`
- `api/robot_engine.py:72,78,85`
- `api/analysis_routes.py:37,299`
- `api/top_picks_15d_routes.py:97`
- `api/symbol_service.py:33`
- `core/analysis_service.py:31`

`XU100` benchmark'ın geçtiği yerler → `^GSPC`:

- `core/analysis_service.py:37`, `indicators.py:270`, `screener.py:522`, `top_picks.py:197`, `top_picks_15d.py:267`, `alpharank_engine.py:145`, `api/risk_routes.py:28,31`

Bu noktaların çoğu `_make_ticker()` ve tek bir benchmark sabiti merkezileştirilince **otomatik çözülür**.

---

## 5. Önerilen Veri Kaynağı Stratejisi (özet)

| İhtiyaç | BIST kaynağı | Önerilen S&P 500 kaynağı |
|---|---|---|
| OHLCV fiyat/mum | yfinance `.IS` | **yfinance** (eksiz) — birincil |
| Temel rasyolar (PE, PB, EPS) | yfinance | **yfinance** (ABD'de daha zengin) |
| Yabancı/kurumsal sahiplik | İş Yatırım scraping | **yfinance** institutional/insider holders |
| Haber + sentiment | Google News TR + Gemini | Google News EN + Gemini (+ ops. **Finnhub/Alpha Vantage**) |
| Endeks benchmark | XU100 | **^GSPC** veya SPY |
| Sembol listesi | elle BIST listesi | **Wikipedia S&P 500** (pandas.read_html) |
| Sektör | elle BIST_SECTORS | yfinance `info["sector"]` (GICS) |
| Makro takvim | TCMB/TÜFE (statik) | FED/CPI (ops. **FRED API**) |

**Ek bağımlılık gerekmez** — mevcut `requirements.txt` (yfinance, pandas, ta, google-genai, lxml) bu işin tamamı için yeterli. Sadece opsiyonel haber API'leri için anahtar eklenir.

---

## 6. Riskler ve Dikkat Noktaları

- **yfinance kararlılığı:** Yahoo bazen oran sınırlaması (rate limit) uygular. Kod zaten retry + cache + SQLite/Postgres katmanına sahip, bu riski büyük ölçüde karşılıyor.
- **Takas → kurumsal sahiplik anlam farkı:** "Yabancı oranı günlük değişimi" gibi günlük bir sinyal, kurumsal sahiplikte **çeyreklik** güncellenir. Sinyal motorunda bu göstergenin ağırlığı/yorumu gözden geçirilmeli (günlük momentum sinyali olmaktan çıkıp orta-vade sinyaline döner).
- **Veritabanı:** `bist_cache.db` ve `borsa_v5.db` BIST verisiyle dolu. SP500 versiyonunda **temiz DB ile başlanmalı** (kopyaya bu db'ler dahil edilmedi zaten; şema migrate.py ile yeniden kurulur). `bist_symbols` tablosu `sp500_symbols`'a yeniden adlandırılabilir.
- **Frontend metinleri:** Para birimi ₺→$, endeks adları, Türkçe etiketler. İşlevsel risk değil, kozmetik iş yükü.
- **Para birimi tutarlılığı:** Tüm S&P 500 hisseleri USD; BIST'teki TL/enflasyon kaynaklı özel notlar (ör. Graham değeri yorumu) sadeleştirilebilir.

---

## 7. Sonraki Adımlar (önerilen sıra)

1. `data_loader.py` — `.IS` kaldır, saat dilimini ABD'ye al, benchmark sabitini merkezileştir (`^GSPC`).
2. Sembol listesi modülü — S&P 500 bileşenlerini Wikipedia'dan çek/sabitle.
3. `takas_engine.py` → `ownership_engine.py` — yfinance kurumsal sahiplik.
4. `kap_news.py` — İngilizce sorgu + İngilizce AI prompt.
5. `market_routes.py` — GICS sektörleri + FED/CPI takvimi.
6. Frontend — etiket/para birimi/endeks güncellemeleri.
7. Temiz DB + uçtan uca test (birkaç sembolle: AAPL, MSFT, NVDA, JPM, XOM).

---

**Sonuç:** Dönüşüm yapılabilir ve risk düşük. İş yükünün %80'i birkaç dosyadaki sabit kodları (`.IS`, `XU100`, sembol listesi) değiştirmek; gerçek geliştirme gerektiren tek parça takas motorunun kurumsal-sahiplik muadiline çevrilmesi. Analiz/indikatör beyni olduğu gibi korunur.
