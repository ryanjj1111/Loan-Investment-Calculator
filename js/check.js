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
const ckN=s=>String(s||'').replace(/（[^）]*）|\([^)]*\)/g,'').replace(/\s+/g,'').replace(/，/g,',').replace(/：/g,':').replace(/＞/g,'>').replace(/＜/g,'<').replace(/[≧]|>=/g,'≥').replace(/[≦]|<=/g,'≤').replace(/[～〜]/g,'~').replace(/％/g,'%').replace(/^第\d+批:/,'').replace(/^[-‧•]/,'');
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
 [/^千張大戶持股比例?連(\d+)週上升$/,x=>m=>{const n=+x[1],b=(m.bh||[]).filter(v=>v!=null);if(b.length<n+1)return NA(`股權分散表每週累積，需要 ${n+1} 週（目前 ${b.length} 週）`);const L=b.slice(-n-1);return R_(L.every((v,i)=>!i||v>L[i-1]),`千張大戶 ${L.map(v=>v+'%').join(' → ')}`)}]
];
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
function ckEval(c,t){if(!CK||!ckAuto(t))return null;const P=ckParse(t),m=ckM(c),k=CK.mkt;if(!m)return{v:null,why:'',miss:'沒有這檔的資料',auto:1};
 const run=f=>{const o=f(m,k);return o.skip?null:o};
 if(typeof P=='function'){const o=run(P);return o?Object.assign(o,{auto:1}):null}
 // 或：有一段成立就成立；且：有一段不成立就不成立
 let any=false,unk=false,whys=[],miss=[],man=false;
 for(const fs of P.or){if(!fs){man=true;continue}let ok=true,u=false;for(const f of fs){const o=run(f);if(!o)continue;if(o.why)whys.push(o.why);if(o.miss)miss.push(o.miss);if(o.v===false)ok=false;else if(o.v==null)u=true}
  if(ok&&!u){any=true}else if(ok&&u)unk=true}
 const v=any?true:(unk||man)?null:false;return{v,why:whys.join('；'),miss:miss.join('；')+(man&&!any?'（有一部分要自己判斷）':''),auto:1}}
// 策略的每一組條件，加上自動判斷結果
function ckGroups(st,c){return stConds(st).map(g=>({sec:g.sec,need:g.need,items:g.items.map(t=>({t,r:ckEval(c,t)}))}))}
// 小標籤
function ckBadge(r,long){if(!r)return'';const ic=r.v===true?'✅':r.v===false?'❌':'❔',cl=r.v===true?'ok':r.v===false?'wn':'h';
 return` <span class="ckb ${cl}">${ic} 自動</span>${long&&(r.why||r.miss)?`<span class="ckw h">${esc(r.why)}${r.miss?' <i>'+esc(r.miss)+'</i>':''}</span>`:''}`}
// 論點摘要用：自動 ✅3 ❌2
function ckCount(T){const st=stStrat(S,T.sid);if(!st||!CK)return null;let ok=0,no=0;for(const g of ckGroups(st,T.code))for(const it of g.items)if(it.r){if(it.r.v===true)ok++;else if(it.r.v===false)no++}return ok+no?{ok,no}:null}
// 個股頁：今天的自動檢核
function ckCardHtml(T,st){if(!st)return'';const c=cU(T.code);if(!stConds(st).some(g=>g.items.some(ckAuto)))return'';
 if(!CK)return`<div class="asck ckc"><b>📋 今日自動檢核</b><div class=h>${ckErr?'讀不到自動檢核資料（離線，或網站還沒有資料）。':'資料讀取中…'}</div></div>`;
 const G=ckGroups(st,c).filter(g=>g.items.some(i=>i.r));
 return`<div class="asck ckc"><b>📋 今日自動檢核</b> <span class=h>${esc(ckAsOf())}</span>${G.map(g=>{const A=g.items.filter(i=>i.r),ok=A.filter(i=>i.r.v===true).length,man=g.items.length-A.length;
  return`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class=h>自動符合 ${ok}／${A.length} 項${man?`，另外 ${man} 項要自己判斷`:''}${g.need?'（需要 '+(g.need=='all'||g.need>=g.items.length?'全部':g.need+' 項')+'）':''}</span>${A.map(i=>`<div class=ckl>${i.r.v===true?'✅':i.r.v===false?'❌':'❔'} ${esc(i.t)}<div class=h>${esc(i.r.why)}${i.r.miss?' <i>'+esc(i.r.miss)+'</i>':''}</div></div>`).join('')}</div>`}).join('')}
  <div class=h style="margin-top:4px">自動檢核只看公開資料，僅供參考，不是投資建議。</div></div>`}
// 檢核資料讀到後，重畫用得到的地方
function ckRefresh(){try{if(typeof stCalc=='function')stCalc();if(typeof AT!='undefined'&&AT&&typeof asTh=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asTh();if(b)b.scrollTop=h}else if(typeof asCur!='undefined'&&asCur&&typeof asStock=='function'){const b=$('asOvB'),h=b?b.scrollTop:0;asStock(asCur.c,asCur.ac);if(b)b.scrollTop=h}}catch(e){}}
