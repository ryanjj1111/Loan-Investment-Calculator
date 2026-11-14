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
 if(m&&!confirm(m+'匯入會整份取代瀏覽器裡的資料（取代前會自動存還原點，可以在「🤖 AI 討論 → 📥 貼上回覆 → 還原點」復原）。確定要匯入嗎？'))return false;rpSave('匯入設定檔前');return true}

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
 let r=tryP(s);if(r.j)return r;const r1=tryP(aiNL(s));if(r1.j)return Object.assign(r1,{fixed:'nl'});const r2=tryP(aiNL(s).replace(/[“”]/g,'"').replace(/,\s*([}\]])/g,'$1'));if(r2.j)return Object.assign(r2,{fixed:1});
 const msg=String(r.e.message),lc=msg.match(/line (\d+) column (\d+)/),ps=msg.match(/position (\d+)/);let line=null,col=null;
 if(lc){line=+lc[1];col=+lc[2]}else if(ps){const p=+ps[1],pre=s.slice(0,p);line=pre.split('\n').length;col=p-pre.lastIndexOf('\n')}
 const L=t.split('\n');return{err:`JSON 格式錯誤${line?`：第 ${line+off} 行第 ${col} 個字附近`:''}。常見原因：少了逗號、引號沒有成對、最後一項後面多了逗號。`,line:line?line+off:null,txt:line?L[line+off-1]:''}}
// 手機複製時，畫面折行可能變成真的換行：把引號裡面的換行拿掉
function aiNL(s){let o='',q=0,e=0;for(const ch of s){if(q){if(e){e=0;o+=ch;continue}if(ch=='\\'){e=1;o+=ch;continue}if(ch=='"'){q=0;o+=ch;continue}if(ch=='\n'||ch=='\r')continue;o+=ch}else{if(ch=='"')q=1;o+=ch}}return o}
// 某個策略版本的條件清單（AI 用「段落＋編號」對應）
function aiConds(st,ver){const h=(st.hist||[]).find(x=>x.ver==ver);return stConds(h&&h.snap?Object.assign({},st,h.snap):st)}
// 前一個交易日收盤價（檢查打錯價格）
function aiPrev(c,dt){let best=null,bd='';if(typeof PXL!='undefined'&&PXL[c]&&PXL[c].d<dt){best=PXL[c].v;bd=PXL[c].d}if(typeof PXH!='undefined')for(const d in PXH)if(d<dt&&d>bd&&PXH[d][c]!=null){best=PXH[d][c];bd=d}return best!=null?{v:best,d:bd}:null}
const aiKey=x=>[x.dt,cU(x.n),x.k,num(x.q),num(x.px),x.ac=='a'?'a':'p'].join('|');

