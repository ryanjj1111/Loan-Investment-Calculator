// 🤖 AI 討論：「📋 問 AI」把 App 已經算好的資料整理成一段文字（複製或分享給任何 AI），
// AI 用「投資帳本 v1」回覆後，在「📥 貼上回覆」匯入（ai-import.js）。
// 分工：App 管數字和規則，AI 管查資料和挑毛病，你管決定和紀錄。
// 依賴 check.js（exEval、exTrig、ckGroups、ckAiText）、strategy-engine.js、asset-engine.js、asset-ui.js、ai-import.js

const AA_Q={exit:'出場訊號',buy:'買或加碼',review:'月底復盤',fill:'補資料',free:'自由提問'};
const AA_SC={alert:'有提醒的持股',one:'這一檔',pick:'自己勾',all:'整個投資組合'};
const AA_VIEW=['資料無誤且適用','前提不成立','資料有誤','有一次性因素','查不到'];
let AA={q:'exit',scope:'alert',codes:[],th:'',rule:'',amt:0,merge:1,free:''};

// ---------- 快照編號：資料日期＋持股代號與股數＋策略版本＋各論點停損價的截短雜湊（還原不出內容）
function aaHash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
function aaSnap(){const H=holdings(S).filter(o=>o.q>0).map(o=>o.ac+cU(o.n)+':'+o.q).sort().join(','),G=(S.strategies||[]).map(s=>s.id+'v'+s.ver).sort().join(','),
 T=(S.theses||[]).filter(t=>t.status!='exit').map(t=>t.id+':'+(num(t.stop)??'')).sort().join(',');return'K'+aaHash([CK?CK.d:'',H,G,T].join('|')).slice(0,6)}
const aaLast=()=>{try{return JSON.parse(ls('lcaiask')||'null')}catch(e){return null}};

// ---------- 範圍
const aaThOf=c=>(S.theses||[]).find(T=>cU(T.code)==c&&T.status=='hold')||(S.theses||[]).find(T=>cU(T.code)==c&&T.status=='plan')||null;
function aaAlertCodes(){const A=typeof stAlerts=='function'?stAlerts(S):[],out=[];for(const a of A){if(!a.th||!/^(exit|stop|tgt|cap)$/.test(a.k))continue;const T=stThesis(S,a.th);if(T&&!out.includes(cU(T.code)))out.push(cU(T.code))}return out}
function aaActive(){const o=[];for(const h of holdings(S))if(h.ac=='a'&&h.q>0&&!o.includes(cU(h.n)))o.push(cU(h.n));for(const T of S.theses||[])if(T.status=='plan'&&!o.includes(cU(T.code)))o.push(cU(T.code));return o}
function aaCodes(){if(AA.q=='fill')return[];if(AA.scope=='alert')return aaAlertCodes();if(AA.scope=='all')return aaActive();return AA.codes.filter(Boolean)}

// ---------- 文字
const aaPct=v=>v==null||!isFinite(v)?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
function aaMarket(){const L=[],t=CK&&CK.mkt&&CK.mkt.taiex;
 if(t&&t.c)L.push(`加權指數 ${f2(t.c)}，離 250 日高點 ${aaPct((t.c/t.hi250-1)*100)}，${t.c>=t.m20?'在月線之上':'低於月線'}、${t.c>=t.m60?'在季線之上':'低於季線'}`);
 try{const H=asHeatCap(S);if(H.tot!=null&&H.cap!=null)L.push(AA.amt?`壓力虧損 ${W2(H.tot)} 萬／剩下的虧損額度 ${W2(H.cap)} 萬（信貸虧損上限已用 ${H.L?H.L.used.toFixed(0):'—'}%）`:`壓力虧損約是剩下虧損額度的 ${H.cap>0?(H.tot/H.cap*100).toFixed(0):'—'}%（信貸虧損上限已用 ${H.L?H.L.used.toFixed(0):'—'}%）`)}catch(e){}
 const es=asExitStat(S);if(es.n)L.push(`出場訊號照規則賣出 ${es.f}／${es.n} 次`);
 return L.length?'【大環境】\n'+L.map(s=>'- '+s).join('\n'):''}
