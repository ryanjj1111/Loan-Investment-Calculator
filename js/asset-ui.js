// 📊 資產首頁、個股頁、快速記交易（只在專業版顯示）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 ui.js（$、esc、R、W2、nameOf、toast、upd、save、calc、renderTrades、NEW）、strategy-ui.js（stWs、stTxt、stTi）與 asset-engine.js

let asG=ls('lcag')||'ac',asCl=ls('lcac')=='1',AT=null,asCur=null;
const asPct=v=>v==null||isNaN(v)?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
const asM=v=>v==null||isNaN(v)?'—':(v>=0?'+':'−')+W2(Math.abs(v))+' 萬';
const asY=v=>v==null||isNaN(v)?'—':(v>=0?'+':'−')+R(Math.abs(v));
const asC=v=>v==null||isNaN(v)?'':v<0?'bad':'ok';
const asD=d=>d?String(d).slice(5).replace('-','/'):'';
const asKN=k=>({buy:'買進',sell:'賣出',div:'配息',sdiv:'配股'})[k]||k;

function asBuild(){if(!$('pgA'))return;const cdd=$('cardsD');if(cdd){cdd.open=isS()||ls('lccd')!='0';cdd.ontoggle=()=>{if(!isS())ls('lccd',cdd.open?'1':'0');asCardsSum()}}if(typeof pxApply=='function'&&typeof PXL!='undefined'&&Object.keys(PXL).length)setTimeout(pxApply,0);$('asGrp').innerHTML=[['ac','部位'],['st','策略'],['tag','族群']].map(([k,l])=>`<button class="${asG==k?'on':''}" onclick="asSetG('${k}')">${l}</button>`).join('');$('asClosed').checked=asCl;asCalc()}
window.asSetG=k=>{asG=k;ls('lcag',k);asBuild()};
window.asShowClosed=v=>{asCl=!!v;ls('lcac',v?'1':'0');asCalc()};

