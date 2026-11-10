// 計算核心（純函式，不碰畫面；可用 node 測試）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// ================= 計算核心（純函式，無 DOM）=================
const TODAY=(()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())})();
const DEF={v:10,pxa:{},feeMode:'now',feeDay:10,strategies:[],theses:[],tags:{},ui:'',rng:'all',ptLast:0,trades:[],names:{},px:{},trOpen:1,trG:{},init:[],initMode:'none',pxd:{},feeSame:1,bm:'0050',hi50:'',trMore:0,fees:{p:{d:6,mn:20},a:{d:6,mn:20}},
 L:100,Y:7,rates:[{k:1,r:2.9}],fee:6000,feeDed:1,dd:TODAY,lock:12,pen:3,early:0,E:0,
 sals:[{m:TODAY.slice(0,7),v:80000}],livs:[{m:TODAY.slice(0,7),v:45000}],
 Wc:0,Wp:50,Wa:49.4,lk:{Wc:1},K:3,Ra:10,cr:1.5,
 etfs:[{n:'0050',w:100,p:7.9,y:2.9,c:1}],
 tax:20,bf:0.1425,stE:0.1,stS:0.3,
 sv0p:0,sv0a:0,sv0:0,sc0:0,p0050:'',br:6,grow:0,
 rb:10,du:50,pk0:0,pkAcc:1,scSel:1,pin:1,loss:20,lossZ:20,lossTo:'',
 scen:[{n:'輕度',st:12,dr:20,dn:6,rc:12,ba:1.3,bb:0.3,dc:10,ru:0,il:0,ic:0,icm:0,sh:0,fu:0},
  {n:'中度',st:12,dr:35,dn:12,rc:24,ba:1.3,bb:0.3,dc:20,ru:0.5,il:0,ic:10,icm:12,sh:0,fu:0},
  {n:'嚴重（類2008）',st:12,dr:45,dn:12,rc:36,ba:1.3,bb:0.3,dc:30,ru:1,il:6,ic:0,icm:0,sh:0,fu:0},
  {n:'自訂',st:12,dr:30,dn:6,rc:0,ba:1.3,bb:0.3,dc:0,ru:0,il:0,ic:0,icm:0,sh:0,fu:0}],
 rules:[{k:'loss1',on:1,th:50,a:'停止加碼，保留現金不動用'},{k:'loss2',on:1,th:75,a:'主動部位減半，轉入低風險標的'},{k:'loss3',on:1,th:100,a:'主動部位全部轉入低風險標的（被動先不動）'},{k:'loss4',on:1,th:150,a:'被動部位也轉入低風險標的'},{k:'rebuy',on:1,th:120,a:'買回賣掉的部位，虧損上限從買回時重新起算'},{k:'dd',on:1,th:15,a:'暫停加碼，確認現金足夠'},{k:'cash',on:1,th:6,a:'停止投入，先累積現金'},{k:'lev',on:1,th:60,a:'避免再借，考慮降低部位'},
  {k:'cneg',on:1,th:2,a:'檢討策略；綁約結束後評估提前清償'},{k:'xirr',on:1,th:2,a:'檢討策略；評估提前清償'},{k:'dip',on:1,th:10,a:'依規則動用保留現金逢低加碼'},{k:'rate',on:1,th:4,a:'評估提前清償或轉貸'}],
 smode:'acct',hold:[],hide:{},cv:'af',er:{k:'tr',d:-1,t:'all',h3:0,open:0},
 cur:{dt:'',m:'',p:'',a:'',c:'',sb:'',x50:'',hi50:'',bp:'',ba:'',rem:'',note:'',d:''},ledger:[],snaps:[],plan:null};
const clone=o=>JSON.parse(JSON.stringify(o));
const mr=x=>Math.pow(1+x/100,1/12)-1;
const num=v=>(v===''||v==null||isNaN(+v))?null:+v;
const cU=n=>String(n||'').trim().toUpperCase();
const hasInit=S=>S.initMode=='detail'&&(S.init||[]).some(r=>(+r.q||0)>0);
const bmC=S=>cU(S.bm||'0050')||'0050';
// 結算用各檔現價計算市值：有期初明細，或全新帳戶且有交易紀錄
const usePx=S=>hasInit(S)||(S.initMode=='none'&&(S.trades||[]).some(x=>x.k=='buy'&&x.dt));
// 期初持股（逐檔明細時，撥款前被動／主動市值由股數×撥款日收盤價自動加總；0050 撥款日價格取明細）
// 2026-11-10 回測 v5：虧損上限改成分段（75% 主動減半、100% 主動全出、150% 被動才出）＋ 0050 站上半年線買回
function upLoss(S){if(+S.lossV>=2||!Array.isArray(S.rules))return;const f=k=>S.rules.find(r=>r.k==k),D_=k=>clone(DEF.rules.find(r=>r.k==k));
 for(const k of['loss2','loss3']){const r=f(k),d=D_(k);if(r){r.th=d.th;r.a=d.a}}const i3=S.rules.findIndex(r=>r.k=='loss3');
 if(!f('loss4'))S.rules.splice(i3>=0?i3+1:S.rules.length,0,D_('loss4'));if(!f('rebuy')){const i4=S.rules.findIndex(r=>r.k=='loss4');S.rules.splice(i4+1,0,D_('rebuy'))}S.lossV=2}
function norm(S){upLoss(S);if(S.initMode=='none'){S.sv0p=0;S.sv0a=0;S.sc0=0}
 if(hasInit(S)){let p=0,a=0;for(const r of S.init){const v=(+r.q||0)*(+r.px||0);if(r.ac=='a')a+=v;else p+=v}S.sv0p=+(p/1e4).toFixed(4);S.sv0a=+(a/1e4).toFixed(4);const z=S.init.find(r=>cU(r.n)==bmC(S)&&+r.px);if(z)S.p0050=+z.px}
 S.sv0=(+S.sv0p||0)+(+S.sv0a||0);return S}
