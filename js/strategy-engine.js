// 策略日誌：計算（純函式，不碰畫面；可用 node 測試）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 engine.js：num、cU、bmC、hasInit、tradeAmt、holdings、sDate、TODAY
// 這裡的計算只讀交易紀錄與現價，不會改變任何信貸的計算結果。

const ST_CAP={stock:20,group:40};
const ST_STATUS=[['plan','規劃中'],['hold','持有中'],['exit','已出場']];
const ST_EXIT=[['invalid','理由失效'],['target','達到估值目標'],['stop','停損'],['timeout','超過持有期限'],['other','其他']];
const ST_FIELDS=['name','logic','term','screen','entry','exit','holdMin','holdMax','capStock','capGroup','capStrat','stopPct','stopTech','riskPct','rr','addDays','addPx','addPxPct','addHalt'];
// 期別：買之前先決定打算持有多久，再選對應的策略
const ST_TERM=[['短','短期（1～8 週）'],['中','中期（2～12 個月）'],['長','長期（1 年以上）']];
const stTermN=k=>(ST_TERM.find(x=>x[0]==k)||['',''])[1];
// 技術停損：和固定 % 停損一起算，取離現價比較近（比較高）的那個
const ST_STOPT=[['','（只用固定 %）'],['lo20','跌破進場前 20 日最低收盤'],['ma20','跌破月線'],['ma20-3','跌破月線 −3%'],['ma60-5','跌破季線 −5%'],['lo250','跌破近一年最低收盤'],['brk-5','跌回突破點（前 60 日高點）−5%'],['ma60-5|lo250','季線 −5% 或近一年最低收盤']];
const ST_TPL=[
 {name:'範例：價值回歸',logic:'基本面穩定的公司，股價因短期因素跌到估值區間下緣時分批買進，等估值回到區間中位數。（範例，請依自己的方法修改）',screen:'【選什麼：全部符合】\n1. 近 5 年獲利穩定\n2. 本益比或股價淨值比位於近 5 年區間下緣\n3. 負債比率不高',entry:'【何時買：至少 1 項】\n1. 股價止跌、站回月線\n2. 月營收年增率轉正\n【買多少】分 3 批、每批 1/3',exit:'1. 估值回到區間中位數以上：分批賣出\n2. 理由失效：獲利連 2 季衰退，全部賣出\n3. 停損：跌破均價 −20%\n4. 持有超過 12 個月仍未反映：重新評估',holdMin:3,holdMax:12,capStock:20,capGroup:40,stopPct:20,riskPct:2},
 {name:'範例：趨勢追蹤',logic:'順著中期趨勢操作：股價站上長期均線且營收成長時進場，跌破均線或營收轉弱時出場。（範例，請依自己的方法修改）',screen:'【選什麼：全部符合】\n1. 月營收年增率連 3 個月為正',entry:'【何時買：至少 2 項】\n1. 股價位於季線與半年線之上\n2. 突破整理區間\n3. 回測季線不破\n【買多少】分 2 批、每批 1/2',exit:'1. 收盤跌破季線：全部賣出\n2. 理由失效：月營收年增率轉負，全部賣出\n3. 停損：跌破均價 −10%',holdMin:1,holdMax:6,capStock:15,capGroup:35,stopPct:10,riskPct:1}];

const stStrat=(S,id)=>(S.strategies||[]).find(s=>s.id==id)||null;
const stThesis=(S,id)=>(S.theses||[]).find(t=>t.id==id)||null;
const stStatusN=k=>k=='build'?'持有中':(ST_STATUS.find(x=>x[0]==k)||['',''])[1];
function stNextId(list,pfx,w){let n=0;for(const x of list||[]){const m=new RegExp('^'+pfx+'(\\d+)$').exec(x.id||'');if(m)n=Math.max(n,+m[1])}return pfx+String(n+1).padStart(w,'0')}
function stSnapOf(st){const o={};ST_FIELDS.forEach(k=>o[k]=st[k]??'');return o}
// 目前內容和最新一個版本的內容不同＝有尚未存成版本的修改
function stDirty(st){const h=(st.hist||[]).slice(-1)[0];return!h||JSON.stringify(stSnapOf(h.snap))!=JSON.stringify(stSnapOf(st))}
function stNewStrategy(S,tpl,date){const st=Object.assign({id:stNextId(S.strategies,'S',2),ver:1,on:1},stSnapOf(tpl||{name:'新策略',holdMin:3,holdMax:12,capStock:ST_CAP.stock,capGroup:ST_CAP.group}));st.hist=[{ver:1,date:date||TODAY,reason:'初版',snap:stSnapOf(st)}];return st}
function stNewThesis(S,o){return Object.assign({id:stNextId(S.theses,'T',3),code:'',sid:'',sver:1,status:'plan',created:TODAY,why:'',wrongIf:'',expectM:'',plan:[],target:'',tgtPx:'',stop:'',useInit:0,reviews:[],exit:{date:'',reason:'',followed:'',note:''}},o||{})}
const addMon=(d,m)=>{const t=new Date(d+'T00:00:00Z');t.setUTCMonth(t.getUTCMonth()+(+m||0));return t.toISOString().slice(0,10)};
const dDays=(a,b)=>(Date.parse(b)-Date.parse(a))/864e5;

