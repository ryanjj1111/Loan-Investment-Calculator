// 🗓️ 月結精靈（一條流程、逐步打勾）＋備份改善
// 每一步都呼叫現有的畫面與函式（現金、記交易、結算、AI 討論、匯出），這裡不重算任何信貸或損益數字。
// 進度只記在這台裝置（lcms），不進設定檔。
// 依賴 ui.js、asset-ui.js、engine.js（sharesAt、cashAt、sDate）、prices.js（pxGet）、ai-import.js（rpSave）、us-ui.js（選用）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

let MS=null,MSADJ=null,MSADJT=0;
const msMon=()=>TODAY.slice(0,7);
const msGet=()=>{if(MS)return MS;try{MS=JSON.parse(ls('lcms')||'null')}catch(e){}return MS};
const msPut=()=>{try{ls('lcms',JSON.stringify(MS))}catch(e){}};
const msDays=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
// 這個月的月結做到哪裡（沒開始回傳 null）
const msCur=()=>{const m=msGet();return m&&m.m==msMon()?m:null};
const msPro=()=>typeof isS=='function'&&!isS()&&S&&S.ui;

// ---------- 配息：用除權息事件表找「持有期間有除息、但沒有記配息」的
async function msAdjLoad(){if(MSADJ&&Date.now()-MSADJT<36e5)return;try{const j=await pxGet('ck/adj.json');if(j&&j.ev){MSADJ=j.ev;MSADJT=Date.now();if($('msBody'))msRender()}}catch(e){}}
function msDivTodo(){if(!MSADJ)return null;const out=[],from=new Date(Date.parse(TODAY)-100*864e5).toISOString().slice(0,10),codes=new Set();
 for(const k in sharesAt(S,TODAY))codes.add(k.split('|')[1]);for(const x of S.trades||[])if(x.dt>=from)codes.add(cU(x.n));
 for(const c of codes)for(const e of MSADJ[c]||[]){const d=e[0];if(e[3]!='x'||d<from||d>TODAY)continue;const before=new Date(Date.parse(d)-864e5).toISOString().slice(0,10),Q=sharesAt(S,before);
  for(const ac of ['p','a']){const q=Q[ac+'|'+c]||0;if(q<=0)continue;const near=k=>(S.trades||[]).some(x=>x.k==k&&cU(x.n)==c&&(x.ac=='a'?'a':'p')==ac&&x.dt&&Math.abs(msDays(x.dt,d))<=5);
   const cash=+e[1]<0.9999,stk=+e[2]&&Math.abs(+e[2]-1)>1e-6;
   if(cash&&!near('div')&&!stk)out.push({c,ac,d,q,k:'div'});else if(stk&&!near('sdiv'))out.push({c,ac,d,q,k:'sdiv',also:cash&&!near('div')})}}
 return out.sort((a,b)=>a.d<b.d?-1:1)}

// ---------- 每一步的狀態（auto＝App 自己看得出來；其餘手動打勾）
function msSteps(){const m=msCur()||{done:{},start:TODAY},st=m.start,on=typeof usOn=='function'&&usOn(S),L=[];
 const dv=msDivTodo(),snaps=(S.snaps||[]).map(sDate).filter(Boolean).sort(),lastSnap=snaps[snaps.length-1]||'';
 L.push({k:'recon',t:'台股股數對帳',auto:null});
 L.push({k:'cash',t:'交割帳戶現金',auto:!!(S.cashD&&S.cashD>=st)});
 L.push({k:'div',t:'配息與配股',auto:dv?dv.length==0:null,dv});
 L.push({k:'data',t:'營收、財報與前瞻資料',auto:null});
 if(on)L.push({k:'us',t:'美股核對',auto:(S.us.accts||[]).length>0&&S.us.accts.every(a=>a.upd&&a.upd>=st)});
 L.push({k:'settle',t:'結算',auto:lastSnap>=st,lastSnap});
 L.push({k:'review',t:'月底復盤（問 AI，可略過）',auto:null});
 L.push({k:'backup',t:'匯出備份',auto:!!(ls('lcx')&&new Date(ls('lcx')).toLocaleDateString('sv-SE')>=st&&ls('lch')==sig())});
 for(const s of L)s.ok=s.auto===true||!!m.done[s.k];return L}