// 解析成預覽清單：每一項有 err（擋下）、warn（提醒）、info（說明）
// 匯入項目的影響（2026-11-11）：🎯 會改變自動判斷／🔔 會改變提醒／📝 只是紀錄
const AI_TG={1:'🎯 改判斷',2:'🔔 改提醒',3:'📝 紀錄'},AI_KNOWN=new Set(['format','ai','q','snap','summary','note','trades','theses','updates','events','outlook','themes','strategies','check','review','manual']);
const aiNoSrc=s=>!String(s||'').trim()||/未註明|未具名|不具名|市場預估|市場共識$|^法人$|^外資$|^投顧$/.test(String(s).trim());
function aiPlan(j){const P={tr:[],th:[],up:[],ev:[],ol:[],tm:[],sg:[],rv:[],mn:[],ck:null,glob:[]},refs={},keys=new Set((S.trades||[]).map(aiKey));
 if(!j||typeof j!='object'||Array.isArray(j)){P.glob.push('最外層要是 { … }，裡面放 trades、theses、updates、events、outlook、themes、strategies、check。');return P}
 if(j.format&&!/投資帳本/.test(j.format))P.glob.push(`format 是「${j.format}」，不是「投資帳本 v1」，仍嘗試解析。`);
 for(const k of['trades','theses','updates','events','outlook','themes','strategies'])if(j[k]!=null&&!Array.isArray(j[k]))P.glob.push(`${k} 要是陣列 [ … ]。`);
 const arr=k=>Array.isArray(j[k])?j[k]:[];
 // 這次回覆的來源：哪個 AI、哪一種問題、複製時的快照編號（App 用來檢查持股與資料有沒有變）
 const last=typeof aaLast=='function'?aaLast():null;P.meta={ai:String(j.ai||'').trim().slice(0,40),q:String(j.q||'').trim(),snap:String(j.snap||'').trim(),kind:String(j.kind||'').trim()};
 if(!P.meta.q&&last&&last.snap&&last.snap==P.meta.snap)P.meta.q=last.q;if(P.meta.q&&!(typeof AA_Q!='undefined'&&AA_Q[P.meta.q]))P.meta.q='';
 if(j.summary||j.note)P.sum=String(j.summary||j.note).slice(0,2000);
 const unk=Object.keys(j).filter(k=>!AI_KNOWN.has(k));if(unk.length)P.glob.push(`⚠️ 認不得的欄位：${unk.join('、')}，不會匯入（可能是 AI 自己加的，或格式寫錯）。`);
 if(P.meta.snap&&typeof aaSnap=='function'){const now=aaSnap();if(now!=P.meta.snap)P.glob.push(`⚠️ 複製給 AI 之後，持股、停損、策略版本或資料日期已經變了（快照 ${P.meta.snap} → 現在 ${now}）：AI 引用的可能是舊資料。`)}
 else if(!P.meta.snap)P.glob.push('ℹ️ 這段回覆沒有快照編號，無法確認 AI 看到的是不是最新的資料。');
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
  it.plan=(Array.isArray(o.plan)?o.plan:[]).map((p,k)=>({n:aiNum(p.n)||k+1,cond:String(p.cond||''),pct:aiNum(p.pct)??'',trade:p.trade==null?null:aiNum(p.trade)}));it.risk=String(o.risk||'').trim().slice(0,300);
  // 2026-11-13 評估新股票：論點只建「規劃中」；停損、分批、條件由 App 算，AI 給的略過
  if(P.meta.q=='eval'){if(o.stop!=null||it.plan.length||(Array.isArray(o.met)&&o.met.length))it.info.push('停損、分批、條件由 App 算，AI 給的已略過');it.stop=null;it.tgt=null;it.plan=[];it.met=[];it.pend=[];it.no=[];it.note={};it.created='';it.warn=it.warn.filter(w=>!/還沒達到策略門檻/.test(w))}
  // 已有同代號、同策略的進行中論點 → 更新它，不新建
  const ex=(S.theses||[]).find(T=>T.status!='exit'&&cU(T.code)==c&&T.sid==sid);
  // 2026-11-12：同一檔同時間只能有一個論點。同代號、不同策略 → 標疑點、預設不勾；勾了就是「轉換」（持有中）或改策略（規劃中）
  const oth=!ex&&c&&sid?(S.theses||[]).find(T=>T.status!='exit'&&cU(T.code)==c):null;
  if(oth){it.conv=oth;it.warn.push(`這檔已有 ${oth.id}（${oth.sid||'未指定'}），同一檔同時間只能有一個論點。勾選的話：${oth.status=='hold'?`${oth.id} 以「轉換」結案（不產生交易，用現價結算），由新論點承接股數、現價當起算價`:`規劃中的 ${oth.id} 改成 ${sid}`}`)}
  if(ex){it.merge=ex;it.info.push(`已有 ${ex.id}（${c} ${sid}），會更新它而不是新建`);it.diff=aiDiff(ex,{stop:o.stop,target:o.target,why:o.why,wrongIf:o.wrongIf,expectM:o.expectM,targetNote:[o.targetNote,o.exitNote].filter(Boolean).join('\n')||undefined});
   const nm=it.met.filter(t=>!(ex.met||[]).includes(t)).length+it.pend.filter(t=>!(ex.pend||[]).includes(t)&&!(ex.met||[]).includes(t)).length;if(!it.diff.length&&!nm){it.on=0;it.warn.push(`和 ${ex.id} 的內容相同，不用再匯入`)}}});
 // 預先配發新論點編號
 {let n=+S.thMax||0;for(const T of S.theses||[]){const m=/^T(\d+)$/.exec(T.id||'');if(m)n=Math.max(n,+m[1])}for(const it of P.th)if(!it.merge&&!it.err.length)it.id='T'+String(++n).padStart(3,'0')}
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
 {const E=stExposure(S),by=Object.assign({},E.by);let add=0;for(const it of P.tr){if(it.err.length||it.x.k!='buy'||it.x.ac!='a'||it.dup)continue;const v=it.x.q*it.x.px;by[it.x.n]=(by[it.x.n]||0)+v;add+=v;const tot=E.after(add),w=by[it.x.n]/tot*100,cap=stCapStock(S,it.x.n);it.info.push(`買進後占主動部位 ${w.toFixed(1)}%（上限 ${cap}%）`);if(w>cap)it.warn.push(`買進後超過個股上限 ${cap}%`)}}
 // 修改既有論點
 arr('updates').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`updates 第 ${i+1} 筆`;P.up.push(it);const T=stThesis(S,String(o.thesis||'').trim().toUpperCase());
  if(!T){it.err.push(o.thesis?`${lb}：找不到論點 ${o.thesis}`:`${lb} 缺 thesis（論點編號，例如 T001）`);return}it.T=T;it.diff=aiDiff(T,o);if(!it.diff.length){it.warn.push('沒有要改的欄位或內容相同，略過');it.on=0}});
 // 事件
 arr('events').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`events 第 ${i+1} 筆`;P.ev.push(it);const d=aiDate(o.date),c=cU(o.code||'');
  if(!d)it.err.push(`${lb} 缺 date 或格式不對（YYYY-MM-DD）`);it.e={date:d,code:c,type:String(o.type||'其他'),note:String(o.note||'')};
  if((S.events||[]).some(e=>e.date==d&&e.code==c&&e.type==it.e.type&&!e.done)){it.on=0;it.warn.push('已經有同一天、同一檔、同類型的事件，預設不匯入')}});
 // 前瞻資料：法人 EPS 預估、法說指引、股票屬性
 const yn=v=>v===true||v===1||/^(true|1|是|y|yes)$/i.test(String(v??''))?1:v===false||v===0||/^(false|0|否|n|no)$/i.test(String(v??''))?0:null;
 arr('outlook').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`outlook 第 ${i+1} 筆`,c=cU(o.code||'');P.ol.push(it);it.c=c;if(!c){it.err.push(`${lb} 缺 code`);return}
  const old=((S.outlook||{})[c]||{}).eps||[];it.eps=[];for(const [k,e] of (Array.isArray(o.eps)?o.eps:[]).entries()){const y=aiNum(e.year??e.y),v=aiNum(e.eps??e.v),d=aiDate(e.date??e.d)||'';
   if(!y||v==null){it.warn.push(`eps 第 ${k+1} 筆缺 year 或 eps，略過`);continue}if(!d)it.warn.push(`eps 第 ${k+1} 筆沒有 date，用今天`);const r={y,v,src:String(e.src||e.source||''),d:d||TODAY};if(!d)r.noD=1;
   if(old.some(z=>+z.y==r.y&&+z.v==r.v&&z.d==r.d&&(z.src||'')==r.src)){it.warn.push(`${r.y} 年 ${r.v}（${r.src||'未註明'}）已經有了，略過`);continue}it.eps.push(r)}
  if(o.guide&&typeof o.guide=='object'){const g=o.guide;it.guide={rev:olDir(g.rev),gm:olDir(g.gm),d:aiDate(g.date)||TODAY,src:String(g.src||''),note:String(g.note||'')};if(!it.guide.rev&&!it.guide.gm)it.warn.push('guide 的 rev、gm 看不懂（用 up／flat／down 或 向上／持平／向下）')}
  if(o.attr&&typeof o.attr=='object'){const a=o.attr;it.attr={};for(const k of['growth','cyc','lead']){const v=yn(a[k]);if(v!=null)it.attr[k]=v}if(a.theme)it.attr.theme=String(a.theme).trim()}
  if(!it.eps.length&&!it.guide&&!(it.attr&&Object.keys(it.attr).length)){it.on=0;it.warn.push('沒有要更新的內容')}});
 arr('themes').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`themes 第 ${i+1} 筆`;P.tm.push(it);const n=String(o.name||'').trim();if(!n){it.err.push(`${lb} 缺 name`);return}
  it.n=n;it.t={st:olDir(o.status??o.st),d:aiDate(o.date)||TODAY,src:String(o.src||''),note:String(o.note||'')};if(!it.t.st)it.err.push(`${lb} 的 status 看不懂（用 up／flat／down）`)});
 // 策略新版本：有改到的欄位才更新，版本號 +1，舊版本留在版本紀錄；upgradeTheses＝進行中的論點改跟隨新版
 arr('strategies').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`strategies 第 ${i+1} 筆`;P.sg.push(it);const id=String(o.id||'').trim().toUpperCase();if(!id){it.err.push(`${lb} 缺 id（例如 S04）`);return}
  const st=stStrat(S,id);it.id=id;it.st=st;it.f={};for(const k of ST_FIELDS){if(o[k]===undefined||o[k]===null)continue;let v=o[k];if(k=='rr')v=v===true||v==1||v=='1'?1:0;else if(typeof v=='number')v=String(v);else v=String(v);it.f[k]=v}
  if(!st&&!it.f.name){it.err.push(`${lb}：策略庫沒有 ${id}，要新增策略的話請給 name`);return}
  it.diff=st?Object.keys(it.f).filter(k=>String(st[k]??'')!==String(it.f[k])):Object.keys(it.f);
  const nv=st?st.ver+1:1;it.ver=nv;if(o.ver!=null&&+o.ver!==nv){if(st&&+o.ver<=st.ver){it.on=0;it.warn.push(`策略庫的 ${id} 已經是 v${st.ver}，這筆是 v${o.ver}，預設不匯入`)}else it.warn.push(`會建立成 v${nv}（不是 v${o.ver}）`)}
  if(!it.diff.length){it.on=0;it.warn.push('內容和策略庫相同，不用更新')}
  // 2026-11-12：策略檔（kind=strategies）或別人的策略：編號撞到時可以選「更新我的」或「新增成另一個編號」；別人的檔案預設新增
  if(st&&it.diff.length)it.asNew=P.meta.kind=='strategies'&&P.meta.q!='strat'?1:0;
  // 工具讀得懂幾條（別人的寫法可能有一半是 ❔）
  {const mg=Object.assign({},st||{},it.f);let n=0,a=0,xn=0,xa=0;if(typeof stConds=='function')for(const g of stConds(mg))for(const t of g.items){n++;if(typeof ckAuto=='function'&&ckAuto(t))a++}
   if(typeof exRules=='function')for(const x of exRules(mg)){xn++;try{if(ckParse(exNorm(x.cond)))xa++}catch(e){}}it.parse={n,a,xn,xa}}
  // 放寬／收緊：數字欄位自動判斷，AI 也要標（dir、basis）
  const DIRS={loosen:'loosen','放寬':'loosen',tighten:'tighten','收緊':'tighten'},BAS={logic:'logic','邏輯':'logic',limit:'limit','硬限制':'limit',test:'test','事前登記的測試':'test','測試':'test'};
  it.dir=DIRS[String(o.dir||'').trim()]||'';it.basis=BAS[String(o.basis||'').trim()]||'';
  if(st){const up=k=>num(it.f[k])!=null&&num(st[k])!=null&&num(it.f[k])>num(st[k]);it.autoL=['stopPct','riskPct','capStock','capGroup','capStrat','addHalt','holdMax'].filter(up)}
  it.reason=String(o.reason||'').trim()||(P.meta.kind=='strategies'?'從策略檔匯入':'從 AI 匯入');it.up=st&&o.upgradeTheses?(S.theses||[]).filter(T=>T.sid==id&&T.status!='exit'&&(+T.sver||1)<nv).map(T=>T.id):[]});
 // 庫存核對（套用這次的交易後再比）
 if(j.check){const items=Array.isArray(j.check)?j.check:Array.isArray(j.check.items)?j.check.items:[];P.ck={date:aiDate(j.check.date)||TODAY,items};}
 // AI 對出場訊號的看法（只記錄，不改判斷）
 arr('review').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},lb=`review 第 ${i+1} 筆`;P.rv.push(it);const T=stThesis(S,String(o.thesis||'').trim().toUpperCase());
  if(!T){it.err.push(o.thesis?`${lb}：找不到論點 ${o.thesis}`:`${lb} 缺 thesis（論點編號）`);return}it.T=T;
  const v=String(o.view||'').trim(),vv=(typeof AA_VIEW!='undefined'?AA_VIEW:[]).find(x=>v==x)||(typeof AA_VIEW!='undefined'?AA_VIEW:[]).find(x=>v.includes(x));if(!vv)it.warn.push(`view「${v||'（空）'}」不是五種之一，記成「查不到」`);
  const src=(Array.isArray(o.src)?o.src:o.src?[o.src]:[]).map(z=>typeof z=='string'?z:[z.name,z.date,z.url].filter(Boolean).join('，')).filter(Boolean);if(!src.length)it.warn.push('沒有附來源');
  it.r={d:TODAY,rule:String(o.rule||'').trim(),view:vv||'查不到',why:String(o.why||'').trim(),src}});
 // AI 對「要自己判斷的條件」的看法（只顯示在記交易與個股頁，不會替你勾）
 arr('manual').forEach((o,i)=>{const it={i,o,err:[],warn:[],info:[],on:1},c=cU(o.code||o.symbol||'');P.mn.push(it);it.c=c;const cond=String(o.cond||o.condition||'').trim();
  if(!c)it.err.push(`manual 第 ${i+1} 筆缺代號`);if(!cond)it.err.push(`manual 第 ${i+1} 筆缺 cond（條件原文）`);const src=(Array.isArray(o.src)?o.src:o.src?[o.src]:[]).map(z=>typeof z=='string'?z:[z.name,z.date,z.url].filter(Boolean).join('，')).filter(Boolean);if(!src.length)it.warn.push('沒有附來源');
  it.h={t:cond,ok:o.ok===true||o.ok==='true'?true:o.ok===false||o.ok==='false'?false:null,why:String(o.why||'').trim(),src,d:TODAY,ai:P.meta.ai||''}});
 if(P.meta.q=='eval'&&typeof evImpPre=='function')evImpPre(P);aiFlag(P);return P}
