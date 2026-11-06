// 自動檢核卡：用公開資料（data/chk.json，每個交易日由 GitHub Actions 產生）判斷策略條件是否符合
// 策略條件是文字，這裡把常見的寫法對應到資料（例如「收盤價在季線 ±3% 內」→ 收盤價與 60 日均線）；看不懂的條件維持手動勾選
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

let CK=null,ckBusy=0,ckErr=0;const CKM={};
async function ckLoad(){if(ckBusy||(CK&&Date.now()-CK._t<18e5))return;ckBusy=1;try{const j=await pxGet('chk.json');if(j&&j.s&&j.f){j._t=Date.now();CK=j;ckErr=0;for(const k in CKM)delete CKM[k]}else ckErr=1;ckRefresh()}finally{ckBusy=0}}
// 某檔股票的指標（物件）；沒有資料＝null
function ckM(c){c=cU(c);if(!CK||!c)return null;if(CKM[c]!==undefined)return CKM[c];const a=CK.s[c];if(!a){CKM[c]=null;return null}const o={};CK.f.forEach((k,i)=>o[k]=a[i]);return CKM[c]=o}
const ckMD=d=>d?String(d).slice(5).replace('-','/'):'';
// 資料日期一句話
function ckAsOf(){if(!CK)return'';return`收盤 ${ckMD(CK.d)}｜法人 ${ckMD(CK.dC)||'—'}｜融資 ${ckMD(CK.dM)||'—'}｜月營收 ${CK.rM||'—'}${CK.bW&&CK.bW.length?'｜大戶 '+ckMD(CK.bW[CK.bW.length-1]):''}`}

