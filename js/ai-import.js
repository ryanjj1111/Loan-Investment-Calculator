// 📥 從 AI 對話貼上紀錄（「投資帳本 v1」格式）、還原點、整批復原
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 ui.js、strategy-engine.js、asset-engine.js、asset-ui.js（asOvOpen、asClose）

// ---------- 還原點：匯入前自動把目前資料存一份在瀏覽器資料庫（IndexedDB），保留最近 10 份；不會放進匯出的設定檔
const RP_MAX=10;
function rpDB(){return new Promise((ok,no)=>{try{const r=indexedDB.open('lc-restore',1);r.onupgradeneeded=()=>r.result.createObjectStore('rp',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}})}
async function rpAll(){try{const db=await rpDB();return await new Promise(ok=>{const q=db.transaction('rp').objectStore('rp').getAll();q.onsuccess=()=>ok((q.result||[]).sort((a,b)=>b.id-a.id));q.onerror=()=>ok([])})}catch(e){return[]}}
async function rpSave(label){const data=JSON.stringify(S),n=(S.trades||[]).length;try{const L=await rpAll();if(L[0]&&L[0].data===data)return 1;const db=await rpDB();
 const put=keep=>new Promise(ok=>{const tx=db.transaction('rp','readwrite'),st=tx.objectStore('rp');st.put({id:Date.now(),at:new Date().toISOString(),label,data,n});L.slice(keep).forEach(o=>st.delete(o.id));tx.oncomplete=()=>ok(1);tx.onerror=tx.onabort=()=>ok(0)});
 if(await put(RP_MAX-1))return 1;return await put(Math.max(0,Math.floor((RP_MAX-1)/2)))}catch(e){return 0}}   // 空間不夠時少存幾份
window.rpRestore=async id=>{const L=await rpAll(),o=L.find(x=>x.id==id);if(!o)return;if(!confirm(`還原到「${o.label}」（${aiT(o.at)}，${o.n} 筆交易）？目前的資料會先存成還原點。`))return;await rpSave('還原前');S=migrate(JSON.parse(o.data)).o;fixCur();ls('lce',sigE());save();build();toast('已還原',0);aiOpen()};
const aiT=s=>{try{const d=new Date(s);return d.toLocaleDateString('sv-SE')+' '+d.toTimeString().slice(0,5)}catch(e){return s}};
// 「⬆️ 匯入 JSON」之前：檔案比瀏覽器裡的舊就先警告，並存還原點
function rpGuard(j){const has=(S.trades||[]).length||(S.snaps||[]).length;let m='';
 if(has){if(j&&j.edited&&S.edited&&j.edited<S.edited)m=`這份檔案最後修改是 ${aiT(j.edited)}，比瀏覽器裡的資料（${aiT(S.edited)}）舊。\n`;else if(j&&!j.edited)m='這份檔案是舊版匯出的，沒有修改時間，無法判斷新舊。\n'}
 if(m&&!confirm(m+'匯入會整份取代瀏覽器裡的資料（取代前會自動存還原點，可以在「📥 從 AI 貼上 → 還原點」復原）。確定要匯入嗎？'))return false;rpSave('匯入設定檔前');return true}

// ---------- 解析
const AI_SIDE={buy:'buy','買進':'buy','買':'buy',sell:'sell','賣出':'sell','賣':'sell',div:'div','配息':'div',sdiv:'sdiv','配股':'sdiv'};
const AI_AC={a:'a','主動':'a',active:'a',p:'p','被動':'p',passive:'p'};
const AI_UPD={stop:['stop','停損價'],target:['tgtPx','目標價'],why:['why','為什麼買'],wrongIf:['wrongIf','什麼情況代表我錯了'],expectM:['expectM','預計幾個月'],targetNote:['target','目標估值或出場條件']};
const aiNum=v=>{if(v==null||v==='')return null;const x=+String(v).replace(/[,，\s元股]/g,'');return isFinite(x)?x:null};
const aiDate=v=>{const m=String(v??'').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):null};
const aiRs=v=>{if(v==null||v==='')return'';const s=String(v).trim(),k=s.split(/[\s　]/)[0];for(const t in AS_RS)for(const[a,b]of AS_RS[t])if(a==k||b==s||b==k)return a;return null};
// 從整段 AI 回覆找出 JSON（優先 ```json 區塊），錯誤時回報在貼上內容的第幾行
function aiExtract(t){t=String(t||'');let s,start;const m=t.match(/```(?:json)?[^\n]*\n([\s\S]*?)```/i);
 if(m){s=m[1];start=m.index+m[0].indexOf(m[1])}else{const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)return{err:'找不到 JSON：要以 { 開頭、} 結尾，或放在 ```json 區塊裡。'};s=t.slice(a,b+1);start=a}
 const off=t.slice(0,start).split('\n').length-1,tryP=x=>{try{return{j:JSON.parse(x)}}catch(e){return{e}}};
 let r=tryP(s);if(r.j)return r;const r2=tryP(s.replace(/[“”]/g,'"').replace(/,\s*([}\]])/g,'$1'));if(r2.j)return Object.assign(r2,{fixed:1});
 const msg=String(r.e.message),lc=msg.match(/line (\d+) column (\d+)/),ps=msg.match(/position (\d+)/);let line=null,col=null;
 if(lc){line=+lc[1];col=+lc[2]}else if(ps){const p=+ps[1],pre=s.slice(0,p);line=pre.split('\n').length;col=p-pre.lastIndexOf('\n')}
 const L=t.split('\n');return{err:`JSON 格式錯誤${line?`：第 ${line+off} 行第 ${col} 個字附近`:''}。常見原因：少了逗號、引號沒有成對、最後一項後面多了逗號。`,line:line?line+off:null,txt:line?L[line+off-1]:''}}