window.msOpen=()=>{if(!msCur()){MS={m:msMon(),start:TODAY,done:{},rq:{}};msPut()}msAdjLoad();asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>🗓️ ${+msMon().slice(5)} 月月結</b></div><div id=msBody></div>`);msRender()};
window.msTick=(k,v)=>{const m=msCur();if(!m)return;if(v)m.done[k]=1;else delete m.done[k];msPut();msRender();if(typeof asCalc=='function'&&stWs()=='as')msAfter()};
window.msReset=()=>{if(!confirm('重新開始這個月的月結？（只清掉打勾的進度，不會動任何資料）'))return;MS={m:msMon(),start:TODAY,done:{},rq:{}};msPut();msRender()};
window.msRq=(k,v)=>{const m=msCur();if(!m)return;m.rq=m.rq||{};if(String(v).trim()==='')delete m.rq[k];else m.rq[k]=+v;msPut();msRender()};
// 關掉精靈去做某件事（現有畫面），做完再從「今日」的月結卡回來
window.msGo=f=>{asClose();setTimeout(f,0)};
function msRender(){const b=$('msBody');if(!b)return;const m=msCur(),L=msSteps(),n=L.filter(s=>s.ok).length,H=sharesAt(S,TODAY),nx=L.find(s=>!s.ok);
 const box=(s,i,body)=>`<div class="asth mss${s.ok?' ok1':''}${nx&&nx.k==s.k?' nx':''}"><div class=msh><b>${s.ok?'✅':'⬜'} ${i+1}. ${s.t}</b>${s.auto===true?'<span class=h>已完成</span>':`<label class=ck><input type=checkbox ${m.done[s.k]?'checked':''} onchange="msTick('${s.k}',this.checked)">完成</label>`}</div>${s.ok&&!(nx&&nx.k==s.k)&&s.k!='recon'?'':body}</div>`;
 const html=L.map((s,i)=>{let body='';
  if(s.k=='recon'){const ks=Object.keys(H).filter(k=>H[k]>0).sort(),df=ks.filter(k=>m.rq&&m.rq[k]!=null&&m.rq[k]!=H[k]);
   body=s.ok&&!df.length?'':`<div class=h>打開券商 App 的庫存，和下面的股數比。一樣的不用填；不一樣的把券商的股數填進去。</div>
    ${ks.map(k=>{const [ac,c]=k.split('|'),v=m.rq&&m.rq[k]!=null?m.rq[k]:'',d=v!==''&&v!=H[k];return`<div class="msr${d?' df':''}"><span><b>${esc(c)}</b> ${esc(nameOf(c))} <small class=h>${ac=='a'?'主動':'被動'}</small></span><span>App ${H[k].toLocaleString()}</span><input type=number inputmode=numeric placeholder="券商" value="${v}" onchange="msRq('${k}',this.value)"></div>${d?`<div class=wn style="font-size:12px">差 ${(v-H[k]).toLocaleString()} 股：${v>H[k]?'可能漏記買進或配股':'可能漏記賣出，或期初持股填多了'} <button class=lk onclick="msGo(()=>asStock('${esc(c)}','${ac}'))">看這檔的交易 ›</button></div>`:''}`}).join('')||'<div class=h>目前沒有持股。</div>'}
    ${df.length?`<div class=wn>還有 ${df.length} 檔對不上，補記交易後股數會自動更新。</div>`:`<div class=asbtn><button onclick="msTick('recon',1)">✓ 股數都一樣</button></div>`}`}
  if(s.k=='cash'){const N=cashAt(S);body=`<div class=h>照兩個交割帳戶今天的餘額填（萬）。${N?`App 推算現在約：主動 ${W2(N.a)} 萬、被動 ${W2(N.p)} 萬（上次填 ${esc(String(N.d||'').slice(5))}，之後的買賣與配息已算進去）。和實際差很多時，通常是漏記配息、漏記交易，或手續費折讓還沒退。`:'還沒填過現金。'}</div>
   <div class=g><label>主動（萬）<input type=number step=any inputmode=decimal value="${S.cur&&S.cur.ca!=null?S.cur.ca:''}" onchange="asCashSet('ca',this.value);msRender()"></label><label>被動（萬）<input type=number step=any inputmode=decimal value="${S.cur&&S.cur.cp!=null?S.cur.cp:''}" onchange="asCashSet('cp',this.value);msRender()"></label></div>`}
  if(s.k=='div'){body=s.dv==null?'<div class=h>除權息資料讀取中…（讀不到時請自己對一次券商的入帳通知）</div>':s.dv.length?`<div class=h>最近 100 天，你持有時有除權息、但還沒記的：</div>${s.dv.map(x=>`<div class=msr><span><b>${esc(x.c)}</b> ${esc(nameOf(x.c))} <small class=h>${x.ac=='a'?'主動':'被動'}</small></span><span>${esc(x.d.slice(5))} ${x.k=='sdiv'?'配股':'除息'}・${x.q.toLocaleString()} 股</span><button onclick="msGo(()=>asTradeOpen({k:'${x.k}',c:'${esc(x.c)}',ac:'${x.ac}',dt:'${x.d}'}))">記一筆</button></div>${x.also?'<div class=h style="font-size:12px">這次同時有現金股利，記完配股再記一筆配息。</div>':''}`).join('')}<div class=h>每股配息、配股數請看券商的入帳通知。還沒入帳的可以先不記，打勾略過。</div>`:'<div class=h>最近 100 天持有的股票，除權息都記了。</div>'}
  if(s.k=='data')body=`<div class=h>每月 10 日營收公布後：到「今日」看 ✏️ 待補資料；法人 EPS 預估、法說指引可以請 AI 找。</div><div class=asbtn><button onclick="msGo(()=>{avSet('today')})">看待補資料 ›</button><button onclick="msGo(()=>aiOpen({q:'fill'}))">🤖 請 AI 補資料</button></div>`;
  if(s.k=='us')body=`<div class=h>每個帳戶對一次券商的庫存：貼截圖最快；沒有變動也按一次「＋更新部位 → 儲存」，更新日才會記成今天。</div>${(S.us.accts||[]).map(a=>`<div class=msr><span><b>${esc(a.name||a.id)}</b></span><span class="${a.upd&&a.upd>=m.start?'ok':'wn'}">${a.upd?'上次 '+esc(a.upd.slice(5)):'還沒更新過'}</span><button onclick="msGo(()=>{avSet('us');usAcct('${esc(a.id)}')})">更新</button></div>`).join('')}<div class=asbtn><button onclick="msGo(()=>{avSet('us');usPaste()})">📥 貼上 AI 整理的截圖</button></div>`;
  if(s.k=='settle')body=`<div class=h>前面幾步做完再結算。${s.lastSnap?`上次結算 ${esc(s.lastSnap)}。`:'還沒有結算過。'}結算會用今天的現價與剛才填的現金。</div><div class=asbtn><button class=pri onclick="msSnap()">💾 用今天結算</button><button onclick="msGo(()=>{setWs('loan');tab('S')})">到結算頁看 ›</button></div>`;
  if(s.k=='review')body=`<div class=h>把整個組合、這個月照規則的比例交給 AI 看一次${typeof usOn=='function'&&usOn(S)?'（會附美股摘要）':''}。回覆貼回來可以更新 EPS 預估與主題。</div><div class=asbtn><button onclick="msGo(()=>aiOpen({q:'review'}))">🤖 月底復盤</button></div>`;
  if(s.k=='backup')body=`<div class=h>最後一步：把設定檔存到雲端硬碟。${ls('lcx')?`上次匯出 ${esc(new Date(ls('lcx')).toLocaleDateString('sv-SE'))}。`:'還沒有匯出過。'}</div><div class=asbtn>${expCanShare()?'<button class=pri onclick="expShare().then(msRender)">📤 分享到雲端硬碟</button>':''}<button ${expCanShare()?'':'class=pri'} onclick="exp();msRender()">⬇️ 下載設定檔</button></div>`;
  return box(s,i,body)}).join('');
 const top=b.scrollTop;b.innerHTML=`<div class=h>完成 ${n}／${L.length}。每一步做完會自己打勾，也可以手動勾。中途離開沒關係，從「今日」回來接著做。</div>${html}
  ${n==L.length?`<div class="stal" style="border-color:#86efac;background:#f0fdf4"><b>✅ ${+msMon().slice(5)} 月月結完成。</b> 下個月 11 日之後「今日」會再出現月結。</div>`:''}<div class=asl><button class=lk onclick="msReset()">重新開始這個月</button></div>`;b.scrollTop=top}
// 結算：呼叫現有的 snap()（同一天已有結算會先問要不要覆蓋）
window.msSnap=()=>{const n0=JSON.stringify((S.snaps||[]).map(s=>[sDate(s),s.c,s.p,s.a]));try{snap()}catch(e){}if(JSON.stringify((S.snaps||[]).map(s=>[sDate(s),s.c,s.p,s.a]))!=n0)toast('已結算，接著匯出備份',0);msRender()};

// 「今日」的月結卡：每月 11 日起、還沒做完時出現；做到一半一直在
function msAfter(){const el=$('msToday');if(!el)return;if(!msPro()||!((S.trades||[]).length||(S.init||[]).length||(S.snaps||[]).length||(S.theses||[]).length||(S.us&&(S.us.accts||[]).length))){el.innerHTML='';return}const m=msCur(),day=+TODAY.slice(8);if(!m&&day<11){el.innerHTML='';return}
 const L=m?msSteps():[],n=L.filter(s=>s.ok).length;if(m&&n==L.length){el.innerHTML='';return}const nx=L.find(s=>!s.ok);
 el.innerHTML=`<div class=p style="margin-bottom:10px"><div class="asl alll" onclick="msOpen()"><span><b>🗓️ ${+msMon().slice(5)} 月月結</b> ${m?`<span class=h>完成 ${n}／${L.length}${nx?'，下一步：'+nx.t:''}</span>`:'<span class=h>對帳 → 現金 → 配息 → 資料 → 結算 → 備份</span>'}</span><button class=pri>${m?'繼續':'開始'}</button></div></div>`}

// ---------- 備份改善
// 匯出走系統分享（手機可以直接存到雲端硬碟）；不支援時用下載
const expFile=()=>new File([JSON.stringify(S,null,1)],'loan-calc-'+TODAY+'.json',{type:'application/json'});
function expCanShare(){try{return!!(navigator.canShare&&navigator.canShare({files:[expFile()]}))}catch(e){return false}}
window.expShare=async()=>{try{await navigator.share({files:[expFile()],title:'投資帳本設定檔 '+TODAY});ls('lcx',new Date().toISOString());ls('lch',sig());bkUpd();toast('已分享設定檔',0)}catch(e){if(e&&e.name!='AbortError'){exp();toast('這台裝置不能分享檔案，已改成下載',0)}}};
// 每天第一次開啟自動存還原點（內容和上一份相同時不會多存）；請瀏覽器不要自動清掉這個網站的資料
function bkDaily(){try{if(!S||!S.ui)return;if(ls('lcrpd')!=TODAY&&typeof rpSave=='function'){ls('lcrpd',TODAY);rpSave('每天第一次開啟（自動）')}
 if(navigator.storage&&navigator.storage.persist&&ls('lcper')!='1')navigator.storage.persist().then(ok=>{if(ok)ls('lcper','1')}).catch(()=>{})}catch(e){}}
// 在月結精靈以外按「儲存結算」：存完直接跳匯出
(()=>{if(typeof window.snap!='function')return;const f=window.snap;window.snap=function(){const n0=JSON.stringify(S.snaps||[]),r=f.apply(this,arguments);
  if(JSON.stringify(S.snaps||[])!=n0&&!($('msBody')&&$('asOv').style.display=='flex')&&typeof expMenu=='function')setTimeout(()=>{expMenu();toast('已儲存結算：順手匯出備份',0)},300);return r}})();
// 提示訊息點一下就關掉
(()=>{const t=$('toast');if(t)t.addEventListener('click',e=>{if(e.target.tagName!='BUTTON')t.style.display='none'})})();
setTimeout(bkDaily,1500);
