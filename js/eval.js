// ================= 🔍 評估新股票（2026-11-13）=================
// App 先給結論：策略矩陣（只列【選什麼】沒有 ❌ 的策略，依證據等級排序）→ 選一個策略的完整檢核與第 1 批買進試算 → 結論（⛔／⏳／✅）。
// 兩種開法：從股票（輸入代號，最多 3 檔、同一個策略）、從策略（全市場今天【選什麼】沒有 ❌、【何時買】成立的股票）。
// 不建論點、不記交易；問 AI、建立規劃中論點在 PR 乙。
const EV_GR=[['pre','有初步證據'],['neu','中性'],['few','樣本太少'],['none','沒有回測']];
const evGr=sid=>(S.stEvid||{})[sid]||'',evGrN=sid=>(EV_GR.find(x=>x[0]==evGr(sid))||[0,'證據未標'])[1],evRank=sid=>{const i=EV_GR.findIndex(x=>x[0]==evGr(sid));return i<0?8:i};
const EV_TECH=/電子|半導體|光電|電腦|通信|資訊服務|數位雲端/;
let EV={mode:'stock',codes:[],sid:'',all:0,tech:1,scan:null,scanSid:''};
// 條件狀態：1 符合、0 不符合、-1 缺資料（可以補）、-2 要自己判斷、-3 等資料累積
const evOne=i=>i.r?(i.r.v===true?1:i.r.v===false?0:typeof ckFixable=='function'&&ckFixable(i.r)?-1:-3):-2;
// 一檔 × 一個策略
function evCheck(c,st){c=cU(c);const G=ckGroups(st,c),out={c,st,G,sel:null,lack:[],no:[],bad:[],v:'',why:''};
 for(const g of G){const L=g.items.map(i=>Object.assign({s:evOne(i)},i));g.L=L;
  if(g.need=='none'){for(const i of L)if(i.s==1)out.no.push(i.t);continue}
  const its=/依序/.test(g.rule||'')?L.slice(0,1):L,n=g.need=='all'?its.length:Math.min(+g.need||0,its.length);if(!n)continue;
  const ok=its.filter(i=>i.s==1).length,bad=its.filter(i=>i.s==0),pend=its.filter(i=>i.s<0);
  if(/選什麼/.test(g.sec))out.sel={ok,bad:bad.length,pend:pend.length,n:its.length,badT:bad.map(i=>i.t)};
  if(ok>=n)continue;if(its.length-bad.length<n)out.bad.push({sec:g.sec,t:bad.map(i=>i.t)});else out.lack.push(...pend.slice(0,n-ok).map(i=>({sec:g.sec,t:i.t,s:i.s})))}
 const cl=t=>String(t).replace(/〔.〕/g,'');
 if(out.no.length){out.v='bad';out.why='【不買】成立：'+out.no.map(cl).join('、')}
 else if(out.bad.length){const b=out.bad[0];out.v='bad';out.why=(/選什麼/.test(b.sec)?'【選什麼】不符合：':/何時買|進場|第/.test(b.sec)?`【${b.sec}】還沒到：`:`【${b.sec}】不符合：`)+b.t.map(cl).join('、')}
 else if(out.lack.length){out.v='wait';out.why=`還差 ${out.lack.length} 項要補：`+out.lack.map(x=>cl(x.t)).join('、')}
 else{out.v='ok';out.why='條件都符合'}
 // 再用論點卡的同一套判斷核對一次（暫時的規劃中論點，不存檔）
 if(out.v=='ok'&&typeof ckVerdict=='function')try{const v=ckVerdict({id:'__ev',code:c,sid:st.id,sver:st.ver,status:'plan',met:[],plan:[]});if(v&&v.cls!='ok'){out.v=v.cls=='bad'?'bad':'wait';out.why=String(v.t||'').replace(/^\S+\s*/,'')}}catch(e){}
 return out}