function D(S){const a=String(S.dd||'2026-11-02').split('-').map(Number);return{y:a[0]||2026,m:a[1]||1,d:a[2]||1}}
function tm(S,t){const o=D(S),k=o.m-1+t;return{y:o.y+Math.floor(k/12),m:((k%12)+12)%12+1}}
function t2ym(S,t){const d=tm(S,t);return d.y+'-'+String(d.m).padStart(2,'0')}
function ym2t(S,s){if(!s||!/^\d{4}-\d{2}$/.test(s))return NaN;const[y,m]=s.split('-').map(Number),o=D(S);return(y-o.y)*12+(m-o.m)}
function H_(S){return S.Y*12}
function tl(S,arr,t){let b=null,e0=null;for(const e of arr||[]){const te=ym2t(S,e.m);if(isNaN(te))continue;const v=+e.v||0;if(!e0||te<e0.te)e0={te,v};if(te<=t&&(!b||te>=b.te))b={te,v}}return b||e0||{te:0,v:0}}
const salAt=(S,t)=>tl(S,S.sals,t).v;
const livAt=(S,t)=>tl(S,S.livs,t).v;
function rateK(S,t){let b=null,f=null;for(const e of S.rates||[]){const k=Math.max(1,+e.k||1),r=+e.r||0;if(!f||k<f.k)f={k,r};if(k<=t&&(!b||k>=b.k))b={k,r}}return(b||f||{r:0}).r}
// 信貸：第1期在撥款次月同日，每期依當期利率與剩餘期數重算月付
function loanS(S,useEarly,ru,ruFrom){const N=S.Y*12,H=H_(S),L0=S.L*1e4,E=(useEarly&&S.early&&S.E>0)?S.E:0;ru=+ru||0;ruFrom=ruFrom??Infinity;
 const rem=[L0],pay=[0],lump=[0];let b=L0;
 for(let t=1;t<=H;t++){let p=0,l=0;if(b>0.5&&t<=N){const rm=(rateK(S,t)+(t>=ruFrom?ru:0))/1200,i=b*rm,n=N-t+1;p=rm>0?b*rm/(1-Math.pow(1+rm,-n)):b/n;b-=p-i;if(b<0.5)b=0;if(E&&t==E&&b>0){l=b*(1+(t<=S.lock?S.pen/100:0));b=0}}rem.push(b);pay.push(p);lump.push(l)}
 return{rem,pay,lump,N,H}}
// 券商手續費率（小數）：牌告 0.1425% × 折數／10
const feeR=(S,ac)=>{const f=(S.fees||{})[S.feeSame?'p':ac]||{};const d=num(f.d);return 0.001425*((d==null?10:d)/10)};
// 結算日期（舊資料只有月份時以 15 日計）
const sDate=s=>s?(s.dt||(s.m?s.m+'-15':'')):'';
function payDay(S,t){const o=tm(S,t),last=new Date(o.y,o.m,0).getDate();return Math.min(D(S).d,last)}
// 到某日期為止已扣款的期數（扣款日＝撥款日的次月同日，遇短月以月底計）
function paidD(S,dt){const t=ym2t(S,String(dt).slice(0,7));if(isNaN(t))return 0;const day=+String(dt).slice(8,10)||15;return Math.max(0,Math.min(S.Y*12,t-1+(t>=1&&day>=payDay(S,t)?1:0)))}
// 交易：成交金額、手續費、證交稅、現金增減（元）
// 營業日（只跳過週末，不含國定假日）
function addBD(d,n){const t=new Date(d+'T00:00:00Z');if(isNaN(t))return d;let k=0;while(k<n){t.setUTCDate(t.getUTCDate()+1);const w=t.getUTCDay();if(w!=0&&w!=6)k++}return t.toISOString().slice(0,10)}
// 某筆之前（不含當天）同帳戶同代號的持股數
function shBefore(S,x){const c=String(x.n||'').trim().toUpperCase(),ac=x.ac=='a'?'a':'p';let q=0;if(hasInit(S))for(const r of S.init)if((r.ac=='a'?'a':'p')==ac&&cU(r.n)==c)q+=+r.q||0;for(const y of S.trades||[]){if(!y.dt||!x.dt||y.dt>=x.dt||(y.ac=='a'?'a':'p')!=ac||String(y.n||'').trim().toUpperCase()!=c)continue;const s=num(y.q)||0;if(y.k=='buy'||y.k=='sdiv')q+=s;else if(y.k=='sell')q-=s}return Math.max(0,q)}
function tradeAmt(S,x){const q=num(x.q)||0,px=num(x.px)||0,g=q*px;
 if(x.k=='div'){const sb=shBefore(S,x),qq=num(x.q)??sb,dps=num(x.dps),ov=num(x.px),amt=Math.round(ov??(dps!=null?dps*qq:0)),loan=ov!=null&&num(x.q)==null&&dps==null?amt:(dps!=null?dps*sb:(qq>0?amt*sb/qq:0));return{g:amt,fee:0,tax:0,cash:amt,q:qq,sb,loan,pdt:x.pdt||x.dt}}
 if(x.k=='sdiv')return{g:0,fee:0,tax:0,cash:0,fa:0,ta:0};
 const f=(S.fees||{})[S.feeSame?'p':(x.ac=='a'?'a':'p')]||{},fa=g>0?Math.max(num(f.mn)||0,Math.round(g*feeR(S,x.ac=='a'?'a':'p'))):0,fee=num(x.fee)!=null?num(x.fee):fa;
 const ta=x.k=='sell'?Math.round(g*(/^00/.test(String(x.n||'').trim())?S.stE:S.stS)/100):0,tax=x.k=='sell'?(num(x.tax)!=null?num(x.tax):ta):0;
 return{g,fee,tax,cash:x.k=='buy'?-(g+fee):(x.k=='sell'?g-fee-tax:0),fa,ta}}
// 期間 (from, to] 的被動／主動淨買進（萬元，買進含手續費、賣出扣費稅）與股息（萬元）
function netBuy(S,from,to){let p=0,a=0,dv=0;for(const x of S.trades||[]){if(x.k=='div'){const pd=x.pdt||x.dt||'';if(pd&&pd<=to&&!(from&&pd<=from))dv+=tradeAmt(S,x).cash;continue}if(x.k=='sdiv')continue;
  const d=x.dt||'';if(!d||d>to||(from&&d<=from))continue;const m=tradeAmt(S,x);if(x.ac=='a')a-=m.cash;else p-=m.cash}return{p:p/1e4,a:a/1e4,d:dv/1e4}}
