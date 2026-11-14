// 資產頁導覽（今日｜總覽｜台股｜美股）、美股那一格、總覽那一格、更新部位的表單
// 規格：〈美股整合規格_v3_2026-11-14〉第 3 節；美股畫面照 v2.0 第 2.1 節。只做快照模式（帳本模式是 C 批）。
// 台股的數字一律呼叫現有函式（asSum、asCash、settle），這裡不重算；美股數字不寫進任何信貸、台股的欄位。
// 依賴 ui.js（$、esc、ls、save、toast、R、W2）、asset-ui.js（asOvOpen、asClose、asCalc、asCash）、us-engine.js、prices.js（pxGet、pxStatus）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

let AV=ls('lcav')||'today',USC=ls('lcuc')=='TWD'?'TWD':'USD',USG=ls('lcug')=='a'?'a':'m',USS=ls('lcuso')||'mv',USE=null,USFX={file:null,alt:null,t:0,busy:0};
try{const c=JSON.parse(ls('lcfx')||'null');if(c){USFX.file=c.file||null;USFX.alt=c.alt||null}}catch(e){}
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
 usFxLoad();const T=usCalc(S.us,null),fx=usFxNow(),AL=usAlerts(S.us,T,fx,TODAY);
 if(td)td.innerHTML=AL.length?`<div class=stal style="margin-bottom:10px"><b>🇺🇸 美股（${AL.length}）</b>${AL.map(a=>`<div>・${esc(a.t)}</div>`).join('')}<div><button onclick="avSet('${AL.every(a=>a.k=='fx')?'all':'us'}')">去處理 ›</button></div></div>`:'';
 if(v=='us'&&uv)uv.innerHTML=usViewHtml(T,fx,AL);
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
function usViewHtml(T,fx,AL){const al=usAlloc(T),noA=!T.accts.length,so=(a,b)=>USS=='pl'?(b.plp??-1e9)-(a.plp??-1e9):USS=='w'?(b.w??-1)-(a.w??-1):(b.mvC??-1)-(a.mvC??-1);
 const seg=(cur,f,L)=>`<div class="seg sm">${L.map(([k,l])=>`<button class="${cur==k?'on':''}" onclick="${f}('${k}')">${l}</button>`).join('')}</div>`;
 if(noA)return`<div class=p><b>🇺🇸 美股</b><div class=asl>還沒有帳戶。按下面的「＋更新部位」新增第一個帳戶（例如海外券商、員工認股、複委託各一個）。</div>${usFoot()}</div>`;
 const twd=fx?`<small>約 ${W2(T.valC/100*fx.v)} 萬新台幣</small>`:'<small class=wn>沒有匯率</small>';
 let h=`<div class=p><div class=ash><b>🇺🇸 美股</b>${seg(USC,'usSetC',[['USD','USD'],['TWD','TWD']])}</div>
  <div class=h>現價：手填${T.rows.length?`（最新 ${esc(usD(T.rows.map(r=>r.pxd||'').sort().pop()))}）`:''}・匯率 ${usFxTxt(fx)}</div>
  <div class=ast><div class=c><small>美股總值</small><b>${usMn(T.valC,fx)}</b>${USC=='TWD'&&fx?`<small>${usU(T.valC)}</small>`:twd}</div>
   <div class=c><small>帳面損益</small><b class="${usCl(T.plBase?T.plC:null)}">${T.plBase?usSg(T.plC,fx):'—'}</b><small>${T.plBase?usPc(T.plp):'沒有填成本'}</small></div>
   <div class=c><small>總成本</small><b>${T.costC?usMn(T.costC,fx):'—'}</b><small>${T.noCost?`<span class=wn>${T.noCost} 筆沒填成本，只算市值</span>`:'券商顯示的成本'}</small></div>
   <div class=c><small>美元現金</small><b>${usMn(T.cashC,fx)}</b><small>持股 ${usMn(T.mvC,fx)}</small></div></div>
  ${AL.length?`<div class=stal style="margin-top:8px">${AL.map(a=>`<div>⚠️ ${esc(a.t)}</div>`).join('')}</div>`:''}</div>`;
 h+=`<div class=p><b>🏦 帳戶</b>${T.accts.map(a=>{const d=a.upd?usDays(a.upd,TODAY):null;return`<div class=asr onclick="usAcct('${esc(a.id)}')"><div class=a1><span><b>${esc(a.name||a.id)}</b> <small class=h>${a.mode=='ledger'?'帳本':'快照'}・${a.rows.length} 檔</small></span><b>${usMn(a.valC,fx)}</b></div>
   <div class=a2><span>帳面損益 ${a.plBase?`<b class="${usCl(a.plC)}">${usSg(a.plC,fx)}（${usPc(a.plp)}）</b>`:'<span class=h>沒有填成本</span>'}</span><span class="${d!=null&&d>90?'wn':''}">${a.upd?'上次更新 '+esc(usD(a.upd))+(d>90?'・建議核對':''):'還沒更新過'}</span></div></div>`}).join('')}
  <div class=asbtn><button onclick="usAcct()">＋新增帳戶</button></div><div class=h>點一個帳戶改持股、成本與現金。</div></div>`;
 const row=(r,sub)=>`<div class=asr onclick="usStock('${esc(r.n)}')"><div class=a1><span><b>${esc(r.n)}</b> ${esc(sub?'':(S.us.attr||{})[r.n]&&S.us.attr[r.n].name||'')}</span><b>${usMn(r.mvC,fx)}</b></div>
   <div class=a2><span>${usQt(r.q)} 股${(sub?r.cC!=null:r.avg!=null)?'・均價 '+(sub?r.cC/100/r.q:r.avg).toLocaleString('en-US',{maximumFractionDigits:2}):''}・${usPxTxt(sub?Object.assign({},r,usRowPx(r.n)):r)}</span>
   <span>${r.plC!=null?`<b class="${usCl(r.plC)}">${usSg(r.plC,fx)}（${usPc(r.plp)}）</b>`:'<span class=h>沒填成本</span>'}${!sub&&r.w!=null?'　占 '+r.w.toFixed(0)+'%':''}</span></div>
   ${!sub&&r.parts.length>1?`<div class=a2><span class=h>${r.parts.map(p=>esc(p.name||p.id)+' '+usQt(p.q)).join('、')}${r.allCost?'':'（有帳戶沒填成本，均價與損益只算有填的）'}</span></div>`:''}</div>`;
 h+=`<div class=p><div class=ash><b>📦 持股</b>${seg(USG,'usSetG',[['m','合併'],['a','依帳戶']])}</div>
  <div class=asgs style="margin-top:4px"><label>排序 <select onchange="usSetSo(this.value)">${[['mv','市值'],['pl','損益 %'],['w','占比']].map(([k,l])=>`<option value="${k}" ${USS==k?'selected':''}>${l}</option>`).join('')}</select></label></div>
  ${T.rows.length?(USG=='m'?T.rows.slice().sort(so).map(r=>row(r)).join(''):T.accts.map(a=>`<div class=asgh><span>${esc(a.name||a.id)}</span><span>${usMn(a.mvC,fx)}${a.cashC?'　現金 '+usMn(a.cashC,fx):''}</span></div>`+(a.rows.length?a.rows.slice().sort(so).map(r=>row(r,1)).join(''):'<div class=h>沒有持股</div>')).join('')):'<div class=h style="margin-top:6px">還沒有持股。</div>'}
  <div class=h style="margin-top:4px">點一檔改現價、名稱與主題。現價目前都是手填（自動價格之後才做）。</div></div>`;
 if(T.mvC>0)h+=`<div class=p><b>🧩 配置</b>
  <div class=asl>前三大：${al.top.map(x=>`${esc(x.n)} ${x.p.toFixed(0)}%`).join('、')}（合計 ${al.top3.toFixed(0)}%）</div>
  ${al.byAcct.length>1?`<div class=asl>帳戶：${al.byAcct.map(x=>`${esc(x.name)} ${x.p.toFixed(0)}%`).join('、')}</div>`:''}
  ${al.byTag.length?`<div class=asl>主題：${al.byTag.map(x=>`${esc(x.tag)} ${x.p.toFixed(0)}%`).join('、')}</div>`:''}
  <div class=asbar><span style="width:${al.stockP}%;background:#6366f1" title="持股"></span><span style="width:${al.cashP}%;background:#94a3b8" title="美元現金"></span></div>
  <div class=asl><span class=dot style="background:#6366f1"></span>持股 ${al.stockP.toFixed(0)}%　<span class=dot style="background:#94a3b8"></span>美元現金 ${al.cashP.toFixed(0)}%</div></div>`;
 return h+`<div class=p>${usFoot()}</div>`}