function aaStock(c){const T=aaThOf(c),st=T?stStrat(S,T.sid):(AA.sid?stStrat(S,AA.sid):null),L=[],E=stExposure(S),px=num((S.px||{})[c]),q=AA.q;
 const r=asRows(S).filter(o=>o.c==c&&o.open),qty=r.reduce((a,o)=>a+o.q,0),mv=r.reduce((a,o)=>a+(o.mv||0),0);
 const p=T?stPerf(S,T):null,avg=p&&p.q>0?p.cost/p.q:null,stop=T?num(T.stop):null;
 L.push(`■ ${c} ${nameOf(c)}${!T&&st?`｜還沒有論點，打算用 ${st.id} ${st.name} v${st.ver} 買進`:''}${T?`｜${T.id}｜${st?st.id+' '+st.name+' v'+(T.sver||st.ver):T.sid}｜${+T.useInit===1?'撥款前持股，'+(T.baseD||T.created)+' 歸入策略':'起算 '+(T.baseD||(p&&p.first)||T.created)}${T.status=='plan'?'｜規劃中（還沒買）':''}`:'｜沒有論點'}`);
 const pos=[];if(E.tot>0&&E.by[c])pos.push(`占主動資本 ${(E.by[c]/E.tot*100).toFixed(1)}%`);if(px!=null)pos.push(`現價 ${f2(px)}`);if(avg!=null){pos.push(`策略均價 ${f2(avg)}`);if(px!=null)pos.push(`損益 ${aaPct((px/avg-1)*100)}`)}
 if(stop!=null&&px!=null){pos.push(`停損 ${f2(stop)}（距現價 ${aaPct((stop/px-1)*100)}）`);if(E.tot>0&&qty)pos.push(`停損風險占主動資本 ${(qty*Math.max(0,px-stop)/E.tot*100).toFixed(1)}%${st&&num(st.riskPct)!=null?'（策略每筆 '+st.riskPct+'%）':''}`)}
 const rm=T&&p&&typeof stRmul=='function'?stRmul(T,p.ret):null;if(rm!=null)pos.push(`${rm>=0?'+':''}${rm.toFixed(2)}R`);
 if(AA.amt&&qty)pos.push(`股數 ${qty.toLocaleString()}｜市值 ${W2(mv)} 萬`);
 if(pos.length)L.push(pos.join('｜'));
 if(T){if(T.metLate)L.push(`註記：${T.metLate}`);if(T.why)L.push(`買進理由：${T.why}`);if(T.wrongIf)L.push(`什麼情況代表我錯了：${T.wrongIf}`)}
 if(T&&st&&T.status=='hold'&&(q=='exit'||q=='review'||q=='free'||q=='buy')){const X=exEval(T),ok=[];if(X.length){L.push('出場條件（'+st.id+' 何時賣）：');
  for(const x of X){const a=exAckOf(T,x.key),r0=x.r,ic=a&&a.k=='na'?'🚫':!r0?'❔':r0.v===true?'🔴':r0.pre?'⏸':r0.v===false?'✓':'⏳';
   if(ic=='✓'&&AA.merge&&!(AA.th==T.id&&AA.rule==x.key)){ok.push(X.filter(z=>z.lb==x.lb).length>1?`${x.lb}（${x.cond.length>16?x.cond.slice(0,16)+'…':x.cond}）`:x.lb);continue}
   L.push(`  ${ic} ${x.lb}：${x.cond}${x.act?' → '+x.act:''}${r0&&(r0.why||r0.miss)?`\n     （${[r0.why,r0.miss].filter(Boolean).join('；')}）`:''}${a?`\n     ［我已決定：${EX_KN[a.k]||'已處理'}${a.n?'：'+a.n:''}，${a.d}］`:''}${AA.th==T.id&&AA.rule==x.key?'\n     ← 這次要討論的訊號':''}`)}
  if(ok.length)L.push(`  ✓ 沒有成立：${ok.join('、')}`)}
  const G=typeof exTrig=='function'?exTrig(T).slice(0,4):[];if(G.length)L.push('今天收盤的觸發價：'+G.map(o=>`收盤 ${o.dir} ${o.ap?'約 ':''}${f2(o.px)}${o.gap!=null?'（距現價 '+aaPct(o.gap)+'）':''} ${o.what}`).join('；'))}
 if(st&&(q=='buy'||q=='review'||q=='free')&&CK){const G=ckGroups(st,c),M=new Set((T&&T.met)||(AT_DRAFT&&AT_DRAFT.met)||[]);L.push(`今日條件檢核（${st.id}）：`);
  for(const g of G){const ok=[],rows=[];for(const i of g.items){const r0=i.r;let ic;if(r0)ic=g.need=='none'?(r0.v===true?'⛔':r0.v===false?'✓':'⏳'):(r0.v===true?'✅':r0.v===false?'❌':'⏳');else ic=M.has(i.t)?'☑️':'❔';
    if((ic=='✅'||ic=='✓')&&AA.merge){ok.push(i.t.replace(/〔[^〕]*〕/g,''));continue}rows.push(`    ${ic} ${i.t}${r0&&(r0.why||r0.miss)?'（'+[r0.why,r0.miss].filter(Boolean).join('；')+'）':!r0?(M.has(i.t)?'（我確認過符合）':'（要自己判斷）'):''}`)}
   L.push(`  【${g.sec}】${g.need=='none'?'任何一項成立就不買':g.need=='all'?'需要全部':g.need?'至少 '+g.need+' 項':''}`);if(ok.length)L.push(`    ${g.need=='none'?'✓ 沒有':'✅ 符合'}：${ok.join('、')}`);L.push(...rows)}}
 // 前瞻資料
 const o=(S.outlook||{})[c]||{},ep=(o.eps||[]).filter(e=>e.d&&dDays(e.d,TODAY)<=200).sort((a,b)=>a.d<b.d?1:-1);
 if(ep.length)L.push('法人 EPS 預估：'+ep.map(e=>`${e.y} 年 ${e.v}（${e.src||'未註明'}，${e.d}）`).join('；'));
 if(o.guide&&o.guide.d)L.push(`法說指引（${o.guide.d}）：營收${olDirN(o.guide.rev)}、毛利率${olDirN(o.guide.gm)}${o.guide.note?'｜'+o.guide.note:''}`);
 const at=(S.attr||{})[c]||{},th=at.theme&&(S.themes||{})[at.theme];
 const ab=[['growth','結構性成長'],['cyc','景氣循環'],['lead','產業龍頭']].filter(([k])=>at[k]!=null&&at[k]!=='').map(([k,n])=>n+(+at[k]?'：是':'：否'));if(at.theme)ab.push(`主題：${at.theme}${th?'（'+olDirN(th.st)+'，'+(th.d||'')+(th.note?'，'+th.note:'')+'）':'（還沒有狀態）'}`);if(ab.length)L.push('股票屬性：'+ab.join('、'));
 const ev=(S.events||[]).filter(e=>!e.done&&cU(e.code)==c&&e.date>=ckAddD(TODAY,-3)).slice(0,3);if(ev.length)L.push('事件：'+ev.map(e=>`${e.date} ${e.type}${e.note?'（'+e.note.slice(0,80)+'）':''}`).join('；'));
 if(T){const lg=(T.exLog||[]).slice(-4);if(lg.length)L.push('過去的出場決定：'+lg.map(x=>`${x.d} ${x.lb||''} ${EX_KN[x.k]||x.k}${x.n?'（'+x.n+'）':''}${x.aiV?`［當時 AI：${x.aiV}］`:''}`).join('；'));
  const rv=(T.aiRev||[]).slice(-3);if(rv.length)L.push('之前 AI 的看法：'+rv.map(x=>`${x.d} ${x.rule||''}：${x.view}${x.ai?'（'+x.ai+'）':''}`).join('；'))}
 return L.join('\n')}
