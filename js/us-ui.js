// 資產頁導覽（今日｜總覽｜台股｜美股）、美股那一格、總覽那一格、更新部位的表單
// 規格：〈美股整合規格_v3_2026-11-14〉第 3 節；美股畫面照 v2.0 第 2.1 節。只做快照模式（帳本模式是 C 批）。
// 台股的數字一律呼叫現有函式（asSum、asCash、settle），這裡不重算；美股數字不寫進任何信貸、台股的欄位。
// 依賴 ui.js（$、esc、ls、save、toast、R、W2）、asset-ui.js（asOvOpen、asClose、asCalc、asCash）、us-engine.js、prices.js（pxGet、pxStatus）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

let AV=ls('lcav')||'today',USC=ls('lcuc')=='TWD'?'TWD':'USD',USG=ls('lcug')=='a'?'a':'m',USS=ls('lcuso')||'mv',USE=null,USFX={file:null,alt:null,t:0,busy:0};
try{const c=JSON.parse(ls('lcfx')||'null');if(c){USFX.file=c.file||null;USFX.alt=c.alt||null}}catch(e){}
// 自動資料（每個人都一樣的公開檔案）：美股收盤價、財報日、總經日曆；記在這台裝置，離線時用上一次的
let USDT={px:null,ev:null,mac:null,t:0,busy:0},USP=null,USQ={q:'week',n:'',amt:0},USUNDO=null;
try{const c=JSON.parse(ls('lcusd')||'null');if(c){USDT.px=c.px||null;USDT.ev=c.ev||null;USDT.mac=c.mac||null}}catch(e){}
const usAu=()=>usAuto(USDT.px);
async function usDataLoad(force){if(USDT.busy||(!force&&Date.now()-USDT.t<18e5))return;USDT.busy=1;USDT.t=Date.now();let ch=0;
 for(const [k,f] of [['px','us/prices.json'],['ev','us/events.json'],['mac','us/macro.json']]){try{const j=typeof pxGet=='function'?await pxGet(f):null;
   if(j&&JSON.stringify(j)!=JSON.stringify(USDT[k])&&(k!='px'||!USDT.px||(j.d||'')>=(USDT.px.d||''))){USDT[k]=j;ch=1}}catch(e){}}
 USDT.busy=0;if(ch){try{ls('lcusd',JSON.stringify({px:USDT.px,ev:USDT.ev,mac:USDT.mac}))}catch(e){}if(typeof stWs=='function'&&stWs()=='as'&&avOn())asCalc()}
 if(force)toast(ch?'美股價格已更新':'美股價格沒有新的資料',0)}
// 金額走勢：每台裝置自己累積（不會因為每天多一點就跳「尚未備份」），真的改部位時才一起寫進設定檔
const usHistGet=()=>{let L=[];try{L=JSON.parse(ls('lcush')||'[]')}catch(e){}return usHistAdd((S.us.hist||[]).concat(L),null,TODAY)};
function usHistTick(T,fx){if(!(T.valC>0))return;const d=T.rows.map(r=>r.pxd||'').sort().pop()||TODAY,pt={d,usd:Math.round(T.valC)/100,fx:fx?fx.v:null},L=usHistGet(),o=L.find(h=>h.d==d);
 if(o&&o.usd==pt.usd&&o.fx==pt.fx)return;try{ls('lcush',JSON.stringify(usHistAdd(L,pt,TODAY)))}catch(e){}}
const usHistSync=()=>{if(S.us)S.us.hist=usHistGet()};
const AV_N={today:'今日',all:'總覽',tw:'台股',us:'美股'};
const avOn=()=>typeof S!='undefined'&&S&&usOn(S);
const avViews=()=>avOn()?['today','all','tw','us']:['today','tw'];
const avCur=()=>avViews().includes(AV)?AV:'today';
function avApply(){try{document.body.dataset.av=avCur()}catch(e){}}
window.avSet=v=>{AV=v;ls('lcav',v);avApply();asCalc();scrollTo(0,0)};
// asCalc() 每次畫完資產頁之後呼叫
function avAfter(){avApply();const v=avCur(),n=$('avNav');if(!n)return;
 n.innerHTML=avViews().map(k=>`<button class="${k==v?'on':''}" onclick="avSet('${k}')">${AV_N[k]}</button>`).join('');
 const b=$('usAddB');if(b){const has=typeof S!='undefined'&&S&&S.us&&Array.isArray(S.us.accts);b.style.display=avOn()?'none':'';b.textContent=has?'🇺🇸 顯示美股':'🇺🇸 ＋新增美股帳戶'}
 const td=$('usToday'),uv=$('usView'),av=$('allView');
 if(!avOn()){if(td)td.innerHTML='';if(uv)uv.innerHTML='';if(av)av.innerHTML='';return}
 usFxLoad();usDataLoad();const au=usAu(),T=usCalc(S.us,au),fx=usFxNow(),AL=usAlerts(S.us,T,fx,TODAY),W=usWatch(S.us,T,au,USDT.ev,USDT.mac,TODAY);usHistTick(T,fx);
 if(td)td.innerHTML=(W.length?`<div class=p style="margin-bottom:10px"><b>🇺🇸 美股要注意（${W.length}）</b>${usWatchHtml(W)}<div class=asbtn><button onclick="usAsk('week')">🤖 每週美股與總經</button><button onclick="avSet('us')">看美股 ›</button></div></div>`:'')
  +(AL.length?`<div class=stal style="margin-bottom:10px"><b>🇺🇸 美股資料要補（${AL.length}）</b>${AL.map(a=>`<div>・${esc(a.t)}</div>`).join('')}<div><button onclick="avSet('${AL.every(a=>a.k=='fx')?'all':'us'}')">去處理 ›</button></div></div>`:'');
 if(v=='us'&&uv)uv.innerHTML=usViewHtml(T,fx,AL,W);
 if(v=='all'&&av)av.innerHTML=allViewHtml(T,fx)}

// ---------- 匯率：臺銀牌告檔（GitHub Actions 每個營業日抓）→ 備援（免金鑰來源，標「非臺銀牌告」）→ 手填
const usFxNow=()=>usFx(USFX.file,USFX.alt,S.us&&S.us.fxManual);
async function usFxLoad(force){if(USFX.busy||(!force&&Date.now()-USFX.t<18e5))return;USFX.busy=1;USFX.t=Date.now();let ch=0;
 try{const j=typeof pxGet=='function'?await pxGet('fx/usdtwd.json'):null;if(j&&j.buy>0&&j.sell>0&&j.d&&(!USFX.file||j.d>=USFX.file.d)){if(JSON.stringify(j)!=JSON.stringify(USFX.file))ch=1;USFX.file={d:j.d,buy:+j.buy,sell:+j.sell,upd:j.upd||''}}}catch(e){}
 // 牌告檔沒有、或超過 4 天沒更新時才用備援
 if(!USFX.file||usDays(USFX.file.d,TODAY)>4){try{const r=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-cache'});if(r.ok){const j=await r.json(),v=j&&j.rates&&+j.rates.TWD;
   if(v>0){const d=new Date((+j.time_last_update_unix||Date.now()/1e3)*1e3).toISOString().slice(0,10),a={d,v:Math.round(v*1e4)/1e4,src:'open.er-api.com'};if(JSON.stringify(a)!=JSON.stringify(USFX.alt))ch=1;USFX.alt=a}}}catch(e){}}
 USFX.busy=0;if(ch){ls('lcfx',JSON.stringify({file:USFX.file,alt:USFX.alt}));if(typeof stWs=='function'&&stWs()=='as'&&avOn())asCalc()}
 if(force)toast(ch?'匯率已更新':'匯率沒有新的資料',0)}