// ---------- 條件文字 → 判斷
const CK_MA={'月線':['m20','m20p',20],'季線':['m60','m60p',60],'半年線':['m120','',120]};
const ckN=s=>String(s||'').replace(/〔[^〕]*〕/g,'').replace(/（[^）]*）|\([^)]*\)/g,'').replace(/\s+/g,'').replace(/，/g,',').replace(/：/g,':').replace(/＞/g,'>').replace(/＜/g,'<').replace(/[≧]|>=/g,'≥').replace(/[≦]|<=/g,'≤').replace(/[～〜]/g,'~').replace(/％/g,'%').replace(/^第\d+批:/,'').replace(/^[-‧•]/,'').replace(/^符合上面條件,且/,'');
const f1=x=>x==null?'—':(Math.round(x*10)/10).toLocaleString(),f2=x=>x==null?'—':(+x).toLocaleString(undefined,{maximumFractionDigits:2}),pc=x=>(x>=0?'+':'')+(Math.round(x*10)/10)+'%';
const ckSum=(a,n)=>a&&a.length>=n&&a.slice(-n).every(x=>x!=null)?a.slice(-n).reduce((s,x)=>s+x,0):null;
const R_=(v,why,miss)=>({v,why:why||'',miss:miss||''});
const NA=miss=>R_(null,'',miss);
// 每個寫法：[正規表示式, (比對結果)=>(指標 m, 大盤 k)=>結果]
const CK_ATOMS=[
 [/^符合上面條件$/,()=>()=>({skip:1})],
 [/^(?:收盤價?|股價)?(?:站上|站回|在|位於)?(月線|季線|半年線)(?:之上|以上|上方)?$/,x=>m=>{const[k]=CK_MA[x[1]],ma=m[k];if(ma==null)return NA(x[1]+'資料不足');return R_(m.c>ma,`收盤 ${f2(m.c)}，${x[1]} ${f2(ma)}（${pc((m.c/ma-1)*100)}）`)}],
 [/^(?:收盤價?|股價)?(?:在|位於)?(月線|季線|半年線)±(\d+(?:\.\d+)?)%(?:內|以內)?$/,x=>m=>{const[k]=CK_MA[x[1]],ma=m[k];if(ma==null)return NA(x[1]+'資料不足');const d=(m.c/ma-1)*100;return R_(Math.abs(d)<=+x[2],`收盤 ${f2(m.c)}，${x[1]} ${f2(ma)}（${pc(d)}）`)}],
 [/^(?:股價)?距(月線|季線|半年線)乖離(?:>|超過)(\d+(?:\.\d+)?)%$/,x=>m=>{const[k]=CK_MA[x[1]],ma=m[k];if(ma==null)return NA(x[1]+'資料不足');const d=(m.c/ma-1)*100;return R_(d>+x[2],`距${x[1]} ${pc(d)}`)}],
 [/^(月線|季線|半年線)(走平或上彎|上彎|走平)$/,x=>m=>{const[k,kp]=CK_MA[x[1]];if(!kp||m[k]==null||m[kp]==null)return NA(x[1]+'斜率資料不足');const d=(m[k]/m[kp]-1)*100;return R_(x[2]=='上彎'?d>0:x[2]=='走平'?Math.abs(d)<=0.2:d>=-0.2,`${x[1]} 5 日變化 ${pc(d)}`)}],
 [/^股價位於(月線|季線|半年線)與(月線|季線|半年線)之上$/,x=>m=>{const a=m[CK_MA[x[1]][0]],b=m[CK_MA[x[2]][0]];if(a==null||b==null)return NA('均線資料不足');return R_(m.c>a&&m.c>b,`收盤 ${f2(m.c)}，${x[1]} ${f2(a)}，${x[2]} ${f2(b)}`)}],
 [/^RSI跌破(\d+)後回升到(\d+)以上$/,x=>m=>m.rsi==null?NA('RSI 資料不足'):R_(m.rsiLo<+x[1]&&m.rsi>=+x[2],`RSI ${f1(m.rsi)}，近 20 日最低 ${f1(m.rsiLo)}`)],
 [/^RSI(?:<|小於|低於)(\d+)$/,x=>m=>m.rsi==null?NA('RSI 資料不足'):R_(m.rsi<+x[1],`RSI ${f1(m.rsi)}`)],
 [/^RSI(?:>|大於|高於)(\d+)$/,x=>m=>m.rsi==null?NA('RSI 資料不足'):R_(m.rsi>+x[1],`RSI ${f1(m.rsi)}`)],
 [/^RSI介於(\d+)[~-](\d+)$/,x=>m=>m.rsi==null?NA('RSI 資料不足'):R_(m.rsi>=+x[1]&&m.rsi<=+x[2],`RSI ${f1(m.rsi)}`)],
 [/^MACD柱狀體?由負轉正$/,x=>m=>m.mh==null?NA('MACD 資料不足'):R_(m.mh>0&&m.mhLo<0,`柱狀體 ${f2(m.mh)}，前 3 日最低 ${f2(m.mhLo)}`)],
 [/^(投信|外資)(?:或(投信|外資))?近(\d+)日合計買超(?:≥近(\d+)日平均成交量的(\d+(?:\.\d+)?)%)?$/,x=>m=>{const n=+x[3],who=[x[1],x[2]].filter(Boolean),L=who.map(w=>({w,s:ckSum(m[w=='投信'?'it':'fi'],n)}));
  if(n>10)return NA('法人資料只保留近 10 日');if(L.some(o=>o.s==null))return NA('法人資料不足');const th=x[5]?(m.av20||0)*x[5]/100:0;
  return R_(L.some(o=>x[5]?o.s>=th:o.s>0),L.map(o=>`${o.w}近 ${n} 日 ${o.s>0?'+':''}${R(o.s)} 張`).join('，')+(x[5]?`（門檻 ${R(th)} 張＝20 日均量 ${R(m.av20)} × ${x[5]}%）`:''))}],
 [/^(投信|外資)(由賣轉買,?|轉為)?連(?:買|續買超)?(\d+)日(?:買超)?$/,x=>m=>{const a=m[x[1]=='投信'?'it':'fi'],n=+x[3];if(!a||a.length<n+1)return NA('法人資料不足');const L=a.slice(-n),pre=a[a.length-n-1];
  const ok=L.every(v=>v>0)&&(!x[2]||pre<=(x[2].startsWith('由賣')?-1:0));return R_(ok,`${x[1]}近 ${n+1} 日：${a.slice(-n-1).map(v=>(v>0?'+':'')+R(v)).join('、')} 張`)}],
 [/^(投信|外資)連(\d+)日賣超$/,x=>m=>{const a=m[x[1]=='投信'?'it':'fi'],n=+x[2];if(!a||a.length<n)return NA('法人資料不足');return R_(a.slice(-n).every(v=>v<0),`${x[1]}近 ${n} 日：${a.slice(-n).map(v=>(v>0?'+':'')+R(v)).join('、')} 張`)}],
 [/^融資餘額近(10|20)日(增加|減少)(不超過|≤|≥|超過|>)?(\d+(?:\.\d+)?)%$/,x=>m=>{const g=m.mg,b0=g&&g[0],bn=g&&g[x[1]=='10'?1:2];if(b0==null||!bn)return NA('融資資料不足');const d=(b0/bn-1)*100,p=+x[4],op=x[3]||'≥';
  const v=x[2]=='增加'?(op=='不超過'||op=='≤'?d<=p:d>=p):(op=='不超過'||op=='≤'?-d<=p:-d>=p);return R_(v,`融資餘額 ${R(b0)} 張，${x[1]} 日前 ${R(bn)} 張（${pc(d)}）`)}],
 [/^(?:月營收)?年增率連(\d+)個月>(-?\d+(?:\.\d+)?)%(且加速)?$/,x=>m=>{const n=+x[1],y=m.ry;if(!y||y.length<n||y.slice(-n).some(v=>v==null))return NA('月營收資料不足');const L=y.slice(-n);
  return R_(L.every(v=>v>+x[2])&&(!x[3]||L.every((v,i)=>!i||v>L[i-1])),`近 ${n} 個月年增率 ${L.map(v=>v+'%').join('、')}${m.rLag?'（最新月份還沒公布）':''}`)}],
 [/^月營收年增率(?:>|大於)(-?\d+(?:\.\d+)?)%?$/,x=>m=>{const y=m.ry,v=y&&y[y.length-1];if(v==null)return NA('月營收資料不足');return R_(v>+x[1],`最新月營收年增率 ${v}%${m.rLag?'（最新月份還沒公布）':''}`)}],
 [/^月營收年增率(?:由負)?轉正$/,x=>m=>{const y=m.ry;if(!y||y.length<2||y.slice(-2).some(v=>v==null))return NA('月營收資料不足');const[a,b]=y.slice(-2);return R_(b>0&&a<=0,`年增率 ${a}% → ${b}%`)}],
 [/^(?:月營收)?(?:年增率)?(?:由負轉正|衰退幅度連(\d+)個月收斂)$/,x=>m=>{const n=+(x[1]||2),y=m.ry;if(!y||y.length<n||y.slice(-n).some(v=>v==null))return NA('月營收資料不足');const L=y.slice(-n);
  return R_(x[1]?L.every((v,i)=>v<0&&(!i||v>L[i-1])):(L[1]>0&&L[0]<=0),`近 ${n} 個月年增率 ${L.map(v=>v+'%').join('、')}`)}],
 [/^月營收創(?:歷史)?新高$/,x=>m=>m.rHi==null?NA('月營收資料不足'):R_(!!m.rHi&&!m.rLag,`和 ${CK.rFrom} 以來每個月比較${m.rLag?'（最新月份還沒公布）':''}`)],
 [/^突破前波高點(?:或整理區)?$/,x=>m=>m.hi60==null?NA('資料不足'):R_(m.c>m.hi60,`收盤 ${f2(m.c)}，前 60 日最高收盤 ${f2(m.hi60)}`)],
 [/^(?:當天)?成交量>(20)日均量([\d.]+)倍$/,x=>m=>m.v==null||!m.av20?NA('成交量資料不足'):R_(m.v>m.av20*x[2],`成交量 ${R(m.v)} 張，20 日均量 ${R(m.av20)} 張（${(m.v/m.av20).toFixed(1)} 倍）`)],
 [/^近(20)日平均成交量≥([\d,]+)張$/,x=>m=>m.av20==null?NA('成交量資料不足'):R_(m.av20>=+x[2].replace(/,/g,''),`20 日均量 ${R(m.av20)} 張`)],
 [/^大盤從(?:52週)?高點回檔≥(\d+)%$/,x=>(m,k)=>{const t=k&&k.taiex;if(!t||!t.c)return NA('加權指數資料不足');const d=(t.c/t.hi250-1)*100;return R_(d<=-x[1],`加權指數 ${f2(t.c)}，近一年最高 ${f2(t.hi250)}（${pc(d)}）`)}],
 [/^外資單日賣超達(?:年度|近一年)前(\d+)大$/,x=>(m,k)=>{const f=k&&k.fx;if(!f)return NA('外資金額資料不足');return R_(f.v<0&&f.rank<=+x[1],`外資 ${ckMD(f.d)} ${f.v>0?'買超':'賣超'} ${f2(Math.abs(f.v))} 億${f.v<0?`，近 ${f.n} 個交易日第 ${f.rank} 大`:''}`,f.n<200?`（目前只有 ${f.n} 個交易日的資料）`:'')}],
 [/^(?:個股)?從52週高點回落≥(\d+)%$/,x=>m=>{if(m.hi250==null)return NA('資料不足');const d=(m.c/m.hi250-1)*100;return R_(d<=-x[1],`收盤 ${f2(m.c)}，近一年最高收盤 ${f2(m.hi250)}（${pc(d)}）`,m.n<240?`（只有 ${m.n} 個交易日的資料）`:'')}],
 [/^加權指數站(?:回|上)月線$/,x=>(m,k)=>{const t=k&&k.taiex;if(!t||t.m20==null)return NA('加權指數資料不足');return R_(t.c>t.m20,`加權指數 ${f2(t.c)}，月線 ${f2(t.m20)}`)}],
 [/^千張大戶持股比例?連(\d+)週上升$/,x=>m=>{const n=+x[1],b=(m.bh||[]).filter(v=>v!=null);if(b.length<n+1)return NA(`股權分散表每週累積，需要 ${n+1} 週（目前 ${b.length} 週）`);const L=b.slice(-n-1);return R_(L.every((v,i)=>!i||v>L[i-1]),`千張大戶 ${L.map(v=>v+'%').join(' → ')}`)}],
 // ---------- 技術（新增）
 [/^收盤價?(?:≤|低於)(月線|季線|半年線)(?:\+(\d+(?:\.\d+)?)%)?$/,x=>m=>{const[k]=CK_MA[x[1]],ma=m[k];if(ma==null)return NA(x[1]+'資料不足');const p=+(x[2]||0);return R_(m.c<=ma*(1+p/100),`收盤 ${f2(m.c)}，${x[1]} ${f2(ma)}（${pc((m.c/ma-1)*100)}）`)}],
 [/^連(\d+)日不創20日新低$/,x=>m=>m.dNL==null?NA('資料不足'):R_(m.dNL>=+x[1],`已連 ${m.dNL} 日沒有創 20 日新低`)],
 [/^突破前20日高點$/,x=>m=>m.hi20==null?NA('資料不足'):R_(m.c>m.hi20,`收盤 ${f2(m.c)}，前 20 日最高收盤 ${f2(m.hi20)}`)],
 [/^賺賠比<(\d+(?:\.\d+)?)$/,x=>m=>{const st=CKX.st;if(!st)return NA('要搭配策略計算');const s=stStopCalc(st,CKX.c,m.c),r=s?stRR(CKX.c,m.c,s.v):null;if(!r)return NA('算不出賺賠比');
  return R_(r.rr<+x[1],`以收盤 ${f2(m.c)} 計：目標 ${f2(r.tgt)}（近一年最高收盤）、停損 ${f2(s.v)}（${s.t}），賺賠比 ${r.rr.toFixed(1)}`)}],
 [/^除息前(\d+)個交易日$/,x=>m=>{const n=+x[1],e=(S.events||[]).filter(e=>!e.done&&cU(e.code)==CKX.c&&/除息|除權/.test(e.type||'')&&e.date>=TODAY&&dDays(TODAY,e.date)<=n*1.45).sort((a,b)=>a.date<b.date?-1:1)[0];return R_(!!e,e?`${ckMD(e.date)} ${e.type}`:'事件裡沒有近期的除息日')}],
 [/^加權指數站(?:回|上)季線$/,x=>(m,k)=>{const t=k&&k.taiex;if(!t||t.m60==null)return NA('加權指數資料不足');return R_(t.c>t.m60,`加權指數 ${f2(t.c)}，季線 ${f2(t.m60)}`)}],
 [/^千張大戶持股比例?近1週沒有下降$/,x=>m=>{const b=(m.bh||[]).filter(v=>v!=null);if(b.length<2)return NA(`股權分散表每週累積，需要 2 週（目前 ${b.length} 週）`);const[a,c]=b.slice(-2);return R_(c>=a,`千張大戶 ${a}% → ${c}%`)}],
 // ---------- 財報、估值、股利（證交所、櫃買中心、公開資訊觀測站）
 [/^毛利率沒有連(\d+)季下滑$/,x=>m=>{const n=+x[1],g=(m.gm||[]).filter(v=>v!=null);if(g.length<n+1)return NA('季報資料不足');const L=g.slice(-n-1),down=L.every((v,i)=>!i||v<L[i-1]);return R_(!down,`近 ${n+1} 季毛利率 ${L.map(v=>v+'%').join(' → ')}`)}],
 [/^毛利率持平或上升$/,x=>m=>{const g=(m.gm||[]).filter(v=>v!=null);if(g.length<2)return NA('季報資料不足');const[a,b]=g.slice(-2);return R_(b>=a-0.5,`毛利率 ${a}% → ${b}%`)}],
 [/^近4季EPS合計>0$/,x=>m=>m.eps4==null?NA('財報資料不足'):R_(m.eps4>0,`近 4 季 EPS ${f2(m.eps4)} 元`)],
 [/^近3年EPS穩定$/,x=>m=>{const y=m.epsY;if(!y||y.length<3||y.some(v=>v==null))return NA('年度 EPS 資料不足');const ok=y.every((v,i)=>v>0&&(!i||v>=y[i-1]*0.7));return R_(ok,`近 3 年 EPS ${y.map(f2).join('、')} 元（每年都賺錢，且沒有一年比前一年少 3 成以上）`)}],
 [/^近3年平均配息率>(\d+)%$/,x=>m=>m.pay3==null?NA('股利資料不足'):R_(m.pay3>+x[1],`近 3 年平均配息率 ${f1(m.pay3)}%`)],
 [/^殖利率≥(\d+(?:\.\d+)?)%$/,x=>m=>{if(m.dps3==null)return NA('股利資料不足');const y=m.dps3/m.c*100;return R_(y>=+x[1],`近 3 年平均現金股利 ${f2(m.dps3)} 元 ÷ 收盤 ${f2(m.c)}＝${f1(y)}%`)}],
 [/^殖利率(?:降到|<)(\d+(?:\.\d+)?)%以下?$/,x=>m=>{if(m.dps3==null)return NA('股利資料不足');const y=m.dps3/m.c*100;return R_(y<+x[1],`殖利率 ${f1(y)}%`)}],
 [/^負債比<(\d+)%$/,x=>m=>m.debt==null?NA('財報資料不足'):R_(m.debt<+x[1],`負債比 ${f1(m.debt)}%（最新一季）`)],
 [/^自由現金流為正$/,x=>m=>m.fcf==null?NA('現金流量資料不足'):R_(m.fcf>0,`近 4 季營業＋投資現金流 ${f1(m.fcf/1e5)} 億元`)],
 [/^本益比≤近5年本益比中位數$/,x=>m=>m.pe==null||m.peMed5==null?NA(m.pe==null?'本益比資料不足（可能虧損）':'本益比歷史資料不足'):R_(m.pe<=m.peMed5,`本益比 ${f1(m.pe)} 倍，近 5 年中位數 ${f1(m.peMed5)} 倍（近四季實際 EPS）`)],
 [/^股價淨值比落在近10年區間的下1\/3$/,x=>m=>m.pbPct10==null?NA('股價淨值比歷史資料不足'):R_(m.pbPct10<=1/3,`股價淨值比 ${f2(m.pb)}，在近 10 年區間的 ${Math.round(m.pbPct10*100)}% 位置`)],
 [/^同產業月營收年增率中位數連(\d+)個月改善$/,x=>m=>{const g=typeof indOf=='function'?indOf(CKX.c):'',a=g&&CK.ind?CK.ind[g]:null,n=+x[1];if(!a||a.length<n+1)return NA('產業資料不足');const L=a.slice(-n-1);return R_(L.every((v,i)=>!i||v>L[i-1]),`${g}營收年增率中位數 ${L.map(v=>v+'%').join(' → ')}`)}],
 [/^(?:最新)?月營收年增率連(\d+)個月放緩$/,x=>m=>{const n=+x[1],y=m.ry;if(!y||y.length<n+1)return NA('月營收資料不足');const L=y.slice(-n-1);return R_(L.every((v,i)=>!i||v<L[i-1]),`年增率 ${L.map(v=>v+'%').join(' → ')}`)}],
 // ---------- 股票屬性（每檔確認一次）
 [/^產業有2年以上結構性成長$/,x=>m=>ckAttr('growth',1,'結構性成長')],
 [/^不是景氣循環股$/,x=>m=>ckAttr('cyc',0,'景氣循環股')],
 [/^景氣循環產業$/,x=>m=>ckAttr('cyc',1,'景氣循環股')],
 [/^產業龍頭或寡占$/,x=>m=>ckAttr('lead',1,'產業龍頭')],
 // ---------- 前瞻資料（法人預估、法說指引、主題指標；資料超過 120 天顯示 ❔）
 [/^法人預估明年EPS年增≥(\d+)%$/,x=>m=>{const o=ckOut(CKX.c),y0=+TODAY.slice(0,4),a=o.med(y0),b=o.med(y0+1);if(a==null||b==null)return NA(`前瞻資料沒有 ${y0}、${y0+1} 年的 EPS 預估`);if(a<=0)return NA(`${y0} 年 EPS 預估 ≤ 0`);
  const g=(b/a-1)*100;return R_(g>=+x[1],`${y0+1} 年 EPS 預估 ${f2(b)} ÷ ${y0} 年 ${f2(a)}，年增 ${f1(g)}%（${o.src(y0+1)}）`)}],
 [/^近3個月法人EPS預估(持平或上修|沒有下修)$/,x=>m=>{const o=ckOut(CKX.c),y=+TODAY.slice(0,4)+1,now=o.med(y,0,45),old=o.med(y,60,150);
  if(now!=null&&old!=null){const d=(now/old-1)*100;return R_(d>=-2,`${y} 年 EPS 預估 ${f2(old)} → ${f2(now)}（${pc(d)}）`)}
  const r=m.ry;if(!r||r.length<6||r.some(v=>v==null))return NA('還沒有 3 個月前的預估紀錄，月營收資料也不足');const a=(r[0]+r[1]+r[2])/3,b=(r[3]+r[4]+r[5])/3;
  return R_(b>=a,`近 3 個月營收年增率平均 ${f1(b)}%，前 3 個月 ${f1(a)}%`,'（還沒有 3 個月前的預估紀錄，先用月營收判斷）')}],
 [/^最近一次法說(?:的)?營收與毛利率展望不低於持平$/,x=>m=>{const g=ckOut(CKX.c).guide;if(!g||!g.d)return NA('前瞻資料沒有法說指引');if(!g.rev||!g.gm)return NA('法說指引缺營收或毛利率的方向');if(dDays(g.d,TODAY)>120)return NA(`法說指引是 ${g.d} 的，超過 4 個月，請更新`);
  return R_(g.rev!='down'&&g.gm!='down',`${g.d} 法說：營收${CK_DIR[g.rev]||'—'}、毛利率${CK_DIR[g.gm]||'—'}${g.src?'（'+g.src+'）':''}`)}],
 [/^(?:產業報價止跌|所屬主題需求展望不是向下)$/,x=>m=>{const a=(S.attr||{})[CKX.c]||{},th=a.theme&&(S.themes||{})[a.theme];if(!a.theme)return NA('股票屬性還沒有填主題');if(!th||!th.d)return NA(`主題「${a.theme}」還沒有指標`);if(dDays(th.d,TODAY)>120)return NA(`主題「${a.theme}」的指標是 ${th.d} 的，請更新`);
  return R_(th.st!='down',`主題「${a.theme}」${CK_DIR[th.st]||'—'}（${th.d}${th.note?'：'+th.note:''}）`)}]
];
const CK_DIR={up:'向上',flat:'持平',down:'向下'};
let CKX={c:'',st:null};
// 股票屬性：1＝是、0＝否、沒填＝待確認
function ckAttr(k,want,lb){const a=(S.attr||{})[CKX.c]||{};if(a[k]==null||a[k]==='')return NA(`股票屬性「${lb}」還沒確認`);return R_(+a[k]===want,`股票屬性：${+a[k]?'是':'不是'}${lb}${a.d?'（'+a.d+' 確認）':''}`)}
// 前瞻資料：某年度 EPS 預估的中位數（只取 a～b 天前記錄的，預設 120 天內）
function ckOut(c){const o=(S.outlook||{})[cU(c)]||{},E=o.eps||[];const pick=(y,a=0,b=120)=>E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)>=a&&dDays(e.d,TODAY)<=b).map(e=>+e.v).filter(isFinite);
 const med=(y,a,b)=>{const L=pick(y,a,b).sort((p,q)=>p-q);if(!L.length)return null;const k=L.length>>1;return L.length%2?L[k]:(L[k-1]+L[k])/2};
 const src=y=>{const L=E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)<=120);return L.length?L.map(e=>e.src||'未註明').slice(0,3).join('、')+(L.length>3?' 等 '+L.length+' 家':'')+'，'+L.map(e=>e.d).sort().pop():''};
 return{med,src,guide:o.guide||null}}