const usRowPx=n=>{const p=usPx(S.us,n,null);return{px:p?p.v:null,pxd:p?p.d:'',src:p?p.src:''}};
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
 save();USE=null;AV='us';ls('lcav','us');asClose();toast(D.length?`已更新「${name}」：${D.length} 項變動`:`「${name}」沒有變動，更新日記為今天`,0)};
window.usEdRm=()=>{const A=S.us.accts.find(a=>a.id==USE.id);if(!A||!confirm(`刪除帳戶「${A.name||A.id}」和裡面的 ${(A.items||[]).length} 檔持股？（會先存還原點）`))return;try{if(typeof rpSave=='function')rpSave('刪除美股帳戶前')}catch(x){}
 S.us.accts=S.us.accts.filter(a=>a!==A);S.us.log=[{dt:TODAY,acct:A.id,t:`刪除帳戶「${A.name||A.id}」`}].concat(S.us.log||[]).slice(0,100);save();USE=null;asClose();toast('已刪除帳戶',0)};

// ---------- 一檔：各帳戶明細、手填現價、名稱、主題
window.usStock=n=>{n=usCode(n);const us=S.us,T=usCalc(us,null),r=T.rows.find(x=>x.n==n),fx=usFxNow(),at=(us.attr||{})[n]||{},p=usPx(us,n,null);if(!r)return;
 const tags=[...new Set([...Object.keys(S.themes||{}),...Object.values(us.attr||{}).map(x=>x&&x.tag).filter(Boolean)])].sort();
 asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>${esc(n)} ${esc(at.name||'')}</b></div>
 <div class=ast><div class=c><small>市值</small><b>${usMn(r.mvC,fx)}</b><small>${usQt(r.q)} 股</small></div><div class=c><small>帳面損益</small><b class="${usCl(r.plC)}">${r.plC!=null?usSg(r.plC,fx):'—'}</b><small>${r.plC!=null?usPc(r.plp):'沒填成本'}</small></div>
  <div class=c><small>均價</small><b>${r.avg!=null?r.avg.toLocaleString('en-US',{maximumFractionDigits:2}):'—'}</b><small>${r.allCost?'券商成本':'只算有填成本的'}</small></div><div class=c><small>占美股持股</small><b>${r.w!=null?r.w.toFixed(1)+'%':'—'}</b><small>${usPxTxt(r)}</small></div></div>
 <div class=sub>各帳戶</div>${r.parts.map(x=>`<div class=asr onclick="usAcct('${esc(x.id)}')"><div class=a1><b>${esc(x.name||x.id)}</b><b>${usMn(x.mvC,fx)}</b></div><div class=a2><span>${usQt(x.q)} 股${x.cC!=null?'・成本 '+usU(x.cC,2):'・沒填成本'}</span><span>${x.plC!=null?`<b class="${usCl(x.plC)}">${usSg(x.plC,fx)}（${usPc(x.plp)}）</b>`:''}</span></div></div>`).join('')}
 <div class=asth><b>現價與標籤</b><div class=g><label>現價（USD）<input id=usPxV type=number step=any inputmode=decimal value="${p&&p.src=='m'?p.v:''}" placeholder="${p?p.v:'手填'}"></label><label>價格日期<input id=usPxD type=date value="${p&&p.src=='m'&&p.d?esc(p.d):TODAY}"></label></div>
  <div class=g><label>名稱（選填）<input id=usNmV value="${esc(at.name||'')}" placeholder="公司或 ETF 名稱"></label><label>主題（選填，和台股用同一組名稱）<input id=usTgV list=usTgL value="${esc(at.tag||'')}" placeholder="例如 AI 伺服器"><datalist id=usTgL>${tags.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label></div>
  <div class=asbtn><button class=pri onclick="usStockSave('${esc(n)}')">💾 儲存</button></div></div>`)};
window.usStockSave=n=>{const us=S.us,v=usNum($('usPxV').value),d=$('usPxD').value||TODAY,nm=$('usNmV').value.trim(),tg=$('usTgV').value.trim();if(v!=null&&v<=0){toast('現價要大於 0',0);return}if(d>TODAY){toast('價格日期不能是未來',0);return}
 us.px=us.px||{};us.pxd=us.pxd||{};us.pxa=us.pxa||{};us.attr=us.attr||{};if(v!=null){us.px[n]=v;us.pxd[n]=d;us.pxa[n]='手填'}
 if(nm||tg)us.attr[n]={name:nm,tag:tg};else delete us.attr[n];save();asClose();toast('已儲存 '+n,0)};

// ---------- 總覽那一格（唯讀）
function allViewHtml(T,fx){const z=asSum(S),CS=asCash(),cash=CS.v!=null?Math.max(0,CS.v*1e4):null;let rem=null;try{const r=settle(S,curEff());if(r&&r.rem>0)rem=r.rem}catch(e){}
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
  <div class=h>現價：手填${T.rows.length?`（最新 ${esc(usD(T.rows.map(r=>r.pxd||'').sort().pop()))}）`:''}</div></div>
 <div class=p><b>💱 匯率（1 美元換新台幣）</b><div class=asl>目前用 <b>${usFxTxt(fx)}</b> <button class=lk onclick="usFxLoad(1)">🔄 重抓</button></div>
  <div class=g><label>手填匯率<input id=usFxV type=number step=any inputmode=decimal value="${S.us.fxManual?S.us.fxManual.v:''}" placeholder="例如 32.1"></label><label>日期<input id=usFxD type=date value="${S.us.fxManual&&S.us.fxManual.d?esc(S.us.fxManual.d):TODAY}"></label></div>
  <div class=asbtn><button onclick="usFxSet()">存手填匯率</button></div><div class=h>自動匯率是臺灣銀行美金即期買入與賣出的中價，每個營業日傍晚更新；抓不到時用備援來源並標示。自動和手填取日期比較新的；手填欄清空再存＝不用手填。</div></div>`}
avApply();