const usFxTxt=fx=>!fx?'<span class=wn>沒有匯率</span>':`${fx.v.toFixed(fx.src=='bot'?3:2)}（${esc(usD(fx.d))} ${fx.src=='bot'?'臺銀即期中價':fx.src=='alt'?'<span class=wn>備援來源，非臺銀牌告</span>':'手填'}）`;
window.usFxSet=()=>{const v=usNum($('usFxV').value),d=$('usFxD').value||TODAY;if(v==null||v<=0){S.us.fxManual=null;save();asCalc();toast('已清除手填匯率',0);return}if(v<10||v>100){toast('匯率看起來不對（1 美元換多少新台幣，例如 32.1）',0);return}S.us.fxManual={d,v};save();asCalc();toast('已存手填匯率',0)};

// ---------- 顯示用
const usD=d=>d?String(d).slice(5).replace('-','/'):'';
const usU=(c,dp)=>c==null?'—':(c<0?'−':'')+'$'+(Math.abs(c)/100).toLocaleString('en-US',{minimumFractionDigits:dp||0,maximumFractionDigits:dp||0});
// 依幣別切換顯示（選新台幣但沒有匯率時仍顯示美元）
const usMn=(c,fx,dp)=>c==null?'—':USC=='TWD'&&fx?(c<0?'−':'')+'NT$'+R(Math.abs(c)/100*fx.v):usU(c,dp);
const usSg=(c,fx)=>c==null?'—':(c>=0?'+':'')+usMn(c,fx);
const usPc=v=>v==null||isNaN(v)?'':(v>=0?'+':'')+v.toFixed(1)+'%';
const usCl=v=>v==null?'':v<0?'bad':'ok';
const usQt=q=>(+q).toLocaleString('en-US',{maximumFractionDigits:6});
const usPxTxt=r=>r.px==null?'<span class=wn>沒有現價</span>':`現價 ${r.px.toLocaleString('en-US',{maximumFractionDigits:4})}<span class=h>（${r.src=='m'?'手填 ':''}${esc(usD(r.pxd))}）</span>`;
window.usSetC=c=>{USC=c;ls('lcuc',c);asCalc()};window.usSetG=g=>{USG=g;ls('lcug',g);asCalc()};window.usSetSo=s=>{USS=s;ls('lcuso',s);asCalc()};