function aaPortfolio(){const L=['【組合】'],E=stExposure(S);const by={};for(const T of S.theses||[]){if(T.status!='hold')continue;(by[T.sid]=by[T.sid]||[]).push(T.id+' '+cU(T.code))}
 for(const st of S.strategies||[])if(by[st.id])L.push(`- ${st.id} ${st.name} v${st.ver}：${by[st.id].join('、')}`);
 const pas=holdings(S).filter(h=>h.ac=='p'&&h.q>0).map(h=>cU(h.n));if(pas.length)L.push(`- 被動：${[...new Set(pas)].join('、')}`);
 return L.join('\n')}
function aaAsk(){const q=AA.q,T=AA.th?stThesis(S,AA.th):null,x=T&&AA.rule?(exEval(T).find(z=>z.key==AA.rule)||null):null,ex=(AA.free||'').trim();
 if(q=='exit')return`【要你做的事】
${x?`這次要討論的是 ${T.id} ${cU(T.code)} ${nameOf(T.code)} 的「${x.lb}：${x.cond}」。`:'上面標 🔴 的出場訊號。'}請只查三件事，決定由我做：
1. App 給的資料對不對（附來源和日期）。
2. 這條規則的適用前提成不成立（只能引用上面的策略條文）。
3. 有沒有一次性因素（例如存貨跌價、匯兌、業外）。
以上三項都查不到，預設照規則。${ex?'\n補充：'+ex:''}`;
 if(q=='buy')return`【要你做的事】
上面這幾檔目前 ❌、⏳、❔ 的條件，請查有沒有最新、有來源的資料可以更新（法人 EPS 預估、法說指引、主題狀態）。
要自己判斷的條件（❔），請說明你的判斷和依據，但不要在 json 裡替我勾。
最後列出：照目前的規則，每一檔是可以買、不買，還是還差什麼。${ex?'\n補充：'+ex:''}`;
 if(q=='review')return`【要你做的事】月底復盤
1. 出場訊號照規則的比例與偏離紀錄，有沒有需要檢討的模式。
2. 更新每一檔的法人 EPS 預估與主題狀態（附來源）。
3. 壓力虧損、集中度（個股、主題）的風險。
4. 下個月要注意的事件（營收、財報、法說、除息）。
策略規則本身的修改只在每季檢討時做，這次不要提出策略修改。${ex?'\n補充：'+ex:''}`;
 if(q=='free')return`【我的問題】\n${ex||'（請在 App 裡填寫問題）'}`;return''}
