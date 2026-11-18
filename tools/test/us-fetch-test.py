# 美股抓價的判斷邏輯測試（不連網路，用假的資料來源）：python3 tools/test/us-fetch-test.py
# 重點：Yahoo 給舊資料時要重抓、還是舊的就回報 ok=False（流程顯示失敗），不能再「顯示成功、其實是舊價格」
import importlib.util, json, os, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location('fus', os.path.join(ROOT, 'tools', 'fetch-us.py'))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
M.OUT = tempfile.mkdtemp()  # 不碰真的 data/us
fails = 0

def eq(a, b, name):
    global fails
    if a == b:
        print('✓', name)
    else:
        fails += 1; print('✗', name, '\n  得到', a, '\n  應該', b)

SY = [f'S{i}' for i in range(100)]
row = lambda d, c=10.0: (d, c, c - 1)
def src(rows):  # 回傳固定資料的假來源，並記下被要求抓哪些代號
    calls = []
    def f(symbols, upto):
        calls.append(list(symbols)); return {s: rows[s] for s in symbols if s in rows}
    f.calls = calls
    return f
waits = []
pause = lambda s: waits.append(s)
def reset(old=None):
    p = os.path.join(M.OUT, 'prices.json')
    if os.path.exists(p): os.remove(p)
    if old: M.save('prices.json', old)
    waits.clear()
cur = lambda: M.load('prices.json') or {}

# 1) 一次就抓到最新：不重抓、ok
reset()
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-16') for s in SY}), src({}), pause)
eq([st['ok'], st['d'], st['tries'], cur().get('d'), cur().get('ok')], [True, '2026-11-16', 0, '2026-11-16', True], '一次就是最新 → 不重抓，寫檔，ok')

# 2) 這次的狀況：Yahoo 全部給前一天 → 馬上重抓一次、等 5 分鐘再抓一次，還是舊的 → ok=False，不覆蓋同一天的舊檔
reset({'d': '2026-11-13', 'px': {s: 10.0 for s in SY}})
r = src({s: row('2026-11-13') for s in SY})
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-13') for s in SY}), r, pause)
eq([st['ok'], st['d'], st['tries'], waits, len(r.calls)], [False, '2026-11-13', 2, [300], 2], '一直是舊的 → 重抓 2 次（中間等 5 分鐘），回報 ok=False')
eq('2026-11-16' in st['why'] and '2026-11-13' in st['why'], True, '原因寫出應該要有的日期和實際日期')

# 3) 第一次舊、重抓後變新的 → ok，寫入新的日期
reset({'d': '2026-11-13', 'px': {s: 10.0 for s in SY}})
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-13') for s in SY}), src({s: row('2026-11-16', 11.0) for s in SY}), pause)
eq([st['ok'], st['tries'], waits, cur().get('d'), cur()['px']['S0']], [True, 1, [], '2026-11-16', 11.0], '重抓後變最新 → 不用等，寫入新價格')

# 4) 大部分最新、少數幾檔抓不到（下市、改代號）→ 只快速重抓那幾檔，不等 5 分鐘，ok
reset()
rows = {s: row('2026-11-16') for s in SY[:97]}
r = src({})
st = M.fetch_prices(SY, '2026-11-16', src(rows), r, pause)
eq([st['ok'], st['n'], waits, r.calls], [True, 97, [], [SY[97:]]], '少數幾檔抓不到 → 只重抓那 3 檔一次、不等，ok')

# 5) 比現有檔案新、但還不是預期日期（檔案停在 11/12，抓到 11/13，應該要 11/16）→ 先存 11/13（ok:false），回報失敗
reset({'d': '2026-11-12', 'px': {s: 9.0 for s in SY}})
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-13') for s in SY}), src({}), pause)
eq([st['ok'], cur().get('d'), cur().get('ok')], [False, '2026-11-13', False], '比現有的新但不是最新 → 先存起來，標 ok:false，回報失敗')

# 6) 涵蓋率不到 90% → 不寫檔、回報失敗
reset({'d': '2026-11-13', 'px': {'S0': 1.0}})
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-16') for s in SY[:50]}), src({}), pause)
eq([st['ok'], cur().get('d'), '90%' in st['why']], [False, '2026-11-13', True], '只抓到 50% → 不寫檔、回報失敗')

# 7) 來源出錯 → 回報失敗，不會讓整支程式停掉
def boom(symbols, upto): raise RuntimeError('網路斷了')
reset()
st = M.fetch_prices(SY, '2026-11-16', boom, boom, pause)
eq([st['ok'], st['d'], cur()], [False, None, {}], '來源出錯 → 回報失敗、不寫檔')

# 8) 同一天、價格沒變 → ok，不重寫
reset({'d': '2026-11-16', 'px': {s: 10.0 for s in SY}, 'upd': 'x'})
st = M.fetch_prices(SY, '2026-11-16', src({s: row('2026-11-16') for s in SY}), src({}), pause)
eq([st['ok'], cur().get('upd')], [True, 'x'], '已經是最新、價格沒變 → ok，不重寫')

# 9) Summary 與交給下一步的結果
out, summ = tempfile.mktemp(), tempfile.mktemp()
os.environ['GITHUB_OUTPUT'], os.environ['GITHUB_STEP_SUMMARY'] = out, summ
M.report({'ok': False, 'd': '2026-11-13', 'exp': '2026-11-16', 'n': 600, 'total': 600, 'why': '測試'})
eq(open(out).read(), 'px_ok=false\n', '不是最新 → px_ok=false（流程最後一步會顯示失敗）')
eq('停在 2026-11-13，應該要有 2026-11-16' in open(summ).read(), True, 'Summary 頁寫明停在哪天、應該要哪天')

# 10) yf.download 的欄位排法（2026-11-18：只抓一檔時是兩層欄位，舊程式 df['Close'] 出錯，NVDA 盤後價格沒抓到）
try:
    import pandas as pd
except ImportError:
    pd = None
    print('（沒有 pandas，略過欄位排法測試）')
if pd is not None:
    idx = pd.to_datetime(['2026-11-16', '2026-11-17'])
    one = pd.DataFrame([[1.0, 10.0], [2.0, 11.0]], index=idx, columns=pd.MultiIndex.from_tuples([('NVDA', 'Open'), ('NVDA', 'Close')]))
    two = pd.DataFrame([[10.0, 20.0], [11.0, 21.0]], index=idx, columns=pd.MultiIndex.from_tuples([('NVDA', 'Close'), ('AAPL', 'Close')]))
    swap = pd.DataFrame([[10.0, 20.0], [11.0, 21.0]], index=idx, columns=pd.MultiIndex.from_tuples([('Close', 'NVDA'), ('Close', 'AAPL')]))
    flat = pd.DataFrame({'Open': [1.0, 2.0], 'Close': [10.0, 11.0]}, index=idx)
    eq([M._col(one, 'NVDA').iloc[-1], M._col(two, 'AAPL').iloc[-1], M._col(swap, 'AAPL').iloc[-1], M._col(flat, 'NVDA').iloc[-1]],
       [11.0, 21.0, 21.0, 11.0], '只抓一檔（兩層欄位）、多檔、欄位在前、單層欄位都取得到收盤價')
    try:
        M._col(two, 'TSLA'); eq('沒出錯', '出錯', '沒抓到的代號要出錯（交給呼叫端略過）')
    except KeyError:
        eq(True, True, '沒抓到的代號要出錯（交給呼叫端略過）')

print('全部通過' if not fails else f'{fails} 項失敗')
sys.exit(1 if fails else 0)