// ---------- 首頁
function asBmTxt(v){const bm=esc(bmC(S));if(v.bmDiff!=null)return`<b class="${asC(v.bmDiff)}">${v.bmDiff>=0?'多賺':'少賺'} ${W2(Math.abs(v.bmDiff))} 萬</b>`;if(!v.inv)return'—';if(v.miss.length)return'<span class=h>需要全部現價</span>';if(v.bmMiss)return`<span class=wn>缺 ${v.bmMiss} 筆交易當天的 ${bm} 價格</span>`;return`<span class=wn>需要 ${bm} 現價</span>`}
// 信貸重點卡片收合時的一行摘要（每張卡片取標題與第一行數字）
const asFirstTxt=el=>{let t='';for(const n of el.childNodes){if(n.nodeType==3)t+=n.textContent;else if(/^(BR|SMALL|DIV)$/.test(n.nodeName))break;else t+=n.textContent}return t.trim()};
function asCardsSum(){const d=$('cardsD'),s=$('cardsS');if(!d||!s)return;if(isS()){d.open=true;return}const L=[...document.querySelectorAll('#cards > .c')].slice(0,3).map(c=>{const t=c.querySelector('small'),b=c.querySelector('b');return((t?t.firstChild&&t.firstChild.textContent||'':'')+' '+(b?asFirstTxt(b):'')).trim()}).filter(Boolean);s.innerHTML=`📋 信貸重點卡片${d.open?' <span class=h>（點這裡收合）</span>':` <span class=h>｜${esc(L.join('｜'))}｜點這裡展開</span>`}`}
function asCalc(){asCardsSum();if(!$('pgA'))return;const sp=$('sPxNote');if(sp)sp.innerHTML='現價：'+(typeof pxStatus=='function'?pxStatus():'')+` <button class=lk onclick="setWs('as')">到資產頁看持股 ›</button>`;
 if(stWs()!='as')return;
 const z=asSum(S),all=asVsBm(S),act=asVsBm(S,'a'),bm=esc(bmC(S));let loan='💰 信貸：結算填了現金後顯示 A／C';
 try{const r=settle(S,curEff());if(r)loan=`💰 信貸：A <b class="${asC(r.af)}">${asM(r.af)}</b>｜C <b class="${asC(r.ao)}">${asM(r.ao)}</b>`}catch(e){}
 $('asTop').innerHTML=`<div class=ash2>📦 我的庫存 <span class=h>（跟券商 App 一樣：用原始成本，預估損益已扣賣出手續費與證交稅）</span></div><div class=ast>
  <div class=c><small>總市值</small><b>${W2(z.mv)} 萬</b><small>${z.miss.length?`<span class=wn>${z.miss.length} 檔沒有現價</span>`:'成本 '+W2(z.cb)+' 萬'}</small></div>
  <div class=c><small>預估損益</small><b class="${asC(z.ub)}">${asM(z.ub)}</b><small>${asPct(z.cb?z.ub/z.cb*100:null)}</small></div>
  <div class=c><small>已實現＋股利</small><b class="${asC(z.realB+z.div)}">${asM(z.realB+z.div)}</b><small>賣出損益與配息</small></div>
  <div class=c><small>總損益</small><b class="${asC(z.totB)}">${asM(z.totB)}</b><small>${z.noC0?`<span class=wn>${z.noC0} 檔沒填原始成本</span>`:'預估損益＋已實現＋股利'}</small></div></div>
  ${asPostOn()?`<div class=ash2 style="margin-top:10px">📅 撥款後績效 <span class=h>（${esc(asD(S.dd))} 起；撥款前持股以撥款日收盤價計，和信貸頁一致）</span> <button class=lk onclick="asPostSet(0)">隱藏</button></div>
  <div class=asl>撥款後損益 <b class="${asC(z.tot)}">${asM(z.tot)}</b>（${all.days<182.6?'期間報酬 '+asPct(all.ret):'年化 '+asPct(all.xr)}）</div>
  ${(()=>{const s=asPostSplit(S);return s.n1&&s.n0?`<div class=asl>其中：撥款後有買賣的 ${s.n1} 檔 <b class="${asC(s.v1)}">${asM(s.v1)}</b>｜撥款前持股（之後沒有再買賣）${s.n0} 檔 <b class="${asC(s.v0)}">${asM(s.v0)}</b>${s.miss?' <span class=h>（'+s.miss+' 檔需現價）</span>':''}</div>`:''})()}
  <div class=asl>vs ${bm}（同樣的錢、同樣的時間點買 ${bm}）：全部 ${asBmTxt(all)}｜主動 ${asBmTxt(act)}</div>
  <div class=asl>${loan} <button class=lk onclick="setWs('loan')">看信貸 ›</button></div>`:`<div class=asl style="margin-top:8px"><button class=lk onclick="asPostSet(1)">📅 顯示撥款後績效</button> <span class=h>（有用信貸投資時，看撥款日之後的損益和 vs ${bm}）</span></div>`}
  <div class=asl>現價：${pxStatus()} <button class=lk onclick="pxRefresh()">🔄 更新</button></div>`;
 const A=stAlerts(S);$('asAl').innerHTML=A.length?`<div class=stal><b>⚠️ 提醒（${A.length}）</b>${A.slice(0,4).map(asAlRow).join('')}${A.length>4?`<div><button onclick="setWs('st')">看全部 ${A.length} 則 ›</button></div>`:''}</div>`:'';
 // 配置
 const CS=asCash(),cash=CS.v!=null?CS.v*1e4:null,tot=z.p.mv+z.a.mv+(cash||0),seg=(v,c,l)=>tot>0&&v>0?`<span style="width:${v/tot*100}%;background:${c}" title="${l}"></span>`:'';
 const W=(+S.Wp||0)+(+S.Wa||0)+(+S.Wc||0),G=asGroups(S);
 $('asAlloc').innerHTML=tot>0?`<b>🧩 配置</b><div class=asbar>${seg(z.p.mv,'#3b82f6','被動')}${seg(z.a.mv,'#f59e0b','主動')}${seg(cash,'#94a3b8','現金')}</div>
  <div class=asl><span class=dot style="background:#3b82f6"></span>被動 ${(z.p.mv/tot*100).toFixed(0)}%　<span class=dot style="background:#f59e0b"></span>主動 ${(z.a.mv/tot*100).toFixed(0)}%${cash!=null?`　<span class=dot style="background:#94a3b8"></span>現金 ${(cash/tot*100).toFixed(0)}%`:''}${W>0?`<br><span class=h>目標：被動 ${((+S.Wp||0)/W*100).toFixed(0)}%｜主動 ${((+S.Wa||0)/W*100).toFixed(0)}%｜現金 ${((+S.Wc||0)/W*100).toFixed(0)}%</span>`:''}</div>
  <div class=asl>帳戶現金 <input type=number step=any value="${CS.cur!=null?CS.cur:''}" placeholder="${CS.v!=null?CS.v:'0'}" onchange="asCashSet(this.value)" style="width:90px"> 萬 <span class="${CS.old?'wn':'h'}">${CS.cur!=null?(S.cashD?'（'+esc(asD(S.cashD))+' 填）':''):CS.v!=null?'（沿用 '+esc(asD(CS.d))+' 結算的現金）':'（還沒填）'}${CS.old?'，超過 30 天沒更新':''}</span><div class=h>和「💰 信貸 → 📋 結算」這一期的「追蹤帳戶現金合計」是同一格，填一次兩邊都會更新。</div></div>
  ${G.length?`<div class=asl>族群（占主動）：${G.map(g=>`<span class="${g.p>g.cap?'wn':''}">${esc(g.g)} ${g.p.toFixed(0)}%${g.p>g.cap?'（上限 '+g.cap+'%）':''}</span>`).join('、')}</div>`:''}`:'';
 // 庫存
 const L=asRows(S).filter(r=>r.open||(asCl&&(Math.abs(r.real)>0.5||r.div>0))),E=stExposure(S),grp={};
 for(const r of L){const T=r.ac=='a'?asThesisOf(S,r.c):null;let k,l;
  if(asG=='st'){if(r.ac=='p'){k='~p';l='🛡️ 被動（依配置）'}else if(T&&stStrat(S,T.sid)){const st=stStrat(S,T.sid);k=st.id;l='🧭 '+st.id+' '+st.name}else{k='~u';l='⚡ 主動・未分類'}}
  else if(asG=='tag'){if(r.ac=='p'){k='~p';l='🛡️ 被動'}else{const t=((S.tags||{})[r.c]||[])[0]||(typeof indOf=='function'?indOf(r.c):'');k=t?'t'+t:'~u';l=t?'🏷️ '+t:'⚡ 主動・未加標籤'}}
  else{k=r.ac=='p'?'1':'2';l=r.ac=='p'?'🛡️ 被動':'⚡ 主動'}
  (grp[k]=grp[k]||{l,L:[]}).L.push(r)}
 $('asList').innerHTML=Object.keys(grp).sort().map(k=>{const g=grp[k],mv=g.L.reduce((a,r)=>a+(r.mv||0),0),un=g.L.reduce((a,r)=>a+(r.ub||0),0);g.L.sort((a,b)=>(b.mv||0)-(a.mv||0));
  const act=g.L.every(r=>r.ac=='a'),gp=act&&k!='2'&&E.tot>0?mv/E.tot*100:null;
  return`<div class=asgh><span>${esc(g.l)}${gp!=null?' <small class=h>占主動 '+gp.toFixed(0)+'%</small>':''}</span><span>${W2(mv)} 萬　<span class="${asC(un)}">${asY(un)}</span></span></div>${g.L.map(r=>asRow(r,z.p.mv,E)).join('')}`}).join('')||'<div class=h style="margin:8px 0">還沒有持股。按「＋記交易」記下第一筆，或在信貸頁的「撥款前狀態」填期初持股。</div>';
 if(asCur&&$('asStopD')){const T=asThesisOf(S,asCur.c),px=num((S.px||{})[asCur.c]),st=T?num(T.stop):null;$('asStopD').innerText=px&&st?`現價距離停損 ${((st/px-1)*100).toFixed(1)}%`:''}}