const CKC={};
// 一個片段 → 判斷函式（看不懂＝null）
function ckAtom(s){for(const[re,mk]of CK_ATOMS){const x=s.match(re);if(x)return mk(x)}return null}
// 整句：先整句比對；再依「，或」拆成「或」，每段再依「，且／，／、／且」拆成「且」（拆開後看不懂的片段會試著和下一段合併）
function ckParse(t){const s=ckN(t);if(CKC[s]!==undefined)return CKC[s];let r=ckAtom(s);
 if(!r){const ors=s.split(/,或者?/).map(p=>{const parts=p.split(/,且|,|、/).filter(Boolean),fs=[];for(let i=0;i<parts.length;i++){let f=ckAtom(parts[i]),j=i;while(!f&&j+1<parts.length){j++;f=ckAtom(parts.slice(i,j+1).join(','))}if(!f)return null;fs.push(f);i=j}return fs});
  if(ors.every(a=>a===null))r=null;else r={or:ors}}
 return CKC[s]=r}
// 判斷一個條件：{v:true／false／null, why, miss, auto}；null＝不是自動條件（要自己勾）
const ckAuto=t=>!/（手動）|\(手動\)/.test(t)&&!!ckParse(t);
function ckEval(c,t,st){if(!CK||!ckAuto(t))return null;CKX={c:cU(c),st:st||null};const P=ckParse(t),m=ckM(c),k=CK.mkt;if(!m)return{v:null,why:'',miss:'沒有這檔的資料',auto:1};
 const run=f=>{const o=f(m,k);return o.skip?null:o};
 if(typeof P=='function'){const o=run(P);return o?Object.assign(o,{auto:1}):null}
 // 或：有一段成立就成立；且：有一段不成立就不成立
 let any=false,unk=false,whys=[],miss=[],man=false;
 for(const fs of P.or){if(!fs){man=true;continue}let ok=true,u=false;for(const f of fs){const o=run(f);if(!o)continue;if(o.why)whys.push(o.why);if(o.miss)miss.push(o.miss);if(o.v===false)ok=false;else if(o.v==null)u=true}
  if(ok&&!u){any=true}else if(ok&&u)unk=true}
 const v=any?true:(unk||man)?null:false;return{v,why:whys.join('；'),miss:miss.join('；')+(man&&!any?'（有一部分要自己判斷）':''),auto:1}}
