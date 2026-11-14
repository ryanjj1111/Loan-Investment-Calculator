# 美股收盤價與財報日（公開資料；不讀任何使用者資料，範圍只以「整個指數或整個類別」為單位）
#   python tools/fetch-us.py
# 輸出 data/us/universe.json（範圍）、data/us/prices.json（只存最新一天）、data/us/events.json（範圍內的財報日）
# 任何一步失敗都保留上一次的檔案，不會寫半套。價格來源寫成轉接層（SOURCES），要換來源只改這一處。
import io, json, os, sys, time, datetime as dt
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'us')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9'}

# 固定的 ETF 類別清單（整個類別一起增減，不為個別使用者加代號）
ETFS = {
    '大盤': ['SPY', 'VOO', 'IVV', 'VTI', 'QQQ', 'QQQM', 'DIA', 'IWM', 'VT', 'VXUS', 'VEA', 'VWO', 'RSP', 'SPLG', 'SCHB', 'ITOT'],
    '產業': ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLRE', 'XLC', 'SMH', 'SOXX', 'VGT', 'IGV', 'XBI', 'IBB', 'KRE', 'ARKK'],
    '風格與股利': ['VUG', 'VTV', 'IWF', 'IWD', 'SCHD', 'VYM', 'VIG', 'DGRO', 'JEPI', 'JEPQ', 'MTUM', 'QUAL', 'USMV'],
    '債券與短期公債': ['SGOV', 'BIL', 'SHV', 'SHY', 'IEI', 'IEF', 'TLT', 'TLH', 'BND', 'AGG', 'LQD', 'HYG', 'TIP', 'VGSH', 'VGIT', 'VGLT', 'BSV', 'MUB', 'USFR', 'TFLO'],
    '商品與其他': ['GLD', 'IAU', 'SLV', 'USO', 'VNQ', 'IBIT', 'FBTC', 'EFA', 'EEM', 'INDA', 'EWT', 'EWJ', 'FXI', 'KWEB'],
}

def now_tw():
    return (dt.datetime.utcnow() + dt.timedelta(hours=8)).strftime('%Y-%m-%d %H:%M')