// 帳戶現金（萬）：這一期結算填的；還沒填就沿用最近一次儲存的結算
function asCash(){const cur=num(S.cur&&S.cur.c);if(cur!=null){const d=S.cashD||sDate(S.cur);return{v:cur,cur,d,old:!!d&&dDays(d,TODAY)>30}}
 const L=(S.snaps||[]).filter(s=>num(s.c)!=null).sort((a,b)=>sDate(a)<sDate(b)?1:-1)[0];return L?{v:num(L.c),cur:null,d:sDate(L),old:dDays(sDate(L),TODAY)>30}:{v:null,cur:null,d:'',old:false}}
window.asCashSet=v=>{S.cur=S.cur||{};S.cur.c=String(v).trim();S.cashD=TODAY;document.querySelectorAll('[data-p="cur.c"]').forEach(e=>e.value=S.cur.c);upd()};
// 在結算頁改現金時，也記下填的日期
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.p=='cur.c')S.cashD=TODAY});
function asAlRow(a){let b='';if(a.k=='ev'){b=(a.et=='除息'?` <button onclick="evDiv('${a.ev}')">記配息</button>`:'')+` <button onclick="evDone('${a.ev}')">✓ 完成</button>`}else if(a.k=='pend'){b=` <button onclick="asClose();setWs('st');stOpenTh('${a.th}')">確認</button>`}else if(a.k=='exr'){b=` <button onclick="asClose();setWs('st');stOpenTh('${a.th}')">補填</button>`}else if(a.th&&(a.k=='rev'||a.k=='fin')){const kd=a.k=='rev'?'營收':'財報';b=` <button onclick="asRev('${a.th}','${kd}',1)">✅ 仍成立</button><button onclick="asRev('${a.th}','${kd}',0)">⚠️ 有疑慮</button>`}else if(a.th)b=` <button onclick="asStockTh('${a.th}')">查看</button>`;return`<div class="${a.lv||''}">· ${esc(a.t)}${b}</div>`}
function asRow(r,tot,E){const T=r.ac=='a'?asThesisOf(S,r.c):null,st=T?stStrat(S,T.sid):null,fl=[];
 if(T&&num(T.stop)!=null&&r.px!=null&&r.px<=num(T.stop))fl.push('🔻 跌破停損 '+T.stop);
 if(T&&num(T.tgtPx)!=null&&r.px!=null&&r.px>=num(T.tgtPx))fl.push('🎯 達到目標價 '+T.tgtPx);
 if(r.ac=='a'&&r.open&&E.tot>0){const p=(E.by[r.c]||0)/E.tot*100,cap=stCapStock(S,r.c);if(p>cap)fl.push(`⚠️ 占主動 ${p.toFixed(1)}%，超過上限 ${cap}%`)}
 const w=r.ac=='a'?(E.tot>0&&E.by[r.c]?E.by[r.c]/E.tot*100:null):(r.mv!=null&&tot>0?r.mv/tot*100:null),wl=r.ac=='a'?'占主動':'占被動';
 return`<div class=asr onclick="asStock('${r.c}','${r.ac}')"><div class=a1><span><b>${esc(r.c)}</b> ${esc(nameOf(r.c))}${T?` <span class="thc on">${T.id}${st?'·'+st.id:''}</span>`:r.ac=='a'&&r.open?' <span class=thc>未分類</span>':''}</span><span class="${asC(r.open?r.ub:r.realB+r.div)}">${r.open?(r.ub!=null?asY(r.ub)+' <small>'+asPct(r.ubp)+'</small>':'<small class=wn>需現價</small>'):'已出清 '+asY(r.realB+r.div)}</span></div>
 <div class=a2><span>${r.open?R(r.q)+' 股｜均 '+(r.avgB!=null?r.avgB.toFixed(2):'—'):'0 股'}</span><span>${r.px!=null?'現 '+r.px+' <small>'+(r.auto?'收盤 ':'手填 ')+asD(r.pxd)+'</small>':''}</span></div>
 ${r.open?`<div class=a2><span>市值 ${r.mv!=null?W2(r.mv)+' 萬':'—'}${w!=null?'｜'+wl+' '+w.toFixed(1)+'%':''}</span><span>${r.un!=null&&asPostOn()&&asHasPost(r)?'撥款後 <span class="'+asC(r.un)+'">'+asY(r.un)+'</span>':''}${r.div?'｜股利 '+R(r.div):''}${r.noC0?' <small class=wn>未填原始成本</small>':''}</span></div>`:''}
 ${fl.length?`<div class="a2 wn">${fl.join('　')}</div>`:''}</div>`}

// 撥款後績效：S.postOn 沒設定時，有填信貸金額就顯示
const asPostOn=()=>S.postOn!=null?!!+S.postOn:(+S.L||0)>0;
window.asPostSet=v=>{S.postOn=v;save();asCalc()};
// 這檔在撥款日之後有沒有買賣（只有撥款前持股、之後沒有再買賣的，不顯示個股的撥款後損益）
const asHasPost=r=>(S.trades||[]).some(x=>(x.k=='buy'||x.k=='sell')&&cU(x.n)==r.c&&(x.ac=='a'?'a':'p')==r.ac&&x.dt&&(!S.dd||x.dt>=S.dd));
// 撥款後損益拆成：撥款後有買賣的、撥款前持股（之後沒有再買賣）
function asPostSplit(S){const o={n1:0,v1:0,n0:0,v0:0,miss:0};for(const r of asRows(S)){const v=(r.un||0)+(r.real||0)+(r.div||0);if(r.open&&r.un==null)o.miss++;if(asHasPost(r)){o.n1++;o.v1+=v}else if(r.open||r.real||r.div){o.n0++;o.v0+=v}}return o}