const AA_RULES=`【回答規則】
1. 三種來源分開標：【App】上面 App 給的數字、【查到】你查到的（附來源和日期）、【推論】你自己的推論。
2. 先寫最不利於續抱的解讀，再寫另一面。
3. 不建議放寬停損或延後出場；認為規則不適用時，只能引用策略條文或指出資料錯誤。
4. EPS 預估只輸出寫明機構、日期、數字的；未具名來源不要輸出。查不到就寫查不到，不要推算。
5. 決定由我做，不用替我選「照規則賣出／不適用／不照做」。`;
function aaFmt(snap){const q=AA.q,y=+TODAY.slice(0,4),Ts=(S.theses||[]).filter(T=>T.status!='exit').map(T=>{const st=stStrat(S,T.sid);return`${T.id} ${cU(T.code)} ${T.sid} v${T.sver||(st&&st.ver)||''}`});
 const ex={format:'投資帳本 v1',ai:'你的名稱（例如 Claude、Gemini）',q,snap};
 const T0=(AA.th&&stThesis(S,AA.th))||aaThOf(aaCodes()[0]||'')||(S.theses||[])[0]||{id:'T001',code:'2301'},x0=AA.th&&AA.rule&&T0?(exRules(stStrat(S,T0.sid))||[]).find(z=>z.key==AA.rule):null,c0=cU(T0.code||'2301');
 const rv={thesis:T0.id,rule:x0?x0.lb:'理由失效',view:'資料無誤且適用',why:'一句話',src:[{name:'來源',date:TODAY,url:'https://…'}]},ol={code:c0,eps:[{year:y+1,eps:12.34,src:'FactSet 分析師中位數（鉅亨網）',date:TODAY}],guide:{rev:'up',gm:'flat',date:TODAY,src:'法說會',note:'一句重點'}},
  tm={name:'AI 伺服器',status:'up',date:TODAY,src:'來源',note:'一句重點'},ev={date:TODAY,code:c0,type:'法說',note:'一句重點'},up={thesis:T0.id,stop:123.4};
 const K=q=='exit'?['review','outlook','events']:q=='buy'?['manual','outlook','themes','events','updates']:q=='review'?['outlook','themes','events','updates']:q=='fill'?['outlook','themes']:['review','outlook','themes','events','updates'];
 const mn={code:c0,cond:'條件原文（照上面的寫法）',ok:true,why:'一句話',src:[{name:'來源',date:TODAY}]};
 const D={manual:'manual：要自己判斷的條件（❔）你的看法，一條一筆，cond 照抄條件原文；App 只顯示你的看法，不會替我勾',review:`review：每一條討論的訊號一筆。view 只能是「${AA_VIEW.join('／')}」其中一個，每一筆都要附 src（來源、日期）`,outlook:'outlook：有查到才放；eps 要寫明機構與日期，guide 的 rev、gm 用 up／flat／down',themes:'themes：主題狀態 status 用 up／flat／down，附來源與日期',events:'events：之後要注意的日期（法說、財報、除息）',updates:'updates：只能把停損價往上調（收緊），不要往下調'};
 const eg=Object.assign({},ex);for(const k of K)eg[k]=[{manual:mn,review:rv,outlook:ol,themes:tm,events:ev,updates:up}[k]];
 return`【輸出格式】
最後請把要匯回 App 的內容放在一個 \`\`\`json 區塊，格式是「投資帳本 v1」，只放有根據的內容：
- 一定要有 "format"、"ai"（你的名稱）、"q":"${q}"、"snap":"${snap}"（照抄，App 用來檢查資料有沒有變）
${K.map(k=>'- '+D[k]).join('\n')}
- 不要輸出 strategies、trades、theses：策略修改只在每季檢討時做，交易我自己記。
範例：
${JSON.stringify(eg)}
現有論點與策略版本：${Ts.join('｜')||'（沒有）'}`}
function aaText(){const snap=aaSnap(),q=AA.q,P=[`【投資帳本｜${AA_Q[q]}】${TODAY}｜資料日 ${CK?CK.d:'—'}｜快照 ${snap}`,'分工：App 管數字和規則，AI 管查資料和挑毛病，我管決定和紀錄。'];
 if(q=='fill'){let t=typeof ckAiText=='function'?ckAiText():'';const k=t.indexOf('最後請用');if(k>0)t=t.slice(0,k).trim();P.push(t||'目前沒有待補資料。');P.push(AA_RULES);P.push(aaFmt(snap));return P.join('\n\n')}
 P.push(aaMarket());if(q=='review')P.push(aaPortfolio());const C=aaCodes();
 if(!C.length&&q!='free')P.push('（這個範圍沒有股票）');for(const c of C)P.push(aaStock(c));
 P.push(aaAsk());P.push(AA_RULES);P.push(aaFmt(snap));return P.filter(Boolean).join('\n\n')}

