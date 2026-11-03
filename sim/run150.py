import sys, json, pickle
from sim2 import *
from analyze import summarize
mode = sys.argv[1]; sl = int(sys.argv[2]); dp = int(sys.argv[3])
s = Sim(seed=1, def_loss=mode, days=150, slots=sl, depth=dp).run()
r = summarize(s)
# extra timelines
D = s.days
def first_day(pred, vs):
    xs = []
    for v in vs:
        dd = next((d for d in range(D + 1) if s.snap[d][v.id] and pred(s.snap[d][v.id])), 999); xs.append(dd)
    xs.sort(); return xs[len(xs) // 2]
for a in ARCH:
    vs = [v for v in s.V if v.arche == a and v.found == 0 and v.quit > D * 24]
    r[a]['amb20'] = first_day(lambda x: x['amb'] >= 20, vs)
    r[a]['cark10'] = first_day(lambda x: x['cark'] >= 10, vs)
    r[a]['hero_by_day'] = {d: sorted(s.snap[d][v.id]['hl'] for v in vs)[len(vs) // 2] for d in (30, 60, 90, 120, 150)}
    r[a]['merkez_by_day'] = {d: sorted(s.snap[d][v.id]['m'] for v in vs)[len(vs) // 2] for d in range(0, 151)}
r['_seed_per_day'] = round(sum(s.P[1:D + 1]) * SEED_PER_PASS / D)
r['_battles_by_day'] = s.log['battles']
tag = f'{mode}_s{sl}d{dp}'; json.dump(r, open(f'res150_{tag}.json', 'w'), ensure_ascii=False)
for k, v in r.items():
    if k in ('_battles_by_day',): continue
    if isinstance(v, dict): v = {kk: vv for kk, vv in v.items() if kk != 'merkez_by_day'}
    print(k, json.dumps(v, ensure_ascii=False))