// ---------- 個股頁
function asOvOpen(h){$('asOvB').innerHTML=h;$('asOv').style.display='flex';$('asOvB').scrollTop=0;document.body.style.overflow='hidden'}
window.asClose=()=>{$('asOv').style.display='none';document.body.style.overflow='';asCur=null;AT=null;asCalc()};
window.asStockTh=id=>{const T=stThesis(S,id);if(T)asStock(cU(T.code),'a')};
window.asStock=(c,ac)=>{asCur={c,ac};AT=null;asOvOpen(asStockHtml(c,ac));asCalc()};
window.asRev=(id,kind,ok)=>{const T=stThesis(S,id);if(!T)return;T.reviews=T.reviews||[];T.reviews.unshift({date:TODAY,kind,ok,note:''});upd();toast(`${T.id} 已記錄：${ok?'✅ 論點仍成立':'⚠️ 有疑慮'}（可在論點補說明）`,0);if(asCur)asStock(asCur.c,asCur.ac)};
window.asNewTh=(c,sid)=>{const st=stStrat(S,sid),h=holdings(S).find(o=>o.ac=='a'&&cU(o.n)==c),T=stNewThesis(S,{code:c,sid,sver:st?st.ver:1,status:h&&h.q>0?'hold':'plan',useInit:h&&h.iq>0?1:0});
 let n=0;for(const x of S.trades||[])if(x.ac=='a'&&cU(x.n)==c&&!x.thesisId&&x.k!='div'){x.thesisId=T.id;n++}
 if(st&&num(st.stopPct)&&h&&h.q>0)T.stop=+(h.cost/h.q*(1-num(st.stopPct)/100)).toFixed(2);stThDefaults(S,T,null);(S.trades||[]).filter(x=>x.thesisId==T.id&&x.k=='buy').sort((a,b)=>(a.dt||'')<(b.dt||'')?-1:1).forEach(x=>stLinkPlan(T,x));if(typeof asTagDef=='function')asTagDef(c);
 S.theses.push(T);stBuild();renderTrades();upd();toast(`已建立 ${T.id}${n?`，${n} 筆交易已歸入`:''}${T.useInit?'，含撥款前的期初持股':''}`,0);asStock(c,'a')};