// ---------- 畫面（在 ai-import.js 的 🤖 AI 討論面板「📋 問 AI」分頁）
function aaInit(o){o=o||{};if(o.th&&o.rule)AA_CTX={from:'exit',th:o.th,rule:o.rule};else if(o.from=='trade'){}else if(o.q)AA_CTX=null;const al=aaAlertCodes();let codes=o.codes?o.codes.map(cU):[];if(o.th&&!codes.length){const T=stThesis(S,o.th);if(T)codes=[cU(T.code)]}
 const q=o.q||(al.length?'exit':'review');AA=Object.assign({},AA,{q,th:o.th||'',rule:o.rule||'',sid:o.sid||'',free:'',codes,scope:codes.length?(codes.length==1?'one':'pick'):q=='review'?'all':q=='exit'&&al.length?'alert':'all'})}
window.aaSet=(k,v)=>{AA[k]=v;if(k=='q'){if(v=='review'&&AA.scope!='pick')AA.scope='all';if(v!='exit')AA.rule=''}if(k=='scope'&&v=='pick'&&!AA.codes.length)AA.codes=aaAlertCodes();aaRender()};
window.aaPick=(c,on)=>{AA.codes=AA.codes.filter(x=>x!=c);if(on)AA.codes.push(c);aaRender()};
function aaRender(){const el=$('aiAsk');if(!el)return;const t=aaText(),al=aaAlertCodes(),nm=c=>esc(c+' '+nameOf(c));
 const T=AA.th?stThesis(S,AA.th):null,x=T&&AA.rule?exRules(stStrat(S,T.sid)).find(z=>z.key==AA.rule):null;
 const scs=Object.entries(AA_SC).filter(([k])=>k!='one'||AA.codes.length==1).map(([k,v])=>`<option value="${k}" ${AA.scope==k?'selected':''}>${v}${k=='alert'?'（'+al.length+' 檔）':k=='all'?'（'+aaActive().length+' 檔）':k=='one'?'：'+nm(AA.codes[0]):''}</option>`).join('');
 el.innerHTML=`${AA_CTX&&AA_CTX.from=='trade'&&AT_DRAFT?`<div class=stal style="margin-bottom:6px">從交易表單來的（${esc(cU(AT_DRAFT.c))} ${esc(nameOf(AT_DRAFT.c))}）<button class=lk onclick="aaBackTrade()">↩ 不匯入，回到交易表單</button></div>`:''}<div class=h>按「📋 複製」後貼到任何 AI 對話（Claude、Gemini…）。AI 用「投資帳本 v1」回覆後，切到「📥 貼上回覆」匯入；匯入前都會先預覽。</div>
 <div class=sub>要問什麼</div><div class=aiseg>${Object.entries(AA_Q).map(([k,v])=>`<button class="${AA.q==k?'on':''}" onclick="aaSet('q','${k}')">${v}</button>`).join('')}</div>
 ${x&&AA.q=='exit'?`<div class=stal style="margin-top:6px">要討論的訊號：<b>${esc(T.id)} ${nm(cU(T.code))}｜${esc(x.lb)}</b>：${esc(x.cond)} <button class=lk onclick="AA.th='';AA.rule='';aaRender()">不限這一條</button></div>`:''}
 ${AA.q=='fill'?`<div class=h style="margin-top:6px">範圍：資產頁「✏️ 待補資料」裡缺的與要更新的資料。</div>`:`<div class=sub>範圍</div><select onchange="aaSet('scope',this.value)">${scs}</select>
 ${AA.scope=='pick'?`<div class=aipk>${aaActive().map(c=>`<label class=ck><input type=checkbox ${AA.codes.includes(c)?'checked':''} onchange="aaPick('${c}',this.checked)">${nm(c)}</label>`).join('')}</div>`:''}`}
 ${AA.q=='free'?`<div class=sub>你的問題</div><textarea id=aaFree rows=3 style="width:100%" oninput="AA.free=this.value" onchange="aaRender()">${esc(AA.free)}</textarea>`:`<details ${AA.free?'open':''}><summary class=h>補充問題（可不填）</summary><textarea id=aaFree rows=2 style="width:100%" oninput="AA.free=this.value" onchange="aaRender()">${esc(AA.free)}</textarea></details>`}
 <label class=ck><input type=checkbox ${AA.amt?'checked':''} onchange="aaSet('amt',this.checked?1:0)">附上股數與金額（預設只放比例；貼給其他公司的 AI 時建議不勾）</label>
 <label class=ck><input type=checkbox ${AA.merge?'checked':''} onchange="aaSet('merge',this.checked?1:0)">✓ 的條件合併成一行（只展開 🔴、❔、⏸）</label>
 <div class=asbtn><button class=pri onclick="aaCopy()">📋 複製</button>${navigator.share?'<button onclick="aaShare()">📤 分享到 AI App</button>':''}</div>
 <details class=aapv><summary class=h>預覽（${t.length.toLocaleString()} 字）</summary><pre>${esc(t)}</pre></details>`}