// 策略的每一組條件，加上自動判斷結果
function ckGroups(st,c){return stConds(st).map(g=>({sec:g.sec,need:g.need,items:g.items.map(t=>({t,r:ckEval(c,t,st)}))}))}
// 條件文字：〔基〕〔技〕〔籌〕〔盤〕顯示成小標籤
const CK_TG={'基':'b','技':'t','籌':'c','盤':'m'};
const ckT=t=>esc(t).replace(/〔(基|技|籌|盤)〕/g,(_,k)=>`<span class="ctg ctg${CK_TG[k]}">${k}</span>`);
// 小標籤
function ckBadge(r,long){if(!r)return'';const ic=r.v===true?'✅':r.v===false?'❌':'❔',cl=r.v===true?'ok':r.v===false?'wn':'h';
 return` <span class="ckb ${cl}">${ic} 自動</span>${long&&(r.why||r.miss)?`<span class="ckw h">${esc(r.why)}${r.miss?' <i>'+esc(r.miss)+'</i>':''}</span>`:''}`}
// 論點摘要用：自動 ✅3 ❌2
function ckCount(T){const st=stStrat(S,T.sid);if(!st||!CK)return null;let ok=0,no=0;for(const g of ckGroups(st,T.code).filter(g=>g.need!='none'))for(const it of g.items)if(it.r){if(it.r.v===true)ok++;else if(it.r.v===false)no++}return ok+no?{ok,no}:null}
// 個股頁：今天的自動檢核
function ckCardHtml(T,st){if(!st)return'';const c=cU(T.code);if(!stConds(st).some(g=>g.items.some(ckAuto)))return'';
 if(!CK)return`<div class="asck ckc"><b>📋 今日自動檢核</b><div class=h>${ckErr?'讀不到自動檢核資料（離線，或網站還沒有資料）。':'資料讀取中…'}</div></div>`;
 const G=ckGroups(st,c).filter(g=>g.items.some(i=>i.r));
 return`<div class="asck ckc"><b>📋 今日自動檢核</b> <span class=h>${esc(ckAsOf())}</span>${G.map(g=>{const A=g.items.filter(i=>i.r),ok=A.filter(i=>i.r.v===true).length,man=g.items.length-A.length;
  if(g.need=='none')return`<div style="margin-top:4px"><b>⛔ ${esc(g.sec)}</b> <span class=h>任何一項成立就不買</span>${A.map(i=>`<div class=ckl>${i.r.v===true?'⛔ 成立':i.r.v===false?'✓ 沒有':'❔'} ${ckT(i.t)}<div class=h>${esc(i.r.why)}${i.r.miss?' <i>'+esc(i.r.miss)+'</i>':''}</div></div>`).join('')}</div>`;
  return`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class=h>自動符合 ${ok}／${A.length} 項${man?`，另外 ${man} 項要自己判斷`:''}${g.need?'（需要 '+(g.need=='all'||g.need>=g.items.length?'全部':g.need+' 項')+'）':''}</span>${A.map(i=>`<div class=ckl>${i.r.v===true?'✅':i.r.v===false?'❌':'❔'} ${ckT(i.t)}<div class=h>${esc(i.r.why)}${i.r.miss?' <i>'+esc(i.r.miss)+'</i>':''}</div></div>`).join('')}</div>`}).join('')}
  <div class=h style="margin-top:4px">自動檢核只看公開資料，僅供參考，不是投資建議。</div></div>`}
