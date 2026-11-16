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
    tables = pd.read_html(io.StringIO(html))
    for t in tables:
        cols = [' '.join(map(str, c)) if isinstance(c, tuple) else str(c) for c in t.columns]
        for i, c in enumerate(cols):
            if ('symbol' in c.lower() or 'ticker' in c.lower()) and lo <= len(t) <= hi:
                syms = [str(x).strip().upper() for x in t.iloc[:, i].tolist()]
                syms = [x for x in syms if x and x != 'NAN' and len(x) <= 6 and x.replace('.', '').isalnum()]
                if len(syms) >= lo:
                    return syms
    print('表格：', [(len(t), [str(c)[:20] for c in t.columns][:6]) for t in tables if len(t) > 50])
    raise RuntimeError('找不到成分股表：' + url)

def nasdaq100():
    import requests
    h = dict(UA, Accept='application/json, text/plain, */*', Origin='https://www.nasdaq.com', Referer='https://www.nasdaq.com/')
    j = requests.get('https://api.nasdaq.com/api/quote/list-type/nasdaq100', headers=h, timeout=30).json()
    rows = (((j.get('data') or {}).get('data') or {}).get('rows')) or []
    syms = [str(r.get('symbol') or '').strip().upper() for r in rows]
    syms = [x for x in syms if x and len(x) <= 6]
    if not 95 <= len(syms) <= 110:
        raise RuntimeError(f'Nasdaq-100 回傳 {len(syms)} 檔')
    return syms

