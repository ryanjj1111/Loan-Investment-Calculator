// 自動檢核卡：用公開資料（data/chk.json，每個交易日由 GitHub Actions 產生）判斷策略條件是否符合
// 策略條件是文字，這裡把常見的寫法對應到資料（例如「收盤價在季線 ±3% 內」→ 收盤價與 60 日均線）；看不懂的條件維持手動勾選
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

let CK=null,ckBusy=0,ckErr=0;const CKM={};
async function ckLoad(){if(ckBusy||(CK&&Date.now()-CK._t<18e5))return;ckBusy=1;try{const j=await pxGet('chk.json');if(j&&j.s&&j.f){j._t=Date.now();CK=j;ckErr=0;for(const k in CKM)delete CKM[k]}else ckErr=1;ckRefresh()}finally{ckBusy=0}}
// 某檔股票的指標（物件）；沒有資料＝null
function ckM0(c){c=cU(c);if(!CK||!c)return null;if(CKM[c]!==undefined)return CKM[c];const a=CK.s[c];if(!a){CKM[c]=null;return null}const o={};CK.f.forEach((k,i)=>o[k]=a[i]);return CKM[c]=o}
// 檢核資料是前一個交易日收盤；之後有新價格（手填的盤中價，或網頁抓到的當天收盤）時，和價格有關的條件改用新價格試算
// RSI、MACD、均線、法人、融資、營收維持用檢核資料
function ckM(c){const o=ckM0(c);if(!o)return o;c=cU(c);const px=num((S.px||{})[c]),d=(S.pxd||{})[c]||'',auto=!!(S.pxa||{})[c];
 if(px==null||px==o.c)return o;if(auto?d>CK.d:d>=CK.d||!d)return Object.assign({},o,{c:px,live:{px,d,auto,c0:o.c}});return o}
const ckLive=m=>m&&m.live?(m.live.auto?`價格條件用 ${ckMD(m.live.d)} 收盤 ${f2(m.live.px)} 試算（檢核資料是 ${ckMD(CK.d)} 收盤 ${f2(m.live.c0)}）`:`價格條件用你填的現價 ${f2(m.live.px)} 試算（檢核資料是 ${ckMD(CK.d)} 收盤 ${f2(m.live.c0)}）`):'';
const ckMD=d=>d?String(d).slice(5).replace('-','/'):'';
// 資料日期一句話
function ckAsOf(){if(!CK)return'';return`收盤 ${ckMD(CK.d)}｜法人 ${ckMD(CK.dC)||'—'}｜融資 ${ckMD(CK.dM)||'—'}｜月營收 ${CK.rM||'—'}${CK.bW&&CK.bW.length?'｜大戶 '+ckMD(CK.bW[CK.bW.length-1]):''}`}

// ---------- 條件文字 → 判斷
const CK_MA={'月線':['m20','m20p',20],'季線':['m60','m60p',60],'半年線':['m120','',120]};
const ckN=s=>String(s||'').replace(/〔[^〕]*〕/g,'').replace(/（[^）]*）|\([^)]*\)/g,'').replace(/\s+/g,'').replace(/，/g,',').replace(/：/g,':').replace(/＞/g,'>').replace(/＜/g,'<').replace(/[≧]|>=/g,'≥').replace(/[≦]|<=/g,'≤').replace(/[～〜]/g,'~').replace(/％/g,'%').replace(/；/g,';').replace(/^第\d+批:/,'').replace(/^[-‧•]/,'').replace(/^符合上面條件,且/,'');
const f1=x=>x==null?'—':(Math.round(x*10)/10).toLocaleString(),f2=x=>x==null?'—':(+x).toLocaleString(undefined,{maximumFractionDigits:2}),pc=x=>(x>=0?'+':'')+(Math.round(x*10)/10)+'%';
const ckSum=(a,n)=>a&&a.length>=n&&a.slice(-n).every(x=>x!=null)?a.slice(-n).reduce((s,x)=>s+x,0):null;
const R_=(v,why,miss)=>({v,why:why||'',miss:miss||''});
// fix：資料不足時要補什麼（attr:growth／attr:theme／eps／guide／theme:名稱）；沒有 fix＝要等資料累積
const NA=(miss,fix)=>Object.assign(R_(null,'',miss),fix?{fix:[fix]}:{});
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
 [/^融資餘額近(10|20)日(?:沒有增加|未增加|持平或減少)$/,x=>m=>{const g=m.mg,b0=g&&g[0],bn=g&&g[x[1]=='10'?1:2];if(b0==null||!bn)return NA('融資資料不足');const d=(b0/bn-1)*100;return R_(d<=0,`融資餘額 ${R(b0)} 張，${x[1]} 日前 ${R(bn)} 張（${pc(d)}）`)}],
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
 [/^收盤價?低於(月線|季線|半年線)(\d+(?:\.\d+)?)%以上$|^(月線|季線|半年線)負乖離≥?(\d+(?:\.\d+)?)%$/,x=>m=>{const w=x[1]||x[3],p=+(x[2]||x[4]),[k]=CK_MA[w],ma=m[k];if(ma==null)return NA(w+'資料不足');const d=(m.c/ma-1)*100;return R_(d<=-p,`收盤 ${f2(m.c)}，${w} ${f2(ma)}（${pc(d)}）`)}],
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
 [/^法人預估明年EPS年增≥(\d+)%$/,x=>m=>{const o=ckOut(CKX.c),y0=+TODAY.slice(0,4),a=o.lat(y0),b=o.lat(y0+1);if(a==null||b==null)return NA(o.old(y0)||o.old(y0+1)?`EPS 預估超過 4 個月，請更新（${y0}、${y0+1} 年）`:`前瞻資料沒有 ${y0}、${y0+1} 年的 EPS 預估`,'eps');if(a<=0)return NA(`${y0} 年 EPS 預估 ≤ 0`);
  const g=(b/a-1)*100;return R_(g>=+x[1],`${y0+1} 年 EPS 預估 ${f2(b)} ÷ ${y0} 年 ${f2(a)}，年增 ${f1(g)}%（${o.srcL(y0+1)}）`)}],
 [/^近3個月法人EPS預估(持平或上修|沒有下修)$/,x=>m=>{const o=ckOut(CKX.c),y=+TODAY.slice(0,4)+1,now=o.med(y,0,45),old=o.med(y,60,150);
  if(now!=null&&old!=null){const d=(now/old-1)*100;return R_(d>=-2,`${y} 年 EPS 預估 ${f2(old)} → ${f2(now)}（${pc(d)}）`)}
  const r=m.ry;if(!r||r.length<6||r.some(v=>v==null))return NA(o.med(y,0,45)==null?'前瞻資料沒有最近的 EPS 預估，月營收資料也不足':'還沒有 3 個月前的預估紀錄，月營收資料也不足',o.med(y,0,45)==null?'eps':'');const a=(r[0]+r[1]+r[2])/3,b=(r[3]+r[4]+r[5])/3;
  const dN=o.dIn(y,0,45),dO=o.dIn(y,60,150),cut=ckMD(ckAddD(TODAY,-45)),why=dN?`（⏳ 還沒有 3 個月前的預估：${ckMD(dN)} 那筆約 ${ckMD(ckAddD(dN,60))} 起可以拿來比較，先用月營收判斷）`:dO?`（有 ${ckMD(dO)} 的預估，還缺 ${cut} 之後的新預估才能比較，先用月營收判斷）`:'（還沒有法人 EPS 預估，先用月營收判斷）';
  return Object.assign(R_(b>=a,`近 3 個月營收年增率平均 ${f1(b)}%，前 3 個月 ${f1(a)}%`,why),{hint:dN?'wait':dO?'new':'none',hd:dO||''})}],
 [/^最近一次法說(?:的)?營收與毛利率展望不低於持平$/,x=>m=>{const g=ckOut(CKX.c).guide;if(!g||!g.d)return NA('前瞻資料沒有法說指引','guide');if(!g.rev||!g.gm)return NA('法說指引缺營收或毛利率的方向','guide');if(dDays(g.d,TODAY)>120)return NA(`法說指引是 ${g.d} 的，超過 4 個月，請更新`,'guide');
  return R_(g.rev!='down'&&g.gm!='down',`${g.d} 法說：營收${CK_DIR[g.rev]||'—'}、毛利率${CK_DIR[g.gm]||'—'}${g.src?'（'+g.src+'）':''}`)}],
 [/^(?:產業報價止跌|所屬主題需求展望不是向下)$/,x=>m=>{const a=(S.attr||{})[CKX.c]||{},th=a.theme&&(S.themes||{})[a.theme];if(!a.theme)return NA('股票屬性還沒有填主題','attr:theme');if(!th||!th.d||!th.st)return NA(`主題「${a.theme}」還沒有狀態`,'theme:'+a.theme);if(dDays(th.d,TODAY)>120)return NA(`主題「${a.theme}」的指標是 ${th.d} 的，請更新`,'theme:'+a.theme);
  return R_(th.st!='down',`主題「${a.theme}」${CK_DIR[th.st]||'—'}（${th.d}${th.note?'：'+th.note:''}）`)}]
];
const CK_DIR={up:'向上',flat:'持平',down:'向下'};
let CKX={c:'',st:null};
// 股票屬性：1＝是、0＝否、沒填＝待確認
function ckAttr(k,want,lb){const a=(S.attr||{})[CKX.c]||{};if(a[k]==null||a[k]==='')return NA(`股票屬性「${lb}」還沒確認`,'attr:'+k);return R_(+a[k]===want,`股票屬性：${+a[k]?'是':'不是'}${lb}${a.d?'（'+a.d+' 確認）':''}`)}
// 前瞻資料：某年度 EPS 預估的中位數（只取 a～b 天前記錄的，預設 120 天內）
function ckOut(c){const o=(S.outlook||{})[cU(c)]||{},E=o.eps||[];const pick=(y,a=0,b=120)=>E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)>=a&&dDays(e.d,TODAY)<=b).map(e=>+e.v).filter(isFinite);
 const med=(y,a,b)=>{const L=pick(y,a,b).sort((p,q)=>p-q);if(!L.length)return null;const k=L.length>>1;return L.length%2?L[k]:(L[k-1]+L[k])/2};
 const src=y=>{const L=E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)<=120);return L.length?L.map(e=>e.src||'未註明').slice(0,3).join('、')+(L.length>3?' 等 '+L.length+' 家':'')+'，'+L.map(e=>e.d).sort().pop():''};
 // 最近一批：120 天內最新的日期往前 45 天內的紀錄（避免新舊預估混在一起算中位數）
 const latL=y=>{const L=E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)<=120);if(!L.length)return[];const dm=L.map(e=>e.d).sort().pop();return L.filter(e=>dDays(e.d,dm)<=45)};
 const lat=y=>{const L=latL(y).map(e=>+e.v).filter(isFinite).sort((p,q)=>p-q);if(!L.length)return null;const k=L.length>>1;return L.length%2?L[k]:(L[k-1]+L[k])/2};
 const srcL=y=>{const L=latL(y);return L.length?[...new Set(L.map(e=>e.src||'未註明'))].slice(0,3).join('、')+(L.length>3?' 等 '+L.length+' 筆':'')+'，'+L.map(e=>e.d).sort().pop():''};
 const old=y=>E.some(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)>120);
 const dIn=(y,a,b)=>E.filter(e=>+e.y==y&&e.d&&dDays(e.d,TODAY)>=a&&dDays(e.d,TODAY)<=b).map(e=>e.d).sort().pop()||'';
 return{med,src,lat,srcL,old,dIn,guide:o.guide||null}}