// 每一項標影響等級；🎯 有疑點的預設不勾（沒有來源或日期、超過 45 天、和同年度現有預估差 > 15%、AI 替你勾要自己判斷的條件、停損往下調、出場訊號討論裡的策略修改）
function aiFlag(P){const sus=(it,why)=>{if(!why.length)return;it.sus=why;if(it.on){it.on=0;it.warn.push('🎯 有疑點，預設不勾：'+why.join('、'))}};
 for(const it of P.th)if(it.conv)sus(it,['同一檔已有其他策略的論點']);
 for(const it of P.tr)it.tg=1;
 for(const it of P.th){it.tg=1;const man=it.met.filter(t=>!(typeof ckAuto=='function'&&ckAuto(t)));if(man.length)sus(it,[`AI 替你勾了 ${man.length} 項要自己判斷的條件（${man.slice(0,2).map(t=>t.replace(/〔[^〕]*〕/g,'')).join('、')}${man.length>2?'…':''}）`])}
 for(const it of P.up){const D=it.diff||[];it.tg=D.some(d=>d.f=='stop')?1:D.some(d=>d.f=='tgtPx')?2:3;const s=D.find(d=>d.f=='stop');if(s&&num(s.old)!=null&&num(s.nw)!=null&&+s.nw<+s.old)sus(it,[`停損價往下調（放寬）${s.old} → ${s.nw}`])}
 for(const it of P.ev)it.tg=it.e&&/除息|除權/.test(it.e.type)?1:2;
 for(const it of P.ol){it.tg=1;if(it.err.length)continue;const w=[];
  for(const e of it.eps||[]){const lb=`${e.y} 年 ${e.v}`;if(aiNoSrc(e.src))w.push(lb+' 沒有寫明機構');if(e.noD)w.push(lb+' 沒有日期');else if(dDays(e.d,TODAY)>45)w.push(lb+` 是 ${e.d} 的（超過 45 天）`);
   const o=typeof ckOut=='function'?ckOut(it.c):null,cur=o?o.lat(e.y):null;if(cur&&Math.abs(e.v/cur-1)>0.15)w.push(`${lb} 和現有預估 ${f2(cur)} 差 ${((e.v/cur-1)*100).toFixed(0)}%`)}
  if(it.guide){if(!(it.o.guide&&aiDate(it.o.guide.date)))w.push('法說指引沒有日期');if(aiNoSrc(it.guide.src))w.push('法說指引沒有來源')}
  sus(it,w)}
 for(const it of P.tm){it.tg=1;if(!it.err.length&&aiNoSrc(it.t.src))sus(it,['主題狀態沒有來源'])}
 for(const it of P.sg){it.tg=1;if(P.meta.q=='exit')sus(it,['這是出場訊號的討論；策略修改只在每季檢討時做']);
  if(P.meta.q=='strat'&&it.st){const w=[],LBF={stopPct:'預設停損',riskPct:'每筆風險',capStock:'個股上限',capGroup:'族群上限',capStrat:'策略合計上限',addHalt:'暫停加碼',holdMax:'持有上限'},dd=typeof aaDD=='function'?aaDD():null;
   if(!it.dir||!it.basis)w.push('沒有標放寬／收緊或依據');if(it.dir=='tighten'&&(it.autoL||[]).length)w.push(`標成收緊，但 ${(it.autoL||[]).map(k=>LBF[k]).join('、')} 變大（放寬）`);
   if((it.dir=='loosen'||(it.autoL||[]).length)&&dd!=null&&dd<=-10)w.push(`大盤離高點 ${dd.toFixed(1)}%（回檔 10% 以上），這段期間不放寬`);sus(it,w)}}
 for(const it of P.rv)it.tg=3;for(const it of P.mn){it.tg=3;if(!(it.h&&it.h.src&&it.h.src.length))sus(it,['沒有附來源'])}
 // 2026-11-12：依問題類型限制可以匯入的欄位（AI 不一定照提示做）；沒有 q 的匯入（每天記交易）不受限制
 const QK=typeof AA_QK!='undefined'?AA_QK[P.meta.q]:null;if(QK){const G={trades:P.tr,theses:P.th,updates:P.up,events:P.ev,outlook:P.ol,themes:P.tm,strategies:P.sg,review:P.rv,manual:P.mn},nm=(typeof AA_Q!='undefined'&&AA_Q[P.meta.q])||P.meta.q;
  P.qBad=[];for(const k in G){if(QK.includes(k)||!(G[k]||[]).length)continue;P.qBad.push(k);for(const it of G[k])sus(it,[`「${nm}」的回覆不該有 ${k}`])}}
 if(P.meta.q=='eval'&&typeof evImpFlag=='function')evImpFlag(P,sus)}
