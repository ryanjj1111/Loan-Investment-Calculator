// 👀 觀察名單：代號＋策略＋一句理由。不是論點、不算績效、沒有上限 5 個的限制；
// 每天用同一套策略規則（eval.js 的 evCheck）判斷，依「還差幾項」排序，條件都符合時在「今日」提醒。
// 資料存在設定檔頂層的 watch（舊版本會原樣保留）；信貸與損益的計算不讀它。
// 依賴 eval.js（evCheck、evPx、evOpen、evRender）、check.js（CK）、strategy-engine.js（stStrat）、asset-engine.js（asThesisOf）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

const WL_MAX=30,WL_X='X';let WLC={k:'',L:[]};
// 工具自選（2026-11-21）：和自己的策略無關、由晨報每週候選或 Claude 研究挑出來的；不跑策略檢核，只追蹤價格與理由
const wlSidN=sid=>sid==WL_X?'工具自選':sid;
const wlAll=()=>Array.isArray(S.watch)?S.watch:[];
const wlHas=(c,sid)=>wlAll().some(w=>w.c==cU(c)&&w.sid==sid);
window.wlAdd=(c,sid)=>{c=cU(c);if(!c||!sid||wlHas(c,sid))return;if(wlAll().length>=WL_MAX){toast(`觀察名單最多 ${WL_MAX} 檔，先移除不看的`,0);return}
 const px=typeof evPx=='function'?evPx(c):null;S.watch=wlAll().concat([{c,sid,d:TODAY,px0:px!=null?px:null,note:''}]);save();toast(`已加入觀察名單：${c} ${nameOf(c)}（${sid}）`,0);wlRe()};
window.wlDel=(c,sid)=>{S.watch=wlAll().filter(w=>!(w.c==c&&w.sid==sid));save();wlRe()};
window.wlNote=(c,sid)=>{const w=wlAll().find(x=>x.c==c&&x.sid==sid);if(!w)return;const v=prompt(`${c} ${nameOf(c)}：為什麼想觀察？（一句話，可留空）`,w.note||'');if(v===null)return;w.note=v.trim().slice(0,80);save();wlRe()};
const wlRe=()=>{WLC.k='';if($('asOv').style.display=='flex'&&$('wlBox')&&typeof evRender=='function'){evRender();wlAfter()}else if(typeof asCalc=='function')asCalc()};
// 每一筆的判斷；結果在檢核資料或名單沒變時沿用
function wlEval(){if(typeof CK=='undefined'||!CK||!CK.s||typeof evCheck!='function')return null;const k=[CK._t,CK.d,TODAY,JSON.stringify(wlAll()),(S.theses||[]).length,(S.trades||[]).length].join('|');if(WLC.k==k)return WLC.L;
 const L=wlAll().map(w=>{const X=w.sid==WL_X,st=X?null:stStrat(S,w.sid),T=typeof asThesisOf=='function'?asThesisOf(S,w.c):null;let r=null;try{if(st)r=evCheck(w.c,st)}catch(e){}
  const px=typeof evPx=='function'?evPx(w.c):null,dr=w.draft||{};return{w,st,T,v:X?'tool':r?r.v:'bad',why:X?(dr.why||w.note||'工具自選：不跑策略檢核'):r?r.why:'這個策略已經不存在',n:X?50:r?r.lack.length:99,px,chg:px!=null&&w.px0>0?(px/w.px0-1)*100:null}});
 const o={ok:0,wait:1,tool:1.5,bad:2};L.sort((a,b)=>o[a.v]-o[b.v]||a.n-b.n||(a.w.c<b.w.c?-1:1));WLC={k,L};return L}
