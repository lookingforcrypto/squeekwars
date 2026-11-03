# SqueekNest Köy · ajan tabanlı simülasyon: kaynak + bina + araştırma + asker + yağma + kahraman.
import math, random, heapq, json, sys
from params import *

ARCH = {  # pay, günlük giriş, ordu payı, bırakma olasılığı, tanık olasılığı
    'ciftci':  dict(share=0.30, logins=3, army=0.15, quit=0.10, wit=0.4),
    'dengeli': dict(share=0.25, logins=3, army=0.30, quit=0.10, wit=0.4),
    'yagmaci': dict(share=0.20, logins=6, army=0.55, quit=0.10, wit=0.3),
    'gundelik':dict(share=0.25, logins=1, army=0.08, quit=0.40, wit=0.1),
}
ARCH_TR = {'ciftci': 'Çiftçi', 'dengeli': 'Dengeli', 'yagmaci': 'Yağmacı', 'gundelik': 'Gündelik'}

def fprod(L): return 0.0 if L == 0 else FIELD_BASE * FIELD_G ** (L - 1)
def bcost(name, L): c, g = B[name][0], B[name][1]; return tuple(x * g ** (L - 1) for x in c)
def btime(name, L): return B[name][2] * B[name][3] ** (L - 1)
def fcost(i, L): return tuple(x * FIELD_CG ** (L - 1) for x in FIELD_COST[i // 2])
def ftime(L): return FIELD_T1 * FIELD_TG ** (L - 1)
def bseed(name, L):
    if name not in SEED_COST: return 0.0
    c, g = SEED_COST[name]; return c * g ** (L - 1)

class V:
    def __init__(s, sim, vid, x, y, arche, found, quit):
        s.sim = sim; s.id = vid; s.x, s.y = x, y; s.arche = arche; s.found = found; s.quit = quit
        s.t = found; s.stock = [750.0] * 4; s.seeds = 0.0
        s.fields = [1] * 8; s.merkez = 1; s.sur = 1; s.bld = []
        s.q = []; s.rq = None; s.tq = None; s.research = set()
        s.units = {k: 0 for k in U}; s.away = {k: 0 for k in U}
        s.xp = 0.0; s.pts = dict(kuv=0, atk=0, deff=0, car=0); s.inj = -1.0; s.hero_home = True
        s.raided = {}; s.nlogin = 0; s.wday = -1
        s.st = dict(prod=[0.0] * 4, lin=[0.0] * 4, lout=[0.0] * 4, seeds_in=0.0, seeds_out=0.0, att=0, attwin=0,
                    dfn=0, dfnlost=0, wipe=0, ulost=0, utrain=0, block=0, starve=0.0)
    # --- derived ---
    def lvl(s, typ): return max([L for t, L in s.bld if t == typ], default=0)
    def storage(s): return STORE_BASE + sum(AMBAR_CAP * AMBAR_G ** (L - 1) for t, L in s.bld if t == 'ambar' and L > 0)
    def prot(s): return PROT_BASE + sum(YANAK_CAP * YANAK_G ** (L - 1) for t, L in s.bld if t == 'yanak' and L > 0)
    def popcap(s): return POP_BASE + sum(yuva_pop(L) for t, L in s.bld if t == 'yuva')
    def upkeep(s): return sum((s.units[k] + s.away[k]) * U[k]['u'] for k in U)
    def base(s, r): return fprod(s.fields[2 * r]) + fprod(s.fields[2 * r + 1])
    def plots(s): return min(12, 3 + s.merkez)
    def hlevel(s): return hero_level(s.xp)
    def hero_ok(s, t): return s.hero_home and t >= s.inj
    def hkuv(s): return HERO_BASE + HERO_PER_POINT * s.pts['kuv']
    def hatk(s): return min(HERO_CAP, HERO_PCT * s.pts['atk'])
    def hdef(s): return min(HERO_CAP, HERO_PCT * s.pts['deff'])
    def hcar(s): return min(HERO_CARRY_CAP, HERO_CARRY * s.pts['car'])
    def mult(s, d): return min(CARK_STEP * s.lvl('cark'), s.sim.P[d] / PASS_PER_BONUS)
    # --- time ---
    def advance(s, t1):
        t = s.t
        while t < t1 - 1e-9:
            d = int(t // 24); end = min(t1, (d + 1) * 24); h = end - t
            m = s.mult(d); cap = s.storage(); up = s.upkeep() * UPKEEP_FOOD
            for r in range(4):
                p = s.base(r) * (1 + m) * h; s.st['prod'][r] += p
                v = s.stock[r] + p - (up * h if r == 1 else 0)
                if r == 1 and v < 0:
                    frac = min(1.0, -v / max(1e-9, up * h)); s.st['starve'] += frac
                    for k in U: s.units[k] = int(s.units[k] * (1 - frac))
                    v = 0.0
                s.stock[r] = min(cap, max(0.0, v))
            if abs(end - (d + 1) * 24) < 1e-9:      # yeni gün: gecenin koşusu
                p = s.sim.P[d + 1]; s.seeds += p * SEED_PER_PASS; s.st['seeds_in'] += p * SEED_PER_PASS; s.xp += p * XP_PER_PASS
            t = end
        s.t = max(s.t, t1)
    def checkpoint(s, t):
        while True:
            ev = [(x[0], k) for x, k in ((s.q[0] if s.q else None, 'b'), (s.rq, 'r'), (s.tq, 't')) if x and x[0] <= t]
            if not ev: break
            te, k = min(ev); s.advance(te)
            if k == 'b':
                _, kind, ref, _j = s.q.pop(0)
                if kind == 'field': s.fields[ref] += 1
                elif kind == 'merkez': s.merkez += 1
                elif kind == 'sur': s.sur += 1
                elif kind == 'bld': s.bld[ref][1] += 1
                elif kind == 'new': s.bld.append([ref, 1])
            elif k == 'r': s.research.add(s.rq[1]); s.rq = None
            else: s.units[s.tq[1]] += s.tq[2]; s.st['utrain'] += s.tq[2]; s.tq = None
        s.advance(t)
    # --- defence ---
    def defense(s, t):
        dm = 1 + DEMIRCI_STEP * s.lvl('demirci')
        d = sum(s.units[k] * U[k]['d'] for k in U) * dm
        hb = 0.0
        if s.hero_ok(t): d += s.hkuv(); hb = s.hdef()
        return d * (1 + hb) * (1 + SUR_STEP * s.sur) + BASE_DEF_PER_MERKEZ * s.merkez
    def lootable(s): pr = s.prot(); return [max(0.0, x - pr) for x in s.stock]
    # --- decisions ---
    def candidates(s):
        out = []; sp = 1 - MERKEZ_SPEEDUP * (s.merkez - 1)
        busy = {(o[1], o[2]) for o in s.q}
        for i, L in enumerate(s.fields):
            if ('field', i) in busy: continue
            if L < s.merkez and L < 10: out.append(('field', i, 'field', fcost(i, L + 1), 0.0, ftime(L + 1) * sp))
        if s.merkez < 10 and ('merkez', None) not in busy: out.append(('merkez', None, 'merkez', bcost('merkez', s.merkez + 1), bseed('merkez', s.merkez + 1), btime('merkez', s.merkez + 1) * sp))
        if s.sur < min(10, s.merkez) and ('sur', None) not in busy: out.append(('sur', None, 'sur', bcost('sur', s.sur + 1), 0.0, btime('sur', s.sur + 1) * sp))
        for j, (t, L) in enumerate(s.bld):
            if ('bld', j) in busy: continue
            lim = min(B[t][4], 2 * s.merkez if t in ('ambar', 'yanak') else s.merkez)
            if L < lim: out.append(('bld', j, t, bcost(t, L + 1), bseed(t, L + 1), btime(t, L + 1) * sp))
        newq = [o[2] for o in s.q if o[1] == 'new']
        if len(s.bld) + len(newq) < s.plots():
            for t in B:
                if t in ('merkez', 'sur') or t in newq: continue
                if t not in BASE_TYPES and t not in s.research: continue
                if sum(1 for x, _ in s.bld if x == t) >= MULTI.get(t, 1): continue
                out.append(('new', t, t, bcost(t, 1), bseed(t, 1), btime(t, 1) * sp))
        return out
    def weight(s, typ, ref, cost, t):
        a = s.arche; st = s.storage(); pop_used = s.upkeep() / max(1, s.popcap())
        if typ == 'field':
            r = ref // 2; need = 1.3 if s.stock[r] == min(s.stock) else 1.0
            if r == 1 and s.upkeep() > 0.5 * s.base(1) * (1 + s.mult(int(t // 24))): need *= 1.6
            return 3.0 * need
        if typ == 'cark': return 6.0
        if typ == 'merkez':
            capped = sum(1 for L in s.fields if L >= s.merkez) / 8
            return 2.0 + 6.0 * capped
        if typ == 'ambar': return 5.0 if max(s.stock) > 0.8 * st or s.st['block'] > 0 else 0.6
        if typ == 'yanak': return {'ciftci': 1.6, 'gundelik': 1.6, 'dengeli': 1.0, 'yagmaci': 1.2}[a] * (2.0 if s.st['lout'][0] > 0 else 1.0)
        if typ == 'yuva':
            if pop_used > 0.75: return {'yagmaci': 4.0, 'dengeli': 2.5, 'ciftci': 1.5, 'gundelik': 1.0}[a]
            return 0.3
        if typ == 'kisla': return {'yagmaci': 3.0, 'dengeli': 1.5, 'ciftci': 0.8, 'gundelik': 0.5}[a]
        if typ == 'akademi': return {'yagmaci': 2.0, 'dengeli': 1.5, 'ciftci': 1.0, 'gundelik': 0.6}[a]
        if typ == 'demirci': return {'yagmaci': 1.5, 'dengeli': 1.0, 'ciftci': 0.6, 'gundelik': 0.3}[a]
        if typ == 'sur': return {'ciftci': 1.8, 'dengeli': 1.5, 'yagmaci': 0.5, 'gundelik': 1.0}[a]
        return 0.25
    def plan_build(s, t):
        st = s.storage(); best = None
        for kind, ref, typ, cost, seeds, tm in s.candidates():
            if max(cost) > st:
                if typ == 'merkez': s.st['block'] += 1
                continue
            sc = s.weight(typ, ref if kind == 'field' else None, cost, t) / (sum(cost) + seeds)
            if best is None or sc > best[0]: best = (sc, kind, ref, typ, cost, seeds, tm)
        return best
    def afford(s, cost, seeds=0.0, reserve=(0, 0, 0, 0)):
        return all(s.stock[r] - cost[r] >= reserve[r] - 1e-6 for r in range(4)) and s.seeds >= seeds
    def pay(s, cost, seeds=0.0):
        for r in range(4): s.stock[r] -= cost[r]
        s.seeds -= seeds; s.st['seeds_out'] += seeds
    def login(s, t):
        s.checkpoint(t); s.nlogin += 1; A = ARCH[s.arche]; d = int(t // 24)
        if s.wday != d:
            s.wday = d
            if s.sim.rng.random() < A['wit']: s.seeds += WITNESS; s.st['seeds_in'] += WITNESS
        # kahraman puanları
        free = 4 * s.hlevel() - sum(s.pts.values())
        order = {'yagmaci': ['atk', 'car'], 'dengeli': ['deff', 'atk'], 'ciftci': ['deff'], 'gundelik': ['deff']}[s.arche]
        while free > 0:
            for k in order:
                if s.pts[k] < 25: s.pts[k] += 1; break
            else: s.pts['kuv'] += 1
            free -= 1
        reserve = (0, 0, 0, 0)
        while len(s.q) < s.sim.slots * s.sim.depth:
            ends = []
            for j in range(s.sim.slots):
                mine = [o for o in s.q if o[3] == j]
                ends.append((len(mine), max([o[0] for o in mine], default=t), j))
            n_in, end_j, j = min(ends, key=lambda e: (e[0], e[1]))
            if n_in >= s.sim.depth: break
            b = s.plan_build(t)
            if not b: break
            sc, kind, ref, typ, cost, seeds, tm = b
            if not s.afford(cost, seeds): reserve = cost; break
            start = max(t, end_j)
            s.pay(cost, seeds); s.q.append((start + tm, kind, ref if kind != 'new' else typ, j)); s.q.sort(key=lambda o: o[0])
        ak = s.lvl('akademi')
        if ak and s.rq is None:
            pr = {'yagmaci': ['akinci', 'kemirici', 'buyukyanak', 'demirci', 'suvari', 'sargi', 'yanak', 'hizli', 'buyukyanak2', 'mancinik', 'kalkan', 'klan', 'izci'],
                  'dengeli': ['akinci', 'kalkan', 'yanak', 'kemirici', 'demirci', 'sargi', 'suvari', 'buyukyanak', 'klan', 'izci', 'mancinik', 'hizli', 'buyukyanak2'],
                  'ciftci': ['yanak', 'kalkan', 'demirci', 'sargi', 'klan', 'izci', 'akinci', 'kemirici', 'buyukyanak', 'suvari', 'mancinik', 'hizli', 'buyukyanak2'],
                  'gundelik': ['yanak', 'kalkan', 'klan', 'izci', 'demirci', 'sargi', 'akinci', 'kemirici', 'buyukyanak', 'suvari', 'mancinik', 'hizli', 'buyukyanak2']}[s.arche]
            for n in pr:
                if n in s.research or RESEARCH[n] > tier_open(ak): continue
                tr = RESEARCH[n]; c = research_cost(tr); sd = research_seed(tr)
                if s.afford(c, sd, reserve): s.pay(c, sd); s.rq = (t + research_time(tr, ak), n)
                break
        s.train(t, reserve)
        if s.arche == 'yagmaci' or (s.arche == 'dengeli' and s.nlogin % 3 == 0): s.raid(t)
    def mix(s):
        has = lambda k: U[k]['r'] is None or U[k]['r'] in s.research
        if s.arche == 'yagmaci':
            m = {'akinci': 0.65, 'kemirici': 0.35} if has('akinci') else {'piyade': 1.0}
            if not has('kemirici') and 'akinci' in m: m = {'akinci': 0.6, 'piyade': 0.4}
        elif s.arche == 'dengeli':
            m = {'piyade': 0.3, 'kalkan': 0.4, 'akinci': 0.3}
            m = {k: v for k, v in m.items() if has(k)}
        else:
            m = {'kalkan': 1.0} if has('kalkan') else {'piyade': 1.0}
        tot = sum(m.values()); return {k: v / tot for k, v in m.items()}
    def train(s, t, reserve):
        if s.tq is not None or s.lvl('kisla') == 0: return
        fr = ARCH[s.arche]['army']
        budget = [max(0.0, s.stock[r] - reserve[r]) * fr for r in range(4)]
        m = s.mix()
        food_rate = s.base(1) * (1 + s.mult(int(t // 24)))
        room_food = 0.75 * food_rate - s.upkeep(); room_pop = s.popcap() - s.upkeep()
        room = min(room_food, room_pop)
        if room <= 0: return
        unit_cost = [sum(m[k] * U[k]['cost'][r] for k in m) for r in range(4)]
        n = min(budget[r] / unit_cost[r] for r in range(4) if unit_cost[r] > 0)
        n = min(n, room / sum(m[k] * U[k]['u'] for k in m))
        spd = KISLA_SPEED ** (s.lvl('kisla') - 1)
        tm_unit = sum(m[k] * U[k]['m'] for k in m) / 60 * spd
        n = int(min(n, 12 / tm_unit))
        if n < 1: return
        k = max(m, key=lambda k: m[k] * s.sim.rng.random())   # bir parti = tek tip
        cost = tuple(U[k]['cost'][r] * n for r in range(4))
        if not s.afford(cost): return
        s.pay(cost); s.tq = (t + n * U[k]['m'] / 60 * spd, k, n)
    def raid(s, t):
        if t < s.found + BEGINNER_DAYS * 24: return
        sim = s.sim; d = int(t // 24); cands = []
        for dist, o in sim.nb[s.id]:
            v = sim.V[o]
            if v.found > t or t < v.found + BEGINNER_DAYS * 24 or v.raided.get(d, 0) >= RAIDS_PER_TARGET_DAY: continue
            v.checkpoint(t); la = sum(v.lootable())
            if la < 300: continue
            cands.append((la / (dist + 2), dist, v, la))
        cands.sort(key=lambda c: -c[0]); sent = 0
        dm = 1 + DEMIRCI_STEP * s.lvl('demirci')
        for _, dist, v, la in cands[:8]:
            off = {k: s.units[k] for k in ('piyade', 'akinci', 'kemirici', 'suvari') if s.units[k] > 0}
            if not off: break
            hero = s.hero_ok(t) and sent == 0 and s.arche == 'yagmaci'
            A_all = sum(off[k] * U[k]['a'] for k in off) * dm * (1 + (s.hatk() if hero else 0)) + (s.hkuv() if hero else 0)
            C_all = sum(off[k] * U[k]['c'] for k in off) * (1 + (s.hcar() if hero else 0) + (0.2 if 'buyukyanak' in s.research else 0))
            D = v.defense(t + dist / min(U[k]['s'] for k in off))
            need = 2 * D + 1
            if A_all < need: continue
            f = min(1.0, max(need / A_all, la / max(1, C_all)))
            army = {k: max(1, int(math.ceil(n * f))) for k, n in off.items()}
            for k, n in army.items(): s.units[k] -= n; s.away[k] += n
            spd = min(U[k]['s'] for k in army) * (1.2 if 'hizli' in s.research else 1)
            if hero: s.hero_home = False
            sim.push(t + dist / spd, 'arrive', dict(o=s.id, tg=v.id, u=army, hero=hero, dist=dist, spd=spd, dm=dm))
            sent += 1
            if sent >= 4: break

class Sim:
    def __init__(s, seed=1, n=600, days=90, def_loss='prop', mapsize=100, slots=2, depth=2):
        s.rng = random.Random(seed); s.days = days; s.def_loss = def_loss; s.slots = slots; s.depth = depth
        s.P = [s.rng.choice(NIGHTS) * s.rng.uniform(0.85, 1.15) for _ in range(days + 3)]
        s.V = []; s.ev = []; s.k = 0; s.log = dict(battles=[0] * (days + 1), wins=[0] * (days + 1), wipes=[0] * (days + 1))
        archs = [a for a, v in ARCH.items() for _ in range(int(round(v['share'] * n)))][:n]
        s.rng.shuffle(archs)
        for i, a in enumerate(archs):
            found = 0.0 if s.rng.random() < 0.5 else s.rng.uniform(0, 30) * 24
            quit = 1e9
            if s.rng.random() < ARCH[a]['quit']: quit = found + s.rng.uniform(10, 40 if a == 'gundelik' else 60) * 24
            s.V.append(V(s, i, s.rng.uniform(0, mapsize), s.rng.uniform(0, mapsize), a, found, quit))
        s.nb = []
        for v in s.V:
            l = sorted((math.hypot(v.x - o.x, v.y - o.y), o.id) for o in s.V if o.id != v.id)
            s.nb.append([x for x in l if x[0] <= 20])
        for d in range(days + 1): s.push(d * 24.0, 'day', d)
        s.snap = []
    def push(s, t, kind, data): s.k += 1; heapq.heappush(s.ev, (t, s.k, kind, data))
    def run(s):
        while s.ev:
            t, _, kind, data = heapq.heappop(s.ev)
            if t > s.days * 24 + 1e-6: break
            if kind == 'day': s.on_day(t, data)
            elif kind == 'login':
                v = s.V[data]
                if v.found <= t < v.quit: v.login(t)
            elif kind == 'arrive': s.on_arrive(t, data)
            elif kind == 'return': s.on_return(t, data)
        return s
    def on_day(s, t, d):
        row = []
        for v in s.V:
            if v.found > t: row.append(None); continue
            v.checkpoint(t)
            row.append(dict(m=v.merkez, f=sum(v.fields) / 8, cark=v.lvl('cark'), amb=max([L for x, L in v.bld if x == 'ambar'], default=0),
                            yan=max([L for x, L in v.bld if x == 'yanak'], default=0), sur=v.sur, hl=v.hlevel(),
                            units=sum(v.units.values()) + sum(v.away.values()), seeds=v.seeds,
                            prod=sum(v.st['prod']), lin=sum(v.st['lin']), lout=sum(v.st['lout']), active=t < v.quit))
        s.snap.append(row)
        if d >= s.days: return
        for v in s.V:
            if t < v.quit and v.found < t + 24:
                k = ARCH[v.arche]['logins']
                for _ in range(k):
                    lt = t + s.rng.uniform(0, 24)
                    if lt >= v.found: s.push(lt, 'login', v.id)
                if v.found >= t and v.found < t + 24: s.push(v.found, 'login', v.id)
    def on_arrive(s, t, a):
        o, tg = s.V[a['o']], s.V[a['tg']]; tg.checkpoint(t); d = int(t // 24); s.log['battles'][d] += 1
        hero = a['hero']; u = a['u']
        A = sum(u[k] * U[k]['a'] for k in u) * a['dm'] * (1 + (o.hatk() if hero else 0)) + (o.hkuv() if hero else 0)
        D = tg.defense(t); dhero = tg.hero_ok(t)
        att_cost = lambda n_lost: sum(n_lost[k] * sum(U[k]['cost']) for k in n_lost)
        o.st['att'] += 1; tg.st['dfn'] += 1
        if s.def_loss == 'prop':
            fa = min(1.0, 0.5 * D / max(A, 1e-9)); fd = min(1.0, 0.5 * A / max(D, 1e-9))
        else:
            fa, fd = ((D / A) ** 2, 1.0) if A > D else (1.0, (A / D) ** 2 if D > 0 else 0)
        win = fd >= 1.0 - 1e-9 and A > D
        back_a = 0.1 if 'sargi' in o.research else 0.0; back_d = SARGI if 'sargi' in tg.research else 0.0
        lost_a = {k: int(round(n * fa)) for k, n in u.items()}
        surv = {k: n - lost_a[k] + int(lost_a[k] * back_a) for k, n in u.items()}
        lost_d = {k: int(round(n * fd)) for k, n in tg.units.items()}
        if win and sum(tg.units.values()) > 0: s.log['wipes'][d] += 1; tg.st['wipe'] += 1
        for k in lost_d: tg.units[k] -= lost_d[k] - int(lost_d[k] * back_d)
        tg.st['ulost'] += sum(lost_d.values())
        if hero: o.xp += att_cost(lost_d) / BATTLE_XP_DIV
        if dhero: tg.xp += att_cost(lost_a) / BATTLE_XP_DIV
        if hero and fa > fd: o.inj = t + HERO_INJURY
        if dhero and fd > fa: tg.inj = t + HERO_INJURY
        take = [0.0] * 4
        if win:
            s.log['wins'][d] += 1; o.st['attwin'] += 1; tg.st['dfnlost'] += 1
            carry = sum(surv[k] * U[k]['c'] for k in surv) * (1 + (o.hcar() if hero else 0) + (0.2 if 'buyukyanak' in o.research else 0))
            avail = tg.lootable(); rem = carry
            for _ in range(4):
                open_ = [r for r in range(4) if avail[r] - take[r] > 1e-6]
                if not open_ or rem <= 1e-6: break
                share = rem / len(open_)
                for r in open_:
                    x = min(share, avail[r] - take[r]); take[r] += x; rem -= x
            for r in range(4): tg.stock[r] -= take[r]; tg.st['lout'][r] += take[r]
            if surv.get('mancinik', 0) >= CATAPULT_PER_LEVEL: tg.sur = max(0, tg.sur - min(CATAPULT_MAX, surv['mancinik'] // CATAPULT_PER_LEVEL))
            tg.raided[d] = tg.raided.get(d, 0) + 1
        o.st['ulost'] += sum(lost_a.values())
        s.push(t + a['dist'] / a['spd'], 'return', dict(o=a['o'], u=u, surv=surv, take=take, hero=hero))
    def on_return(s, t, a):
        o = s.V[a['o']]; o.checkpoint(t); cap = o.storage()
        for k, n in a['u'].items(): o.away[k] -= n; o.units[k] += a['surv'].get(k, 0)
        for r in range(4):
            got = min(a['take'][r], cap - o.stock[r]); o.stock[r] += max(0, got); o.st['lin'][r] += max(0, got)
        if a['hero']: o.hero_home = True

if __name__ == '__main__':
    import time; t0 = time.time()
    s = Sim(seed=1, def_loss=sys.argv[1] if len(sys.argv) > 1 else 'all').run()
    print('ok', round(time.time() - t0, 1), 's', 'battles', sum(s.log['battles']))