const aiTg=it=>it.tg?` <span class="aitg t${it.tg}">${AI_TG[it.tg]}</span>`:'';
function aiDiff(T,o){const D=[];for(const k in AI_UPD){if(o[k]===undefined||o[k]===null||o[k]==='')continue;const[f,lb]=AI_UPD[k],nv=['stop','tgtPx','expectM'].includes(f)?aiNum(o[k]):String(o[k]);if(nv==null)continue;if(String(T[f]??'')!==String(nv))D.push({f,lb,old:T[f]??'',nw:nv})}return D}

// ---------- 畫面
let AIP=null,AIR=null,AIX='';
// 🤖 AI 討論面板：📋 問 AI（ai-ask.js）｜📥 貼上回覆；記住上次用哪個分頁
let AITAB=null;
window.aiOpen=o=>{o=o||{};if(AITAB==null)AITAB=ls('lcaitab')||'paste';if(o.q){AITAB='ask';if(typeof aaInit=='function')aaInit(o)}else if(o.tab)AITAB=o.tab;else if(AITAB=='ask'&&typeof aaInit=='function')aaInit({});
 asOvOpen(aiHtml());aiSide();if(AITAB=='ask'&&typeof aaRender=='function')aaRender()};
window.aiTab=t=>{AITAB=t;ls('lcaitab',t);$('aiAsk').style.display=t=='ask'?'':'none';$('aiPaste').style.display=t=='paste'?'':'none';document.querySelectorAll('.aitabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));if(t=='ask'&&typeof aaRender=='function'){if(!$('aiAsk').innerHTML&&typeof aaInit=='function')aaInit({});aaRender()}};
function aiHtml(){return`<div class=ovh><button onclick="asClose()">✕</button><b>🤖 AI 討論</b></div>
 <div class=aitabs><button data-t=ask class="${AITAB=='ask'?'on':''}" onclick="aiTab('ask')">📋 問 AI</button><button data-t=paste class="${AITAB=='paste'?'on':''}" onclick="aiTab('paste')">📥 貼上回覆</button></div>
 <div id=aiAsk style="${AITAB=='ask'?'':'display:none'}"></div>
 <div id=aiPaste style="${AITAB=='paste'?'':'display:none'}">
 <div class=asbtn style="margin:4px 0 6px"><label class=filebtn>📂 選擇檔案（.txt／.json）<input type=file accept=".txt,.json,.md,text/plain,application/json" onchange="aiFile(this)" style="display:none"></label><span class=h>AI 有整理好檔案就用這個；沒有就把整段回覆貼到下面（工具會自己找出 JSON）。</span></div>
 <textarea id=aiTx rows=8 style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:12px" placeholder='{"format":"投資帳本 v1","trades":[…]}'>${esc(AIX)}</textarea>
 <div class=asbtn><button class=pri onclick="aiRun()">解析並預覽</button><button onclick="$('aiTx').value='';AIX='';AIP=null;$('aiPv').innerHTML=''">清除</button></div>
 <div class=h>每天記交易：請 AI「用投資帳本 v1 格式輸出」今天的成交；格式說明在專案文件〈工具說明與結算流程〉，或用「📋 問 AI」複製時會自動附上。</div>
 <div id=aiPv></div><div id=aiSd></div></div>`}
window.aiFile=el=>{const f=el.files&&el.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{$('aiTx').value=String(rd.result||'');el.value='';aiRun()};rd.onerror=()=>toast('讀不到這個檔案',0);rd.readAsText(f,'utf-8')};
window.aiRun=()=>{AIX=$('aiTx').value;const r=aiExtract(AIX);if(!r.err&&typeof usPasteHook=='function'&&usPasteHook(r.j,AIX))return; /* 只有美股部位的回覆交給 us-ui.js */if(r.err){AIP=null;$('aiPv').innerHTML=`<div class=stal style="border-color:#fca5a5;background:#fef2f2"><b>❌ 解析失敗</b><div>${esc(r.err)}</div>${r.txt!=null&&r.line?`<div class=h>第 ${r.line} 行：<code>${esc(r.txt)}</code></div>`:''}</div>`;return}AIP=aiPlan(r.j);if(r.fixed=='nl')AIP.glob.push('已自動接回文字中間被拆開的換行（手機複製時常發生）。');else if(r.fixed)AIP.glob.push('已自動修正換行、全形引號或多餘的逗號。');aiPrevRender()};
const aiMsgs=it=>it.err.map(s=>`<div class=bad>❌ ${esc(s)}</div>`).join('')+it.warn.map(s=>`<div class=wn>⚠️ ${esc(s.replace(/^⚠️ /,''))}</div>`).join('')+it.info.map(s=>`<div class=h>ℹ️ ${esc(s)}</div>`).join('');
const aiCk=(k,it)=>`<input type=checkbox data-ai="${k}" ${it.on&&!it.err.length?'checked':''} ${it.err.length?'disabled':''} onchange="aiTog('${k}',this.checked)">`;
window.aiSgAs=(i,v)=>{const it=AIP&&AIP.sg[i];if(it)it.asNew=+v?1:0;aiSum()};
window.aiTog=(k,v)=>{const t={t:'tr',h:'th',u:'up',e:'ev',o:'ol',m:'tm',g:'sg',r:'rv',n:'mn'}[k[0]],it=AIP[t][+k.slice(1)];if(it)it.on=v?1:0;aiSum();if(typeof aiDiffRun=='function')aiDiffRun()};
function aiTh(it){if(it.ref&&AIP){const h=AIP.th.find(z=>z.ref==it.ref);if(h)return h.merge?h.merge.id:h.id?h.id+'（新）':'（新論點有錯）'}return it.tid||''}
function aiPrevRender(){const P=AIP,el=$('aiPv');let h='';
 h+=`<div class=h>這次回覆：${esc(P.meta.ai||'沒寫是哪個 AI')}｜${esc((typeof AA_Q!='undefined'&&AA_Q[P.meta.q])||'沒寫問題類型')}${P.meta.snap?'｜快照 '+esc(P.meta.snap):''}</div><div class=h>🎯 會改變自動判斷　🔔 會改變提醒　📝 只是紀錄；🎯 有疑點的預設不勾，確認後再勾。</div>`;
 if(P.glob.length)h+=`<div class=stal>${P.glob.map(s=>`<div>· ${esc(s)}</div>`).join('')}</div>`;
 if(P.sum)h+=`<details><summary class=h>AI 的摘要</summary><div class=h style="white-space:pre-wrap">${esc(P.sum)}</div></details>`;
 if(P.rv.length)h+=`<div class=sub>AI 的看法（${P.rv.length}）</div>`+P.rv.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('r'+i,it)}<div><b>${it.T?it.T.id+' '+esc(cU(it.T.code))+' '+esc(nameOf(it.T.code)):'?'}${it.r&&it.r.rule?'｜'+esc(it.r.rule):''}</b>${aiTg(it)}${it.r?`<div><b>${esc(it.r.view)}</b>${it.r.why?'：'+esc(it.r.why):''}</div>${it.r.src.length?`<div class=h>來源：${it.r.src.map(esc).join('；')}</div>`:''}`:''}${aiMsgs(it)}</div></label>`).join('');
 if(P.th.length)h+=`<div class=sub>新論點／更新論點（${P.th.length}）</div>`+P.th.map((it,i)=>{const o=it.o;return`<label class="aii ${it.err.length?'aie':''}">${aiCk('h'+i,it)}<div><b>${it.merge?'更新 '+it.merge.id:(it.id||'—')+' 新論點'}</b>${aiTg(it)}｜${esc(it.c)} ${esc(nameOf(it.c))}｜${esc(it.sid)}${it.st?' '+esc(it.st.name)+' v'+it.ver:''}${it.tags.length?'｜'+esc(it.tags.join('、')):''}
  <div class=h>符合 ${it.met.length} 項${it.pend.length?'、待確認 '+it.pend.length+' 項':''}${it.no.length?'、不符合 '+it.no.length+' 項':''}｜停損 ${it.stop??'—'}｜目標 ${it.tgt??'—'}｜預計 ${esc(o.expectM??'—')} 個月｜分批 ${it.plan.length||'依策略'}</div>
  ${o.why?`<div class=h>為什麼買：${esc(String(o.why).slice(0,80))}${String(o.why).length>80?'…':''}</div>`:''}
  ${it.diff&&it.diff.length?it.diff.map(d=>`<div class=h>${esc(d.lb)}：${esc(String(d.old)||'（空）')} → <b>${esc(String(d.nw))}</b></div>`).join(''):''}${aiMsgs(it)}</div></label>`}).join('');
 if(P.tr.length)h+=`<div class=sub>交易（${P.tr.length}）</div>`+P.tr.map((it,i)=>{const x=it.x||{},m=it.m;return`<label class="aii ${it.err.length?'aie':''} ${it.dup?'aid':''}">${aiCk('t'+i,it)}<div><b>${esc(x.dt||'?')} ${asKN(x.k)||'?'}</b>${aiTg(it)} ${esc(x.n||'?')} ${esc(nameOf(x.n||''))}｜${x.ac=='a'?'⚡ 主動':'🛡️ 被動'}｜${x.k=='div'?'每股 '+esc(x.dps):R(x.q||0)+' 股 @'+esc(x.px)}${x.rs?' <span class=rsc>'+asRsN(x.rs)+'</span>':''}${aiTh(it)?' <span class="thc on">'+esc(aiTh(it))+'</span>':x.ac=='a'&&(x.k=='buy'||x.k=='sell')?' <span class=thc>未分類</span>':''}
  ${m&&(x.k=='buy'||x.k=='sell')?`<div class=h>手續費 ${R(m.fee)}${x.k=='sell'?'｜證交稅 '+R(m.tax):''}｜${x.k=='buy'?'付出':'收到'} ${R(Math.abs(m.cash))} 元${S.feeMode=='month'?'（券商先收全額 '+R(fullFee(x))+'，折讓每月退回）':''}</div>`:''}${aiMsgs(it)}</div></label>`}).join('');
 if(P.up.length)h+=`<div class=sub>修改既有論點（${P.up.length}）</div>`+P.up.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('u'+i,it)}<div><b>${it.T?it.T.id+' '+esc(cU(it.T.code))+' '+esc(nameOf(it.T.code)):'?'}</b>${aiTg(it)}${(it.diff||[]).map(d=>`<div class=h>${esc(d.lb)}：${esc(String(d.old)||'（空）')} → <b>${esc(String(d.nw))}</b></div>`).join('')}${aiMsgs(it)}</div></label>`).join('');
 if(P.ev.length)h+=`<div class=sub>事件提醒（${P.ev.length}）</div>`+P.ev.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('e'+i,it)}<div><b>${esc(it.e.date||'?')} ${esc(it.e.type)}</b>${aiTg(it)} ${esc(it.e.code)} ${esc(nameOf(it.e.code))}<div class=h>${esc(it.e.note)}</div>${aiMsgs(it)}</div></label>`).join('');
 const aA=a=>a?['growth','cyc','lead'].filter(k=>a[k]!=null).map(k=>({growth:'結構性成長',cyc:'景氣循環',lead:'產業龍頭'})[k]+(a[k]?'：是':'：否')).concat(a.theme?['主題：'+a.theme]:[]).join('、'):'';
 if(P.ol.length)h+=`<div class=sub>前瞻資料（${P.ol.length}）</div>`+P.ol.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('o'+i,it)}<div><b>${esc(it.c)} ${esc(nameOf(it.c))}</b>${aiTg(it)}${(it.eps||[]).length?`<div class=h>EPS 預估：${it.eps.map(e=>`${e.y} 年 ${e.v}（${esc(e.src||'未註明')}，${e.d}）`).join('；')}</div>`:''}${it.guide?`<div class=h>法說指引（${it.guide.d}）：營收${olDirN(it.guide.rev)}、毛利率${olDirN(it.guide.gm)}${it.guide.note?'｜'+esc(it.guide.note):''}</div>`:''}${it.attr&&aA(it.attr)?`<div class=h>股票屬性：${esc(aA(it.attr))}</div>`:''}${aiMsgs(it)}</div></label>`).join('');
 if(P.tm.length)h+=`<div class=sub>主題指標（${P.tm.length}）</div>`+P.tm.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('m'+i,it)}<div><b>${esc(it.n||'?')}</b>${aiTg(it)}：${it.t?olDirN(it.t.st):'?'}${it.t?` <span class=h>${it.t.d}${it.t.note?'｜'+esc(it.t.note):''}</span>`:''}${aiMsgs(it)}</div></label>`).join('');
 if(P.sg.length){const LB={name:'名稱',logic:'邏輯說明',term:'期別',screen:'選什麼',entry:'何時買／買多少',exit:'何時賣',holdMin:'持有下限',holdMax:'持有上限',capStock:'個股上限',capGroup:'族群上限',capStrat:'策略合計上限',stopPct:'預設停損',stopTech:'技術停損',riskPct:'每筆風險',rr:'檢查賺賠比',addDays:'加碼間隔',addPx:'加碼價差方向',addPxPct:'加碼價差',addHalt:'暫停加碼'};
  h+=`<div class=sub>策略新版本（${P.sg.length}）</div>`+P.sg.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('g'+i,it)}<div><b>${esc(it.id||'?')} ${esc(it.st?it.st.name:(it.f&&it.f.name)||'')}</b>${aiTg(it)}${it.st?`：v${it.st.ver} → <b>v${it.ver}</b>`:'：新策略 v1'}${it.diff&&it.diff.length?`<div class=h>改了：${it.diff.map(k=>LB[k]||k).join('、')}</div>`:''}<div class=h>原因：${esc(it.reason||'')}${it.dir||it.basis?`｜${it.dir=='loosen'?'放寬':it.dir=='tighten'?'收緊':'—'}｜依據：${{logic:'邏輯',limit:'硬限制',test:'事前登記的測試'}[it.basis]||'—'}`:''}</div>${it.parse?`<div class=h>工具讀得懂：條件 ${it.parse.a}／${it.parse.n} 條、出場規則 ${it.parse.xa}／${it.parse.xn} 條${it.parse.n&&it.parse.a<it.parse.n/2?'（一半以上要自己判斷）':''}</div>`:''}${it.st&&it.diff&&it.diff.length?`<div class=h>編號 ${esc(it.id)} 已經有了：<select onchange="aiSgAs(${i},this.value)"><option value=0 ${!it.asNew?'selected':''}>更新我的 ${esc(it.id)}（v${it.st.ver} → v${it.ver}）</option><option value=1 ${it.asNew?'selected':''}>新增成另一個編號</option></select></div>`:''}${it.up&&it.up.length?`<div class=h>論點 ${it.up.join('、')} 改跟隨 v${it.ver}</div>`:''}${it.f&&it.diff&&it.diff.includes('entry')?`<details><summary class=h>新的何時買／買多少</summary><div class=h style="white-space:pre-wrap">${esc(it.f.entry)}</div></details>`:''}${aiMsgs(it)}</div></label>`).join('')}
 if(P.ck)h+=aiCheckHtml(P);
 if(P.mn.length)h+=`<div class=sub>AI 對要自己判斷的條件的看法（${P.mn.length}）</div>`+P.mn.map((it,i)=>`<label class="aii ${it.err.length?'aie':''}">${aiCk('n'+i,it)}<div><b>${esc(it.c||'?')} ${esc(nameOf(it.c||''))}</b>${aiTg(it)}<div>${it.h?(it.h.ok===true?'✅ 認為符合':it.h.ok===false?'❌ 認為不符合':'❔ 判斷不了')+'：'+esc(it.h.t):''}</div>${it.h&&it.h.why?`<div class=h>${esc(it.h.why)}${it.h.src.length?'（'+it.h.src.map(esc).join('；')+'）':''}</div>`:''}${aiMsgs(it)}</div></label>`).join('');
 if(P.qBad&&P.qBad.length)h+=`<div class=wn>這是「${esc((typeof AA_Q!='undefined'&&AA_Q[P.meta.q])||P.meta.q)}」的回覆，裡面有不該出現的 ${esc(P.qBad.join('、'))}，預設不勾；真的要匯入請自己勾。</div>`;
 if(!P.th.length&&!P.tr.length&&!P.up.length&&!P.ev.length&&!P.ol.length&&!P.tm.length&&!P.sg.length&&!P.rv.length&&!P.mn.length&&!P.ck)h+='<div class=wn>沒有找到 trades、theses、updates、events、outlook、themes、strategies、review 或 check。</div>';
 h+=`<div id=aiDiff class=aidf><div class=h>⏳ 試算這次匯入會改變哪些判斷…</div></div><div class=asbtn><button class=pri id=aiGo onclick="aiCommit()"></button><button onclick="asClose()">取消</button></div><div class=h>匯入前會自動存還原點；匯入後可以在下方「匯入紀錄」整批復原。</div>`;
 el.innerHTML=h;aiSum()}