// 某日期的基準 ETF 價格：交易上手填 > 同日結算的現價 > 同日在持股表填的現價 > 撥款日價格
function stBmPx(S,dt,explicit){const b=num(explicit);if(b!=null)return b;const c=bmC(S);
 for(const s of S.snaps||[])if(sDate(s)==dt&&s.pxs&&num(s.pxs[c])!=null)return num(s.pxs[c]);
 if((S.pxd||{})[c]==dt&&num((S.px||{})[c])!=null)return num(S.px[c]);
 if(typeof PXH!='undefined'&&PXH[dt]&&num(PXH[dt][c])!=null)return num(PXH[dt][c]);
 if(dt==S.dd&&num(S.p0050)!=null)return num(S.p0050);return null}

// 日報酬的 XIRR（年化，%）
function xirrD(fl){if(fl.length<2)return null;const t0=Date.parse(fl[0].d);const f=r=>fl.reduce((a,c)=>a+c.v/Math.pow(1+r,(Date.parse(c.d)-t0)/864e5/365),0);
 let lo=-0.99,hi=10;if(!(fl.some(x=>x.v<0)&&fl.some(x=>x.v>0)))return null;if(f(lo)*f(hi)>0)return null;for(let i=0;i<120;i++){const m=(lo+hi)/2;f(lo)*f(m)<=0?hi=m:lo=m}return(lo+hi)/2*100}

// 基準 ETF 的配息（依除息日；同一天只算一次）
function stBmDivs(S){const c=bmC(S),m={};for(const x of S.trades||[]){if(x.k!='div'||cU(x.n)!=c||!x.dt)continue;const d=num(x.dps);if(d!=null)m[x.dt]=d}return Object.keys(m).sort().map(d=>({d,dps:m[d]}))}

// 跑一個「桶」的事件，算出損益與報酬。events：{d,k:'buy'|'sell'|'sdiv'|'div'|'divU',...}
function stRun(S,code,events,opt){opt=opt||{};const asOf=opt.asOf||events.reduce((m,e)=>e.d&&e.d>m?e.d:m,TODAY),pxm=opt.px||S.px||{},px=num(pxm[code]),bmc=bmC(S),bmNow=num(pxm[bmc]);
 const bd=stBmDivs(S).map(z=>({d:z.d,k:'bmdiv',dps:z.dps}));
 const ev=events.filter(e=>e.d&&e.d<=asOf).concat(bd.filter(z=>z.d<=asOf)).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:((a.k.startsWith('div')||a.k=='bmdiv')?0:1)-((b.k.startsWith('div')||b.k=='bmdiv')?0:1));
 let q=0,cost=0,real=0,div=0,inv=0,first=null,last=null,bmU=0,bmCost=0,bmCash=0;const miss=[],fl=[];
 for(const e of ev){
  if(e.k=='buy'){if(!first)first=e.d;const amt=e.g+e.fee;q+=e.q;cost+=amt;inv+=amt;fl.push({d:e.d,v:-amt});if(e.bm!=null){bmU+=amt/e.bm;bmCost+=amt}else miss.push(e)}
  else if(e.k=='sell'){const u=Math.min(e.q,q);if(u<=0)continue;const avg=cost/q,fr=u/q,cash=e.cash*(u/e.q);cost-=avg*u;real+=cash-avg*u;q-=u;fl.push({d:e.d,v:cash});last=e.d;if(e.bm!=null){const su=bmU*fr;bmCash+=su*e.bm;bmU-=su}else miss.push(e)}
  else if(e.k=='sdiv'){if(q>0||first)q+=e.q}
  else if(e.k=='div'){div+=e.cash;fl.push({d:e.pd||e.d,v:e.cash})}
  else if(e.k=='divU'){const m=tradeAmt(S,e.x),tot=m.q||0;if(tot>0&&q>0){const v=m.cash*Math.min(1,q/tot);div+=v;fl.push({d:e.x.pdt||e.x.dt,v})}}
  else if(e.k=='bmdiv'){if(bmU>0)bmCash+=bmU*e.dps}}
 const open=q>0.0001,mv=open?(px!=null?q*px:null):0,un=open?(mv!=null?mv-cost:null):0,pl=un==null?null:real+un+div,ret=inv>0&&pl!=null?pl/inv*100:null;
 const end=opt.exitDate||(open?asOf:(last||asOf));
 if(open&&mv!=null)fl.push({d:asOf,v:mv});fl.sort((a,b)=>a.d<b.d?-1:1);
 const xr=pl!=null?xirrD(fl):null,days=first?Math.max(0,dDays(first,end)):0;
 let bmRet=null;if(inv>0&&!miss.length&&bmCost>0){const bmEnd=bmU>1e-9?(bmNow!=null?bmU*bmNow:null):0;if(bmEnd!=null)bmRet=(bmCash+bmEnd-bmCost)/bmCost*100}
 return{code,q,cost,real,un,div,inv,pl,ret,xr,days,first,end,open,mv,px,bmRet,ex:ret!=null&&bmRet!=null?ret-bmRet:null,miss,bmNowMiss:open&&bmNow==null}}