const ckAddD=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const CKC={};
// 一個片段 → 判斷函式（看不懂＝null）
function ckAtom(s){for(const[re,mk]of CK_ATOMS){const x=s.match(re);if(x)return mk(x)}return null}
// 整句：先整句比對；再依「，或」拆成「或」，每段再依「，且／，／、／且」拆成「且」（拆開後看不懂的片段會試著和下一段合併）
function ckParse(t){const s=ckN(t);if(CKC[s]!==undefined)return CKC[s];let r=ckAtom(s);
 const ko=!r&&s.match(/^(?:(?:下面)?\d+項中)?至少(\d+)項:(.+)$/);if(ko){const parts=ko[2].split(';').filter(Boolean);return CKC[s]={kof:+ko[1],parts:parts.map(p=>({t:p,P:ckParse(p)}))}}
 if(!r){const ors=s.split(/,或者?/).map(p=>{const parts=p.split(/,且|,|、/).filter(Boolean),fs=[];for(let i=0;i<parts.length;i++){let f=ckAtom(parts[i]),j=i;while(!f&&j+1<parts.length){j++;f=ckAtom(parts.slice(i,j+1).join(','))}if(!f)return null;fs.push(f);i=j}return fs});
  if(ors.every(a=>a===null))r=null;else r={or:ors}}
 return CKC[s]=r}
// 判斷一個條件：{v:true／false／null, why, miss, auto}；null＝不是自動條件（要自己勾）
const ckAuto=t=>!/（手動）|\(手動\)/.test(t)&&!!ckParse(t);
function ckEval(c,t,st){if(!CK||!ckAuto(t))return null;CKX={c:cU(c),st:st||null};const P=ckParse(t),m=ckM(c),k=CK.mkt;if(!m)return{v:null,why:'',miss:'沒有這檔的資料',auto:1};
 const o=ckRun(P,m,k);return o?Object.assign(o,{auto:1}):null}
function ckRun(P,m,k){if(!P)return null;if(typeof P=='function'){const o=P(m,k);return o.skip?null:o}
 const fx=new Set(),add=o=>{if(o&&o.v==null&&o.fix)o.fix.forEach(f=>fx.add(f))};
 // 至少 N 項：每項分開判斷
 if(P.kof){let ok=0,u=0;const W=[];for(const p of P.parts){const o=ckRun(p.P,m,k);if(!o){u++;continue}if(o.v===true)ok++;else if(o.v==null){u++;add(o)}W.push((o.v===true?'✓':o.v===false?'✗':'?')+' '+(o.why||o.miss||''))}
  const v=ok>=P.kof?true:ok+u>=P.kof?null:false;return Object.assign({v,why:`${P.parts.length} 項中符合 ${ok} 項（需要 ${P.kof} 項）：${W.join('；')}`,miss:u&&v==null?`${u} 項判斷不了`:''},v==null&&fx.size?{fix:[...fx]}:{})}
 // 或：有一段成立就成立；且：有一段不成立就不成立
 let any=false,unk=false,whys=[],miss=[],man=false;
 for(const fs of P.or){if(!fs){man=true;continue}let ok=true,u=false;for(const f of fs){const o=ckRun(f,m,k);if(!o)continue;if(o.why)whys.push(o.why);if(o.miss)miss.push(o.miss);if(o.v===false)ok=false;else if(o.v==null){u=true;add(o)}}
  if(ok&&!u){any=true}else if(ok&&u)unk=true}
 const v=any?true:(unk||man)?null:false;return Object.assign({v,why:whys.join('；'),miss:miss.join('；')+(man&&!any?'（有一部分要自己判斷）':'')},v==null&&fx.size?{fix:[...fx]}:{})}