// 現價：自己的現價（持股）→ 檢核資料的收盤
const evPx=c=>{c=cU(c);const p=num((S.px||{})[c]);if(p!=null)return p;try{const m=CK&&CK.s&&CK.s[c]?ckM(c):null;return m&&m.c!=null?m.c:null}catch(e){return null}};
// 第 1 批買進試算
function evBuy(c,st){const px=evPx(c);if(px==null)return null;const sc=typeof stStopCalc=='function'?stStopCalc(st,c,px):null,stop=sc&&sc.v!=null?sc.v:null;
 const E=stExposure(S),pl=stPlanDef(st),f1=pl&&pl.length?(+pl[0].pct||100)/100:1,hint=stop!=null&&stop<px?asSizeHint(S,px,(1-stop/px)*100,st.riskPct):null;
 const g=stGrpOf(S,c)[0],H=typeof asHeatCap=='function'?asHeatCap(S):null,room=H&&H.cap!=null&&H.tot!=null?H.cap-H.tot:null;
 // 第 1 批 = 每筆風險算出的股數 × 第 1 批比例，再受個股上限、主題上限、壓力虧損剩餘額度限制（和「明天要做的事」同一套）
 let q=hint?Math.floor(hint.q*f1):null,by='每筆風險 × 第 1 批比例';if(q!=null){const L=[[by,q],['個股上限',Math.floor(Math.max(0,stCapStock(S,c)/100*E.tot-(E.by[c]||0))/px)]];if(g)L.push([`主題「${g}」上限`,Math.floor(Math.max(0,stCapGroup(S,g)/100*E.tot-(E.grp[g]||0))/px)]);if(room!=null&&H.q)L.push(['壓力虧損剩餘',Math.floor(Math.max(0,room)/((px-stop)*H.q))]);const mn=L.reduce((a,b)=>b[1]<a[1]?b:a);q=mn[1];by=mn[0]}
 const add=q?q*px:0;
 return{px,stop,stopT:sc&&sc.t,q,by,qAll:hint&&hint.q,f1,batches:pl?pl.length:1,pct0:E.tot>0?(E.by[c]||0)/E.tot*100:0,pct1:E.tot>0?((E.by[c]||0)+add)/E.tot*100:0,cap:stCapStock(S,c),g,g0:g&&E.tot>0?(E.grp[g]||0)/E.tot*100:null,g1:g&&E.tot>0?((E.grp[g]||0)+add)/E.tot*100:null,gc:g?stCapGroup(S,g):null,dH:H&&H.q!=null&&q&&stop!=null?q*(px-stop)*H.q:null,room}}
const evOn=()=>(S.strategies||[]).filter(s=>+s.on).sort((a,b)=>evRank(a.id)-evRank(b.id)||(a.id<b.id?-1:1));
// 策略矩陣：每個策略【選什麼】的狀態
function evMatrix(c){return evOn().map(st=>{const r=evCheck(c,st);return{st,r,fit:!!r.sel&&r.sel.bad==0}})}
// 從策略：全市場今天【選什麼】沒有 ❌、【何時買】也成立（只剩缺資料或要自己判斷的也列，標出差幾項）
function evScan(st){const out=[];if(!CK||!CK.s)return out;const iJ=CK.f.indexOf('jp');
 for(const c in CK.s){if(!/^\d{4}$/.test(c))continue;if(iJ>=0&&CK.s[c][iJ])continue;if(EV.tech&&!EV_TECH.test((typeof IND!='undefined'&&IND[c])||''))continue;
  const r=evCheck(c,st);if(r.v=='bad')continue;out.push({c,r,n:r.lack.length})}
 return out.sort((a,b)=>a.n-b.n||(a.c<b.c?-1:1))}
const evIc=s=>s==1?'✅':s==0?'❌':s==-2?'✋':'⏳';
function evCodeIn(){return`<div class=chips>${EV.codes.map(c=>`<span class="thc on">${esc(c)} ${esc(nameOf(c))} <a href="#" onclick="evDel('${c}');return false">✕</a></span>`).join('')}</div>${EV.codes.length<3?`<input id=evIn placeholder="代號或名字（最多 3 檔）" oninput="evSug(this.value)" style="width:100%"><div class=chips id=evSug></div>`:''}`}
window.evSug=v=>{const el=$('evSug');if(!el)return;v=String(v||'').trim();const V=v.toUpperCase(),hits=[];if(v){if(STK[V]&&!EV.codes.includes(V))hits.push(V);const asc=/^[0-9A-Z]+$/.test(V);for(const c in STK){if(hits.length>=6)break;if(c!=V&&(asc?c.startsWith(V):STK[c].includes(v))&&!EV.codes.includes(c))hits.push(c)}}
 el.innerHTML=hits.map(c=>`<button onclick="evAdd('${c}')">${c} ${esc(STK[c]||'')}</button>`).join('')};