function aaMark(){try{ls('lcaiask',JSON.stringify({q:AA.q,th:AA.th,rule:AA.rule,snap:aaSnap(),at:new Date().toISOString()}))}catch(e){}}
window.aaCopy=()=>{const t=aaText(),ok=()=>{aaMark();toast(`已複製（${t.length.toLocaleString()} 字），貼到 AI 對話；回覆後到「📥 貼上回覆」`,0)},fb=()=>{const e=document.createElement('textarea');e.value=t;document.body.appendChild(e);e.select();try{document.execCommand('copy')}catch(x){}e.remove();ok()};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()};
window.aaShare=async()=>{const t=aaText();try{await navigator.share({text:t});aaMark()}catch(e){if(e&&e.name!='AbortError')aaCopy()}};

// ---------- 貼上回覆的後果差異（2026-11-11）：在副本上試算，只列會改變的判斷；每一條標出是哪一筆造成的
// 範圍：每個論點的可以買／不買、出場條件 🔴／✓／⏸、提醒列（含超過上限）、停損距離、壓力虧損
function aiJudge(){const J={},px=c=>num((S.px||{})[cU(c)]);
 for(const T of S.theses||[]){if(T.status=='exit')continue;const nm=`${T.id} ${cU(T.code)} ${nameOf(T.code)}`;
  try{const v=ckVerdict(T);if(v)J['v|'+T.id]={lb:`${nm}：判斷`,v:v.t}}catch(e){}
  if(T.status=='hold')try{for(const x of exEval(T)){const a=exAckOf(T,x.key),r=x.r;J['x|'+T.id+'|'+x.key]={lb:`${nm}：出場「${x.lb}」`,v:a&&a.k=='na'?'🚫 不適用':!r?'❔':r.v===true?'🔴 成立':r.pre?'⏸ 起算前已知':r.v===false?'✓ 沒有成立':'⏳ 資料不足'}}}catch(e){}
  const st=num(T.stop),p=px(T.code);if(T.status=='hold'&&st!=null&&p)J['s|'+T.id]={lb:`${nm}：離停損`,v:((st/p-1)*100).toFixed(1)+'%'}}
 try{for(const a of stAlerts(S))J['a|'+a.t]={lb:'提醒',v:a.t,al:1}}catch(e){}
 try{const H=asHeatCap(S);if(H.tot!=null)J['h']={lb:'壓力虧損',v:`${W2(H.tot)} 萬／剩下的額度 ${W2(H.cap)} 萬`}}catch(e){}
 return J}
