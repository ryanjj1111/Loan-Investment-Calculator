// 🤖 財報季檢查＋提醒分流（2026-11-15）
// 持股多的時候，財報／營收公布後每檔都要按「仍成立／有疑慮」。這裡做三件事：
//   1) 一次把這些論點整理給 AI，逐檔回一行看法（仍成立／有疑慮／查不到，附來源）；
//   2) 提醒列分流：出場規則沒有觸發、AI 也沒有疑慮的收成一行，可以整批標「仍成立」；有變化的排最上面；
//   3) 已經過期的「財報公布期限」這類純日期提醒先收起來。
// AI 的看法只顯示在旁邊並記進論點的 aiRev，不會替你按「仍成立」。不改任何規則判斷與損益計算。
// 依賴 strategy-engine.js（stThesis、stStrat）、check.js（exEval）、asset-ui.js（asAlRow、asRev）、ai-import.js（aiExtract、rpSave）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

const SS_VIEW=['仍成立','有疑慮','查不到'];let SSP=null,SSOPEN=0;
const ssFin=A=>A.filter(a=>a.th&&(a.k=='fin'||a.k=='rev'));
// 這個論點的出場規則有沒有 🔴（成立、不是起算前就知道的、也還沒做決定）
function ssRed(T){try{return exEval(T).filter(x=>x.r&&x.r.v===true&&!x.r.pre&&!(T.exAck&&T.exAck[x.key]))}catch(e){return[]}}
// 最近 45 天內的財報季 AI 看法
const ssAi=T=>{const L=(T.aiRev||[]).filter(r=>r.q=='season'&&r.d&&(Date.parse(TODAY)-Date.parse(r.d))/864e5<=45);return L[L.length-1]||null};
const ssCl=t=>String(t||'').replace(/〔.〕/g,'');

// ---------- 提醒列（策略頁）
function ssAlHtml(A){const row=a=>typeof asAlRow=='function'?asAlRow(a):`<div>· ${esc(a.t)}</div>`,fin=ssFin(A),ids=[...new Set(fin.map(a=>a.th))];
 const info={};for(const id of ids){const T=stThesis(S,id);info[id]={T,red:T?ssRed(T):[],ai:T?ssAi(T):null}}
 const hot=a=>{const o=info[a.th];return o&&(o.red.length||(o.ai&&o.ai.view=='有疑慮'))},calm=fin.filter(a=>!hot(a)),hotL=fin.filter(hot);
 // 過期的財報日期提醒（公布期限、預計公布日）：實質檢查在上面的「財報已公布」那一則
 const old=A.filter(a=>a.k=='ev'&&a.et=='財報'&&(()=>{const e=(S.events||[]).find(x=>x.id==a.ev);return e&&e.date<TODAY})()),rest=A.filter(a=>!fin.includes(a)&&!old.includes(a));
 const aiLine=id=>{const r=info[id]&&info[id].ai;return r?`<div class="ssai ${r.view=='有疑慮'?'wn':'h'}">🤖 ${esc(r.ai||'AI')} ${esc(r.d.slice(5))}：<b>${esc(r.view)}</b>${r.why?'　'+esc(r.why):''}${r.src&&r.src.length?`<span class=h>（${esc(r.src.join('；').slice(0,80))}）</span>`:''}</div>`:''};
 const redLine=id=>{const L=info[id]?info[id].red:[];return L.length?`<div class="ssai wn">🔴 出場規則成立：${L.map(x=>esc(ssCl(x.lb||x.cond))).join('、')}</div>`:''};
 let h='';
 if(fin.length)h+=`<div class=asbtn style="margin:4px 0 6px"><button class=pri onclick="ssOpen()">🤖 財報季檢查（${ids.length} 檔一次問）</button></div>`;
 h+=hotL.map(a=>row(a)+redLine(a.th)+aiLine(a.th)).join('');
 h+=rest.map(row).join('');
 if(calm.length){const cid=[...new Set(calm.map(a=>a.th))],nAi=cid.filter(id=>info[id].ai&&info[id].ai.view=='仍成立').length;
  h+=`<details class=ssd ${SSOPEN?'open':''} ontoggle="SSOPEN=this.open?1:0"><summary>✅ ${cid.length} 檔財報／營收公布後，出場規則都沒有觸發${nAi?`（AI 看過 ${nAi} 檔：仍成立）`:''}：<span class=h>${cid.map(id=>info[id].T?esc(cU(info[id].T.code))+' '+esc(nameOf(info[id].T.code)):esc(id)).join('、')}</span></summary>
   ${calm.map(a=>row(a)+aiLine(a.th)).join('')}</details><div class=asbtn><button onclick="ssAllOk()">✅ 這 ${cid.length} 檔全部標「仍成立」</button>${tipI('「沒有觸發」是 App 用策略的出場條件算的；還沒問 AI 的，建議先按上面的「🤖 財報季檢查」。','整批標仍成立')}</div>`}
 if(old.length)h+=`<details class=ssd><summary class=h>📅 ${old.length} 則已經過期的財報日期提醒</summary>${old.map(row).join('')}</details><div class=asbtn><button onclick="ssOldDone()">✓ 這 ${old.length} 則全部完成</button></div>`;
 return h}