// ---------- 美股那一格
const usWatchHtml=W=>W.map(w=>`<div class=asl>${w.k=='earn'?'📅':w.k=='earnDone'?'📝':w.k=='macro'?'🏛️':w.k=='move'?(w.chg>=0?'📈':'📉'):w.k=='cap'?'⚖️':'⚠️'} ${esc(w.t)}${w.k=='earnDone'?` <button class=lk onclick="usAsk('earn','${esc(w.n)}')">🤖 財報後檢查</button>`:''}</div>`).join('');
const usPxLine=T=>{const au=usAu(),m=T.rows.filter(r=>r.src=='m').length,a=T.rows.filter(r=>r.src=='a').length;return`現價：${a?`自動 ${esc(usD(au.d))} 收盤 ${a} 檔`:''}${a&&m?'・':''}${m?`手填 ${m} 檔`:''}${!a&&!m?'還沒有':''}`};
function usViewHtml(T,fx,AL,W){const al=usAlloc(T),noA=!T.accts.length,so=(a,b)=>USS=='pl'?(b.plp??-1e9)-(a.plp??-1e9):USS=='w'?(b.w??-1)-(a.w??-1):(b.mvC??-1)-(a.mvC??-1);
 const seg=(cur,f,L)=>`<div class="seg sm">${L.map(([k,l])=>`<button class="${cur==k?'on':''}" onclick="${f}('${k}')">${l}</button>`).join('')}</div>`;
 if(noA)return`<div class=p><b>🇺🇸 美股</b><div class=asl>還沒有帳戶。按下面的「＋更新部位」新增第一個帳戶（例如海外券商、員工認股、複委託各一個）。</div>${usFoot()}</div>`;
 const twd=fx?`<small>約 ${W2(T.valC/100*fx.v)} 萬新台幣</small>`:'<small class=wn>沒有匯率</small>';
 let h=`<div class=p><div class=ash><b>🇺🇸 美股</b>${seg(USC,'usSetC',[['USD','USD'],['TWD','TWD']])}</div>
  <div class=h>${usPxLine(T)} <button class=lk onclick="usDataLoad(1)">🔄</button>・匯率 ${usFxTxt(fx)}</div>
  <div class=ast><div class=c><small>美股總值</small><b>${usMn(T.valC,fx)}</b>${USC=='TWD'&&fx?`<small>${usU(T.valC)}</small>`:twd}</div>
   <div class=c><small>帳面損益</small><b class="${usCl(T.plBase?T.plC:null)}">${T.plBase?usSg(T.plC,fx):'—'}</b><small>${T.plBase?usPc(T.plp):'沒有填成本'}</small></div>
   <div class=c><small>總成本</small><b>${T.costC?usMn(T.costC,fx):'—'}</b><small>${T.noCost?`<span class=wn>${T.noCost} 筆沒填成本，只算市值</span>`:'券商顯示的成本'}</small></div>
   <div class=c><small>美元現金</small><b>${usMn(T.cashC,fx)}</b><small>持股 ${usMn(T.mvC,fx)}</small></div></div>
  ${W&&W.length?`<div class=sub>要注意</div>${usWatchHtml(W)}`:''}
  ${AL.length?`<div class=stal style="margin-top:8px">${AL.map(a=>`<div>⚠️ ${esc(a.t)}</div>`).join('')}</div>`:''}
  ${USUNDO?`<div class=stal style="margin-top:8px">剛才貼上更新了 ${esc(USUNDO.names)}。<button onclick="usUndo()">↩ 復原這次貼上</button></div>`:''}</div>`+usHistHtml(fx);
 h+=`<div class=p><b>🏦 帳戶</b>${T.accts.map(a=>{const d=a.upd?usDays(a.upd,TODAY):null;return`<div class=asr onclick="usAcct('${esc(a.id)}')"><div class=a1><span><b>${esc(a.name||a.id)}</b> <small class=h>${a.mode=='ledger'?'帳本':'快照'}・${a.rows.length} 檔</small></span><b>${usMn(a.valC,fx)}</b></div>
   <div class=a2><span>帳面損益 ${a.plBase?`<b class="${usCl(a.plC)}">${usSg(a.plC,fx)}（${usPc(a.plp)}）</b>`:'<span class=h>沒有填成本</span>'}</span><span class="${d!=null&&d>90?'wn':''}">${a.upd?'上次更新 '+esc(usD(a.upd))+(d>90?'・建議核對':''):'還沒更新過'}</span></div></div>`}).join('')}
  <div class=asbtn><button onclick="usPaste()">📥 貼上 AI 整理的截圖</button><button onclick="usAcct()">＋新增帳戶</button></div><div class=h>點一個帳戶改持股、成本與現金；或把券商庫存截圖交給 AI 整理後貼回來，一次更新整個帳戶。</div></div>`;
 const row=(r,sub)=>`<div class=asr onclick="usStock('${esc(r.n)}')"><div class=a1><span><b>${esc(r.n)}</b> ${esc(sub?'':(S.us.attr||{})[r.n]&&S.us.attr[r.n].name||'')}</span><b>${usMn(r.mvC,fx)}</b></div>
   <div class=a2><span>${usQt(r.q)} 股${(sub?r.cC!=null:r.avg!=null)?'・均價 '+(sub?r.cC/100/r.q:r.avg).toLocaleString('en-US',{maximumFractionDigits:2}):''}・${usPxTxt(sub?Object.assign({},r,usRowPx(r.n)):r)}</span>
   <span>${r.plC!=null?`<b class="${usCl(r.plC)}">${usSg(r.plC,fx)}（${usPc(r.plp)}）</b>`:'<span class=h>沒填成本</span>'}${!sub&&r.w!=null?'　占 '+r.w.toFixed(0)+'%':''}</span></div>
   ${!sub&&r.parts.length>1?`<div class=a2><span class=h>${r.parts.map(p=>esc(p.name||p.id)+' '+usQt(p.q)).join('、')}${r.allCost?'':'（有帳戶沒填成本，均價與損益只算有填的）'}</span></div>`:''}</div>`;
 h+=`<div class=p><div class=ash><b>📦 持股</b>${seg(USG,'usSetG',[['m','合併'],['a','依帳戶']])}</div>
  <div class=asgs style="margin-top:4px"><label>排序 <select onchange="usSetSo(this.value)">${[['mv','市值'],['pl','損益 %'],['w','占比']].map(([k,l])=>`<option value="${k}" ${USS==k?'selected':''}>${l}</option>`).join('')}</select></label></div>
  ${T.rows.length?(USG=='m'?T.rows.slice().sort(so).map(r=>row(r)).join(''):T.accts.map(a=>`<div class=asgh><span>${esc(a.name||a.id)}</span><span>${usMn(a.mvC,fx)}${a.cashC?'　現金 '+usMn(a.cashC,fx):''}</span></div>`+(a.rows.length?a.rows.slice().sort(so).map(r=>row(r,1)).join(''):'<div class=h>沒有持股</div>')).join('')):'<div class=h style="margin-top:6px">還沒有持股。</div>'}
  <div class=h style="margin-top:4px">點一檔改現價、名稱與主題。S&P 500、Nasdaq-100 與常見 ETF 每個美股交易日收盤後自動更新；不在範圍內的要手填。</div></div>`;
 if(T.mvC>0)h+=`<div class=p><b>🧩 配置</b>
  <div class=asl>前三大：${al.top.map(x=>`${esc(x.n)} ${x.p.toFixed(0)}%`).join('、')}（合計 ${al.top3.toFixed(0)}%）</div>
  ${al.byAcct.length>1?`<div class=asl>帳戶：${al.byAcct.map(x=>`${esc(x.name)} ${x.p.toFixed(0)}%`).join('、')}</div>`:''}
  ${al.byTag.length?`<div class=asl>主題：${al.byTag.map(x=>`${esc(x.tag)} ${x.p.toFixed(0)}%`).join('、')}</div>`:''}
  <div class=asbar><span style="width:${al.stockP}%;background:#6366f1" title="持股"></span><span style="width:${al.cashP}%;background:#94a3b8" title="美元現金"></span></div>
  <div class=asl><span class=dot style="background:#6366f1"></span>持股 ${al.stockP.toFixed(0)}%　<span class=dot style="background:#94a3b8"></span>美元現金 ${al.cashP.toFixed(0)}%</div>
  <div class=g style="margin-top:6px"><label>單日漲跌提醒（%）<input type=number step=any inputmode=decimal value="${usWOpt(S.us).mv}" onchange="usWSet('mv',this.value)"></label><label>單一持股上限（占美股 %）<input type=number step=any inputmode=decimal value="${usWOpt(S.us).cap}" onchange="usWSet('cap',this.value)"></label></div><div class=h>超過就會出現在「今日」的美股要注意；只是提醒，不會自動做任何事。</div></div>`;
 return h+`<div class=p>${usFoot()}</div>`}
const usRowPx=n=>{const p=usPx(S.us,n,usAu());return{px:p?p.v:null,pxd:p?p.d:'',src:p?p.src:''}};
function usFoot(){const L=(S.us.log||[]).slice(0,30);return`${L.length?`<details><summary>🕘 部位變動紀錄（最近 ${L.length} 筆）</summary><div class=h style="font-size:12px">${L.map(x=>`${esc(usD(x.dt))} ${esc(usAcN(x.acct))}：${esc(x.t)}`).join('<br>')}</div></details>`:''}
 <div class=h style="margin-top:6px">帳面損益＝市值 − 券商成本，賣掉的部分和領到的現金股利不在裡面。新台幣金額用目前匯率換算，看不出匯率造成的損益。現價不是即時的。美股數字不進信貸計算。所有數字僅供參考，不是投資建議，也不能當報稅依據。</div>
 <div class=asl><button class=lk onclick="usHide()">隱藏美股（資料保留）</button></div>`}