// 某個策略版本的條件清單（AI 用「段落＋編號」對應）
function aiConds(st,ver){const h=(st.hist||[]).find(x=>x.ver==ver);return stConds(h&&h.snap?Object.assign({},st,h.snap):st)}
// 前一個交易日收盤價（檢查打錯價格）
function aiPrev(c,dt){let best=null,bd='';if(typeof PXL!='undefined'&&PXL[c]&&PXL[c].d<dt){best=PXL[c].v;bd=PXL[c].d}if(typeof PXH!='undefined')for(const d in PXH)if(d<dt&&d>bd&&PXH[d][c]!=null){best=PXH[d][c];bd=d}return best!=null?{v:best,d:bd}:null}
const aiKey=x=>[x.dt,cU(x.n),x.k,num(x.q),num(x.px),x.ac=='a'?'a':'p'].join('|');

// 解析成預覽清單：每一項有 err（擋下）、warn（提醒）、info（說明）
function aiPlan(j){const P={tr:[],th:[],up:[],ev:[],ck:null,glob:[]},refs={},keys=new Set((S.trades||[]).map(aiKey));
 if(!j||typeof j!='object'||Array.isArray(j)){P.glob.push('最外層要是 { … }，裡面放 trades、theses、updates、events、check。');return P}
 if(j.format&&!/投資帳本/.test(j.format))P.glob.push(`format 是「${j.format}」，不是「投資帳本 v1」，仍嘗試解析。`);
 for(const k of['trades','theses','updates','events'])if(j[k]!=null&&!Array.isArray(j[k]))P.glob.push(`${k} 要是陣列 [ … ]。`);
 const arr=k=>Array.isArray(j[k])?j[k]:[];
 // 新論點
 arr('theses').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`theses 第 ${i+1} 筆`;P.th.push(it);
  const c=cU(o.code||'');if(!c)it.err.push(`${lb} 缺 code（代號）`);const sid=String(o.strategy||'').trim().toUpperCase(),st=sid?stStrat(S,sid):null;
  if(!sid)it.err.push(`${lb} 缺 strategy（策略編號，例如 S04）`);else if(!st)it.err.push(`${lb}：策略庫沒有 ${sid}`);
  let ver=st?st.ver:1;if(st&&o.ver!=null){const v=aiNum(o.ver);if(!(st.hist||[]).some(h=>h.ver==v))it.err.push(`${lb}：${sid} 沒有 v${o.ver}（目前是 v${st.ver}）`);else{ver=v;if(v<st.ver)it.warn.push(`用的是 ${sid} 舊版 v${v}（目前 v${st.ver}）`)}}
  it.c=c;it.sid=sid;it.st=st;it.ver=ver;it.ref=String(o.ref||('#'+c));refs[it.ref]=it;
  if(o.created!=null&&!aiDate(o.created))it.err.push(`${lb}：created 日期格式要是 YYYY-MM-DD`);it.created=aiDate(o.created)||'';
  it.met=[];it.pend=[];it.no=[];it.note={};
  if(st)for(const m of Array.isArray(o.met)?o.met:[]){const C=aiConds(st,ver),g=C.find(x=>x.sec==String(m.sec||'').trim()),n=aiNum(m.no);
   if(!g||!n||n<1||n>g.items.length){it.warn.push(`條件「${m.sec||'?'} 第 ${m.no??'?'} 條」對不到 ${sid} v${ver} 的規則，已略過`);continue}
   const t=g.items[n-1];if(m.note)it.note[t]=String(m.note);(m.ok===true?it.met:m.ok===false?it.no:it.pend).push(t)}
  if(st){const E=stCondEval(Object.assign({},st,((st.hist||[]).find(h=>h.ver==ver)||{}).snap||{}),it.met).filter(g=>!g.ok);if(E.length)it.warn.push(`${E.map(g=>g.sec+' '+g.n+'／'+g.tot).join('、')}，還沒達到策略門檻`);if(it.pend.length)it.info.push(`${it.pend.length} 項條件待確認，會出現在提醒裡`)}
  it.stop=aiNum(o.stop);it.tgt=aiNum(o.target);if(o.stop!=null&&it.stop==null)it.err.push(`${lb}：stop 要是數字`);
  it.tags=Array.isArray(o.tags)?o.tags.map(String):o.tags?String(o.tags).split(/[、,，]/).map(s=>s.trim()).filter(Boolean):[];
  it.plan=(Array.isArray(o.plan)?o.plan:[]).map((p,k)=>({n:aiNum(p.n)||k+1,cond:String(p.cond||''),pct:aiNum(p.pct)??'',trade:p.trade==null?null:aiNum(p.trade)}));
  // 已有同代號、同策略的進行中論點 → 更新它，不新建
  const ex=(S.theses||[]).find(T=>T.status!='exit'&&cU(T.code)==c&&T.sid==sid);
  if(ex){it.merge=ex;it.info.push(`已有 ${ex.id}（${c} ${sid}），會更新它而不是新建`);it.diff=aiDiff(ex,{stop:o.stop,target:o.target,why:o.why,wrongIf:o.wrongIf,expectM:o.expectM,targetNote:[o.targetNote,o.exitNote].filter(Boolean).join('\n')||undefined});
   const nm=it.met.filter(t=>!(ex.met||[]).includes(t)).length+it.pend.filter(t=>!(ex.pend||[]).includes(t)&&!(ex.met||[]).includes(t)).length;if(!it.diff.length&&!nm){it.on=0;it.warn.push(`和 ${ex.id} 的內容相同，不用再匯入`)}}});
 // 預先配發新論點編號
 {let n=0;for(const T of S.theses||[]){const m=/^T(\d+)$/.exec(T.id||'');if(m)n=Math.max(n,+m[1])}for(const it of P.th)if(!it.merge&&!it.err.length)it.id='T'+String(++n).padStart(3,'0')}
 // 交易
 arr('trades').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`trades 第 ${i+1} 筆`;P.tr.push(it);
  const dt=aiDate(o.date),c=cU(o.code||''),k=AI_SIDE[String(o.side||'').trim()],ac0=AI_AC[String(o.acct||'').trim()];
  if(!dt)it.err.push(o.date?`${lb}：date「${o.date}」格式要是 YYYY-MM-DD`:`${lb} 缺 date（日期）`);if(!c)it.err.push(`${lb} 缺 code（代號）`);if(!k)it.err.push(o.side?`${lb}：side「${o.side}」要是 買進／賣出／配息／配股`:`${lb} 缺 side（買進或賣出）`);
  const ac=ac0||(/^00/.test(c)?'p':'a');if(!ac0&&c)it.warn.push(`沒寫 acct，依代號判斷為「${ac=='p'?'被動':'主動'}」`);
  const q=aiNum(o.qty),px=aiNum(o.price),dps=aiNum(o.dps);
  if(k&&k!='div'&&!(q>0))it.err.push(`${lb} 缺 qty（股數）`);if((k=='buy'||k=='sell')&&!(px>0))it.err.push(`${lb} 缺 price（成交價）`);if(k=='div'&&dps==null)it.err.push(`${lb} 缺 dps（每股配息）`);
  const rs=aiRs(o.reason);if(rs===null){it.warn.push(`reason「${o.reason}」看不懂，已略過`)}
  if(c&&!STK[c])it.warn.push(`找不到 ${c} 的名稱，請確認代號`);
  it.x={dt,ac,k,n:c,q:k=='div'?'':q,px:(k=='buy'||k=='sell')?px:'',dps:k=='div'?dps:'',pdt:aiDate(o.payDate)||'',rs:rs||'',note:String(o.note||'')};
  if(!it.err.length){const key=aiKey(it.x);if(keys.has(key)){it.dup=1;it.on=0;it.warn.push('⚠️ 可能重複：已經有同日期、代號、買賣、股數、價格的一筆，預設不匯入')}keys.add(key);
   const near=(S.trades||[]).filter(x=>x.dt==dt&&cU(x.n)==c&&x.k==k&&aiKey(x)!=key);if(near.length&&!it.dup)it.info.push(`同一天已經有 ${near.length} 筆 ${c} 的${asKN(k)}（股數或價格不同），確認不是同一筆`);
   if(k=='buy'||k=='sell'){const m=tradeAmt(S,it.x);it.m=m;const pv=aiPrev(c,dt);if(pv&&Math.abs(px/pv.v-1)>0.1)it.warn.push(`成交價 ${px} 和前一個交易日收盤 ${pv.v}（${asD(pv.d)}）差 ${((px/pv.v-1)*100).toFixed(1)}%，超過漲跌停 10%，請確認有沒有打錯`)}
   if(k=='sell'){const h=holdings(S).find(z=>z.ac==ac&&cU(z.n)==c);if(!h||h.q<q)it.warn.push(`賣出 ${R(q)} 股，但目前只有 ${R(h?h.q:0)} 股`)}
   if(k=='div'){const sh=sharesAt(S,dt)[ac+'|'+c]||0;it.m={cash:dps*sh};it.info.push(`除息前持有 ${R(sh)} 股，約 ${R(dps*sh)} 元`)}}
  // 歸屬論點
  const tr=String(o.thesis||'').trim();if(ac=='a'&&(k=='buy'||k=='sell')&&c){if(tr&&refs[tr])it.ref=tr;else if(/^T\d+$/i.test(tr)){const T=stThesis(S,tr.toUpperCase());if(T)it.tid=T.id;else it.err.push(`${lb}：找不到論點 ${tr}`)}else{const h=P.th.find(z=>z.c==c&&!z.err.length);if(h)it.ref=h.ref;else{const T=asThesisOf(S,c);if(T)it.tid=T.id}if(tr&&!it.ref&&!it.tid)it.warn.push(`thesis「${tr}」對不到，這筆會是未分類`)}}});
 // 買進後占比（依預覽裡勾選的買進累加）
 {const E=stExposure(S),by=Object.assign({},E.by);let tot=E.tot;for(const it of P.tr){if(it.err.length||it.x.k!='buy'||it.x.ac!='a'||it.dup)continue;const v=it.x.q*it.x.px;by[it.x.n]=(by[it.x.n]||0)+v;tot+=v;const w=by[it.x.n]/tot*100,cap=stCapStock(S,it.x.n);it.info.push(`買進後占主動部位 ${w.toFixed(1)}%（上限 ${cap}%）`);if(w>cap)it.warn.push(`買進後超過個股上限 ${cap}%`)}}
 // 修改既有論點
 arr('updates').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`updates 第 ${i+1} 筆`;P.up.push(it);const T=stThesis(S,String(o.thesis||'').trim().toUpperCase());
  if(!T){it.err.push(o.thesis?`${lb}：找不到論點 ${o.thesis}`:`${lb} 缺 thesis（論點編號，例如 T001）`);return}it.T=T;it.diff=aiDiff(T,o);if(!it.diff.length){it.warn.push('沒有要改的欄位或內容相同，略過');it.on=0}});
 // 事件
 arr('events').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`events 第 ${i+1} 筆`;P.ev.push(it);const d=aiDate(o.date),c=cU(o.code||'');
  if(!d)it.err.push(`${lb} 缺 date 或格式不對（YYYY-MM-DD）`);it.e={date:d,code:c,type:String(o.type||'其他'),note:String(o.note||'')};
  if((S.events||[]).some(e=>e.date==d&&e.code==c&&e.type==it.e.type&&!e.done)){it.on=0;it.warn.push('已經有同一天、同一檔、同類型的事件，預設不匯入')}});
 // 庫存核對（套用這次的交易後再比）
 if(j.check){const items=Array.isArray(j.check)?j.check:Array.isArray(j.check.items)?j.check.items:[];P.ck={date:aiDate(j.check.date)||TODAY,items};}
 return P}