// 某日的持股數（期初＋交易紀錄），key＝帳戶|代號
function sharesAt(S,dt){const Q={};if(hasInit(S))for(const r of S.init){const k=(r.ac=='a'?'a':'p')+'|'+cU(r.n);Q[k]=(Q[k]||0)+(+r.q||0)}
 for(const x of S.trades||[]){if(!x.dt||x.dt>dt||!cU(x.n))continue;const k=(x.ac=='a'?'a':'p')+'|'+cU(x.n),s=num(x.q)||0;if(x.k=='buy'||x.k=='sdiv')Q[k]=(Q[k]||0)+s;else if(x.k=='sell')Q[k]=(Q[k]||0)-s}return Q}
// 每股配息合計（依除息日，同一除息日只算一次）
function divPS(S,c,from,to){const m={};for(const x of S.trades||[]){if(x.k!='div'||cU(x.n)!=c||!x.dt||x.dt<=from||x.dt>to)continue;const d=num(x.dps);if(d!=null)m[x.dt]=d}return Object.values(m).reduce((a,b)=>a+b,0)}
// 依現價算帳戶市值
function marketVals(S,px,dt){const Q=sharesAt(S,dt);let p=0,a=0;const miss=[];for(const k in Q){const q=Q[k];if(q<=0)continue;const[ac,c]=k.split('|'),v=num(px[c]);if(v==null){miss.push(c);continue}if(ac=='a')a+=q*v;else p+=q*v}return{p,a,miss}}
// 不借錢估計（股票部分）：期初股數 × 現價＋期初股數的配息
function nleAt(S,px,dt){let v=0;const miss=[];for(const r of S.init||[]){const c=cU(r.n),q=+r.q||0;if(!q||!c)continue;const x=num(px[c]);if(x==null){miss.push(c);continue}v+=q*x+q*divPS(S,c,S.dd,dt)}return{v,miss}}
// 結算日尚未交割（T+2）的買賣，與已除息未發放的股利
function pendAt(S,dt){let pay=0,rcv=0,n=0,dv=0,dn=0,rb=0,rn=0;for(const x of S.trades||[]){if(!x.dt||!dt)continue;
  if(x.k=='buy'||x.k=='sell'){if(x.dt<=dt&&dt<addBD(x.dt,2)){const m=tradeAmt(S,x);if(m.cash<0)pay-=m.cash;else rcv+=m.cash;n++}
   else if(S.feeMode=='month'&&x.dt<=dt&&dt<rebDate(S,x.dt)&&num(x.fee)==null){const r=fullFee(x)-tradeAmt(S,x).fee;if(r>0){rb+=r;rn++}}}
  else if(x.k=='div'){const pd=x.pdt||x.dt;if(x.dt<=dt&&dt<pd){dv+=tradeAmt(S,x).cash;dn++}}}
 return{pay,rcv,n,dv,dn,rb,rn,adj:rcv-pay+dv+rb}}
// 手續費每月退回：交易時券商先收全額（牌告 0.1425%，最低 20 元），折讓在次月退款日退回
const fullFee=x=>{const g=(num(x.q)||0)*(num(x.px)||0);return g>0?Math.max(20,Math.floor(g*0.001425)):0};
function rebDate(S,d){const a=String(d).split('-').map(Number);let y=a[0],m=a[1]+1;if(m>12){m=1;y++}const dd=Math.min(28,Math.max(1,Math.round(num(S.feeDay)||10)));return y+'-'+String(m).padStart(2,'0')+'-'+String(dd).padStart(2,'0')}
// 由交易紀錄算持股（移動平均成本）
function holdings(S){const H={};if(hasInit(S))for(const r of S.init){const q=+r.q||0;if(!q||!cU(r.n))continue;const ac=r.ac=='a'?'a':'p',k=ac+'|'+cU(r.n),o=H[k]||(H[k]={ac,n:cU(r.n),q:0,cost:0,real:0,div:0,divs:[],last:'',iq:0,ln:0});o.q+=q;o.iq+=q;o.cost+=q*(+r.px||0)}
 const L=(S.trades||[]).map((x,i)=>({x,i})).filter(o=>o.x.dt&&String(o.x.n||'').trim()).sort((a,b)=>a.x.dt==b.x.dt?a.i-b.i:(a.x.dt>b.x.dt?1:-1));
 for(const{x}of L){const k=(x.ac=='a'?'a':'p')+'|'+String(x.n).trim().toUpperCase(),o=H[k]||(H[k]={ac:x.ac=='a'?'a':'p',n:String(x.n).trim(),q:0,cost:0,real:0,div:0,divs:[],last:'',iq:0,ln:0}),m=tradeAmt(S,x),sh=num(x.q)||0;o.last=x.dt;
  if(x.k=='buy'){o.q+=sh;o.cost+=m.g+m.fee;o.ln+=m.g+m.fee}else if(x.k=='sell'){const avg=o.q>0?o.cost/o.q:0,u=Math.min(sh,o.q);o.cost-=avg*u;o.real+=m.cash-avg*u;o.q-=u;o.ln-=m.cash}else if(x.k=='sdiv')o.q+=sh;else if(x.k=='div'){o.div+=m.cash;o.divs.push({d:m.pdt,v:m.cash})}}
 return Object.values(H)}
