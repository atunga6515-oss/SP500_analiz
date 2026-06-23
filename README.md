# SP500 Analiz Terminali 📈

AI-destekli, **S&P 500** odaklı profesyonel hisse senedi analiz platformu. 100+ teknik indikatör, temel analiz, risk yönetimi, backtest, sanal portföy, otonom paper-trading robotu ve yapay zeka (Gemini) yorumlarını tek bir arayüzde toplar.

> Bu proje, daha önce BIST (Borsa İstanbul) için geliştirilen bir uygulamanın S&P 500 piyasasına uyarlanmış ve **2 dilli (Türkçe / İngilizce)** hale getirilmiş sürümüdür.

---

## ✨ Özellikler

- **Kapsamlı Analiz:** Tek hisse için 100+ teknik indikatör, çok-zamanlı (kısa/orta/uzun vade) hibrit skorlama, SMC (Smart Money Concepts) market yapısı kırılımı, destek/direnç bölgeleri.
- **Screener (Hibrit Tarama):** Tüm S&P 500 evrenini saniyeler içinde teknik + temel kriterlerle tarama.
- **Stratejik Seçki:** Orta-uzun vade ve sadece kısa vade (15 gün) "patlama potansiyeli" tarayıcıları.
- **AlphaRank:** Takip havuzundaki hisseleri 15 günlük yükseliş potansiyeline göre sıralama.
- **Risk Yönetimi:** Portföy Beta, VaR, ATR bazlı dinamik stop-loss önerileri.
- **Sanal Portföy + Optimizasyon:** İşlem takibi, anlık K/Z ve Markowitz (Modern Portföy Teorisi) ağırlık optimizasyonu.
- **Backtest & Strateji Kıyaslama:** İndikatör stratejilerinin geçmiş performans testi.
- **Otonom Robot:** Sanal bakiye ile paper-trading al-sat robotu.
- **Haber & Duygu Analizi (NLP):** Google News + Gemini AI ile şirket haberlerinin sentiment skoru.
- **Kurumsal Sahiplik:** yfinance üzerinden kurumsal sahiplik oranı ve çeyreklik akış (BIST "takas" verisinin S&P 500 muadili).
- **2 Dil (TR / EN):** Tüm arayüz ve AI çıktıları için anlık dil değiştirme.
- **Alarmlar, Heatmap, Sinyal Karnesi, Admin Paneli** ve daha fazlası.

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, APScheduler |
| Veri | yfinance (fiyat & temel veri), Google News RSS |
| Yapay Zeka | Google Gemini (`google-genai`) |
| Analiz | pandas, numpy, `ta`, `pandas-ta`, scipy, scikit-learn |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, zustand |
| Grafik | lightweight-charts, mplfinance |
| Veritabanı | PostgreSQL veya SQLite |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Python 3.10+
- Node.js 18+
- (Opsiyonel) PostgreSQL — basit kurulumda SQLite yeterli

### 1. Depoyu klonla
```bash
git clone https://github.com/atunga6515-oss/SP500_analiz.git
cd SP500_analiz
```

### 2. Ortam değişkenleri (`.env`)
Kök dizinde `.env` dosyası oluştur (`.env.example` dosyasını referans al). En basit (SQLite) yapılandırma:
```env
DATABASE_URL=sqlite:///borsa_v5.db
JWT_SECRET_KEY=kendi_guclu_gizli_anahtariniz
ALLOWED_ORIGINS=http://localhost:3005,http://127.0.0.1:3005
# Yapay zeka özellikleri için (opsiyonel):
GEMINI_API_KEY=your_gemini_api_key
# Varsayılan arayüz dili: en | tr
APP_DEFAULT_LANG=en
```

### 3. Backend
```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py                  # http://localhost:8005 (backend)
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:3005 (frontend)
```

`frontend/.env.local` içinde API adresi:
```env
NEXT_PUBLIC_API_URL=http://localhost:8005
BACKEND_INTERNAL_URL=http://127.0.0.1:8005
```

### 5. İlk admin kullanıcısı
Otomatik admin oluşturulmaz. Önce arayüzden kayıt ol, sonra:
```bash
sqlite3 borsa_v5.db "UPDATE users SET role='admin', ai_quota=100 WHERE username='KULLANICI_ADIN';"
```

### Docker ile (alternatif)
```bash
docker-compose up --build
```

---

## 🌐 Dil Desteği