function asStockHtml(c,ac){const r=asRows(S).find(o=>o.c==c&&o.ac==ac)||{c,ac,q:0,iq:0,cost:0,real:0,div:0,fee:0,open:false,px:num((S.px||{})[c]),pxd:(S.pxd||{})[c]||'',auto:!!(S.pxa||{})[c]};
 const T=ac=='a'?asThesisOf(S,c):null,st=T?stStrat(S,T.sid):null,ti=T?stTi(T.id):-1,p=T?stPerf(S,T):null,past=(S.theses||[]).filter(t=>t.status=='exit'&&cU(t.code)==c);
 let th='';
 if(ac=='a'&&T){const rv=(T.reviews||[]).slice(0,3);
  th=`<div class=asth><div><b>📌 ${T.id}</b>｜${st?esc(st.id+' '+st.name)+' v'+(T.sver||1):'未指定策略'}｜<span class="stS ${T.status}">${stStatusN(T.status)}</span>${p&&p.first?(p.base?'｜策略起算後 '+Math.round(p.days)+' 天':'｜持有 '+Math.round(p.days)+' 天'):''}</div>${(()=>{const v=typeof ckVerdict=='function'?ckVerdict(T):null;return v?`<div class="stv1 ${v.cls}">依 ${esc(st?st.id:'')}：${esc(v.t)}</div>`:''})()}
   ${asMetHtml(T,st)}
   ${typeof olHtml=='function'?olHtml(c):''}
   <label>為什麼買（補充一句）${stTxt(`theses.${ti}.why`,T.why,'一句話就好',2)}</label>
   <label>什麼情況代表我錯了${stTxt(`theses.${ti}.wrongIf`,T.wrongIf,'例如：月營收連 2 個月年減',2)}</label>
   <div class=g><label>停損價${inp(`theses.${ti}.stop`,T.stop,'o')}<span class=h id=asStopD></span></label><label>目標價（選填）${inp(`theses.${ti}.tgtPx`,T.tgtPx,'o')}</label></div>
   ${st?`<details><summary class=h>${esc(st.id)} 的規則</summary><div class=h style="white-space:pre-wrap;margin-top:4px">${st.screen?'選什麼：\n'+esc(st.screen)+'\n':''}${st.entry?'何時買：\n'+esc(st.entry)+'\n':''}${st.exit?'何時賣：\n'+esc(st.exit):''}</div></details>`:''}
   <div class=asbtn><button onclick="asRev('${T.id}','其他',1)">✅ 論點仍成立</button><button onclick="asRev('${T.id}','其他',0)">⚠️ 有疑慮</button><button onclick="asClose();setWs('st');stOpenTh('${T.id}')">完整論點 ›</button></div>
   ${rv.length?`<div class=h>最近檢查：${rv.map(v=>`${asD(v.date)} ${esc(v.kind)} ${+v.ok?'✅':'⚠️'}${v.note?' '+esc(v.note):''}`).join('｜')}</div>`:''}</div>`}
 else if(ac=='a'){const L=(S.strategies||[]).filter(s=>+s.on);th=`<div class=asth>這檔還沒有投資論點。選一個策略就會建立，原本的交易${r.iq?'和撥款前的期初持股':''}會一起歸入：<div class=chips>${L.map(s=>`<button onclick="asNewTh('${c}','${s.id}')">${esc(s.id+' '+s.name)}</button>`).join('')||'<span class=h>先到「🧭 策略」建立策略</span>'}</div></div>`}
 const tot=r.open&&r.un!=null?r.un+r.real+r.div:(!r.open?r.real+r.div:null);
 const tl=(S.trades||[]).map((x,i)=>({x,i})).filter(o=>cU(o.x.n)==c&&(o.x.ac=='a'?'a':'p')==ac).sort((a,b)=>(b.x.dt||'')>(a.x.dt||'')?1:(b.x.dt||'')<(a.x.dt||'')?-1:b.i-a.i);
 const ini=hasInit(S)?(S.init||[]).filter(z=>(z.ac=='a'?'a':'p')==ac&&cU(z.n)==c&&(+z.q||0)>0):[];
 return`<div class=ovh><button onclick="asClose()">✕</button><div><b>${esc(c)} ${esc(nameOf(c))}</b> <span class=h>${ac=='a'?'⚡ 主動':'🛡️ 被動'}</span></div></div>
 <div class=asl>現價 <input type=number step=any data-px="${esc(c)}" value="${r.px??''}" placeholder="現價" style="width:100px"> <span class=h>${r.px!=null?(r.auto?'自動 '+asD(r.pxd)+' 收盤':'手填 '+asD(r.pxd)):'尚未填'}</span>${r.open&&r.mv!=null?` <span class=h>｜${r.ac=='a'?'占主動 '+(()=>{const E2=stExposure(S);return E2.tot>0?((E2.by[c]||0)/E2.tot*100).toFixed(1):'—'})():'占被動 '+(()=>{const p=asSum(S,'p').mv;return p>0?(r.mv/p*100).toFixed(1):'—'})()}%｜占全部持股 ${(()=>{const t=asSum(S).mv;return t>0?(r.mv/t*100).toFixed(1):'—'})()}%</span>`:''}</div>
 ${th}
 <div class=ast>
  <div class=c><small>股數｜均價</small><b>${R(r.q)}</b><small>${r.avgB!=null?'均 '+r.avgB.toFixed(2):'—'}｜成本 ${R(r.cb||0)}</small></div>
  <div class=c><small>預估損益（跟 App 一樣）</small><b class="${asC(r.ub)}">${r.open&&r.ub!=null?asY(r.ub):'—'}</b><small>${asPct(r.ubp)}${r.est?'｜已扣賣出費用 '+R(r.est):''}</small></div>
  <div class=c><small>已實現｜股利</small><b class="${asC((r.realB||0)+r.div)}">${asY((r.realB||0)+r.div)}</b><small>已實現 ${asY(r.realB||0)}｜股利 ${R(r.div)}</small></div>
  ${asPostOn()&&asHasPost(r)?`<div class=c><small>撥款後損益</small><b class="${asC(tot)}">${asY(tot)}</b><small>${p&&p.ex!=null?'vs '+esc(bmC(S))+' '+(p.ex>=0?'+':'')+p.ex.toFixed(1)+' 個百分點':'從 '+esc(asD(S.dd))+' 起算'}</small></div>`:''}</div>
 ${r.noC0?`<div class=h>這檔是撥款前就有的持股，還沒填原始成本，成本暫用撥款日收盤價；到「💰 信貸 → 撥款前狀態」填券商 App 上的付出成本。</div>`:''}
 <div class=asbtn><button class=pri onclick="asTradeOpen({c:'${c}',ac:'${ac}',k:'buy'})">＋買進</button><button onclick="asTradeOpen({c:'${c}',ac:'${ac}',k:'sell'})">－賣出</button><button onclick="asTradeOpen({c:'${c}',ac:'${ac}',k:'div'})">💰 配息</button></div>
 <div class=sub>交易時間軸</div>
 ${tl.map(({x,i})=>{const m=tradeAmt(S,x),Tn=x.thesisId?stThesis(S,x.thesisId):null;return`<div class=astl><span>${esc(x.dt||'（未填日期）')}</span><span><b>${asKN(x.k)}</b> ${x.k=='div'?(x.dps?'每股 '+esc(x.dps)+' 元｜':'')+R(m.cash)+' 元':x.k=='sdiv'?R(num(x.q)||0)+' 股':R(num(x.q)||0)+' 股 @'+esc(x.px??'')}${x.rs?` <span class=rsc>${asRsN(x.rs)}</span>`:''}${Tn?` <span class="thc on">${Tn.id}</span>`:''}${x.src=='ai'?' <small title="從 AI 對話匯入">🤖</small>':''}${x.note?' <small class=h>'+esc(x.note)+'</small>':''}</span><button onclick="asTradeOpen({i:${i}})">✎</button></div>`}).join('')}
 ${ini.map(z=>`<div class=astl><span>${esc(S.dd)}</span><span><b>期初持股</b> ${R(+z.q)} 股 @${esc(z.px)} <small class=h>撥款前就有</small></span><span></span></div>`).join('')}
 ${!tl.length&&!ini.length?'<div class=h>還沒有交易。</div>':''}
 ${past.length?`<div class=sub>過去的論點</div>${past.map(t=>{const pp=stPerf(S,t);return`<div class=astl><span>${t.id}</span><span>${esc(t.exit.date||'')} 出場｜${esc((ST_EXIT.find(e=>e[0]==t.exit.reason)||['','未填原因'])[1])}｜報酬 ${asPct(pp.ret)}｜照規則：${t.exit.followed===''||t.exit.followed==null?'未填':+t.exit.followed?'是':'否'}</span><span></span></div>`}).join('')}`:''}`}

// ---------- 快速記交易（買進點策略自動建論點；賣出顯示當初理由；股數歸零自動出場）
window.asTradeOpen=o=>{o=o||{};if(o.i!=null){const x=S.trades[o.i];AT={i:o.i,k:x.k,dt:x.dt||TODAY,c:cU(x.n),ac:x.ac=='a'?'a':'p',q:x.q??'',px:x.px??'',dps:x.dps??'',pdt:x.pdt??'',rs:x.rs||'',note:x.note||'',sid:'',why:'',stop:'',stopEd:0,fol:'1',met:[],from:asCur}}
 else{const c=cU(o.c||''),h=c?holdings(S).find(z=>cU(z.n)==c&&(!o.ac||z.ac==o.ac)):null;AT={i:null,k:o.k||'buy',dt:o.dt||TODAY,c,ac:o.ac||(h?h.ac:(c?(/^00/.test(c)?'p':'a'):'a')),q:'',px:c?String(num((S.px||{})[c])??(typeof PXL!='undefined'&&PXL[c]?PXL[c].v:'')):'',dps:'',pdt:'',rs:'',note:'',sid:'',why:'',stop:'',stopEd:0,fol:'1',met:[],from:asCur}}
 asOvOpen(asTradeHtml());asTh();asPrev()};