function aiSum(){const b=$('aiGo');if(!b||!AIP)return;if(!AIP._df&&typeof aiDiffRun=='function'){AIP._df=1;setTimeout(aiDiffRun,30)}const n=t=>AIP[t].filter(it=>it.on&&!it.err.length).length,a=n('tr'),t=n('th'),u=n('up'),e=n('ev'),o=n('ol'),m=n('tm'),g=n('sg'),r=n('rv')+n('mn');b.innerText=`確認匯入（交易 ${a}、論點 ${t}、修改 ${u}、事件 ${e}${o?'、前瞻 '+o:''}${m?'、主題 '+m:''}${g?'、策略 '+g:''}${r?'、AI 看法 '+r:''}）`;b.disabled=!(a+t+u+e+o+m+g+r)}
// 庫存核對：套用這次勾選的交易後，逐檔比股數（有給成本也比成本）
function aiCheckHtml(P){const S2=clone(S);S2.trades=(S2.trades||[]).concat(P.tr.filter(it=>it.on&&!it.err.length).map(it=>Object.assign(NEW.trades(),it.x)));
 const H={},HB=asHoldB(S2);for(const o of holdings(S2)){if(o.q<=0)continue;const c=cU(o.n);H[c]=H[c]||{q:0,cb:0};H[c].q+=o.q;H[c].cb+=(HB[o.ac+'|'+c]||{}).cost||0}
 const A={};for(const z of P.ck.items){const c=cU(z.code||'');if(c)A[c]={q:aiNum(z.qty)??0,cost:aiNum(z.cost)}}
 const codes=[...new Set(Object.keys(H).concat(Object.keys(A)))].sort();let bad=0;
 const rows=codes.map(c=>{const t=H[c]||{q:0,cb:0},a=A[c],dq=a?a.q-t.q:null,dc=a&&a.cost!=null?a.cost-t.cb:null,okq=a&&dq==0,okc=dc==null||Math.abs(dc)<=Math.max(30,Math.abs(a.cost)*0.002);if(!a||!okq||!okc)bad++;
  return`<tr class="${!a||!okq?'bad':!okc?'wn':''}"><td>${esc(c)} <small>${esc(nameOf(c))}</small></td><td>${R(t.q)}</td><td>${a?R(a.q):'—'}</td><td>${!a?'App 沒有這檔':dq?(dq>0?'App 多 ':'App 少 ')+R(Math.abs(dq))+' 股':'✓'}</td><td>${dc==null?'':okc?'✓':(dc>0?'App 多 ':'App 少 ')+R(Math.abs(dc))+' 元'}</td></tr>`}).join('');
 return`<div class=sub>庫存核對（${esc(P.ck.date)}，已套用這次的交易）</div><div class=w><table class=stt><thead><tr><th>代號</th><th>工具股數</th><th>App 股數</th><th>股數</th><th>成本</th></tr></thead><tbody>${rows}</tbody></table></div><div class="${bad?'wn':'ok'}" style="font-size:12.5px">${bad?`有 ${bad} 檔對不上：股數不同通常是漏記或重複記了交易；成本差一點點通常是手續費算法。`:'✅ 每一檔股數都對得上。'}</div>`}