def load(name):
    try:
        with open(os.path.join(OUT, name), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')

# ---------- 範圍：S&P 500＋Nasdaq-100（維基百科的成分股表）＋ETF 清單
def wiki_symbols(url, lo, hi):
    import requests, pandas as pd
    html = requests.get(url, headers=UA, timeout=30).text
    for t in pd.read_html(io.StringIO(html)):
        cols = [str(c) for c in t.columns]
        for c in ('Symbol', 'Ticker'):
            if c in cols and lo <= len(t) <= hi:
                syms = [str(x).strip().upper() for x in t[c].tolist()]
                return [s for s in syms if s and s != 'NAN' and len(s) <= 6]
    raise RuntimeError('找不到成分股表：' + url)

def build_universe():
    old = load('universe.json') or {}
    idx = {}
    for key, url, lo, hi in (('sp500', 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', 480, 520), ('ndx', 'https://en.wikipedia.org/wiki/Nasdaq-100', 95, 110)):
        try:
            idx[key] = sorted(set(wiki_symbols(url, lo, hi)))
            print(f'{key}: {len(idx[key])} 檔')
        except Exception as e:
            idx[key] = old.get(key) or []
            print(f'{key}: 抓不到（{e}），沿用上一次的 {len(idx[key])} 檔')
    etf = sorted({s for L in ETFS.values() for s in L})
    allsym = sorted(set(idx['sp500']) | set(idx['ndx']) | set(etf))
    if len(idx['sp500']) < 400:
        print('S&P 500 成分股不足，這次不更新範圍')
        return old.get('all') or allsym, old
    u = {'upd': now_tw(), 'src': 'S&P 500、Nasdaq-100 成分股（Wikipedia）＋固定 ETF 類別清單', 'sp500': idx['sp500'], 'ndx': idx['ndx'], 'etf': ETFS, 'all': allsym}
    if {k: old.get(k) for k in ('sp500', 'ndx', 'etf')} != {k: u[k] for k in ('sp500', 'ndx', 'etf')}:
        save('universe.json', u)
        print(f'範圍已更新：{len(allsym)} 檔')
    return allsym, u

# ---------- 價格來源轉接層：每個來源回傳 {代號: (日期, 收盤, 前一日收盤)}
def src_yahoo(symbols):
    import yfinance as yf
    out = {}
    ymap = {s.replace('.', '-'): s for s in symbols}
    ys = list(ymap)
    for i in range(0, len(ys), 150):
        part = ys[i:i + 150]
        for attempt in range(2):
            try:
                df = yf.download(part, period='7d', interval='1d', auto_adjust=False, group_by='ticker', threads=True, progress=False)
                break
            except Exception as e:
                print('yfinance 失敗：', e); df = None; time.sleep(5)
        if df is None or df.empty:
            continue
        for y in part:
            try:
                c = (df[y]['Close'] if len(part) > 1 else df['Close']).dropna()
                if hasattr(c, 'columns'):
                    c = c.iloc[:, 0]
                if len(c) == 0:
                    continue
                d = c.index[-1].strftime('%Y-%m-%d')
                out[ymap[y]] = (d, float(c.iloc[-1]), float(c.iloc[-2]) if len(c) > 1 else None)
            except Exception:
                pass
        time.sleep(1)
    return out

SOURCES = [('Yahoo Finance（yfinance）', src_yahoo)]

def fetch_prices(symbols):
    for name, fn in SOURCES:
        try:
            got = fn(symbols)
        except Exception as e:
            print(f'{name} 失敗：{e}'); continue
        if not got:
            print(f'{name} 沒有資料'); continue
        d = Counter(v[0] for v in got.values()).most_common(1)[0][0]
        px = {s: round(v[1], 4) for s, v in got.items() if v[0] == d and v[1] > 0}
        pv = {s: round(v[2], 4) for s, v in got.items() if v[0] == d and v[2] and v[2] > 0}
        cov = len(px) / max(1, len(symbols))
        print(f'{name}：{d} 收盤，{len(px)}／{len(symbols)} 檔（{cov:.1%}）')
        if cov < 0.9:
            print('涵蓋率不到 90%，這個來源不採用'); continue
        old = load('prices.json')
        if old and old.get('d') == d and old.get('px') == px:
            print('價格沒有變動'); return True
        if old and old.get('d', '') > d:
            print('抓到的日期比現有的舊，不覆蓋'); return True
        save('prices.json', {'d': d, 'upd': now_tw(), 'src': name, 'n': len(px), 'px': px, 'pv': pv})
        print('已寫入 prices.json')
        return True
    return False

# ---------- 財報日：Nasdaq 網站的公開財報行事曆（一天一次請求，回傳當天所有公司），只留範圍內的代號
def fetch_events(symbols):
    import requests
    S = set(symbols); today = dt.datetime.utcnow().date(); earn = {}; okdays = 0
    h = dict(UA, Accept='application/json, text/plain, */*', Origin='https://www.nasdaq.com', Referer='https://www.nasdaq.com/')
    for off in range(-7, 29):
        day = today + dt.timedelta(days=off)
        if day.weekday() > 4:
            continue
        try:
            r = requests.get('https://api.nasdaq.com/api/calendar/earnings', params={'date': day.isoformat()}, headers=h, timeout=20)
            rows = ((r.json().get('data') or {}).get('rows')) or []
            okdays += 1
        except Exception as e:
            print(f'財報行事曆 {day} 抓不到：{e}'); continue
        for row in rows:
            s = str(row.get('symbol') or '').strip().upper()
            if s not in S:
                continue
            t = str(row.get('time') or '')
            e = {'d': day.isoformat(), 't': 'pre' if 'pre' in t else 'post' if 'after' in t else ''}
            cur = earn.get(s)
            # 有還沒到的就留最近的一個；否則留最近公布的那一個
            if not cur or (cur['d'] < today.isoformat() and e['d'] > cur['d']) or (cur['d'] >= today.isoformat() and today.isoformat() <= e['d'] < cur['d']):
                earn[s] = e
        time.sleep(0.4)
    print(f'財報行事曆：{okdays} 天有回應，範圍內 {len(earn)} 檔')
    if okdays < 10:
        print('回應的天數太少，這次不更新財報日'); return False
    old = load('events.json')
    if old and old.get('earn') == earn:
        print('財報日沒有變動'); return True
    save('events.json', {'upd': now_tw(), 'src': 'Nasdaq 財報行事曆', 'earn': dict(sorted(earn.items()))})
    print('已寫入 events.json')
    return True

if __name__ == '__main__':
    syms, _ = build_universe()
    if not syms:
        print('沒有範圍清單，結束'); sys.exit(0)
    ok = fetch_prices(syms)
    try:
        fetch_events(syms)
    except Exception as e:
        print('財報日整段失敗：', e)
    if not ok:
        print('這次沒有抓到價格（保留上一次的檔案）')