Sağ üstteki **TR / EN** seçicisinden anlık geçiş yapılır. Seçim tarayıcıda saklanır ve tüm API isteklerine otomatik iletilir; haber/sentiment ve AI yorumları da seçilen dilde döner. Varsayılan dil `.env` içindeki `APP_DEFAULT_LANG` ile ayarlanır.

---

## 📁 Proje Yapısı (özet)

```
SP500_analiz/
├── main.py                 # FastAPI giriş noktası
├── data_loader.py          # yfinance veri çekme + cache
├── sp500_symbols.py        # S&P 500 bileşenleri + GICS sektör haritası
├── indicators.py           # İndikatör hesaplamaları
├── signals_engine.py       # Sinyal/skor motoru
├── screener.py             # Tarama motoru
├── ownership_engine.py     # Kurumsal sahiplik (takas muadili)
├── kap_news.py             # Haber + Gemini sentiment
├── i18n.py                 # Backend dil altyapısı
├── api/                    # FastAPI router'ları
├── core/                   # Analiz servisi
└── frontend/               # Next.js arayüz (src/lib/i18n.ts dil sözlüğü)
```

---

## 🖥️ Sunucu / Domain Dağıtımı (Linux + Apache + PM2)

**Port mimarisi:** Backend (FastAPI) `8005`, Frontend (Next.js) `3005`. Tarayıcı `/api`'yi frontend'e çağırır; Next.js bunu otomatik olarak backend'e (`127.0.0.1:8005`) yönlendirir. **Apache yalnızca domain'i `127.0.0.1:3005`'e reverse-proxy etmelidir** — `/api` ayrıca proxy'lenmek zorunda değildir.

### Adımlar (sunucuda)
```bash
git clone https://github.com/atunga6515-oss/SP500_analiz.git
cd SP500_analiz

# 1) Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2) Ortam değişkenleri (git'e GİTMEZ — elle oluştur)
cp .env.example .env                       # DB, JWT, GEMINI, ENV, ALLOWED_ORIGINS düzenle
cp frontend/.env.local.example frontend/.env.local

# 3) Frontend build
cd frontend && npm install && npm run build && cd ..

# 4) PM2 ile başlat
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 5) İlk admin (DB'ye göre)
# Postgres: psql -d <db> -c "UPDATE users SET role='admin', ai_quota=100 WHERE username='kullanici';"
# SQLite:   sqlite3 borsa_v5.db "UPDATE users SET role='admin', ai_quota=100 WHERE username='kullanici';"
```

### Production `.env` (önemli ayarlar)
```env
ENV=production                 # HTTPS arkasında: cookie Secure=True olur
PORT=8005
APP_DEFAULT_LANG=en
JWT_SECRET_KEY=<openssl rand -hex 32>
# PostgreSQL:
DB_USER=...
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sp500
# veya tek satır: DATABASE_URL=postgresql://user:pass@localhost:5432/sp500
GEMINI_API_KEY=...
ALLOWED_ORIGINS=https://alanadiniz.com,https://www.alanadiniz.com
```
`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://alanadiniz.com
BACKEND_INTERNAL_URL=http://127.0.0.1:8005
```

### Örnek Apache reverse-proxy (VirtualHost)
```apache
ProxyPreserveHost On
ProxyPass        /  http://127.0.0.1:3005/
ProxyPassReverse /  http://127.0.0.1:3005/
```

### Notlar
- **`.env` ve `frontend/.env.local` git'e dahil değildir** (gizli bilgi); sunucuda mutlaka elle oluştur.
- **DB'yi önce hazırla:** Postgres kullanıyorsan veritabanını oluştur; tablolar uygulama ilk açılışta otomatik kurulur (`init_db`).
- **`ENV=production`** yalnızca HTTPS varsa kullan (cookie `Secure`). HTTP test ediyorsan `development` bırak, yoksa login çalışmaz.
- Frontend'i her güncellediğinde: `cd frontend && npm run build && pm2 restart sp500-frontend`.
- `requirements.txt` ağır paketler içerir (prophet, statsmodels); pip hata verirse sunucuya derleme araçlarını kur: `sudo apt install -y build-essential python3-dev`.

---

## ⚠️ Yasal Uyarı

Bu platformdaki tüm bilgi, sinyal ve yorumlar yalnızca eğitim ve bilgilendirme amaçlıdır; **yatırım danışmanlığı kapsamında değildir.** Yatırım kararlarınızdan yalnızca siz sorumlusunuz.

---

## 📄 Lisans

Özel proje. Tüm hakları saklıdır.
