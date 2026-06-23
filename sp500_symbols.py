"""
sp500_symbols.py — S&P 500 bileşen listeleri ve sektör haritası
================================================================
BIST versiyonundaki screener.py BIST30/BIST100/BIST_ALL listelerinin yerini alır.

Kaynak: Wikipedia "List of S&P 500 companies" (statik snapshot).
Not: Sınıf hisseleri yfinance formatında nokta yerine tire kullanır
     (BRK.B -> BRK-B, BF.B -> BF-B).

İsteğe bağlı: get_all_sp500_symbols(live=True) çağrısı, kullanıcının makinesinde
internet varsa Wikipedia'dan güncel listeyi pandas.read_html ile çeker; başarısız
olursa buradaki statik listeye düşer.
"""

import logging

logger = logging.getLogger(__name__)

# ── Ticker -> GICS Sektör ──────────────────────────────────────────────
SP500_SECTORS = {
    "MMM": "Industrials", "AOS": "Industrials", "ABT": "Health Care", "ABBV": "Health Care",
    "ACN": "Information Technology", "ADBE": "Information Technology", "AMD": "Information Technology",
    "AES": "Utilities", "AFL": "Financials", "A": "Health Care", "APD": "Materials",
    "ABNB": "Consumer Discretionary", "AKAM": "Information Technology", "ALB": "Materials",
    "ARE": "Real Estate", "ALGN": "Health Care", "ALLE": "Industrials", "LNT": "Utilities",
    "ALL": "Financials", "GOOGL": "Communication Services", "GOOG": "Communication Services",
    "MO": "Consumer Staples", "AMZN": "Consumer Discretionary", "AMCR": "Materials",
    "AEE": "Utilities", "AEP": "Utilities", "AXP": "Financials", "AIG": "Financials",
    "AMT": "Real Estate", "AWK": "Utilities", "AMP": "Financials", "AME": "Industrials",
    "AMGN": "Health Care", "APH": "Information Technology", "ADI": "Information Technology",
    "AON": "Financials", "APA": "Energy", "APO": "Financials", "AAPL": "Information Technology",
    "AMAT": "Information Technology", "APP": "Information Technology", "APTV": "Consumer Discretionary",
    "ACGL": "Financials", "ADM": "Consumer Staples", "ARES": "Financials", "ANET": "Information Technology",
    "AJG": "Financials", "AIZ": "Financials", "T": "Communication Services", "ATO": "Utilities",
    "ADSK": "Information Technology", "ADP": "Industrials", "AZO": "Consumer Discretionary",
    "AVB": "Real Estate", "AVY": "Materials", "AXON": "Industrials", "BKR": "Energy",
    "BALL": "Materials", "BAC": "Financials", "BAX": "Health Care", "BDX": "Health Care",
    "BRK-B": "Financials", "BBY": "Consumer Discretionary", "TECH": "Health Care", "BIIB": "Health Care",
    "BLK": "Financials", "BX": "Financials", "XYZ": "Financials", "BNY": "Financials",
    "BA": "Industrials", "BKNG": "Consumer Discretionary", "BSX": "Health Care", "BMY": "Health Care",
    "AVGO": "Information Technology", "BR": "Industrials", "BRO": "Financials", "BF-B": "Consumer Staples",
    "BLDR": "Industrials", "BG": "Consumer Staples", "BXP": "Real Estate", "CHRW": "Industrials",
    "CDNS": "Information Technology", "CPT": "Real Estate", "CPB": "Consumer Staples", "COF": "Financials",
    "CAH": "Health Care", "CCL": "Consumer Discretionary", "CARR": "Industrials", "CVNA": "Consumer Discretionary",
    "CASY": "Consumer Staples", "CAT": "Industrials", "CBOE": "Financials", "CBRE": "Real Estate",
    "CDW": "Information Technology", "COR": "Health Care", "CNC": "Health Care", "CNP": "Utilities",
    "CF": "Materials", "CRL": "Health Care", "SCHW": "Financials", "CHTR": "Communication Services",
    "CVX": "Energy", "CMG": "Consumer Discretionary", "CB": "Financials", "CHD": "Consumer Staples",
    "CIEN": "Information Technology", "CI": "Health Care", "CINF": "Financials", "CTAS": "Industrials",
    "CSCO": "Information Technology", "C": "Financials", "CFG": "Financials", "CLX": "Consumer Staples",
    "CME": "Financials", "CMS": "Utilities", "KO": "Consumer Staples", "CTSH": "Information Technology",
    "COHR": "Information Technology", "COIN": "Financials", "CL": "Consumer Staples", "CMCSA": "Communication Services",
    "FIX": "Industrials", "CAG": "Consumer Staples", "COP": "Energy", "ED": "Utilities",
    "STZ": "Consumer Staples", "CEG": "Utilities", "COO": "Health Care", "CPRT": "Industrials",
    "GLW": "Information Technology", "CPAY": "Financials", "CTVA": "Materials", "CSGP": "Real Estate",
    "COST": "Consumer Staples", "CRH": "Materials", "CRWD": "Information Technology", "CCI": "Real Estate",
    "CSX": "Industrials", "CMI": "Industrials", "CVS": "Health Care", "DHR": "Health Care",
    "DRI": "Consumer Discretionary", "DDOG": "Information Technology", "DVA": "Health Care",
    "DECK": "Consumer Discretionary", "DE": "Industrials", "DELL": "Information Technology",
    "DAL": "Industrials", "DVN": "Energy", "DXCM": "Health Care", "FANG": "Energy",
    "DLR": "Real Estate", "DG": "Consumer Staples", "DLTR": "Consumer Staples", "D": "Utilities",
    "DPZ": "Consumer Discretionary", "DASH": "Consumer Discretionary", "DOV": "Industrials",
    "DOW": "Materials", "DHI": "Consumer Discretionary", "DTE": "Utilities", "DUK": "Utilities",
    "DD": "Materials", "ETN": "Industrials", "EBAY": "Consumer Discretionary", "SATS": "Communication Services",
    "ECL": "Materials", "EIX": "Utilities", "EW": "Health Care", "EA": "Communication Services",
    "ELV": "Health Care", "EME": "Industrials", "EMR": "Industrials", "ETR": "Utilities",
    "EOG": "Energy", "EPAM": "Information Technology", "EQT": "Energy", "EFX": "Industrials",
    "EQIX": "Real Estate", "EQR": "Real Estate", "ERIE": "Financials", "ESS": "Real Estate",
    "EL": "Consumer Staples", "EG": "Financials", "EVRG": "Utilities", "ES": "Utilities",
    "EXC": "Utilities", "EXE": "Energy", "EXPE": "Consumer Discretionary", "EXPD": "Industrials",
    "EXR": "Real Estate", "XOM": "Energy", "FFIV": "Information Technology", "FDS": "Financials",
    "FICO": "Information Technology", "FAST": "Industrials", "FRT": "Real Estate", "FDX": "Industrials",
    "FIS": "Financials", "FITB": "Financials", "FSLR": "Information Technology", "FE": "Utilities",
    "FISV": "Financials", "F": "Consumer Discretionary", "FTNT": "Information Technology", "FTV": "Industrials",
    "FOXA": "Communication Services", "FOX": "Communication Services", "BEN": "Financials", "FCX": "Materials",
    "GRMN": "Consumer Discretionary", "IT": "Information Technology", "GE": "Industrials", "GEHC": "Health Care",
    "GEV": "Industrials", "GEN": "Information Technology", "GNRC": "Industrials", "GD": "Industrials",
    "GIS": "Consumer Staples", "GM": "Consumer Discretionary", "GPC": "Consumer Discretionary",
    "GILD": "Health Care", "GPN": "Financials", "GL": "Financials", "GDDY": "Information Technology",
    "GS": "Financials", "HAL": "Energy", "HIG": "Financials", "HAS": "Consumer Discretionary",
    "HCA": "Health Care", "DOC": "Real Estate", "HSIC": "Health Care", "HSY": "Consumer Staples",
    "HPE": "Information Technology", "HLT": "Consumer Discretionary", "HD": "Consumer Discretionary",
    "HON": "Industrials", "HRL": "Consumer Staples", "HST": "Real Estate", "HWM": "Industrials",
    "HPQ": "Information Technology", "HUBB": "Industrials", "HUM": "Health Care", "HBAN": "Financials",
    "HII": "Industrials", "IBM": "Information Technology", "IEX": "Industrials", "IDXX": "Health Care",
    "ITW": "Industrials", "INCY": "Health Care", "IR": "Industrials", "PODD": "Health Care",
    "INTC": "Information Technology", "IBKR": "Financials", "ICE": "Financials", "IFF": "Materials",
    "IP": "Materials", "INTU": "Information Technology", "ISRG": "Health Care", "IVZ": "Financials",
    "INVH": "Real Estate", "IQV": "Health Care", "IRM": "Real Estate", "JBHT": "Industrials",
    "JBL": "Information Technology", "JKHY": "Financials", "J": "Industrials", "JNJ": "Health Care",
    "JCI": "Industrials", "JPM": "Financials", "KVUE": "Consumer Staples", "KDP": "Consumer Staples",
    "KEY": "Financials", "KEYS": "Information Technology", "KMB": "Consumer Staples", "KIM": "Real Estate",
    "KMI": "Energy", "KKR": "Financials", "KLAC": "Information Technology", "KHC": "Consumer Staples",
    "KR": "Consumer Staples", "LHX": "Industrials", "LH": "Health Care", "LRCX": "Information Technology",
    "LVS": "Consumer Discretionary", "LDOS": "Industrials", "LEN": "Consumer Discretionary", "LII": "Industrials",
    "LLY": "Health Care", "LIN": "Materials", "LYV": "Communication Services", "LMT": "Industrials",
    "L": "Financials", "LOW": "Consumer Discretionary", "LULU": "Consumer Discretionary", "LITE": "Information Technology",
    "LYB": "Materials", "MTB": "Financials", "MPC": "Energy", "MAR": "Consumer Discretionary",
    "MRSH": "Financials", "MLM": "Materials", "MAS": "Industrials", "MA": "Financials",
    "MKC": "Consumer Staples", "MCD": "Consumer Discretionary", "MCK": "Health Care", "MDT": "Health Care",
    "MRK": "Health Care", "META": "Communication Services", "MET": "Financials", "MTD": "Health Care",
    "MGM": "Consumer Discretionary", "MCHP": "Information Technology", "MU": "Information Technology",
    "MSFT": "Information Technology", "MAA": "Real Estate", "MRNA": "Health Care", "TAP": "Consumer Staples",
    "MDLZ": "Consumer Staples", "MPWR": "Information Technology", "MNST": "Consumer Staples", "MCO": "Financials",
    "MS": "Financials", "MOS": "Materials", "MSI": "Information Technology", "MSCI": "Financials",
    "NDAQ": "Financials", "NTAP": "Information Technology", "NFLX": "Communication Services", "NEM": "Materials",
    "NWSA": "Communication Services", "NWS": "Communication Services", "NEE": "Utilities", "NKE": "Consumer Discretionary",
    "NI": "Utilities", "NDSN": "Industrials", "NSC": "Industrials", "NTRS": "Financials",
    "NOC": "Industrials", "NCLH": "Consumer Discretionary", "NRG": "Utilities", "NUE": "Materials",
    "NVDA": "Information Technology", "NVR": "Consumer Discretionary", "NXPI": "Information Technology",
    "ORLY": "Consumer Discretionary", "OXY": "Energy", "ODFL": "Industrials", "OMC": "Communication Services",
    "ON": "Information Technology", "OKE": "Energy", "ORCL": "Information Technology", "OTIS": "Industrials",
    "PCAR": "Industrials", "PKG": "Materials", "PLTR": "Information Technology", "PANW": "Information Technology",
    "PSKY": "Communication Services", "PH": "Industrials", "PAYX": "Industrials", "PYPL": "Financials",
    "PNR": "Industrials", "PEP": "Consumer Staples", "PFE": "Health Care", "PCG": "Utilities",
    "PM": "Consumer Staples", "PSX": "Energy", "PNW": "Utilities", "PNC": "Financials",
    "POOL": "Consumer Discretionary", "PPG": "Materials", "PPL": "Utilities", "PFG": "Financials",
    "PG": "Consumer Staples", "PGR": "Financials", "PLD": "Real Estate", "PRU": "Financials",
    "PEG": "Utilities", "PTC": "Information Technology", "PSA": "Real Estate", "PHM": "Consumer Discretionary",
    "PWR": "Industrials", "QCOM": "Information Technology", "DGX": "Health Care", "Q": "Information Technology",
    "RL": "Consumer Discretionary", "RJF": "Financials", "RTX": "Industrials", "O": "Real Estate",
    "REG": "Real Estate", "REGN": "Health Care", "RF": "Financials", "RSG": "Industrials",
    "RMD": "Health Care", "RVTY": "Health Care", "HOOD": "Financials", "ROK": "Industrials",
    "ROL": "Industrials", "ROP": "Information Technology", "ROST": "Consumer Discretionary", "RCL": "Consumer Discretionary",
    "SPGI": "Financials", "CRM": "Information Technology", "SNDK": "Information Technology", "SBAC": "Real Estate",
    "SLB": "Energy", "STX": "Information Technology", "SRE": "Utilities", "NOW": "Information Technology",
    "SHW": "Materials", "SPG": "Real Estate", "SWKS": "Information Technology", "SJM": "Consumer Staples",
    "SW": "Materials", "SNA": "Industrials", "SOLV": "Health Care", "SO": "Utilities",
    "LUV": "Industrials", "SWK": "Industrials", "SBUX": "Consumer Discretionary", "STT": "Financials",
    "STLD": "Materials", "STE": "Health Care", "SYK": "Health Care", "SMCI": "Information Technology",
    "SYF": "Financials", "SNPS": "Information Technology", "SYY": "Consumer Staples", "TMUS": "Communication Services",
    "TROW": "Financials", "TTWO": "Communication Services", "TPR": "Consumer Discretionary", "TRGP": "Energy",
    "TGT": "Consumer Staples", "TEL": "Information Technology", "TDY": "Information Technology", "TER": "Information Technology",
    "TSLA": "Consumer Discretionary", "TXN": "Information Technology", "TPL": "Energy", "TXT": "Industrials",
    "TMO": "Health Care", "TJX": "Consumer Discretionary", "TKO": "Communication Services", "TTD": "Communication Services",
    "TSCO": "Consumer Discretionary", "TT": "Industrials", "TDG": "Industrials", "TRV": "Financials",
    "TRMB": "Information Technology", "TFC": "Financials", "TYL": "Information Technology", "TSN": "Consumer Staples",
    "USB": "Financials", "UBER": "Industrials", "UDR": "Real Estate", "ULTA": "Consumer Discretionary",
    "UNP": "Industrials", "UAL": "Industrials", "UPS": "Industrials", "URI": "Industrials",
    "UNH": "Health Care", "UHS": "Health Care", "VLO": "Energy", "VEEV": "Health Care",
    "VTR": "Real Estate", "VLTO": "Industrials", "VRSN": "Information Technology", "VRSK": "Industrials",
    "VZ": "Communication Services", "VRTX": "Health Care", "VRT": "Industrials", "VTRS": "Health Care",
    "VICI": "Real Estate", "V": "Financials", "VST": "Utilities", "VMC": "Materials",
    "WRB": "Financials", "GWW": "Industrials", "WAB": "Industrials", "WMT": "Consumer Staples",
    "DIS": "Communication Services", "WBD": "Communication Services", "WM": "Industrials", "WAT": "Health Care",
    "WEC": "Utilities", "WFC": "Financials", "WELL": "Real Estate", "WST": "Health Care",
    "WDC": "Information Technology", "WY": "Real Estate", "WSM": "Consumer Discretionary", "WMB": "Energy",
    "WTW": "Financials", "WDAY": "Information Technology", "WYNN": "Consumer Discretionary", "XEL": "Utilities",
    "XYL": "Industrials", "YUM": "Consumer Discretionary", "ZBRA": "Information Technology", "ZBH": "Health Care",
    "ZTS": "Health Care",
}