// 論點的事件：期初持股（選擇納入時）＋歸屬此論點的交易＋沒歸類的配息依股數比例分配
// 策略起算：撥款前就有的持股，在建立論點那天（或自己填的起算日）才歸到策略，
// 策略的損益、持有天數、vs 0050、均價都從起算日的收盤價開始算；實際帳戶損益看資產頁的「📦 我的庫存」
function stBaseClose(S,c,d){if(typeof PXH!='undefined'&&PXH[d]&&num(PXH[d][c])!=null)return{v:num(PXH[d][c]),fix:1};
 const pd=(S.pxd||{})[c],v=num((S.px||{})[c]);if(v!=null&&pd==d)return{v,fix:1};if(v!=null&&d>=TODAY&&(!pd||pd<=d))return{v,fix:0};return null}
function stBase(S,T){if(!+T.useInit||!hasInit(S))return null;const d=T.baseD||T.created;if(!d||!S.dd||d<=S.dd)return null;
 const m=num(T.basePx),au=String(T.baseAuto||'');if(m!=null&&!(au&&au.endsWith('|'+m)&&au!=d+'|'+m))return{d,px:m,src:au==d+'|'+m?'收盤':'填'};const b=stBaseClose(S,cU(T.code),d);return b?{d,px:b.v,src:b.fix?'收盤':'暫用現價'}:{d,px:null,src:''}}
function stThesisEvents(S,T,B){const c=cU(T.code),ev=[];if(B===undefined)B=stBase(S,T);const on=B&&B.px!=null;
 if(+T.useInit&&hasInit(S)){let q=0,cost=0;for(const r of S.init)if(r.ac=='a'&&cU(r.n)==c){q+=+r.q||0;cost+=(+r.q||0)*(+r.px||0)}
  if(on){for(const x of S.trades||[])if(x.thesisId==T.id&&x.dt&&x.dt<B.d){const n=num(x.q)||0;if(x.k=='buy'||x.k=='sdiv')q+=n;else if(x.k=='sell')q-=n}
   if(q>0)ev.push({d:B.d,k:'buy',q,g:q*B.px,fee:0,tax:0,cash:-q*B.px,bm:stBmPx(S,B.d,null),init:1,base:1})}
  else if(q>0)ev.push({d:S.dd,k:'buy',q,g:cost,fee:0,tax:0,cash:-cost,bm:stBmPx(S,S.dd,null),init:1})}
 for(const x of S.trades||[]){if(!x.dt||cU(x.n)!=c)continue;if(on&&x.dt<B.d)continue;
  if(on&&x.k=='div'&&x.dt==B.d)continue;
  if(x.thesisId==T.id){const m=tradeAmt(S,x);if(x.k=='buy'||x.k=='sell')ev.push({d:x.dt,k:x.k,q:num(x.q)||0,g:m.g,fee:m.fee,tax:m.tax,cash:m.cash,bm:stBmPx(S,x.dt,x.bmPx),id:x.id});else if(x.k=='sdiv')ev.push({d:x.dt,k:'sdiv',q:num(x.q)||0});else if(x.k=='div')ev.push({d:x.dt,pd:x.pdt||x.dt,k:'div',cash:m.cash})}
  else if(!x.thesisId&&x.k=='div'&&x.ac=='a')ev.push({d:x.dt,k:'divU',x})}
 return ev}