// 策略的每一組條件，加上自動判斷結果
function ckGroups(st,c){return stConds(st).map(g=>({sec:g.sec,need:g.need,rule:g.rule,items:g.items.map(t=>({t,r:ckEval(c,t,st)}))}))}
// 條件文字：〔基〕〔技〕〔籌〕〔盤〕顯示成小標籤
const CK_TG={'基':'b','技':'t','籌':'c','盤':'m'};
const ckT=t=>esc(t).replace(/〔(基|技|籌|盤)〕/g,(_,k)=>`<span class="ctg ctg${CK_TG[k]}">${k}</span>`);
// 小標籤
function ckBadge(r,long){if(!r)return'';const ic=r.v===true?'✅':r.v===false?'❌':'❔',cl=r.v===true?'ok':r.v===false?'wn':'h';
 return` <span class="ckb ${cl}">${ic} 自動</span>${long&&(r.why||r.miss)?`<span class="ckw h">${esc(r.why)}${r.miss?' <i>'+esc(r.miss)+'</i>':''}</span>`:''}`}
// 論點摘要用：自動 ✅3 ❌2
function ckCount(T){const st=stStrat(S,T.sid);if(!st||!CK)return null;let ok=0,no=0;for(const g of ckGroups(st,T.code).filter(g=>g.need!='none'))for(const it of g.items)if(it.r){if(it.r.v===true)ok++;else if(it.r.v===false)no++}return ok+no?{ok,no}:null}
// 已經買了幾批（分批計畫有對應交易的）與日期
function ckDone(T){const R=(T.plan||[]).filter(r=>r.tid),D=R.map(r=>{const x=(S.trades||[]).find(z=>z.id==r.tid);return x?x.dt:''});return{n:R.length,d:D}}
// 個股頁、完整論點：今天的條件檢核（自動判斷的顯示結果；要自己判斷的可以按「確認符合」）
function ckCardHtml(T,st){if(!st)return'';const c=cU(T.code),C=stConds(st);if(!C.length)return'';
 if(!CK)return`<div class="asck ckc"><b>📋 今日條件檢核</b><div class=h>${ckErr?'讀不到自動檢核資料（離線，或網站還沒有資料）。':'資料讀取中…'}</div></div>`;
 const M=new Set(T.met||[]),D=ckDone(T),G=ckGroups(st,c),m=ckM(c),lv=ckLive(m);
 const why=r=>`<div class=h>${esc(r.why)}${r.miss?' <i>'+esc(r.miss)+'</i>':''}</div>`;
 const row=(i,gi,ii,pre)=>i.r?`<div class=ckl>${i.r.v===true?'✅':i.r.v===false?'❌':ckFixable(i.r)?'✏️':'⏳'} ${pre||''}${ckT(i.t)}${why(i.r)}${i.r.v==null&&ckFixable(i.r)?ckFixHtml(c,i.r.fix):''}</div>`
  :`<div class=ckl>${M.has(i.t)?'☑️':'❔'} ${pre||''}${ckT(i.t)} <button class=ckmb onclick="ckMetTog('${T.id}',${gi},${ii})">${M.has(i.t)?'取消確認':'確認符合'}</button><div class=h>${M.has(i.t)?'你確認過符合':'要自己判斷，符合就按「確認符合」'}</div></div>`;
 return`<div class="asck ckc"><b>📋 今日條件檢核</b> <span class=h>${esc(ckAsOf())}</span><div class=h style="font-size:11.5px">✅ 符合　❌ 不符合　✏️ 要補資料（在下面直接填）　⏳ 等資料累積（不用做事）　❔ 要自己判斷</div>${lv?`<div class=wn style="font-size:12.5px">${esc(lv)}</div>`:''}${G.map((g,gi)=>{
  if(g.need=='none')return`<div style="margin-top:4px"><b>⛔ ${esc(g.sec)}</b> <span class=h>任何一項成立就不買</span>${g.items.map(i=>i.r?`<div class=ckl>${i.r.v===true?'⛔ 成立':i.r.v===false?'✓ 沒有':ckFixable(i.r)?'✏️':'⏳'} ${ckT(i.t)}${why(i.r)}${i.r.v==null&&ckFixable(i.r)?ckFixHtml(c,i.r.fix):''}</div>`:`<div class=ckl>❔ ${ckT(i.t)}<div class=h>要自己判斷</div></div>`).join('')}</div>`;
  if(/依序/.test(g.rule||''))return`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class=h>依序加碼，已買 ${Math.min(D.n,g.items.length)}／${g.items.length} 批</span>${g.items.map((i,ii)=>ii<D.n?`<div class="ckl h">🟢 已買${D.d[ii]?' '+ckMD(D.d[ii]):''}　${ckT(i.t)}</div>`:row(i,gi,ii,ii==D.n?'👉 ':'')).join('')}</div>`;
  const A=g.items.filter(i=>i.r),ok=A.filter(i=>i.r.v===true).length,mn=g.items.filter(i=>!i.r),mk=mn.filter(i=>M.has(i.t)).length;
  return`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class=h>${A.length?`自動符合 ${ok}／${A.length} 項`:''}${mn.length?`${A.length?'，':''}自己確認 ${mk}／${mn.length} 項`:''}${g.need?'（需要 '+(g.need=='all'||g.need>=g.items.length?'全部':g.need+' 項')+'）':''}</span>${g.items.map((i,ii)=>row(i,gi,ii)).join('')}</div>`}).join('')}
  <div class=h style="margin-top:4px">自動檢核只看公開資料，僅供參考，不是投資建議。</div></div>`}
// 買進時記下的條件（收起來，點開才看）
function ckMetRec(T,st){const L=T.met||[];if(!L.length)return'';const cur=new Set(st?stConds(st).flatMap(g=>g.items):[]),old=L.filter(t=>!cur.has(t));
 return`<details class=ckrec><summary class=h>買進時（${esc(T.metAt||T.created||'')}）記錄符合 ${L.length} 項${old.length?`，其中 ${old.length} 項是舊版本的條件`:''}</summary>${L.map(t=>`<div class=h>✓ ${ckT(t)}${(T.metNote||{})[t]?' <i>（'+esc(T.metNote[t])+'）</i>':''}</div>`).join('')}</details>`}