// 🔍 評估畫面最上面的名單
function wlHtml(){const A=wlAll();if(!A.length)return`<div id=wlBox class=evdrop><div class=sub>👀 觀察名單</div><div class=h>還沒有。評估一檔股票，或用「從策略找股票」找到想追蹤的，按「👀 加入觀察」。每天會用策略規則重新判斷。</div></div>`;
 const L=wlEval();if(!L)return`<div id=wlBox class=evdrop><div class=sub>👀 觀察名單（${A.length}）</div><div class=h>檢核資料讀取中…</div></div>`;const ic={ok:'✅',wait:'⏳',bad:'⛔',tool:'🧭'},nOk=L.filter(x=>x.v=='ok'&&!x.T).length;
 return`<div id=wlBox class=evdrop><div class=sub>👀 觀察名單（${A.length}）${nOk?`　<span class=ok>${nOk} 檔可以準備買</span>`:''}</div>${L.map(x=>{const w=x.w,age=Math.round((Date.parse(TODAY)-Date.parse(w.d||TODAY))/864e5);
  const X=w.sid==WL_X,op=X?`evOpen({codes:['${w.c}'],mode:'stock'})`:`evOpen({codes:['${w.c}'],sid:'${w.sid}',mode:'stock'})`,dr=w.draft||{};
  return`<div class=tmr><a href="#" onclick="${op};return false"><b>${ic[x.v]} ${esc(w.c)} ${esc(nameOf(w.c))}</b></a>（${esc(wlSidN(w.sid))}）${x.T?` <span class="thc on">已有 ${esc(x.T.id)}</span>`:''}${x.chg!=null?` <span class=h>加入後</span> <b class="${x.chg>=0?'ok':'bad'}">${x.chg>=0?'+':''}${x.chg.toFixed(1)}%</b>`:''} <span class=h>${age} 天</span>
   <div class="${x.v=='ok'?'ok':'h'}">${x.v=='ok'?'條件都符合，可以準備買':(X?'💡 ':'')+esc(String(x.why).slice(0,X?140:90))}</div>${dr.risk?`<div class=h>⚠️ 風險：${esc(String(dr.risk).slice(0,90))}</div>`:''}${(dr.pillars||[]).length?`<div class=h>支柱草稿 ${dr.pillars.length} 根${(dr.peers||[]).length?`｜同業 ${esc(dr.peers.join('、'))}`:''}</div>`:''}${dr.src?`<div class=h>來源：${esc(String(dr.src).slice(0,80))}</div>`:''}${w.note?`<div class=h>📝 ${esc(w.note)}</div>`:''}
   <button onclick="${op}">🔍 ${X?'評估':'看條件'}</button>${x.T?'':`<button onclick="wlPlan('${w.c}','${w.sid}')">📋 轉成規劃中</button>`}<button onclick="wlNote('${w.c}','${w.sid}')">📝</button><button onclick="wlDel('${w.c}','${w.sid}')">移除</button></div>`}).join('')}
  <div class=h>依「可以買 → 還差幾項 → 工具自選 → 不買」排序。只是追蹤，不是論點，不算進策略績效。「📋 轉成規劃中」會建立規劃中論點並帶入草稿（買進理由、錯了條件、支柱、同業），打開表單讓你改。</div></div>`}
