// PM2 yapılandırması — SP500 Analiz Terminali
// Kullanım:
//   1) Backend bağımlılıkları: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
//   2) Frontend build (production):  cd frontend && npm install && npm run build
//   3) Başlat:  pm2 start ecosystem.config.js
//   4) Kaydet (yeniden başlatmada otomatik kalksın): pm2 save && pm2 startup
//
// NOT: BIST uygulaman aynı anda çalışıyorsa portlar ÇAKIŞIR.
//      Aşağıdaki PORT değerlerini (ör. 8000->8010, 3000->3010) değiştir
//      ve frontend/.env.local içindeki NEXT_PUBLIC_API_URL ile
//      .env içindeki ALLOWED_ORIGINS değerlerini de uyumlu yap.

const path = require("path");
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: "sp500-backend",
      // venv içindeki Python ile main.py'yi çalıştırır (main.py uvicorn'u 0.0.0.0:8000'de açar)
      script: "main.py",
      interpreter: path.join(ROOT, "venv/bin/python"),
      cwd: ROOT,
      autorestart: true,
      max_restarts: 10,
      env: {
        // .env dosyası python-dotenv ile zaten okunur; gerekirse buradan da geçebilirsin
        PYTHONUNBUFFERED: "1",
        PORT: "3005", // SP500 backend (FastAPI) portu
      },
    },
    {
      name: "sp500-frontend",
      // Production: önce `npm run build`, sonra `npm start` (next start, varsayılan port 3000)
      cwd: path.join(ROOT, "frontend"),
      script: "npm",
      args: "start",
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: "8005", // SP500 frontend (Next.js) portu
        BACKEND_INTERNAL_URL: "http://127.0.0.1:3005", // Next rewrite /api -> backend
      },
    },
  ],
};