# ── Ticker -> Şirket Adı ───────────────────────────────────────────────
SP500_NAMES = {
    "MMM": "3M", "AOS": "A. O. Smith", "ABT": "Abbott Laboratories", "ABBV": "AbbVie",
    "ACN": "Accenture", "ADBE": "Adobe", "AMD": "Advanced Micro Devices", "AES": "AES Corporation",
    "AFL": "Aflac", "A": "Agilent Technologies", "APD": "Air Products", "ABNB": "Airbnb",
    "AKAM": "Akamai Technologies", "ALB": "Albemarle", "ARE": "Alexandria Real Estate", "ALGN": "Align Technology",
    "ALLE": "Allegion", "LNT": "Alliant Energy", "ALL": "Allstate", "GOOGL": "Alphabet (Class A)",
    "GOOG": "Alphabet (Class C)", "MO": "Altria", "AMZN": "Amazon", "AMCR": "Amcor",
    "AEE": "Ameren", "AEP": "American Electric Power", "AXP": "American Express", "AIG": "American International Group",
    "AMT": "American Tower", "AWK": "American Water Works", "AMP": "Ameriprise Financial", "AME": "Ametek",
    "AMGN": "Amgen", "APH": "Amphenol", "ADI": "Analog Devices", "AON": "Aon",
    "APA": "APA Corporation", "APO": "Apollo Global Management", "AAPL": "Apple", "AMAT": "Applied Materials",
    "APP": "AppLovin", "APTV": "Aptiv", "ACGL": "Arch Capital Group", "ADM": "Archer Daniels Midland",
    "ARES": "Ares Management", "ANET": "Arista Networks", "AJG": "Arthur J. Gallagher", "AIZ": "Assurant",
    "T": "AT&T", "ATO": "Atmos Energy", "ADSK": "Autodesk", "ADP": "Automatic Data Processing",
    "AZO": "AutoZone", "AVB": "AvalonBay Communities", "AVY": "Avery Dennison", "AXON": "Axon Enterprise",
    "BKR": "Baker Hughes", "BALL": "Ball Corporation", "BAC": "Bank of America", "BAX": "Baxter International",
    "BDX": "Becton Dickinson", "BRK-B": "Berkshire Hathaway", "BBY": "Best Buy", "TECH": "Bio-Techne",
    "BIIB": "Biogen", "BLK": "BlackRock", "BX": "Blackstone", "XYZ": "Block (Square)",
    "BNY": "BNY Mellon", "BA": "Boeing", "BKNG": "Booking Holdings", "BSX": "Boston Scientific",
    "BMY": "Bristol Myers Squibb", "AVGO": "Broadcom", "BR": "Broadridge", "BRO": "Brown & Brown", "BF-B": "Brown–Forman",
    "BLDR": "Builders FirstSource", "BG": "Bunge Global", "BXP": "BXP", "CHRW": "C.H. Robinson",
    "CDNS": "Cadence Design Systems", "CPT": "Camden Property Trust", "CPB": "Campbell's", "COF": "Capital One",
    "CAH": "Cardinal Health", "CCL": "Carnival", "CARR": "Carrier Global", "CVNA": "Carvana",
    "CASY": "Casey's", "CAT": "Caterpillar", "CBOE": "Cboe Global Markets", "CBRE": "CBRE Group",
    "CDW": "CDW Corporation", "COR": "Cencora", "CNC": "Centene", "CNP": "CenterPoint Energy",
    "CF": "CF Industries", "CRL": "Charles River Laboratories", "SCHW": "Charles Schwab", "CHTR": "Charter Communications",
    "CVX": "Chevron", "CMG": "Chipotle Mexican Grill", "CB": "Chubb", "CHD": "Church & Dwight",
    "CIEN": "Ciena", "CI": "Cigna", "CINF": "Cincinnati Financial", "CTAS": "Cintas",
    "CSCO": "Cisco", "C": "Citigroup", "CFG": "Citizens Financial Group", "CLX": "Clorox",
    "CME": "CME Group", "CMS": "CMS Energy", "KO": "Coca-Cola", "CTSH": "Cognizant",
    "COHR": "Coherent", "COIN": "Coinbase", "CL": "Colgate-Palmolive", "CMCSA": "Comcast",
    "FIX": "Comfort Systems USA", "CAG": "Conagra Brands", "COP": "ConocoPhillips", "ED": "Consolidated Edison",
    "STZ": "Constellation Brands", "CEG": "Constellation Energy", "COO": "Cooper Companies", "CPRT": "Copart",
    "GLW": "Corning", "CPAY": "Corpay", "CTVA": "Corteva", "CSGP": "CoStar Group",
    "COST": "Costco", "CRH": "CRH", "CRWD": "CrowdStrike", "CCI": "Crown Castle",
    "CSX": "CSX", "CMI": "Cummins", "CVS": "CVS Health", "DHR": "Danaher",
    "DRI": "Darden Restaurants", "DDOG": "Datadog", "DVA": "DaVita", "DECK": "Deckers Brands",
    "DE": "Deere & Company", "DELL": "Dell Technologies", "DAL": "Delta Air Lines", "DVN": "Devon Energy",
    "DXCM": "Dexcom", "FANG": "Diamondback Energy", "DLR": "Digital Realty", "DG": "Dollar General",
    "DLTR": "Dollar Tree", "D": "Dominion Energy", "DPZ": "Domino's", "DASH": "DoorDash",
    "DOV": "Dover", "DOW": "Dow", "DHI": "D. R. Horton", "DTE": "DTE Energy",
    "DUK": "Duke Energy", "DD": "DuPont", "ETN": "Eaton", "EBAY": "eBay",
    "SATS": "EchoStar", "ECL": "Ecolab", "EIX": "Edison International", "EW": "Edwards Lifesciences",
    "EA": "Electronic Arts", "ELV": "Elevance Health", "EME": "Emcor", "EMR": "Emerson Electric",
    "ETR": "Entergy", "EOG": "EOG Resources", "EPAM": "EPAM Systems", "EQT": "EQT Corporation",
    "EFX": "Equifax", "EQIX": "Equinix", "EQR": "Equity Residential", "ERIE": "Erie Indemnity",
    "ESS": "Essex Property Trust", "EL": "Estée Lauder", "EG": "Everest Group", "EVRG": "Evergy",
    "ES": "Eversource Energy", "EXC": "Exelon", "EXE": "Expand Energy", "EXPE": "Expedia Group",
    "EXPD": "Expeditors International", "EXR": "Extra Space Storage", "XOM": "ExxonMobil", "FFIV": "F5",
    "FDS": "FactSet", "FICO": "Fair Isaac", "FAST": "Fastenal", "FRT": "Federal Realty",
    "FDX": "FedEx", "FIS": "Fidelity National Information Services", "FITB": "Fifth Third Bancorp", "FSLR": "First Solar",
    "FE": "FirstEnergy", "FISV": "Fiserv", "F": "Ford Motor Company", "FTNT": "Fortinet",
    "FTV": "Fortive", "FOXA": "Fox Corporation (Class A)", "FOX": "Fox Corporation (Class B)", "BEN": "Franklin Resources",
    "FCX": "Freeport-McMoRan", "GRMN": "Garmin", "IT": "Gartner", "GE": "GE Aerospace",
    "GEHC": "GE HealthCare", "GEV": "GE Vernova", "GEN": "Gen Digital", "GNRC": "Generac",
    "GD": "General Dynamics", "GIS": "General Mills", "GM": "General Motors", "GPC": "Genuine Parts",
    "GILD": "Gilead Sciences", "GPN": "Global Payments", "GL": "Globe Life", "GDDY": "GoDaddy",
    "GS": "Goldman Sachs", "HAL": "Halliburton", "HIG": "Hartford", "HAS": "Hasbro",
    "HCA": "HCA Healthcare", "DOC": "Healthpeak Properties", "HSIC": "Henry Schein", "HSY": "Hershey",
    "HPE": "Hewlett Packard Enterprise", "HLT": "Hilton Worldwide", "HD": "Home Depot", "HON": "Honeywell",
    "HRL": "Hormel Foods", "HST": "Host Hotels & Resorts", "HWM": "Howmet Aerospace", "HPQ": "HP",
    "HUBB": "Hubbell", "HUM": "Humana", "HBAN": "Huntington Bancshares", "HII": "Huntington Ingalls",
    "IBM": "IBM", "IEX": "IDEX Corporation", "IDXX": "Idexx Laboratories", "ITW": "Illinois Tool Works",
    "INCY": "Incyte", "IR": "Ingersoll Rand", "PODD": "Insulet", "INTC": "Intel",
    "IBKR": "Interactive Brokers", "ICE": "Intercontinental Exchange", "IFF": "International Flavors & Fragrances", "IP": "International Paper",
    "INTU": "Intuit", "ISRG": "Intuitive Surgical", "IVZ": "Invesco", "INVH": "Invitation Homes",
    "IQV": "IQVIA", "IRM": "Iron Mountain", "JBHT": "J.B. Hunt", "JBL": "Jabil",
    "JKHY": "Jack Henry & Associates", "J": "Jacobs Solutions", "JNJ": "Johnson & Johnson", "JCI": "Johnson Controls",
    "JPM": "JPMorgan Chase", "KVUE": "Kenvue", "KDP": "Keurig Dr Pepper", "KEY": "KeyCorp",
    "KEYS": "Keysight Technologies", "KMB": "Kimberly-Clark", "KIM": "Kimco Realty", "KMI": "Kinder Morgan",
    "KKR": "KKR", "KLAC": "KLA Corporation", "KHC": "Kraft Heinz", "KR": "Kroger",
    "LHX": "L3Harris", "LH": "Labcorp", "LRCX": "Lam Research", "LVS": "Las Vegas Sands",
    "LDOS": "Leidos", "LEN": "Lennar", "LII": "Lennox International", "LLY": "Eli Lilly",
    "LIN": "Linde", "LYV": "Live Nation Entertainment", "LMT": "Lockheed Martin", "L": "Loews",
    "LOW": "Lowe's", "LULU": "Lululemon Athletica", "LITE": "Lumentum", "LYB": "LyondellBasell",
    "MTB": "M&T Bank", "MPC": "Marathon Petroleum", "MAR": "Marriott International", "MRSH": "Marsh McLennan",
    "MLM": "Martin Marietta Materials", "MAS": "Masco", "MA": "Mastercard", "MKC": "McCormick",
    "MCD": "McDonald's", "MCK": "McKesson", "MDT": "Medtronic", "MRK": "Merck",
    "META": "Meta Platforms", "MET": "MetLife", "MTD": "Mettler Toledo", "MGM": "MGM Resorts",
    "MCHP": "Microchip Technology", "MU": "Micron Technology", "MSFT": "Microsoft", "MAA": "Mid-America Apartment Communities",
    "MRNA": "Moderna", "TAP": "Molson Coors", "MDLZ": "Mondelez International", "MPWR": "Monolithic Power Systems",
    "MNST": "Monster Beverage", "MCO": "Moody's", "MS": "Morgan Stanley", "MOS": "Mosaic",
    "MSI": "Motorola Solutions", "MSCI": "MSCI", "NDAQ": "Nasdaq", "NTAP": "NetApp",
    "NFLX": "Netflix", "NEM": "Newmont", "NWSA": "News Corp (Class A)", "NWS": "News Corp (Class B)",
    "NEE": "NextEra Energy", "NKE": "Nike", "NI": "NiSource", "NDSN": "Nordson",
    "NSC": "Norfolk Southern", "NTRS": "Northern Trust", "NOC": "Northrop Grumman", "NCLH": "Norwegian Cruise Line",
    "NRG": "NRG Energy", "NUE": "Nucor", "NVDA": "Nvidia", "NVR": "NVR",
    "NXPI": "NXP Semiconductors", "ORLY": "O'Reilly Automotive", "OXY": "Occidental Petroleum", "ODFL": "Old Dominion",
    "OMC": "Omnicom Group", "ON": "ON Semiconductor", "OKE": "Oneok", "ORCL": "Oracle",
    "OTIS": "Otis Worldwide", "PCAR": "Paccar", "PKG": "Packaging Corporation of America", "PLTR": "Palantir Technologies",
    "PANW": "Palo Alto Networks", "PSKY": "Paramount Skydance", "PH": "Parker Hannifin", "PAYX": "Paychex",
    "PYPL": "PayPal", "PNR": "Pentair", "PEP": "PepsiCo", "PFE": "Pfizer",
    "PCG": "PG&E", "PM": "Philip Morris International", "PSX": "Phillips 66", "PNW": "Pinnacle West Capital",
    "PNC": "PNC Financial Services", "POOL": "Pool Corporation", "PPG": "PPG Industries", "PPL": "PPL Corporation",
    "PFG": "Principal Financial Group", "PG": "Procter & Gamble", "PGR": "Progressive", "PLD": "Prologis",
    "PRU": "Prudential Financial", "PEG": "Public Service Enterprise Group", "PTC": "PTC", "PSA": "Public Storage",
    "PHM": "PulteGroup", "PWR": "Quanta Services", "QCOM": "Qualcomm", "DGX": "Quest Diagnostics",
    "Q": "Qnity Electronics", "RL": "Ralph Lauren", "RJF": "Raymond James Financial", "RTX": "RTX Corporation",
    "O": "Realty Income", "REG": "Regency Centers", "REGN": "Regeneron Pharmaceuticals", "RF": "Regions Financial",
    "RSG": "Republic Services", "RMD": "ResMed", "RVTY": "Revvity", "HOOD": "Robinhood Markets",
    "ROK": "Rockwell Automation", "ROL": "Rollins", "ROP": "Roper Technologies", "ROST": "Ross Stores",
    "RCL": "Royal Caribbean Group", "SPGI": "S&P Global", "CRM": "Salesforce", "SNDK": "Sandisk",
    "SBAC": "SBA Communications", "SLB": "Schlumberger", "STX": "Seagate Technology", "SRE": "Sempra",
    "NOW": "ServiceNow", "SHW": "Sherwin-Williams", "SPG": "Simon Property Group", "SWKS": "Skyworks Solutions",
    "SJM": "J.M. Smucker", "SW": "Smurfit Westrock", "SNA": "Snap-on", "SOLV": "Solventum",
    "SO": "Southern Company", "LUV": "Southwest Airlines", "SWK": "Stanley Black & Decker", "SBUX": "Starbucks",
    "STT": "State Street", "STLD": "Steel Dynamics", "STE": "Steris", "SYK": "Stryker",
    "SMCI": "Supermicro", "SYF": "Synchrony Financial", "SNPS": "Synopsys", "SYY": "Sysco",
    "TMUS": "T-Mobile US", "TROW": "T. Rowe Price", "TTWO": "Take-Two Interactive", "TPR": "Tapestry",
    "TRGP": "Targa Resources", "TGT": "Target", "TEL": "TE Connectivity", "TDY": "Teledyne Technologies",
    "TER": "Teradyne", "TSLA": "Tesla", "TXN": "Texas Instruments", "TPL": "Texas Pacific Land",
    "TXT": "Textron", "TMO": "Thermo Fisher Scientific", "TJX": "TJX Companies", "TKO": "TKO Group Holdings",
    "TTD": "The Trade Desk", "TSCO": "Tractor Supply", "TT": "Trane Technologies", "TDG": "TransDigm Group",
    "TRV": "Travelers", "TRMB": "Trimble", "TFC": "Truist Financial", "TYL": "Tyler Technologies",
    "TSN": "Tyson Foods", "USB": "U.S. Bancorp", "UBER": "Uber", "UDR": "UDR",
    "ULTA": "Ulta Beauty", "UNP": "Union Pacific", "UAL": "United Airlines", "UPS": "United Parcel Service",
    "URI": "United Rentals", "UNH": "UnitedHealth Group", "UHS": "Universal Health Services", "VLO": "Valero Energy",
    "VEEV": "Veeva Systems", "VTR": "Ventas", "VLTO": "Veralto", "VRSN": "Verisign",
    "VRSK": "Verisk Analytics", "VZ": "Verizon", "VRTX": "Vertex Pharmaceuticals", "VRT": "Vertiv",
    "VTRS": "Viatris", "VICI": "Vici Properties", "V": "Visa", "VST": "Vistra",
    "VMC": "Vulcan Materials", "WRB": "W. R. Berkley", "GWW": "W. W. Grainger", "WAB": "Wabtec",
    "WMT": "Walmart", "DIS": "Walt Disney", "WBD": "Warner Bros. Discovery", "WM": "Waste Management",
    "WAT": "Waters Corporation", "WEC": "WEC Energy Group", "WFC": "Wells Fargo", "WELL": "Welltower",
    "WST": "West Pharmaceutical Services", "WDC": "Western Digital", "WY": "Weyerhaeuser", "WSM": "Williams-Sonoma",
    "WMB": "Williams Companies", "WTW": "Willis Towers Watson", "WDAY": "Workday", "WYNN": "Wynn Resorts",
    "XEL": "Xcel Energy", "XYL": "Xylem", "YUM": "Yum! Brands", "ZBRA": "Zebra Technologies",
    "ZBH": "Zimmer Biomet", "ZTS": "Zoetis",
}