const usAcN=id=>{const a=(S.us.accts||[]).find(x=>x.id==id);return a?(a.name||id):id};
window.usHide=()=>{if(!confirm('隱藏美股？資料會留在設定檔裡，之後可以在頁面最下方按「顯示美股」打開。'))return;S.us.on=false;save();avSet('today')};
window.usStart=()=>{if(S.us&&Array.isArray(S.us.accts)){S.us.on=true;save();avSet('us');return}usAcct()};
window.usUpd=()=>{const A=S.us.accts||[];if(!A.length)return usAcct();if(A.length==1)return usAcct(A[0].id);
 asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>＋更新部位：選一個帳戶</b></div>${A.map(a=>`<div class=asr onclick="usAcct('${esc(a.id)}')"><div class=a1><b>${esc(a.name||a.id)}</b><span class=h>${a.upd?'上次更新 '+esc(usD(a.upd)):''}</span></div></div>`).join('')}<div class=asbtn><button onclick="usAcct()">＋新增帳戶</button></div>`)};

// ---------- 帳戶：手動編輯持股、成本、現金、現價
window.usAcct=id=>{const us=S.us&&Array.isArray(S.us.accts)?S.us:usDef(),A=id?(us.accts||[]).find(a=>a.id==id):null;
 USE={id:A?A.id:null,name:A?A.name||'':'',cash:A&&A.cash!=null?String(A.cash):'',note:A?A.note||'':'',cm:'t',mode:A?A.mode||'snap':'snap',
  rows:A?usClean(A.items).map(it=>{const p=usNum((us.px||{})[it.n]);return{n:it.n,q:String(it.q),c:it.c0!=null?String(it.c0):'',px:p!=null?String(p):'',px0:p!=null?String(p):''}}):[]};
 if(!USE.rows.length)USE.rows.push({n:'',q:'',c:'',px:'',px0:''});asOvOpen(usAcctHtml())};
function usAcctHtml(){const e=USE,i=(k,j,ph,t)=>`<input ${t||'type=number step=any inputmode=decimal'} value="${esc(e.rows[j][k])}" placeholder="${ph}" onchange="usEd(${j},'${k}',this.value)">`;
 return`<div class=ovh><button onclick="asClose()">✕</button><b>${e.id?'更新部位':'新增美股帳戶'}</b></div>
 <div class=g><label>帳戶名稱<input value="${esc(e.name)}" placeholder="例如 海外券商、員工認股、複委託" onchange="USE.name=this.value"></label><label>美元現金（USD）<input type=number step=any inputmode=decimal value="${esc(e.cash)}" placeholder="沒有就留空" onchange="USE.cash=this.value"></label></div>
 ${e.mode=='ledger'?'<div class=wn>這個帳戶是帳本模式；目前的版本先照快照顯示與編輯。</div>':''}
 <div class=ash style="margin-top:8px"><b>持股</b><div class="seg sm"><button class="${e.cm=='t'?'on':''}" onclick="usEdCm('t')">成本填總額</button><button class="${e.cm=='a'?'on':''}" onclick="usEdCm('a')">成本填均價</button></div></div>
 <div class=h>照券商 App 顯示的數字填，金額都是美元。成本沒有就留空（只看市值）。現價留空＝不改。</div>
 <div class=user><div class="usr h"><span>代號</span><span>股數</span><span>${e.cm=='t'?'成本總額':'成本均價'}</span><span>現價</span><span></span></div>
 ${e.rows.map((r,j)=>`<div class=usr>${i('n',j,'代號','autocapitalize=characters autocomplete=off')}${i('q',j,'股數')}${i('c',j,e.cm=='t'?'總額':'均價')}${i('px',j,'現價')}<button onclick="usEdDel(${j})" title="刪除這一檔">🗑</button></div>`).join('')}</div>
 <div class=asbtn><button onclick="usEdAdd()">＋加一檔</button></div>
 <label style="margin-top:6px">備註<input value="${esc(e.note)}" placeholder="選填" onchange="USE.note=this.value"></label>
 <div class=asbtn><button class=pri onclick="usEdSave()">💾 儲存（更新日記為今天）</button><button onclick="asClose()">取消</button>${e.id?`<button onclick="usEdRm()" style="margin-left:auto">刪除帳戶</button>`:''}</div>
 <div class=h style="margin-top:4px">儲存時會自動記下股數、成本、現金的變動。同一檔在不同帳戶各填各的，畫面會自動合併。</div>`}
const usRe=()=>{const b=$('asOvB'),h=b.scrollTop;b.innerHTML=usAcctHtml();b.scrollTop=h};
window.usEd=(j,k,v)=>{if(USE&&USE.rows[j])USE.rows[j][k]=k=='n'?usCode(v):String(v).trim()};
window.usEdAdd=()=>{USE.rows.push({n:'',q:'',c:'',px:'',px0:''});usRe();const L=document.querySelectorAll('#asOvB .usr input[placeholder="代號"]');if(L.length)L[L.length-1].focus()};
window.usEdDel=j=>{USE.rows.splice(j,1);if(!USE.rows.length)USE.rows.push({n:'',q:'',c:'',px:'',px0:''});usRe()};
// 總額↔均價：已經填的數字跟著換算
window.usEdCm=m=>{if(USE.cm==m)return;for(const r of USE.rows){const q=usNum(r.q),c=usNum(r.c);if(q>0&&c!=null)r.c=String(m=='a'?Math.round(c/q*1e4)/1e4:Math.round(c*q*100)/100)}USE.cm=m;usRe()};
window.usEdSave=()=>{const e=USE,name=String(e.name||'').trim();if(!name){toast('請填帳戶名稱',0);return}
 const items=[];for(const r of e.rows){const n=usCode(r.n),q=usNum(r.q),c=usNum(r.c);if(!n&&q==null&&c==null)continue;if(!n){toast('有一列沒填代號',0);return}if(!/^[A-Z0-9.\-]{1,10}$/.test(n)){toast(`代號「${n}」看起來不對`,0);return}if(q==null||q<=0){toast(`${n} 的股數要大於 0（不要了就按 🗑）`,0);return}if(c!=null&&c<0){toast(`${n} 的成本不能是負的`,0);return}
  const px=usNum(r.px);if(px!=null&&px<=0){toast(`${n} 的現價要大於 0`,0);return}items.push({n,q,c0:c==null||c==0?null:(e.cm=='a'?c*q:c)})}
 const cash=usNum(e.cash);if(cash!=null&&cash<0){toast('現金不能是負的',0);return}
 if(S.us&&Array.isArray(S.us.accts)&&S.us.accts.some(a=>a.id!=e.id&&(a.name||'')==name)){toast('已經有同名的帳戶',0);return}
 try{if(typeof rpSave=='function')rpSave('更新美股部位前')}catch(x){}
 if(!S.us||!Array.isArray(S.us.accts))S.us=usDef();const us=S.us;us.on=true;let A=e.id?us.accts.find(a=>a.id==e.id):null;const isNew=!A;
 if(!A){A=usAcctDef(usNewId(us),name);us.accts.push(A)}
 const after={name,cash,items:usClean(items)},D=isNew?[`新增帳戶，${after.items.length} 檔`]:usDiff(A,after);
 A.name=name;A.cash=cash;A.items=after.items;A.note=String(e.note||'').trim();A.upd=TODAY;
 us.px=us.px||{};us.pxd=us.pxd||{};us.pxa=us.pxa||{};for(const r of e.rows){const n=usCode(r.n),px=usNum(r.px);if(n&&px>0&&String(r.px)!=String(r.px0)){us.px[n]=px;us.pxd[n]=TODAY;us.pxa[n]='手填'}}
 us.log=D.map(t=>({dt:TODAY,acct:A.id,t})).concat(us.log||[]).slice(0,100);
 usHistSync();USUNDO=null;save();USE=null;AV='us';ls('lcav','us');asClose();toast(D.length?`已更新「${name}」：${D.length} 項變動`:`「${name}」沒有變動，更新日記為今天`,0)};
window.usEdRm=()=>{const A=S.us.accts.find(a=>a.id==USE.id);if(!A||!confirm(`刪除帳戶「${A.name||A.id}」和裡面的 ${(A.items||[]).length} 檔持股？（會先存還原點）`))return;try{if(typeof rpSave=='function')rpSave('刪除美股帳戶前')}catch(x){}
 S.us.accts=S.us.accts.filter(a=>a!==A);S.us.log=[{dt:TODAY,acct:A.id,t:`刪除帳戶「${A.name||A.id}」`}].concat(S.us.log||[]).slice(0,100);save();USE=null;asClose();toast('已刪除帳戶',0)};

// ---------- 一檔：各帳戶明細、手填現價、名稱、主題
window.usStock=n=>{n=usCode(n);const us=S.us,T=usCalc(us,usAu()),r=T.rows.find(x=>x.n==n),fx=usFxNow(),at=(us.attr||{})[n]||{},p=usPx(us,n,usAu()),ee=((USDT.ev&&USDT.ev.earn)||{})[n];if(!r)return;
 const tags=[...new Set([...Object.keys(S.themes||{}),...Object.values(us.attr||{}).map(x=>x&&x.tag).filter(Boolean)])].sort();
 asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>${esc(n)} ${esc(at.name||'')}</b></div>
 <div class=ast><div class=c><small>市值</small><b>${usMn(r.mvC,fx)}</b><small>${usQt(r.q)} 股</small></div><div class=c><small>帳面損益</small><b class="${usCl(r.plC)}">${r.plC!=null?usSg(r.plC,fx):'—'}</b><small>${r.plC!=null?usPc(r.plp):'沒填成本'}</small></div>
  <div class=c><small>均價</small><b>${r.avg!=null?r.avg.toLocaleString('en-US',{maximumFractionDigits:2}):'—'}</b><small>${r.allCost?'券商成本':'只算有填成本的'}</small></div><div class=c><small>占美股持股</small><b>${r.w!=null?r.w.toFixed(1)+'%':'—'}</b><small>${usPxTxt(r)}</small></div></div>
 <div class=sub>各帳戶</div>${r.parts.map(x=>`<div class=asr onclick="usAcct('${esc(x.id)}')"><div class=a1><b>${esc(x.name||x.id)}</b><b>${usMn(x.mvC,fx)}</b></div><div class=a2><span>${usQt(x.q)} 股${x.cC!=null?'・成本 '+usU(x.cC,2):'・沒填成本'}</span><span>${x.plC!=null?`<b class="${usCl(x.plC)}">${usSg(x.plC,fx)}（${usPc(x.plp)}）</b>`:''}</span></div></div>`).join('')}
 <div class=asbtn><button onclick="usAsk('earn','${esc(n)}')">🤖 財報後檢查</button>${ee?`<span class=h style="align-self:center">財報日 ${esc(ee.d)}</span>`:''}</div>
 <div class=asth><b>現價與標籤</b>${p&&p.src=='a'?`<div class=h>這一檔有自動收盤價（${esc(usD(p.d))}）；手填的日期比它新才會用手填的。</div>`:''}<div class=g><label>現價（USD）<input id=usPxV type=number step=any inputmode=decimal value="${p&&p.src=='m'?p.v:''}" placeholder="${p?p.v:'手填'}"></label><label>價格日期<input id=usPxD type=date value="${p&&p.src=='m'&&p.d?esc(p.d):TODAY}"></label></div>
  <div class=g><label>名稱（選填）<input id=usNmV value="${esc(at.name||'')}" placeholder="公司或 ETF 名稱"></label><label>主題（選填，和台股用同一組名稱）<input id=usTgV list=usTgL value="${esc(at.tag||'')}" placeholder="例如 AI 伺服器"><datalist id=usTgL>${tags.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label></div>
  <div class=asbtn><button class=pri onclick="usStockSave('${esc(n)}')">💾 儲存</button></div></div>`)};
