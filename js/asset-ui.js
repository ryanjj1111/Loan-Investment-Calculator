// 📊 資產首頁、個股頁、快速記交易（只在專業版顯示）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 ui.js（$、esc、R、W2、nameOf、toast、upd、save、calc、renderTrades、NEW）、strategy-ui.js（stWs、stTxt、stTi）與 asset-engine.js

let asG=ls('lcag')||'ac',asSo=ls('lcas')||'mv',asF=ls('lcaf')||'all',asCl=ls('lcac')=='1',AT=null,asCur=null;
const asPct=v=>v==null||isNaN(v)?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
const asM=v=>v==null||isNaN(v)?'—':(v>=0?'+':'−')+W2(Math.abs(v))+' 萬';
const asY=v=>v==null||isNaN(v)?'—':(v>=0?'+':'−')+R(Math.abs(v));
const asC=v=>v==null||isNaN(v)?'':v<0?'bad':'ok';
const asD=d=>d?String(d).slice(5).replace('-','/'):'';
const asKN=k=>({buy:'買進',sell:'賣出',div:'配息',sdiv:'配股'})[k]||k;

function asBuild(){if(!$('pgA'))return;const cdd=$('cardsD');if(cdd){cdd.open=isS()||ls('lccd')!='0';cdd.ontoggle=()=>{if(!isS())ls('lccd',cdd.open?'1':'0');asCardsSum()}}if(typeof pxApply=='function'&&typeof PXL!='undefined'&&Object.keys(PXL).length)setTimeout(pxApply,0);const sel=(v,f,L)=>`<select onchange="${f}(this.value)">${L.map(([k,l])=>`<option value="${k}" ${v==k?'selected':''}>${l}</option>`).join('')}</select>`;
 $('asGrp').innerHTML=`<label>分組 ${sel(asG,'asSetG',[['ac','部位'],['st','策略'],['tag','族群'],['no','不分組']])}</label><label>排序 ${sel(asSo,'asSetSo',[['mv','市值'],['pl','損益 %'],['w','占比'],['stop','離停損'],['v','判斷結果']])}</label>`;
 $('asFlt').innerHTML=[['all','全部'],['ok','✅ 可以買／加碼'],['bad','⛔ 不買'],['al','⚠️ 有提醒']].map(([k,l])=>`<button class="${asF==k?'on':''}" onclick="asSetF('${k}')">${l}</button>`).join('');$('asClosed').checked=asCl;asCalc()}
window.asSetG=k=>{asG=k;ls('lcag',k);asBuild()};window.asSetSo=k=>{asSo=k;ls('lcas',k);asBuild()};window.asSetF=k=>{asF=k;ls('lcaf',k);asBuild()};
window.asShowClosed=v=>{asCl=!!v;ls('lcac',v?'1':'0');asCalc()};

