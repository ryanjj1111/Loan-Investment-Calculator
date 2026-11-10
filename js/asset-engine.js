// 資產總覽的計算（只讀資料，不改任何信貸計算）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

// 交易依據（點選）
const AS_RS={buy:[['new','新建倉'],['plan','照計畫加碼'],['dip','逢低加碼'],['oth','其他']],sell:[['tp','停利'],['sl','停損'],['inv','理由失效'],['adj','調整部位'],['to','超過期限'],['oth','其他']]};
const AS_RS2EXIT={tp:'target',sl:'stop',inv:'invalid',to:'timeout',adj:'other',oth:'other'};
const asRsN=k=>{if(!k)return'';for(const t in AS_RS){const f=AS_RS[t].find(x=>x[0]==k);if(f)return f[1]}return''};
// 這檔股票目前進行中的論點（沒有就 null）
const asThesisOf=(S,c)=>(S.theses||[]).filter(T=>T.status!='exit'&&cU(T.code)==cU(c)).sort((a,b)=>(b.created||'')>(a.created||'')?1:-1)[0]||null;

// 券商成本（跟券商 App 一樣）：撥款前持股用「原始成本」，手續費「每月退回」時用交易當下收的全額手續費
function asHoldB(S){const H={},k=(ac,c)=>(ac=='a'?'a':'p')+'|'+c;
 if(hasInit(S))for(const r of S.init){const q=+r.q||0,c=cU(r.n);if(!q||!c)continue;const o=H[k(r.ac,c)]||(H[k(r.ac,c)]={q:0,cost:0,real:0,noC0:0});o.q+=q;if(num(r.c0)!=null)o.cost+=num(r.c0);else{o.cost+=q*(+r.px||0);o.noC0=1}}
 const L=(S.trades||[]).map((x,i)=>({x,i})).filter(o=>o.x.dt&&cU(o.x.n)).sort((a,b)=>a.x.dt==b.x.dt?a.i-b.i:(a.x.dt>b.x.dt?1:-1));
 for(const{x}of L){const o=H[k(x.ac,cU(x.n))]||(H[k(x.ac,cU(x.n))]={q:0,cost:0,real:0,noC0:0}),m=tradeAmt(S,x),f=S.feeMode=='month'&&num(x.fee)==null?Math.max(m.fee,fullFee(x)):m.fee,sh=num(x.q)||0;
  if(x.k=='buy'){o.q+=sh;o.cost+=m.g+f}else if(x.k=='sell'){const avg=o.q>0?o.cost/o.q:0,u=Math.min(sh,o.q);o.cost-=avg*u;o.real+=m.g-f-m.tax-avg*u;o.q-=u}else if(x.k=='sdiv')o.q+=sh}
 return H}
// 預估賣出費用（券商 App 的「預估損益」會先扣）：手續費 0.1425% 不打折＋證交稅
const asEstSell=(S,c,mv)=>mv>0?Math.floor(mv*0.001425)+Math.floor(mv*(/^00/.test(c)?S.stE:S.stS)/100):0;
// 每檔持股（部位＋代號）：股數、均價、成本、現價、市值、未實現、已實現、股利、手續費與稅
// cost／un＝撥款後（撥款前持股用撥款日收盤價，和信貸頁一致）；cb／ub＝券商成本（跟 App 一樣）
function asRows(S){const HB=asHoldB(S);const pxm=S.px||{},fee={};
 for(const x of S.trades||[]){if(!x.dt||!cU(x.n)||(x.k!='buy'&&x.k!='sell'))continue;const m=tradeAmt(S,x),k=(x.ac=='a'?'a':'p')+'|'+cU(x.n);fee[k]=(fee[k]||0)+m.fee+m.tax}
 return holdings(S).map(o=>{const c=cU(o.n),px=num(pxm[c]),open=o.q>0,mv=open&&px!=null?o.q*px:null,un=mv!=null?mv-o.cost:null,f=fee[o.ac+'|'+c]||0;
  const b=HB[o.ac+'|'+c]||{q:o.q,cost:o.cost,real:o.real,noC0:1},est=mv!=null?asEstSell(S,c,mv):0,ub=mv!=null?mv-b.cost-est:null;
  return{cb:b.cost,avgB:open&&b.q>0?b.cost/b.q:null,ub,ubp:ub!=null&&b.cost>0?ub/b.cost*100:null,realB:b.real,est,noC0:!!b.noC0&&(o.iq||0)>0,ac:o.ac,c,q:o.q,iq:o.iq||0,cost:o.cost,avg:open?o.cost/o.q:null,px,pxd:(S.pxd||{})[c]||'',auto:!!(S.pxa||{})[c],mv,un,unp:un!=null&&o.cost>0?un/o.cost*100:null,real:o.real,div:o.div,fee:f,open,last:o.last,divs:o.divs||[]}})}