window.evAdd=c=>{c=cU(c);if(!EV.codes.includes(c)&&EV.codes.length<3)EV.codes.push(c);evRender()};
window.evDel=c=>{EV.codes=EV.codes.filter(x=>x!=c);evRender()};
window.evSet=(k,v)=>{EV[k]=v;if(k=='mode'||k=='tech')EV.scan=null;evRender()};
window.evOpen=o=>{o=o||{};EV=Object.assign({},EV,{src0:o.src0||'stock',codes:(o.codes||[]).map(cU).slice(0,3),sid:o.sid||EV.sid||'',mode:o.mode||(o.codes&&o.codes.length?'stock':EV.mode),scan:null});evRender()};
window.evRunScan=()=>{const st=stStrat(S,EV.sid);if(!st)return;$('evScan').innerHTML='<div class=h>計算中…</div>';setTimeout(()=>{EV.scan=evScan(st);EV.scanSid=st.id;evRender()},30)};
// 一檔的完整檢核卡
function evCard(c,st){const r=evCheck(c,st),b=evBuy(c,st),ic={ok:'✅',wait:'⏳',bad:'⛔'}[r.v],T0=asThesisOf(S,c);
 const grp=r.G.map(g=>`<div class=sub>【${esc(g.sec)}】${g.need=='none'?'（任一項成立就不買）':''}</div>${g.L.map((i,k)=>`<div class=ckl>${/依序/.test(g.rule||'')&&k>0?'<span class=h>':''}${evIc(g.need=='none'?(i.s==1?0:i.s==0?1:i.s):i.s)} ${typeof ckT=='function'?ckT(i.t):esc(i.t)}${i.r&&(i.r.why||i.r.miss)?`<div class=h>${esc(i.r.why||'')}${i.r.miss?' '+esc(i.r.miss):''}</div>`:''}${/依序/.test(g.rule||'')&&k>0?'</span>':''}</div>`).join('')}`).join('');
 const by=b?`<div class=sub>第 1 批買進試算（收盤確認、隔天開盤執行）</div><div class=tmr>參考價 ${f2(b.px)}｜停損 ${b.stop!=null?f2(b.stop)+'（'+esc(b.stopT||'')+'）':'—'}｜${b.q?`第 1 批 <b>${b.q.toLocaleString()} 股</b>（約 ${W2(b.q*b.px)} 萬；受限於${esc(b.by)}${b.batches>1?`；${b.batches} 批全部約 ${b.qAll.toLocaleString()} 股`:''}）`:'算不出建議股數'}</div>${b.q?`<div class=tmr>買進後占主動 ${b.pct0.toFixed(1)}% → ${b.pct1.toFixed(1)}%（上限 ${b.cap}%）${b.g?`；主題「${esc(b.g)}」${b.g0.toFixed(1)}% → ${b.g1.toFixed(1)}%（上限 ${b.gc}%）`:''}${b.dH!=null?`；壓力虧損 +${W2(b.dH)} 萬（剩下 ${b.room!=null?W2(b.room):'—'} 萬）`:''}</div>`:''}`:'<div class=h>沒有現價，算不出買進試算</div>';
 const go=r.v=='ok'&&b&&b.q>0&&!T0?`<button class=pri onclick="asClose();asTradeOpen({k:'buy',c:'${c}',ac:'a',sid:'${st.id}',q:${b.q}})">＋記交易（第 1 批 ${b.q.toLocaleString()} 股）</button>`:'';
 return`<div class=asth><b>${esc(c)} ${esc(nameOf(c))}</b> ${T0?`<span class="thc on">已有 ${esc(T0.id)}（${esc(T0.sid||'')}）</span>`:''}${(CK&&CK.s&&CK.s[c])?'':' <span class=wn>不在檢核資料裡：條件都是「資料不足」，不能當成通過</span>'}
  <div class="${r.v=='ok'?'ok':r.v=='bad'?'wn':'h'}" style="margin:4px 0"><b>${ic} ${r.v=='ok'?'可以買':r.v=='bad'?'現在不買':'只差資料'}</b>：${esc(r.why)}</div>
  ${by}<details><summary>完整條件（${esc(st.id)}）</summary>${grp}</details><div class=asbtn>${go}<button onclick="evAsk('${c}')">🤖 ${EV_ASK[r.v]}</button></div>${r.v!='ok'?`<div class=h>策略還在測試；判斷不是 ✅ 也可以問 AI。AI 回覆後建立的論點會標「規則外觀察」，績效另外算。</div>`:''}<div id="evAi_${c}"></div></div>`}
