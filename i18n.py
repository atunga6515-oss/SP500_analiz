"""
i18n.py — Merkezi 2 dil (TR/EN) altyapısı  [Aşama 1: Backend]
=============================================================
Bu modül, uygulamanın iki dilde (Türkçe / İngilizce) çalışabilmesi için
tek merkezden yönetilen:
  - dil normalize/doğrulama,
  - AI prompt üreticileri (haber sentiment + derin analiz),
  - haber kaynağı (Google News RSS) dil parametreleri,
  - backend tarafında üretilen etiketler için sözlük (Aşama 2'de frontend
    bunların çoğunu devralacak; burada API çıktısındaki dinamik metinler için
    temel atılır)
sağlar.

Kullanım:
    from i18n import normalize_lang, t, build_sentiment_prompt
    lang = normalize_lang(request_lang)         # "tr" veya "en"
    label = t("foreign_ratio", lang)            # "Kurumsal Sahiplik (%)" / "Institutional Ownership (%)"
"""

import os

SUPPORTED_LANGS = ("tr", "en")

# SP500 (ABD piyasası) uygulaması için varsayılan İngilizce; .env ile değişebilir.
DEFAULT_LANG = (os.getenv("APP_DEFAULT_LANG", "en") or "en").lower()
if DEFAULT_LANG not in SUPPORTED_LANGS:
    DEFAULT_LANG = "en"


def normalize_lang(lang) -> str:
    """Gelen dil kodunu güvenli şekilde 'tr' veya 'en'e indirger."""
    if not lang:
        return DEFAULT_LANG
    code = str(lang).strip().lower().replace("_", "-")
    if code.startswith("tr"):
        return "tr"
    if code.startswith("en"):
        return "en"
    return DEFAULT_LANG


# ============================================================
# Haber kaynağı (Google News RSS) dil parametreleri
# ============================================================

def news_rss_config(lang: str) -> dict:
    """Google News RSS için dil/ülke parametreleri ve arama sorgusu eki."""
    lang = normalize_lang(lang)
    if lang == "tr":
        return {
            "hl": "tr",
            "gl": "TR",
            "ceid": "TR:tr",
            "query_template": "{ticker} hisse haberi",
        }
    return {
        "hl": "en-US",
        "gl": "US",
        "ceid": "US:en",
        "query_template": "{ticker} stock news",
    }


# ============================================================
# AI Prompt üreticileri
# ============================================================

def build_sentiment_prompt(news_text: str, lang: str) -> str:
    """Haber başlıklarını puanlamak için Gemini prompt'unu seçilen dilde üretir."""
    lang = normalize_lang(lang)
    if lang == "tr":
        return f"""
Aşağıdaki ABD borsası (S&P 500) hisse haberlerini analiz et. Her haber için:
1. Kategorize et: [İş/Sözleşme, Bilanço (Earnings), Sermaye/Temettü, Geri Alım (Buyback), Dava/Olumsuz Gelişme, Diğer]
2. Puanla (-1.0 ile +1.0 arası):
   - Pozitif (+0.5 to +1.0): Beklenti üstü kâr, güçlü guidance, pay geri alımı, büyük sözleşme/satın alma.
   - Nötr (-0.4 to +0.4): Rutin duyurular, analist teyidi.
   - Negatif (-0.5 to -1.0): Beklenti altı bilanço, zayıf guidance, hukuki süreç, soruşturma.
3. Neden: Kısa ve öz gerekçe.

Haberler:
{news_text}

SADECE aşağıdaki formatta bir JSON listesi döndür, başka açıklama yapma:
[
  {{"index": 1, "score": 0.85, "reason": "Beklenti üstü çeyreklik kâr", "category": "Bilanço"}}
]
"""
    return f"""
Analyze the following U.S. stock market (S&P 500) news. For each item:
1. Categorize: [Business/Contract, Earnings, Capital/Dividend, Buyback, Litigation/Negative, Other]
2. Score (between -1.0 and +1.0):
   - Positive (+0.5 to +1.0): Earnings beats, strong guidance, share buybacks, major contracts/acquisitions.
   - Neutral (-0.4 to +0.4): Routine disclosures, analyst reiterations.
   - Negative (-0.5 to -1.0): Earnings misses, weak guidance, lawsuits, investigations.
3. Reason: Short and concise rationale.

News:
{news_text}

Return ONLY a JSON list in exactly this format, with no other text:
[
  {{"index": 1, "score": 0.85, "reason": "Quarterly earnings beat", "category": "Earnings"}}
]
"""