function stPerf(S,T,opt){const B=stBase(S,T),r=stRun(S,cU(T.code),stThesisEvents(S,T,B),Object.assign({exitDate:T.status=='exit'&&T.exit&&T.exit.date?T.exit.date:null},opt||{}));r.base=B&&B.px!=null?B:null;return r}
// 交易日（只扣週末，國定假日不扣）：a 之後到 b 有幾個交易日；a 加 n 個交易日是哪天
function stTD(a,b){let n=0;const d=new Date(a+'T00:00:00Z'),e=new Date(b+'T00:00:00Z');while(d<e){d.setUTCDate(d.getUTCDate()+1);const w=d.getUTCDay();if(w&&w<6)n++}return n}
function stTDAdd(a,n){const d=new Date(a+'T00:00:00Z');while(n>0){d.setUTCDate(d.getUTCDate()+1);const w=d.getUTCDay();if(w&&w<6)n--}return d.toISOString().slice(0,10)}
const stMD=d=>d?String(d).slice(5).replace('-','/'):'';
// 加碼的限制：間隔幾個交易日、比上一批低或高幾 %、跌破第 1 批買價 −N% 暫停加碼
// 回傳 {wait:'還不能加碼的原因', halt:'暫停加碼的原因'}，都沒有＝null
function stAddGate(S,T,st){if(!st||T.status!='hold')return null;const B=(S.trades||[]).filter(x=>x.thesisId==T.id&&x.k=='buy'&&x.dt&&num(x.px)!=null).sort((a,b)=>a.dt<b.dt?-1:a.dt>b.dt?1:0),bs=stBase(S,T);
 const first=B.length?{d:B[0].dt,px:num(B[0].px),lb:'第 1 批'}:bs&&bs.px!=null?{d:bs.d,px:bs.px,lb:'起算價'}:null,last=B.length?{d:B[B.length-1].dt,px:num(B[B.length-1].px),lb:'上一批'}:first;
 if(!last)return null;const px=num((S.px||{})[cU(T.code)]),o={},nd=num(st.addDays),pp=num(st.addPxPct),hp=num(st.addHalt),lb=last.lb=='起算價'?'起算日':'上一批';
 if(nd){const n=stTD(last.d,TODAY);if(n<nd)o.wait=`${lb} ${stMD(last.d)} ${n?`買（隔 ${n} 個交易日）`:'才買'}，要隔 ${nd} 個交易日，約 ${stMD(stTDAdd(last.d,nd))} 後再看`}
 if(!o.wait&&pp&&(st.addPx=='down'||st.addPx=='up')&&px!=null&&last.px){const dn=st.addPx=='down',th=last.px*(dn?1-pp/100:1+pp/100);if(dn?px>th:px<th)o.wait=`要比${lb=='起算日'?'起算價':'上一批買價'} ${last.px} ${dn?'低':'高'} ${pp}% 以上（${dn?'≤':'≥'} ${th.toFixed(1)}），現價 ${px}`}
 if(hp&&px!=null&&first&&first.px){const th=first.px*(1-hp/100);if(px<th)o.halt=`跌破${first.lb=='起算價'?'起算價':'第 1 批買價'} ${first.px} −${hp}%（${th.toFixed(1)}）`}
 return o.wait||o.halt?o:null}
// 起算日的收盤價抓到後寫進論點，之後就固定
function stBaseFix(S){let ch=0;for(const T of S.theses||[]){const B=stBase(S,T);if(!B||B.src!='收盤'||num(T.basePx)===B.px)continue;T.basePx=B.px;T.baseAuto=B.d+'|'+B.px;T.baseD=T.baseD||B.d;ch++}return ch}

// 沒有歸類的部位：每檔分成「未分類」與「期初持股」兩個桶；沒歸類的賣出先扣未分類的股數，不夠再扣期初持股
function stUntagged(S,ac){const adopted=new Set((S.theses||[]).filter(T=>+T.useInit).map(T=>cU(T.code)));const codes=new Set();
 for(const x of S.trades||[])if(!x.thesisId&&(x.ac=='a'?'a':'p')==ac&&cU(x.n)&&x.k!='div')codes.add(cU(x.n));
 if(hasInit(S))for(const r of S.init)if((r.ac=='a'?'a':'p')==ac&&cU(r.n)&&(+r.q||0)>0)codes.add(cU(r.n));
 const unc=[],ini=[];
 for(const c of codes){let iq=0,icost=0;if(hasInit(S)&&!adopted.has(c))for(const r of S.init)if((r.ac=='a'?'a':'p')==ac&&cU(r.n)==c){iq+=+r.q||0;icost+=(+r.q||0)*(+r.px||0)}
  const U=[],I=[];if(iq>0)I.push({d:S.dd,k:'buy',q:iq,g:icost,fee:0,tax:0,cash:-icost,bm:stBmPx(S,S.dd,null)});
  const tr=(S.trades||[]).filter(x=>!x.thesisId&&(x.ac=='a'?'a':'p')==ac&&cU(x.n)==c&&x.dt&&x.k!='div').sort((a,b)=>a.dt<b.dt?-1:a.dt>b.dt?1:0);let uq=0,rq=iq;
  for(const x of tr){const m=tradeAmt(S,x),q=num(x.q)||0,bm=stBmPx(S,x.dt,x.bmPx);
   if(x.k=='buy'){U.push({d:x.dt,k:'buy',q,g:m.g,fee:m.fee,tax:m.tax,cash:m.cash,bm,id:x.id});uq+=q}
   else if(x.k=='sdiv'){const t=uq+rq;if(t>0){const a=q*uq/t;U.push({d:x.dt,k:'sdiv',q:a});I.push({d:x.dt,k:'sdiv',q:q-a});uq+=a;rq+=q-a}}
   else if(x.k=='sell'){const u1=Math.min(q,uq),u2=Math.min(q-u1,rq);if(u1>0)U.push({d:x.dt,k:'sell',q:u1,cash:m.cash*u1/q,bm,id:x.id});if(u2>0)I.push({d:x.dt,k:'sell',q:u2,cash:m.cash*u2/q,bm,id:x.id});uq-=u1;rq-=u2}}
  const dv=(S.trades||[]).filter(x=>!x.thesisId&&x.k=='div'&&(x.ac=='a'?'a':'p')==ac&&cU(x.n)==c&&x.dt).map(x=>({d:x.dt,k:'divU',x}));
  if(U.length)unc.push(stRun(S,c,U.concat(dv)));if(I.length)ini.push(stRun(S,c,I.concat(dv)))}
 return{unc,ini}}