function evRender(){const L=evOn(),c0=EV.codes[0];let h=`<div class=ovh><button onclick="asClose()">✕</button><div><b>🔍 評估</b></div></div>
 <div class=h>App 先用策略規則判斷；判斷不了的再問 AI。不建論點、不記交易。</div>
 <div class=chips><button class="${EV.mode=='stock'?'pri':''}" onclick="evSet('mode','stock')">從股票</button><button class="${EV.mode=='strat'?'pri':''}" onclick="evSet('mode','strat')">從策略找股票</button></div>`;
 if(EV.mode=='stock'){h+=evCodeIn();
  if(EV.codes.length){const M=evMatrix(c0),fit=M.filter(x=>x.fit),no=M.filter(x=>!x.fit);if(!EV.sid||!L.some(s=>s.id==EV.sid))EV.sid=(fit[0]||M[0]||{st:{}}).st.id||'';
   h+=`<div class=sub>${esc(c0)} ${esc(nameOf(c0))} 適合哪個策略（【選什麼】沒有 ❌；依證據等級排序）</div>${fit.length?fit.map(x=>`<div class=tmr><button class="${EV.sid==x.st.id?'pri':''}" onclick="evSet('sid','${x.st.id}')">${esc(x.st.id+' '+x.st.name)}</button> <span class=h>${esc(evGrN(x.st.id))}｜選什麼 ✅ ${x.r.sel.ok}／${x.r.sel.n}${x.r.sel.pend?`，${x.r.sel.pend} 項要補`:''}</span></div>`).join(''):'<div class=wn>目前沒有策略的【選什麼】適合這檔。</div>'}
   ${no.length?`<details ${EV.all?'open':''} ontoggle="EV.all=this.open?1:0"><summary class=h>不適合：${no.map(x=>esc(x.st.id)).join('、')}</summary>${no.map(x=>`<div class=tmr><button class="${EV.sid==x.st.id?'pri':''}" onclick="evSet('sid','${x.st.id}')">${esc(x.st.id+' '+x.st.name)}</button> <span class=h>${esc(evGrN(x.st.id))}｜❌ ${esc(x.r.sel?x.r.sel.badT.map(t=>t.replace(/〔.〕/g,'')).join('、'):'沒有【選什麼】')}</span></div>`).join('')}</details>`:''}`;
   const st=stStrat(S,EV.sid);if(st){if(evGr(st.id)&&evRank(st.id)>=2)h+=`<div class=wn>${esc(st.id)} 的證據等級是「${esc(evGrN(st.id))}」；新資金建議優先給證據等級較高的策略。</div>`;h+=EV.codes.map(c=>evCard(c,st)).join('')}}
  else h+='<div class=h>輸入代號或名字。最多 3 檔，用同一個策略比較。</div>';h+=evPlanHtml()}
 else{const st=stStrat(S,EV.sid)||L[0];if(st)EV.sid=st.id;
  h+=`<div class=chips>${L.map(s=>`<button class="${EV.sid==s.id?'pri':''}" onclick="evSet('sid','${s.id}');EV.scan=null;evRender()">${esc(s.id)} <small>${esc(evGrN(s.id))}</small></button>`).join('')}</div>
  <label class=ck><input type=checkbox ${EV.tech?'checked':''} onchange="evSet('tech',this.checked?1:0)">只看科技類（電子、半導體、光電、電腦、通信、資訊服務、數位雲端）</label>
  <div class=h>列出全市場今天【選什麼】沒有 ❌、【何時買】成立、【不買】沒有成立的股票（缺資料或要自己判斷的也列，標出差幾項）。檢核資料是 ${CK?esc(asD(CK.d)):'—'} 收盤；跳動保險標記的股票不列。</div>
  <div class=asbtn><button class=pri onclick="evRunScan()">🔎 找 ${esc(st?st.id:'')} 今天符合的股票</button></div><div id=evScan>${EV.scan&&EV.scanSid==EV.sid?(EV.scan.length?`<div class=sub>${EV.scan.length} 檔（全部符合 ${EV.scan.filter(x=>!x.n).length} 檔）</div>`+EV.scan.slice(0,40).map(x=>`<div class=tmr><a href="#" onclick="evOpen({codes:['${x.c}'],sid:'${EV.sid}',mode:'stock',src0:'screen'});return false"><b>${esc(x.c)} ${esc(nameOf(x.c))}</b></a> ${x.n?`<span class=h>差 ${x.n} 項：${esc(x.r.lack.map(z=>z.t.replace(/〔.〕/g,'')).join('、').slice(0,60))}</span>`:'<span class=ok>✅ 條件都符合</span>'}</div>`).join('')+(EV.scan.length>40?`<div class=h>只列前 40 檔</div>`:''):'<div class=h>今天沒有符合的股票。</div>'):''}</div>`}
 asOvOpen(h)}