// ---------- 要補資料：在條件下面直接填
const ckFixable=r=>!!(r&&r.v==null&&r.fix&&r.fix.length);
const CK_ATTR={growth:'產業有 2 年以上結構性成長',cyc:'景氣循環股',lead:'產業龍頭或寡占'};
function ckFixHtml(c,F){c=cU(c);const y=+TODAY.slice(0,4),dir=(f,on)=>(typeof OL_DIR!='undefined'?OL_DIR:[['up','向上'],['flat','持平'],['down','向下']]).map(([v,l])=>`<button onclick="${on.replace('$V',v)}">${l}</button>`).join('');
 return[...new Set(F)].map(f=>{
  if(f.startsWith('attr:')&&f!='attr:theme'){const k=f.slice(5);return`<div class=ckfx data-k="${f}">✏️ ${CK_ATTR[k]||k}？<button onclick="ckFix.attr('${c}','${k}',1)">是</button><button onclick="ckFix.attr('${c}','${k}',0)">否</button></div>`}
  if(f=='attr:theme')return`<div class=ckfx data-k="attr:theme">✏️ 所屬主題 <input list=ckThL placeholder="例如 AI 伺服器" style="width:140px"><datalist id=ckThL>${Object.keys(S.themes||{}).map(n=>`<option value="${esc(n)}">`).join('')}</datalist><button onclick="ckFix.theme(this,'${c}')">儲存</button></div>`;
  if(f.startsWith('theme:')){const n=f.slice(6);return`<div class=ckfx data-k="theme" data-n="${esc(n)}">✏️ 主題「${esc(n)}」現在 ${dir('',`ckFix.th(this,'$V')`)}<div class=h>日期記今天；來源和重點可以到「🧭 策略 → 📚 策略庫 → 🧭 主題指標」補</div></div>`}
  if(f=='eps')return`<div class=ckfx data-k="eps">✏️ 法人 EPS 預估：${y} 年 <input type=number step=any class=e1 style="width:72px"> ${y+1} 年 <input type=number step=any class=e2 style="width:72px"><br><input class=es placeholder="來源，例如 FactSet 中位數、元大投顧" style="width:190px"> <input type=date class=ed value="${TODAY}" style="width:135px"> <button onclick="ckFix.eps(this,'${c}')">新增</button><div class=h>今年和明年都要填；不知道去哪找，可以按資產頁「✏️ 待補資料」裡的「🤖 請 AI 幫我找」</div></div>`;
  if(f=='guide')return`<div class=ckfx data-k="guide">✏️ 最近一次法說：下一季營收 ${dir('',`ckFix.guide(this,'${c}','rev','$V')`)}　毛利率 ${dir('',`ckFix.guide(this,'${c}','gm','$V')`)}<br>法說日期 <input type=date class=gd value="${TODAY}" style="width:135px"> <input class=gs placeholder="來源" style="width:110px"></div>`;
  return''}).join('')}
const ckFixRe=()=>{if(typeof olRe=='function')olRe();else{save();ckRefresh()}};
window.ckFix={
 attr:(c,k,v)=>{S.attr=S.attr||{};const a=S.attr[c]=S.attr[c]||{};a[k]=+v;a.d=TODAY;ckFixRe()},
 theme:(el,c)=>{const v=el.parentNode.querySelector('input').value.trim();if(!v){toast('請填主題名稱',0);return}S.attr=S.attr||{};const a=S.attr[c]=S.attr[c]||{};a.theme=v;a.d=TODAY;S.themes=S.themes||{};if(!S.themes[v])S.themes[v]={st:'',d:'',src:'',note:''};ckFixRe()},
 th:(el,v)=>{const n=el.closest('[data-n]').dataset.n;S.themes=S.themes||{};const t=S.themes[n]=S.themes[n]||{};t.st=v;t.d=TODAY;if(!t.src)t.src='自己判斷';ckFixRe()},
 eps:(el,c)=>{const w=el.closest('.ckfx'),q=s=>w.querySelector(s).value,a=num(q('.e1')),b=num(q('.e2')),src=q('.es').trim(),d=q('.ed')||TODAY,y=+TODAY.slice(0,4);if(a==null&&b==null){toast('請至少填一個年度的 EPS',0);return}
  S.outlook=S.outlook||{};const o=S.outlook[c]=S.outlook[c]||{};o.eps=o.eps||[];if(a!=null)o.eps.push({y,v:a,src,d});if(b!=null)o.eps.push({y:y+1,v:b,src,d});if(!src)toast('已新增；記得補上來源，之後才知道數字從哪裡來',0);ckFixRe()},
 guide:(el,c,f,v)=>{const w=el.closest('.ckfx'),d=w.querySelector('.gd').value||TODAY,src=w.querySelector('.gs').value.trim();S.outlook=S.outlook||{};const o=S.outlook[c]=S.outlook[c]||{},g=o.guide=o.guide||{};if(g.d!=d){g.rev=g.rev&&g.d==d?g.rev:'';g.gm=g.gm&&g.d==d?g.gm:''}g[f]=v;g.d=d;if(src)g.src=src;ckFixRe()}};

// ---------- 待補資料清單（資產頁）：✏️ 要補資料＋🔄 要更新；只列策略用得到的
// 財報季：每季財報期限前約一個月開始公布；資料日期早於這一季開始、而期限已過＝要更新
function ckSeason(d){const y=+TODAY.slice(0,4),L=[];for(const yy of[y-1,y])L.push([yy+'-01-15',yy+'-03-31'],[yy+'-04-15',yy+'-05-15'],[yy+'-07-15',yy+'-08-14'],[yy+'-10-15',yy+'-11-14']);const s=L.filter(([a,b])=>d<a&&b<=TODAY).pop();return s?s[1]:''}
function ckStaleWhy(c,d){if(!d)return'';if(dDays(d,TODAY)>120)return`是 ${ckMD(d)} 的，超過 4 個月`;const s=ckSeason(d);if(s)return`是 ${ckMD(d)} 的，${ckMD(s)} 財報期限過後還沒更新`;
 const ev=(S.events||[]).filter(e=>e.code==c&&/法說/.test(e.type||'')&&e.date>d&&e.date<=TODAY).sort((a,b)=>a.date<b.date?1:-1)[0];return ev?`是 ${ckMD(d)} 的，${ckMD(ev.date)} 法說會後還沒更新`:''}
function ckTodo(){if(!CK)return[];const L=[],key=new Set(),push=o=>{const k=o.k+'|'+(o.n||o.c);if(key.has(k)){const x=L.find(z=>z.k+'|'+(z.n||z.c)==k);if(x&&o.c&&!x.cs.includes(o.c))x.cs.push(o.c);return}key.add(k);o.cs=o.c?[o.c]:[];L.push(o)};
 for(const T of S.theses||[]){if(T.status=='exit')continue;const st=stStrat(S,T.sid);if(!st)continue;const c=cU(T.code),done=ckDone(T).n,use={eps:0,guide:0,theme:0};
  for(const g of ckGroups(st,c)){const items=/依序/.test(g.rule||'')?g.items.slice(done,done+1):g.items;
   for(const i of items){const t=ckN(i.t);if(/EPS預估/.test(t))use.eps=1;if(/法說/.test(t))use.guide=1;if(/主題|產業報價/.test(t))use.theme=1;
    if(!i.r)continue;if(ckFixable(i.r))for(const f of i.r.fix){if(f.startsWith('theme:'))push({k:'fix',f:'theme',n:f.slice(6),c});
     else if(f=='eps'&&(((S.outlook||{})[c]||{}).eps||[]).length&&!(S.outlook[c].eps).some(e=>e.d&&dDays(e.d,TODAY)<=120)){const d=((S.outlook||{})[c].eps).map(e=>e.d).filter(Boolean).sort().pop();push({k:'old',f:'eps',c,n:c+'oldeps',w:ckStaleWhy(c,d)||`是 ${ckMD(d)} 的，請更新`})}
     else push({k:'fix',f,c:c,n:c+f})}
    else if(i.r.hint=='new')push({k:'soft',f:'eps',c,n:c+'soft',w:`有 ${ckMD(i.r.hd)} 的預估；要一筆 ${ckMD(ckAddD(TODAY,-45))} 之後的新預估，才能比較有沒有下修`});
    else if(i.r.hint=='none')push({k:'soft',f:'eps',c,n:c+'soft',w:'補上法人 EPS 預估，就不用再用月營收代替判斷'})}}
  const o=(S.outlook||{})[c]||{};
  if(use.eps&&(o.eps||[]).length){const d=o.eps.map(e=>e.d).filter(Boolean).sort().pop(),w=ckStaleWhy(c,d);if(w&&!key.has('fix|'+c+'eps')&&!key.has('old|'+c+'oldeps'))push({k:'old',f:'eps',c,n:c+'oldeps',w})}
  if(use.guide&&o.guide&&o.guide.d){const w=ckStaleWhy(c,o.guide.d);if(w&&!key.has('fix|'+c+'guide'))push({k:'old',f:'guide',c,n:c+'oldguide',w})}
  if(use.theme){const n=((S.attr||{})[c]||{}).theme,t=n&&(S.themes||{})[n];if(t&&t.d&&t.st&&dDays(t.d,TODAY)>120)push({k:'old',f:'theme',n,c,w:`是 ${ckMD(t.d)} 的，超過 4 個月`})}}
 L.forEach(o=>{if(o.k=='soft'&&(key.has('fix|'+o.c+'eps')||key.has('old|'+o.c+'oldeps')))o.skip=1});return L.filter(o=>!o.skip).sort((a,b)=>({fix:0,old:1,soft:2})[a.k]-({fix:0,old:1,soft:2})[b.k])}