def keyword_lexicon(lang: str) -> dict:
    """AI başarısız olduğunda kullanılan basit kelime-bazlı sözlük (fallback)."""
    lang = normalize_lang(lang)
    if lang == "tr":
        return {
            "positive": ["arttı", "yüksel", "kazanç", "kâr", "büyü", "yatırım",
                         "anlaşma", "temettü", "geri alım", "rekor", "beklenti üstü"],
            "negative": ["düştü", "zarar", "azaldı", "kriz", "ceza", "dava",
                         "iptal", "olumsuz", "risk", "soruşturma", "beklenti altı"],
        }
    return {
        "positive": ["surge", "rise", "gain", "beat", "profit", "growth", "deal",
                     "dividend", "buyback", "record", "upgrade", "raises"],
        "negative": ["fall", "loss", "drop", "decline", "lawsuit", "fine",
                     "probe", "investigation", "cut", "downgrade", "miss", "warning"],
    }


def build_analysis_system_prompt(lang: str) -> str:
    """Derin (yorum) analiz için Gemini sistem prompt'u; seçilen dilde yanıt ister."""
    lang = normalize_lang(lang)
    if lang == "tr":
        return (
            "Sen kıdemli bir S&P 500 (ABD borsası) Portföy Yöneticisi ve teknik analistsin. "
            "Kullanıcıya teknik veriler sunulacak. Lütfen kurumsal bir dille, Markdown formatında, "
            "kısa ama doyurucu bir şekilde TÜRKÇE olarak şu 3 başlık altında yorum yap:\n"
            "1. **Teknik Görünüm** (RSI, MACD ve teknik parametrelerin özeti)\n"
            "2. **Risk/Ödül Analizi** (Mevcut seviyeye göre destek/direnç risk değerlendirmesi)\n"
            "3. **Strateji Notu** (Kısa veya orta vadeli net bir aksiyon önerisi)\n\n"
            "En alta çok küçük puntolarla (*italik*) şu yasal uyarıyı ekle: "
            "'Burada yer alan bilgi ve yorumlar yatırım danışmanlığı kapsamında değildir.'"
        )
    return (
        "You are a senior S&P 500 (U.S. market) Portfolio Manager and technical analyst. "
        "The user will provide technical data. In professional language, using Markdown, "
        "provide a concise but substantive commentary IN ENGLISH under these 3 headings:\n"
        "1. **Technical Outlook** (summary of RSI, MACD and technical parameters)\n"
        "2. **Risk/Reward Analysis** (support/resistance risk assessment relative to current level)\n"
        "3. **Strategy Note** (a clear short- or medium-term actionable recommendation)\n\n"
        "At the very bottom, in small (*italic*) text, add this disclaimer: "
        "'The information and commentary herein does not constitute investment advice.'"
    )


# ============================================================
# Backend etiket sözlüğü (dinamik API çıktıları için)
# Aşama 2'de frontend etiketlerin çoğunu devralacak; burada özellikle
# sahiplik/ekran metinleri gibi backend'in ürettiği değerler tutulur.
# ============================================================

STRINGS = {
    # sahiplik (eski "takas") etiketleri
    "foreign_ratio":      {"tr": "Kurumsal Sahiplik (%)", "en": "Institutional Ownership (%)"},
    "ownership_change":   {"tr": "Kurumsal Değişim (%)",  "en": "Institutional Change (%)"},
    "insider_ratio":      {"tr": "İçeriden Sahiplik (%)", "en": "Insider Ownership (%)"},
    "institutions_count": {"tr": "Kurum Sayısı",          "en": "Institutions Count"},
    # genel
    "support":            {"tr": "Destek",                "en": "Support"},
    "resistance":         {"tr": "Direnç",                "en": "Resistance"},
    "trend":              {"tr": "Trend",                 "en": "Trend"},
    "unknown":            {"tr": "Bilinmiyor",            "en": "Unknown"},
    "data_unavailable":   {"tr": "Veri Yok",              "en": "No Data"},
}


def t(key: str, lang: str) -> str:
    """Verilen anahtarın seçilen dildeki karşılığını döndürür."""
    lang = normalize_lang(lang)
    entry = STRINGS.get(key)
    if not entry:
        return key
    return entry.get(lang, entry.get(DEFAULT_LANG, key))