// ---------- 寫入（一次匯入＝一批，可以整批復原）
// 套用匯入到目前的 S（真的匯入時是使用者的資料；預覽後果差異時暫時換成一份副本）。回傳批次紀錄 B
function aiApplyTo(P){
 const B={id:'b'+Date.now().toString(36),at:new Date().toISOString(),tr:[],th:[],ev:[],upd:[],tags:[],plan:[],ol:[],tm:[],sg:[],rv:[],mn:[],ai:(P.meta||{}).ai||'',q:(P.meta||{}).q||''},idOf={};
 // 前瞻資料與主題指標（記下原本的內容，整批復原時還原）
 S.outlook=S.outlook||{};S.attr=S.attr||{};S.themes=S.themes||{};
 for(const it of P.ol){if(!it.on||it.err.length)continue;const c=it.c;B.ol.push({c,o:JSON.stringify(S.outlook[c]??null),a:JSON.stringify(S.attr[c]??null)});const o=S.outlook[c]=S.outlook[c]||{};
  if(it.eps.length)o.eps=(o.eps||[]).concat(it.eps);if(it.guide)o.guide=Object.assign({},o.guide||{},Object.fromEntries(Object.entries(it.guide).filter(([k,v])=>v!=='')));if(it.attr&&Object.keys(it.attr).length)S.attr[c]=Object.assign({},S.attr[c]||{},it.attr,{d:TODAY})}
 for(const it of P.tm){if(!it.on||it.err.length)continue;B.tm.push({n:it.n,o:JSON.stringify(S.themes[it.n]??null)});S.themes[it.n]=it.t}
 const setF=(T,f,v)=>{B.upd.push({id:T.id,f,old:T[f]});T[f]=v};
 // 策略新版本（記下原本的整個策略，整批復原時換回來）
 for(const it of P.sg||[]){if(!it.on||it.err.length)continue;let st=stStrat(S,it.id);B.sg.push({id:it.id,o:JSON.stringify(st??null)});
  if(!st||it.asNew){const nid=st?stNextId(S.strategies,'S',2):it.id,base=st&&it.asNew?Object.assign({},stSnapOf(st),it.f):it.f;if(st)B.sg[B.sg.length-1]={id:nid,o:'null'};st=stNewStrategy(S,base,TODAY);st.id=nid;S.strategies.push(st);continue}
  Object.assign(st,it.f);st.ver=it.ver;st.hist=st.hist||[];st.hist.push({ver:st.ver,date:TODAY,reason:it.reason,snap:stSnapOf(st)});for(const id of it.up){const T=stThesis(S,id);if(T)setF(T,'sver',st.ver)}}
 for(const it of P.th){if(!it.on||it.err.length)continue;const o=it.o;let T;
  if(it.merge){T=stThesis(S,it.merge.id);for(const d of it.diff||[])setF(T,d.f,d.nw);if(it.met.length||it.pend.length){setF(T,'met',[...new Set((T.met||[]).concat(it.met))]);setF(T,'pend',[...new Set((T.pend||[]).concat(it.pend))]);setF(T,'metNote',Object.assign({},T.metNote||{},it.note))}}
  else if(it.conv&&it.conv.status=='plan'&&stThesis(S,it.conv.id)){T=stThesis(S,it.conv.id);setF(T,'sid',it.sid);setF(T,'sver',it.ver);for(const[f,v]of[['why',o.why],['wrongIf',o.wrongIf],['stop',it.stop],['tgtPx',it.tgt]])if(v!=null&&v!=='')setF(T,f,f=='why'||f=='wrongIf'?String(v):v);if(it.met.length)setF(T,'met',it.met);if(it.pend.length)setF(T,'pend',it.pend)}
  else if(it.conv&&it.conv.status=='hold'&&stThesis(S,it.conv.id)&&num((S.px||{})[it.c])!=null){const O=stThesis(S,it.conv.id),ox=JSON.stringify(O.exit||{});T=stConvert(S,O.id,it.sid,num(S.px[it.c]),TODAY);
   if(T){B.cv=B.cv||[];B.cv.push({id:O.id,exit:ox});B.th.push(T.id);T.src='ai';T.batch=B.id;if(o.why)T.why=String(o.why);if(o.wrongIf)T.wrongIf=String(o.wrongIf);if(it.stop!=null)T.stop=it.stop;if(it.tgt!=null)T.tgtPx=it.tgt;if(it.met.length){T.met=it.met;T.metNote=it.note;T.metAt=TODAY}if(it.pend.length)T.pend=it.pend}}
  if(!T){T=stNewThesis(S,{code:it.c,sid:it.sid,sver:it.ver,status:'plan',created:it.created||(P.tr.find(z=>z.ref==it.ref&&z.x)||{x:{}}).x.dt||TODAY,why:String(o.why||''),wrongIf:String(o.wrongIf||''),expectM:aiNum(o.expectM)??'',stop:it.stop??'',tgtPx:it.tgt??'',target:[o.targetNote,o.exitNote].filter(Boolean).join('\n'),met:it.met,pend:it.pend,metNote:it.note,metAt:it.created||TODAY,src:'ai',batch:B.id});
   if(it.plan.length)T.plan=it.plan.map(p=>({n:p.n,cond:p.cond,pct:p.pct,tid:''}));stThDefaults(S,T,(P.meta||{}).q=='eval'?(typeof evPx=='function'?evPx(it.c):num((S.px||{})[it.c])):null);S.theses.push(T);B.th.push(T.id);
   if((P.meta||{}).q=='eval'){T.src0=(typeof AA_CTX!='undefined'&&AA_CTX&&AA_CTX.src0)||'stock';if(it.risk)T.riskNote=it.risk;B.evTh=(B.evTh||[]).concat([T.id])}}
  idOf[it.ref]=T.id;
  if(it.tags.length){B.tags.push({c:it.c,old:(S.tags||{})[it.c]});S.tags=S.tags||{};S.tags[it.c]=it.tags}else if(typeof asTagDef=='function'&&!(S.tags||{})[it.c]){B.tags.push({c:it.c,old:undefined});asTagDef(it.c)}}
 const made=[];
 P.tr.forEach((it,i)=>{if(!it.on||it.err.length)return;const x=Object.assign(NEW.trades(),it.x,{src:'ai',batch:B.id}),tid=it.ref?idOf[it.ref]:it.tid;if(tid)x.thesisId=tid;S.trades.push(x);B.tr.push(x.id);made[i]=x;
  const T=tid?stThesis(S,tid):null;if(T&&x.k=='buy'){const h=P.th.find(z=>z.ref==it.ref);const pr=h&&h.plan.find(p=>p.trade===i);const row=pr?(T.plan||[]).find(r=>r.n==pr.n):null;if(row&&!row.tid){row.tid=x.id;B.plan.push({id:T.id,tid:x.id})}else{const r0=(T.plan||[]).find(r=>!r.tid);stLinkPlan(T,x);if(r0&&r0.tid==x.id)B.plan.push({id:T.id,tid:x.id})}}});
 for(const it of P.up){if(!it.on||it.err.length)continue;const T=stThesis(S,it.T.id);if(T)for(const d of it.diff)setF(T,d.f,d.nw)}
 S.events=S.events||[];for(const it of P.ev){if(!it.on||it.err.length)continue;const e=Object.assign({id:'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),done:0,src:'ai',batch:B.id},it.e);S.events.push(e);B.ev.push(e.id)}
 for(const it of P.rv||[]){if(!it.on||it.err.length)continue;const T=stThesis(S,it.T.id);if(!T)continue;T.aiRev=(T.aiRev||[]).concat([Object.assign({},it.r,{ai:B.ai,q:B.q,batch:B.id})]).slice(-20);B.rv.push(T.id)}
 S.aiHint=S.aiHint||{};for(const it of P.mn||[]){if(!it.on||it.err.length)continue;const c=it.c,L=S.aiHint[c]||[];B.mn.push({c,o:JSON.stringify(S.aiHint[c]??null)});S.aiHint[c]=L.filter(h=>h.t!=it.h.t).concat([Object.assign({},it.h,{batch:B.id})]).slice(-30)}
 // 評估新股票建立的論點：App 判斷不是 ✅（用匯入後的資料）就標「規則外觀察」，績效另外算
 if(B.evTh&&typeof evCheck=='function'){if(typeof CKM!='undefined')for(const k in CKM)delete CKM[k];for(const id of B.evTh){const T=stThesis(S,id),st=T&&stStrat(S,T.sid);if(!st)continue;const r=evCheck(T.code,st);if(r.v!='ok')T.ovr={d:TODAY,v:r.v,why:r.why}}}
 // 賣到股數歸零的論點：出場原因依賣出依據
 stSync(S);for(const x of made.filter(Boolean)){if(x.k!='sell'||!x.thesisId)continue;const T=stThesis(S,x.thesisId);if(T&&T.status=='exit'&&!T.exit.reason){T.exit.reason=AS_RS2EXIT[x.rs]||'';T.exit.date=T.exit.date||x.dt}}
 return B}
window.aiCommit=async()=>{const P=AIP;if(!P)return;await rpSave('AI 匯入前');const B=aiApplyTo(P);
 const sum=`交易 ${B.tr.length}、新論點 ${B.th.length}${B.th.length?'（'+B.th.join('、')+'）':''}、修改 ${new Set(B.upd.map(u=>u.id)).size}、事件 ${B.ev.length}${B.ol.length?'、前瞻 '+B.ol.length:''}${B.tm.length?'、主題 '+B.tm.length:''}${B.sg.length?'、策略 '+B.sg.map(x=>x.id).join('、'):''}${B.rv.length?'、AI 看法 '+B.rv.length:''}${B.mn.length?'、條件看法 '+B.mn.length:''}`;B.sum=sum;
 S.imports=[B].concat(S.imports||[]).slice(0,20);
 if(typeof trEd!='undefined')trEd.clear();renderTrades();stBuild();upd();if(typeof pxApply=='function')pxApply();AIP=null;AIX='';
 $('asOvB').innerHTML=`<div class=ovh><button onclick="asClose()">✕</button><b>✅ 已匯入</b></div><div>${esc(sum)}</div>
  ${S.bkAsk===0?'':`<div class=stal style="margin-top:8px"><b>要匯出備份嗎？</b><div class=asbtn><button class=pri onclick="exp();asClose()">⬇️ 匯出設定檔</button><button onclick="asClose()">這次不用</button></div><label class=ck style="margin-top:4px"><input type=checkbox onchange="S.bkAsk=this.checked?0:1;save()">以後匯入後不要再問（仍會在超過 7 天沒備份時提醒）</label></div>`}
  <div class=asbtn><button onclick="aiOpen({tab:'paste'})">再貼一次</button><button onclick="asClose()">回資產頁</button></div>`;if(typeof aaAfterImport=='function')aaAfterImport(B)};
window.aiUndo=async id=>{const B=(S.imports||[]).find(b=>b.id==id);if(!B||B.undone)return;if(!confirm(`整批復原 ${aiT(B.at)} 的匯入（${B.sum}）？目前的資料會先存成還原點。`))return;await rpSave('整批復原前');
 for(const v of B.cv||[]){const T=stThesis(S,v.id);if(T){T.exit=JSON.parse(v.exit||'{}');T.status='hold'}}
 const tr=new Set(B.tr),th=new Set(B.th),ev=new Set(B.ev);S.trades=S.trades.filter(x=>!tr.has(x.id));S.theses=S.theses.filter(T=>!th.has(T.id));S.trades.forEach(x=>{if(th.has(x.thesisId))x.thesisId=''});S.events=(S.events||[]).filter(e=>!ev.has(e.id));
 for(const u of B.upd.slice().reverse()){const T=stThesis(S,u.id);if(T)T[u.f]=u.old}for(const p of B.plan||[]){const T=stThesis(S,p.id);if(T)(T.plan||[]).forEach(r=>{if(r.tid==p.tid)r.tid=''})}
 for(const t of B.tags.slice().reverse()){if(t.old===undefined)delete S.tags[t.c];else S.tags[t.c]=t.old}
 for(const x of (B.ol||[]).slice().reverse()){const o=JSON.parse(x.o),a=JSON.parse(x.a);if(o==null)delete S.outlook[x.c];else S.outlook[x.c]=o;if(a==null)delete S.attr[x.c];else S.attr[x.c]=a}
 for(const x of (B.tm||[]).slice().reverse()){const o=JSON.parse(x.o);if(o==null)delete S.themes[x.n];else S.themes[x.n]=o}
 for(const x of (B.sg||[]).slice().reverse()){const o=JSON.parse(x.o),k=S.strategies.findIndex(s=>s.id==x.id);if(o==null){if(k>=0)S.strategies.splice(k,1)}else if(k>=0)S.strategies[k]=o;else S.strategies.push(o)}
 for(const x of (B.mn||[]).slice().reverse()){const o=JSON.parse(x.o);S.aiHint=S.aiHint||{};if(o==null)delete S.aiHint[x.c];else S.aiHint[x.c]=o}
 for(const T of S.theses){if(T.aiRev)T.aiRev=T.aiRev.filter(x=>x.batch!=B.id);if(T.status=='exit'&&stPerf(S,T).open)T.status='hold'}
 B.undone=TODAY;if(typeof trEd!='undefined')trEd.clear();renderTrades();stBuild();upd();toast('已整批復原',0);aiOpen({tab:'paste'})};
async function aiSide(){const el=$('aiSd');if(!el)return;const L=await rpAll(),I=(S.imports||[]).slice(0,10);
 el.innerHTML=`<details style="margin-top:10px"><summary class=h>📜 匯入紀錄（${I.length}）</summary>${I.map(b=>`<div class=astl><span>${esc(aiT(b.at))}</span><span>${esc(b.sum||'')}${b.ai||b.q?` <small class=h>（${esc([b.ai,(typeof AA_Q!='undefined'&&AA_Q[b.q])||''].filter(Boolean).join('｜'))}）</small>`:''}${b.undone?' <small class=h>已復原</small>':''}</span>${b.undone?'<span></span>':`<button onclick="aiUndo('${b.id}')">整批復原</button>`}</div>`).join('')||'<div class=h>還沒有匯入過。</div>'}</details>
 <details style="margin-top:6px"><summary class=h>🛟 還原點（最近 ${RP_MAX} 份，只存在這台裝置的瀏覽器）</summary>${L.map(o=>`<div class=astl><span>${esc(aiT(o.at))}</span><span>${esc(o.label)}｜${o.n} 筆交易</span><button onclick="rpRestore(${o.id})">還原</button></div>`).join('')||'<div class=h>還沒有還原點（每次匯入前會自動建立）。</div>'}
 <label class=ck style="margin-top:6px"><input type=checkbox ${S.bkAsk===0?'':'checked'} onchange="S.bkAsk=this.checked?1:0;save()">匯入後詢問要不要匯出備份</label></details>`}

// ---------- 事件提醒的動作
window.evDone=id=>{const e=(S.events||[]).find(x=>x.id==id);if(e){e.done=1;upd()}};
window.evDiv=id=>{const e=(S.events||[]).find(x=>x.id==id);if(!e)return;const h=holdings(S).find(o=>cU(o.n)==e.code);asTradeOpen({c:e.code,ac:h?h.ac:'a',k:'div',dt:e.date})};