function aiDiff(T,o){const D=[];for(const k in AI_UPD){if(o[k]===undefined||o[k]===null||o[k]==='')continue;const[f,lb]=AI_UPD[k],nv=['stop','tgtPx','expectM'].includes(f)?aiNum(o[k]):String(o[k]);if(nv==null)continue;if(String(T[f]??'')!==String(nv))D.push({f,lb,old:T[f]??'',nw:nv})}return D}

// ---------- 畫面
let AIP=null,AIR=null,AIX='';
window.aiOpen=()=>{asOvOpen(aiHtml());aiSide()};
function aiHtml(){return`<div class=ovh><button onclick="asClose()">✕</button><b>📥 從 AI 對話貼上紀錄</b></div>
 <div class=h>在分析股票的對話裡，請 AI「用投資帳本 v1 格式輸出」今天的成交、新論點與事件；把整段回覆複製貼到下面即可（工具會自己找出 JSON）。格式說明在專案文件〈工具說明與結算流程〉。</div>
 <textarea id=aiTx rows=8 style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:12px" placeholder='{"format":"投資帳本 v1","trades":[…]}'>${esc(AIX)}</textarea>
 <div class=asbtn><button class=pri onclick="aiRun()">解析並預覽</button><button onclick="$('aiTx').value='';AIX='';AIP=null;$('aiPv').innerHTML=''">清除</button></div>
 <div id=aiPv></div><div id=aiSd></div>`}