const paidAt=(S,t)=>Math.max(0,Math.min(S.Y*12,t-1+(D(S).d<=15?1:0)));
const pocketFee=S=>S.feeDed?0:+S.fee||0;
function deposit(S){return S.L*1e4-(S.feeDed?+S.fee||0:0)}
function alloc(S){const d=deposit(S);let wp=Math.max(0,(+S.Wp||0)*1e4),wa=Math.max(0,(+S.Wa||0)*1e4);const s=wp+wa;if(s>d&&s>0){wp*=d/s;wa*=d/s}return{wp,wa}}
function blend(S){const ws=S.etfs.reduce((a,e)=>a+(+e.w),0)||1,pe=S.etfs.reduce((a,e)=>a+(+e.p+ +e.y)*e.w,0)/ws,{wp,wa}=alloc(S);return(pe*wp+S.Ra*wa)/((wp+wa)||1)}
// 虧損上限（元）＝貸款金額 × 設定 %
const lossB=S=>Math.max(0,(+S.loss||0)/100*S.L*1e4);
// 壓力情境：市場因子（跌到谷底後依設定回升）
function mktF(sc,st,t,d){if(!sc||t<=st||!d)return 1;const dn=Math.max(1,+sc.dn||1),rc=+sc.rc||0,k=t-st,lo=Math.max(0.05,1-d);if(k<=dn)return Math.pow(lo,k/dn);if(rc>0)return k<=dn+rc?Math.pow(lo,1-(k-dn)/rc):1;return lo}
function inStress(sc,st,t){if(!sc||t<=st)return false;const rc=+sc.rc||0;return rc>0?t<=st+Math.max(1,+sc.dn||1)+rc:true}
const isBond=e=>/B$/i.test(String(e.n||'').trim());
// 投資推演：從狀態 o 推到期末。X＝因信貸而多出的部位價值；sc＝壓力情境（可省略）
function project(S,o,g,sc){
 const H=H_(S),st=sc?Math.max(+sc.st||1,o.t0+1):Infinity,ln=loanS(S,1,sc?sc.ru:0,st),bP=feeR(S,'p'),bA=feeR(S,'a'),ws=S.etfs.reduce((a,e)=>a+(+e.w),0)||1,gb=blend(S);
 const dEq=sc?(+sc.dr||0)/100:0,dAc=Math.min(.95,dEq*(sc?(+sc.ba||1):1)),dBd=Math.min(.95,dEq*(sc?(+sc.bb||0):0)),dE=S.etfs.map(e=>isBond(e)?dBd:dEq);
 const wA=S.sv0>0?(+S.sv0a||0)/S.sv0:0,wP=S.sv0>0?(+S.sv0p||0)/S.sv0:0,cpE=bP+S.stE/100,cpS=bA+S.stS/100;
 let V=o.etf.slice(),VA=o.VA,cash=o.cash,ext=o.ext0,fv=o.fv0,ns=o.ns,oc=S.sc0*1e4,taxY={},rec=[],wd=0,PK=sc?(+S.pk0||0)*1e4:0,sold=0,soldA=0,sold1=null;
 const sell=(x,f)=>{const u=Math.min(Math.max(cash,0),x);cash-=u;x-=u;if(x<=1e-6)return;
  if(f){const u2=Math.min(Math.max(oc,0),x);oc-=u2;x-=u2;if(x<=1e-6)return}
  const tp=V.reduce((a,b)=>a+b,0),need=x/(1-cpE);if(tp>=need){V=V.map(v=>v*(1-need/tp));if(f)sold+=x;return}
  if(f)sold+=tp*(1-cpE);x-=tp*(1-cpE);V=V.map(()=>0);const nA=x/(1-cpS);if(VA>=nA){VA-=nA;if(f){sold+=x;soldA+=x}return}
  if(f){sold+=VA*(1-cpS);soldA+=VA*(1-cpS)}x-=VA*(1-cpS);VA=0;
  if(f){const nN=x/(1-cpS);if(ns>=nN){ns-=nN;sold+=x;soldA+=x;return}sold+=ns*(1-cpS);soldA+=ns*(1-cpS);x-=ns*(1-cpS);ns=0}
  cash-=x};
 // 停損：把 x 元（市值）的高風險部位（先主動、再轉入標的以外的被動）賣出，轉入選定標的或帳戶現金
 const tg=S.lossTo=='__cash'?-2:(S.lossTo?S.etfs.findIndex(e=>String(e.n).trim()==String(S.lossTo).trim()):-1),B=lossB(S);let slS=0,slT2=null,slT3=null;
 const risky=()=>VA+V.reduce((a,v,i)=>i==tg?a:a+v,0);
 const derisk=x=>{if(tg==-1||!(x>0))return 0;let got=0;const fa=Math.min(VA,x);VA-=fa;got+=fa*(1-cpS);x-=fa;
  const rv=V.reduce((a,v,i)=>i==tg?a:a+v,0);if(x>0&&rv>0){const k=Math.min(1,x/rv);V=V.map((v,i)=>{if(i==tg)return v;got+=v*k*(1-cpE);return v*(1-k)})}
  if(tg==-2)cash+=got;else V[tg]+=got*(1-bP);return got};
 for(let t=o.t0;t<=H;t++){let div=0,tp=0,pay=0,cov=null;
  if(t>o.t0){
   V=V.map((v,i)=>v*(1+mr(g??S.etfs[i].p))*(sc?mktF(sc,st,t,dE[i])/mktF(sc,st,t-1,dE[i]):1));
   const fa=sc?mktF(sc,st,t,dAc)/mktF(sc,st,t-1,dAc):1;VA*=(1+mr(g??S.Ra))*fa;if(cash>0)cash*=1+mr(S.cr);if(S.grow)ns*=1+mr(gb);
   if(sc)ns*=wP*(mktF(sc,st,t,dEq)/mktF(sc,st,t-1,dEq))+wA*fa+(1-wP-wA);
   const yc=inStress(sc,st,t)?1-(+sc.dc||0)/100:1;
   if(t%3==0)S.etfs.forEach((e,i)=>{if(V[i]>0){const d=V[i]*e.y*yc/100/4,pm=d>=2e4?d*.0211:0;V[i]+=(d-pm)*(1-bP);div+=d;const yr=tm(S,t).y;taxY[yr]=(taxY[yr]||0)+d*Math.max(0,S.tax-(+e.c?8.5:0))/100}});
   const d=tm(S,t);if(d.m==5&&taxY[d.y-1]){tp=taxY[d.y-1];delete taxY[d.y-1]}
   pay=ln.pay[t];if(ln.lump[t])sell(ln.lump[t],0);ext+=pay+tp;fv=fv*(1+mr(S.br))+pay+tp;
   if(sc){const inc=salAt(S,t)*((t>=st&&t<st+(+sc.il||0))?0:1)*((t>=st&&(!(+sc.icm)||t<st+(+sc.icm)))?1-(+sc.ic||0)/100:1);
    const fix=livAt(S,t)+(t>=st?(+sc.fu||0):0),flow=inc-fix-pay-tp-(t==st?(+sc.sh||0)*1e4:0);
    if(flow>=0){if(S.pkAcc)PK+=flow}else PK+=flow;
    if(PK<0){const need=-PK;PK=0;const s0=sold;sell(need,1);wd+=need;fv-=need;if(sold>s0&&sold1==null)sold1=t}
    cov=(Math.max(cash,0)+Math.max(oc,0)+V.reduce((a,b)=>a+b,0)+ns*wP+PK)/((fix+pay)||1)}}
  if(o.dep&&t>=o.dep.from&&t<=o.dep.to){const n=o.dep.to-o.dep.from+1,ap=o.dep.p/n,aa=o.dep.a/n;S.etfs.forEach((e,i)=>V[i]+=ap*e.w/ws*(1-bP));VA+=aa*(1-bA);cash-=ap+aa}
  if(sc&&sc.cut&&t==sc.cut.t)derisk(sc.cut.x);
  if(sc&&sc.sl&&tg!=-1&&B>0&&t>o.t0){const pd=Object.values(taxY).reduce((a,b)=>a+b,0),afN=V.reduce((a,b)=>a+b,0)+VA+cash-ln.rem[t]-ext+wd-pd,u=Math.max(0,-afN)/B*100;
   // 分段：② 主動減半 → ③ 主動全出 → ④ 被動也出（舊設定沒有 ④ 時，③ 全部賣出）
   if(slS<2&&u>=sc.sl.s2){if(VA>0)derisk(VA/2);slS=2;slT2=t}
   if(slS<3&&u>=sc.sl.s3){if(isFinite(sc.sl.s4??Infinity))derisk(VA);else derisk(Infinity);slS=3;slT3=t}
   if(slS<4&&isFinite(sc.sl.s4??Infinity)&&u>=sc.sl.s4){derisk(Infinity);slS=4}}
  const stk=V.reduce((a,b)=>a+b,0)+VA,X=stk+cash,pend=Object.values(taxY).reduce((a,b)=>a+b,0),rem=ln.rem[t],af=X-rem-ext+wd-pend,nl=ns+oc;
  rec[t]={t,X,stk,ns,rem,div,tp,pay,af,ao:X-rem-fv-pend,nl,real:nl+af,cov,pk:PK,sold,soldA,sold1,mk:sc?mktF(sc,st,t,dEq):1,rate:sc&&t>=st?rateK(S,t)+(+sc.ru||0):rateK(S,Math.max(1,t)),va:VA,vt:tg>=0?V[tg]:0,slS,slT2,slT3}}
 return rec}