function aiSim(P,only){const S0=S,on=new Map();for(const t of['tr','th','up','ev','ol','tm','sg','rv','mn'])for(const it of P[t]||[]){on.set(it,it.on);if(only)it.on=only===it?1:0}
 let J=null;try{S=clone(S0);if(typeof CKM!='undefined')for(const k in CKM)delete CKM[k];aiApplyTo(P);J=aiJudge()}catch(e){console.warn('aiSim',e);J=null}finally{S=S0;for(const[it,v]of on)it.on=v}return J}
function aiDiffOf(A,B){const L=[];for(const k of new Set([...Object.keys(A),...Object.keys(B)])){const a=A[k],b=B[k];if(a&&b&&a.v===b.v)continue;
  if((a&&a.al)||(b&&b.al)){L.push({k,t:a?`不再提醒：${a.v}`:`新增提醒：${b.v}`});continue}L.push({k,t:`${(a||b).lb}：${a?a.v:'（沒有）'} → ${b?b.v:'（沒有）'}`})}return L}
const aiItLb=(t,it)=>t=='tr'?`交易 ${it.x?it.x.n:''}`:t=='th'?`論點 ${it.merge?it.merge.id:it.c||''}`:t=='up'?`修改 ${it.T?it.T.id:''}`:t=='ev'?`事件 ${it.e?it.e.code+' '+it.e.type:''}`:t=='ol'?`前瞻 ${it.c||''}`:t=='tm'?`主題 ${it.n||''}`:t=='sg'?`策略 ${it.id||''}`:t;
let AIDF_T=0;
function aiDiffRun(){clearTimeout(AIDF_T);AIDF_T=setTimeout(()=>{const el=$('aiDiff'),P=AIP;if(!el||!P)return;const S0J=(()=>{const S0=S;try{S=clone(S0);return aiJudge()}finally{S=S0}})(),AllJ=aiSim(P);
 if(!AllJ){el.innerHTML='<div class=h>試算不出這次匯入的影響（匯入不受影響）。</div>';return}const D=aiDiffOf(S0J,AllJ);
 if(!D.length){el.innerHTML='<div class=aidok>✓ 這次匯入不會改變任何判斷（可以買／不買、出場條件、提醒、停損距離、壓力虧損都一樣）。</div>';return}
 // 逐筆歸因：只套用那一筆時也出現同一條差異
 const ITS=[];for(const t of['tr','th','up','ev','ol','tm','sg'])(P[t]||[]).forEach(it=>{if(it.on&&!it.err.length)ITS.push([t,it])});
 const by={};if(ITS.length>1&&ITS.length<=25)for(const[t,it]of ITS){const J=aiSim(P,it);if(!J)continue;for(const d of aiDiffOf(S0J,J))(by[d.k]=by[d.k]||[]).push(aiItLb(t,it))}
 el.innerHTML=`<div class=sub>這次匯入會改變的判斷（${D.length}）</div>`+D.map(d=>`<div class=aidl>· ${esc(d.t)}${ITS.length>1?`<span class=h>　← ${esc((by[d.k]||['幾筆一起造成']).join('、'))}</span>`:''}</div>`).join('')+'<div class=h>取消勾選某一筆，這裡會跟著重算。</div>'},60)}