const asAtIn=(f,t,ph,x)=>`<input ${t?'type='+t:''} ${t=='number'?'step=any':''} data-at="${f}" value="${esc(AT[f]??'')}" placeholder="${esc(ph||'')}" ${x||''}>`;
const asSeg=(f,opts)=>`<div class="seg sm">${opts.map(([k,l])=>`<button class="${AT[f]==k?'on':''}" onclick="asAtSet('${f}','${k}',1)">${l}</button>`).join('')}</div>`;
function asTradeHtml(){const a=AT;return`<div class=ovh><button onclick="asBack()">✕</button><b>${a.i!=null?'修改交易':'記一筆交易'}</b></div>
 ${asSeg('k',[['buy','買進'],['sell','賣出'],['div','配息']])}
 <div class=g><label>${a.k=='div'?'除息日':'日期'}${asAtIn('dt','date')}</label><label>代號${asAtIn('c','','例如 2330','autocomplete=off')}<span class=h id=atNm>${esc(nameOf(a.c))}</span></label></div>
 <div class=chips id=atSug></div>
 <label>部位${asSeg('ac',[['p','🛡️ 被動'],['a','⚡ 主動']])}</label>
 <div class=g>${a.k=='div'?`<label>每股配息(元)${asAtIn('dps','number')}</label><label>發放日${asAtIn('pdt','date')}</label>`:`<label>股數${asAtIn('q','number','股數')}</label><label>成交價(元)${asAtIn('px','number','成交價')}</label>`}</div>
 <div class=h id=atFee></div><div id=atTh></div>
 <label>備註（選填）${asAtIn('note','','')}</label>
 <div class=asbtn><button class=pri onclick="asTradeSave()">儲存</button><button onclick="asBack()">取消</button>${a.i!=null?`<button onclick="asTradeDel()">刪除這筆</button>`:''}</div>
 <div class=h>手續費與證交稅依信貸頁「稅費與手續費」自動計算；要改成成交回報的實際金額，到下方「📒 交易紀錄」按 ✎。</div>`}
window.asBack=()=>{const f=AT&&AT.from;AT=null;if(f)asStock(f.c,f.ac);else asClose()};
window.asAtSet=(f,v,re)=>{AT[f]=v;if(f=='k'){AT.rs=''}if(f=='sid'&&!AT.stopEd)AT.stop='';if(re&&(f=='k'||f=='ac')){const h=$('asOvB').scrollTop;$('asOvB').innerHTML=asTradeHtml();$('asOvB').scrollTop=h}asTh();asPrev()};
window.asAtPick=c=>{AT.c=c;const h=holdings(S).find(z=>cU(z.n)==c);AT.ac=h?h.ac:(/^00/.test(c)?'p':'a');if(!AT.px){const v=num((S.px||{})[c])??(typeof PXL!='undefined'&&PXL[c]?PXL[c].v:null);if(v!=null)AT.px=String(v)}$('asOvB').innerHTML=asTradeHtml();asTh();asPrev()};
document.addEventListener('input',e=>{const f=e.target.dataset&&e.target.dataset.at;if(!f||!AT)return;AT[f]=e.target.value;
 if(f=='c'){const v=e.target.value.trim(),V=v.toUpperCase();AT.c=V;$('atNm').innerText=nameOf(V);const el=$('atSug');if(el){const hits=[];if(v&&!STK[V]){const asc=/^[0-9A-Z]+$/.test(V);for(const c in STK){if(asc?c.startsWith(V):STK[c].includes(v)){hits.push(c);if(hits.length>=6)break}}}el.innerHTML=hits.map(c=>`<button onclick="asAtPick('${c}')">${c} ${esc(STK[c])}</button>`).join('')}asTh()}
 if(f=='stop')AT.stopEd=1;asPrev()});
// 論點相關區塊（依類型、部位、代號）
function asTh(){const el=$('atTh');if(!el||!AT)return;const a=AT,c=cU(a.c);if(a.ac!='a'||a.k=='div'||!c){el.innerHTML='';return}
 const x=a.i!=null?S.trades[a.i]:null,T=x&&x.thesisId?stThesis(S,x.thesisId):asThesisOf(S,c),st=T?stStrat(S,T.sid):null,chip=(f,k,l)=>`<button class="${String(a[f])==String(k)?'on':''}" onclick="asAtSet('${f}','${k}')">${l}</button>`;
 if(a.k=='buy'){if(T){el.innerHTML=`<div class=asth>歸入 <b>${T.id}</b>（${st?esc(st.id+' '+st.name):'未指定策略'}）<div class=chips>依據：${AS_RS.buy.filter(z=>z[0]!='new').map(([k,l])=>chip('rs',k,l)).join('')}</div><div class=h>當初為什麼買：${esc(T.why||'（還沒寫）')}｜停損 ${esc(T.stop||'—')}</div></div>`;return}
  const L0=(S.strategies||[]).filter(s=>+s.on),L=L0.filter(s=>!a.term||!s.term||s.term==a.term||s.id==a.sid);
  el.innerHTML=`<div class=asth>這檔還沒有論點，先選打算持有多久，再選一個策略就會自動建立：${L0.some(s=>s.term)?`<div class=chips>期別：${chip('term','','全部')}${ST_TERM.map(([k,l])=>chip('term',k,l)).join('')}</div>`:''}<div class=chips>${L.map(s=>chip('sid',s.id,esc(s.id+' '+s.name)+(s.term?' <span class=h>'+s.term+'</span>':''))).join('')}${chip('sid','','不歸類')}</div>${a.sid?asCondPick(stStrat(S,a.sid)):''}${a.sid?`<label>補充一句為什麼買（選填）${asAtIn('why','','例如：本益比回到區間下緣、營收連 3 月成長')}</label><label>停損價 <span class=h id=atStopH></span>${asAtIn('stop','number','')}</label><div class=h id=atSize></div>`:''}</div>`;return}
 // 賣出
 const p=T?stPerf(S,T):null;
 el.innerHTML=`<div class=asth>${T?`<b>當初的依據（${T.id}｜${st?esc(st.id+' '+st.name):'未指定策略'}）</b>
  <div>為什麼買：${esc(T.why||'（沒寫）')}</div><div>什麼情況代表我錯了：${esc(T.wrongIf||'（沒寫）')}</div>
  <div>停損 ${esc(T.stop||'—')}｜目標 ${esc(T.tgtPx||'—')}${p&&p.first?`｜${p.base?'策略起算後':'目前'} ${p.pl!=null?asY(p.pl)+'（'+asPct(p.ret)+'）':'需現價'}｜${p.base?'起算後':'持有'} ${Math.round(p.days)} 天`:''}</div>`:'<span class=h>這檔沒有進行中的論點。</span>'}
  <div class=chips>賣出依據：${AS_RS.sell.map(([k,l])=>chip('rs',k,l)).join('')}</div>
  ${T?`<div class=chips>有沒有照規則做：${chip('fol','1','是')}${chip('fol','0','否')}</div><div class=h id=atLeft></div>`:''}</div>`}
