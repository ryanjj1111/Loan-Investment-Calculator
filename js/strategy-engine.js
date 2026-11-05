// 策略日誌：計算（純函式，不碰畫面；可用 node 測試）
// 信貸資產管理試算器｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 engine.js：num、cU、bmC、hasInit、tradeAmt、holdings、sDate、TODAY
// 這裡的計算只讀交易紀錄與現價，不會改變任何信貸的計算結果。

const ST_CAP={stock:20,group:40};
const ST_STATUS=[['plan','規劃中'],['build','建倉中'],['hold','持有中'],['exit','已出場']];
const ST_EXIT=[['invalid','理由失效'],['target','達到估值目標'],['stop','停損'],['timeout','超過持有期限'],['other','其他']];
const ST_FIELDS=['name','logic','screen','entry','exit','holdMin','holdMax','capStock','capGroup','stopPct','riskPct'];
const ST_TPL=[
 {name:'範例：價值回歸',logic:'基本面穩定的公司，股價因短期因素跌到估值區間下緣時分批買進，等估值回到區間中位數。（範例，請依自己的方法修改）',screen:'近 5 年獲利穩定；本益比或股價淨值比位於近 5 年區間下緣；負債比率不高',entry:'符合篩選條件時分 2～3 批買進',exit:'估值回到區間中位數以上；或基本面轉差（例如獲利連續衰退）',holdMin:3,holdMax:12,capStock:20,capGroup:40,stopPct:20,riskPct:2},
 {name:'範例：趨勢追蹤',logic:'順著中期趨勢操作：股價站上長期均線且營收成長時進場，跌破均線或營收轉弱時出場。（範例，請依自己的方法修改）',screen:'股價位於 60 日與 120 日均線之上；月營收年增率連續 3 個月為正',entry:'突破整理區間，或回測均線不破時買進',exit:'收盤跌破 60 日均線；或月營收年增率轉負',holdMin:1,holdMax:6,capStock:15,capGroup:35,stopPct:10,riskPct:1}];

const stStrat=(S,id)=>(S.strategies||[]).find(s=>s.id==id)||null;
const stThesis=(S,id)=>(S.theses||[]).find(t=>t.id==id)||null;
const stStatusN=k=>(ST_STATUS.find(x=>x[0]==k)||['',''])[1];
function stNextId(list,pfx,w){let n=0;for(const x of list||[]){const m=new RegExp('^'+pfx+'(\\d+)$').exec(x.id||'');if(m)n=Math.max(n,+m[1])}return pfx+String(n+1).padStart(w,'0')}
function stSnapOf(st){const o={};ST_FIELDS.forEach(k=>o[k]=st[k]??'');return o}
// 目前內容和最新一個版本的內容不同＝有尚未存成版本的修改
function stDirty(st){const h=(st.hist||[]).slice(-1)[0];return!h||JSON.stringify(h.snap)!=JSON.stringify(stSnapOf(st))}
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
function stThesisEvents(S,T){const c=cU(T.code),ev=[];
 if(+T.useInit&&hasInit(S)){let q=0,cost=0;for(const r of S.init)if(r.ac=='a'&&cU(r.n)==c){q+=+r.q||0;cost+=(+r.q||0)*(+r.px||0)}if(q>0)ev.push({d:S.dd,k:'buy',q,g:cost,fee:0,tax:0,cash:-cost,bm:stBmPx(S,S.dd,null),init:1})}
 for(const x of S.trades||[]){if(!x.dt||cU(x.n)!=c)continue;
  if(x.thesisId==T.id){const m=tradeAmt(S,x);if(x.k=='buy'||x.k=='sell')ev.push({d:x.dt,k:x.k,q:num(x.q)||0,g:m.g,fee:m.fee,tax:m.tax,cash:m.cash,bm:stBmPx(S,x.dt,x.bmPx),id:x.id});else if(x.k=='sdiv')ev.push({d:x.dt,k:'sdiv',q:num(x.q)||0});else if(x.k=='div')ev.push({d:x.dt,pd:x.pdt||x.dt,k:'div',cash:m.cash})}
  else if(!x.thesisId&&x.k=='div'&&x.ac=='a')ev.push({d:x.dt,k:'divU',x})}
 return ev}
function stPerf(S,T,opt){return stRun(S,cU(T.code),stThesisEvents(S,T),Object.assign({exitDate:T.status=='exit'&&T.exit&&T.exit.date?T.exit.date:null},opt||{}))}

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
function stExposure(S){const H=holdings(S).filter(o=>o.ac=='a'&&o.q>0);let tot=0;const by={},noPx=[];
 for(const o of H){const c=cU(o.n),px=num((S.px||{})[c]),v=px!=null?o.q*px:o.cost;if(px==null)noPx.push(c);by[c]=(by[c]||0)+v;tot+=v}
 const grp={};for(const c in by)for(const g of(S.tags||{})[c]||[])grp[g]=(grp[g]||0)+by[c];return{tot,by,grp,noPx}}