# Tüm S&P 500 sembolleri
SP500_ALL = list(SP500_SECTORS.keys())

# Hızlı tarama için mega-cap çekirdek (≈ ilk 30)
SP500_30 = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "GOOG", "META", "AVGO", "TSLA", "BRK-B",
    "JPM", "LLY", "V", "UNH", "XOM", "MA", "COST", "HD", "PG", "JNJ",
    "WMT", "ABBV", "NFLX", "BAC", "KO", "CRM", "ORCL", "CVX", "MRK", "PEP",
]

# Geniş büyük-cap havuzu (≈ ilk 100). S&P 100'e yakın bir seçki.
SP500_100 = SP500_30 + [
    "ADBE", "AMD", "TMO", "CSCO", "ACN", "MCD", "ABT", "LIN", "DHR", "INTU",
    "TXN", "WFC", "QCOM", "PM", "AMGN", "CAT", "GE", "VZ", "NOW", "ISRG",
    "IBM", "DIS", "SPGI", "GS", "AXP", "RTX", "T", "PFE", "UBER", "BKNG",
    "NEE", "LOW", "HON", "PLD", "MS", "BLK", "C", "SCHW", "ELV", "SYK",
    "TJX", "BSX", "ADP", "MDT", "DE", "GILD", "VRTX", "LMT", "ADI", "MMC",
    "CB", "REGN", "PANW", "MU", "KLAC", "SBUX", "BMY", "AMT", "CI", "SO",
    "MO", "DUK", "APH", "ETN", "ANET", "CME", "ICE", "TT", "WM", "PGR",
]