window.aiRun=()=>{AIX=$('aiTx').value;const r=aiExtract(AIX);if(r.err){AIP=null;$('aiPv').innerHTML=`<div class=stal style="border-color:#fca5a5;background:#fef2f2"><b>❌ 解析失敗</b><div>${esc(r.err)}</div>${r.txt!=null&&r.line?`<div class=h>第 ${r.line} 行：<code>${esc(r.txt)}</code></div>`:''}</div>`;return}AIP=aiPlan(r.j);if(r.fixed)AIP.glob.push('已自動修正全形引號或多餘的逗號。');aiPrevRender()};
const aiMsgs=it=>it.err.map(s=>`<div class=bad>❌ ${esc(s)}</div>`).join('')+it.warn.map(s=>`<div class=wn>⚠️ ${esc(s.replace(/^⚠️ /,''))}</div>`).join('')+it.info.map(s=>`<div class=h>ℹ️ ${esc(s)}</div>`).join('');
const aiCk=(k,it)=>`<input type=checkbox data-ai="${k}" ${it.on&&!it.err.length?'checked':''} ${it.err.length?'disabled':''} onchange="aiTog('${k}',this.checked)">`;
window.aiTog=(k,v)=>{const t={t:'tr',h:'th',u:'up',e:'ev'}[k[0]],it=AIP[t][+k.slice(1)];if(it)it.on=v?1:0;aiSum()};
function aiTh(it){if(it.ref&&AIP){const h=AIP.th.find(z=>z.ref==it.ref);if(h)return h.merge?h.merge.id:h.id?h.id+'（新）':'（新論點有錯）'}return it.tid||''}
function aiPrevRender(){const P=AIP,el=$('aiPv');let h='';
 if(P.glob.length)h+=`<div class=stal>${P.glob.map(s=>`<div>· ${esc(s)}</div>`).join('')}</div>`;
 if(P.th.length)h+=`<div class=sub>新論點／更新論點（${P.th.length}）</div>`+P.th.map((it,i)=>{const o=it.o;return`<label class="aii ${it.err.length?'aie':''}">${aiCk('h'+i,it)}<div><b>${it.merge?'更新 '+it.merge.id:(it.id||'—')+' 新論點'}</b>｜${esc(it.c)} ${esc(nameOf(it.c))}｜${esc(it.sid)}${it.st?' '+esc(it.st.name)+' v'+it.ver:''}${it.tags.length?'｜'+esc(it.tags.join('、')):''}
  <div class=h>符合 ${it.met.length} 項${it.pend.length?'、待確認 '+it.pend.length+' 項':''}${it.no.length?'、不符合 '+it.no.length+' 項':''}｜停損 ${it.stop??'—'}｜目標 ${it.tgt??'—'}｜預計 ${esc(o.expectM??'—')} 個月｜分批 ${it.plan.length||'依策略'}</div>
  ${o.why?`<div class=h>為什麼買：${esc(String(o.why).slice(0,80))}${String(o.why).length>80?'…':''}</div>`:''}
  ${it.diff&&it.diff.length?it.diff.map(d=>`<div class=h>${esc(d.lb)}：${esc(String(d.old)||'（空）')} → <b>${esc(String(d.nw))}</b></div>`).join(''):''}${aiMsgs(it)}</div></label>`}).join('');
 if(P.tr.length)h+=`<div class=sub>交易（${P.tr.length}）</div>`+P.tr.map((it,i)=>{const x=it.x||{},m=it.m;return`<label class="aii ${it.err.length?'aie':''} ${it.dup?'aid':''}">${aiCk('t'+i,it)}<div><b>${esc(x.dt||'?')} ${asKN(x.k)||'?'}</b> ${esc(x.n||'?')} ${esc(nameOf(x.n||''))}｜${x.ac=='a'?'⚡ 主動':'🛡️ 被動'}｜${x.k=='div'?'每股 '+esc(x.dps):R(x.q||0)+' 股 @'+esc(x.px)}${x.rs?' <span class=rsc>'+asRsN(x.rs)+'</span>':''}${aiTh(it)?' <span class="thc on">'+esc(aiTh(it))+'</span>':x.ac=='a'&&(x.k=='buy'||x.k=='sell')?' <span class=thc>未分類</span>':''}
  ${m&&(x.k=='buy'||x.k=='sell')?`<div class=h>手續費 ${R(m.fee)}${x.k=='sell'?'｜證交稅 '+R(m.tax):''}｜${x.k=='buy'?'付出':'收到'} ${R(Math.abs(m.cash))} 元${S.feeMode=='month'?'（券商先收全額 '+R(fullFee(x))+'，折讓每月退回）':''}</div>`:''}${aiMsgs(it)}</div></label>`}).join('');
 if(P.up.length)h+=`<div class=sub>修改既有論點（${P.up.length}）</div>`+P.up.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('u'+i,it)}<div><b>${it.T?it.T.id+' '+esc(cU(it.T.code))+' '+esc(nameOf(it.T.code)):'?'}</b>${(it.diff||[]).map(d=>`<div class=h>${esc(d.lb)}：${esc(String(d.old)||'（空）')} → <b>${esc(String(d.nw))}</b></div>`).join('')}${aiMsgs(it)}</div></label>`).join('');
 if(P.ev.length)h+=`<div class=sub>事件提醒（${P.ev.length}）</div>`+P.ev.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('e'+i,it)}<div><b>${esc(it.e.date||'?')} ${esc(it.e.type)}</b> ${esc(it.e.code)} ${esc(nameOf(it.e.code))}<div class=h>${esc(it.e.note)}</div>${aiMsgs(it)}</div></label>`).join('');
 if(P.ck)h+=aiCheckHtml(P);
 if(!P.th.length&&!P.tr.length&&!P.up.length&&!P.ev.length&&!P.ck)h+='<div class=wn>沒有找到 trades、theses、updates、events 或 check。</div>';
 h+=`<div class=asbtn><button class=pri id=aiGo onclick="aiCommit()"></button><button onclick="asClose()">取消</button></div><div class=h>匯入前會自動存還原點；匯入後可以在下方「匯入紀錄」整批復原。</div>`;
 el.innerHTML=h;aiSum()}