// 檢核資料讀到後，重畫用得到的地方
function ckRefresh(){try{if(typeof stCalc=='function')stCalc();if(typeof AT!='undefined'&&AT&&typeof asTh=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asTh();if(b)b.scrollTop=h}else if(typeof asCur!='undefined'&&asCur&&typeof asStock=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asStock(asCur.c,asCur.ac);if(b)b.scrollTop=h}}catch(e){}}
// 依策略的結論：可以買或加碼／還差幾項／不買條件成立／已達上限
// 自動判斷的看 ✅❌❔；要自己判斷的看論點有沒有勾；「依序加碼」看下一批的條件
function ckVerdict(T){const st=stStrat(S,T.sid);if(!st||!CK||T.status=='exit')return null;const c=cU(T.code),M=new Set(T.met||[]),done=(T.plan||[]).filter(r=>r.tid).length;
 let need=0,unk=0,man=0;const nb=[];
 const one=i=>i.r?(i.r.v===true?1:i.r.v===false?0:-1):(M.has(i.t)?1:-2);
 for(const g of ckGroups(st,c)){
  if(g.need=='none'){for(const i of g.items)if(i.r&&i.r.v===true)nb.push(i.t.replace(/〔.〕/g,''));continue}
  if(/依序/.test(g.rule||'')){if(done>=g.items.length)continue;const s=one(g.items[done]);if(s==0)need++;else if(s==-1)unk++;else if(s==-2)man++;continue}
  const n=g.need=='all'?g.items.length:(+g.need||0);if(!n)continue;const L=g.items.map(one),ok=L.filter(x=>x==1).length;if(ok>=n)continue;
  let lack=n-ok;const u=L.filter(x=>x==-1).length,m=L.filter(x=>x==-2).length;const a=Math.min(lack,m);man+=a;lack-=a;const b=Math.min(lack,u);unk+=b;lack-=b;need+=lack}
 const verb=T.status=='plan'?'買':'加碼',E=stExposure(S),p=E.tot>0?(E.by[c]||0)/E.tot*100:0,cap=stCapStock(S,c);
 if(nb.length)return{t:'⛔ 不買：'+nb[0],cls:'bad'};
 const parts=[need?`還差 ${need} 項`:'',man?`${man} 項要自己確認`:'',unk?`${unk} 項資料不足`:''].filter(Boolean);
 if(parts.length)return{t:parts.join('、'),cls:need?'h':'wn'};
 if(p>=cap)return{t:`條件符合，但已達個股上限 ${cap}%`,cls:'wn'};
 return{t:`✅ 條件符合，可以${verb}`,cls:'ok'}}