def get_all_sp500_symbols(live: bool = False) -> list:
    """
    S&P 500 bileşen listesini döndürür.
    live=True ise (ve internet varsa) Wikipedia'dan güncel listeyi çeker;
    aksi halde / hata durumunda statik SP500_ALL listesine düşer.
    """
    if not live:
        return list(SP500_ALL)
    try:
        import pandas as pd
        tables = pd.read_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")
        df = tables[0]
        syms = [str(s).strip().upper().replace(".", "-") for s in df["Symbol"].tolist()]
        syms = [s for s in syms if s]
        if len(syms) >= 400:
            return syms
        logger.warning("Wikipedia listesi beklenenden kısa, statik listeye dönülüyor.")
    except Exception as e:
        logger.warning(f"Canlı S&P 500 listesi alınamadı, statik liste kullanılıyor: {e}")
    return list(SP500_ALL)


def get_sector(ticker: str) -> str:
    """Sembolün GICS sektörünü döndürür (bilinmiyorsa boş string)."""
    return SP500_SECTORS.get(ticker.upper().replace(".", "-"), "")


def get_name(ticker: str) -> str:
    """Sembolün şirket adını döndürür (bilinmiyorsa sembolün kendisi)."""
    t = ticker.upper().replace(".", "-")
    return SP500_NAMES.get(t, t)


def get_symbols_with_names() -> list:
    """[{symbol, name, sector}] listesi döndürür (alfabetik)."""
    return [
        {"symbol": s, "name": SP500_NAMES.get(s, s), "sector": SP500_SECTORS.get(s, "")}
        for s in sorted(SP500_ALL)
    ]