// 情境指標
// 最大回撤：mdd＝真實淨資產從高點最多少掉多少（元）；mddp＝帳戶總值（含撥款前原有部位）從高點的最大跌幅（%）
// 低於底線月數／回到底線：從情境開始月起算（基準從預測起點起算）
function scMetrics(S,rec,from,sc){const init=(S.sv0+S.sc0)*1e4,H=rec.length-1,st=sc?Math.max(+sc.st||1,from+1):from;let mn=null,pk=-Infinity,pa=-Infinity,mdd=0,mddp=0,below=0,fb=null,back=null,mc=null,mA=null,slHit=null;const B=lossB(S);
 for(let t=from;t<=H;t++){const q=rec[t];if(!q)continue;if(!mn||q.real<mn.real)mn=q;pk=Math.max(pk,q.real);mdd=Math.max(mdd,pk-q.real);const ta=q.X+q.nl;pa=Math.max(pa,ta);if(pa>0)mddp=Math.max(mddp,(1-ta/pa)*100);
  if(t>=st){if(q.real<init){below++;if(fb==null)fb=t}else if(fb!=null&&back==null)back=t}if(q.cov!=null&&(mc==null||q.cov<mc.cov))mc=q;
  if(!mA||q.af<mA.af)mA=q;if(B>0&&slHit==null&&t>from&&q.af<=-B)slHit=t}
 const e=rec[H];return{mn,mdd,mddp,below,fb,rec:fb==null?null:(back==null?-1:back-fb),sold:e.sold,soldA:e.soldA,sold1:e.sold1,mc,end:e,init,st,mA,slHit,B}}
// 應對規則在情境路徑上的觸發（回傳每條規則首次觸發月份）
function scRules(S,rec,from){const init=(S.sv0+S.sc0)*1e4,H=rec.length-1,out={};let pk=-Infinity,neg=0;
 for(let t=from;t<=H;t++){const q=rec[t];if(!q)continue;pk=Math.max(pk,q.X+q.nl);neg=q.ao<0?neg+1:0;
  for(const r of S.rules||[]){if(!r.on||out[r.k]!=null||t<1)continue;const th=+r.th||0;let hit=false;
   if(/^loss/.test(r.k))hit=lossB(S)>0&&Math.max(0,-q.af)>=lossB(S)*th/100;else if(r.k=='dd')hit=pk>0&&(q.X+q.nl)<=pk*(1-th/100);else if(r.k=='cash')hit=q.cov!=null&&q.cov<th;
   else if(r.k=='lev')hit=(q.X+q.nl)>0&&q.rem/(q.X+q.nl)*100>th;else if(r.k=='cneg')hit=neg>=th*3;else if(r.k=='dip')hit=(1-q.mk)*100>=th;else if(r.k=='rate')hit=q.rate>=th;
   if(hit)out[r.k]=t}}
 return out}
function rule(S,k){return(S.rules||[]).find(r=>r.k==k)||{on:0,th:0,a:''}}
function planInit(S){const d=deposit(S),{wp,wa}=alloc(S),K=Math.max(1,S.K|0),pf=pocketFee(S);
 return{t0:0,etf:S.etfs.map(()=>0),VA:0,cash:d,ext0:pf,fv0:pf,ns:S.sv0*1e4,dep:{from:0,to:K-1,p:wp,a:wa}}}
