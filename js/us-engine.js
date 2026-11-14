// 美股：部位快照的計算（純函式；不讀寫畫面，不呼叫也不修改任何信貸、台股的計算）
// 規格：〈美股整合規格_v3_2026-11-14〉第 2 節；快照模式的計算照 v2.0 第 4 節
// 美元金額一律換成「分」的整數再加總；股數最多 6 位小數。讀資料的函式都不會改到 S.us。
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

const US_V=3;
const usNum=v=>(v===''||v==null||isNaN(+v))?null:+v;
const usCode=n=>String(n||'').trim().toUpperCase();
const usC=v=>Math.round((+v||0)*100);                 // 美元 → 分
const usQ=v=>Math.round((+v||0)*1e6)/1e6;             // 股數：6 位小數
const usDays=(a,b)=>{const x=Date.parse(a+'T00:00:00Z'),y=Date.parse(b+'T00:00:00Z');return isNaN(x)||isNaN(y)?null:Math.round((y-x)/864e5)};
function usDef(){return{v:US_V,on:true,accts:[],px:{},pxd:{},pxa:{},attr:{},opt:{div:0,fx:0,tax:0},bench:'VOO',cashLike:[],wht:{def:0.30,by:{}},lot:'fifo',fxMode:'mid',fxManual:null,hist:[],log:[]}}
function usAcctDef(id,name){return{id,name:name||'',mode:'snap',upd:'',cash:null,note:'',items:[],start:null,cash0:0,init:[],trades:[],flows:[]}}
// 有美股資料而且開著
const usOn=S=>!!(S&&S.us&&S.us.on===true&&Array.isArray(S.us.accts));
const usNewId=us=>{let k=1;const has=id=>(us.accts||[]).some(a=>a.id==id);while(has('a'+k))k++;return'a'+k};

// 現價：自動價（auto＝{d, px:{代號:收盤}}，B1 批才有）與手填價取日期較新的；同一天用自動價
function usPx(us,c,auto){c=usCode(c);const m=usNum((us.px||{})[c]),md=(us.pxd||{})[c]||'',a=auto&&auto.px?usNum(auto.px[c]):null,ad=(auto&&auto.d)||'';
 if(m!=null&&m>0&&(!(a>0)||md>ad))return{v:m,d:md,src:'m'};
 if(a>0)return{v:a,d:ad,src:'a'};
 return null}

// 整理一個帳戶的持股：代號大寫、同代號合併、股數 6 位小數、成本到分；股數 ≤ 0 的丟掉
function usClean(items){const M={},o=[];for(const it of items||[]){const n=usCode(it&&it.n),q=usNum(it&&it.q);if(!n||q==null||q<=0)continue;const c=usNum(it.c0);
  if(!M[n]){M[n]={n,q:0,cC:0,nc:0};o.push(M[n])}M[n].q+=q;if(c!=null&&c>0)M[n].cC+=usC(c);else M[n].nc++}
 return o.map(x=>({n:x.n,q:usQ(x.q),c0:x.nc||!x.cC?null:x.cC/100}))}

// 一個帳戶（快照模式讀 items、cash）
function usAcctCalc(us,A,auto){const rows=[],miss=[];let mvC=0,costC=0,plC=0,plBase=0,noCost=0;
 for(const it of usClean(A.items)){const p=usPx(us,it.n,auto),cC=it.c0!=null?usC(it.c0):null,mv=p?Math.round(it.q*p.v*100):null,pl=mv!=null&&cC!=null?mv-cC:null;
  if(mv==null)miss.push(it.n);else mvC+=mv;if(cC==null)noCost++;else costC+=cC;if(pl!=null){plC+=pl;plBase+=cC}
  rows.push({n:it.n,q:it.q,cC,px:p?p.v:null,pxd:p?p.d:'',src:p?p.src:'',mvC:mv,plC:pl,plp:pl!=null&&cC>0?pl/cC*100:null})}
 const cash=usNum(A.cash),cashC=cash!=null?usC(cash):0;
 return{id:A.id,name:A.name||'',mode:A.mode||'snap',upd:A.upd||'',note:A.note||'',rows,miss,noCost,mvC,costC,plC,plBase,plp:plBase>0?plC/plBase*100:null,cashC,cashNull:cash==null,valC:mvC+cashC}}