// ---------- 首頁
function asBmTxt(v){const bm=esc(bmC(S));if(v.bmDiff!=null&&v.bmVal){const p=v.bmDiff/v.bmVal*100;return`持股 ${W2(v.mv)} 萬，改買 ${bm} 會是 ${W2(v.bmVal)} 萬 → <b class="${asC(v.bmDiff)}">${v.bmDiff>=0?'多':'少'} ${W2(Math.abs(v.bmDiff))} 萬（${p>=0?'+':''}${p.toFixed(1)}%）</b>`}if(!v.inv)return'—';if(v.miss.length)return'<span class=h>需要全部現價</span>';if(v.bmMiss)return`<span class=wn>缺 ${v.bmMiss} 筆交易當天的 ${bm} 價格</span>`;return`<span class=wn>需要 ${bm} 現價</span>`}
// 信貸重點卡片收合時的一行摘要（每張卡片取標題與第一行數字）
const asFirstTxt=el=>{let t='';for(const n of el.childNodes){if(n.nodeType==3)t+=n.textContent;else if(/^(BR|SMALL|DIV)$/.test(n.nodeName))break;else t+=n.textContent}return t.trim()};
function asCardsSum(){const d=$('cardsD'),s=$('cardsS');if(!d||!s)return;if(isS()){d.open=true;return}const L=[...document.querySelectorAll('#cards > .c')].slice(0,3).map(c=>{const t=c.querySelector('small'),b=c.querySelector('b');return((t?t.firstChild&&t.firstChild.textContent||'':'')+' '+(b?asFirstTxt(b):'')).trim()}).filter(Boolean);s.innerHTML=`📋 信貸重點卡片${d.open?' <span class=h>（點這裡收合）</span>':` <span class=h>｜${esc(L.join('｜'))}｜點這裡展開</span>`}`}
// ---------- 收合：每一區的標題可以點，收合時顯示一行摘要；狀態記在這台裝置
let FOLD={};try{FOLD=JSON.parse(localStorage.getItem('lcfold')||'{}')||{}}catch(e){}
const asFolded=k=>!!FOLD[k];
function fold(k,title,sum,body){const c=asFolded(k);return`<div class=fh onclick="foldT('${k}')"><b>${c?'▸':'▾'} ${title}</b><span class=h>${c?sum||'':''}</span></div>${c?'':body}`}
window.foldT=k=>{FOLD[k]=FOLD[k]?0:1;try{localStorage.setItem('lcfold',JSON.stringify(FOLD))}catch(e){}if(k=='inv')asFoldInv();else asCalc()};
function asFoldInv(){const p=$('asInv');if(p){p.classList.toggle('fd',asFolded('inv'));const b=$('asInvT');if(b)b.textContent=(asFolded('inv')?'▸':'▾')+' 📦 庫存'}}
function asCalc(){asCardsSum();if(!$('pgA'))return;const sp=$('sPxNote');if(sp)sp.innerHTML='現價：'+(typeof pxStatus=='function'?pxStatus():'')+` <button class=lk onclick="setWs('as')">到資產頁看持股 ›</button>`;
 if(stWs()!='as')return;
 const z=asSum(S),all=asVsBm(S),act=asVsBm(S,'a'),bm=esc(bmC(S));let loan='💰 信貸：結算填了現金後顯示 A／C';
 try{const r=settle(S,curEff());if(r)loan=`💰 信貸：A <b class="${asC(r.af)}">${asM(r.af)}</b>｜C <b class="${asC(r.ao)}">${asM(r.ao)}</b>`}catch(e){}
 $('asTop').innerHTML=fold('top','📦 我的庫存',`總市值 ${W2(z.mv)} 萬｜預估損益 ${asM(z.ub)}`,`<div class=h>跟券商 App 一樣：用原始成本，預估損益已扣賣出手續費與證交稅</div><div class=ast>
  <div class=c><small>總市值</small><b>${W2(z.mv)} 萬</b><small>${z.miss.length?`<span class=wn>${z.miss.length} 檔沒有現價</span>`:'成本 '+W2(z.cb)+' 萬'}</small></div>
  <div class=c><small>預估損益</small><b class="${asC(z.ub)}">${asM(z.ub)}</b><small>${asPct(z.cb?z.ub/z.cb*100:null)}</small></div>
  <div class=c><small>已實現＋股利</small><b class="${asC(z.realB+z.div)}">${asM(z.realB+z.div)}</b><small>賣出損益與配息</small></div>
  <div class=c><small>總損益</small><b class="${asC(z.totB)}">${asM(z.totB)}</b><small>${z.noC0?`<span class=wn>${z.noC0} 檔沒填原始成本</span>`:'預估損益＋已實現＋股利'}</small></div></div>
  ${asPostOn()?`<div class=ash2 style="margin-top:10px">📅 撥款後績效 <span class=h>（${esc(asD(S.dd))} 起；撥款前持股以撥款日收盤價計，和信貸頁一致）</span> <button class=lk onclick="asPostSet(0)">隱藏</button></div>
  <div class=asl>撥款後損益 <b class="${asC(z.tot)}">${asM(z.tot)}</b>（${all.days<182.6?'期間報酬 '+asPct(all.ret):'年化 '+asPct(all.xr)}）</div>
  ${(()=>{const s=asPostSplit(S);return s.n1&&s.n0?`<div class=asl>其中：撥款後有買賣的 ${s.n1} 檔 <b class="${asC(s.v1)}">${asM(s.v1)}</b>｜撥款前持股（之後沒有再買賣）${s.n0} 檔 <b class="${asC(s.v0)}">${asM(s.v0)}</b>${s.miss?' <span class=h>（'+s.miss+' 檔需現價）</span>':''}</div>`:''})()}
  <div class=asl>和 ${bm} 比：如果撥款日的持股和之後每一筆買賣，都改成同一天、同金額買賣 ${bm}<div>・全部：${asBmTxt(all)}</div><div>・主動：${asBmTxt(act)}</div></div>
  <div class=asl>${loan} <button class=lk onclick="setWs('loan')">看信貸 ›</button></div>`:`<div class=asl style="margin-top:8px"><button class=lk onclick="asPostSet(1)">📅 顯示撥款後績效</button> <span class=h>（有用信貸投資時，看撥款日之後的損益和 vs ${bm}）</span></div>`}
  <div class=asl>現價：${pxStatus()} <button class=lk onclick="pxRefresh()">🔄 更新</button></div>`);
 const fx=$('asFix');if(fx)fx.innerHTML=typeof ckTodoHtml=='function'?ckTodoHtml():'';const A=stAlerts(S);$('asAl').innerHTML=A.length?`<div class=stal>${fold('al',`⚠️ 提醒（${A.length}）`,esc(A[0].t).slice(0,24)+'…',`${A.slice(0,4).map(asAlRow).join('')}${A.length>4?`<div><button onclick="setWs('st')">看全部 ${A.length} 則 ›</button></div>`:''}`)}</div>`:'';
 // 配置
 const CS=asCash(),cash=CS.v!=null?Math.max(0,CS.v*1e4):null,tot=z.p.mv+z.a.mv+(cash||0),seg=(v,c,l)=>tot>0&&v>0?`<span style="width:${v/tot*100}%;background:${c}" title="${l}"></span>`:'';
 const W=(+S.Wp||0)+(+S.Wa||0)+(+S.Wc||0),G=asGroups(S);
 $('asAlloc').innerHTML=tot>0?fold('alloc','🧩 配置',`被動 ${(z.p.mv/tot*100).toFixed(0)}%｜主動 ${(z.a.mv/tot*100).toFixed(0)}%${cash!=null?'｜現金 '+(cash/tot*100).toFixed(0)+'%':''}`,`<div class=asbar>${seg(z.p.mv,'#3b82f6','被動')}${seg(z.a.mv,'#f59e0b','主動')}${seg(cash,'#94a3b8','現金')}</div>
  <div class=asl><span class=dot style="background:#3b82f6"></span>被動 ${(z.p.mv/tot*100).toFixed(0)}%　<span class=dot style="background:#f59e0b"></span>主動 ${(z.a.mv/tot*100).toFixed(0)}%${cash!=null?`　<span class=dot style="background:#94a3b8"></span>現金 ${(cash/tot*100).toFixed(0)}%`:''}${W>0?`<br><span class=h>目標：被動 ${((+S.Wp||0)/W*100).toFixed(0)}%｜主動 ${((+S.Wa||0)/W*100).toFixed(0)}%｜現金 ${((+S.Wc||0)/W*100).toFixed(0)}%</span>`:''}</div>
  <div class=asl>帳戶現金 ${CS.v==null?'<span class=h>還沒填</span>':`現在約 <b>主動 ${CS.a.toFixed(1)} 萬｜被動 ${CS.p.toFixed(1)} 萬</b> <span class="${CS.old?'wn':'h'}">（上次填 ${esc(asD(CS.d))}：主動 ${(+CS.L.a).toFixed(1)}、被動 ${(+CS.L.p).toFixed(1)} 萬${CS.est?'；之後的買賣、配息已自動加減，買進在交易當天就先扣':''}${CS.old?'；超過 30 天沒更新':''}）</span>`}
   <div class=h style="margin-top:4px">更新餘額（照交割帳戶今天的餘額填）：主動 <input type=number step=any value="${S.cur&&S.cur.ca!=null?S.cur.ca:''}" placeholder="${CS.L&&CS.L.src=='snap'?CS.L.a:''}" onchange="asCashSet('ca',this.value)" style="width:76px"> 萬　被動 <input type=number step=any value="${S.cur&&S.cur.cp!=null?S.cur.cp:''}" placeholder="${CS.L&&CS.L.src=='snap'?CS.L.p:''}" onchange="asCashSet('cp',this.value)" style="width:76px"> 萬</div>
   ${CS.legacy?`<div class=wn>舊資料只有現金合計 ${CS.L.t} 萬，先全部算在主動帳戶；請分成主動、被動兩格各填一次。</div>`:''}<div class=h>和「💰 信貸 → 📋 結算」這一期的現金是同一組欄位；兩格合計就是信貸頁的「追蹤帳戶現金合計」。</div></div>
  ${G.length?`<div class=asl>族群（占主動）：${G.map(g=>`<span class="${g.p>g.cap?'wn':''}">${esc(g.g)} ${g.p.toFixed(0)}%${g.p>g.cap?'（上限 '+g.cap+'%）':''}</span>`).join('、')}</div>`:''}`):'';
 if($('asRisk')){const H=asHeatCap(S);$('asRisk').innerHTML=fold('risk','🛡️ 風險',H.tot!=null?`壓力虧損 ${W2(H.tot)}／剩 ${W2(H.cap)} 萬${H.over?' ⚠️':''}`:`主動停損合計 ${W2(H.R.tot)} 萬`,asRiskHtml())}
 asFoldInv();
 if($('asTrend'))asTrendDraw();
 // 庫存
 const E=stExposure(S),grp={},AL=typeof stAlerts=='function'?stAlerts(S):[];
 // 每檔的判斷結果、提醒、離停損（篩選與排序用）
 const L=asRows(S).filter(r=>r.open||(asCl&&(Math.abs(r.real)>0.5||r.div>0))).map(r=>{const T=r.ac=='a'?asThesisOf(S,r.c):null,v=T&&typeof ckVerdict=='function'?ckVerdict(T):null,sp=T?num(T.stop):null;
  r.vd=v;r.al=T?AL.filter(a=>a.th==T.id).length:0;r.sd=sp!=null&&r.px?(sp/r.px-1)*100:null;r.w=r.ac=='a'?(E.tot>0&&E.by[r.c]?E.by[r.c]/E.tot*100:null):(r.mv!=null&&z.p.mv>0?r.mv/z.p.mv*100:null);return r})
  .filter(r=>asF=='all'||(asF=='ok'?r.vd&&r.vd.cls=='ok':asF=='bad'?r.vd&&r.vd.cls=='bad':r.al>0||(r.sd!=null&&r.sd>=0)));
 const VR={ok:0,wn:1,h:2,bad:3};
 const so=(a,b)=>asSo=='pl'?(b.ubp??-1e9)-(a.ubp??-1e9):asSo=='w'?(b.w??-1)-(a.w??-1):asSo=='stop'?(b.sd??-1e9)-(a.sd??-1e9):asSo=='v'?((a.vd?VR[a.vd.cls]??2:9)-(b.vd?VR[b.vd.cls]??2:9))||(b.mv||0)-(a.mv||0):(b.mv||0)-(a.mv||0);
 for(const r of L){const T=r.ac=='a'?asThesisOf(S,r.c):null;let k,l;
  if(asG=='st'){if(r.ac=='p'){k='~p';l='🛡️ 被動（依配置）'}else if(T&&stStrat(S,T.sid)){const st=stStrat(S,T.sid);k=st.id;l='🧭 '+st.id+' '+st.name}else{k='~u';l='⚡ 主動・未分類'}}
  else if(asG=='tag'){if(r.ac=='p'){k='~p';l='🛡️ 被動'}else{const G=stGrpOf(S,r.c),t=G[0];r.also=G.slice(1);k=t=='未分類'?'~u':'t'+t;l=t=='未分類'?'⚡ 主動・未分類':'🏷️ '+t}}
  else if(asG=='no'){k='0';l='全部持股'}
  else{k=r.ac=='p'?'1':'2';l=r.ac=='p'?'🛡️ 被動':'⚡ 主動'}
  (grp[k]=grp[k]||{l,L:[]}).L.push(r)}
 $('asList').innerHTML=Object.keys(grp).sort().map(k=>{const g=grp[k],mv=g.L.reduce((a,r)=>a+(r.mv||0),0),un=g.L.reduce((a,r)=>a+(r.ub||0),0);g.L.sort(so);
  const act=g.L.every(r=>r.ac=='a'),gp=act&&k!='2'&&k!='0'&&E.tot>0?mv/E.tot*100:null;
  return`<div class=asgh><span>${esc(g.l)}${gp!=null?' <small class=h>占主動 '+gp.toFixed(0)+'%</small>':''}</span><span>${W2(mv)} 萬　<span class="${asC(un)}">${asY(un)}</span></span></div>${g.L.map(r=>asRow(r,z.p.mv,E)).join('')}`}).join('')||(asF!='all'?'<div class=h style="margin:8px 0">沒有符合這個篩選的持股。</div>':'')||'<div class=h style="margin:8px 0">還沒有持股。按「＋記交易」記下第一筆，或在信貸頁的「撥款前狀態」填期初持股。</div>';
 if(asCur&&$('asStopD')){const T=asThesisOf(S,asCur.c),px=num((S.px||{})[asCur.c]),st=T?num(T.stop):null;$('asStopD').innerText=px&&st?`現價距離停損 ${((st/px-1)*100).toFixed(1)}%`:''}}
// 帳戶現金（萬）：這一期結算填的；還沒填就沿用最近一次儲存的結算
function asCash(){const L=typeof cashLast=='function'?cashLast(S):null,N=cashAt(S);if(!L)return{v:null,cur:null,d:'',old:false};
 return{v:N.t/1e4,a:N.a/1e4,p:N.p/1e4,est:N.est,legacy:L.old,cur:L.src=='cur'?L.t:null,d:L.d,old:dDays(L.d,TODAY)>30,L}}