function irrM(f){const npv=r=>f.reduce((a,c,k)=>a+c/Math.pow(1+r,k),0);let lo=-.5,hi=.5;if(npv(lo)*npv(hi)>0)return NaN;for(let i=0;i<100;i++){const m=(lo+hi)/2;npv(lo)*npv(m)<=0?hi=m:lo=m}return(lo+hi)/2}
function aprLoan(S){const ln=loanS(S,0),f=[S.L*1e4-S.fee];for(let t=1;t<=ln.N;t++)f.push(-ln.pay[t]);return irrM(f)*12*100}
// 划算門檻：所有部位用同一個含息年報酬 g（ETF 價格報酬＝g−殖利率，主動＝g），求期末 A 或 C 打平的 g
function breakevenT(S,k='ao'){const o=planInit(S);let lo=-20,hi=40;for(let i=0;i<40;i++){const g=(lo+hi)/2,S2=Object.assign({},S,{etfs:S.etfs.map(e=>Object.assign({},e,{p:g-(+e.y||0)})),Ra:g}),r=project(S2,o);r[r.length-1][k]>0?hi=g:lo=g}return(lo+hi)/2}
function breakeven(S,k='af'){const o=planInit(S);let lo=-20,hi=40;for(let i=0;i<50;i++){const g=(lo+hi)/2,r=project(S,o,g);r[r.length-1][k]>0?hi=g:lo=g}return(lo+hi)/2}
function holdTot(h){let p=0,a=0,cp=0,ca=0;for(const r of h||[]){const q=num(r.q)||0,x=num(r.x)||0,c=num(r.c)||0;if(r.k=='a'){a+=q*x;ca+=q*c}else{p+=q*x;cp+=q*c}}return{p,a,cp,ca}}
// 0050 撥款以來累計報酬：手填優先，否則用還原價計算
function sbEff(S,s){const m=num(s.sb);if(m!=null)return{v:m,src:'手填'};const b=num(S.p0050),px=s.pxs?num(s.pxs[bmC(S)]):null;if(px!=null&&b)return{v:((px+divPS(S,bmC(S),S.dd,sDate(s)))/b-1)*100,src:'現價＋配息'};const x=num(s.x50);return(x!=null&&b)?{v:(x/b-1)*100,src:'還原價'}:{v:null,src:''}}
// 結算一期（輸入萬元）
function settle(S,s){const dt=sDate(s),ts=ym2t(S,dt.slice(0,7)),p=num(s.p),a=num(s.a),c=num(s.c);if(isNaN(ts)||ts<0||p==null||a==null||c==null)return null;
 const pa=pendAt(S,dt),cc=c+pa.adj/1e4,ln=loanS(S,0),n=paidD(S,dt),rem=num(s.rem)!=null?num(s.rem)*1e4:ln.rem[n],br=mr(S.br),scope=(p+a+cc)*1e4,pf=pocketFee(S);
 let cum=0,fv=pf*Math.pow(1+br,ts),cin=0,cout=0,cost=0;
 for(let t=1;t<=n;t++){cum+=ln.pay[t];fv+=ln.pay[t]*Math.pow(1+br,ts-t)}
 const f=new Array(ts+1).fill(0);f[0]=-((S.sv0+S.sc0)*1e4+deposit(S));
 for(const e of S.ledger||[]){const ed=e.dt||(e.m?e.m+'-01':''),te=ym2t(S,ed.slice(0,7)),v=(num(e.a)||0)*1e4;if(!ed||isNaN(te)||ed>dt||te<0)continue;
  if(e.k=='out'){cout+=v;fv-=v*Math.pow(1+br,ts-te);f[te]+=v}else if(e.k=='cost'){cost+=v;fv+=v*Math.pow(1+br,ts-te)}else{cin+=v;fv+=v*Math.pow(1+br,ts-te);f[te]-=v}}
 // 匯到追蹤範圍以外的配息＝出金
 for(const x of S.trades||[]){const pd=x.pdt||x.dt;if(x.k!='div'||!+x.out||!pd||pd>dt)continue;const te=ym2t(S,pd.slice(0,7)),v=tradeAmt(S,x).cash;if(isNaN(te)||te<0)continue;cout+=v;fv-=v*Math.pow(1+br,ts-te);f[te]+=v}
 f[ts]+=scope;const se=sbEff(S,s),sb=se.v??0,nleStk=num(s.nleS)!=null?num(s.nleS)*1e4:S.sv0*1e4*(1+sb/100),nle=nleStk+S.sc0*1e4;
 const real=scope-rem-cum-pf-(cin-cout)-cost,im=ts>0?irrM(f):NaN;
 return{ts,n,rem,cum,cin,cout,cost,scope,nle,real,af:real-nle,ao:scope-rem-fv-nle,d0:real-(S.sv0+S.sc0)*1e4,x:isNaN(im)?NaN:(Math.pow(1+im,12)-1)*100,ext0:cum+pf+(cin-cout)+cost,fv,sb,sbOk:se.v!=null,sbSrc:se.src,p,a,c:cc,cRaw:c,pa,dt,nleStk,nleDet:num(s.nleS)!=null}}
// 被動／主動 時間加權報酬（Modified Dietz 逐期串接），list 需依月份排序
function twr(S,list){let P=+S.sv0p||0,A=+S.sv0a||0,gp=1,ga=1,pd=null;const out=[];
 for(const s of list){const p=num(s.p),a=num(s.a);if(p==null||a==null){out.push(null);continue}
  const dt=sDate(s),nb=netBuy(S,pd,dt),bp=num(s.bp)??nb.p,ba=num(s.ba)??nb.a;pd=dt;const dp=P+bp/2,da=A+ba/2;
  if(dp>0)gp*=1+(p-P-bp)/dp;if(da>0)ga*=1+(a-A-ba)/da;P=p;A=a;out.push({m:s.m,rp:(gp-1)*100,ra:(ga-1)*100})}
 return out}
function snapInit(S,r){const q=r.scope>0?(r.scope-r.nle)/r.scope:0,ws=S.etfs.reduce((a,e)=>a+(+e.w),0)||1,K=Math.max(1,S.K|0),{wp,wa}=alloc(S);
 const o={t0:r.ts,etf:S.etfs.map(e=>r.p*1e4*q*e.w/ws),VA:r.a*1e4*q,cash:r.c*1e4*q,ext0:r.ext0,fv0:r.fv,ns:r.nleStk};
 const ex=o.cash-S.Wc*1e4;if(r.ts<K-1&&ex>0){const tot=(wp+wa)||1;o.dep={from:r.ts+1,to:K-1,p:ex*wp/tot,a:ex*wa/tot}}return o}