def build_universe():
    old = load('universe.json') or {}
    idx = {}
    for key, url, lo, hi in (('sp500', 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', 480, 520), ('ndx', 'https://en.wikipedia.org/wiki/Nasdaq-100', 95, 110)):
        try:
            try:
                idx[key] = sorted(set(nasdaq100())) if key == 'ndx' else sorted(set(wiki_symbols(url, lo, hi)))
            except Exception as e1:
                if key != 'ndx':
                    raise
                print('Nasdaq 網站的成分股抓不到，改用維基百科：', e1)
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
    u = {'upd': now_tw(), 'src': 'S&P 500（Wikipedia）、Nasdaq-100（Nasdaq 網站）成分股＋固定 ETF 類別清單', 'sp500': idx['sp500'], 'ndx': idx['ndx'], 'etf': ETFS, 'all': allsym}
    if {k: old.get(k) for k in ('sp500', 'ndx', 'etf')} != {k: u[k] for k in ('sp500', 'ndx', 'etf')}:
        save('universe.json', u)
        print(f'範圍已更新：{len(allsym)} 檔')
    return allsym, u

# ---------- 交易日曆（data/mkt/holidays.json）：正常盤官方收盤才算數
# 美股 23/5（2026-12-06 起）：資料來源可能出現「下一個交易日、還沒收盤」的日線，只接受已經收盤的正常盤
def _et_now():
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo('America/New_York'))

def _cal():
    try:
        with open(os.path.join(ROOT, 'data', 'mkt', 'holidays.json'), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def us_trading(day, cal):
    return day.weekday() < 5 and day.isoformat() not in set(cal.get('us') or [])

def last_closed_us(now=None, cal=None):
    # 最近一個「已經收盤」的正常盤交易日（美東日期）；收盤後 15 分鐘才算，避開還在整理的收盤資料
    cal = cal if cal is not None else _cal(); now = now or _et_now(); day = now.date()
    for _ in range(15):
        if us_trading(day, cal):
            if day < now.date():
                return day.isoformat()
            hh, mm = map(int, ((cal.get('usEarly') or {}).get(day.isoformat()) or '16:00').split(':'))
            if now.hour * 60 + now.minute >= hh * 60 + mm + 15:
                return day.isoformat()
        day -= dt.timedelta(days=1)
    return None

# ---------- 價格來源轉接層：每個來源回傳 {代號: (日期, 收盤, 前一日收盤)}
def src_yahoo(symbols, upto=None):
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
                if upto:  # 丟掉還沒收盤的日線（交易日晚於最近一個已收盤的正常盤）
                    c = c[[i.strftime('%Y-%m-%d') <= upto for i in c.index]]
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
    exp = last_closed_us()
    print(f'預期的交易日（最近一個已收盤的正常盤）：{exp}')
    for name, fn in SOURCES:
        try:
            got = fn(symbols, exp)
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
        if exp and d != exp:
            print(f'⚠️ 資料的交易日 {d} 和預期 {exp} 不同（資料未更新）')
        save('prices.json', {'d': d, 'tradeDate': d, 'session': 'regular', 'exp': exp, 'upd': now_tw(), 'src': name, 'n': len(px), 'px': px, 'pv': pv})
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

# ---------- 美股指數（S&P 500、那斯達克、費半、VIX）與財報後的盤後價格 → data/mkt/us.json
IDX = {'SPX': '^GSPC', 'IXIC': '^IXIC', 'SOX': '^SOX', 'VIX': '^VIX'}

def fetch_mkt_us():
    import yfinance as yf
    exp = last_closed_us(); cal = _cal()
    out = {'upd': now_tw(), 'exp': exp, 'session': 'regular', 'src': 'Yahoo Finance（yfinance）日線', 'idx': {}}
    df = yf.download(list(IDX.values()), period='15d', interval='1d', auto_adjust=False, group_by='ticker', progress=False)
    days = set()
    for k, y in IDX.items():
        try:
            c = df[y]['Close'].dropna()
            c = c[[i.strftime('%Y-%m-%d') <= (exp or '9999') for i in c.index]]
            if len(c) < 2:
                continue
            d = c.index[-1].strftime('%Y-%m-%d'); days.add(d)
            out['idx'][k] = {'tradeDate': d, 'c': round(float(c.iloc[-1]), 2), 'pc': round(float(c.iloc[-2]), 2), 'pcDate': c.index[-2].strftime('%Y-%m-%d'),
                             'pct': round((float(c.iloc[-1]) / float(c.iloc[-2]) - 1) * 100, 2)}
        except Exception as e:
            print(f'{k} 失敗：{e}')
    out['tradeDate'] = max(days) if days else None
    out['ok'] = bool(exp) and out['tradeDate'] == exp and len(out['idx']) == len(IDX)
    print(f"指數：{ {k: v['tradeDate'] for k, v in out['idx'].items()} }，預期 {exp}，{'正常' if out['ok'] else '⚠️ 資料未更新'}")
    # 財報剛公布（前一個交易日盤後）：整個範圍裡有公布的都抓延長時段最後價格，寫清楚基準（正常盤收盤）與美東時間
    ev = (load('events.json') or {}).get('earn') or {}
    post = [s for s, e in ev.items() if e.get('d') == exp and e.get('t') == 'post']
    out['post'] = {}
    if post and exp:
        try:
            ym = {s.replace('.', '-'): s for s in post}
            h = yf.download(list(ym), period='5d', interval='5m', prepost=True, auto_adjust=False, group_by='ticker', progress=False)
            from zoneinfo import ZoneInfo
            for y, s in ym.items():
                try:
                    c = (h[y]['Close'] if len(ym) > 1 else h['Close']).dropna()
                    c.index = c.index.tz_convert(ZoneInfo('America/New_York'))
                    reg = c[[i.strftime('%Y-%m-%d') == exp and (i.hour, i.minute) < (16, 0) for i in c.index]]
                    aft = c[[i.strftime('%Y-%m-%d') == exp and (i.hour, i.minute) >= (16, 0) for i in c.index]]
                    base = (load('prices.json') or {}).get('px', {}).get(s) if (load('prices.json') or {}).get('d') == exp else None
                    base = base or (float(reg.iloc[-1]) if len(reg) else None)
                    if base and len(aft):
                        t = aft.index[-1]
                        out['post'][s] = {'tradeDate': exp, 'ref': round(base, 4), 'px': round(float(aft.iloc[-1]), 4), 'pct': round((float(aft.iloc[-1]) / base - 1) * 100, 2), 'et': t.strftime('%H:%M'), 'session': 'post'}
                except Exception as e:
                    print(f'{s} 盤後價格失敗：{e}')
        except Exception as e:
            print('盤後價格整段失敗：', e)
    print(f'財報剛公布：{len(post)} 檔，抓到盤後價格 {len(out["post"])} 檔')
    if not out['idx']:
        print('指數都抓不到，不寫檔'); return False
    os.makedirs(os.path.join(ROOT, 'data', 'mkt'), exist_ok=True)
    with open(os.path.join(ROOT, 'data', 'mkt', 'us.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':')); f.write('\n')
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
    try:
        fetch_mkt_us()
    except Exception as e:
        print('美股指數整段失敗：', e)
    if not ok:
        print('這次沒有抓到價格（保留上一次的檔案）')
