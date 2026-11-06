// 策略日誌：畫面（只在專業版顯示）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
// 依賴 ui.js 的 $、esc、inp、dIn、nameOf、W、W2、R、P1、upd、save、build、renderTrades、trEd、toast

let stTab=ls('lcst')||'perf',stFilter='all';const stOpen=new Set(),stLibOpen=new Set();
const stWs=()=>isS()?'loan':(['as','st','loan'].includes(ls('lcw'))?ls('lcw'):'as');
function stApplyWs(){const w=stWs();document.body.classList.toggle('ws-st',w=='st');document.body.classList.toggle('ws-as',w=='as');[['wsAS','as'],['wsST','st'],['wsLN','loan']].forEach(([id,k])=>{const e=$(id);if(e)e.className=w==k?'on':''})}
window.setWs=w=>{ls('lcw',w);stApplyWs();if(w=='st'){stBuild();stCalc()}else{try{lastHK=''}catch(e){}renderTrades();calc()}scrollTo(0,0)};
// 交易依據的小標籤（快速記交易時點選的）
const stRsChip=x=>x&&x.rs&&typeof asRsN=='function'?`<span class=rsc>${asRsN(x.rs)}</span>`:'';
window.setStTab=t=>{stTab=t;ls('lcst',t);stBuild();stCalc()};
const stTi=id=>(S.theses||[]).findIndex(t=>t.id==id),stSi=id=>(S.strategies||[]).findIndex(s=>s.id==id);
const stTxt=(p,v,ph,rows)=>`<textarea data-p="${p}" data-t="s" rows="${rows||2}" placeholder="${esc(ph||'')}">${esc(v||'')}</textarea>`;
const stSel=(p,v,opts)=>`<select data-p="${p}" data-t="s">${opts.map(([k,l])=>`<option value="${esc(k)}" ${String(v)==String(k)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
const stPct=v=>v==null||isNaN(v)?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
const stPp=v=>v==null||isNaN(v)?'—':(v>=0?'+':'')+v.toFixed(1)+' 個百分點';
const stCls=v=>v==null?'':v<0?'bad':'ok';

// ---------- 交易紀錄的連動（結算頁）
function stChip(i){const x=S.trades[i];if(!x)return'';const T=x.thesisId?stThesis(S,x.thesisId):null;if(x.ac!='a'&&!T)return stRsChip(x);return stRsChip(x)+`<span class="thc ${T?'on':''}" onclick="edTr(${i})" title="投資論點（點 ✎ 修改）">${T?esc(T.id):'未分類'}</span><span id="ths${i}"></span>`}
function stTradeEd(i){const x=S.trades[i],c=cU(x.n),L=(S.theses||[]).slice().sort((a,b)=>(cU(b.code)==c)-(cU(a.code)==c));
 return`<div class=tre style="margin-top:2px"><label>投資論點${stSel('trades.'+i+'.thesisId',x.thesisId||'',[['','未分類']].concat(L.map(T=>[T.id,T.id+' '+cU(T.code)+' '+nameOf(T.code)+'｜'+stStatusN(T.status)])))}</label>${x.k=='buy'||x.k=='sell'?stBmField(x,'trades.'+i+'.bmPx'):''}</div>`}
// 交易當天的基準 ETF 價格：自動帶得到就只顯示，帶不到（或手動填過）才給輸入欄
function stBmField(x,p){const a=stBmPx(S,x.dt,null);return num(x.bmPx)==null&&a!=null?`<label>當天 ${esc(bmC(S))} 價格<span class=h>自動 ${a}</span></label>`:`<label>當天 ${esc(bmC(S))} 價格${a==null?'（自動帶不到，可手填）':''}${inp(p,x.bmPx,'o',`placeholder="${a!=null?'自動 '+a:'需補'}"`)}</label>`}
window.stAssign=(i,id)=>{S.trades[i].thesisId=id;renderTrades();upd()};

// ---------- 輸入事件：結構性欄位改變時重畫
function stOnIn(p,v){if(/^theses\.\d+\.(status|sid|useInit)$/.test(p)||/^strategies\.\d+\.on$/.test(p)||/^trades\.\d+\.(thesisId|k|dt)$/.test(p)){if(/^theses\.\d+\.status$/.test(p)){const T=S.theses[+p.split('.')[1]];if(v=='exit'&&T&&!T.exit.date)T.exit.date=TODAY}setTimeout(()=>{stBuild();if(/^trades/.test(p))renderTrades()},0)}
 {const m=/^theses\.(\d+)\.code$/.exec(p);if(m){const T=S.theses[+m[1]],e=$('stn_'+T.id);if(e)e.innerText=nameOf(v)}}}
document.addEventListener('change',e=>{const p=e.target.dataset&&e.target.dataset.p;if(p&&/^theses\.\d+\.code$/.test(p)){const T=S.theses[+p.split('.')[1]];if(T)T.code=cU(T.code);stBuild();stCalc();renderTrades();save()}});
document.addEventListener('input',e=>{const d=e.target.dataset;if(d.tag===undefined)return;const c=d.tag,a=e.target.value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean);S.tags=S.tags||{};if(a.length)S.tags[c]=a;else delete S.tags[c];upd()});
document.addEventListener('toggle',e=>{const t=e.target;if(!t.dataset)return;if(t.dataset.th){t.open?stOpen.add(t.dataset.th):stOpen.delete(t.dataset.th)}else if(t.dataset.sl){t.open?stLibOpen.add(t.dataset.sl):stLibOpen.delete(t.dataset.sl)}},true);