function ckTodoHtml(){const L=ckTodo();if(!L.length)return'';const nm=c=>esc(c+' '+nameOf(c)),dir=n=>(typeof OL_DIR!='undefined'?OL_DIR:[]).map(([v,l])=>`<button data-n="${esc(n)}" onclick="ckFix.th(this,'${v}')">${l}</button>`).join('');
 const row=o=>{if(o.f=='theme')return`<div class=ckto data-n="${esc(o.n)}">${o.k=='old'?'🔄':'✏️'} 主題「${esc(o.n)}」${o.k=='old'?o.w:'還沒有狀態'}（${o.cs.map(nm).join('、')}）：${dir(o.n)}</div>`;
  if(o.f.startsWith('attr:')&&o.f!='attr:theme'){const k=o.f.slice(5);return`<div class=ckto>✏️ ${nm(o.c)}：${CK_ATTR[k]}？<button onclick="ckFix.attr('${o.c}','${k}',1)">是</button><button onclick="ckFix.attr('${o.c}','${k}',0)">否</button></div>`}
  const lb={'attr:theme':'所屬主題',eps:'法人 EPS 預估（'+TODAY.slice(0,4)+'、'+(+TODAY.slice(0,4)+1)+'）',guide:'最近一次法說指引'}[o.f]||o.f;
  if(o.k=='soft')return`<div class=ckto>💡 ${nm(o.c)}：${esc(o.w)} <button onclick="ckGo('${o.c}','eps',1)">填寫</button></div>`;
  return`<div class=ckto>${o.k=='old'?'🔄':'✏️'} ${nm(o.c)}：${lb}${o.k=='old'?' '+esc(o.w):''} <button onclick="ckGo('${o.c}','${o.f}',${o.k=='old'?1:0})">${o.k=='old'?'更新':'填寫'}</button></div>`};
 const n=L.filter(o=>o.k!='soft').length;
 return`<details class="stal asfx" ${ls('lcfx')=='0'?'':'open'} ontoggle="ls('lcfx',this.open?'1':'0')"><summary><b>✏️ 待補資料（${n}）</b> <span class=h>補了之後，條件會自動重新判斷</span></summary>${L.map(row).join('')}
  <div class=h style="margin-top:4px">✏️ 缺的資料　🔄 舊了要更新（超過 4 個月、財報期限或法說會之後）　💡 補了判斷更準</div><div class=asbtn><button onclick="ckAiAsk()">🤖 請 AI 幫我找（複製請求）</button></div></details>`}
// 跳到個股頁的填寫位置
window.ckGo=(c,f,old)=>{asStock(c,'a');setTimeout(()=>{const b=$('asOvB');if(!b)return;let el=!old&&b.querySelector(`.ckfx[data-k="${f}"]`);
 if(!el){const d=b.querySelector('details.olc');if(d){d.open=true;el=f=='eps'?b.querySelector('#olV'):f=='guide'?d.querySelector('.olf input[type=date]'):d}}
 if(el){let p=el.parentNode;while(p&&p!==b){if(p.tagName=='DETAILS')p.open=true;p=p.parentNode}el.scrollIntoView({block:'center'});const i=el.matches&&el.matches('input')?el:el.querySelector&&el.querySelector('input');if(i)i.focus();(el.closest('.ckfx')||el).classList.add('ckhi')}},60)};