window.asCashSet=(k,v)=>{S.cur=S.cur||{};S.cur[k]=String(v).trim()===''?'':+v;cashSync();S.cashD=TODAY;document.querySelectorAll('[data-p="cur.'+k+'"]').forEach(e=>e.value=S.cur[k]);upd()};
// 在結算頁改現金時，也記下填的日期
document.addEventListener('input',e=>{if(e.target.dataset&&/^cur\.(c|ca|cp)$/.test(e.target.dataset.p||''))S.cashD=TODAY});
function asAlRow(a){let b='';if(a.k=='dup'){b=` <button onclick="asMergeOpen('${a.c}')">合併…</button>`}else if(a.k=='adj'){b=` <button onclick="stAdjApply('${a.th}')">換算</button><button onclick="stAdjSkip('${a.th}')">不用</button>`}else if(a.k=='ev'){b=(a.et=='除息'?` <button onclick="evDiv('${a.ev}')">記配息</button>`:'')+` <button onclick="evDone('${a.ev}')">✓ 完成</button>`}else if(a.k=='exit'){b=` <button onclick="asStockTh('${a.th}')">查看</button><button onclick="exDecide('${a.th}','${a.key}','sell')">照規則賣出</button><button onclick="exDecide('${a.th}','${a.key}','na')">不適用</button><button onclick="exDecide('${a.th}','${a.key}','skip')">不照做</button><button onclick="aiOpen({q:'exit',th:'${a.th}',rule:'${a.key}'})" title="問 AI">🤖</button>`}else if(a.k=='pend'){b=` <button onclick="asClose();setWs('st');stOpenTh('${a.th}')">確認</button>`}else if(a.k=='exr'){b=` <button onclick="asClose();setWs('st');stOpenTh('${a.th}')">補填</button>`}else if(a.th&&(a.k=='rev'||a.k=='fin')){const kd=a.k=='rev'?'營收':'財報';b=` <button onclick="asRev('${a.th}','${kd}',1)">✅ 仍成立</button><button onclick="asRev('${a.th}','${kd}',0)">⚠️ 有疑慮</button>`}else if(a.th)b=` <button onclick="asStockTh('${a.th}')">查看</button>`;return`<div class="${a.lv||''}">· ${esc(a.t)}${b}</div>`}
function asRow(r,tot,E){const T=r.ac=='a'?asThesisOf(S,r.c):null,st=T?stStrat(S,T.sid):null,fl=[];
 if(T&&num(T.stop)!=null&&r.px!=null&&r.px<=num(T.stop))fl.push('🔻 跌破停損 '+T.stop);
 if(T&&num(T.tgtPx)!=null&&r.px!=null&&r.px>=num(T.tgtPx))fl.push('🎯 達到目標價 '+T.tgtPx);
 if(r.ac=='a'&&r.open&&E.tot>0){const p=(E.by[r.c]||0)/E.tot*100,cap=stCapStock(S,r.c);if(p>cap)fl.push(`⚠️ 占主動 ${p.toFixed(1)}%，超過上限 ${cap}%`)}
 const w=r.ac=='a'?(E.tot>0&&E.by[r.c]?E.by[r.c]/E.tot*100:null):(r.mv!=null&&tot>0?r.mv/tot*100:null),wl=r.ac=='a'?'占主動':'占被動';
 return`<div class=asr onclick="asStock('${r.c}','${r.ac}')"><div class=a1><span><b>${esc(r.c)}</b> ${esc(nameOf(r.c))}${T?` <span class="thc on">${T.id}${st?'·'+st.id:''}</span>`:r.ac=='a'&&r.open?' <span class=thc>未分類</span>':''}${asG=='tag'&&r.also&&r.also.length?` <small class=h>也算在 ${esc(r.also.join('、'))}</small>`:''}${r.vd&&(r.vd.cls=='ok'||r.vd.cls=='bad')?` <small class="${r.vd.cls=='ok'?'ok':'bad'}">${r.vd.cls=='ok'?'✅ 可'+(T&&T.status=='plan'?'買':'加碼'):'⛔ 不買'}</small>`:''}</span><span class="${asC(r.open?r.ub:r.realB+r.div)}">${r.open?(r.ub!=null?asY(r.ub)+' <small>'+asPct(r.ubp)+'</small>':'<small class=wn>需現價</small>'):'已出清 '+asY(r.realB+r.div)}</span></div>
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
// ---------- 合併同一檔的論點（2026-11-12）：讓使用者選留哪一個，列出會留下／搬過去／丟掉的東西；合併前自動存還原點
window.asMergeOpen=(c,keep)=>{const g=stDups(S).find(g=>g.c==cU(c));if(!g){toast('這檔只有一個論點，不用合併',0);return}keep=keep||g.L[0].id;
 const D=g.L.filter(T=>T.id!=keep),Pl=D.map(T=>stMergePlan(S,keep,T.id)).filter(Boolean),li=a=>a.length?'<ul>'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<div class=h>（沒有）</div>';
 asOvOpen(`<div class=ovh><button onclick="asStock('${esc(g.c)}','a')">✕</button><div><b>合併 ${esc(g.c)} ${esc(nameOf(g.c))} 的論點</b></div></div>
 <div class=h>同一檔同時間只能有一個論點。選要留下的那一個，其他的交易、出場決定紀錄、檢查紀錄會搬過去，然後刪掉。合併前會自動存還原點（「🤖 AI 討論 → 📥 貼上回覆 → 還原點」可以復原）。</div>
 <div class=chips>${g.L.map(T=>`<label class=ck><input type=radio name=mgk ${T.id==keep?'checked':''} onchange="asMergeOpen('${esc(g.c)}','${T.id}')"><span>留 ${T.id}（${esc(T.sid||'未指定')}，${stBk(T)?'補記，':''}停損 ${esc(T.stop||'—')}，${esc(asD(T.created||''))} 建立）</span></label>`).join('')}</div>
 ${Pl.map(P=>`<div class=asth><b>${P.D.id} 併入 ${P.K.id}</b><div class=sub>會留下（${P.K.id}）</div>${li(P.keep)}<div class=sub>會搬過去</div>${li(P.move)}<div class=sub>會丟掉</div>${li(P.lose)}</div>`).join('')}
 <div class=asbtn><button class=pri onclick="asMergeGo('${esc(g.c)}','${keep}')">確定合併</button><button onclick="asStock('${esc(g.c)}','a')">取消</button></div>`)};
window.asMergeGo=async(c,keep)=>{const g=stDups(S).find(g=>g.c==cU(c));if(!g)return;try{if(typeof rpSave=='function')await rpSave(`合併 ${c} 的論點前`)}catch(e){}
 const D=g.L.filter(T=>T.id!=keep).map(T=>T.id);for(const id of D)stMerge(S,keep,id);stBuild();renderTrades();upd();toast(`已把 ${D.join('、')} 併入 ${keep}（合併前已存還原點）`,0);asStock(cU(c),'a')};
// ---------- 轉換論點（換策略）：舊論點以「轉換」結案（不產生交易），新論點用當天收盤當起算價
window.asConvOpen=(id,sid)=>{const O=stThesis(S,id);if(!O)return;const c=cU(O.code),px=num((S.px||{})[c]),pd=(S.pxd||{})[c]||'',L=(S.strategies||[]).filter(s=>+s.on&&s.id!=O.sid),p=stPerf(S,O);
 const ck=sid&&typeof stConds=='function'?(()=>{const st=stStrat(S,sid),g=stConds(st).find(g=>/選什麼/.test(g.sec));if(!g||typeof ckEval!='function')return'';const r=g.items.map(t=>{const v=ckEval(c,t,st);return`<li>${v?(v.v===true?'✅':v.v===false?'❌':'⏳'):'❔'} ${esc(t)}</li>`}).join('');return`<div class=sub>${esc(sid)}【選什麼】今天的自動檢核</div><ul>${r}</ul><div class=h>改歸類的紀律：描述公司本身的條件（屬性、成長、獲利、財務）今天要通過；估值與價格位置可以不看。從今天起完整接受 ${esc(sid)} 的出場規則。</div>`})():'';
 asOvOpen(`<div class=ovh><button onclick="asStock('${c}','a')">✕</button><div><b>🔁 ${esc(O.id)} ${esc(c)} ${esc(nameOf(c))} 換策略</b></div></div>
 <div class=h>${esc(O.id)}（${esc(O.sid||'未指定')}）以「轉換」結案：不產生交易，用 ${px!=null?esc(asD(pd))+' 收盤 '+f2(px):'現價'} 結算績效。新論點承接 ${R(p.q)} 股，用同一個價格當起算價，停損依新策略重算。${stBk(O)?'舊論點是補記，新論點也算補記（不算策略績效）。':''}放寬的改歸類（新策略停損比較寬）只適用之後的新部位；大盤從高點回檔 10% 以上時不建議。</div>
 <div class=chips>${L.map(s=>`<button class="${s.id==sid?'pri':''}" onclick="asConvOpen('${O.id}','${s.id}')">${esc(s.id+' '+s.name)}</button>`).join('')}</div>${ck}
 ${sid&&px!=null?`<div class=asbtn><button class=pri onclick="asConvGo('${O.id}','${sid}')">轉換到 ${esc(sid)}</button><button onclick="asStock('${c}','a')">取消</button></div>`:px==null?'<div class=wn>還沒有現價，不能轉換</div>':''}`)};
window.asConvGo=async(id,sid)=>{const O=stThesis(S,id);if(!O)return;const c=cU(O.code),px=num((S.px||{})[c]);try{if(typeof rpSave=='function')await rpSave(`${id} 轉換前`)}catch(e){}
 const N=stConvert(S,id,sid,px,TODAY);if(!N){toast('轉換失敗：沒有持股或沒有現價',1);return}stBuild();renderTrades();upd();toast(`${id} 已轉換結案，新論點 ${N.id}（${sid}），起算價 ${px}`,0);asStock(c,'a')};
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
  th=`<div class=asth><div><b>📌 ${T.id}</b>｜${st?esc(st.id+' '+st.name)+' v'+(T.sver||1):'未指定策略'}｜<span class="stS ${T.status}">${stStatusN(T.status)}</span>${stBk(T)?`｜<span class=h>補記${stBkPost(S,T)?`（含撥款後加碼 ${stBkPost(S,T)} 筆）`:''}，不算策略績效</span>`:''}${T.convFrom?`｜<span class=h>由 ${esc(T.convFrom.id)} 轉換（${esc(asD(T.convFrom.d))} 起算 ${f2(T.convFrom.px)}）</span>`:''}${p&&p.first?(p.base?'｜策略起算後 '+Math.round(p.days)+' 天':'｜持有 '+Math.round(p.days)+' 天'):''}</div>${(()=>{const v=typeof ckVerdict=='function'?ckVerdict(T):null;return v?`<div class="stv1 ${v.cls}">依 ${esc(st?st.id:'')}：${esc(v.t)}</div>`:''})()}
   ${asMetHtml(T,st)}
   ${typeof olHtml=='function'?olHtml(c):''}
   <label>為什麼買（補充一句）${stTxt(`theses.${ti}.why`,T.why,'一句話就好',2)}</label>
   <label>什麼情況代表我錯了${stTxt(`theses.${ti}.wrongIf`,T.wrongIf,'例如：月營收連 2 個月年減',2)}</label>
   <div class=g><label>停損價${inp(`theses.${ti}.stop`,T.stop,'o')}<span class=h id=asStopD></span></label><label>目標價（選填）${inp(`theses.${ti}.tgtPx`,T.tgtPx,'o')}</label></div>
   ${st?`<details><summary class=h>${esc(st.id)} 的規則</summary><div class=h style="white-space:pre-wrap;margin-top:4px">${st.screen?'選什麼：\n'+esc(st.screen)+'\n':''}${st.entry?'何時買：\n'+esc(st.entry)+'\n':''}${st.exit?'何時賣：\n'+esc(st.exit):''}</div></details>`:''}
   <div class=asbtn><button onclick="asRev('${T.id}','其他',1)">✅ 論點仍成立</button><button onclick="asRev('${T.id}','其他',0)">⚠️ 有疑慮</button><button onclick="asClose();setWs('st');stOpenTh('${T.id}')">完整論點 ›</button>${T.status=='hold'?`<button onclick="asConvOpen('${T.id}')">🔁 換策略</button>`:''}</div>
   ${rv.length?`<div class=h>最近檢查：${rv.map(v=>`${asD(v.date)} ${esc(v.kind)} ${+v.ok?'✅':'⚠️'}${v.note?' '+esc(v.note):''}`).join('｜')}</div>`:''}</div>`}
 else if(ac=='a'){const L=(S.strategies||[]).filter(s=>+s.on);th=`<div class=asth>這檔還沒有投資論點。選一個策略就會建立，原本的交易${r.iq?'和撥款前的期初持股':''}會一起歸入：<div class=chips>${L.map(s=>`<button onclick="asNewTh('${c}','${s.id}')">${esc(s.id+' '+s.name)}</button>`).join('')||'<span class=h>先到「🧭 策略」建立策略</span>'}</div></div>`}
 const tot=r.open&&r.un!=null?r.un+r.real+r.div:(!r.open?r.real+r.div:null);
 const tl=(S.trades||[]).map((x,i)=>({x,i})).filter(o=>cU(o.x.n)==c&&(o.x.ac=='a'?'a':'p')==ac).sort((a,b)=>(b.x.dt||'')>(a.x.dt||'')?1:(b.x.dt||'')<(a.x.dt||'')?-1:b.i-a.i);
 const ini=hasInit(S)?(S.init||[]).filter(z=>(z.ac=='a'?'a':'p')==ac&&cU(z.n)==c&&(+z.q||0)>0):[];
 return`<div class=ovh><button onclick="asClose()">✕</button><div><b>${esc(c)} ${esc(nameOf(c))}</b> <span class=h>${ac=='a'?'⚡ 主動':'🛡️ 被動'}</span></div>${ac=='a'?`<button class=aiq onclick="aiOpen({q:${(()=>{try{const T0=asThesisOf(S,c);return T0&&exEval(T0).some(x=>x.r&&x.r.v===true&&!exAckOf(T0,x.key))?"'exit'":"'buy'"}catch(e){return"'buy'"}})()},codes:['${esc(c)}']})">🤖 問 AI</button>`:''}</div>
 <div class=asl>現價 <input type=number step=any data-px="${esc(c)}" value="${r.px??''}" placeholder="現價" style="width:100px"> <span class=h>${r.px!=null?(r.auto?'自動 '+asD(r.pxd)+' 收盤':'手填 '+asD(r.pxd)):'尚未填'}</span>${r.open&&r.mv!=null?` <span class=h>｜${r.ac=='a'?'占主動 '+(()=>{const E2=stExposure(S);return E2.tot>0?((E2.by[c]||0)/E2.tot*100).toFixed(1):'—'})():'占被動 '+(()=>{const p=asSum(S,'p').mv;return p>0?(r.mv/p*100).toFixed(1):'—'})()}%｜占全部持股 ${(()=>{const t=asSum(S).mv;return t>0?(r.mv/t*100).toFixed(1):'—'})()}%</span>`:''}</div>
 ${(()=>{const g=ac=='a'?stDups(S).find(g=>g.c==cU(c)):null;return g?`<div class="asal bad">⚠️ 這檔有 ${g.L.length} 個沒出場的論點：${g.L.map(T=>`${T.id}（${esc(T.sid||'未指定')}，${stBk(T)?'補記，':''}停損 ${esc(T.stop||'—')}）`).join('、')}。同一檔同時間只能有一個。 <button onclick="asMergeOpen('${esc(cU(c))}')">合併…</button></div>`:''})()}
 ${th}
 <div class=ast>
  <div class=c><small>股數｜均價</small><b>${R(r.q)}</b><small>${r.avgB!=null?'均 '+r.avgB.toFixed(2):'—'}｜成本 ${R(r.cb||0)}</small></div>
  <div class=c><small>預估損益（跟 App 一樣）</small><b class="${asC(r.ub)}">${r.open&&r.ub!=null?asY(r.ub):'—'}</b><small>${asPct(r.ubp)}${r.est?'｜已扣賣出費用 '+R(r.est):''}</small></div>
  <div class=c><small>已實現｜股利</small><b class="${asC((r.realB||0)+r.div)}">${asY((r.realB||0)+r.div)}</b><small>已實現 ${asY(r.realB||0)}｜股利 ${R(r.div)}</small></div>
  ${asPostOn()&&asHasPost(r)?(()=>{const z=r.iq>0?asPostSplit2(S,c,ac):null,sp=z&&z.tot!=null&&tot!=null&&Math.abs(z.tot-tot)<1&&z.p.q>0;
   return`<div class="c${sp?' aspc':''}"${sp?` onclick="this.classList.toggle('on')"`:''}><small>撥款後損益${sp?' <span class=aspa>▸</span>':''}</small><b class="${asC(tot)}">${asY(tot)}</b><small>${p&&p.ex!=null?'vs '+esc(bmC(S))+' '+(p.ex>=0?'+':'')+p.ex.toFixed(1)+' 個百分點':'從 '+esc(asD(S.dd))+' 起算'}</small>${sp?`<div class=aspd><div>撥款前持股 ${R(z.i.q)} 股（從 ${esc(asD(S.dd))} 收盤${z.i.px!=null?' '+f2(z.i.px):''}）<b class="${asC(z.i.pl)}">${asY(z.i.pl)}</b></div><div>撥款後買進 ${R(Math.round(z.p.q))} 股（從成交價）<b class="${asC(z.p.pl)}">${asY(z.p.pl)}</b></div></div>`:''}</div>`})():''}</div>
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
 <div class=g><label>${a.k=='div'?'除息日':'日期'}${asAtIn('dt','date')}</label><label>代號${asAtIn('c','','例如 2330','autocomplete=off')}<span class=h id=atNm>${asNmHtml()}</span></label></div>
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
// 有效代號（2026-11-11）：今天的全市場收盤檔、檢核資料或自己的持股裡有的才算；內建名單是手動更新的，不拿來判斷
const asCodeOk=c=>{c=cU(c);return!!c&&(!!(typeof PXL!='undefined'&&PXL[c])||!!(CK&&CK.s&&CK.s[c])||holdings(S).some(o=>cU(o.n)==c))};
function asNmHtml(){const c=cU(AT&&AT.c);if(!c)return'';if(asCodeOk(c)||AT.cOk)return esc(nameOf(c))+(AT.cOk&&!asCodeOk(c)?' <span class=wn>（不在今天的全市場收盤檔，照你填的用）</span>':'');
 return`<span class=wn>找不到代號「${esc(c)}」：請從下面的建議選一檔</span> <button class=lk onclick="AT.cOk=1;$('atNm').innerHTML=asNmHtml();asTh();asPrev()">仍要使用</button>`}
document.addEventListener('input',e=>{const f=e.target.dataset&&e.target.dataset.at;if(!f||!AT)return;AT[f]=e.target.value;
 if(f=='c'){const v=e.target.value.trim(),V=v.toUpperCase();AT.c=V;AT.cOk=0;$('atNm').innerHTML=asNmHtml();const el=$('atSug');if(el){const hits=[];if(v&&!STK[V]){const asc=/^[0-9A-Z]+$/.test(V);for(const c in STK){if(asc?c.startsWith(V):STK[c].includes(v)){hits.push(c);if(hits.length>=6)break}}}el.innerHTML=hits.map(c=>`<button onclick="asAtPick('${c}')">${c} ${esc(STK[c])}</button>`).join('')}asTh()}
 if(f=='stop')AT.stopEd=1;asPrev()});
// 記交易建新論點時選所屬主題（族群上限用主題算）
function asThemeL(){const s=new Set(Object.keys(S.themes||{}));for(const c in S.attr||{}){const t=(S.attr[c]||{}).theme;if(t)s.add(t)}return[...s].sort()}
function asThemeSel(c){const cur=AT.theme??(((S.attr||{})[c]||{}).theme||''),ind=typeof indOf=='function'?indOf(c):'',L=asThemeL();if(cur&&!L.includes(cur))L.push(cur);
 return`<label>所屬主題 <span class=h>（族群上限用主題算）</span><select onchange="if(this.value=='__new'){const v=(prompt('新的主題名稱（例如 AI 伺服器）')||'').trim();if(!v){this.value=AT.theme||'';return}AT.theme=v;asTh();asPrev();return}AT.theme=this.value;asPrev()"><option value="" ${!cur?'selected':''}>（不設，用產業別${ind?'：'+esc(ind):''}）</option>${L.map(t=>`<option ${t==cur?'selected':''}>${esc(t)}</option>`).join('')}<option value="__new">＋ 新增主題…</option></select></label>`}
// 論點相關區塊（依類型、部位、代號）
function asTh(){const el=$('atTh');if(!el||!AT)return;const a=AT,c=cU(a.c);if(a.ac!='a'||a.k=='div'||!c){el.innerHTML='';return}
 if(a.i==null&&!asCodeOk(c)&&!a.cOk){el.innerHTML='<div class=asth><span class=h>先選一個有效的代號，才會找對應的論點和策略條件。</span></div>';return}
 const x=a.i!=null?S.trades[a.i]:null,T=x&&x.thesisId?stThesis(S,x.thesisId):asThesisOf(S,c),st=T?stStrat(S,T.sid):null,chip=(f,k,l)=>`<button class="${String(a[f])==String(k)?'on':''}" onclick="asAtSet('${f}','${k}')">${l}</button>`;
 if(a.k=='buy'){if(T){el.innerHTML=`<div class=asth>歸入 <b>${T.id}</b>（${st?esc(st.id+' '+st.name):'未指定策略'}）<div class=chips>依據：${AS_RS.buy.filter(z=>z[0]!='new').map(([k,l])=>chip('rs',k,l)).join('')}</div><div class=h>當初為什麼買：${esc(T.why||'（還沒寫）')}｜停損 ${esc(T.stop||'—')}</div></div>`;return}
  const L0=(S.strategies||[]).filter(s=>+s.on),L=L0.filter(s=>!a.term||!s.term||s.term==a.term||s.id==a.sid);
  el.innerHTML=`<div class=asth>這檔還沒有論點，先選打算持有多久，再選一個策略就會自動建立：${L0.some(s=>s.term)?`<div class=chips>期別：${chip('term','','全部')}${ST_TERM.map(([k,l])=>chip('term',k,l)).join('')}</div>`:''}<div class=chips>${L.map(s=>chip('sid',s.id,esc(s.id+' '+s.name)+(s.term?' <span class=h>'+s.term+'</span>':''))).join('')}${chip('sid','','不歸類')}</div>${a.sid?asCondPick(stStrat(S,a.sid)):''}${a.sid?`${asThemeSel(c)}<label>補充一句為什麼買（選填）${asAtIn('why','','例如：本益比回到區間下緣、營收連 3 月成長')}</label><label>停損價 <span class=h id=atStopH></span>${asAtIn('stop','number','')}</label><div class=h id=atSize></div>`:''}</div>`;return}
 // 賣出
 const p=T?stPerf(S,T):null;
 el.innerHTML=`<div class=asth>${T?`<b>當初的依據（${T.id}｜${st?esc(st.id+' '+st.name):'未指定策略'}）</b>
  <div>為什麼買：${esc(T.why||'（沒寫）')}</div><div>什麼情況代表我錯了：${esc(T.wrongIf||'（沒寫）')}</div>
  <div>停損 ${esc(T.stop||'—')}｜目標 ${esc(T.tgtPx||'—')}${p&&p.first?`｜${p.base?'策略起算後':'目前'} ${p.pl!=null?asY(p.pl)+'（'+asPct(p.ret)+'）':'需現價'}｜${p.base?'起算後':'持有'} ${Math.round(p.days)} 天`:''}</div>`:'<span class=h>這檔沒有進行中的論點。</span>'}
  <div class=chips>賣出依據：${AS_RS.sell.map(([k,l])=>chip('rs',k,l)).join('')}</div>
  ${T?`<div class=chips>有沒有照規則做：${chip('fol','1','是')}${chip('fol','0','否')}</div><div class=h id=atLeft></div>`:''}</div>`}
// 即時試算：手續費、建議股數、停損價、買進後占比
// 成交價超過前一日收盤 ±10%（漲跌停）時警告：多半是價格打錯（2026-11-11）
function asLimitWarn(c,px,dt){const o=typeof PXL!='undefined'?PXL[cU(c)]:null;if(!o||!(o.v>0)||!(o.d<dt))return'';const d=(px/o.v-1)*100;
 return Math.abs(d)>10.05?`<div class=bad>⚠️ 成交價比前一日（${esc(asD(o.d))}）收盤 ${o.v} ${d>0?'高':'低'} ${Math.abs(d).toFixed(1)}%，超過漲跌停 10%：請確認價格</div>`:''}
function asPrev(){if(!AT)return;const a=AT,c=cU(a.c),q=num(a.q),px=num(a.px),fe=$('atFee');
 if(fe){if(a.k=='div'){const sh=(sharesAt(S,a.dt||TODAY)[a.ac+'|'+c]||0),d=num(a.dps);fe.innerText=d!=null&&sh?`除息前持有 ${R(sh)} 股，約 ${R(d*sh)} 元`:''}
  else if(q&&px){const m=tradeAmt(S,{k:a.k,ac:a.ac,n:c,q,px,fee:'',tax:''});fe.innerHTML=`手續費 ${R(m.fee)} 元${a.k=='sell'?'｜證交稅 '+R(m.tax)+' 元':''}｜${a.k=='buy'?'付出':'收到'} ${R(Math.abs(m.cash))} 元`+asLimitWarn(c,px,a.dt||TODAY)}else fe.innerText=''}
 const st=a.sid?stStrat(S,a.sid):null,sh=$('atStopH'),sz=$('atSize');
 if(st&&px){const sc=stStopCalc(st,c,px);if(sc&&!a.stopEd){a.stop=sc.v.toFixed(2);const el=document.querySelector('[data-at=stop]');if(el)el.value=a.stop}
  if(sh)sh.innerText=sc?`（${st.id} 預設：${sc.t}${sc.all.length>1?'，取比較近的':''}）`:'';const stp=num(a.stop),effPct=stp!=null&&stp<px?(1-stp/px)*100:num(st.stopPct),rr=stp!=null?stRR(c,px,stp):null;
  if(sz){const H=asSizeHint(S,px,effPct,st.riskPct),E=stExposure(S),add=(q||0)*px,w=E.after(add)>0?((E.by[c]||0)+add)/E.after(add)*100:0,cap=num(st.capStock)??stCapStock(S,c);
   sz.innerHTML=(rr?`賺賠比 <b class="${+st.rr&&rr.rr<2?'bad':''}">${rr.rr.toFixed(1)}</b>（目標＝近一年最高收盤 ${rr.tgt}，停損 ${stp}）${+st.rr&&rr.rr<2?' ⛔ 低於 2':''}<br>`:'')+(H?`建議最多 ${R(H.q)} 股（每筆最多虧 ${R(H.loss)} 元＝主動部位 ${W2(H.base)} 萬 × ${st.riskPct}%）<br>`:'')+(q?`買進後占主動部位 <b class="${w>cap?'wn':''}">${w.toFixed(1)}%</b>（上限 ${cap}%）${w>cap?' ⚠️ 超過上限':''}`:'')+(()=>{if(!q)return'';const g=a.theme||stGrpOf(S,c)[0],cur=(E.grp[g]||0)-(stGrpOf(S,c).includes(g)?0:0),gw=E.after(add)>0?(cur+add)/E.after(add)*100:0,gc=num(st.capGroup)??stCapGroup(S,g);return`<br>買進後「${esc(g)}」占主動 <b class="${gw>gc?'wn':''}">${gw.toFixed(1)}%</b>（族群上限 ${gc}%）${gw>gc?' ⚠️ 超過上限':''}`})()}}
 const lf=$('atLeft');if(lf&&a.k=='sell'){const h=holdings(S).find(z=>z.ac=='a'&&cU(z.n)==c),own=(h?h.q:0)+(a.i!=null&&S.trades[a.i].k=='sell'?num(S.trades[a.i].q)||0:0),left=own-(q||0);lf.innerText=q?(left<=0?'賣完後股數歸零，論點會自動標記為「已出場」。':`賣出後剩 ${R(left)} 股。`):''}}
window.asTradeSave=()=>{const a=AT,c=cU(a.c);if(!c){toast('請填代號',0);return}
 if(a.i==null&&!asCodeOk(c)&&!a.cOk){toast(`找不到代號「${c}」：請從建議選一檔，或按「仍要使用」`,0);return}
 if(a.k!='div'&&(!(num(a.q)>0)||!(num(a.px)>0))){toast('請填股數與成交價',0);return}
 if(a.k=='div'&&num(a.dps)==null){toast('請填每股配息',0);return}
 const isNew=a.i==null,x=isNew?NEW.trades():S.trades[a.i];if(isNew)S.trades.push(x);
 Object.assign(x,{dt:a.dt||TODAY,ac:a.ac,k:a.k,n:c,note:a.note||'',rs:a.rs||''});if(a.sig&&isNew){x.sig=a.sig;const[tid,key]=a.sig.split('|'),T0=stThesis(S,tid);if(T0&&typeof exMark=='function')exMark(T0,key,'sell','',x.dt)}if(a.k=='div'){x.dps=a.dps;x.pdt=a.pdt||'';x.q='';x.px=''}else{x.q=a.q;x.px=a.px}
 let msg=isNew?'已記錄':'已修改';
 if(a.ac=='a'&&a.k!='div'){let T=!isNew&&x.thesisId?stThesis(S,x.thesisId):asThesisOf(S,c);
  if(a.k=='buy'&&!T&&a.sid){const st=stStrat(S,a.sid);T=stNewThesis(S,{code:c,sid:a.sid,sver:st?st.ver:1,status:'hold',created:x.dt,why:a.why||'',stop:a.stop||'',met:(a.met||[]).slice(),metAt:x.dt});if(typeof ckEval=='function'&&CK){T.metNote=T.metNote||{};for(const t of T.met){const r=ckEval(c,t);if(r&&r.v===true)T.metNote[t]=`自動 ${ckMD(CK.d)}：${r.why}`}}stThDefaults(S,T,num(a.px));S.theses.push(T);if(a.theme){S.attr=S.attr||{};const at=S.attr[c]=S.attr[c]||{};if(at.theme!=a.theme){at.theme=a.theme;at.d=x.dt}}for(const t of T.met){const h=asHintOf(c,t);if(h&&h.ok===true&&!(T.metNote||{})[t]){T.metNote=T.metNote||{};T.metNote[t]=`${h.ai||'AI'} ${typeof ckMD=='function'?ckMD(h.d):h.d}：${h.why||'認為符合'}${(h.src||[]).length?'（'+h.src.join('；')+'）':''}`}}
   if(a.preAI&&!a.preAI.ok){const g=stCondEval(st,T.met).find(g=>/選什麼/.test(g.sec));if(g&&g.ok)T.metLate=`買進當下問 AI 後才補齊「選什麼」（${a.preAI.d}）`}if(typeof asTagDef=='function')asTagDef(c);if(!x.rs)x.rs='new';msg+=`，並建立論點 ${T.id}`}
  if(T){x.thesisId=T.id;if(T.status=='plan')T.status='hold';stLinkPlan(T,x);
   if(a.k=='sell'){const h=holdings(S).find(z=>z.ac=='a'&&cU(z.n)==c);if(!h||h.q<=0){T.status='exit';T.exit=Object.assign(T.exit||{},{date:x.dt,reason:AS_RS2EXIT[x.rs]||'other',followed:a.fol});msg+=`，${T.id} 已標記為已出場`}}}}
 else if(a.ac!='a')x.thesisId='';
 stBuild();renderTrades();upd();if(typeof pxApply=='function')pxApply();toast(msg,0);asStock(c,a.ac)};
window.asTradeDel=()=>{if(!confirm('刪除這筆交易？'))return;const x=S.trades[AT.i];S.trades.splice(AT.i,1);if(typeof trEd!='undefined')trEd.clear();renderTrades();upd();toast('已刪除',0);asStock(cU(x.n),x.ac=='a'?'a':'p')};

// 當初符合的策略條件（個股頁）
function asMetHtml(T,st){if(!st)return'';const ev=asEvHtml(cU(T.code));
 return`${ev?`<div class=asck>${ev}</div>`:''}${typeof ckExitHtml=='function'?ckExitHtml(T,st):''}${typeof ckCardHtml=='function'?ckCardHtml(T,st):''}${typeof ckMetRec=='function'?ckMetRec(T,st):''}`}
// 這檔股票接下來的事件（除息、財報…）
function asEvHtml(c){const L=(S.events||[]).filter(e=>e.code==c&&!e.done).sort((a,b)=>a.date<b.date?-1:1);return L.length?`<div style="margin-top:4px"><b>📅 事件</b>${L.map(e=>`<div class=h>${esc(e.date)} ${esc(e.type)}${e.note?'：'+esc(e.note):''}${e.date<=TODAY?' <button onclick="evDone(\''+e.id+'\')">✓ 完成</button>':''}</div>`).join('')}</div>`:''}
// 快速記交易：勾選符合的策略條件（＝買進理由）
// AI 對「要自己判斷」條件的看法（匯入的 manual）：只顯示、不自動打勾（2026-11-11）
const asHintN=t=>String(t||'').replace(/〔.〕/g,'').replace(/\s+/g,'');
function asHintOf(c,t){const L=(S.aiHint||{})[cU(c)]||[],k=asHintN(t);return L.filter(h=>asHintN(h.t)==k).slice(-1)[0]||null}
function asHintHtml(c,t,gi,ix,on){const h=asHintOf(c,t);if(!h)return'';const src=(h.src||[]).join('；');
 return`<div class="h aih">🤖 ${esc(h.ai||'AI')} ${esc(asD(h.d))} 認為${h.ok===true?'<b class=ok>符合</b>':h.ok===false?'<b class=wn>不符合</b>':'查不到'}${h.why?'：'+esc(h.why):''}${src?'（'+esc(src)+'）':''}${h.ok===true&&!on?` <button class=lk onclick="event.preventDefault();asAtMet(${gi},${ix},true)">勾選</button>`:''}</div>`}
function asCondPick(st){if(!st)return'';const C=stConds(st);if(!C.length)return'<div class=h>這個策略的規則還沒寫成「一行一個條件」，到「🧭 策略 → 策略庫」整理後就能用勾選的。</div>';
 // 自動檢核：換策略或代號時，把今天自動判斷符合的條件先勾好（可以取消）
 const c=cU(AT.c),ckOn=typeof ckEval=='function',key=st.id+'|'+c+'|'+(ckOn&&CK?CK.d:'');AT.ck=AT.ck||{};
 const back=!!(AT.dt&&AT.dt<TODAY),later=new Set(C.filter(g=>/依序/.test(g.rule||'')).flatMap(g=>g.items.slice(1)));
 // 預先打勾只限：今天的交易、自動判斷符合、不是用月營收代替的前瞻條件、依序加碼的第 1 批（2026-11-11）
 if(ckOn&&CK&&AT._ck!=key){AT._ck=key;const auto=[];for(const g of C){if(g.need=='none')continue;for(const t of g.items){const r=ckEval(c,t,st);AT.ck[t]=r;if(r&&r.v===true&&!r.proxy&&!back&&!later.has(t))auto.push(t)}}AT.met=[...new Set((AT.met||[]).concat(auto))]}
 if(later.size)AT.met=(AT.met||[]).filter(t=>!later.has(t));
 const NB=stNoBuy(st),nbR=NB.map(t=>({t,r:ckOn?ckEval(c,t,st):null})),nbHit=nbR.filter(o=>o.r&&o.r.v===true);
 const E=stCondEval(st,AT.met),M=new Set(AT.met||[]),bad=E.filter(g=>!g.ok),m0=ckOn&&CK?ckM(c):null,tpx=num(AT.px),stp2=num(AT.stop)??(tpx?((stStopCalc(st,c,tpx)||{}).v??null):null),rr2=tpx&&m0&&m0.c&&tpx>m0.c*1.01&&stp2!=null?stRR(c,tpx,stp2):null;
 return`<div class=asck><div class=h>勾選現在符合的條件（會存成這次的買進理由）${ckOn&&CK?'；標「自動」的是用公開資料判斷的（'+esc(ckAsOf())+'）'+(back?'':'，已先幫你勾好'):''}：</div>${typeof aaFromTrade=='function'?`<div class=asbtn style="margin:4px 0"><button class=aiq onclick="aaFromTrade()">🤖 問 AI（帶著這張表單）</button> <span class=h>要自己判斷的條件、EPS 預估可以先問；回來時表單會保留</span></div>`:''}${back?`<div class=wn>補登 ${esc(asD(AT.dt))} 的交易：自動判斷用的是今天的資料，不會預先打勾，請照當天的情況勾。</div>`:''}${E.map((g,gi)=>`<div style="margin-top:4px"><b>${esc(g.sec)}</b> <span class="${g.ok?'ok':'wn'}">${g.n}／${g.tot}${g.need?'（需要 '+(g.need>=g.tot?'全部':g.need+' 項')+'）':''}</span>${g.items.map((t,ix)=>later.has(t)?`<label class=ck style="opacity:.45"><input type=checkbox disabled><span>${typeof ckT=='function'?ckT(t):esc(t)} <span class=h>（第 2 批以後：加碼時才看，第一次買不算）</span></span></label>`:`<label class=ck><input type=checkbox onchange="asAtMet(${gi},${ix},this.checked)" ${M.has(t)?'checked':''}><span>${typeof ckT=='function'?ckT(t):esc(t)}${ckOn?ckBadge(ckEval(c,t,st),1):''}${ckOn&&(ckEval(c,t,st)||{}).proxy?' <span class=h>（代替判斷，不預先打勾，請自己確認）</span>':''}</span></label>${asHintHtml(c,t,gi,ix,M.has(t))}`).join('')}</div>`).join('')}${NB.length?`<div style="margin-top:4px"><b>⛔ 不買</b> <span class=h>任何一項成立就不買</span>${nbR.map(o=>`<div class=ckl>${o.r?(o.r.v===true?'<b class=bad>⛔ 成立</b>':o.r.v===false?'✓ 沒有':'❔'):'·'} ${typeof ckT=='function'?ckT(o.t):esc(o.t)}${o.r&&(o.r.why||o.r.miss)?`<div class=h>${esc(o.r.why)}${o.r.miss?' <i>'+esc(o.r.miss)+'</i>':''}</div>`:''}</div>`).join('')}</div>`:''}${rr2&&+st.rr?`<div class="${rr2.rr<2?'bad':'h'}" style="margin-top:4px">${rr2.rr<2?'⛔ ':''}用成交價 ${tpx} 算（比收盤 ${m0.c} 高 ${((tpx/m0.c-1)*100).toFixed(1)}%）：賺賠比 ${rr2.rr.toFixed(1)}（目標 ${rr2.tgt}、停損 ${(+stp2).toFixed(2)}）${rr2.rr<2?'，低於 2':''}</div>`:''}${nbHit.length?`<div class=bad style="margin-top:4px">⛔ 有「不買」條件成立：${nbHit.map(o=>esc(o.t.replace(/〔.〕/g,''))).join('、')}。仍可以儲存，但會記錄下來。</div>`:''}${bad.length?`<div class=wn style="margin-top:4px">⚠️ ${bad.map(g=>g.sec).join('、')}還沒達到策略的門檻。仍可以儲存，會記錄下來，之後檢討時看得到。</div>`:''}</div>`}
window.asAtMet=(gi,ix,on)=>{const st=stStrat(S,AT.sid),g=stCondEval(st,AT.met)[gi];if(!g)return;const t=g.items[ix];AT.met=(AT.met||[]).filter(x=>x!=t);if(on)AT.met.push(t);const h=$('asOvB').scrollTop;asTh();asPrev();$('asOvB').scrollTop=h};

// 個股頁開著時改了現價（例如填盤中價），重畫個股頁，讓價格條件用新價格試算
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.px&&asCur&&e.target.closest&&e.target.closest('#asOvB')){setTimeout(()=>{const b=$('asOvB'),h=b?b.scrollTop:0;asStock(asCur.c,asCur.ac);const b2=$('asOvB');if(b2)b2.scrollTop=h},0)}});