function latest(S){let b=null;for(const s of S.snaps||[]){const r=settle(S,s);if(r&&(!b||sDate(s)>=sDate(b.s)))b={s,r}}return b}
function fcInit(S){const L=latest(S);return L?{o:snapInit(S,L.r),from:L.r.ts}:{o:planInit(S),from:0}}
function forecast(S){const f=fcInit(S);return{rec:project(S,f.o),from:f.from}}
function runSc(S,sc){const f=fcInit(S),rec=project(S,f.o,undefined,sc);return{rec,from:f.from,m:scMetrics(S,rec,f.from,sc)}}
// 依應對規則 ②③ 的門檻自動停損（需已選轉入標的）
function slOpt(S){const g=k=>{const r=rule(S,k);return r&&r.on?+r.th:Infinity};return{s2:g('loss2'),s3:g('loss3'),s4:g('loss4'),z:Math.max(1,+S.lossZ||20)}}
// 安全邊際：最大可承受跌幅（不被迫賣股、期末不低於底線）與最長可承受失業月數（不需賣主動／原有持股）
function maxDrop(S,sc){const f=fcInit(S),init=(S.sv0+S.sc0)*1e4,B=lossB(S),ok=dr=>{const r=project(S,f.o,undefined,Object.assign({},sc,{dr,rc:0,sl:null,cut:null}));const e=r[r.length-1];if(e.sold>=1)return false;
  if(B>0){for(let t=f.from+1;t<r.length;t++)if(r[t].af<=-B)return false;return true}return e.real>=init};
 if(!ok(0))return null;if(ok(95))return 95;let lo=0,hi=95;for(let i=0;i<22;i++){const m=(lo+hi)/2;ok(m)?lo=m:hi=m}return lo}
function maxJobless(S,sc,key){key=key||'soldA';const f=fcInit(S),H=H_(S),ok=il=>{const r=project(S,f.o,undefined,Object.assign({},sc,{il}));return r[r.length-1][key]<1};
 if(!ok(0))return null;if(ok(H))return H;let lo=0,hi=H;while(hi-lo>1){const m=(lo+hi)>>1;ok(m)?lo=m:hi=m}return lo}
function cashflow(S){const ln=loanS(S,1),H=ln.H,out=[];for(let t=0;t<=H;t++){const inc=salAt(S,t),lv=livAt(S,t),lp=ln.pay[t];out.push({t,inc,lv,lp,base:inc-lv-lp})}return out}
// 提前清償比較：第 te 期一次還清 vs 持有到期（期末面額淨效益差）與門檻報酬
function earlyCmp(S){const N=S.Y*12,te=S.E>0?+S.E:(+S.lock||0)+1,f=fcInit(S);if(te<1||te>=N||te<=f.from)return{te,na:1};
 const S1=Object.assign({},S,{early:0}),S2=Object.assign({},S,{early:1,E:te}),d=g=>{const a=project(S1,f.o,g),b=project(S2,f.o,g);return a[a.length-1].af-b[b.length-1].af};
 const diff=d(undefined);let lo=-20,hi=40,th=null;if(d(lo)<0&&d(hi)>0){for(let i=0;i<40;i++){const m=(lo+hi)/2;d(m)>0?hi=m:lo=m}th=(lo+hi)/2}
 return{te,diff,th}}
// 舊版設定轉換
function up5(o,j){o.rules=o.rules&&o.rules.length?o.rules:clone(DEF.rules);if(j.safeM!=null)rule(o,'cash').th=+j.safeM;if(j.dq!=null)rule(o,'dip').th=+j.dq;
 o.scen=o.scen&&o.scen.length?o.scen:clone(DEF.scen);if(+j.stress||j.sD!=null){const c=o.scen[o.scen.length-1];c.n='自訂（原下跌情境）';c.dr=+j.sD||30;c.st=(+j.sN||2)*12;c.dn=1;c.rc=0}
 ['stress','sN','sD','safeM','dq'].forEach(k=>delete o[k]);return o}
function up6(o){o.rules=(o.rules||[]).filter(r=>r.k!='floor');if(!o.rules.some(r=>r.k=='loss1'))o.rules=clone(DEF.rules).filter(r=>/^loss/.test(r.k)).concat(o.rules);
 ['loss','lossZ','lossTo'].forEach(k=>{if(o[k]==null)o[k]=DEF[k]});o.v=6;return o}
function migrate(j){j=j||{};const v=+j.v||0,m=migrate0(v>=7?Object.assign({},j,{v:6}):j);if(v<7&&!m.o.ui)m.o.ui='pro';if(!m.o.rng)m.o.rng='all';up8(m.o);
 // 舊檔沒有的新欄位：維持原本的行為
 if(j.initMode==null)m.o.initMode=(j.init&&j.init.length)?'detail':'total';if(j.feeSame==null)m.o.feeSame=0;if(j.bm==null)m.o.bm='0050';if(j.hi50==null)m.o.hi50=(j.cur&&j.cur.hi50)||'';up9(m.o);m.o.v=10;norm(m.o);return m}
// v9：策略日誌（strategies、theses、tags），每筆交易加 id 與 thesisId（空白＝未分類）；不影響任何信貸計算
const newTid=()=>'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function up9(o){o.strategies=o.strategies||[];o.theses=o.theses||[];o.tags=o.tags||{};o.pxa=o.pxa||{};(o.trades||[]).forEach(x=>{if(x.thesisId==null)x.thesisId='';if(!x.id)x.id=newTid();if(x.rs==null)x.rs=''});
 // v10：策略加「預設停損 %」「每筆風險 %」；舊版本快照補空白欄位，避免被誤判成有未存的修改
 o.events=o.events||[];o.imports=o.imports||[];o.attr=o.attr||{};o.outlook=o.outlook||{};o.themes=o.themes||{};if(o.feeMode==null)o.feeMode='now';if(o.feeDay==null)o.feeDay=10;(o.theses||[]).forEach(T=>{if(T.status=='build')T.status='hold';if(!T.met)T.met=[]});
 o.strategies.forEach(st=>{['stopPct','riskPct'].forEach(k=>{if(st[k]==null)st[k]='';(st.hist||[]).forEach(h=>{if(h.snap&&h.snap[k]==null)h.snap[k]=''})})});return o}