window.usStockSave=n=>{const us=S.us,v=usNum($('usPxV').value),d=$('usPxD').value||TODAY,nm=$('usNmV').value.trim(),tg=$('usTgV').value.trim();if(v!=null&&v<=0){toast('現價要大於 0',0);return}if(d>TODAY){toast('價格日期不能是未來',0);return}
 us.px=us.px||{};us.pxd=us.pxd||{};us.pxa=us.pxa||{};us.attr=us.attr||{};if(v!=null){us.px[n]=v;us.pxd[n]=d;us.pxa[n]='手填'}
 if(nm||tg)us.attr[n]={name:nm,tag:tg};else delete us.attr[n];usHistSync();save();asClose();toast('已儲存 '+n,0)};

// ---------- 總覽那一格（唯讀）
function allViewHtml(T,fx){let grp={};try{grp=stExposure(S).grp||{}}catch(e){}const z=asSum(S),CS=asCash(),cash=CS.v!=null?Math.max(0,CS.v*1e4):null;let rem=null;try{const r=settle(S,curEff());if(r&&r.rem>0)rem=r.rem}catch(e){}
 const V=usAllView({p:z.p.mv,a:z.a.mv,cash},T,fx,rem),CO={p:'#3b82f6',a:'#f59e0b',c:'#94a3b8',us:'#6366f1',uc:'#c4b5fd',TWD:'#0ea5e9',USD:'#6366f1'},pc=p=>p>=10||p==0?p.toFixed(0):p.toFixed(1);
 const bar=L=>`<div class=asbar>${L.map(s=>s.v>0?`<span style="width:${s.p}%;background:${CO[s.k]}" title="${s.l||s.k}"${s.go?` onclick="avSet('${s.go}')"`:''}></span>`:'').join('')}</div>`;
 return`<div class=p><b>🌐 全資產（新台幣）</b><div class=allb>${W2(V.tot)} 萬</div>
  <div class=h>不含信貸計算；信貸數字請看 💰 信貸。${V.noFx?'<span class=wn>沒有匯率，美股還沒算進來。</span>':''}${z.miss.length?`<span class=wn>台股有 ${z.miss.length} 檔沒有現價。</span>`:''}${T.miss.length?`<span class=wn>美股有 ${T.miss.length} 檔沒有現價，沒算進來。</span>`:''}${V.cashNull?'台股帳戶現金還沒填。':''}</div>
  <div class=sub>配置</div>${bar(V.segs)}
  ${V.segs.filter(s=>s.v>0).map(s=>`<div class="asl alll" onclick="avSet('${s.go}')"><span><span class=dot style="background:${CO[s.k]}"></span>${s.l}</span><span>${W2(s.v)} 萬　<b>${pc(s.p)}%</b></span></div>`).join('')}
  <div class=sub>幣別曝險</div>${bar(V.ccy)}
  <div class=asl><span class=dot style="background:${CO.TWD}"></span>新台幣 ${pc(V.ccy[0].p)}%　<span class=dot style="background:${CO.USD}"></span>美元 ${pc(V.ccy[1].p)}%</div>
  ${V.loan?`<div class=asl>信貸餘額 ÷ 全資產（參考）：<b>${V.loan.p.toFixed(1)}%</b> <span class=h>剩餘本金 ${W2(V.loan.rem)} 萬。只是參考，信貸的風險判斷只看 💰 信貸。</span></div>`:''}</div>
 <div class=p><div class="asl alll" onclick="avSet('tw')"><b>🇹🇼 台股</b><button class=lk>看台股 ›</button></div>
  <div class=asl>持股市值 <b>${W2(z.mv)} 萬</b>｜預估損益 <b class="${asC(z.ub)}">${asM(z.ub)}</b>${z.cb?`（${asPct(z.ub/z.cb*100)}）`:''}${cash!=null?`｜現金 ${W2(cash)} 萬`:''}</div><div class=h>現價：${typeof pxStatus=='function'?pxStatus():''}</div></div>
 <div class=p><div class="asl alll" onclick="avSet('us')"><b>🇺🇸 美股</b><button class=lk>看美股 ›</button></div>
  <div class=asl>總值 <b>${usU(T.valC)}</b>${fx?`（約 ${W2(T.valC/100*fx.v)} 萬）`:''}｜帳面損益 ${T.plBase?`<b class="${usCl(T.plC)}">${(T.plC>=0?'+':'')+usU(T.plC)}（${usPc(T.plp)}）</b>`:'<span class=h>沒有填成本</span>'}｜現金 ${usU(T.cashC)}</div>
  <div class=h>${usPxLine(T)}</div></div>
 ${usThemeHtml(grp,T,fx,V.tot)}
 <div class=p><b>💱 匯率（1 美元換新台幣）</b><div class=asl>目前用 <b>${usFxTxt(fx)}</b> <button class=lk onclick="usFxLoad(1)">🔄 重抓</button></div>
  <div class=g><label>手填匯率<input id=usFxV type=number step=any inputmode=decimal value="${S.us.fxManual?S.us.fxManual.v:''}" placeholder="例如 32.1"></label><label>日期<input id=usFxD type=date value="${S.us.fxManual&&S.us.fxManual.d?esc(S.us.fxManual.d):TODAY}"></label></div>
  <div class=asbtn><button onclick="usFxSet()">存手填匯率</button></div><div class=h>自動匯率是臺灣銀行美金即期買入與賣出的中價，每個營業日傍晚更新；抓不到時用備援來源並標示。自動和手填取日期比較新的；手填欄清空再存＝不用手填。</div></div>`}