// ---------- 從出場訊號或交易表單進來：貼完接回決定（2026-11-11）
// AA_CTX：{from:'exit',th,rule} 或 {from:'trade'}；匯入完成後在結果頁顯示三選一，或「回到交易表單」
let AA_CTX=null,AT_DRAFT=null;
function aaAfterImport(B){const el=$('asOvB');if(!el||!AA_CTX)return;const box=document.createElement('div');box.className='stal';box.style.marginTop='8px';
 if(AA_CTX.from=='exit'){const T=stThesis(S,AA_CTX.th),x=T?(exEval(T).find(z=>z.key==AA_CTX.rule)||null):null;if(!T||!x)return;const rv=(T.aiRev||[]).filter(r=>r.batch==B.id).find(r=>r.rule&&(r.rule==x.lb||r.rule.includes(x.lb)||x.lb.includes(r.rule)))||(T.aiRev||[]).filter(r=>r.batch==B.id)[0];
  AA_CTX.view=rv?rv.view:'';AA_CTX.ai=B.ai||'';
  box.innerHTML=`<b>接著決定：${esc(T.id)} ${esc(cU(T.code))} ${esc(nameOf(T.code))}「${esc(x.lb)}」</b><div class=h>${esc(x.cond)} → ${esc(x.act||'')}｜現在：${x.r&&x.r.v===true?'🔴 成立':x.r&&x.r.pre?'⏸ 起算前已知':x.r&&x.r.v===false?'✓ 沒有成立':'⏳／❔'}</div>${rv?`<div>AI 的看法：<b>${esc(rv.view)}</b>${rv.why?'｜'+esc(rv.why):''}</div>`:'<div class=h>這次回覆沒有對這條訊號的看法（review）。</div>'}<div class=asbtn>${exBtns(T.id,x.key)}</div>`}
 else if(AA_CTX.from=='trade'&&AT_DRAFT){box.innerHTML=`<b>回到交易表單</b><div class=h>剛匯入的資料會重新判斷條件；要自己判斷的條件會顯示 AI 的看法，點一下才勾。</div><div class=asbtn><button class=pri onclick="aaBackTrade()">↩ 回到交易表單</button></div>`}
 el.insertBefore(box,el.children[2]||null)}
window.aaBackTrade=()=>{if(!AT_DRAFT)return;AT=AT_DRAFT;AT_DRAFT=null;AT._ck='';AA_CTX=null;asOvOpen(asTradeHtml());asTh();asPrev()};
// 交易表單的「🤖 問 AI」：先把填到一半的交易存起來
window.aaFromTrade=()=>{if(!AT)return;if(AT.k!='buy'){toast('買進時才能問 AI',0);return}const c=cU(AT.c);if(!c){toast('先填代號',0);return}AT_DRAFT=clone(AT);const st=AT.sid?stStrat(S,AT.sid):null;
 if(st){const g=stCondEval(st,AT.met).find(g=>/選什麼/.test(g.sec));AT_DRAFT.preAI={ok:g?g.ok:true,d:TODAY}}AA_CTX={from:'trade'};aiOpen({q:'buy',codes:[c],sid:AT.sid||'',from:'trade'})};