// 合計（ac 不填＝全部）
function asSum(S,ac){const z={mv:0,cost:0,un:0,real:0,div:0,fee:0,n:0,miss:[],cb:0,ub:0,realB:0,noC0:0,p:{mv:0,cost:0},a:{mv:0,cost:0}};
 for(const r of asRows(S)){if(ac&&r.ac!=ac)continue;z.real+=r.real;z.realB+=r.realB;z.div+=r.div;z.fee+=r.fee;if(!r.open)continue;z.n++;z.cost+=r.cost;z.cb+=r.cb;if(r.noC0)z.noC0++;z[r.ac].cost+=r.cost;if(r.mv==null){z.miss.push(r.c);continue}z.mv+=r.mv;z.un+=r.un;z.ub+=r.ub;z[r.ac].mv+=r.mv}
 z.tot=z.un+z.real+z.div;z.totB=z.ub+z.realB+z.div;return z}

// 現金流（撥款日的期初持股、每筆買賣、配息）與「同樣的錢、同樣的時間點買基準 ETF」比較
// 回傳：inv 累計投入、tot 總損益、ret 報酬率、xr 年化（XIRR）、bmDiff 比基準多賺的錢（null＝缺基準價格）
function asVsBm(S,ac){const ev=[],bmc=bmC(S),pxm=S.px||{};
 if(hasInit(S))for(const r of S.init){if(ac&&(r.ac=='a'?'a':'p')!=ac)continue;const v=(+r.q||0)*(+r.px||0);if(v>0)ev.push({d:S.dd,v:-v,bm:stBmPx(S,S.dd,null)})}
 for(const x of S.trades||[]){if(!x.dt||!cU(x.n)||(ac&&(x.ac=='a'?'a':'p')!=ac))continue;const m=tradeAmt(S,x);
  if(x.k=='buy'||x.k=='sell'){if(m.cash)ev.push({d:x.dt,v:m.cash,bm:stBmPx(S,x.dt,x.bmPx)})}
  else if(x.k=='div'&&m.cash){const d=x.pdt||x.dt;if(d<=TODAY)ev.push({d,v:m.cash,div:1})}}
 ev.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
 const s=asSum(S,ac),z={inv:0,tot:s.tot,mv:s.mv,miss:s.miss,ret:null,xr:null,days:0,bmDiff:null,bmMiss:0,bmVal:null};if(!ev.length)return z;
 z.inv=ev.filter(e=>e.v<0).reduce((a,e)=>a-e.v,0);z.ret=z.inv>0?s.tot/z.inv*100:null;z.days=dDays(ev[0].d,TODAY);
 if(!s.miss.length){const fl=ev.map(e=>({d:e.d,v:e.v}));fl.push({d:TODAY,v:s.mv});z.xr=xirrD(fl)}
 // 基準：投入時買進同金額的基準 ETF、賣出時賣出同金額；配息依當時持有的基準單位數
 const bd=stBmDivs(S),bmNow=num(pxm[bmc]);let u=0,cash=0,bi=0;
 for(const e of ev){while(bi<bd.length&&bd[bi].d<=e.d){cash+=u*bd[bi].dps;bi++}if(e.div){cash-=e.v;continue}if(e.bm==null){z.bmMiss++;continue}u+=-e.v/e.bm}
 while(bi<bd.length&&bd[bi].d<=TODAY){cash+=u*bd[bi].dps;bi++}
 if(!z.bmMiss&&bmNow!=null&&!s.miss.length){z.bmVal=u*bmNow+cash;z.bmDiff=s.mv-z.bmVal}
 return z}

// 族群占主動部位
function asGroups(S){const E=stExposure(S),L=[];for(const g in E.grp)L.push({g,v:E.grp[g],p:E.tot>0?E.grp[g]/E.tot*100:0,cap:stCapGroup(S,g)});return L.sort((a,b)=>b.v-a.v)}

// 依停損距離算建議股數：每筆最多虧主動部位 × 風險 %
function asSizeHint(S,px,stopPct,riskPct){px=num(px);stopPct=num(stopPct);riskPct=num(riskPct);if(!px||!stopPct||!riskPct)return null;
 const base=stExposure(S).tot;if(!base)return null;const loss=base*riskPct/100,q=Math.floor(loss/(px*stopPct/100));return{base,loss,q}}