// ================= 問 AI（q:'eval'，2026-11-13 乙）=================
// 三種結論都可以問，問的事不同：⏳ 只補缺的資料；⛔ 討論不買的原因與進場時機；✅ 只做反方檢查
const EV_ASK={wait:'問 AI：只補缺的資料',bad:'問 AI：討論不買的原因與進場時機',ok:'問 AI：反方檢查'};
window.evAsk=c=>{const cs=c?[cU(c)]:EV.codes.slice();if(!cs.length||!EV.sid)return;AA_CTX={from:'eval',src0:EV.src0||'stock'};asClose();aiOpen({q:'eval',codes:cs,sid:EV.sid,from:'eval'})};
// 問 AI 畫面裡的股票與策略
function aaEvPick(){const L=evOn();return`<div class=sub>股票與策略</div>${AA.codes.length?`<div>${AA.codes.map(c=>esc(c+' '+nameOf(c))).join('、')}</div>`:'<div class=wn>先到資產頁底下「🔍 評估」選股票，再按「問 AI」。</div>'}
 <select onchange="aaSet('sid',this.value)">${L.map(s=>`<option value="${s.id}" ${AA.sid==s.id?'selected':''}>${esc(s.id+' '+s.name)}（${esc(evGrN(s.id))}）</option>`).join('')}</select>`}
// 第 1 批買進試算（文字版）
function aaEvLine(c,st){const b=evBuy(c,st);if(!b||!b.q)return'';return`第 1 批買進試算（App 算的）：參考價 ${f2(b.px)}、停損 ${b.stop!=null?f2(b.stop)+'（'+b.stopT+'）':'—'}、第 1 批 ${AA.amt?b.q.toLocaleString()+' 股（受限於'+b.by+'）':'（股數不附）'}；買進後這檔占主動 ${b.pct0.toFixed(1)}% → ${b.pct1.toFixed(1)}%（上限 ${b.cap}%）${b.g?`；主題「${b.g}」${b.g0.toFixed(1)}% → ${b.g1.toFixed(1)}%（上限 ${b.gc}%）`:''}`}
function aaEvAsk(ex){const st=stStrat(S,AA.sid),C=aaCodes();if(!st)return'【要你做的事】（先選策略）';if(!C.length)return'【要你做的事】（先到「🔍 評估」選股票）';
 const R=C.map(c=>({c,r:evCheck(c,st)})),by=k=>R.filter(x=>x.r.v==k),cl=t=>String(t).replace(/〔.〕/g,''),nm=x=>`${x.c} ${nameOf(x.c)}`;
 const L=[`【App 的判斷】（${st.id} ${st.name} v${st.ver}；證據等級：${evGrN(st.id)}。策略還在測試，判斷不是 100%）`];
 for(const x of R)L.push(`- ${nm(x)}：${{ok:'✅ 可以買',wait:'⏳ 只差資料',bad:'⛔ 現在不買'}[x.r.v]}｜${x.r.why}`);
 L.push('','【要你做的事】評估新股票');let n=0;const N=()=>++n;
 const W=by('wait'),B=by('bad'),O=by('ok');
 if(W.length)L.push(`${W.length<R.length?`〔${W.map(nm).join('、')}：⏳〕\n`:''}${N()}. 只查還缺的項目，每一項附來源和日期：${[...new Set(W.flatMap(x=>x.r.lack.map(z=>cl(z.t))))].join('、')}。
${N()}. 這檔最可能錯在哪（一個最大的風險）。`);
 if(B.length)L.push(`${B.length<R.length?`〔${B.map(nm).join('、')}：⛔〕\n`:''}討論不買的原因與進場時機：
${N()}. App 用的資料對不對（附來源和日期），特別是造成「不買」的那幾條：${[...new Set(B.map(x=>x.r.why))].join('；')}。
${N()}. 要什麼改變、大概什麼時候，這檔才會符合（引用上面的條件原文；例如哪個月的營收、價格要回到哪裡、哪一天的法說）。
${N()}. 兩邊各自最可能錯在哪：照規則不買可能錯過什麼；不照規則買可能錯在哪。`);
 if(O.length)L.push(`${O.length<R.length?`〔${O.map(nm).join('、')}：✅〕\n`:''}只做反方檢查：
${N()}. App 用的資料對不對（附來源和日期）。
${N()}. 最不利於買進的解讀，以及最可能錯在哪。
${N()}. 有沒有一次性因素讓數字失真（例如存貨跌價、匯兌、業外、專案認列時點）。`);
 L.push(`要我建立「規劃中」論點才放 theses（每檔一筆：code、strategy、why、wrongIf、risk）；停損、分批 App 會算。App 判斷不是 ✅ 的，我勾了會標「規則外觀察」。
回答開頭請先用三行：① 資料有沒有錯 ② 你對 App 判斷的看法（同意／資料有誤／前提不成立）③ 最可能錯在哪。之後才寫細節。${ex?'\n補充：'+ex:''}`);
 return L.join('\n')}