const ssCalm=()=>{const A=stAlerts(S),fin=ssFin(A);return fin.filter(a=>{const T=stThesis(S,a.th);if(!T)return false;const ai=ssAi(T);return!ssRed(T).length&&!(ai&&ai.view=='有疑慮')})};
window.ssAllOk=()=>{const L=ssCalm();if(!L.length||!confirm(`把 ${new Set(L.map(a=>a.th)).size} 檔都記成「仍成立」？（每檔會留一筆檢查紀錄，註明是整批標記）`))return;
 for(const a of L){const T=stThesis(S,a.th);if(!T)continue;const ai=ssAi(T);T.reviews=T.reviews||[];T.reviews.unshift({date:TODAY,kind:a.k=='rev'?'營收':'財報',ok:1,note:'整批標記：出場規則沒有觸發'+(ai?`；AI（${ai.ai||''}）：${ai.view}`:'；沒有問 AI')})}
 upd();toast('已記錄：仍成立',0)};
window.ssOldDone=()=>{let n=0;for(const e of S.events||[])if(!e.done&&e.type=='財報'&&e.date<TODAY){e.done=1;n++}upd();toast(`已完成 ${n} 則`,0)};

// ---------- 給 AI 的文字
function ssText(){const A=stAlerts(S),ids=[...new Set(ssFin(A).map(a=>a.th))],L=[];
 for(const id of ids){const T=stThesis(S,id);if(!T)continue;const st=stStrat(S,T.sid),c=cU(T.code);let ex=[];try{ex=exEval(T)}catch(e){}
  const stt=x=>!x.r?'❔ 要自己判斷':x.r.v===true?(x.r.pre?'⏸ 起算前就知道':'🔴 成立'):x.r.v===false?'✓ 沒有成立':'⏳ 資料不足';
  L.push([`■ ${T.id}｜${c} ${nameOf(c)}｜${T.sid||'不歸類'}${st?' '+st.name:''}`,T.why?`  買進理由：${String(T.why).slice(0,160)}`:'',T.wrongIf?`  什麼情況代表錯了：${String(T.wrongIf).slice(0,200)}`:'',
   ex.length?'  出場條件（App 今天的判斷）：\n'+ex.map(x=>`   - ${ssCl(x.cond||x.lb)} → ${stt(x)}${x.r&&x.r.why?'（'+x.r.why+'）':''}`).join('\n'):'  （這個論點沒有可以自動判斷的出場條件）'].filter(Boolean).join('\n'))}
 return`【投資帳本｜財報季檢查】${TODAY}
最新一季財報（或月營收）已經公布。請上網查每一檔最新的財報與法說內容，判斷我當初的買進理由還成不成立。每一檔都要附來源與日期；查不到就寫「查不到」，不要猜。不要給買賣建議或目標價。

${L.join('\n\n')}

【回答規則】
1. 每一檔只看三件事：(a) 這季的營收、毛利率、EPS 和上一季、去年同期比，有沒有惡化；(b) 公司對下一季的說法；(c)「什麼情況代表錯了」和出場條件裡，App 標 ❔ 或 ⏳ 的那幾項現在成不成立。
2. view 只能是「仍成立」「有疑慮」「查不到」其中一個。只要 (a)(b)(c) 有一項明顯轉壞就寫「有疑慮」。
3. why 用一句話寫最關鍵的數字（40 字以內）。src 寫來源名稱與日期。
4. App 已經標 🔴 或 ✓ 的條件是用公開資料算的，除非你查到資料有誤，不用重算。

【輸出格式】先用 3 行以內說整體結論，然後輸出下面的 JSON（thesis 照抄上面的論點編號，每檔一筆）：
{"format":"投資帳本 v1","ai":"你的名稱","q":"season","season":[{"thesis":"T001","view":"仍成立","why":"一句話","src":"來源，日期"}]}`}

