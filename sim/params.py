# SqueekNest Köy · ekonomi parametreleri (taslak v1). Zaman birimi: saat. Kaynak sırası: odun, ayçiçeği, taş, demir.
RES = ['Odun', 'Ayçiçeği', 'Taş', 'Demir']
NIGHTS = [11182, 10891, 10587, 13297, 12561, 8505, 8984]   # Squeektoshi'nin gerçek 7 gecesi (settled geçiş)
SEED_PER_PASS = 0.1          # 10 geçiş = 1 Çekirdek
XP_PER_PASS = 0.01           # 100 geçiş = 1 kahraman XP'si
PASS_PER_BONUS = 180 * 24    # o günün koşu bonusu = geçiş / 4320  (11.000 geçiş ≈ +%255)
WITNESS = 200                # zoomies tanıklığı (günde en fazla 1)

# kaynak alanı (her türden 2): saatlik taban üretim
FIELD_BASE, FIELD_G = 12.0, 1.4             # v8: +50% (was 8): armies arrive days earlier
FIELD_COST = {0: (30, 50, 45, 40), 1: (45, 20, 50, 45), 2: (45, 45, 20, 50), 3: (50, 45, 45, 10)}   # v2: playtest rebalance
FIELD_CG, FIELD_T1, FIELD_TG = 1.60, 0.4, 1.4

# bina: (seviye-1 maliyeti, maliyet artışı, seviye-1 süresi (saat), süre artışı, en yüksek seviye, başlangıç seviyesi)
B = {
    # v2 (playtest): costs spread over all four resources; Wood used to starve the game while Food piled up
    'merkez':  ((180, 170, 180, 170), 1.75, 0.75, 1.50, 10, 1),
    'cark':    ((100, 110, 90, 100),  1.68, 0.6, 1.45, 10, 0),
    'ambar':   ((110, 100, 100, 90),  1.28, 0.45, 1.20, 20, 0),
    'yanak':   ((70, 60, 80, 50),     1.28, 0.45, 1.20, 20, 0),
    'yuva':    ((70, 110, 70, 50),    1.55, 0.5, 1.45, 10, 0),
    'kisla':   ((150, 150, 130, 170), 1.62, 0.6, 1.45, 10, 0),
    'akademi': ((160, 160, 170, 210), 1.62, 0.6, 1.45, 10, 0),
    'demirci': ((130, 110, 140, 260), 1.62, 0.6, 1.45, 10, 0),
    'sur':     ((80, 60, 220, 140),   1.62, 0.6, 1.45, 10, 1),
    'klan':    ((190, 200, 180, 130), 1.62, 0.6, 1.45, 10, 0),
    'pazar':   ((150, 200, 150, 150), 1.62, 0.6, 1.45, 10, 0),     # v2: opens at Town Hall 2, no research
}
NAMES = {'merkez': 'Köy Merkezi', 'cark': 'Çark Kulesi', 'ambar': 'Ambar', 'yanak': 'Yanak Kesesi', 'yuva': 'Yuva',
         'kisla': 'Kışla', 'akademi': 'Akademi', 'demirci': 'Demirci', 'sur': 'Sur', 'klan': 'Klan Evi', 'pazar': 'Pazar'}
SEED_COST = {'merkez': (667, 1.5), 'cark': (300, 1.5)}       # Çekirdek: c * g^(L-1)
MULTI = {'ambar': 2, 'yanak': 2, 'yuva': 2}                   # simülasyonda en fazla kaç tane
BASE_TYPES = {'cark', 'ambar', 'yuva', 'kisla', 'akademi'}
MERKEZ_SPEEDUP = 0.03         # merkez seviyesi başına inşaat süresi -%3

STORE_BASE, AMBAR_CAP, AMBAR_G = 1000, 1200, 1.22
PROT_BASE, YANAK_CAP, YANAK_G = 150, 250, 1.22
POP_BASE = 30
def yuva_pop(L): return 0 if L == 0 else 20 * L * 1.12 ** (L - 1)
CARK_STEP = 0.25              # Çark Kulesi seviye başı koşu bonusu tavanı
SUR_STEP = 0.04               # sur seviye başı savunma
DEMIRCI_STEP = 0.02           # demirci seviye başı saldırı/savunma
KISLA_SPEED = 0.90            # kışla seviye başı eğitim süresi çarpanı
BASE_DEF_PER_MERKEZ = 40      # köylülerin savunması