// 即時試算：手續費、建議股數、停損價、買進後占比
function asPrev(){if(!AT)return;const a=AT,c=cU(a.c),q=num(a.q),px=num(a.px),fe=$('atFee');
 if(fe){if(a.k=='div'){const sh=(sharesAt(S,a.dt||TODAY)[a.ac+'|'+c]||0),d=num(a.dps);fe.innerText=d!=null&&sh?`除息前持有 ${R(sh)} 股，約 ${R(d*sh)} 元`:''}
  else if(q&&px){const m=tradeAmt(S,{k:a.k,ac:a.ac,n:c,q,px,fee:'',tax:''});fe.innerText=`手續費 ${R(m.fee)} 元${a.k=='sell'?'｜證交稅 '+R(m.tax)+' 元':''}｜${a.k=='buy'?'付出':'收到'} ${R(Math.abs(m.cash))} 元`}else fe.innerText=''}
 const st=a.sid?stStrat(S,a.sid):null,sh=$('atStopH'),sz=$('atSize');
 if(st&&px){const sc=stStopCalc(st,c,px);if(sc&&!a.stopEd){a.stop=sc.v.toFixed(2);const el=document.querySelector('[data-at=stop]');if(el)el.value=a.stop}
  if(sh)sh.innerText=sc?`（${st.id} 預設：${sc.t}${sc.all.length>1?'，取比較近的':''}）`:'';const stp=num(a.stop),effPct=stp!=null&&stp<px?(1-stp/px)*100:num(st.stopPct),rr=stp!=null?stRR(c,px,stp):null;
  if(sz){const H=asSizeHint(S,px,effPct,st.riskPct),E=stExposure(S),add=(q||0)*px,w=E.tot+add>0?((E.by[c]||0)+add)/(E.tot+add)*100:0,cap=num(st.capStock)??stCapStock(S,c);
   sz.innerHTML=(rr?`賺賠比 <b class="${+st.rr&&rr.rr<2?'bad':''}">${rr.rr.toFixed(1)}</b>（目標＝近一年最高收盤 ${rr.tgt}，停損 ${stp}）${+st.rr&&rr.rr<2?' ⛔ 低於 2':''}<br>`:'')+(H?`建議最多 ${R(H.q)} 股（每筆最多虧 ${R(H.loss)} 元＝主動部位 ${W2(H.base)} 萬 × ${st.riskPct}%）<br>`:'')+(q?`買進後占主動部位 <b class="${w>cap?'wn':''}">${w.toFixed(1)}%</b>（上限 ${cap}%）${w>cap?' ⚠️ 超過上限':''}`:'')}}
 const lf=$('atLeft');if(lf&&a.k=='sell'){const h=holdings(S).find(z=>z.ac=='a'&&cU(z.n)==c),own=(h?h.q:0)+(a.i!=null&&S.trades[a.i].k=='sell'?num(S.trades[a.i].q)||0:0),left=own-(q||0);lf.innerText=q?(left<=0?'賣完後股數歸零，論點會自動標記為「已出場」。':`賣出後剩 ${R(left)} 股。`):''}}
window.asTradeSave=()=>{const a=AT,c=cU(a.c);if(!c){toast('請填代號',0);return}
 if(a.k!='div'&&(!(num(a.q)>0)||!(num(a.px)>0))){toast('請填股數與成交價',0);return}
 if(a.k=='div'&&num(a.dps)==null){toast('請填每股配息',0);return}
 const isNew=a.i==null,x=isNew?NEW.trades():S.trades[a.i];if(isNew)S.trades.push(x);
 Object.assign(x,{dt:a.dt||TODAY,ac:a.ac,k:a.k,n:c,note:a.note||'',rs:a.rs||''});if(a.k=='div'){x.dps=a.dps;x.pdt=a.pdt||'';x.q='';x.px=''}else{x.q=a.q;x.px=a.px}
 let msg=isNew?'已記錄':'已修改';
 if(a.ac=='a'&&a.k!='div'){let T=!isNew&&x.thesisId?stThesis(S,x.thesisId):asThesisOf(S,c);
  if(a.k=='buy'&&!T&&a.sid){const st=stStrat(S,a.sid);T=stNewThesis(S,{code:c,sid:a.sid,sver:st?st.ver:1,status:'hold',created:x.dt,why:a.why||'',stop:a.stop||'',met:(a.met||[]).slice(),metAt:x.dt});if(typeof ckEval=='function'&&CK){T.metNote=T.metNote||{};for(const t of T.met){const r=ckEval(c,t);if(r&&r.v===true)T.metNote[t]=`自動 ${ckMD(CK.d)}：${r.why}`}}stThDefaults(S,T,num(a.px));S.theses.push(T);if(typeof asTagDef=='function')asTagDef(c);if(!x.rs)x.rs='new';msg+=`，並建立論點 ${T.id}`}
  if(T){x.thesisId=T.id;if(T.status=='plan')T.status='hold';stLinkPlan(T,x);
   if(a.k=='sell'){const h=holdings(S).find(z=>z.ac=='a'&&cU(z.n)==c);if(!h||h.q<=0){T.status='exit';T.exit=Object.assign(T.exit||{},{date:x.dt,reason:AS_RS2EXIT[x.rs]||'other',followed:a.fol});msg+=`，${T.id} 已標記為已出場`}}}}
 else if(a.ac!='a')x.thesisId='';
 stBuild();renderTrades();upd();if(typeof pxApply=='function')pxApply();toast(msg,0);asStock(c,a.ac)};