// 觀察名單 → 規劃中論點（2026-11-21）：選策略（工具自選的要選一個，或「U 不歸類」）→ 建立論點、帶入草稿 → 從觀察名單移除 → 打開論點表單
const wlPlanN=()=>(S.theses||[]).filter(T=>T.status=='plan').length,WL_PMAX=()=>typeof EV_PLAN_MAX!='undefined'?EV_PLAN_MAX:5;
window.wlPlan=(c,sid)=>{c=cU(c);const w=wlAll().find(x=>x.c==c&&x.sid==sid);if(!w)return;
 if(wlPlanN()>=WL_PMAX()){toast(`規劃中論點已有 ${wlPlanN()} 個（上限 ${WL_PMAX()}）：先在「🔍 評估 → 規劃中」放棄一個`,0);return}
 const on=(S.strategies||[]).filter(s=>+s.on),pre=sid!=WL_X&&stStrat(S,sid)?sid:'';
 asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>📋 ${esc(c)} ${esc(nameOf(c))} 轉成規劃中</b></div>
  <div class=h>選這筆投資要照哪個策略。App 判斷不是 ✅ 的會標「規則外觀察」，績效另外算；「U 不歸類」不套策略規則，只看停損與重新評估日。</div>
  <div class=chips style="margin-top:8px">${on.map(st=>`<button class="${st.id==pre?'pri':''}" onclick="wlPlanGo('${c}','${sid}','${st.id}')">${esc(st.id)} ${esc(typeof evNm=='function'?evNm(st):st.name||'')}</button>`).join('')}<button onclick="wlPlanGo('${c}','${sid}','${ST_U}')">U 不歸類</button></div>
  <div class=asbtn style="margin-top:8px"><button onclick="evOpen({mode:'stock'})">← 回觀察名單</button></div>`)};
window.wlPlanGo=(c,sid,nsid)=>{const w=wlAll().find(x=>x.c==c&&x.sid==sid);if(!w)return;if(wlPlanN()>=WL_PMAX())return;
 const dr=w.draft||{},st=nsid==ST_U?null:stStrat(S,nsid),T=stNewThesis(S,{code:c,sid:nsid,status:'plan'});if(st)T.sver=st.ver;
 T.why=String(dr.why||w.note||'');T.wrongIf=String(dr.wrongIf||'');if(dr.risk)T.riskNote=String(dr.risk);
 if(Array.isArray(dr.pillars)&&dr.pillars.length)T.pillars=dr.pillars.slice(0,3).map(p=>({t:String(p.t||''),chk:String(p.chk||'')}));
 if(Array.isArray(dr.peers)&&dr.peers.length)T.peers=dr.peers.slice(0,5);T.src0=sid==WL_X?'tool':'watch';if(w.px0!=null)T.wpx0=w.px0;
 if(st&&typeof evCheck=='function'){try{const r=evCheck(c,st);if(r.v!='ok')T.ovr={d:TODAY,v:r.v,why:r.why}}catch(e){}}
 S.theses.push(T);S.watch=wlAll().filter(x=>x!==w);asClose();stOpen.add(T.id);stFilter='all';if(stTab!='th'){stTab='th';ls('lcst','th')}setWs('st');upd();
 toast(`已建立規劃中論點 ${T.id}（${c} ${nameOf(c)}）${T.ovr?'，標「規則外觀察」':''}：請補停損、分批，確認草稿`,0)};
// 評估卡、篩選結果上的按鈕
const wlBtn=(c,sid)=>wlHas(c,sid)?`<button onclick="wlDel('${cU(c)}','${sid}')">👀 觀察中（移除）</button>`:`<button onclick="wlAdd('${cU(c)}','${sid}')">👀 加入觀察</button>`;
const wlMini=(c,sid)=>wlHas(c,sid)?' <span class=h>👀 觀察中</span>':` <button onclick="wlAdd('${cU(c)}','${sid}')">👀</button>`;
// 「今日」：有條件都符合、而且還沒建論點的才提醒
function wlAfter(){const el=$('wlToday');if(!el)return;if(typeof isS=='function'&&isS()||!wlAll().length){el.innerHTML='';return}const L=wlEval();if(!L){el.innerHTML='';return}const G=L.filter(x=>x.v=='ok'&&!x.T);
 el.innerHTML=G.length?`<div class=p style="margin-bottom:10px"><div class="asl alll" onclick="evOpen({mode:'stock'})"><span><b>👀 觀察名單：${G.length} 檔可以準備買</b> <span class=h>${G.slice(0,4).map(x=>esc(x.w.c)+' '+esc(nameOf(x.w.c))+'（'+esc(x.w.sid)+'）').join('、')}</span></span><button>看 ›</button></div></div>`:''}