function aiSum(){const b=$('aiGo');if(!b||!AIP)return;const n=t=>AIP[t].filter(it=>it.on&&!it.err.length).length,a=n('tr'),t=n('th'),u=n('up'),e=n('ev');b.innerText=`確認匯入（交易 ${a}、論點 ${t}、修改 ${u}、事件 ${e}）`;b.disabled=!(a+t+u+e)}
// 庫存核對：套用這次勾選的交易後，逐檔比股數（有給成本也比成本）
function aiCheckHtml(P){const S2=clone(S);S2.trades=(S2.trades||[]).concat(P.tr.filter(it=>it.on&&!it.err.length).map(it=>Object.assign(NEW.trades(),it.x)));
 const H={},HB=asHoldB(S2);for(const o of holdings(S2)){if(o.q<=0)continue;const c=cU(o.n);H[c]=H[c]||{q:0,cb:0};H[c].q+=o.q;H[c].cb+=(HB[o.ac+'|'+c]||{}).cost||0}
 const A={};for(const z of P.ck.items){const c=cU(z.code||'');if(c)A[c]={q:aiNum(z.qty)??0,cost:aiNum(z.cost)}}
 const codes=[...new Set(Object.keys(H).concat(Object.keys(A)))].sort();let bad=0;
 const rows=codes.map(c=>{const t=H[c]||{q:0,cb:0},a=A[c],dq=a?a.q-t.q:null,dc=a&&a.cost!=null?a.cost-t.cb:null,okq=a&&dq==0,okc=dc==null||Math.abs(dc)<=Math.max(30,Math.abs(a.cost)*0.002);if(!a||!okq||!okc)bad++;
  return`<tr class="${!a||!okq?'bad':!okc?'wn':''}"><td>${esc(c)} <small>${esc(nameOf(c))}</small></td><td>${R(t.q)}</td><td>${a?R(a.q):'—'}</td><td>${!a?'App 沒有這檔':dq?(dq>0?'App 多 ':'App 少 ')+R(Math.abs(dq))+' 股':'✓'}</td><td>${dc==null?'':okc?'✓':(dc>0?'App 多 ':'App 少 ')+R(Math.abs(dc))+' 元'}</td></tr>`}).join('');
 return`<div class=sub>庫存核對（${esc(P.ck.date)}，已套用這次的交易）</div><div class=w><table class=stt><thead><tr><th>代號</th><th>工具股數</th><th>App 股數</th><th>股數</th><th>成本</th></tr></thead><tbody>${rows}</tbody></table></div><div class="${bad?'wn':'ok'}" style="font-size:12.5px">${bad?`有 ${bad} 檔對不上：股數不同通常是漏記或重複記了交易；成本差一點點通常是手續費算法。`:'✅ 每一檔股數都對得上。'}</div>`}