window.asTradeDel=()=>{if(!confirm('刪除這筆交易？'))return;const x=S.trades[AT.i];S.trades.splice(AT.i,1);if(typeof trEd!='undefined')trEd.clear();renderTrades();upd();toast('已刪除',0);asStock(cU(x.n),x.ac=='a'?'a':'p')};

// 當初符合的策略條件（個股頁）
function asMetHtml(T,st){if(!st)return'';const E=stCondEval(st,T.met);if(!E.length)return'';const M=new Set(T.met||[]),P=new Set(T.pend||[]);
 if(!M.size&&!P.size)return`<div class=asck><div class=h>沒有當初勾選的條件紀錄（例如重新分類的舊持股），條件看下面的「📋 今日自動檢核」。</div>${asEvHtml(cU(T.code))}</div>${typeof ckCardHtml=='function'?ckCardHtml(T,st):''}`;
 return`<div class=asck>${(T.met||[]).length?'':'<div class=h>還沒勾選符合的條件（到「完整論點」可以補勾）。</div>'}${E.map(g=>`<div><b>${esc(g.sec)}</b> <span class="${g.ok?'ok':'wn'}">${g.n}／${g.tot}${g.need?'（需要 '+(g.need>=g.tot?'全部':g.need+' 項')+'）':''}${g.ok?' ✅':' ⚠️'}</span>${g.items.filter(t=>M.has(t)||P.has(t)).map(t=>`<div class=h>${M.has(t)?'✓':'❔ 待確認：'} ${typeof ckT=='function'?ckT(t):esc(t)}${(T.metNote||{})[t]?' <i>（'+esc(T.metNote[t])+'）</i>':''}</div>`).join('')}</div>`).join('')}${asEvHtml(cU(T.code))}</div>${typeof ckCardHtml=='function'?ckCardHtml(T,st):''}`}
// 這檔股票接下來的事件（除息、財報…）
function asEvHtml(c){const L=(S.events||[]).filter(e=>e.code==c&&!e.done).sort((a,b)=>a.date<b.date?-1:1);return L.length?`<div style="margin-top:4px"><b>📅 事件</b>${L.map(e=>`<div class=h>${esc(e.date)} ${esc(e.type)}${e.note?'：'+esc(e.note):''}${e.date<=TODAY?' <button onclick="evDone(\''+e.id+'\')">✓ 完成</button>':''}</div>`).join('')}</div>`:''}
// 快速記交易：勾選符合的策略條件（＝買進理由）
function asCondPick(st){if(!st)return'';const C=stConds(st);if(!C.length)return'<div class=h>這個策略的規則還沒寫成「一行一個條件」，到「🧭 策略 → 策略庫」整理後就能用勾選的。</div>';
 // 自動檢核：換策略或代號時，把今天自動判斷符合的條件先勾好（可以取消）
 const c=cU(AT.c),ckOn=typeof ckEval=='function',key=st.id+'|'+c+'|'+(ckOn&&CK?CK.d:'');AT.ck=AT.ck||{};
 if(ckOn&&CK&&AT._ck!=key){AT._ck=key;const auto=[];for(const g of C){if(g.need=='none')continue;for(const t of g.items){const r=ckEval(c,t,st);AT.ck[t]=r;if(r&&r.v===true)auto.push(t)}}AT.met=[...new Set((AT.met||[]).concat(auto))]}
 const NB=stNoBuy(st),nbR=NB.map(t=>({t,r:ckOn?ckEval(c,t,st):null})),nbHit=nbR.filter(o=>o.r&&o.r.v===true);
 const E=stCondEval(st,AT.met),M=new Set(AT.met||[]),bad=E.filter(g=>!g.ok);
 return`<div class=asck><div class=h>勾選現在符合的條件（會存成這次的買進理由）${ckOn&&CK?'；標「自動」的是用公開資料判斷的（'+esc(ckAsOf())+'），已先幫你勾好':''}：</div>${E.map((g,gi)=>`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class="${g.ok?'ok':'wn'}">${g.n}／${g.tot}${g.need?'（需要 '+(g.need>=g.tot?'全部':g.need+' 項')+'）':''}</span>${g.items.map((t,ix)=>`<label class=ck><input type=checkbox onchange="asAtMet(${gi},${ix},this.checked)" ${M.has(t)?'checked':''}><span>${typeof ckT=='function'?ckT(t):esc(t)}${ckOn?ckBadge(ckEval(c,t,st),1):''}</span></label>`).join('')}</div>`).join('')}${NB.length?`<div style="margin-top:4px"><b>⛔ 不買</b> <span class=h>任何一項成立就不買</span>${nbR.map(o=>`<div class=ckl>${o.r?(o.r.v===true?'<b class=bad>⛔ 成立</b>':o.r.v===false?'✓ 沒有':'❔'):'·'} ${typeof ckT=='function'?ckT(o.t):esc(o.t)}${o.r&&(o.r.why||o.r.miss)?`<div class=h>${esc(o.r.why)}${o.r.miss?' <i>'+esc(o.r.miss)+'</i>':''}</div>`:''}</div>`).join('')}</div>`:''}${nbHit.length?`<div class=bad style="margin-top:4px">⛔ 有「不買」條件成立：${nbHit.map(o=>esc(o.t.replace(/〔.〕/g,''))).join('、')}。仍可以儲存，但會記錄下來。</div>`:''}${bad.length?`<div class=wn style="margin-top:4px">⚠️ ${bad.map(g=>g.sec).join('、')}還沒達到策略的門檻。仍可以儲存，會記錄下來，之後檢討時看得到。</div>`:''}</div>`}
window.asAtMet=(gi,ix,on)=>{const st=stStrat(S,AT.sid),g=stCondEval(st,AT.met)[gi];if(!g)return;const t=g.items[ix];AT.met=(AT.met||[]).filter(x=>x!=t);if(on)AT.met.push(t);const h=$('asOvB').scrollTop;asTh();asPrev();$('asOvB').scrollTop=h};