// ---------- 🛡️ 風險：未平倉風險、槓桿、離虧損上限、今天要注意的價位
// 壓力虧損（2026-11-10 審查 v6）：只算信貸資金那一塊，和「剩下的虧損額度」直接比
// ＝ 信貸占比 × 主動所有停損同時觸發的虧損 ＋ 信貸資金裡的被動 × 壓力跌幅（預設 25%：回測 v6 五次大跌 0050 最大跌幅中位數 −23%）
// 撥款前就有的持股下跌時，撥款前淨資產也一起跌，不會用掉虧損額度，所以只算信貸占比
function asHeatCap(S){const R=asOpenRisk(S),sp=num(S.stressP)??25;let L=null,q=null,pas=null,rb=null;
 try{const r=settle(S,curEff());if(r&&typeof slCalc=='function'&&lossB(S)>0){const z=slSplit(r);L=slCalc(r.af,z.act,z.pas);rb=Math.max(0,L.rb);q=r.scope>0?Math.max(0,(r.scope-r.nle)/r.scope):0;pas=z.pas}}catch(e){}
 const act=q!=null?R.tot*q:null,ps=pas!=null?pas*sp/100:null,tot=act!=null?act+ps:null;
 return{R,L,q,act,pas,ps,sp,tot,cap:rb,over:tot!=null&&rb!=null&&tot>rb}}