// 上限：這檔股票有進行中的論點時，取所屬策略中最嚴格的；沒有就用預設 20% / 40%
function stCapStock(S,c){let v=null;for(const T of S.theses||[]){if(T.status=='exit'||cU(T.code)!=c)continue;const st=stStrat(S,T.sid);if(st&&num(st.capStock)!=null)v=Math.min(v??Infinity,num(st.capStock))}return v??ST_CAP.stock}
function stCapGroup(S,g){let v=null;for(const T of S.theses||[]){if(T.status=='exit')continue;if(!((S.tags||{})[cU(T.code)]||[]).includes(g))continue;const st=stStrat(S,T.sid);if(st&&num(st.capGroup)!=null)v=Math.min(v??Infinity,num(st.capGroup))}return v??ST_CAP.group}

// 檢查時點：月營收（次月 10 日前公告 → 每月 11 日起）；財報（一般產業 Q1 5/15、Q2 8/14、Q3 11/14、年報 3/31 前 → 截止日隔天起）
function stRevDue(t){const y=+t.slice(0,4),m=+t.slice(5,7),d=+t.slice(8,10);const p=d>=11?[y,m]:(m==1?[y-1,12]:[y,m-1]);return p[0]+'-'+String(p[1]).padStart(2,'0')+'-11'}
function stFinDue(t){const y=+t.slice(0,4),L=[];for(const Y of [y-1,y]){L.push([Y+'-03-31','年報'],[Y+'-05-15','第一季'],[Y+'-08-14','第二季'],[Y+'-11-14','第三季'])}const past=L.filter(z=>z[0]<t).sort((a,b)=>a[0]<b[0]?-1:1);return past.length?{d:past[past.length-1][0],n:past[past.length-1][1]}:null}

// 提醒清單
function stAlerts(S){const A=[],E=stExposure(S),nm=c=>c+(typeof nameOf=='function'&&nameOf(c)?' '+nameOf(c):'');
 if(E.tot>0){for(const c in E.by){const p=E.by[c]/E.tot*100,cap=stCapStock(S,c);if(p>cap)A.push({k:'cap',lv:'wn',t:`${nm(c)} 占主動部位 ${p.toFixed(1)}%，超過個股上限 ${cap}%`+(E.noPx.includes(c)?'（尚未填現價，以成本估算）':'')})}
  for(const g in E.grp){const p=E.grp[g]/E.tot*100,cap=stCapGroup(S,g);if(p>cap)A.push({k:'cap',lv:'wn',t:`族群「${g}」占主動部位 ${p.toFixed(1)}%，超過族群上限 ${cap}%`})}}
 const rd=stRevDue(TODAY),fd=stFinDue(TODAY);
 for(const T of S.theses||[]){if(T.status=='exit'||T.status=='plan')continue;const p=stPerf(S,T),st=stStrat(S,T.sid),c=cU(T.code),since=p.first||T.created||TODAY;
  const mo=num(T.expectM)??(st?num(st.holdMax):null);if(p.first&&mo){const due=addMon(p.first,mo);if(TODAY>due)A.push({k:'due',lv:'wn',th:T.id,t:`${T.id} ${nm(c)} 已持有 ${(dDays(p.first,TODAY)/30.44).toFixed(1)} 個月，超過預計 ${mo} 個月`})}
  if(p.px!=null&&num(T.stop)!=null&&p.px<=num(T.stop))A.push({k:'stop',lv:'bad',th:T.id,t:`${T.id} ${nm(c)} 現價 ${p.px} 已跌破停損價 ${T.stop}`});
  if(p.px!=null&&num(T.tgtPx)!=null&&p.px>=num(T.tgtPx))A.push({k:'tgt',lv:'ok',th:T.id,t:`${T.id} ${nm(c)} 現價 ${p.px} 已達目標價 ${T.tgtPx}`});
  if(p.first&&!p.open)A.push({k:'exit',lv:'wn',th:T.id,t:`${T.id} ${nm(c)} 股數已歸零，要標記為已出場並填原因嗎？`});
  if(since<=rd&&!(T.reviews||[]).some(r=>r.kind=='營收'&&r.date>=rd))A.push({k:'rev',lv:'wn',th:T.id,t:`${T.id} ${nm(c)}：請檢查上月營收是否仍支持論點`});
  if(fd&&since<=fd.d&&!(T.reviews||[]).some(r=>r.kind=='財報'&&r.date>fd.d))A.push({k:'fin',lv:'wn',th:T.id,t:`${T.id} ${nm(c)}：${fd.n}財報已公布（${fd.d} 前），請檢查論點是否仍成立`})}
 return A}