// ---------- 寫入（一次匯入＝一批，可以整批復原）
window.aiCommit=async()=>{const P=AIP;if(!P)return;await rpSave('AI 匯入前');
 const B={id:'b'+Date.now().toString(36),at:new Date().toISOString(),tr:[],th:[],ev:[],upd:[],tags:[],plan:[]},idOf={};
 const setF=(T,f,v)=>{B.upd.push({id:T.id,f,old:T[f]});T[f]=v};
 for(const it of P.th){if(!it.on||it.err.length)continue;const o=it.o;let T;
  if(it.merge){T=it.merge;for(const d of it.diff||[])setF(T,d.f,d.nw);if(it.met.length||it.pend.length){setF(T,'met',[...new Set((T.met||[]).concat(it.met))]);setF(T,'pend',[...new Set((T.pend||[]).concat(it.pend))]);setF(T,'metNote',Object.assign({},T.metNote||{},it.note))}}
  else{T=stNewThesis(S,{code:it.c,sid:it.sid,sver:it.ver,status:'plan',created:it.created||(P.tr.find(z=>z.ref==it.ref&&z.x)||{x:{}}).x.dt||TODAY,why:String(o.why||''),wrongIf:String(o.wrongIf||''),expectM:aiNum(o.expectM)??'',stop:it.stop??'',tgtPx:it.tgt??'',target:[o.targetNote,o.exitNote].filter(Boolean).join('\n'),met:it.met,pend:it.pend,metNote:it.note,metAt:it.created||TODAY,src:'ai',batch:B.id});
   if(it.plan.length)T.plan=it.plan.map(p=>({n:p.n,cond:p.cond,pct:p.pct,tid:''}));stThDefaults(S,T,null);S.theses.push(T);B.th.push(T.id)}
  idOf[it.ref]=T.id;
  if(it.tags.length){B.tags.push({c:it.c,old:(S.tags||{})[it.c]});S.tags=S.tags||{};S.tags[it.c]=it.tags}else if(typeof asTagDef=='function'&&!(S.tags||{})[it.c]){B.tags.push({c:it.c,old:undefined});asTagDef(it.c)}}
 const made=[];
 P.tr.forEach((it,i)=>{if(!it.on||it.err.length)return;const x=Object.assign(NEW.trades(),it.x,{src:'ai',batch:B.id}),tid=it.ref?idOf[it.ref]:it.tid;if(tid)x.thesisId=tid;S.trades.push(x);B.tr.push(x.id);made[i]=x;
  const T=tid?stThesis(S,tid):null;if(T&&x.k=='buy'){const h=P.th.find(z=>z.ref==it.ref);const pr=h&&h.plan.find(p=>p.trade===i);const row=pr?(T.plan||[]).find(r=>r.n==pr.n):null;if(row&&!row.tid){row.tid=x.id;B.plan.push({id:T.id,tid:x.id})}else{const r0=(T.plan||[]).find(r=>!r.tid);stLinkPlan(T,x);if(r0&&r0.tid==x.id)B.plan.push({id:T.id,tid:x.id})}}});
 for(const it of P.up){if(!it.on||it.err.length)continue;for(const d of it.diff)setF(it.T,d.f,d.nw)}
 S.events=S.events||[];for(const it of P.ev){if(!it.on||it.err.length)continue;const e=Object.assign({id:'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),done:0,src:'ai',batch:B.id},it.e);S.events.push(e);B.ev.push(e.id)}
 // 賣到股數歸零的論點：出場原因依賣出依據
 stSync(S);for(const x of made.filter(Boolean)){if(x.k!='sell'||!x.thesisId)continue;const T=stThesis(S,x.thesisId);if(T&&T.status=='exit'&&!T.exit.reason){T.exit.reason=AS_RS2EXIT[x.rs]||'';T.exit.date=T.exit.date||x.dt}}
 const sum=`交易 ${B.tr.length}、新論點 ${B.th.length}${B.th.length?'（'+B.th.join('、')+'）':''}、修改 ${new Set(B.upd.map(u=>u.id)).size}、事件 ${B.ev.length}`;B.sum=sum;
 S.imports=[B].concat(S.imports||[]).slice(0,20);
 if(typeof trEd!='undefined')trEd.clear();renderTrades();stBuild();upd();if(typeof pxApply=='function')pxApply();AIP=null;AIX='';
 $('asOvB').innerHTML=`<div class=ovh><button onclick="asClose()">✕</button><b>✅ 已匯入</b></div><div>${esc(sum)}</div>
  ${S.bkAsk===0?'':`<div class=stal style="margin-top:8px"><b>要匯出備份嗎？</b><div class=asbtn><button class=pri onclick="exp();asClose()">⬇️ 匯出設定檔</button><button onclick="asClose()">這次不用</button></div><label class=ck style="margin-top:4px"><input type=checkbox onchange="S.bkAsk=this.checked?0:1;save()">以後匯入後不要再問（仍會在超過 7 天沒備份時提醒）</label></div>`}
  <div class=asbtn><button onclick="aiOpen()">再貼一次</button><button onclick="asClose()">回資產頁</button></div>`};
window.aiUndo=async id=>{const B=(S.imports||[]).find(b=>b.id==id);if(!B||B.undone)return;if(!confirm(`整批復原 ${aiT(B.at)} 的匯入（${B.sum}）？目前的資料會先存成還原點。`))return;await rpSave('整批復原前');
 const tr=new Set(B.tr),th=new Set(B.th),ev=new Set(B.ev);S.trades=S.trades.filter(x=>!tr.has(x.id));S.theses=S.theses.filter(T=>!th.has(T.id));S.trades.forEach(x=>{if(th.has(x.thesisId))x.thesisId=''});S.events=(S.events||[]).filter(e=>!ev.has(e.id));
 for(const u of B.upd.slice().reverse()){const T=stThesis(S,u.id);if(T)T[u.f]=u.old}for(const p of B.plan||[]){const T=stThesis(S,p.id);if(T)(T.plan||[]).forEach(r=>{if(r.tid==p.tid)r.tid=''})}
 for(const t of B.tags.slice().reverse()){if(t.old===undefined)delete S.tags[t.c];else S.tags[t.c]=t.old}
 for(const T of S.theses)if(T.status=='exit'&&stPerf(S,T).open)T.status='hold';
 B.undone=TODAY;if(typeof trEd!='undefined')trEd.clear();renderTrades();stBuild();upd();toast('已整批復原',0);aiOpen()};
async function aiSide(){const el=$('aiSd');if(!el)return;const L=await rpAll(),I=(S.imports||[]).slice(0,10);
 el.innerHTML=`<details style="margin-top:10px"><summary class=h>📜 匯入紀錄（${I.length}）</summary>${I.map(b=>`<div class=astl><span>${esc(aiT(b.at))}</span><span>${esc(b.sum||'')}${b.undone?' <small class=h>已復原</small>':''}</span>${b.undone?'<span></span>':`<button onclick="aiUndo('${b.id}')">整批復原</button>`}</div>`).join('')||'<div class=h>還沒有匯入過。</div>'}</details>
 <details style="margin-top:6px"><summary class=h>🛟 還原點（最近 ${RP_MAX} 份，只存在這台裝置的瀏覽器）</summary>${L.map(o=>`<div class=astl><span>${esc(aiT(o.at))}</span><span>${esc(o.label)}｜${o.n} 筆交易</span><button onclick="rpRestore(${o.id})">還原</button></div>`).join('')||'<div class=h>還沒有還原點（每次匯入前會自動建立）。</div>'}
 <label class=ck style="margin-top:6px"><input type=checkbox ${S.bkAsk===0?'':'checked'} onchange="S.bkAsk=this.checked?1:0;save()">匯入後詢問要不要匯出備份</label></details>`}

// ---------- 事件提醒的動作
window.evDone=id=>{const e=(S.events||[]).find(x=>x.id==id);if(e){e.done=1;upd()}};
window.evDiv=id=>{const e=(S.events||[]).find(x=>x.id==id);if(!e)return;const h=holdings(S).find(o=>cU(o.n)==e.code);asTradeOpen({c:e.code,ac:h?h.ac:'a',k:'div',dt:e.date})};