// 出場訊號的決定：照規則賣出／不照做（不適用的不算）
function asExitStat(S){let f=0,n=0,na=0;for(const T of S.theses||[])for(const x of T.exLog||[]){if(x.k=='sell'){f++;n++}else if(x.k=='skip')n++;else if(x.k=='na')na++}return{f,n,na}}
function asRiskHtml(){const H=asHeatCap(S),R=H.R,L=H.L;let lv='',lq=null;
 try{const r=settle(S,curEff());if(r){const nw=r.scope-r.rem;lv=nw>0?`持股＋現金 ${W2(r.scope)} 萬，扣掉剩餘本金 ${W2(r.rem)} 萬後是 ${W2(nw)} 萬；<b>持股市值是它的 ${((r.p+r.a)*1e4/nw).toFixed(2)} 倍</b>`:'';if(typeof liqOf=='function')lq=liqOf(r)}}catch(e){}
 const lr=(S.rules||[]).find(x=>x.k=='liq'),l1=(S.rules||[]).find(x=>x.k=='loss1');
 const nG=typeof lossLog=='function'?lossLog().length:0,mx=typeof lossRbMax=='function'?lossRbMax():1;
 const lsT=L?`已用 <b class="${L.used>=75?'bad':L.used>=50?'wn':''}">${L.used.toFixed(0)}%</b>（上限 ${W2(L.B)} 萬，剩 ${W2(Math.max(0,L.rb))} 萬${L.Y!=null?'，約再跌 '+L.Y.toFixed(1)+'%':''}）<span class=h>｜買回後重新起算 ${nG}／${mx} 次${num(S.lossRef)?'（'+esc(S.lossRefD||'')+'）':''}</span>${l1&&l1.on&&L.used>=+l1.th?`<div class=wn>① 停止加碼中（S04 用原有資金除外）</div>`:''}`:'';
 const TG=(S.theses||[]).filter(T=>T.status=='hold'&&typeof exTrig=='function').map(T=>({T,o:exTrig(T).filter(o=>!o.hit&&o.gap!=null&&Math.abs(o.gap)<=5)[0]})).filter(x=>x.o).sort((a,b)=>Math.abs(a.o.gap)-Math.abs(b.o.gap));
 const top=R.L.slice(0,3).map(x=>`${esc(x.c)} ${esc(nameOf(x.c)||'')} ${W2(x.v)}`).join('、'),es=asExitStat(S);
 const head=H.tot!=null?`<div class=asl>壓力虧損（只算信貸資金）：<b class="${H.over?'bad':H.tot>H.cap*0.75?'wn':''}">${W2(H.tot)} 萬</b>／剩下的虧損額度 <b>${W2(H.cap)} 萬</b>${H.over?' <span class=bad>超過：先降風險再加碼</span>':' ✓'}
   <div class=h>＝ 主動停損合計 ${W2(R.tot)} 萬 × 信貸占比 ${(H.q*100).toFixed(0)}%（${W2(H.act)} 萬）＋ 信貸資金裡的被動 ${W2(H.pas)} 萬 × 跌 <input type=number step=any value="${num(S.stressP)??25}" onchange="S.stressP=this.value===''?25:+this.value;save();asCalc()" style="width:52px"> %（${W2(H.ps)} 萬）</div></div>`
  :`<div class=asl>壓力虧損：<span class=h>要先在「💰 信貸 → 📋 結算」填現金，才算得出信貸占比和剩下的虧損額度</span></div>`;
 return`${head}<div class=asl>主動部位停損同時觸發（含撥款前持股）：<b>${W2(R.tot)} 萬</b>${R.pct!=null?`，占主動資本 ${R.pct.toFixed(1)}% <span class=h>（分母 ${W2(R.base)} 萬＝${esc(R.baseSrc)}）</span>`:''}${R.broken?` <span class=bad>${R.broken} 檔已跌破停損還沒賣</span>`:''}${R.noStop?` <span class=wn>${R.noStop} 檔沒設停損</span>`:''}
   ${top?`<div class=h>最大的三檔：${top} 萬</div>`:''}
   ${R.L.length?`<details><summary class=h>逐檔（${R.L.length} 檔）</summary>${R.L.map(x=>`<div class=rkl>${esc(x.c)} ${esc(nameOf(x.c)||'')}：${W2(x.v)} 萬 <span class=h>${esc(x.how)}</span></div>`).join('')}</details>`:''}</div>
  ${lq?`<div class=asl>月付金保留：現金${S.lossTo&&S.lossTo!='__cash'?'＋'+esc(S.lossTo):''} ${W2(lq.lo)} 萬，可付 <b class="${lr&&lr.on&&lq.m<+lr.th?'bad':''}">${isFinite(lq.m)?lq.m.toFixed(1):'—'} 個月</b>月付金（${Math.round(lq.pay).toLocaleString()} 元／月${lr&&lr.on?'，門檻 '+lr.th+' 個月':''}）</div>`:''}
  ${es.n||es.na?`<div class=asl>出場訊號：照規則賣出 <b>${es.f}／${es.n}</b>${es.n?'（'+(es.f/es.n*100).toFixed(0)+'%）':''}${es.na?`<span class=h>｜標為不適用 ${es.na} 次（不算）</span>`:''}</div>`:''}
  ${TG.length?`<div class=asl>今天收盤要注意（距觸發價 5% 內）：${TG.map(({T,o})=>`<div class=rkl><a href="#" onclick="asStockTh('${T.id}');return false">${esc(cU(T.code))} ${esc(nameOf(cU(T.code))||'')}</a>：收盤 ${o.dir} ${o.ap?'約 ':''}${f2(o.px)}（${o.gap>=0?'+':''}${o.gap.toFixed(1)}%）${esc(o.what)} → ${esc(o.act||'照規則處理')}</div>`).join('')}</div>`:''}
  ${lv?`<div class=asl>槓桿：${lv}</div>`:'<div class="asl h">槓桿與虧損上限：在「💰 信貸 → 📋 結算」填現金後顯示</div>'}
  ${lsT?`<div class=asl>虧損上限：${lsT} <button class=lk onclick="setWs('loan');tab('R')">看分段規則 ›</button></div>`:''}`}