// 彙總：筆數、勝率、平均賺賠比、損益、報酬率、超額報酬、照規則比例
function stAgg(items){const P=items.filter(o=>o.p&&o.p.inv>0),closed=P.filter(o=>o.closed),open=P.filter(o=>!o.closed);
 const cl=closed.filter(o=>o.p.ret!=null),win=cl.filter(o=>o.p.pl>0),loss=cl.filter(o=>o.p.pl<0),avg=a=>a.length?a.reduce((s,o)=>s+o.p.ret,0)/a.length:null;
 const inv=P.reduce((a,o)=>a+o.p.inv,0),plOk=P.every(o=>o.p.pl!=null),pl=P.reduce((a,o)=>a+(o.p.pl||0),0);
 const bmOk=P.length&&P.every(o=>o.p.bmRet!=null),bmPl=P.reduce((a,o)=>a+(o.p.bmRet!=null?o.p.bmRet/100*o.p.inv:0),0);
 const fol=closed.filter(o=>o.followed===1||o.followed===0||o.followed==='1'||o.followed==='0');
 const aw=avg(win),al=avg(loss);
 return{n:P.length,open:open.length,closed:closed.length,win:cl.length?win.length/cl.length*100:null,rr:aw!=null&&al!=null&&al!=0?aw/Math.abs(al):null,inv,pl,plOk,ret:inv>0?pl/inv*100:null,ex:bmOk&&inv>0?(pl-bmPl)/inv*100:null,bmPart:!bmOk&&P.some(o=>o.p.bmRet!=null),fol:fol.length?fol.filter(o=>+o.followed===1).length/fol.length*100:null}}
function stThesisItems(S,sid){return(S.theses||[]).filter(T=>(sid===undefined||T.sid==sid)&&T.status!='plan').map(T=>({T,p:stPerf(S,T),closed:T.status=='exit',followed:T.exit?T.exit.followed:''}))}

// 最大回撤：以各次結算日（用當時填的現價）＋今天取樣，看合計損益率從高點最多回落幾個百分點
function stMDD(S,theses){const pts=[];for(const s of(S.snaps||[]).slice().sort((a,b)=>sDate(a)<sDate(b)?-1:1)){if(!s.pxs)continue;pts.push({d:sDate(s),px:s.pxs})}pts.push({d:TODAY,px:S.px||{}});
 const ser=[];for(const z of pts){let inv=0,pl=0,ok=true;for(const T of theses){const p=stPerf(S,T,{asOf:z.d,px:z.px});if(p.inv<=0)continue;if(p.pl==null){ok=false;break}inv+=p.inv;pl+=p.pl}if(ok&&inv>0)ser.push(pl/inv*100)}
 if(ser.length<2)return null;let pk=-Infinity,m=0;for(const v of ser){pk=Math.max(pk,v);m=Math.max(m,pk-v)}return m}

// 主動部位曝險：各檔市值（有現價用現價，沒有用成本）、族群合計
// 分母（主動資本）＝主動持股市值＋主動帳戶現金（推算到今天）；還沒填主動現金時用 max(市值, 主動預算 Wa)
// 上限提醒、建議股數、未平倉風險都用同一個分母；after(add)＝再買 add 元之後的分母（有現金時不變）
function stExposure(S){const H=holdings(S).filter(o=>o.ac=='a'&&o.q>0);let mv=0;const by={},noPx=[];
 for(const o of H){const c=cU(o.n),px=num((S.px||{})[c]),v=px!=null?o.q*px:o.cost;if(px==null)noPx.push(c);by[c]=(by[c]||0)+v;mv+=v}
 const grp={};for(const c in by){for(const g of stGrpOf(S,c))grp[g]=(grp[g]||0)+by[c]}
 const C=typeof cashAt=='function'?cashAt(S):null,cashA=C?Math.max(0,C.a):null,wa=(+S.Wa||0)*1e4,tot=cashA!=null?mv+cashA:Math.max(mv,wa);
 return{tot,mv,cashA,by,grp,noPx,baseSrc:cashA!=null?'市值＋主動現金':(wa>mv?'主動預算':'市值'),after:add=>cashA!=null?tot:Math.max(mv+(add||0),wa)}}
