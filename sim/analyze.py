import sys, json, statistics as st, pickle
from sim2 import *

def summarize(s):
    D = s.days; out = {}
    for a in ARCH:
        vs = [v for v in s.V if v.arche == a and v.found == 0 and v.quit > D * 24]
        firsts = {}
        for L in (3, 5, 7, 8, 10):
            days = []
            for v in vs:
                dd = next((d for d in range(D + 1) if s.snap[d][v.id] and s.snap[d][v.id]['m'] >= L), None)
                days.append(dd if dd is not None else 999)
            days.sort(); firsts[L] = days[len(days) // 2]
        def med(key, d): xs = sorted(s.snap[d][v.id][key] for v in vs); return xs[len(xs) // 2]
        prod = sum(sum(v.st['prod']) for v in vs); lin = sum(sum(v.st['lin']) for v in vs); lout = sum(sum(v.st['lout']) for v in vs)
        out[a] = dict(n=len(vs), first=firsts,
                      merkez={d: med('m', d) for d in (7, 14, 30, 60, 90) if d <= D},
                      fields={d: round(med('f', d), 1) for d in (14, 30, 60, 90) if d <= D},
                      cark={d: med('cark', d) for d in (14, 30, 90) if d <= D},
                      amb90=med('amb', D), yan90=med('yan', D), sur90=med('sur', D), hero90=med('hl', D), units90=med('units', D),
                      loot_share=round(lin / max(1, prod + lin), 3), lost_share=round(lout / max(1, prod), 3),
                      seeds_in=round(st.mean(v.st['seeds_in'] for v in vs)), seeds_out=round(st.mean(v.st['seeds_out'] for v in vs)),
                      attwin=round(sum(v.st['attwin'] for v in vs) / max(1, sum(v.st['att'] for v in vs)), 2),
                      atts=round(st.mean(v.st['att'] for v in vs)), dfn=round(st.mean(v.st['dfn'] for v in vs)),
                      wipes=round(st.mean(v.st['wipe'] for v in vs), 1), ulost=round(st.mean(v.st['ulost'] for v in vs)),
                      block=sum(1 for v in vs if v.st['block'] > 0), starve=round(sum(v.st['starve'] for v in vs), 2))
    # quitters
    q = [v for v in s.V if v.quit < D * 24]
    out['_quit'] = dict(n=len(q), lost_share=round(sum(sum(v.st['lout']) for v in q) / max(1, sum(sum(v.st['prod']) for v in q)), 3))
    late = [v for v in s.V if v.found >= 20 * 24 and v.quit > D * 24]
    out['_late'] = dict(n=len(late), merkez90=sorted(s.snap[D][v.id]['m'] for v in late)[len(late) // 2] if late else None)
    out['_battles'] = dict(total=sum(s.log['battles']), per_day_last30=round(sum(s.log['battles'][-30:]) / 30), win=round(sum(s.log['wins']) / max(1, sum(s.log['battles'])), 2), wipes=sum(s.log['wipes']))
    return out

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'; qn = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    s = Sim(seed=1, def_loss=mode, queue=qn).run(); r = summarize(s)
    for k, v in r.items(): print(k, json.dumps(v, ensure_ascii=False))
    json.dump(r, open(f'res_{mode}_q{qn}.json', 'w'), ensure_ascii=False)