// ---------- 匯入檢查（ai-import.js 呼叫）
const EV_PLAN_MAX=5;
// EPS 沒有寫明機構和日期的剔除（評估新股票時是錯誤，不只是疑點）
function evImpPre(P){for(const it of P.ol||[]){if(it.err.length||!it.eps)continue;const bad=it.eps.filter(e=>aiNoSrc(e.src)||e.noD);if(!bad.length)continue;
 it.eps=it.eps.filter(e=>!bad.includes(e));it.warn.push(`❌ 剔除 ${bad.map(e=>`${e.y} 年 EPS ${e.v}`).join('、')}：沒有寫明機構和日期`);if(!it.eps.length&&!it.guide&&!(it.attr&&Object.keys(it.attr).length))it.err.push('剔除沒有來源的 EPS 後，沒有可以匯入的內容')}}
// 條件狀態：好＝一般條件符合、【不買】沒有成立
const evGood=(g,i)=>g.need=='none'?i.s==0:i.s==1;
function evStat(c,st){const m={};for(const g of evCheck(c,st).G)for(const i of g.L)m[g.sec+'｜'+i.t]=evGood(g,i);return m}
function evImpFlag(P,sus){const sidOf=c=>{const t=(P.th||[]).find(z=>z.c==c&&z.sid);return t?t.sid:(AA&&AA.q=='eval'&&AA.sid?AA.sid:(asThesisOf(S,c)||{}).sid)};
 const pairs=c=>{const sid=sidOf(c),st=sid&&stStrat(S,sid);return st?[[c,st]]:[]};
 // 只因為這一筆 AI 資料才變成符合的條件 → 這一筆預設不勾，逐條列出
 const items=[...(P.ol||[]).map(it=>[it,pairs(it.c)]),...(P.tm||[]).map(it=>[it,[...new Set((P.th||[]).map(z=>z.c).concat(AA&&AA.q=='eval'?AA.codes:[]))].filter(c=>((S.attr||{})[c]||{}).theme==it.n).flatMap(pairs)])];
 for(const[it,PR]of items){if(it.err.length||!PR.length)continue;const fl=[];
  for(const[c,st]of PR){const a=evStat(c,st),S0=S,on=new Map();for(const t of['tr','th','up','ev','ol','tm','sg','rv','mn'])for(const z of P[t]||[]){on.set(z,z.on);z.on=z===it?1:0}
   let b=null;try{S=clone(S0);if(typeof CKM!='undefined')for(const k in CKM)delete CKM[k];aiApplyTo(P);b=evStat(c,st)}catch(e){console.warn('evImpFlag',e)}finally{S=S0;for(const[z,v]of on)z.on=v;if(typeof CKM!='undefined')for(const k in CKM)delete CKM[k]}
   if(b)for(const k in b)if(b[k]&&!a[k])fl.push(`${c} ${k.split('｜')[1].replace(/〔.〕/g,'')}`)}
  if(fl.length){it.evFlip=fl;sus(it,[`只因為這筆 AI 資料才變成符合：${fl.join('；')}`])}}
 // 論點：App 判斷是 ✅ 才預設勾；規劃中論點上限 5 個
 let n=(S.theses||[]).filter(T=>T.status=='plan').length;
 for(const it of P.th||[]){if(it.err.length||!it.st)continue;if(!it.merge&&!(it.conv&&it.conv.status=='plan')){if(++n>EV_PLAN_MAX){it.err.push(`規劃中論點已有 ${n-1} 個（上限 ${EV_PLAN_MAX}）：先在「🔍 評估 → 規劃中」放棄不要的，再匯入`);continue}}
  const r=evCheck(it.c,it.st);it.evV=r.v;if(r.v!='ok')sus(it,[`App 判斷${r.v=='bad'?'⛔ 現在不買':'⏳ 還差資料'}（${r.why}）；勾了會標「規則外觀察」，績效另外算`])}}

