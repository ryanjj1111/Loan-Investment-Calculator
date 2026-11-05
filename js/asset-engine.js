// 資產總覽的計算（只讀資料，不改任何信貸計算）
// 信貸資產管理試算器｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

// 交易依據（點選）
const AS_RS={buy:[['new','新建倉'],['plan','照計畫加碼'],['dip','逢低加碼'],['oth','其他']],sell:[['tp','停利'],['sl','停損'],['inv','理由失效'],['adj','調整部位'],['to','超過期限'],['oth','其他']]};
const AS_RS2EXIT={tp:'target',sl:'stop',inv:'invalid',to:'timeout',adj:'other',oth:'other'};
const asRsN=k=>{if(!k)return'';for(const t in AS_RS){const f=AS_RS[t].find(x=>x[0]==k);if(f)return f[1]}return''};
// 這檔股票目前進行中的論點（沒有就 null）
const asThesisOf=(S,c)=>(S.theses||[]).filter(T=>T.status!='exit'&&cU(T.code)==cU(c)).sort((a,b)=>(b.created||'')>(a.created||'')?1:-1)[0]||null;

// 每檔持股（部位＋代號）：股數、均價、成本、現價、市值、未實現、已實現、股利、手續費與稅
function asRows(S){const pxm=S.px||{},fee={};
 for(const x of S.trades||[]){if(!x.dt||!cU(x.n)||(x.k!='buy'&&x.k!='sell'))continue;const m=tradeAmt(S,x),k=(x.ac=='a'?'a':'p')+'|'+cU(x.n);fee[k]=(fee[k]||0)+m.fee+m.tax}
 return holdings(S).map(o=>{const c=cU(o.n),px=num(pxm[c]),open=o.q>0,mv=open&&px!=null?o.q*px:null,un=mv!=null?mv-o.cost:null,f=fee[o.ac+'|'+c]||0;
  return{ac:o.ac,c,q:o.q,iq:o.iq||0,cost:o.cost,avg:open?o.cost/o.q:null,px,pxd:(S.pxd||{})[c]||'',auto:!!(S.pxa||{})[c],mv,un,unp:un!=null&&o.cost>0?un/o.cost*100:null,real:o.real,div:o.div,fee:f,open,last:o.last,divs:o.divs||[]}})}

// 合計（ac 不填＝全部）
function asSum(S,ac){const z={mv:0,cost:0,un:0,real:0,div:0,fee:0,n:0,miss:[],p:{mv:0,cost:0},a:{mv:0,cost:0}};
 for(const r of asRows(S)){if(ac&&r.ac!=ac)continue;z.real+=r.real;z.div+=r.div;z.fee+=r.fee;if(!r.open)continue;z.n++;z.cost+=r.cost;z[r.ac].cost+=r.cost;if(r.mv==null){z.miss.push(r.c);continue}z.mv+=r.mv;z.un+=r.un;z[r.ac].mv+=r.mv}
 z.tot=z.un+z.real+z.div;return z}

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
 const base=Math.max((+S.Wa||0)*1e4,stExposure(S).tot);if(!base)return null;const loss=base*riskPct/100,q=Math.floor(loss/(px*stopPct/100));return{base,loss,q}}