// 上限：這檔股票有進行中的論點時，取所屬策略中最嚴格的；沒有就用預設 20% / 40%
function stCapStock(S,c){let v=null;for(const T of S.theses||[]){if(T.status=='exit'||cU(T.code)!=c)continue;const st=stStrat(S,T.sid);if(st&&num(st.capStock)!=null)v=Math.min(v??Infinity,num(st.capStock))}return v??ST_CAP.stock}
// 一檔股票屬於哪些族群：族群標籤 → 所屬主題（股票屬性）→ 產業別 → 未分類
function stGrpOf(S,c){c=cU(c);const T=((S.tags||{})[c]||[]).filter(Boolean);if(T.length)return T;const th=((S.attr||{})[c]||{}).theme;if(th)return[th];const i=typeof indOf=='function'?indOf(c):'';return[i||'未分類']}
function stCapGroup(S,g){let v=null;for(const T of S.theses||[]){if(T.status=='exit')continue;if(!stGrpOf(S,T.code).includes(g))continue;const st=stStrat(S,T.sid);if(st&&num(st.capGroup)!=null)v=Math.min(v??Infinity,num(st.capGroup))}return v??ST_CAP.group}

// 檢查時點：月營收（次月 10 日前公告 → 每月 11 日起）；財報（一般產業 Q1 5/15、Q2 8/14、Q3 11/14、年報 3/31 前 → 截止日隔天起）
function stRevDue(t){const y=+t.slice(0,4),m=+t.slice(5,7),d=+t.slice(8,10);const p=d>=11?[y,m]:(m==1?[y-1,12]:[y,m-1]);return p[0]+'-'+String(p[1]).padStart(2,'0')+'-11'}
function stFinDue(t){const y=+t.slice(0,4),L=[];for(const Y of [y-1,y]){L.push([Y+'-03-31','年報'],[Y+'-05-15','第一季'],[Y+'-08-14','第二季'],[Y+'-11-14','第三季'])}const past=L.filter(z=>z[0]<t).sort((a,b)=>a[0]<b[0]?-1:1);return past.length?{d:past[past.length-1][0],n:past[past.length-1][1]}:null}

// 提醒清單
function stAlerts(S){const A=[],E=stExposure(S),nm=c=>c+(typeof nameOf=='function'&&nameOf(c)?' '+nameOf(c):'');
 if(E.tot>0){for(const c in E.by){const p=E.by[c]/E.tot*100,cap=stCapStock(S,c);if(p>cap)A.push({k:'cap',lv:'wn',t:`${nm(c)} 占主動部位 ${p.toFixed(1)}%，超過個股上限 ${cap}%`+(E.noPx.includes(c)?'（尚未填現價，以成本估算）':'')})}
  for(const g in E.grp){const p=E.grp[g]/E.tot*100,cap=stCapGroup(S,g);if(p>cap)A.push({k:'cap',lv:'wn',t:`族群「${g}」占主動部位 ${p.toFixed(1)}%，超過族群上限 ${cap}%`})}
  // 策略合計上限（例如短打合計不超過 10%）
  for(const st of S.strategies||[]){const cs=num(st.capStrat);if(!cs)continue;const cs2=new Set((S.theses||[]).filter(T=>T.sid==st.id&&T.status!='exit').map(T=>cU(T.code)));let v=0;for(const c of cs2)v+=E.by[c]||0;const p=v/E.tot*100;if(p>cs)A.push({k:'cap',lv:'wn',t:`${st.id} ${st.name} 合計占主動部位 ${p.toFixed(1)}%，超過策略上限 ${cs}%`})}}
 const rd=stRevDue(TODAY),fd=stFinDue(TODAY);
 for(const T of S.theses||[]){if(T.status=='exit'||T.status=='plan')continue;const p=stPerf(S,T),st=stStrat(S,T.sid),c=cU(T.code),since=p.first||T.created||TODAY;
  const mo=num(T.expectM)??(st?num(st.holdMax):null);if(p.first&&mo){const due=addMon(p.first,mo);if(TODAY>due)A.push({k:'due',lv:'wn',th:T.id,t:`${T.id} ${nm(c)} 已持有 ${(dDays(p.first,TODAY)/30.44).toFixed(1)} 個月，超過預計 ${mo} 個月`})}
  if(p.px!=null&&num(T.stop)!=null&&p.px<=num(T.stop))A.push({k:'stop',lv:'bad',th:T.id,t:`${T.id} ${nm(c)} 現價 ${p.px} 已跌破停損價 ${T.stop}`});
  if(T.status=='hold'&&typeof exEval=='function'){const sh=p.px!=null&&num(T.stop)!=null&&p.px<=num(T.stop);for(const x of exEval(T)){if(!x.r||x.r.v!==true||(T.exAck||{})[x.key])continue;if(/停損/.test(x.lb)&&sh)continue;
   const w=String(x.hit||x.r.why||'').split('；')[0];A.push({k:'exit',lv:x.frac===1?'bad':'wn',th:T.id,key:x.key,t:`${T.id} ${nm(c)}：${x.lb||'出場條件'}成立 → ${x.act||'照規則處理'}${w?'（'+(w.length>36?w.slice(0,36)+'…':w)+'）':''}`})}}
  if(p.px!=null&&num(T.tgtPx)!=null&&p.px>=num(T.tgtPx))A.push({k:'tgt',lv:'ok',th:T.id,t:`${T.id} ${nm(c)} 現價 ${p.px} 已達目標價 ${T.tgtPx}`});

  if(since<=rd&&!(T.reviews||[]).some(r=>r.kind=='營收'&&r.date>=rd))A.push({k:'rev',lv:'wn',th:T.id,t:`${T.id} ${nm(c)}：請檢查上月營收是否仍支持論點`});
  if(fd&&since<=fd.d&&!(T.reviews||[]).some(r=>r.kind=='財報'&&r.date>fd.d))A.push({k:'fin',lv:'wn',th:T.id,t:`${T.id} ${nm(c)}：${fd.n}財報已公布（${fd.d} 前），請檢查論點是否仍成立`})}
 for(const e of S.events||[])if(!e.done&&e.date&&e.date<=TODAY)A.push({k:'ev',lv:'',ev:e.id,et:e.type,t:`${e.date.slice(5).replace('-','/')} ${nm(e.code)} ${e.type}${e.note?'：'+e.note:''}`});
 for(const T of S.theses||[])if(T.status!='exit'&&(T.pend||[]).length)A.push({k:'pend',lv:'',th:T.id,t:`${T.id} ${nm(cU(T.code))}：${T.pend.length} 項策略條件待確認（${T.pend.slice(0,2).join('；')}${T.pend.length>2?'…':''}）`});
 if(num(S.heatCap)!=null&&typeof asOpenRisk=='function'){const R=asOpenRisk(S);if(R.pct!=null&&R.pct>num(S.heatCap))A.push({k:'heat',lv:'bad',t:`未平倉風險占主動資本 ${R.pct.toFixed(1)}%，超過你設的上限 ${num(S.heatCap)}%：先降風險再加碼`})}
 for(const T of S.theses||[])if(T.status=='exit'&&!(T.exit&&T.exit.reason))A.push({k:'exr',lv:'wn',th:T.id,t:`${T.id} ${nm(cU(T.code))} 已出場，還沒選出場原因與有沒有照規則做`});
 return A}