// ---------- 📈 資產趨勢（每天收盤畫一個點）
let TRD=null;
function asTrendDraw(){const el=$('asTrend');if(!el)return;const T=asTrend(S),F=b=>fold('trend','📈 資產趨勢',TRS,b);let TRS='';
 if(!T){el.innerHTML=F(`<div class=h>${S.dd?'收盤價資料讀取中，或撥款後還不到 2 個交易日。':'在信貸頁填撥款日後顯示。'}</div>`);return}
 const rg=S.trR||'all',vw=S.trV||'as',d0={'1m':addMon(TODAY,-1),'3m':addMon(TODAY,-3),'ytd':TODAY.slice(0,4)+'-01-01','all':''}[rg]||'';
 const P=T.pts.filter(p=>p.d>=d0);if(P.length<2){el.innerHTML=F('<div class=h>這段期間的資料不足 2 天。</div>');return}
 const a0=P[0],b0=P[P.length-1];let pk=0,mdd=0;for(const p of P){pk=Math.max(pk,p.twr);mdd=Math.min(mdd,p.twr/pk-1)}const tw=(b0.twr/a0.twr-1)*100;
 TRS=`${asPct(tw)}｜回撤 ${(mdd*100).toFixed(1)}%｜總資產 ${W2(b0.tot)} 萬`;if(asFolded('trend')){el.innerHTML=F('');return}
 const ALL=vw=='nw'?[{k:'real',n:'真實淨資產',c:'#8b5cf6'},{k:'base0',n:'撥款前淨資產',c:'#ef4444',dash:'2 3'}]
  :[...(T.hasCash?[{k:'tot',n:'總資產（持股＋現金）',c:'#10b981'}]:[]),{k:'mv',n:'持股市值',c:'#3b82f6'},{k:'bm',n:'同金流 '+bmC(S),c:'#9ca3af',dash:'5 3'}];
 const hid=new Set(String(S.trHide||'').split(',').filter(Boolean)),SER=ALL.filter(x=>!hid.has(x.k));
 const val=(p,k)=>k=='base0'?T.base0:p[k];let lo=Infinity,hi=-Infinity;for(const x of SER)for(const p of P){const v=val(p,x.k);if(v!=null){lo=Math.min(lo,v);hi=Math.max(hi,v)}}
 const chip=(k,v,l)=>`<button class="${(k=='trR'?rg:vw)==v?'on':''}" onclick="S.${k}='${v}';save();asTrendDraw()">${l}</button>`;
 const head=`<div class=chips style="margin:4px 0">${chip('trV','as','資產')}${chip('trV','nw','淨資產')}<span style="width:8px"></span>${chip('trR','1m','1 個月')}${chip('trR','3m','3 個月')}${chip('trR','ytd','今年')}${chip('trR','all','全部')}</div>`;
 const lg=`<div class=trlg>${ALL.map(x=>`<span onclick="asTrTog('${x.k}')" style="cursor:pointer;${hid.has(x.k)?'opacity:.35;text-decoration:line-through':''}"><i style="border-color:${x.c}${x.dash?';border-top-style:dashed':''}"></i>${esc(x.n)}</span>`).join('')}${vw=='as'?'<span><b style="color:#f59e0b">●</b> 有買賣</span>':''}<span class=h>點圖例開關線條；單位：萬</span></div>`;
 if(!isFinite(lo)){el.innerHTML=F(head+`<div class=h>${vw=='nw'?'真實淨資產要先在結算填現金。':'線條都關掉了，點下面的圖例打開。'}</div>`+lg);return}
 const pad=(hi-lo)*0.08||hi*0.02||1;lo-=pad;hi+=pad;const W=340,H=180,L=32,Rr=40,Tp=8,B=18,x=i=>L+(W-L-Rr)*i/(P.length-1),y=v=>Tp+(H-Tp-B)*(1-(v-lo)/(hi-lo));
 const path=k=>{let d='',on=0;P.forEach((p,i)=>{const v=val(p,k);if(v==null){on=0;return}d+=(on?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);on=1});return d};
 const yt=[0,0.5,1].map(f=>lo+(hi-lo)*f),xt=[0,Math.floor((P.length-1)/2),P.length-1];
 const mk=vw=='as'&&!hid.has('mv')?P.map((p,i)=>p.tr?`<circle cx="${x(i).toFixed(1)}" cy="${y(p.mv).toFixed(1)}" r="2.6" fill="#f59e0b"/>`:'').join(''):'';
 // 線尾數值：照高低排，太近的往上下推開
 const ends=SER.map(z=>{const v=val(b0,z.k);return v==null?null:{z,v,yy:y(v)}}).filter(Boolean).sort((p,q)=>p.yy-q.yy);for(let i=1;i<ends.length;i++)if(ends[i].yy-ends[i-1].yy<10)ends[i].yy=ends[i-1].yy+10;
 TRD={P,SER,T,x,y,W,L,Rr,val};
 el.innerHTML=F(head+`<svg class=trc viewBox="0 0 ${W} ${H}" onpointermove="asTrHov(evt)" onpointerdown="asTrHov(evt)">
   ${yt.map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line)" stroke-width=".6"/><text x="${L-3}" y="${(y(v)+3).toFixed(1)}" text-anchor=end>${Math.round(v/1e4)}</text>`).join('')}
   ${xt.map(i=>`<text x="${x(i).toFixed(1)}" y="${H-5}" text-anchor="${i==0?'start':i==P.length-1?'end':'middle'}">${P[i].d.slice(5).replace('-','/')}</text>`).join('')}
   ${SER.map(z=>`<path d="${path(z.k)}" fill=none stroke="${z.c}" stroke-width="${z.k=='base0'?1.2:1.8}"${z.dash?` stroke-dasharray="${z.dash}"`:''}/>`).join('')}${mk}
   ${ends.map(e=>`<text x="${W-Rr+3}" y="${(e.yy+3).toFixed(1)}" style="fill:${e.z.c};font-weight:600">${(e.v/1e4).toFixed(1)}</text>`).join('')}
   <line id=trCur x1=0 x2=0 y1="${Tp}" y2="${H-B}" stroke="var(--mut)" stroke-width=".7" visibility=hidden />
  </svg>${lg}
  <div class=trrd id=trRd><span class=h>手指在圖上拖動，看每天的數字與交易</span></div>
  <div class=asl>這段期間（持股、時間加權，扣掉買賣金額）：報酬 <b class="${asC(tw)}">${asPct(tw)}</b>｜最大回撤 <b>${(mdd*100).toFixed(1)}%</b>｜目前離高點 <b>${((b0.twr/pk-1)*100).toFixed(1)}%</b></div>
  <div class=h>每天收盤價來自網站的收盤價檔。${T.hasCash?'現金用你最近一次填的金額，依之後的買賣與配息推算。':'還沒填現金，所以只有持股市值。'}${vw=='nw'?'真實淨資產＝持股＋現金－剩餘本金－累計已繳月付金－開辦費－淨入金－外部費用（和結算相同）。':''}${T.miss?` 有 ${T.miss} 天缺部分收盤價，沒有畫。`:''}</div>`)}
window.asTrTog=k=>{const h=new Set(String(S.trHide||'').split(',').filter(Boolean));h.has(k)?h.delete(k):h.add(k);S.trHide=[...h].join(',');save();asTrendDraw()};
window.asTrHov=e=>{if(!TRD)return;const sv=e.currentTarget,r=sv.getBoundingClientRect(),X=(e.clientX-r.left)/r.width*TRD.W,{P,L,Rr,W}=TRD;let i=Math.round((X-L)/(W-L-Rr)*(P.length-1));i=Math.max(0,Math.min(P.length-1,i));const p=P[i];
 const ln=sv.querySelector('#trCur');if(ln){ln.setAttribute('x1',TRD.x(i));ln.setAttribute('x2',TRD.x(i));ln.setAttribute('visibility','visible')}
 const tx=(S.trades||[]).filter(x=>x.dt==p.d&&(x.k=='buy'||x.k=='sell')).map(x=>`${x.k=='buy'?'買':'賣'} ${esc(cU(x.n))} ${esc(nameOf(cU(x.n))||'')} ${x.q} 股`).join('、');
 $('trRd').innerHTML=`<b>${esc(asD(p.d))}</b>　${TRD.SER.map(s=>{const v=TRD.val(p,s.k);return v==null?'':`${esc(s.n)} ${W2(v)} 萬`}).filter(Boolean).join('｜')}${tx?`<div class=h>${tx}</div>`:''}`};