// ---------- 規劃中論點：放棄（不刪除，留紀錄看之後的變化）
window.evDrop=id=>{const T=stThesis(S,id);if(!T||T.status!='plan')return;const why=prompt(`放棄 ${T.id} ${cU(T.code)} ${nameOf(T.code)}？寫一句原因（可不填）`,'');if(why===null)return;
 const px=evPx(T.code);T.status='exit';T.exit=Object.assign({},T.exit||{},{date:TODAY,reason:'drop',px:px??'',note:String(why||'').trim()});save();toast(`已放棄 ${T.id}；在「🔍 評估」的放棄紀錄看之後的變化`,0);if(typeof stBuild=='function')try{stBuild()}catch(e){}if(typeof asCalc=='function')try{asCalc()}catch(e){}if($('asOvB')&&EV&&document.querySelector('#asOvB .evdrop'))evRender()};
const evDropped=()=>(S.theses||[]).filter(T=>T.status=='exit'&&T.exit&&T.exit.reason=='drop').sort((a,b)=>(b.exit.date||'')<(a.exit.date||'')?-1:1);
function evPlanHtml(){const P=(S.theses||[]).filter(T=>T.status=='plan'),D=evDropped();if(!P.length&&!D.length)return'';
 const pxN=evPx;
 return`<div class=evdrop><div class=sub>規劃中（${P.length}／${EV_PLAN_MAX}）</div>${P.length?P.map(T=>{const age=dDays(T.created||TODAY,TODAY);return`<div class=tmr><b>${esc(T.id)} ${esc(cU(T.code))} ${esc(nameOf(T.code))}</b>（${esc(T.sid||'')}${T.ovr?'，<span class=wn>規則外觀察</span>':''}）建立 ${age} 天${age>=60?' <span class=wn>超過 60 天沒有動作</span>':''} <button onclick="evOpen({codes:['${cU(T.code)}'],sid:'${T.sid}'})">🔍</button><button onclick="evDrop('${T.id}')">放棄</button></div>`}).join(''):'<div class=h>沒有</div>'}
 ${D.length?`<details><summary class=sub>放棄紀錄（${D.length}）</summary>${D.slice(0,20).map(T=>{const p0=num(T.exit.px),p1=pxN(T.code);return`<div class=tmr>${esc(T.exit.date||'')} ${esc(T.id)} ${esc(cU(T.code))} ${esc(nameOf(T.code))}（${esc(T.sid||'')}）：放棄時 ${p0!=null?f2(p0):'—'} → 現在 ${p1!=null?f2(p1):'—'}${p0&&p1?` <b class="${stCls(p1-p0)}">${aaPct?aaPct((p1/p0-1)*100):''}</b>`:''}${T.exit.note?`<div class=h>${esc(T.exit.note)}</div>`:''}</div>`}).join('')}<div class=h>放棄的論點不算策略績效；用來回頭看「不買」的決定對不對。</div></details>`:''}</div>`}