// ---------- 減少手填：策略條件、預設值、狀態自動
// 策略規則：第一行可寫【標題：全部符合／至少 N 項】，下面一行一個條件「1. …」
function stConds(st){const out=[];if(!st)return out;for(const f of['screen','entry']){let cur=null;
 for(const ln of String(st[f]||'').split(/\n/)){const s=ln.trim();if(!s)continue;const h=s.match(/^【([^】：:]+)[：:]?([^】]*)】/);
  if(h){const r=(h[2]||'').trim(),n=r.match(/至少\s*(\d+)/),sec=h[1].trim();cur={sec,rule:r,need:/不買|不進場/.test(sec)?'none':/全部/.test(r)?'all':n?+n[1]:0,items:[]};out.push(cur);continue}
  const m=s.match(/^(\d+)[.、．)]\s*(.+)$/);if(m){if(!cur){cur={sec:f=='screen'?'選什麼':'何時買',rule:'',need:0,items:[]};out.push(cur)}cur.items.push(m[2].trim())}}}
 return out.filter(g=>g.items.length)}
// 【不買】段落：任何一條成立就不買（不放進買進理由）
const stNoBuy=st=>stConds(st).filter(g=>g.need=='none').flatMap(g=>g.items);
function stCondEval(st,met){const M=new Set(met||[]);return stConds(st).filter(g=>g.need!='none').map(g=>{const n=g.items.filter(t=>M.has(t)).length,need=g.need=='all'?g.items.length:g.need;return{sec:g.sec,rule:g.rule,items:g.items,n,tot:g.items.length,need,ok:!need||n>=need}})}
// 「什麼情況代表我錯了」預設＝策略出場規則裡的「理由失效」那一條
const stWrongDef=st=>{if(!st)return'';const l=String(st.exit||'').split(/\n/).find(s=>/理由失效/.test(s));return l?l.replace(/^\s*\d+[.、．)]\s*/,'').replace(/^理由失效[：:]\s*/,'').replace(/[，,]\s*全部賣出\s*$/,'').trim():''};
// 分批計畫預設＝策略進場規則裡的「分 N 批」
const stPlanN=st=>{const m=String(st&&st.entry||'').match(/分\s*(\d+)\s*(?:[～~\-]\s*\d+\s*)?批/);return m?+m[1]:0};
function stPlanDef(st){const n=stPlanN(st);if(n<2)return[];const p=Math.round(100/n);return Array.from({length:n},(_,k)=>({n:k+1,cond:'',pct:k<n-1?p:100-p*(n-1),tid:''}))}
// 買進依序對應到下一個還沒執行的批次
function stLinkPlan(T,x){if(!T||!x||x.k!='buy'||!(T.plan&&T.plan.length)||T.plan.some(r=>r.tid==x.id))return;const r=T.plan.find(r=>!r.tid);if(r)r.tid=x.id}
const stPlanProg=T=>{const n=(T.plan||[]).length;return n?`第 ${(T.plan||[]).filter(r=>r.tid).length}／${n} 批`:''};
// 新論點的預設值：停損價、什麼情況代表錯了、分批計畫
// 預設停損價：固定 %（成交價或成本 ×（1 − %））和技術停損，取比較高、離現價比較近的那個
function stStopCalc(st,c,px){px=num(px);if(!st||!px)return null;const L=[],sp=num(st.stopPct);if(sp)L.push({v:px*(1-sp/100),t:`−${sp}%`});
 const m=typeof ckM=='function'?ckM(c):null;if(m)for(const k of String(st.stopTech||'').split('|').filter(Boolean)){const v=k=='lo20'?m.lo20:k=='ma20'?m.m20:k=='ma20-3'?(m.m20!=null?m.m20*0.97:null):k=='ma60-5'?(m.m60!=null?m.m60*0.95:null):k=='lo250'?m.lo250:k=='brk-5'?(m.hi60!=null?m.hi60*0.95:null):null;
  if(v!=null&&v<px)L.push({v,t:(ST_STOPT.find(x=>x[0]==k)||['',k])[1]})}
 if(!L.length)return null;const b=L.reduce((a,x)=>x.v>a.v?x:a);return{v:+b.v.toFixed(2),t:b.t,all:L}}