window.usWSet=(k,v)=>{v=usNum(v);if(v==null||v<=0||v>100){toast('請填 0～100 之間的數字',0);asCalc();return}S.us.watch=Object.assign({},S.us.watch,{[k]:v});save();asCalc()};

// ---------- 金額走勢（只有金額，不是報酬率）
function usHistHtml(fx){const L=usHistGet();if(L.length<2)return'';const tw=USC=='TWD'&&fx,V=L.map(h=>tw?h.usd*(h.fx||fx.v):h.usd),mn=Math.min(...V),mx=Math.max(...V),W=340,H=110,P=6,x=i=>P+i*(W-2*P)/(L.length-1),y=v=>mx==mn?H/2:H-P-(v-mn)/(mx-mn)*(H-2*P),f=v=>tw?'NT$'+R(v):usU(v*100);
 return`<div class=p><b>📈 美股金額走勢</b><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;margin-top:6px"><polyline fill="none" stroke="#6366f1" stroke-width="2" stroke-linejoin="round" points="${V.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')}"/><circle cx="${x(L.length-1).toFixed(1)}" cy="${y(V[V.length-1]).toFixed(1)}" r="3" fill="#6366f1"/></svg>
  <div class=asl style="display:flex;justify-content:space-between"><span class=h>${esc(usD(L[0].d))}　${f(V[0])}</span><span>${esc(usD(L[L.length-1].d))}　<b>${f(V[V.length-1])}</b></span></div>
  <div class=h>含新投入的金額（例如認股入帳），不是報酬率。最低 ${f(mn)}、最高 ${f(mx)}，共 ${L.length} 個日期。</div></div>`}

// ---------- 跨市場主題集中度（總覽）
function usThemeHtml(grp,T,fx,tot){const L=usThemes(grp,T,fx,tot);if(!L.length)return'';const un=L.find(x=>x.g=='美股未標籤');
 return`<div class=p><b>🧭 跨市場主題集中度</b><div class=h>台股主動持股的主題＋美股各檔的主題，名稱相同的加在一起，占全資產的比例。被動 ETF 與現金不算。</div>
  ${L.slice(0,8).map(x=>`<div class="asl alll" style="cursor:default"><span>${esc(x.g)}</span><span>${W2(x.v)} 萬　<b>${x.p.toFixed(x.p>=10?0:1)}%</b></span></div><div class=asbar style="margin:2px 0 6px"><span style="width:${Math.min(100,x.tw/tot*100)}%;background:#f59e0b" title="台股"></span><span style="width:${Math.min(100,x.us/tot*100)}%;background:#6366f1" title="美股"></span></div>`).join('')}
  <div class=asl><span class=dot style="background:#f59e0b"></span>台股　<span class=dot style="background:#6366f1"></span>美股${L.length>8?`　<span class=h>另有 ${L.length-8} 個主題</span>`:''}</div>
  ${un?`<div class=wn>美股有 ${W2(un.v)} 萬還沒標主題：到「美股」點那一檔填主題（用和台股一樣的名稱才會加在一起）。</div>`:''}${!fx?'<div class=wn>沒有匯率，美股還沒算進來。</div>':''}</div>`}