// ---------- 動作
window.stAddTh=()=>{const T=stNewThesis(S,{sid:(S.strategies||[]).filter(s=>+s.on)[0]?.id||''});const st=stStrat(S,T.sid);if(st)T.sver=st.ver;S.theses.push(T);stOpen.add(T.id);stFilter='all';stBuild();upd()};
window.stDelTh=id=>{const i=stTi(id);if(i<0)return;const n=(S.trades||[]).filter(x=>x.thesisId==id).length;if(!confirm(`刪除論點 ${id}？${n?`有 ${n} 筆交易會改回「未分類」（交易本身不會刪除）。`:''}`))return;(S.trades||[]).forEach(x=>{if(x.thesisId==id)x.thesisId=''});S.theses.splice(i,1);stBuild();renderTrades();upd()};
window.stAddPlan=id=>{const T=stThesis(S,id);T.plan=T.plan||[];T.plan.push({n:T.plan.length+1,cond:'',pct:'',tid:''});stBuild();upd()};
window.stDelPlan=(id,j)=>{const T=stThesis(S,id);T.plan.splice(j,1);T.plan.forEach((r,k)=>r.n=k+1);stBuild();upd()};
window.stAddRev=(id,kind)=>{const T=stThesis(S,id);T.reviews=T.reviews||[];T.reviews.unshift({date:TODAY,kind:kind||'營收',ok:1,note:''});stOpen.add(id);if(stTab!='th')stTab='th';stBuild();upd();setTimeout(()=>{const el=document.querySelector(`details[data-th="${id}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},50)};
window.stDelRev=(id,j)=>{const T=stThesis(S,id);T.reviews.splice(j,1);stBuild();upd()};
window.stAddTr=id=>{const T=stThesis(S,id);if(!cU(T.code)){toast('請先填論點的股票代號',0);return}const n=NEW.trades();Object.assign(n,{ac:'a',n:cU(T.code),thesisId:id,dt:TODAY});S.trades.push(n);if(T.status=='plan')T.status='hold';stBuild();renderTrades();upd()};
window.stExit=id=>{const T=stThesis(S,id);T.status='exit';T.exit=T.exit||{};if(!T.exit.date)T.exit.date=TODAY;stOpen.add(id);stBuild();upd()};
window.stOpenTh=id=>{stOpen.add(id);stTab='th';stFilter='all';stBuild();stCalc();setTimeout(()=>{const el=document.querySelector(`details[data-th="${id}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},50)};
window.stUpVer=id=>{const T=stThesis(S,id),st=stStrat(S,T.sid);if(!st)return;if(!confirm(`把 ${T.id} 改為跟隨 ${st.id} v${st.ver}？會在檢查紀錄留下一筆。`))return;T.reviews=T.reviews||[];T.reviews.unshift({date:TODAY,kind:'其他',ok:1,note:`改用策略 ${st.id} v${st.ver}（原 v${T.sver}）`});T.sver=st.ver;stBuild();upd()};
window.stAddSt=()=>{const v=$('stTpl')?$('stTpl').value:'';const tpl=v===''?null:ST_TPL[+v];const st=stNewStrategy(S,tpl);S.strategies.push(st);stLibOpen.add(st.id);stBuild();upd()};
window.stDelSt=id=>{const i=stSi(id);if((S.theses||[]).some(t=>t.sid==id)){toast('還有論點屬於這個策略，不能刪除',0);return}if(!confirm('刪除策略 '+id+'？'))return;S.strategies.splice(i,1);stBuild();upd()};
window.stMinor=id=>{const st=stStrat(S,id);const h=st.hist[st.hist.length-1];h.snap=stSnapOf(st);h.minor=(h.minor||0)+1;h.mdate=TODAY;stBuild();upd();toast('已存為 v'+st.ver+' 的小修正',0)};
window.stNewVer=id=>{const st=stStrat(S,id),r=($('str_'+id)||{}).value||'';if(!r.trim()){toast('請先填改版原因',0);return}st.ver+=1;st.hist.push({ver:st.ver,date:TODAY,reason:r.trim(),snap:stSnapOf(st)});stBuild();upd();toast('已建立 '+id+' v'+st.ver,0)};

// ---------- 畫面
function stThCard(T){const i=stTi(T.id),c=cU(T.code),st=stStrat(S,T.sid),sopt=[['','（未指定策略）']].concat((S.strategies||[]).map(s=>[s.id,s.id+' '+s.name])),tr=(S.trades||[]).map((x,j)=>({x,j})).filter(o=>o.x.thesisId==T.id).sort((a,b)=>(a.x.dt||'')<(b.x.dt||'')?-1:1);
 const hasIni=hasInit(S)&&(S.init||[]).some(r=>r.ac=='a'&&cU(r.n)==c&&(+r.q||0)>0),trOpt=[['','（尚未執行）']].concat(tr.filter(o=>o.x.k=='buy').map(o=>[o.x.id,o.x.dt+' '+R(num(o.x.q)||0)+' 股 @'+(o.x.px||'')]));
 return`<details class=stc data-th="${T.id}" data-st="${T.status}" ${stOpen.has(T.id)?'open':''}><summary id="sth_${T.id}"></summary><div class=stm id="stm_${T.id}"></div>
 <div class=g>
  <label>股票代號${inp(`theses.${i}.code`,T.code,'s','autocomplete=off placeholder="例如 2301"')}<span class=h id="stn_${T.id}">${esc(nameOf(c))}</span></label>
  <label>族群標籤（套用到這檔股票，用「、」分隔）<input data-tag="${esc(c)}" value="${esc(((S.tags||{})[c]||[]).join('、'))}" placeholder="例如 AI 硬體" ${c?'':'disabled'}></label>
  <label>所屬策略${stSel(`theses.${i}.sid`,T.sid,sopt)}<span class=h>跟隨 v${T.sver||1}${st&&st.ver>(T.sver||1)?` <button onclick="stUpVer('${T.id}')">改用 v${st.ver}</button>`:''}</span></label>
  <label>狀態<span style="padding:5px 0">${stStatusN(T.status)}${stPlanProg(T)?'｜'+stPlanProg(T):''} <span class=h>（依股數自動）</span></span></label>
  <label>停損價(元)${inp(`theses.${i}.stop`,T.stop,'o')}</label>
  <label>目標價(元，選填)${inp(`theses.${i}.tgtPx`,T.tgtPx,'o')}</label>
  <label>現價(元，與資產頁共用)<input type=number step=any data-px="${esc(c)}" value="${esc((S.px||{})[c]??'')}" ${c?'':'disabled'}></label>
 </div>
 ${stCondBox(T,st)}
 <label>補充一句為什麼買（選填）${stTxt(`theses.${i}.why`,T.why,'勾選的條件之外，還想補充的理由',2)}</label>
 <label>什麼情況代表我錯了${stTxt(`theses.${i}.wrongIf`,T.wrongIf,st?'預設帶入策略的「理由失效」規則':'例如：連續兩個月營收年減、法人下修 EPS')}</label>
 <details class=more><summary class=h>更多欄位（建立日、預計期間、目標估值、分批計畫${hasIni?'、期初持股':''}）</summary>
 <div class=g><label>建立日${dIn(`theses.${i}.created`,T.created,'建立日')}</label><label>預計幾個月會反映${inp(`theses.${i}.expectM`,T.expectM,'o',`placeholder="${st&&st.holdMax?'策略預設 '+st.holdMax:''}"`)}</label></div>
 <label>目標估值或出場條件${stTxt(`theses.${i}.target`,T.target,'例如：本益比回到 5 年中位數')}</label>
 ${hasIni?`<label class=ck><input type=checkbox data-p="theses.${i}.useInit" data-t="b" ${+T.useInit?'checked':''}>納入撥款前的期初持股</label>${+T.useInit?`<div class=g><label>策略起算日${dIn(`theses.${i}.baseD`,T.baseD||T.created,'起算日')}</label><label>起算價（空白＝起算日收盤價）${inp(`theses.${i}.basePx`,T.basePx,'o')}</label></div><div class=h>策略的損益、持有天數、vs ${esc(bmC(S))}、均價都從起算日開始算，預設是建立論點那天；起算日填撥款日（${esc(S.dd||'')}）或更早，就改用撥款日收盤價。實際帳戶損益看資產頁的「📦 我的庫存」。</div>`:''}`:''}
 <div class=sub>分批計畫</div>${(T.plan||[]).map((r,j)=>`<div class=r-pl><span class=h>第 ${r.n} 批</span>${inp(`theses.${i}.plan.${j}.cond`,r.cond,'s','placeholder="價位或條件"')}${inp(`theses.${i}.plan.${j}.pct`,r.pct,'o','placeholder="比例%"')}${stSel(`theses.${i}.plan.${j}.tid`,r.tid||'',trOpt)}<button onclick="stDelPlan('${T.id}',${j})">✕</button></div>`).join('')}<button onclick="stAddPlan('${T.id}')">＋新增一批</button><div class=h>買進時會依序自動對應到還沒執行的批次。</div></details>
 <div class=sub>交易（與結算頁的交易紀錄是同一份）</div>${tr.length?tr.map(({x,j})=>x.k=='buy'||x.k=='sell'?`<div class=r-tr><label>日期${dIn('trades.'+j+'.dt',x.dt,'日期')}</label><label>類型${stSel('trades.'+j+'.k',x.k,[['buy','買進'],['sell','賣出']])}</label><label>股數${inp('trades.'+j+'.q',x.q,'o','placeholder="股數"')}</label><label>成交價${inp('trades.'+j+'.px',x.px,'o','placeholder="成交價"')}</label>${stBmField(x,'trades.'+j+'.bmPx')}</div>`:`<div class="r-tr h">${esc(x.dt||'')}　${esc((TK.find(z=>z[0]==x.k)||['',''])[1])}　${x.k=='div'?R(tradeAmt(S,x).cash)+' 元':R(num(x.q)||0)+' 股'}</div>`).join(''):'<div class=h>還沒有交易。</div>'}
 <button onclick="stAddTr('${T.id}')">＋記一筆這個論點的交易</button> <span class=h>（其他欄位與手續費可在結算頁的交易紀錄修改）</span>
 <div class=sub>檢查紀錄</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px"><button onclick="stAddRev('${T.id}','營收')">＋營收檢查</button><button onclick="stAddRev('${T.id}','財報')">＋財報檢查</button><button onclick="stAddRev('${T.id}','其他')">＋其他</button></div>
 ${(T.reviews||[]).map((r,j)=>`<div class=r-rv>${dIn(`theses.${i}.reviews.${j}.date`,r.date,'日期')}${stSel(`theses.${i}.reviews.${j}.kind`,r.kind,[['營收','營收'],['財報','財報'],['其他','其他']])}${stSel(`theses.${i}.reviews.${j}.ok`,String(r.ok),[['1','論點仍成立'],['0','有疑慮']])}${inp(`theses.${i}.reviews.${j}.note`,r.note,'s','placeholder="說明"')}<button onclick="stDelRev('${T.id}',${j})">✕</button></div>`).join('')}
 <div class=sub>出場</div>${T.status=='exit'?`<div class=g><label>出場日${dIn(`theses.${i}.exit.date`,T.exit.date,'出場日')}</label><label>出場原因${stSel(`theses.${i}.exit.reason`,T.exit.reason||'',[['','（請選擇）']].concat(ST_EXIT))}</label><label>有沒有照規則做${stSel(`theses.${i}.exit.followed`,String(T.exit.followed??''),[['','（請選擇）'],['1','是'],['0','否']])}</label></div><label>說明${stTxt(`theses.${i}.exit.note`,T.exit.note,'例如：提前出場的原因、哪裡沒照規則')}</label>`:`<button onclick="stExit('${T.id}')">標記為已出場</button>`}
 <div style="margin-top:8px;text-align:right"><button onclick="stDelTh('${T.id}')">刪除論點</button></div></details>`}
function stLibCard(st){const i=stSi(st.id),n=(S.theses||[]).filter(t=>t.sid==st.id).length,h=st.hist||[];
 const diff=(a,b)=>ST_FIELDS.filter(k=>String(a?.[k]??'')!=String(b?.[k]??'')),LB={name:'名稱',logic:'邏輯說明',term:'期別',screen:'篩選條件',entry:'進場規則',exit:'出場規則',holdMin:'持有下限',holdMax:'持有上限',capStock:'個股上限',capGroup:'族群上限',capStrat:'策略合計上限',stopPct:'預設停損',stopTech:'技術停損',riskPct:'每筆風險',rr:'檢查賺賠比'};
 return`<details class=stc data-sl="${st.id}" ${stLibOpen.has(st.id)?'open':''}><summary>${esc(st.id)} ${esc(st.name)} <b>v${st.ver}</b>${st.term?'｜'+esc(st.term)+'期':''}｜論點 ${n}${+st.on?'':'｜停用'} <span id="stdy_${st.id}" class=wn></span></summary>
 <div class=g><label>策略名稱${inp(`strategies.${i}.name`,st.name,'s')}</label><label class=ck style="align-self:end"><input type=checkbox data-p="strategies.${i}.on" data-t="b" ${+st.on?'checked':''}>啟用（新增論點時可選）</label>
  <label>期別${stSel(`strategies.${i}.term`,st.term||'',[['','（未設定）']].concat(ST_TERM))}<span class=h>記交易時先選期別，只列出對應的策略</span></label><label>策略合計上限(%)${inp(`strategies.${i}.capStrat`,st.capStrat,'o','placeholder="選填，例如 10"')}<span class=h>這個策略所有持股合計占主動部位的上限</span></label>
  <label>預計持有期間下限(月)${inp(`strategies.${i}.holdMin`,st.holdMin,'o')}</label><label>預計持有期間上限(月)${inp(`strategies.${i}.holdMax`,st.holdMax,'o')}</label>
  <label>單一個股占主動部位上限(%)${inp(`strategies.${i}.capStock`,st.capStock,'o')}</label><label>單一族群占主動部位上限(%)${inp(`strategies.${i}.capGroup`,st.capGroup,'o')}</label>
  <label>預設停損(%)${inp(`strategies.${i}.stopPct`,st.stopPct,'o','placeholder="例如 20"')}<span class=h>買進時自動算停損價＝成交價 ×（1 − 這個 %）</span></label><label>每筆風險(%)${inp(`strategies.${i}.riskPct`,st.riskPct,'o','placeholder="例如 2"')}<span class=h>每筆最多虧主動部位的幾 %，用來建議股數</span></label>
  <label>技術停損${stSel(`strategies.${i}.stopTech`,st.stopTech||'',ST_STOPT)}<span class=h>和固定 % 一起算，取離現價比較近的</span></label><label class=ck style="align-self:end"><input type=checkbox data-p="strategies.${i}.rr" data-t="b" ${+st.rr?'checked':''}>買進前檢查賺賠比 ≥ 2（目標＝近一年最高收盤）</label></div>
 <label>邏輯說明${stTxt(`strategies.${i}.logic`,st.logic,'這個策略賺的是什麼錢？',3)}</label><label>選什麼（篩選條件）${stTxt(`strategies.${i}.screen`,st.screen,'【選什麼：全部符合】\n1. 條件一\n2. 條件二',4)}<span class=h>一行一個條件（1. 2. 3.）；第一行寫【選什麼：全部符合】或【何時買：至少 2 項】設定門檻。買進時就能直接勾選，之後自動檢核卡也會用到。</span></label>
 <label>何時買＋買多少（進場規則）${stTxt(`strategies.${i}.entry`,st.entry,'【何時買：至少 2 項】\n1. 條件一\n2. 條件二\n【買多少】分 3 批、每批 1/3',4)}<span class=h>寫「分 N 批」會自動建立分批計畫。</span></label><label>出場規則${stTxt(`strategies.${i}.exit`,st.exit,'例如：達到估值、理由失效、停損、超過期限')}</label>
 <div class=stv><button onclick="stMinor('${st.id}')">儲存為小修正（不升版）</button><input id="str_${st.id}" placeholder="改版原因（建立新版本時必填）"><button onclick="stNewVer('${st.id}')">建立新版本 v${st.ver+1}</button></div>
 <details style="margin-top:6px"><summary>版本紀錄（${h.length}）</summary>${h.slice().reverse().map((v,k,a)=>{const prev=a[k+1],d=prev?diff(prev.snap,v.snap):[];return`<div class=hb style="margin-top:4px"><b>v${v.ver}</b>　${esc(v.date)}　${esc(v.reason)}${v.minor?`<span class=h>（小修正 ${v.minor} 次，最後 ${esc(v.mdate||'')}）</span>`:''}${prev?`<div class=h>變更：${d.length?d.map(k=>LB[k]).join('、'):'無'}</div>`:''}<details><summary class=h>這一版的內容</summary><div class=h style="white-space:pre-wrap">${ST_FIELDS.map(k=>LB[k]+'：'+esc(String(v.snap[k]??''))).join('\n')}</div></details></div>`}).join('')}</details>
 <div style="margin-top:8px;text-align:right"><button onclick="stDelSt('${st.id}')" ${n?'disabled title="還有論點屬於這個策略"':''}>刪除策略</button></div></details>`}
function stBuild(){if(!$('pgST'))return;
 $('stTabs').innerHTML=[['perf','📈 績效'],['lib','📚 策略庫'],['th','📌 論點']].map(([k,l])=>`<button class="${stTab==k?'on':''}" onclick="setStTab('${k}')">${l}</button>`).join('');
 ['th','lib','perf'].forEach(k=>{$('st_'+k).style.display=stTab==k?'':'none'});
 const L=(S.theses||[]).slice().sort((a,b)=>{const o={build:0,hold:1,plan:2,exit:3};return(o[a.status]-o[b.status])||((b.created||'')>(a.created||'')?1:-1)});
 $('stList').innerHTML=L.length?L.map(stThCard).join(''):`<div class=h style="margin:8px 0">還沒有投資論點。先到「📚 策略庫」建立策略，再按「＋新增論點」記下一檔股票的建倉計畫。</div>`;
 $('stChips').innerHTML=[['all','全部']].concat(ST_STATUS).map(([k,l])=>`<button class="${stFilter==k?'on':''}" onclick="stFilter='${k}';stBuild();stCalc()">${l} <span id="stc_${k}"></span></button>`).join('');
 $('stLib').innerHTML=(typeof olThemesHtml=='function'?olThemesHtml():'')+((S.strategies||[]).map(stLibCard).join('')||`<div class=h style="margin:8px 0">還沒有策略。可以從範例建立，再改成自己的方法。</div>`);
 $('stTplW').innerHTML=`<select id="stTpl"><option value="">空白策略</option>${ST_TPL.map((t,k)=>`<option value="${k}">${esc(t.name)}</option>`).join('')}</select><button onclick="stAddSt()">＋新增策略</button>`}
function stMet(p){if(!p||!p.first)return'<span class=h>尚未買進</span>';const t=xirrT0(p),B=p.base;
 return`${B?`<span class=h>${stBaseTxt(B)}</span><br>`:''}投入 ${W2(p.inv)} 萬｜${B?'起算後損益':'損益'} ${p.pl==null?'<span class=wn>需填現價</span>':`<span class="${stCls(p.pl)}">${p.pl>=0?'+':''}${R(p.pl)}（${stPct(p.ret)}）</span>`}｜${B?'起算後':'持有'} ${Math.round(p.days)} 天｜${t}<br>vs ${esc(bmC(S))}：${p.ex!=null?`<span class="${stCls(p.ex)}">${stPp(p.ex)}</span>`:p.miss.length?`<span class=wn>需補 ${p.miss.length} 筆交易當天的 ${esc(bmC(S))} 價格</span>`:p.bmNowMiss?`<span class=wn>需填 ${esc(bmC(S))} 現價</span>`:'—'}${p.open?`｜現價 ${p.px??'—'}`:''}`}
const stBaseTxt=B=>`策略從 ${B.d.slice(5).replace('-','/')} 起算，起算價 ${B.px}${B.src=='暫用現價'?'（暫用現價，收盤後換成當天收盤價）':B.src=='填'?'（自己填的）':'（當天收盤價）'}；實際帳戶損益看資產頁的「📦 我的庫存」`;
const xirrT0=p=>p.days<182.6?`期間報酬 ${stPct(p.ret)}（未年化）`:`年化報酬 ${p.xr!=null?stPct(p.xr):'—'}`;
function stCalc(){if(!$('pgST'))return;if(stSync(S))save();const A=stAlerts(S),bd=$('stBadge');if(bd)bd.innerHTML=A.length?`<span class=stbd>${A.length}</span>`:'';
 (S.trades||[]).forEach((x,i)=>{const s=$('ths'+i);if(s){const o=!x.thesisId&&x.ac=='a'&&(S.theses||[]).find(T=>T.status!='exit'&&cU(T.code)==cU(x.n)&&cU(x.n));s.innerHTML=o?`<button class=ths onclick="stAssign(${i},'${o.id}')">歸入 ${o.id}？</button>`:''}
  const q=$('tq'+i);if(q){let t='';if(x.ac=='a'&&x.k=='buy'&&x.dt==TODAY&&cU(x.n)){const E=stExposure(S),c=cU(x.n),p=E.tot>0?(E.by[c]||0)/E.tot*100:0,cap=stCapStock(S,c);t=`買進後 ${c} ${nameOf(c)} 占主動部位 ${p.toFixed(1)}%（個股上限 ${cap}%）`+(p>cap?' ⚠️ 超過上限':'');for(const g of(S.tags||{})[c]||[]){const gp=(E.grp[g]||0)/E.tot*100,gc=stCapGroup(S,g);t+=`｜族群「${g}」${gp.toFixed(1)}%（上限 ${gc}%）${gp>gc?' ⚠️':''}`}}q.innerText=t;q.className='h'+(t.includes('⚠️')?' wn':'')}});
 if(stWs()!='st')return;
 $('stAl').innerHTML=A.length?`<div class=stal><b>⚠️ 提醒（${A.length}）</b>${A.map(a=>typeof asAlRow=='function'?asAlRow(a):`<div>· ${esc(a.t)}</div>`).join('')}</div>`:'<div class="h ok">✅ 目前沒有需要處理的提醒。</div>';
 const cnt={all:0};ST_STATUS.forEach(([k])=>cnt[k]=0);for(const T of S.theses||[]){cnt.all++;cnt[T.status]=(cnt[T.status]||0)+1;
  const el=document.querySelector(`details[data-th="${T.id}"]`);if(el)el.style.display=stFilter=='all'||T.status==stFilter?'':'none';
  const p=stPerf(S,T),st=stStrat(S,T.sid),c=cU(T.code),tg=((S.tags||{})[c]||[]).join('、');
  const h=$('sth_'+T.id);if(h)h.innerHTML=`<b>${esc(T.id)}</b> ${esc(c)} ${esc(nameOf(c))}｜${st?esc(st.id)+' v'+(T.sver||1):'未指定策略'}｜<span class="stS ${T.status}">${stStatusN(T.status)}</span>${tg?'｜'+esc(tg):''}${(()=>{const p=stPerf(S,T),px=p.px,sp=num(T.stop),A=stAlerts(S).filter(a=>a.th==T.id),v=typeof ckVerdict=='function'?ckVerdict(T):null,o=[];
  if(p.first&&p.ret!=null)o.push(`${p.base?'起算後 ':''}<span class="${stCls(p.pl)}">${stPct(p.ret)}</span>`);if(px!=null&&sp!=null&&T.status!='exit')o.push(`離停損 ${((sp/px-1)*100).toFixed(1)}%`);if(A.length)o.push(`⚠️${A.length}`);
  return(o.length?' <span class=h>｜'+o.join('｜')+'</span>':'')+(v?`<div class="stv1 ${v.cls}">依 ${esc(st?st.id:'')}：${esc(v.t)}</div>`:'')})()}`;
  const m=$('stm_'+T.id);if(m)m.innerHTML=stMet(p)}
 for(const k in cnt){const e=$('stc_'+k);if(e)e.innerText=cnt[k]||''}
 for(const st of S.strategies||[]){const e=$('stdy_'+st.id);if(e)e.innerText=stDirty(st)?'● 有修改尚未存成版本':''}
 if(stTab=='perf')stPerfRender()}
function stPerfRender(){if($('stPerfTop')&&typeof asVsBm=='function'){const v=asVsBm(S,'a'),bm=esc(bmC(S));$('stPerfTop').innerHTML=`<b>⚡ 主動部位有沒有贏 ${bm}？</b> ${v.inv?asBmTxt(v)+`<span class=h>（同樣的錢、同樣的時間點買 ${bm}；主動總損益 ${asM(v.tot)}${v.days<182.6?'，期間報酬 '+asPct(v.ret):'，年化 '+asPct(v.xr)}）</span>`:'<span class=h>還沒有主動部位。</span>'}<div class=h>這是借錢投資最關鍵的一個數字：長期沒贏 ${bm}，代表自己選股的錢放到被動部位會更好。</div>`}
 const rows=[],fmtRow=(lb,a,mdd,note)=>`<tr><td>${lb}</td><td>${a.n?a.open+'／'+a.closed:'—'}</td><td>${a.win!=null?a.win.toFixed(0)+'%':'—'}</td><td>${a.rr!=null?a.rr.toFixed(2):'—'}</td><td>${a.n?W2(a.inv):'—'}</td><td class="${stCls(a.n&&a.plOk?a.pl:null)}">${a.n?(a.plOk?(a.pl>=0?'+':'')+W2(a.pl):'<span class=wn>需填現價</span>'):'—'}</td><td class="${stCls(a.n&&a.plOk?a.ret:null)}">${a.n&&a.plOk?stPct(a.ret):'—'}</td><td class="${stCls(a.ex)}">${a.ex!=null?stPp(a.ex).replace(' 個百分點',''):a.bmPart?'<span class=wn>部分</span>':'—'}</td><td>${mdd!=null?mdd.toFixed(1):'—'}</td><td>${a.fol!=null?a.fol.toFixed(0)+'%':'—'}</td></tr>`+(note?`<tr><td colspan=10 class=h style="text-align:left">${note}</td></tr>`:'');
 for(const st of S.strategies||[]){const it=stThesisItems(S,st.id),a=stAgg(it),md=stMDD(S,(S.theses||[]).filter(T=>T.sid==st.id&&T.status!='plan'));rows.push(fmtRow(`${esc(st.id)} ${esc(st.name)} v${st.ver}`,a,md))}
 const noS=stThesisItems(S).filter(o=>!stStrat(S,o.T.sid));if(noS.length)rows.push(fmtRow('（論點未指定策略）',stAgg(noS),null));
 const ua=stUntagged(S,'a'),up=stUntagged(S,'p'),pz=list=>stAgg(list.map(p=>({p,closed:!p.open})));
 rows.push(fmtRow('未分類（主動）',pz(ua.unc),null,'撥款後沒有歸到論點的主動部位交易，每一檔算一筆；用來看出有沒有不照策略買。'));
 rows.push(fmtRow('期初持股（主動）',pz(ua.ini),null,'撥款前就有、沒有納入論點的主動持股，成本用撥款日收盤價。'));
 rows.push(fmtRow('被動（依配置）',pz(up.unc.concat(up.ini)),null,'被動 ETF 依資金配置買進，不列入策略評估。'));
 $('stPerfT').innerHTML=`<thead><tr><th>策略／類別</th><th>進行／出場</th><th>勝率</th><th>賺賠比</th><th>投入(萬)</th><th>損益(萬)</th><th>報酬率</th><th>超額(百分點)</th><th>最大回撤(百分點)</th><th>照規則</th></tr></thead><tbody>${rows.join('')}</tbody>`;
 const L=(S.theses||[]).filter(T=>T.status!='plan').map(T=>({T,p:stPerf(S,T)})).sort((a,b)=>(b.p.ret??-1e9)-(a.p.ret??-1e9));
 $('stThT').innerHTML=L.length?`<thead><tr><th>論點</th><th>代號</th><th>策略</th><th>狀態</th><th>持有天數</th><th>投入(萬)</th><th>損益(萬)</th><th>報酬率</th><th>年化／期間</th><th>vs ${esc(bmC(S))}</th><th>照規則</th></tr></thead><tbody>${L.map(({T,p})=>{const st=stStrat(S,T.sid);return`<tr onclick="stOpenTh('${T.id}')" style="cursor:pointer"><td>${esc(T.id)}</td><td>${esc(cU(T.code))} <small>${esc(nameOf(T.code))}</small></td><td>${st?esc(st.id)+' v'+(T.sver||1):'—'}</td><td>${stStatusN(T.status)}</td><td>${Math.round(p.days)}</td><td>${W2(p.inv)}</td><td class="${stCls(p.pl)}">${p.pl==null?'—':(p.pl>=0?'+':'')+W2(p.pl)}</td><td class="${stCls(p.ret)}">${stPct(p.ret)}</td><td>${p.days<182.6?'期間 '+stPct(p.ret):p.xr!=null?'年化 '+stPct(p.xr):'—'}</td><td class="${stCls(p.ex)}">${p.ex!=null?stPp(p.ex).replace(' 個百分點',''):'—'}</td><td>${T.status=='exit'?(T.exit&&T.exit.followed!==''&&T.exit.followed!=null?(+T.exit.followed?'是':'否'):'未填'):''}</td></tr>`}).join('')}</tbody>`:'<tbody><tr><td class=h>還沒有已建倉的論點。</td></tr></tbody>'}

// 論點的策略條件勾選（＝買進理由）
function stCondBox(T,st){if(!st)return'';const E=stCondEval(st,T.met);if(!E.length)return'';const M=new Set(T.met||[]),cur=new Set(E.flatMap(g=>g.items)),old=(T.met||[]).filter(t=>!cur.has(t));
 return`<div class=sub>當初符合的策略條件 <span class=h>${T.metAt?'（'+esc(T.metAt)+' 勾選）':''}${typeof CK!='undefined'&&CK?'｜標「自動」的是今天的自動檢核（'+esc(ckAsOf())+'）':''}</span></div><div class=asck>${E.map(g=>`<div style="margin-top:3px"><b>${esc(g.sec)}</b> <span class="${g.ok?'ok':'wn'}">${g.n}／${g.tot}${g.need?'（需要 '+(g.need>=g.tot?'全部':g.need+' 項')+'）':''}</span>${g.items.map(t=>`<label class=ck><input type=checkbox data-ct="${esc(t)}" onchange="stMetT('${T.id}',this.dataset.ct,this.checked)" ${M.has(t)?'checked':''}>${typeof ckT=='function'?ckT(t):esc(t)}${(T.pend||[]).includes(t)?' <span class=wn>（待確認）</span>':''}${(T.metNote||{})[t]?' <i class=h>'+esc(T.metNote[t])+'</i>':''}${typeof ckEval=='function'?ckBadge(ckEval(T.code,t,st),1):''}</label>`).join('')}</div>`).join('')}${old.length?`<div class=h>其他版本的條件：${old.map(esc).join('；')}</div>`:''}</div>`}
window.stMetT=(id,t,on)=>{const T=stThesis(S,id);if(!T)return;T.met=(T.met||[]).filter(x=>x!=t);if(on)T.met.push(t);T.pend=(T.pend||[]).filter(x=>x!=t);if(!T.metAt)T.metAt=TODAY;stBuild();upd()};