// 賺賠比＝（目標價 − 買價）÷（買價 − 停損價）；目標價不手填，用近一年最高收盤
function stRR(c,px,stop){const m=typeof ckM=='function'?ckM(c):null;px=num(px);stop=num(stop);if(!m||m.hi250==null||!px||stop==null||stop>=px)return null;return{rr:(m.hi250-px)/(px-stop),tgt:m.hi250}}
function stThDefaults(S,T,px){const st=stStrat(S,T.sid);if(!st)return T;if(!T.wrongIf)T.wrongIf=stWrongDef(st);if(!(T.plan&&T.plan.length))T.plan=stPlanDef(st);if(num(T.stop)==null&&num(px)){const s=stStopCalc(st,T.code,px);if(s)T.stop=s.v}return T}
// 狀態自動：沒買過＝規劃中、有股數＝持有中、股數歸零＝已出場（手動標記的已出場不會改回）
function stSync(S){let ch=stBaseFix(S);for(const T of S.theses||[]){if(T.status=='exit')continue;const p=stPerf(S,T),s=!p.first?'plan':p.open?'hold':'exit';
 if(s!=T.status){T.status=s;if(s=='exit'){T.exit=T.exit||{};if(!T.exit.date)T.exit.date=p.end||TODAY}ch++}
 if(T.status=='hold'){ch+=stEntryRec(S,T,p);if(typeof exRearm=='function')ch+=exRearm(T)}}return ch}
// 第一次持有時記下：進場時的停損價（之後改停損不影響，用來算 R 倍數）、進場價、每股風險，以及 52 週高點、融資餘額（出場條件用）
// 之前就持有的論點用「第一次看到」的值補記，標示 rec0='補記'
function stEntryRec(S,T,p){let ch=0;const c=cU(T.code);
 if(T.stop0===undefined){const B=(S.trades||[]).filter(x=>x.thesisId==T.id&&x.k=='buy'&&x.dt&&num(x.px)!=null).sort((a,b)=>a.dt<b.dt?-1:1)[0],bs=stBase(S,T),px0=B?num(B.px):bs&&bs.px!=null?bs.px:(p.q>0?+(p.cost/p.q).toFixed(2):null);
  T.stop0=num(T.stop)??'';T.px0=px0??'';T.risk0=px0&&num(T.stop)!=null&&num(T.stop)<px0?+((px0-num(T.stop))/px0*100).toFixed(2):'';T.rec0=p.first&&p.first>=TODAY?'進場':'補記';T.rec0d=TODAY;ch++}
 if(T.hi0===undefined&&typeof CK!='undefined'&&CK&&typeof ckM0=='function'){const m=ckM0(c);if(m){T.hi0=m.hi250??'';T.mg0=m.mg&&m.mg[0]!=null?m.mg[0]:'';ch++}}
 return ch}
// R 倍數：（報酬率）÷（進場時的每股風險 %）；沒有記到進場停損的回傳 null
const stRmul=(T,ret)=>{const r=num(T.risk0);return r&&ret!=null?ret/r:null};