// ---------- 貼上 AI 整理的截圖（投資帳本 v1 的 positions）：預覽差異 → 整個帳戶覆寫 → 可以復原
const US_PASTE_TIP=n=>`請把這張券商庫存截圖整理成下面的 JSON，只輸出 JSON：
- 金額都用美元；股數保留小數。
- 看不清楚的欄位不要寫，不要猜。截圖裡沒有的代號不要補。
- cost 是成本總額；畫面只有均價就改填 avg。price 是現價，cash 是美元現金，畫面有才填。
- date 填截圖的日期。
{"format":"投資帳本 v1","positions":[{"market":"US","account":"${n||'帳戶名稱'}","date":"YYYY-MM-DD","cash":0,"items":[{"code":"代號","qty":0,"cost":0,"price":0}]}]}`;
const usCopy=(t,msg)=>{const ok=()=>toast(msg,0),fb=()=>{const e=document.createElement('textarea');e.value=t;document.body.appendChild(e);e.select();try{document.execCommand('copy')}catch(x){}e.remove();ok()};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()};
window.usPaste=(id,txt)=>{USP={id:id||'',txt:txt||'',partial:0,pos:null,err:'',map:[]};asOvOpen(usPasteHtml());if(txt)usPasteRun()};
function usPasteHtml(){const p=USP,A=(S.us&&S.us.accts)||[];
 return`<div class=ovh><button onclick="asClose()">✕</button><b>📥 貼上 AI 整理的截圖</b></div>
 <div class=h>① 把券商 App 的庫存截圖和下面這段說明一起交給 AI（Claude、Gemini、ChatGPT 都可以）② 把 AI 回的 JSON 貼到這裡 ③ 看過差異再套用。</div>
 <div class=asbtn><button onclick="usCopy(US_PASTE_TIP(USP.id?usAcN(USP.id):''),'已複製說明，連同截圖貼給 AI')">📋 複製給 AI 的說明</button></div>
 <textarea id=usPsT rows=6 style="width:100%;margin-top:6px" placeholder='貼上 AI 回覆（含 "positions" 的 JSON）' onchange="USP.txt=this.value">${esc(p.txt)}</textarea>
 <div class=asbtn><button class=pri onclick="USP.txt=$('usPsT').value;usPasteRun()">預覽差異</button><button onclick="asClose()">取消</button></div>
 ${p.err?`<div class=stal style="border-color:#fca5a5;background:#fef2f2">❌ ${esc(p.err)}</div>`:''}
 ${p.pos?`<label class=asl><input type=checkbox ${p.partial?'checked':''} onchange="USP.partial=this.checked?1:0;usPasteRun()"> 截圖只截到一部分：只更新出現的代號，其他不動</label>
  ${p.pos.map((po,i)=>{const m=p.map[i],Ac=m.id=='new'?null:A.find(a=>a.id==m.id),r=usPasteApply(Ac,po,p.partial);return`<div class=asth><b>${esc(po.account||'（沒寫帳戶名稱）')}</b>${po.date?` <span class=h>${esc(po.date)}</span>`:''}
   <label>更新到 <select onchange="USP.map[${i}].id=this.value;usPasteRe()">${A.map(a=>`<option value="${esc(a.id)}" ${m.id==a.id?'selected':''}>${esc(a.name||a.id)}</option>`).join('')}<option value="new" ${m.id=='new'?'selected':''}>＋新增帳戶「${esc(po.account||'新帳戶')}」</option></select></label>
   ${r.diff.length?r.diff.map(t=>`<div class=asl>・${esc(t)}</div>`).join(''):'<div class="asl ok">沒有變動</div>'}${Object.keys(r.px).length?`<div class=h>帶入現價：${Object.keys(r.px).map(n=>esc(n)+' '+r.px[n]).join('、')}</div>`:''}${r.bad.length?`<div class=wn>${r.bad.map(esc).join('；')}</div>`:''}</div>`}).join('')}
  <div class=asbtn><button class=pri onclick="usPasteDo()">✅ 套用（${p.partial?'只更新出現的代號':'整個帳戶覆寫'}）</button></div><div class=h>套用前會存還原點；套用後美股那一格會有「↩ 復原這次貼上」。</div>`:''}`}
const usPasteRe=()=>{const b=$('asOvB'),h=b.scrollTop;b.innerHTML=usPasteHtml();b.scrollTop=h};
window.usPasteRun=()=>{const p=USP,r=aiExtract(p.txt);p.err='';p.pos=null;if(r.err){p.err=r.err;usPasteRe();return}
 const L=(Array.isArray(r.j&&r.j.positions)?r.j.positions:[]).filter(x=>x&&Array.isArray(x.items)&&(!x.market||String(x.market).toUpperCase()=='US'));
 if(!L.length){p.err='這段 JSON 裡沒有美股的 "positions"（要有 items）。請用「📋 複製給 AI 的說明」的格式。';usPasteRe();return}
 const A=(S.us&&S.us.accts)||[];p.map=L.map((po,i)=>{const hit=A.find(a=>(a.name||'')==String(po.account||'').trim());return{id:(p.map[i]&&p.map[i].id)||(hit?hit.id:L.length==1&&p.id?p.id:'new')}});p.pos=L;usPasteRe()};
window.usPasteDo=()=>{const p=USP;if(!p||!p.pos)return;const ids=p.map.map(m=>m.id).filter(x=>x!='new');if(new Set(ids).size!=ids.length){toast('兩筆部位對到同一個帳戶了，請分開',0);return}
 try{if(typeof rpSave=='function')rpSave('貼上美股部位前')}catch(x){}
 if(!S.us||!Array.isArray(S.us.accts))S.us=usDef();const us=S.us;us.on=true;us.px=us.px||{};us.pxd=us.pxd||{};us.pxa=us.pxa||{};
 const snap=JSON.stringify({accts:us.accts,px:us.px,pxd:us.pxd,pxa:us.pxa,log:us.log||[]}),names=[];let nd=0;
 p.pos.forEach((po,i)=>{let A=p.map[i].id=='new'?null:us.accts.find(a=>a.id==p.map[i].id);const r=usPasteApply(A,po,p.partial),isNew=!A;
  if(!A){let nm=String(po.account||'').trim()||'新帳戶';while(us.accts.some(a=>a.name==nm))nm+='（2）';A=usAcctDef(usNewId(us),nm);us.accts.push(A)}
  A.items=r.after.items;A.cash=r.after.cash;A.upd=TODAY;const d=aiDate(po.date)||TODAY;for(const n in r.px){us.px[n]=r.px[n];us.pxd[n]=d>TODAY?TODAY:d;us.pxa[n]='截圖'}
  const D=isNew?[`貼上新增帳戶，${A.items.length} 檔`]:r.diff.map(t=>'貼上：'+t);nd+=D.length;us.log=D.map(t=>({dt:TODAY,acct:A.id,t})).concat(us.log||[]).slice(0,100);names.push('「'+A.name+'」')});
 usHistSync();save();USUNDO={snap,names:names.join('、')};USP=null;AV='us';ls('lcav','us');asClose();toast(nd?`已套用：${nd} 項變動`:'沒有變動，更新日記為今天',0)};
window.usUndo=()=>{if(!USUNDO)return;try{const o=JSON.parse(USUNDO.snap);Object.assign(S.us,o);save();USUNDO=null;asCalc();toast('已復原這次貼上',0)}catch(e){toast('復原失敗，請用還原點',0)}};
// 「🤖 AI 討論 → 貼上回覆」貼到只有美股部位的 JSON 時，轉到這裡（ai-import.js 的 aiRun 開頭呼叫）
function usPasteHook(j,txt){if(!j||!Array.isArray(j.positions)||!j.positions.length)return false;const other=['trades','theses','thesisUpdates','events','outlook','themes','strategies','check','manual','review'].some(k=>Array.isArray(j[k])?j[k].length:j[k]);
 if(other){toast('這段回覆有美股部位（positions）：那一部分請到「美股 → 📥 貼上 AI 整理的截圖」另外貼',0);return false}
 if(typeof isS=='function'&&isS())return false;asClose();setTimeout(()=>usPaste('',txt),0);return true}