function up8(o){o.trades=o.trades||[];o.smode='acct';o.fees=Object.assign(clone(DEF.fees),o.fees||{});
 (o.snaps||[]).forEach(s=>{if(!s.dt&&s.m)s.dt=s.m+'-15'});if(o.cur&&!o.cur.dt&&o.cur.m)o.cur.dt=o.cur.m+'-15';(o.ledger||[]).forEach(e=>{if(!e.dt&&e.m)e.dt=e.m+'-01'});return o}
function migrate0(j){j=j||{};let note='';
 if(j.v==6){const o=Object.assign(clone(DEF),j);o.cur=Object.assign(clone(DEF.cur),o.cur||{});o.hide=o.hide||{};o.hold=o.hold||[];o.lk=o.lk||{Wc:1};return{o:norm(o),note}}
 if(j.v==5){const o=up6(Object.assign(clone(DEF),j));o.cur=Object.assign(clone(DEF.cur),o.cur||{});o.hide=o.hide||{};o.hold=o.hold||[];o.lk=o.lk||{Wc:1};return{o:norm(o),note:'已升級：新增「虧損上限（停損）」，取代原本的「跌破底線」規則，預設為貸款金額的 20%，可在「🛡️ 風險」分頁修改。'}}
 if(j.v==4){const o=up5(Object.assign(clone(DEF),j),j);o.cur=Object.assign(clone(DEF.cur),o.cur||{});o.hide=o.hide||{};o.hold=o.hold||[];o.lk=o.lk||{Wc:1};up6(o);return{o:norm(o),note:'已升級為新版：新增「🛡️ 風險」分頁（壓力情境、虧損上限與應對規則），原本的下跌情境已轉為「自訂」情境。'}}
 let o;
 if(j.v==3){o=Object.assign(clone(DEF),j);o.cur=Object.assign(clone(DEF.cur),o.cur||{});o.sv0p=+j.sv0||0;o.sv0a=0;note='已轉換為新版：原「撥款前股票市值」暫放在「撥款前被動市值」，請到試算頁拆成被動／主動，並填撥款日 0050 還原股價。'}
 else{const s=j.v==2?j:(j.S||j);o=clone(DEF);
  ['L','Y','fee','lock','E','early','grow','cr','Wc','Wp','K','Ra','tax','bf','stE','stS','sc0','br','sals','livs','smode','hold','hide','ledger','snaps','plan'].forEach(k=>{if(s[k]!==undefined)o[k]=clone(s[k])});
  if(s.pen!==undefined)o.pen=s.pen;if(s.rate!==undefined)o.rates=[{k:1,r:+s.rate}];
  const y=s.y0||2026,m=s.sm||11,d=s.lday||2;o.dd=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  o.feeDed=(+s.sfee>0)?0:1;if(s.etfs)o.etfs=s.etfs.map(e=>({n:e.n,w:e.w,p:e.p,y:e.y,c:e.c}));
  o.sv0p=+s.sv0||0;o.Wa=Math.max(0,+(deposit(o)/1e4-(+o.Wc||0)-(+o.Wp||0)).toFixed(4));
  if(s.cur)o.cur=Object.assign(clone(DEF.cur),s.cur);
  if(j.v!=2&&s.sal)o.sals=[{m:t2ym(o,0),v:s.sal}];if(j.v!=2&&s.fix)o.livs=[{m:t2ym(o,0),v:s.fix}];
  note='已轉換為新版格式，請檢查「信貸條件」「撥款前狀態」「資金配置」。'}
 o=up6(up5(o,(j.v==2?j:(j.S||j))));o.hide=o.hide||{};o.lk=o.lk||{Wc:1};o.plan=null;return{o:norm(o),note}}

// ================= 帳戶現金（主動、被動分開）=================
// 現金（萬）：分主動、被動兩格；舊資料只有合計（c）時，全部當作主動（old=1，畫面上請使用者確認一次）
function cashOf(o){if(!o)return null;const a=num(o.ca),p=num(o.cp);if(a!=null||p!=null)return{a:a||0,p:p||0,t:(a||0)+(p||0),old:0};const c=num(o.c);return c!=null?{a:c,p:0,t:c,old:1}:null}
// 最近一次填的現金：這一期結算（含資產頁填的）→ 最近一次儲存的結算
function cashLast(S){const cur=cashOf(S.cur);if(cur)return Object.assign(cur,{d:S.cashD||sDate(S.cur)||TODAY,src:'cur'});
 const L=(S.snaps||[]).filter(s=>cashOf(s)).sort((a,b)=>sDate(a)<sDate(b)?1:-1)[0];return L?Object.assign(cashOf(L),{d:sDate(L),src:'snap'}):null}
// 推算到 asOf 的現金（元）：最近一次填的現金 ＋ 之後每筆買賣的交割款 ＋ 已入帳的配息（填現金那天的交易視為已經算進去）
// 用「交易日」記帳：填的是交割帳戶餘額，填的那天還沒交割的買賣（T+2）、已除息還沒入帳的配息先補進去；之後依交易日、除息日加減
function cashAt(S,asOf){asOf=asOf||TODAY;const L=cashLast(S);if(!L)return null;const o={a:L.a*1e4,p:L.p*1e4,d:L.d,old:L.old,est:0};
 const lo=L.d<asOf?L.d:asOf,hi=L.d<asOf?asOf:L.d,sg=L.d<asOf?1:-1;
 for(const x of S.trades||[]){if(!x.dt||!cU(x.n)||x.k=='sdiv')continue;const k=x.ac=='a'?'a':'p';
  const pend=x.k=='div'?(x.dt<=L.d&&L.d<(x.pdt||x.dt)):(x.dt<=L.d&&L.d<addBD(x.dt,2));if(pend){const m=tradeAmt(S,x);o[k]+=m.cash||0}
  if(!(x.dt>lo&&x.dt<=hi))continue;if(x.k=='div'&&+x.out)continue;const m=tradeAmt(S,x);if(!m.cash)continue;o[k]+=sg*m.cash;o.est=1}
 o.t=o.a+o.p;return o}

// ================= ETF 歷史參考資料（由 Yahoo Finance 月資料計算，見 ETFREF.src）=================