// 全部帳戶＋跨帳戶合併同一代號
function usCalc(us,auto){const accts=(us.accts||[]).map(A=>usAcctCalc(us,A,auto)),M={},rows=[];let mvC=0,cashC=0,costC=0,plC=0,plBase=0,noCost=0;const miss=new Set();
 for(const a of accts){mvC+=a.mvC;cashC+=a.cashC;costC+=a.costC;plC+=a.plC;plBase+=a.plBase;noCost+=a.noCost;a.miss.forEach(n=>miss.add(n));
  for(const r of a.rows){let m=M[r.n];if(!m){m=M[r.n]={n:r.n,q:0,cC:0,cQ:0,allCost:true,px:r.px,pxd:r.pxd,src:r.src,mvC:r.mvC==null?null:0,plC:null,plBase:0,parts:[]};rows.push(m)}
   m.q=usQ(m.q+r.q);if(r.cC!=null){m.cC+=r.cC;m.cQ=usQ(m.cQ+r.q)}else m.allCost=false;if(r.mvC!=null)m.mvC+=r.mvC;if(r.plC!=null){m.plC=(m.plC||0)+r.plC;m.plBase+=r.cC}
   m.parts.push({id:a.id,name:a.name,q:r.q,cC:r.cC,mvC:r.mvC,plC:r.plC,plp:r.plp})}}
 for(const m of rows){m.avg=m.cQ>0?m.cC/100/m.cQ:null;m.plp=m.plBase>0?m.plC/m.plBase*100:null;m.w=mvC>0&&m.mvC!=null?m.mvC/mvC*100:null;const t=(us.attr||{})[m.n]||{};m.name=t.name||'';m.tag=t.tag||''}
 return{accts,rows,mvC,cashC,valC:mvC+cashC,costC,plC,plBase,plp:plBase>0?plC/plBase*100:null,noCost,miss:[...miss]}}

// 配置：最大持股與前三大、各帳戶、主題、持股／美元現金
function usAlloc(T){const R=T.rows.filter(r=>r.mvC>0).sort((a,b)=>b.mvC-a.mvC),top=R.slice(0,3).map(r=>({n:r.n,p:r.w})),G={};
 for(const r of R){const g=r.tag||'未標籤';G[g]=(G[g]||0)+r.mvC}
 return{top,top3:top.reduce((s,x)=>s+x.p,0),byAcct:T.valC>0?T.accts.filter(a=>a.valC>0).map(a=>({name:a.name,p:a.valC/T.valC*100})).sort((a,b)=>b.p-a.p):[],
  byTag:R.some(r=>r.tag)?Object.keys(G).map(g=>({tag:g,p:G[g]/T.mvC*100})).sort((a,b)=>b.p-a.p):[],
  stockP:T.valC>0?T.mvC/T.valC*100:null,cashP:T.valC>0?T.cashC/T.valC*100:null}}

// 匯率：自動（file＝臺銀牌告檔 {d,buy,sell}；alt＝備援 {d,v,src}）與手填 {d,v} 取日期較新的；同一天先用臺銀、再備援、再手填
function usFx(file,alt,manual){const L=[];
 if(file&&file.buy>0&&file.sell>0)L.push({v:Math.round((+file.buy+ +file.sell)/2*1e4)/1e4,d:file.d||'',src:'bot',o:0});
 if(alt&&alt.v>0)L.push({v:+alt.v,d:alt.d||'',src:'alt',o:1,name:alt.src||''});
 if(manual&&manual.v>0)L.push({v:+manual.v,d:manual.d||'',src:'manual',o:2});
 L.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:a.o-b.o);return L[0]||null}