// 複製一段請求給 AI：列出缺的與要更新的資料，要求附來源、用投資帳本 v1 輸出
window.ckAiAsk=()=>{const L=ckTodo(),y=+TODAY.slice(0,4),nm=c=>c+' '+nameOf(c),by=f=>L.filter(o=>o.f==f),uniq=a=>[...new Set(a)];
 const eps=uniq(by('eps').map(o=>nm(o.c))),gd=uniq(by('guide').map(o=>nm(o.c))),th=by('theme').map(o=>`${o.n}（${o.cs.map(nm).join('、')}）`),at=L.filter(o=>o.f.startsWith('attr:')).map(o=>nm(o.c)+'：'+(o.f=='attr:theme'?'所屬主題':CK_ATTR[o.f.slice(5)]));
 const t=`請幫我收集以下台股資料（今天是 ${TODAY}）。只用公開網頁上寫明「哪家機構、哪一天、多少」的數字，每筆附來源與日期；找不到就說找不到，不要推算或自己湊數字。
${eps.length?`
1. 法人 EPS 預估（${y} 年、${y+1} 年）：${eps.join('、')}
   可以的話用同一個來源（例如 FactSet 分析師中位數）的最新一次和約 3 個月前那一次，兩筆都列。
`:''}${gd.length?`
2. 最近一次法說會對下一季營收、毛利率的展望（向上／持平／向下）與法說日期：${gd.join('、')}
`:''}${th.length?`
3. 主題（產業）現在的狀態（向上／持平／向下＋一句重點）：${th.join('；')}
`:''}${at.length?`
4. 股票屬性：${at.join('；')}
`:''}
最後請用「投資帳本 v1」格式輸出一個 json（只放有找到的），例如：
{"format":"投資帳本 v1","outlook":[{"code":"2301","eps":[{"year":${y},"eps":11.19,"src":"FactSet 中位數（鉅亨網）","date":"${TODAY}"}],"guide":{"rev":"up","gm":"flat","date":"${TODAY}","src":"法說會","note":"一句重點"},"attr":{"growth":true,"cyc":false,"lead":true,"theme":"AI 伺服器"}}],"themes":[{"name":"PC","status":"down","date":"${TODAY}","src":"IDC","note":"一句重點"}]}`;
 asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>🤖 請 AI 幫我找</b></div><div class=h>按「複製」後貼到任何 AI 對話；拿到結果後，用「📥 從 AI 貼上」匯入，可以先預覽、也可以整批復原。</div><textarea id=ckAiT rows=14 style="width:100%;font-size:12.5px">${esc(t)}</textarea><div class=asbtn><button class=pri onclick="ckAiCopy()">📋 複製</button><button onclick="asClose()">關閉</button></div>`)};
window.ckAiCopy=()=>{const e=$('ckAiT');e.select();const ok=()=>toast('已複製，貼到 AI 對話就可以',0);if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(e.value).then(ok,()=>{document.execCommand('copy');ok()});else{document.execCommand('copy');ok()}};
window.ckMetTog=(id,gi,ii)=>{const T=stThesis(S,id),st=T&&stStrat(S,T.sid),g=st&&stConds(st)[gi],t=g&&g.items[ii];if(!t)return;const on=!(T.met||[]).includes(t);stMetT(id,t,on);ckRefresh()};
// 檢核資料讀到後，重畫用得到的地方
function ckRefresh(){try{if(typeof stCalc=='function')stCalc();if(typeof asCalc=='function')asCalc();if(typeof AT!='undefined'&&AT&&typeof asTh=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asTh();if(b)b.scrollTop=h}else if(typeof asCur!='undefined'&&asCur&&typeof asStock=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asStock(asCur.c,asCur.ac);if(b)b.scrollTop=h}}catch(e){}}
// 依策略的結論：可以買或加碼／還差幾項／不買條件成立／已達上限
// 自動判斷的看 ✅❌❔；要自己判斷的看論點有沒有勾；「依序加碼」看下一批的條件
// 依策略的結論：可以買或加碼／還差幾項／不買條件成立／已達上限／加碼間隔還沒到
// 自動判斷的看 ✅❌❔；要自己判斷的看有沒有按「確認符合」；「依序加碼」看下一批的條件
function ckVerdict(T){const st=stStrat(S,T.sid);if(!st||!CK||T.status=='exit')return null;const c=cU(T.code),M=new Set(T.met||[]),done=ckDone(T).n;
 let need=0,unk=0,man=0,bl='',fin=0;const nb=[];
 let wt=0;const one=i=>i.r?(i.r.v===true?1:i.r.v===false?0:ckFixable(i.r)?-1:-3):(M.has(i.t)?1:-2);
 for(const g of ckGroups(st,c)){
  if(g.need=='none'){for(const i of g.items)if(i.r&&i.r.v===true)nb.push(i.t.replace(/〔.〕/g,''));continue}
  if(/依序/.test(g.rule||'')){if(done>=g.items.length){fin=g.items.length;continue}bl=`第 ${done+1} 批`;const s=one(g.items[done]);if(s==0)need++;else if(s==-1)unk++;else if(s==-2)man++;else if(s==-3)wt++;continue}
  const n=g.need=='all'?g.items.length:(+g.need||0);if(!n)continue;const L=g.items.map(one),ok=L.filter(x=>x==1).length;if(ok>=n)continue;
  let lack=n-ok;const u=L.filter(x=>x==-1).length,m=L.filter(x=>x==-2).length,w=L.filter(x=>x==-3).length;const a=Math.min(lack,m);man+=a;lack-=a;const b=Math.min(lack,u);unk+=b;lack-=b;const ww=Math.min(lack,w);wt+=ww;lack-=ww;need+=lack}
 const verb=T.status=='plan'?'買':'加碼',E=stExposure(S),p=E.tot>0?(E.by[c]||0)/E.tot*100:0,cap=stCapStock(S,c);
 if(nb.length)return{t:'⛔ 不買：'+nb[0],cls:'bad'};
 if(fin&&!bl)return{t:`${fin} 批都買完了，不再加碼`,cls:'h'};
 const pre=bl?bl+'：':'',G=typeof stAddGate=='function'?stAddGate(S,T,st):null,hl=G&&G.halt?`⏸ 暫停加碼（${G.halt}）`:'';
 const parts=[need?`還差 ${need} 項`:'',unk?`${unk} 項要補資料 ✏️`:'',man?`${man} 項要自己確認`:'',wt?`${wt} 項等資料累積`:''].filter(Boolean);
 if(parts.length)return{t:(hl?hl+'；':'')+pre+parts.join('、'),cls:hl?'wn':need?'h':'wn'};
 if(G&&G.wait)return{t:`${pre}條件符合，但${G.wait}`,cls:'wn'};
 if(p>=cap)return{t:`${pre}條件符合，但已達個股上限 ${cap}%`,cls:'wn'};
 return{t:`✅ ${pre}條件符合，可以${verb}${hl?'（注意：'+G.halt+'）':''}`,cls:'ok'}}

// ---------- 出場條件：策略「何時賣」逐條自動判斷
// 規則一行一條「1. 標籤：條件，動作」或「1. 條件：動作」，可以用「；」分成好幾段；條件用和買進相同的判斷
// 價格類（跌破均價、從最高點回落）用策略均價、持有期間最高收盤；進場時的 52 週高點、融資餘額在第一次持有時記下
CK_ATOMS.push(
 [/^(?:收盤價?|股價)?跌破(月線|季線|半年線)(?:[−-](\d+(?:\.\d+)?)%)?$/,x=>m=>{const[k]=CK_MA[x[1]],ma=m[k];if(ma==null)return NA(x[1]+'資料不足');const p=+(x[2]||0),th=ma*(1-p/100);return R_(m.c<th,`收盤 ${f2(m.c)}，${x[1]}${p?' −'+p+'%':''} ${f2(th)}`)}],
 [/^(?:現價|收盤價?|股價)?跌破(?:策略)?均價[−-](\d+(?:\.\d+)?)%$/,x=>m=>{const a=CKX.avg;if(a==null)return NA('要在論點裡判斷（需要策略均價）');const th=a*(1-x[1]/100);return R_(m.c<th,`收盤 ${f2(m.c)}，策略均價 ${f2(a)} −${x[1]}% ＝ ${f2(th)}`)}],
 [/^(?:從)?(?:持有期間)?(?:的)?最高(?:點|收盤)?回落(\d+(?:\.\d+)?)%(?:時)?$/,x=>m=>{const p=CKX.peak;if(p==null)return NA('要在論點裡判斷（需要持有期間的收盤價）');const th=p*(1-x[1]/100);return R_(m.c<=th,`持有期間最高收盤 ${f2(p)}，回落 ${x[1]}% ＝ ${f2(th)}，收盤 ${f2(m.c)}（${pc((m.c/p-1)*100)}）`)}],
 [/^本益比(?:回)?到(?:近)?5年(?:本益比)?區間(?:的)?上緣$/,x=>m=>m.pe==null?NA('本益比資料不足（可能虧損）'):m.peHi5==null?NA('本益比區間上緣的資料下次更新檢核資料後才有'):R_(m.pe>=m.peHi5,`本益比 ${f1(m.pe)} 倍，近 5 年上緣（第 80 百分位）${f1(m.peHi5)} 倍`)],
 [/^本益比(?:降到|<)(\d+(?:\.\d+)?)倍?以下?$/,x=>m=>m.pe==null?NA('本益比資料不足（可能虧損）'):R_(m.pe>0&&m.pe<+x[1],`本益比 ${f1(m.pe)} 倍`)],
 [/^毛利率連(\d+)季下滑$/,x=>m=>{const n=+x[1],g=(m.gm||[]).filter(v=>v!=null);if(g.length<n+1)return NA('季報資料不足');const L=g.slice(-n-1);return R_(L.every((v,i)=>!i||v<L[i-1]),`近 ${n+1} 季毛利率 ${L.map(v=>v+'%').join(' → ')}`)}],
 [/^月營收年增率?轉負連(\d+)個月$|^(?:月營收)?年增率連(\d+)個月(?:<0%?|為負|轉負)$/,x=>m=>{const n=+(x[1]||x[2]),y=(m.ry||[]).filter(v=>v!=null);if(y.length<n)return NA('月營收資料不足');const L=y.slice(-n);return R_(L.every(v=>v<0),`年增率 ${L.map(v=>v+'%').join(' → ')}`)}],
 [/^月營收年增率(?:轉負|<0%?)$/,x=>m=>{const y=(m.ry||[]).filter(v=>v!=null);if(!y.length)return NA('月營收資料不足');const v=y[y.length-1];return R_(v<0,`最新年增率 ${v}%`)}],
 [/^回到前高$/,x=>m=>{const h=CKX.hi0??m.hi250;if(h==null)return NA('資料不足');return R_(m.c>=h,`收盤 ${f2(m.c)}，${CKX.hi0!=null?'進場前 52 週最高':'近一年最高'}收盤 ${f2(h)}`)}],
 [/^股價淨值比到(?:近)?10年區間(?:的)?上1\/3$/,x=>m=>m.pbPct10==null?NA('股價淨值比歷史資料不足'):R_(m.pbPct10>=2/3,`股價淨值比 ${f2(m.pb)}，在近 10 年區間的 ${Math.round(m.pbPct10*100)}% 位置`)],
 [/^持有(?:超過|滿)(\d+)個月.*$/,x=>m=>{const f=CKX.first;if(!f)return NA('要在論點裡判斷（需要第一次買進日）');const mo=dDays(f,TODAY)/30.44;return R_(mo>=+x[1],`${ckMD(f)} 起持有 ${f1(mo)} 個月`)}],
 [/^EPS連(\d+)季年減$/,x=>m=>{const q=m.epsQ,n=+x[1];if(!q||q.length<n+4||q.slice(-n-4).some(v=>v==null))return NA('季 EPS 資料下次更新檢核資料後才有');const L=q.slice(-n).map((v,i)=>[v,q[q.length-n-4+i]]);return R_(L.every(([a,b])=>a<b),`近 ${n} 季 EPS ${L.map(([a,b])=>f2(a)+'（去年同季 '+f2(b)+'）').join('、')}`)}],
 [/^(?:近3年平均)?配息率(?:降到|<)(\d+)%以下?$/,x=>m=>m.pay3==null?NA('股利資料不足'):R_(m.pay3<+x[1],`近 3 年平均配息率 ${f1(m.pay3)}%`)],
 [/^占主動部位>(\d+)%$/,x=>m=>{const E=stExposure(S),p=E.tot>0?(E.by[CKX.c]||0)/E.tot*100:null;return p==null?NA('沒有主動部位'):R_(p>+x[1],`占主動部位 ${f1(p)}%`)}],
 [/^同產業月營收年增率中位數連(\d+)個月轉弱$/,x=>m=>{const g=typeof indOf=='function'?indOf(CKX.c):'',a=g&&CK.ind?CK.ind[g]:null,n=+x[1];if(!a||a.length<n+1)return NA('產業資料不足');const L=a.slice(-n-1);return R_(L.every((v,i)=>!i||v<L[i-1]),`${g}營收年增率中位數 ${L.map(v=>v+'%').join(' → ')}`)}],
 [/^融資餘額(?:比進場時多|回升|增加)$/,x=>m=>{const a=m.mg&&m.mg[0],b=CKX.mg0;if(a==null)return NA('融資資料不足');if(b==null)return NA('要在論點裡判斷（需要進場時的融資餘額）');return R_(a>b,`融資餘額 ${R(a)} 張，進場時 ${R(b)} 張`)}]
);
const EX_LB=/停利|停損|失效|減碼|出場|結束|期限|轉弱|反轉|均線|移動|檢查/,EX_ACT=/(賣|減碼|出場|重新評估|轉到|檢討)/;
function exFrac(a){a=String(a||'');if(/1\/3|三分之一/.test(a))return 1/3;if(/一半|1\/2|二分之一|分批/.test(a))return .5;if(/全部|出場/.test(a))return 1;if(/重新評估|檢討|轉到/.test(a))return 0;return null}
// 條件和動作：第一個含「賣、減碼、出場…」的逗號段落起算是動作；沒有逗號時，看動作是不是直接接在條件後面（「收盤跌破季線賣一半」）
function exSplit(s){const P=s.split(/[，,]/).map(x=>x.trim()).filter(Boolean);const i=P.findIndex((p,k)=>k>0&&EX_ACT.test(p));if(i>0)return[P.slice(0,i).join('，'),P.slice(i).join('，')];
 const L=P.length?P[P.length-1]:'',g=L.match(/^(.+?)((?:先|再)?(?:賣|減碼|全部賣出|出場).*)$/);if(g&&!/時$/.test(g[1]))return[P.slice(0,-1).concat([g[1]]).join('，'),g[2]];return[P.join('，'),'']}
// 策略的出場規則 → [{key, lb 標籤, cond 條件, act 動作, frac 賣出比例（1 全部、0.5 一半、0 重新評估、null 不明）}]
function exRules(st){const out=[];if(!st)return out;String(st.exit||'').split(/\n/).forEach(ln=>{const mm=ln.trim().match(/^(\d+)[.、．)]\s*(.+)$/);if(!mm)return;
 let lb0='';mm[2].split(/[；;]/).forEach((seg,si)=>{seg=seg.trim();if(!seg)return;const k=seg.search(/[：:]/);let lb='',cond='',act='';
  if(k>0){const L=seg.slice(0,k).trim(),Rr=seg.slice(k+1).trim();if(EX_LB.test(L)){lb=L.replace(/（[^）]*）/g,'');[cond,act]=exSplit(Rr)}else{cond=L;act=Rr}}else[cond,act]=exSplit(seg);
  if(!cond)return;if(!lb&&si)lb=lb0;else lb0=lb;if(!act&&/停損|理由失效/.test(lb))act='全部賣出';out.push({key:mm[1]+(si?'.'+(si+1):''),lb,cond,act,frac:exFrac(act)})})});return out}
// 出場條件的寫法 → 判斷用：「A、B、或 C」都算「或」；「A 且 B」拆成「且」
const exNorm=c=>{c=String(c).replace(/、\s*或/g,'，或');if(/或/.test(c.replace(/走平或上彎|或整理區|或者/g,'')))c=c.replace(/、/g,'，或');return c.replace(/([^，,\s])\s*且\s*(?!加速)/g,'$1，且').replace(/\s*時\s*$/,'')};
// 論點的判斷背景：策略均價、第一次買進日、持有期間最高收盤、進場時記下的 52 週高點與融資餘額
function exCtx(T){const p=stPerf(S,T),c=cU(T.code),avg=p.q>0?p.cost/p.q:null;let peak=null;
 if(p.first&&typeof PXH!='undefined')for(const d in PXH){if(d>=p.first&&num(PXH[d][c])!=null)peak=Math.max(peak??-Infinity,num(PXH[d][c]))}
 const px=num((S.px||{})[c]);if(px!=null&&p.first)peak=Math.max(peak??-Infinity,px);return{c,st:stStrat(S,T.sid),T,avg,first:p.first,peak,hi0:num(T.hi0),mg0:num(T.mg0)}}
function exEval(T){const st=stStrat(S,T.sid);if(!st||!CK)return[];const L=exRules(st);if(!L.length)return[];const c=cU(T.code),m=ckM(c),k=CK.mkt,X=exCtx(T);
 return L.map(x=>{const t=exNorm(x.cond);let r=null,hit='';if(ckAuto(t)){if(!m)r={v:null,why:'',miss:'沒有這檔的資料'};else{CKX=X;r=ckRun(ckParse(t),m,k);
  // 「或」的條件：找出是哪一段成立，提醒只寫那一段
  if(r&&r.v===true){for(const p of ckN(t).split(/,或者?/)){const P=ckParse(p);if(!P)continue;CKX=X;const o=ckRun(P,m,k);if(o&&o.v===true){hit=o.why;break}}}}}
  return Object.assign({},x,{r,hit})})}
// 已處理：條件還成立時不再提醒；條件不成立後自動解除（下一次成立會再提醒）
window.exAck=(id,key)=>{const T=stThesis(S,id);if(!T)return;T.exAck=T.exAck||{};T.exAck[key]=TODAY;save();upd();if(typeof asCalc=='function')asCalc()};
function exRearm(T){if(!T.exAck||!CK)return 0;let ch=0;for(const x of exEval(T))if(T.exAck[x.key]&&x.r&&x.r.v===false){delete T.exAck[x.key];ch++}return ch}
// 個股頁、完整論點：出場條件卡
function ckExitHtml(T,st){if(!st||T.status!='hold')return'';const L=exRules(st);if(!L.length)return'';
 if(!CK)return`<div class="asck ckc"><b>🚪 出場條件</b><div class=h>${ckErr?'讀不到自動檢核資料。':'資料讀取中…'}</div></div>`;
 const E=exEval(T),X=exCtx(T),ack=T.exAck||{};
 const p=stPerf(S,T),rm=typeof stRmul=='function'?stRmul(T,p.ret):null;
 return`<div class="asck ckc"><b>🚪 出場條件</b> <span class=h>策略均價 ${X.avg!=null?f2(X.avg):'—'}${X.peak!=null?`｜持有期間最高 ${f2(X.peak)}`:''}${num(T.risk0)?`｜進場停損 ${f2(num(T.stop0))}（每股風險 ${f1(num(T.risk0))}%${T.rec0=='補記'?'，補記':''}）${rm!=null?`，目前 ${rm>=0?'+':''}${rm.toFixed(2)}R`:''}`:''}</span><div class=h style="font-size:11.5px">🔴 成立（照規則處理）　✓ 沒有成立　⏳ 資料不足　❔ 要自己判斷</div>${E.map(x=>{const r=x.r,ic=!r?'❔':r.v===true?'🔴':r.v===false?'✓':'⏳';
  return`<div class=ckl>${ic} ${x.lb?`<b>${esc(x.lb)}</b>：`:''}${ckT(x.cond)}${x.act?` → <b>${esc(x.act)}</b>`:''}${r?`<div class=h>${esc(r.why)}${r.miss?' <i>'+esc(r.miss)+'</i>':''}</div>`:'<div class=h>要自己判斷</div>'}${r&&r.v===true?(ack[x.key]?`<div class=h>${ckMD(ack[x.key])} 已處理（條件不成立後會自動解除）</div>`:` <button class=ckmb onclick="exAck('${T.id}','${x.key}')">✓ 已處理</button>`):''}</div>`}).join('')}
  ${exTrigHtml(T)}<div class=h style="margin-top:4px">自動判斷只看公開資料與你記的交易，僅供參考，不是投資建議。</div></div>`}

// ---------- 今天的觸發價：和價格有關的出場規則，今天收盤到哪個價位就成立
// 均線用最近一次檢核資料的均線估（今天的收盤會讓均線移動一點，所以標「約」）；均價、最高點、停損價、本益比上緣是精確的
function exTrig(T){const st=stStrat(S,T.sid),c=cU(T.code),m=CK?ckM(c):null,X=exCtx(T),out=[];
 const add=(px,dir,what,act,ap)=>{if(px!=null&&isFinite(px)&&px>0)out.push({px:+px.toFixed(2),dir,what,act,ap:!!ap})};
 if(num(T.stop)!=null)add(num(T.stop),'≤','論點停損價','全部賣出');
 for(const x of exRules(st)){for(const p of ckN(exNorm(x.cond)).split(/,或者?/)){if(/,且/.test(p))continue;let g;
  if((g=p.match(/^(?:收盤價?|股價)?跌破(月線|季線|半年線)(?:[−-](\d+(?:\.\d+)?)%)?$/))&&m){const ma=m[CK_MA[g[1]][0]];if(ma!=null)add(ma*(1-(+(g[2]||0))/100),'<',`跌破${g[1]}${g[2]?' −'+g[2]+'%':''}`,x.act,1)}
  else if((g=p.match(/^(?:現價|收盤價?|股價)?跌破(?:策略)?均價[−-](\d+(?:\.\d+)?)%$/))&&X.avg!=null)add(X.avg*(1-g[1]/100),'<',`跌破均價 −${g[1]}%`,x.act)
  else if((g=p.match(/^(?:從)?(?:持有期間)?(?:的)?最高(?:點|收盤)?回落(\d+(?:\.\d+)?)%(?:時)?$/))&&X.peak!=null)add(X.peak*(1-g[1]/100),'≤',`從最高點回落 ${g[1]}%`,x.act)
  else if(/^回到前高$/.test(p)&&(X.hi0??(m&&m.hi250))!=null)add(X.hi0??m.hi250,'≥','回到前高',x.act)
  else if(/^本益比(?:回)?到(?:近)?5年(?:本益比)?區間(?:的)?上緣$/.test(p)&&m&&m.pe>0&&m.peHi5)add(m.c*m.peHi5/m.pe,'≥','本益比到 5 年上緣',x.act)}}
 const px=num((S.px||{})[c])??(m&&m.c),U=[];for(const o of out){const d=U.find(u=>(u.dir=='≥')==(o.dir=='≥')&&Math.abs(u.px/o.px-1)<0.003);if(d){if(d.what=='論點停損價'){d.what=o.what+'（＝論點停損價）';d.act=o.act;d.ap=o.ap}else if(o.what=='論點停損價')d.what+='（＝論點停損價）';else d.what+='、'+o.what;continue}U.push(o)}
 U.forEach(o=>{o.gap=px?(o.px/px-1)*100:null;o.hit=o.gap!=null&&(o.dir=='≥'?o.gap<=0:o.gap>=0)});return U.sort((a,b)=>(b.hit-a.hit)||Math.abs(a.gap??99)-Math.abs(b.gap??99))}
function exTrigHtml(T,n){const L=exTrig(T).slice(0,n||9);if(!L.length)return'';
 return`<div class=h style="margin-top:4px"><b>今天收盤的觸發價</b>（收盤判斷，回測也是隔天開盤成交）</div>${L.map(o=>`<div class=ckl style="font-size:12.5px">${o.hit?'🔴 ':''}收盤 ${o.dir} <b>${o.ap?'約 ':''}${f2(o.px)}</b>${o.gap!=null?` <span class=h>（${o.hit?'現價已經到了':'距現價 '+(o.gap>=0?'+':'')+o.gap.toFixed(1)+'%'}）</span>`:''}：${esc(o.what)}${o.act?' → '+esc(o.act):''}</div>`).join('')}`}