// ================= 風險：未平倉風險、槓桿、離虧損上限 =================
// 沒設停損、或已經跌破停損還沒賣的部位，用回測 v4 各策略「持有期間最大跌幅」最差 10% 估
// 2026-11-10 審查 v6：已跌破停損不再算 0；離停損再近也至少算 3%（跳空）
const AS_STRESS={S01:13,S02:12,S03:10,S04:23,S05:10,S06:41,S07:18},AS_STRESS_DEF=20,AS_MIN_GAP=3;
function asOpenRisk(S){const E=stExposure(S),L=[];let tot=0,noStop=0,broken=0;
 for(const r of asRows(S)){if(r.ac!='a'||!r.open||r.px==null)continue;const T=asThesisOf(S,r.c),st=T?num(T.stop):null,sp=T?(AS_STRESS[T.sid]??AS_STRESS_DEF):AS_STRESS_DEF;let v,how;
  if(st!=null&&st<r.px){const g=Math.max(r.px-st,r.px*AS_MIN_GAP/100);v=r.q*g;how=`停損 ${st}（−${((1-st/r.px)*100).toFixed(1)}%）`+(g>r.px-st?`，太近用 −${AS_MIN_GAP}% 算`:'')}
  else if(st!=null){v=r.q*r.px*sp/100;how=`已跌破停損 ${st} 還沒賣：用 −${sp}% 估`;broken++}
  else{v=r.q*r.px*sp/100;how=`沒設停損，用 −${sp}% 估${T?'（'+T.sid+' 回測最差 10%）':''}`;noStop++}
  tot+=v;L.push({c:r.c,v,how,th:T?T.id:''})}
 return{tot,pct:E.tot>0?tot/E.tot*100:null,base:E.tot,baseSrc:E.baseSrc,L:L.sort((a,b)=>b.v-a.v),noStop,broken}}

// ================= 資產趨勢：每天收盤的持股市值、現金、真實淨資產、同金流 0050 =================
// 收盤價來自網站的每月收盤價檔（撥款日起）；現金用最近一次填的現金依交易推算；真實淨資產用和結算相同的公式
function asTrend(S){if(!S.dd||typeof PXH=='undefined')return null;const D=Object.keys(PXH).filter(d=>d>=S.dd&&d<=TODAY).sort();if(D.length<2)return null;
 const bm=bmC(S),last={},out=[],hasCash=!!cashLast(S),bd=stBmDivs(S);
 // 同金流 0050：撥款日的期初持股、每筆買賣的金額，同一天改買（賣）0050
 const fl=[];if(hasInit(S))for(const r of S.init){const v=(+r.q||0)*(+r.px||0);if(v>0)fl.push({d:S.dd,v})}
 for(const x of S.trades||[]){if(!x.dt||!cU(x.n)||(x.k!='buy'&&x.k!='sell'))continue;const m=tradeAmt(S,x);if(m.cash)fl.push({d:x.dt,v:-m.cash})}
 fl.sort((a,b)=>a.d<b.d?-1:1);let u=0,bc=0,fi=0,bi=0,miss=0,bmOk=true;
 const tr=new Set((S.trades||[]).filter(x=>x.dt&&(x.k=='buy'||x.k=='sell')).map(x=>x.dt));
 for(const d of D){const P=PXH[d];for(const c in P)if(num(P[c])!=null)last[c]=num(P[c]);
  while(bi<bd.length&&bd[bi].d<=d){bc+=u*bd[bi].dps;bi++}
  while(fi<fl.length&&fl[fi].d<=d){const b=last[bm];if(b){const q=fl[fi].v/b;if(q>=0)u+=q;else{const sv=Math.min(u,-q);u-=sv;bc+=sv*b}}else bmOk=false;fi++}
  const mv=marketVals(S,last,d);if(mv.miss.length){miss++;continue}
  const C=hasCash?cashAt(S,d):null,cash=C?C.t:null;let real=null,nw0=null;
  if(C&&typeof settle=='function'){try{const pa=pendAt(S,d),nl=nleAt(S,last,d),r=settle(S,{dt:d,p:mv.p/1e4,a:mv.a/1e4,c:(cash-pa.adj)/1e4,nleS:nl.miss.length?'':nl.v/1e4});if(r)real=r.real}catch(e){}}
  out.push({d,p:mv.p,a:mv.a,mv:mv.p+mv.a,cash,tot:mv.p+mv.a+(cash??0),real,bm:bmOk&&last[bm]?u*last[bm]+bc:null,tr:tr.has(d)})}
 if(out.length<2)return null;
 // 每日回撤（持股，時間加權：扣掉當天買賣的金額）
 let idx=1,pk=1,mdd=0,cur=0;const nb={};for(const x of S.trades||[]){if(!x.dt||(x.k!='buy'&&x.k!='sell')||!cU(x.n))continue;nb[x.dt]=(nb[x.dt]||0)-tradeAmt(S,x).cash}
 for(let i=1;i<out.length;i++){const a=out[i-1].mv,b=out[i].mv-(nb[out[i].d]||0);if(a>0){idx*=b/a;pk=Math.max(pk,idx);cur=idx/pk-1;mdd=Math.min(mdd,cur)}out[i].twr=idx}
 out[0].twr=1;return{pts:out,mdd,cur,twr:idx-1,base0:(S.sv0+S.sc0)*1e4,hasCash,miss}}