// 提醒（今日那一格只會出現這幾種）：沒有現價／手填價超過 30 天、帳戶 90 天沒核對、匯率
function usAlerts(us,T,fx,today){const A=[],old=[];
 for(const r of T.rows){if(r.src=='m'&&r.pxd&&usDays(r.pxd,today)>30)old.push(r.n)}
 if(T.miss.length)A.push({k:'nopx',codes:T.miss.slice(),t:`${T.miss.length} 檔美股沒有現價：${T.miss.join('、')}`});
 if(old.length)A.push({k:'oldpx',codes:old,t:`${old.length} 檔美股的手填現價超過 30 天沒更新：${old.join('、')}`});
 for(const a of T.accts){const d=a.upd?usDays(a.upd,today):null;if(d!=null&&d>90)A.push({k:'acct',id:a.id,t:`「${a.name||a.id}」已經 ${d} 天沒核對（上次 ${a.upd}），建議對一次券商的庫存`})}
 if(T.accts.length){if(!fx)A.push({k:'fx',t:'沒有匯率：新台幣金額算不出來，請在「總覽」手填匯率'});
  else if(fx.src=='manual'&&usDays(fx.d,today)>30)A.push({k:'fx',t:`匯率是 ${fx.d} 手填的，超過 30 天沒更新`})}
 return A}

// 總覽：tw＝{p,a,cash}（新台幣元；cash 沒填是 null），T＝usCalc 的結果，fx＝usFx 的結果，rem＝信貸剩餘本金（元，可以是 null）
function usAllView(tw,T,fx,rem){const f=fx?fx.v:null,p=Math.max(0,+tw.p||0),a=Math.max(0,+tw.a||0),c=tw.cash!=null?Math.max(0,+tw.cash):0;
 const us=T&&f?Math.round(T.mvC/100*f):0,uc=T&&f?Math.round(T.cashC/100*f):0,twd=p+a+c,usd=us+uc,tot=twd+usd,pc=v=>tot>0?v/tot*100:0;
 return{tot,twd,usd,noFx:!!(T&&T.valC>0&&!f),cashNull:tw.cash==null,
  segs:[{k:'p',l:'台股被動',v:p,go:'tw'},{k:'a',l:'台股主動',v:a,go:'tw'},{k:'c',l:'台股現金',v:c,go:'tw'},{k:'us',l:'美股持股',v:us,go:'us'},{k:'uc',l:'美元現金',v:uc,go:'us'}].map(s=>Object.assign(s,{p:pc(s.v)})),
  ccy:[{k:'TWD',v:twd,p:pc(twd)},{k:'USD',v:usd,p:pc(usd)}],loan:rem!=null&&rem>0&&tot>0?{rem,p:rem/tot*100}:null}}

// 更新部位時自動寫的變動紀錄（只給人回頭看，不參與計算）
function usDiff(b,a){const L=[],B={},Af={};for(const x of usClean(b.items))B[x.n]=x;for(const x of usClean(a.items))Af[x.n]=x;const f=v=>v==null?'沒填':String(v);
 for(const n in Af){const x=Af[n],y=B[n];if(!y)L.push(`${n} 新增 ${x.q} 股`);else{if(x.q!=y.q)L.push(`${n} ${y.q} → ${x.q} 股`);if(f(x.c0)!=f(y.c0))L.push(`${n} 成本 ${f(y.c0)} → ${f(x.c0)}`)}}
 for(const n in B)if(!Af[n])L.push(`${n} 移除（原 ${B[n].q} 股）`);
 const c0=usNum(b.cash),c1=usNum(a.cash);if(f(c0)!=f(c1))L.push(`現金 ${f(c0)} → ${f(c1)}`);
 if((b.name||'')!=(a.name||'')&&b.name)L.push(`改名 ${b.name} → ${a.name}`);return L}

if(typeof module!='undefined'&&module.exports)module.exports={US_V,usNum,usCode,usC,usQ,usDays,usDef,usAcctDef,usOn,usNewId,usPx,usClean,usAcctCalc,usCalc,usAlloc,usFx,usAlerts,usAllView,usDiff};