// ---------- 視窗：複製 → 貼上回覆 → 預覽 → 記到各檔旁邊
window.ssOpen=txt=>{SSP={txt:txt||'',L:null,err:''};asOvOpen(ssHtml());if(txt)ssRun()};
function ssHtml(){const p=SSP,t=ssText(),n=new Set(ssFin(stAlerts(S)).map(a=>a.th)).size;
 return`<div class=ovh><button onclick="asClose()">✕</button><b>🤖 財報季檢查</b></div>
 <div class=h>① 複製下面的文字，貼給<b>能上網搜尋</b>的 AI ② 把 AI 的回覆整段貼回來 ③ AI 的看法會顯示在每一檔旁邊，你看過再按「仍成立」或「有疑慮」。AI 不會替你按。</div>
 <div class=asbtn><button class=pri onclick="ssCopy()">📋 複製（${n} 檔，${t.length.toLocaleString()} 字）</button>${navigator.share?'<button onclick="ssShare()">📤 分享到 AI App</button>':''}</div>
 <details class=aapv><summary class=h>預覽</summary><pre>${esc(t)}</pre></details>
 <div class=sub>貼上 AI 的回覆</div><textarea id=ssT rows=5 style="width:100%" placeholder='整段貼上（裡面要有 "season" 的 JSON）' onchange="SSP.txt=this.value">${esc(p.txt)}</textarea>
 <div class=asbtn><button onclick="SSP.txt=$('ssT').value;ssRun()">預覽</button></div>
 ${p.err?`<div class=stal style="border-color:var(--badb);background:var(--badbg)">❌ ${esc(p.err)}</div>`:''}
 ${p.L?p.L.map(x=>`<div class=tmr>${x.T?`<b>${esc(x.T.id)} ${esc(cU(x.T.code))} ${esc(nameOf(x.T.code))}</b>`:`<span class=wn>${esc(x.id||'（沒寫論點）')}：找不到這個論點，略過</span>`} ${x.T?`<b class="${x.view=='有疑慮'?'wn':x.view=='仍成立'?'ok':'h'}">${esc(x.view)}</b>${x.why?'　'+esc(x.why):''}<div class=h>${x.src.length?esc(x.src.join('；')):'<span class=wn>沒有附來源</span>'}${x.fix?'　<span class=wn>'+esc(x.fix)+'</span>':''}</div>`:''}</div>`).join('')+`<div class=asbtn><button class=pri onclick="ssApply()">記到各檔旁邊（${p.L.filter(x=>x.T).length} 筆）</button></div>`:''}`}
const ssRe=()=>{const b=$('asOvB'),h=b.scrollTop;b.innerHTML=ssHtml();b.scrollTop=h};
const ssCp=(t,ok)=>{const fb=()=>{const e=document.createElement('textarea');e.value=t;document.body.appendChild(e);e.select();try{document.execCommand('copy')}catch(x){}e.remove();ok()};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()};
window.ssCopy=()=>ssCp(ssText(),()=>toast('已複製，貼到 AI 對話；回覆後貼回這裡',0));
window.ssShare=async()=>{try{await navigator.share({text:ssText()})}catch(e){if(e&&e.name!='AbortError')ssCopy()}};
function ssParse(j){return(Array.isArray(j&&j.season)?j.season:[]).map(o=>{const id=String(o&&o.thesis||'').trim().toUpperCase(),T=stThesis(S,id),v=String(o&&o.view||'').trim(),vv=SS_VIEW.find(x=>v==x)||SS_VIEW.find(x=>v.includes(x));
  const src=(Array.isArray(o.src)?o.src:o.src?[o.src]:[]).map(z=>typeof z=='string'?z:[z.name,z.date,z.url].filter(Boolean).join('，')).filter(Boolean);
  // 沒有來源的「仍成立」不能當成看過：降成查不到
  let view=vv||'查不到',fix=vv?'':`view「${v||'空'}」不是三種之一，記成查不到`;if(view=='仍成立'&&!src.length){view='查不到';fix='沒有附來源，「仍成立」記成查不到'}
  return{id,T,view,why:String(o.why||'').trim().slice(0,120),src,fix}})}
window.ssRun=()=>{const p=SSP,r=aiExtract(p.txt);p.err='';p.L=null;if(r.err){p.err=r.err;ssRe();return}const L=ssParse(r.j);if(!L.length){p.err='這段回覆裡沒有 "season"。請用上面「📋 複製」的文字問 AI。';ssRe();return}p.L=L;p.ai=String(r.j.ai||'').trim().slice(0,30);ssRe()};
window.ssApply=()=>{const p=SSP;if(!p||!p.L)return;try{if(typeof rpSave=='function')rpSave('記錄財報季 AI 看法前')}catch(e){}let n=0;
 for(const x of p.L){if(!x.T)continue;const T=stThesis(S,x.T.id);T.aiRev=(T.aiRev||[]).concat([{d:TODAY,rule:'財報後檢查',view:x.view,why:x.why,src:x.src,ai:p.ai||'AI',q:'season'}]).slice(-20);n++}
 SSP=null;upd();asClose();toast(`已記下 ${n} 檔的 AI 看法；到提醒逐檔確認`,0)};
// 「🤖 AI 討論 → 貼上回覆」貼到財報季檢查的回覆時，轉到這裡（ai-import.js 的 aiRun 開頭呼叫）
function ssPasteHook(j,txt){if(!j||!Array.isArray(j.season)||!j.season.length)return false;asClose();setTimeout(()=>ssOpen(txt),0);return true}