# araştırma: kademe
RESEARCH = {'akinci': 1, 'yanak': 1, 'kalkan': 2, 'kemirici': 2, 'izci': 2, 'demirci': 2, 'klan': 2,
            'suvari': 3, 'buyukyanak': 3, 'mancinik': 4, 'sargi': 4, 'buyukyanak2': 5, 'hizli': 5}
def research_cost(t): tot = 600 * 2.2 ** (t - 1); return tuple(tot * f for f in (0.25, 0.25, 0.25, 0.25))
def research_seed(t): return 300 * 2 ** (t - 1)
def research_time(t, ak): return 2 * 1.8 ** (t - 1) * 0.95 ** (ak - 1)
TIER_AT = [0, 1, 2, 4, 6, 8]                       # v2: Academy level that opens each tier
def tier_open(ak): return max(t for t in range(6) if TIER_AT[t] <= ak)

# birimler: saldırı, savunma, hız (kare/saat), taşıma, bakım, maliyet, eğitim dakikası, araştırma
U = {
    'piyade':   dict(a=40, d=35, s=6,  c=50,  u=1, cost=(50, 45, 45, 40),    m=15, r=None),
    'akinci':   dict(a=20, d=15, s=8,  c=120, u=1, cost=(55, 55, 30, 20),    m=12, r='akinci'),
    'kalkan':   dict(a=15, d=70, s=5,  c=20,  u=1, cost=(60, 45, 70, 45),    m=18, r='kalkan'),
    'kemirici': dict(a=75, d=20, s=6,  c=40,  u=1, cost=(55, 55, 35, 100),   m=20, r='kemirici'),
    'suvari':   dict(a=90, d=50, s=14, c=80,  u=2, cost=(120, 130, 90, 170), m=35, r='suvari'),
    'mancinik': dict(a=30, d=10, s=3,  c=0,   u=4, cost=(320, 140, 300, 170), m=70, r='mancinik'),
    'izci':     dict(a=0,  d=5,  s=16, c=0,   u=1, cost=(30, 40, 20, 40),    m=8,  r='izci'),     # v2: Scout
}
UNAMES = {'piyade': 'Kabuk Kırıcı', 'akinci': 'Yanak Akıncısı', 'kalkan': 'Talaş Kalkanı', 'kemirici': 'Kemirici',
          'suvari': 'Top Süvarisi', 'mancinik': 'Fındık Mancınığı'}
UPKEEP_FOOD = 0.5             # v2: Food per upkeep point per hour

# kahraman
HERO_BASE, HERO_PER_POINT = 50, 25          # v4: modest champion; v5: every village has one
HERO_SQUEEK_BOOST = 1.10      # v5: a wallet holding a Squeek: champion XP and stats x 1.1
HERO_PCT = 0.005              # attack/defense per point; 10% at 20 points
HERO_CARRY = 0.01             # carry per point, max 20%
HERO_CAP = 0.10
HERO_CARRY_CAP = 0.20
# v4: Squeek holders build faster: time x (1 - SQUEEK_BUILD_MAX x (1 - 0.5^n) x min(1, laps / SQUEEK_BUILD_LAPS))
SQUEEK_BUILD_MAX, SQUEEK_BUILD_LAPS = 0.30, 11000
HERO_INJURY = 12
def hero_level(xp):
    import math
    return min(30, 1 + int(math.sqrt(max(0, xp) / 100)))
BATTLE_XP_DIV = 20            # öldürülen birim maliyeti / 20

# koruma
BEGINNER_DAYS = 7
RAIDS_PER_TARGET_DAY = 3
CATAPULT_PER_LEVEL, CATAPULT_MAX = 20, 2
SARGI = 0.10