// ---------- 🤖 問 AI（美股）：App 整理部位與日曆，AI 上網查資料。只產生要貼給 AI 的文字，不匯回任何資料
function usAskText(){const q=USQ,us=S.us,au=usAu(),T=usCalc(us,au),fx=usFxNow(),W=usWatch(us,T,au,USDT.ev,USDT.mac,TODAY),al=usAlloc(T),R0=T.rows.filter(r=>r.mvC>0).sort((a,b)=>b.mvC-a.mvC);
 const line=r=>`- ${r.n}${r.name?' '+r.name:''}${r.tag?'（'+r.tag+'）':''}：占美股持股 ${r.w.toFixed(0)}%${r.plp!=null?`，帳面 ${usPc(r.plp)}`:''}${q.amt?`，${usQt(r.q)} 股、市值 ${usU(r.mvC)}${r.avg!=null?'、均價 '+r.avg.toFixed(2):''}`:''}`;
 let th='';try{const z=asSum(S),CS=asCash(),V=usAllView({p:z.p.mv,a:z.a.mv,cash:CS.v!=null?Math.max(0,CS.v*1e4):null},T,fx,null),L=usThemes(stExposure(S).grp||{},T,fx,V.tot).filter(x=>x.g!='美股未標籤').slice(0,5);
  if(L.length)th='\n【跨市場主題】（台股主動＋美股，占全資產）\n'+L.map(x=>`- ${x.g} ${x.p.toFixed(0)}%（台股 ${(x.tw/V.tot*100).toFixed(0)}%＋美股 ${(x.us/V.tot*100).toFixed(0)}%）`).join('\n')+(V.usd>0?`\n美元資產占全資產 ${V.ccy[1].p.toFixed(0)}%`:'')}catch(e){}
 const cal=W.filter(w=>w.k=='earn'||w.k=='earnDone'||w.k=='macro').map(w=>'- '+w.t).join('\n'),mv=W.filter(w=>w.k=='move').map(w=>'- '+w.t).join('\n');
 if(q.q=='earn'){const r=T.rows.find(x=>x.n==q.n)||R0[0];if(!r)return'還沒有美股持股。';const e=((USDT.ev&&USDT.ev.earn)||{})[r.n];
  return`【任務】${r.n}${r.name?' '+r.name:''} 財報後檢查${e?`（財報日 ${e.d}）`:'（請用最近一次財報）'}。今天 ${TODAY}。
請上網查這次財報與法說會，每一項附來源與日期；查不到就寫「查不到」，不要猜。

【我的部位】
${line(r)}
我是長期持有、很少交易的投資人。${th}

【請回答】
1. 營收、EPS、毛利率：實際數字、市場預期、去年同期。
2. 下一季與全年財測：公司給的數字和市場預期比；是上修、持平還是下修。
3. 法說重點：需求、訂單能見度、資本支出、庫存，各一句。
4. 財報後分析師的 EPS 預估：上修或下修、大約幾 %（寫明機構與日期）。
5. 財報後股價反應與市場解讀的原因。
6. 長期持有的理由還成立嗎：成立／有疑慮／不成立，並寫出最有力的一個反方意見。
7. 什麼情況代表我錯了：列 2～3 個之後可以觀察的數字或事件。

【回答格式】繁體中文、適合手機閱讀。第一行先寫結論。不要給目標價，也不要叫我買或賣，只說理由有沒有變。`}
 return`【任務】每週美股與總經檢查。今天 ${TODAY}。
我是長期持有、很少交易的投資人，不需要每日操作建議。請上網查證後回答，每一項附來源與日期；查不到就寫「查不到」，不要猜。

【我的美股持股】
${R0.map(line).join('\n')}${al.cashP>=1?`\n美元現金占美股帳戶 ${al.cashP.toFixed(0)}%`:''}${th}
${cal?`\n【接下來的事件】\n${cal}\n`:''}${mv?`\n【最近單日大漲跌】\n${mv}\n`:''}
【請回答】
1. 總經，各一兩句：聯準會與市場對利率的預期、最新 CPI 與就業、美國十年期公債殖利率、美元兌新台幣。和上週比有沒有改變。
2. 我的持股，逐檔一行：這週有沒有「會改變長期持有理由」的事（財報、財測、重大訂單、監管、管理層）。沒有就寫「沒有」，不要列一般新聞。
3. 共同風險：我的持股集中在哪些共同因素，這週有沒有相關的新資料（例如大型雲端業者的資本支出、供應鏈、出口管制）。
4. 需要我決定的事：通常是「沒有」。有的話寫哪一檔、為什麼、最晚什麼時候要決定。
5. 你最不確定的一點。

【回答格式】繁體中文、適合手機閱讀、600 字以內。第一行先寫結論：「本週沒有需要處理的事」或「有 N 件事要看」。`}
window.usAsk=(q,n)=>{if(q)USQ.q=q;if(n)USQ.n=usCode(n);asOvOpen(usAskHtml())};
function usAskHtml(){const q=USQ,R0=usCalc(S.us,usAu()).rows;if(q.q=='earn'&&!R0.some(r=>r.n==q.n)&&R0[0])q.n=R0[0].n;const t=usAskText();
 return`<div class=ovh><button onclick="asClose()">✕</button><b>🤖 問 AI（美股）</b></div>
 <div class="seg"><button class="${q.q=='week'?'on':''}" onclick="usAsk('week')">每週美股與總經</button><button class="${q.q=='earn'?'on':''}" onclick="usAsk('earn')">財報後檢查</button></div>
 ${q.q=='earn'?`<label>哪一檔<select onchange="USQ.n=this.value;usAsk()">${R0.map(r=>`<option value="${esc(r.n)}" ${r.n==q.n?'selected':''}>${esc(r.n)} ${esc(r.name||'')}</option>`).join('')}</select></label>`:''}
 <label class=asl><input type=checkbox ${q.amt?'checked':''} onchange="USQ.amt=this.checked?1:0;usAsk()"> 附上股數、市值與均價（預設只附占比）</label>
 <div class=h>App 整理你的部位、日曆與集中度；請貼給<b>能上網搜尋</b>的 AI（Claude、Gemini、ChatGPT 的聊天版），它才查得到最新的財報和新聞。回覆只是給你看，不用貼回來。</div>
 <div class=asbtn><button class=pri onclick="usCopy(usAskText(),'已複製，貼到 AI 對話')">📋 複製</button>${navigator.share?'<button onclick="usAskShare()">📤 分享到 AI App</button>':''}</div>
 <details class=aapv><summary class=h>預覽（${t.length.toLocaleString()} 字）</summary><pre>${esc(t)}</pre></details>`}
window.usAskShare=async()=>{const t=usAskText();try{await navigator.share({text:t})}catch(e){if(e&&e.name!='AbortError')usCopy(t,'已複製，貼到 AI 對話')}};
avApply();
