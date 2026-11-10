// 畫面：試算、風險、結算、交易紀錄
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
let S,hi=null,CH=null,lastE=[],trash=null,ttm=null,curT='F';const info=new Set();
const fx=v=>(Math.abs(v)<0.005?0:v).toFixed(2),$=id=>document.getElementById(id),W=v=>(v/1e4).toFixed(1),W2=v=>(v/1e4).toFixed(2),R=v=>Math.round(v).toLocaleString(),rr=v=>Math.round(v*1e4)/1e4,P1=v=>(v>=0?'+':'')+v.toFixed(1)+'%';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const isS=()=>S.ui=='simple',effRe=()=>!isS()&&S.cv=='re',SIMPLE_CARDS=['fc','be','cf','risk'];
const effHide=()=>isS()?Object.assign({},S.hide,{l_plan:1,l_b:1,l_pt:1,l_sc:1,health:1}):S.hide;
const todayT=H=>{const t=ym2t(S,TODAY.slice(0,7));return isNaN(t)?0:Math.max(0,Math.min(H,t))};
function rngAB(H){const n=S.rng=='1'?12:S.rng=='3'?36:0;if(!n||n>=H)return[0,H];let a=Math.max(0,todayT(H)-3);if(a+n>H)a=H-n;return[a,a+n]}
function niceStep(r){if(!(r>0))return 1;const e=Math.pow(10,Math.floor(Math.log10(r))),f=r/e;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){return null}}
function load(){try{const j=JSON.parse(ls('lc3'));if(j){S=migrate(j).o;fixCur();return}}catch(e){}S=norm(clone(DEF));fixCur()}
function fixCur(){if(!S.cur.dt){S.cur.dt=TODAY;S.cur.m=TODAY.slice(0,7)}}
function save(){const e=sigE();if(e!==ls('lce')){if(ls('lce')!=null)S.edited=new Date().toISOString();ls('lce',e)}ls('lc3',JSON.stringify(S));if(typeof bkUpd=='function')bkUpd()}
// 最後修改時間：只看實際內容（不含現價自動更新、畫面狀態），匯入舊檔時用來警告
function sigE(){const o=Object.assign({},S);['trG','trOpen','rng','pin','edited','px','pxd','pxa','ui'].forEach(k=>delete o[k]);const s=JSON.stringify(o);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h)}
// 備份狀態：以內容指紋判斷是否有尚未匯出的變更
function sig(){const o=Object.assign({},S);delete o.trG;delete o.trOpen;delete o.rng;delete o.pin;delete o.edited;const s=JSON.stringify(o);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h)}
const INFO={
 alpha:'最新一次結算的實際 A／B／C。B（定投收益）在初期接近 0 是正常的：月付金才繳了幾期、還沒時間增值，會隨時間累積。年化報酬（XIRR）＝整個追蹤帳戶平均每年賺幾 %，已考慮你什麼時候放錢進去；高於信貸成本代表借來的錢跑贏利息。未滿 6 個月時年化數字會被放大（例如兩個月賺 7%，換算一年約 50%），所以先顯示期間報酬。',
 alpha0:'最新一次結算的借貸淨效益。A 面額＝借錢投資比「不借錢、每月月付金放著不投資」多賺多少；B 定投收益＝每月月付金如果拿去定期定額（以機會成本報酬率計）能多賺多少；C 機會成本＝A−B＝借錢投資比「不借錢、每月定期定額」多賺多少。主要看 C：大於 0 代表借錢比定期定額好。',
 xirr:'整個追蹤帳戶平均每年賺幾 %，已考慮你什麼時候放錢進去；高於信貸成本代表借來的錢跑贏利息。未滿 6 個月時年化數字會被放大，所以先顯示期間報酬（未年化）。',
 xirr0:'追蹤帳戶撥款以來的年化報酬（已考慮入金、出金的時間點）。高於信貸成本，代表借來的錢跑贏利息。',
 perf:'被動、主動部位撥款以來的時間加權報酬（已扣除你自己買進的錢），與同期對照基準 ETF（預設 0050，含配息）比較。括號內為超額報酬，正值代表贏過基準。需每期填「淨買進」。',
 dep:'依交易紀錄加總撥款後的買進成本（含手續費）減賣出所得，與「資金配置」的被動、主動計畫金額比較。交易紀錄無法分辨用的是信貸資金還是原有現金，請自行判斷。',
 fc:'依目前假設推到貸款最後一期的 A／B／C。A 面額＝比不投資多賺；B 定投收益＝月付金改拿去定期定額能多賺的部分；C 機會成本＝A−B＝比每月定期定額多賺（主要看這個，大於 0 代表借錢值得）。有結算紀錄時從最新一次實際結算往後推。',
 be:'刻度尺上：灰點＝不投資線（A 打平：每年至少賺這麼多，才不會比錢放著不投資差）；紫點＝定期定額線（C 打平：借錢比每月定期定額好的門檻，主要看這個）；三角形＝你目前設定的報酬假設。「你的假設」＝依配置加權的含息報酬。門檻可能比信貸利率低，是因為本金每月都在還，平均只借了大約一半的錢，但投入的金額整筆都在賺。',
 early:'在指定期數（預設為綁約結束後第一期）一次還清，與持有到期相比的期末淨效益差。門檻＝價格報酬低於這個值時，提前還清比較划算。',
 cf:'每月收入−固定支出−信貸月付。顯示首期與整個貸款期間最低的一個月；每月都一樣時標註「每月相同」。',
 mn:'預測期間真實淨資產的最低點。低於撥款前的淨資產，代表跌破你設定的底線。',
 risk:'虧損上限＝貸款金額 × 你設定的 %。虧損＝A 面額為負的金額，已含已付利息、開辦費、交易成本與股利稅，不含尚未發生的利息。「≈再跌」＝剩餘額度 ÷ 目前在股市裡的信貸資金（不含還沒投入的現金，不另外加權）。',
 slu:'已用掉的比例＝目前虧損 ÷ 虧損上限。A 為正（賺錢）時為 0%。',
 sly:'剩餘額度 ÷ 目前在股市裡的信貸資金。已結算時，信貸資金部位＝帳戶股票市值 ×（帳戶總值−沒借錢估計值）÷ 帳戶總值；未結算時用試算值。還沒投入的現金不受股市影響，不計入；你選的停損轉入標的也視為低風險、不計入（依交易紀錄的持股計算：有填現價用現價，否則用成本）。',
 slx:'規則 ② 的減碼金額：賣到「剩下的信貸股票部位就算再跌你設定的 %，虧損也不會超過上限」為止，先賣主動、不夠再賣被動，轉入你選的低風險標的。',
 slc:'假設現在把信貸資金的股票部位全部賣出：(a) 轉入你選的標的持有到期（用試算頁設定的報酬率，不含買回）；(b) 全部賣出並提前清償（綁約內計違約金）。與「不動作」的期末 A 比較。',
 lev:'左：信貸剩餘本金 ÷ 追蹤帳戶總值（股票＋現金），越高槓桿越重。右：帳戶現金＋被動部位可支應幾個月的「固定支出＋信貸月付」，低於應對規則「安全存量不足」的門檻時亮紅燈。',
 lev0:'信貸剩餘本金 ÷ 追蹤帳戶總值（股票＋現金）。越高代表槓桿越重，下跌時的影響越大。',
 em:'帳戶現金＋被動部位，可支應幾個月的「固定支出＋信貸月付」。低於應對規則「安全存量不足」的門檻時亮紅燈。',
 sdrop:'假設選定情境開始那個月股市下跌、而且到期都「不回升」（收入衝擊、升息、配息縮水等其他條件照選定情境），在不被迫賣股、且期末真實淨資產不低於撥款前的條件下，最多能承受的跌幅。',
 sjob:'選定情境開始後收入完全中斷，最多可以撐幾個月：左＝完全不用賣股；右＝只賣被動、不用賣主動與撥款前原有持股。期間先用口袋緩衝與帳戶現金。其他條件照選定情境。',
 spk:'情境開始前一個月，口袋緩衝（帳戶以外可動用的錢）累積到多少。勾選「每月結餘累積」時，收入扣掉固定支出與月付後的結餘會存進來。',
 srate:'情境開始月起利率加上設定的百分點後，信貸月付（依剩餘本金與期數重算）的變化。',
 rb:'被動占股票（被動＋主動）的比例，與目標比較；目標＝（撥款前被動＋信貸配置的被動）÷（撥款前股票＋信貸配置的被動與主動）。偏離超過容許百分點時提醒再平衡。',
 dq:'對照基準 ETF（預設 0050）現價相對近期高點（在風險分頁填寫）的回落幅度；達到管理規則設定的幅度時，提示可動用的帳戶現金金額。',
 real:'追蹤帳戶（股票＋現金）扣掉信貸剩餘本金、已繳月付、開辦費、淨入金與外部費用後的淨值，並與撥款前比較。',
 nle:'假設沒有借錢：逐檔明細時＝期初股數 × 各檔現價＋期初持股的配息＋撥款前現金；直接填總額時＝撥款前股票照同期對照基準 ETF 漲跌＋撥款前現金。Alpha 就是真實淨資產減去這個值。',
 perfP:'這次結算時點的被動、主動部位撥款以來時間加權報酬，與對照基準 ETF 同期報酬比較。'};
const CARDS=[['health','健康燈號'],['alpha','實際績效'],['perf','被動／主動 vs 基準'],['fc','預測期末淨效益'],['be','划算門檻'],['risk','距離停損線'],['dep','建倉進度'],['cf','月現金流'],['lev','槓桿與安全存量'],['early','提前清償比較'],['mn','預測最低真實淨資產']];
const LINES=[['l_plan','原始計畫','#94a3b8','dash'],['l_af','A 面額（比不投資）','#7c3aed','line'],['l_b','B 定投收益','#ea580c','line'],['l_ao','C 機會成本＝A−B（比定投）','#7c3aed','dash'],['l_sc','壓力情境','#dc2626','dash'],['l_sl','停損線','#b91c1c','line'],['l_pt','實際結算','#16a34a','dot']];
const RULES={loss1:['虧損上限 ①','已用掉虧損上限的(%)'],loss2:['虧損上限 ②（主動減半）','已用掉虧損上限的(%)'],loss3:['虧損上限 ③（主動全出）','已用掉虧損上限的(%)'],loss4:['虧損上限 ④（被動也出）','已用掉虧損上限的(%)'],rebuy:['買回時機','基準 ETF 收盤站上幾日均線（120＝半年線）'],dd:['帳戶回撤','帳戶總值從高點回落達(%)'],cash:['安全存量不足','現金＋被動可撐月數低於(月)'],lev:['槓桿過高','信貸餘額÷帳戶總值高於(%)'],cneg:['機會成本連續為負','C 連續為負達(次結算；情境以季計)'],xirr:['XIRR 低於信貸成本','連續低於信貸成本達(次結算)'],dip:['逢低加碼時機','基準 ETF 從近期高點回落達(%)'],rate:['利率上升','信貸利率達到(%)']};
const SCF=[['市場',[['st','開始於撥款後第幾個月'],['dr','股市跌幅(%)：股票 ETF 與原有持股'],['dn','下跌期間(月)'],['rc','回升期間(月，0＝不回升)'],['ba','主動跌幅倍數'],['bb','債券 ETF 跌幅倍數'],['dc','壓力期間配息縮水(%)']]],['利率',[['ru','升息(百分點，從開始月起)']]],['收入與支出',[['il','收入中斷(月)'],['ic','減薪(%)'],['icm','減薪持續(月，0＝到期末)'],['sh','突發支出(萬，開始月一次)'],['fu','固定支出增加(元/月)']]]];
const SC0={n:'基準',st:1,dr:0,dn:1,rc:0,ba:1,bb:0,dc:0,ru:0,il:0,ic:0,icm:0,sh:0,fu:0};
const AK=[['Wc','保留現金'],['Wp','被動'],['Wa','主動']];
const inp=(p,v,t='n',x='')=>`<input ${t=='s'?'':'type=number step=any'} data-p="${p}" data-t="${t}" value="${esc(v)}" ${x}>`;
const mon=(p,v)=>`<input type=month data-p="${p}" data-t="s" value="${v||''}">`;
const fld=([k,l,t])=>`<label>${l}${inp(k,S[k],t||'n')}</label>`;
// 結算的現金：主動、被動兩格，合計自動寫進「追蹤帳戶現金合計」（信貸計算用合計，數字不變）
function cashIns(){const C=cashOf(S.cur),ph=k=>C&&C.old&&k=='ca'?` placeholder="舊資料合計 ${C.t}"`:'';const f=(k,l)=>`<label>${l}${inp('cur.'+k,S.cur[k],'o').replace('<input','<input'+ph(k))}</label>`;
 return f('ca','主動帳戶現金(萬)')+f('cp','被動帳戶現金(萬)')+(C&&C.old?`<div class=wn style="grid-column:1/-1;font-size:12px">舊資料只有現金合計 ${C.t} 萬，先全部算在主動帳戶；請分成兩格各填一次。</div>`:'')}
function cashSync(){const a=num(S.cur.ca),p=num(S.cur.cp);if(a==null&&p==null){if(S.cur.ca===''&&S.cur.cp==='')S.cur.c='';return}S.cur.c=+((a||0)+(p||0)).toFixed(4)}
const cf_=(k,l,t='o')=>`<label>${l}${inp('cur.'+k,S.cur[k],t)}</label>`;
const del=(l,i)=>`<button onclick="delRow('${l}',${i})">✕</button>`;
const tg=(k,l)=>`<label class=ck><input type=checkbox data-p="${k}" data-t="b" ${S[k]?'checked':''}>${l}</label>`;
function tlEd(l,vk,vl){return`<div class="row r-tl h"><span>從(年-月)起</span><span>${vl}</span><span></span></div>`+S[l].map((e,i)=>`<div class="row r-tl">${mon(l+'.'+i+'.m',e.m)}${inp(l+'.'+i+'.'+vk,e[vk])}${del(l,i)}</div>`).join('')+`<button onclick="addRow('${l}')">＋新增一筆</button>`}
const ERK=[['tr','含息年化'],['pr','價格年化'],['yl','推算殖利率'],['worst','最差年度'],['vol','年報酬標準差'],['rv','報酬/波動'],['tv','2025 月均成交值'],['aum','資產規模'],['ter','總費用率(2025)'],['cf','經理＋保管費(目前)'],['n','資料年數']];
function refRows(){if(!ETFREF)return[];const e=S.er||{},t=e.t||'all';let rows=ETFREF.rows.filter(r=>t=='all'||r.t==t).filter(r=>!(e.h3&&r.n<3));
 const k=e.k||'tr',d=e.d||-1,v=r=>k=='worst'?r.worst[1]:k=='rv'?(r.vol?r.tr/r.vol:null):r[k];
 rows.sort((a,b)=>{const x=v(a),y=v(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return(x-y)*d});return rows}
function refHTML(){if(!ETFREF)return'';const e=S.er||{},open=e.open?'open':'',f=(v,s='%')=>v==null?'<span class=h>待補</span>':v.toFixed(1)+s;
 const types=['all'].concat([...new Set(ETFREF.rows.map(r=>r.t))]);
 return`<details ${open} id=erd style="margin-top:8px"><summary>📊 被動 ETF 歷史參考（${ETFREF.period}，點開查看）</summary>
 <div class=chips>${types.map(t=>`<button class="${(e.t||'all')==t?'on':''}" onclick="setEr('t','${t}')">${t=='all'?'全部':t}</button>`).join('')}</div>
 <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><label class=ck>排序<select onchange="setEr('k',this.value)" style="width:auto">${ERK.map(([k,l])=>`<option value=${k} ${(e.k||'tr')==k?'selected':''}>${l}</option>`).join('')}</select></label><button onclick="setEr('d',${-(e.d||-1)})" style="font-size:12px">${(e.d||-1)<0?'高→低':'低→高'}</button><label class=ck><input type=checkbox ${e.h3?'checked':''} onchange="setEr('h3',this.checked?1:0)">隱藏未滿 3 年</label></div>
 <div class=w style="margin-top:4px"><table class=er-t><thead><tr><th class=l>ETF</th><th>年數</th><th>含息年化</th><th>價格年化</th><th>殖利率</th><th>最差年</th><th>波動</th><th>月均成交(億)</th><th>規模(億)</th><th>總費用率</th><th></th></tr></thead><tbody>
 ${refRows().map(r=>`<tr><td class=l><a href="javascript:void 0" onclick="tgRef('${r.c}')">${r.c}</a> <small class=h>${r.nm}</small>${r.n<3?'<span class=tagr>僅供參考</span>':''}</td><td>${r.n}</td><td><b>${f(r.tr)}</b></td><td>${f(r.pr)}</td><td>${f(r.yl)}</td><td class="${r.worst[1]<0?'bad':''}">${r.worst[1].toFixed(1)}%<br><small class=h>${r.worst[0]}</small></td><td>${f(r.vol)}</td><td>${r.tv==null?'<span class=h>待補</span>':r.tv.toFixed(0)}</td><td>${r.aum==null?'<span class=h>待補</span>':Math.round(r.aum).toLocaleString()}</td><td>${r.ter==null?(r.cf==null?'<span class=h>待補</span>':'<span class=h>契約 '+r.cf.toFixed(3)+'%</span>'):r.ter.toFixed(2)+'%'}</td><td><button style="font-size:11px;padding:2px 6px" onclick="applyRef('${r.c}')">套用</button></td></tr>${(e.x||'')==r.c?`<tr class=x><td colspan=11 class=l style="white-space:normal"><div style="position:sticky;left:0;max-width:min(740px,calc(100vw - 50px))"><div class=h><b>逐年含息報酬</b>：${Object.entries(r.ann).map(([y,v])=>`${y} <span class="${v<0?'bad':''}">${v.toFixed(1)}%</span>`).join('、')}</div><div class=h>期間：${r.start} 年底 → 2025 年底（${r.n} 個完整年度）｜類型：${r.t}${r.note?'｜'+r.note:''}</div><div class=h>來源：<a href="${r.src}" target=_blank rel=noopener>Yahoo Finance 月資料</a>${r.terSrc?'｜總費用率：'+r.terSrc:''}</div>${r.cf!=null?`<div class=h>經理＋保管費（目前契約費率）：${r.cf.toFixed(3)}%（${r.cfNote}）｜來源：${r.cfSrc}</div>`:''}${r.aum!=null?`<div class=h>規模 ${r.aum.toLocaleString()} 億元｜來源：${r.aumSrc}</div>`:''}</div></td></tr>`:''}`).join('')}</tbody></table></div>
 <div class=h style="margin-top:4px">${ETFREF.notes.map(s=>'・'+s).join('<br>')}</div></details>`}
window.setEr=(k,v)=>{S.er=S.er||{};S.er[k]=v;S.er.open=1;build();upd()};
window.tgRef=c=>{S.er=S.er||{};S.er.x=S.er.x==c?'':c;S.er.open=1;build();upd()};
window.applyRef=c=>{const r=ETFREF.rows.find(x=>x.c==c);if(!r)return;if(r.pr==null||r.yl==null){alert('這檔資料不完整，無法套用');return}
 if(!confirm(`把 ${c} 的歷史價格年化 ${r.pr.toFixed(1)}%、推算殖利率 ${r.yl.toFixed(1)}% 套用到試算？\n（歷史績效不代表未來，建議套用後自行下修）`))return;
 const i=S.etfs.findIndex(e=>String(e.n).trim().toUpperCase()==c);const v={p:+r.pr.toFixed(1),y:+r.yl.toFixed(1)};
 if(i>=0)Object.assign(S.etfs[i],v);else S.etfs.push(Object.assign({n:c,w:0,c:r.t=='債券'?0:1},v));S.er.open=1;build();upd();toast('已套用 '+c+(i>=0?'':'（新增一列，比例請自行調整）'),0)};
function autoKey(){const u=AK.map(a=>a[0]).filter(k=>!S.lk[k]);return u.length==1?u[0]:null}
function build(){
 const sameM=build.m===S.ui;build.m=S.ui;const op=sameM?[...document.querySelectorAll('#ctl details')].map(d=>d.open):[],ak=autoKey();
 $('ctl').innerHTML=isS()?simpleCtl():
  `<details ${dOpen("信貸條件",1)}><summary>信貸條件</summary><div class=g>${fld(['L','貸款金額(萬)'])}${fld(['Y','年期(年)'])}<label>撥款日期<input type=date data-p="dd" data-t="s" value="${S.dd||''}"></label>${fld(['fee','開辦費(元)'])}</div>
   <label class=ck style="margin-top:6px"><input type=checkbox data-p="feeDed" data-t="b" ${S.feeDed?'checked':''}>開辦費從撥款金額直接扣除（取消＝用口袋另付）</label>
   <div class=h id=payday></div>
   <div class=sub>利率（從第幾期起適用；優惠期、機動利率調整就新增一列）</div>
   <div class="row r-tl h"><span>從第幾期起</span><span>年利率(%)</span><span></span></div>${S.rates.map((e,i)=>`<div class="row r-tl">${inp('rates.'+i+'.k',e.k)}${inp('rates.'+i+'.r',e.r)}${del('rates',i)}</div>`).join('')}<button onclick="addRow('rates')">＋新增利率</button></details>`+
  `<details ${dOpen("資金配置（萬元）",1)}><summary>資金配置（萬元）</summary><div class=g3>${AK.map(([k,l])=>`<label>${l}${k==ak?'（自動）':''}<div class=lkw><button onclick="tgLk('${k}')" title="鎖定">${S.lk[k]?'🔒':'🔓'}</button><input type=number step=any data-a="${k}" value="${esc(S[k])}" ${S.lk[k]||k==ak?'disabled':''}></div></label>`).join('')}</div>
   <div class=h id=ahint style="margin-top:4px"></div>
   <div class=g style="margin-top:6px">${[['K','分批月數(含撥款月)'],['Ra','主動預期報酬(%)'],['cr','閒置現金利率(%)']].map(fld).join('')}</div>
   <div class=sub>被動 ETF（可增列；價格報酬＝淨值漲跌不含息；配息以季配估算；抵減＝適用股利 8.5% 抵減）</div><div class="row r-etf h"><span>名稱</span><span>比例%</span><span>價格報酬%</span><span>殖利率%</span><span>抵減</span><span></span></div>${S.etfs.map((e,i)=>`<div class="row r-etf">${inp('etfs.'+i+'.n',e.n,'s')}${inp('etfs.'+i+'.w',e.w)}${inp('etfs.'+i+'.p',e.p)}${inp('etfs.'+i+'.y',e.y)}<input type=checkbox data-p="etfs.${i}.c" data-t="b" ${+e.c?'checked':''}>${del('etfs',i)}</div>`).join('')}<button onclick="addRow('etfs')">＋新增 ETF</button> <span id=wsum class=h></span>${refHTML()}</details>`+
  `<details ${dOpen("每月現金流（時間軸）",0)}><summary>每月現金流（時間軸）</summary><div class=h>每筆從該月起適用，直到下一筆為止。只用來檢查每月付不付得起信貸。</div><div class=sub>每月收入</div>${tlEd('sals','v','月實領(元)')}<div class=sub>每月固定支出（房貸、生活費、保險等合計）</div>${tlEd('livs','v','每月合計(元)')}</details>`+
  `<details ${dOpen("撥款前狀態與對照基準",0)}><summary>撥款前狀態與對照基準</summary><div class=h>撥款前追蹤帳戶的持股與現金，是判斷「借錢多賺多少」的基準。</div>
   <div class=seg style="margin:6px 0"><button class="${S.initMode=='none'?'on':''}" onclick="setInitMode('none')">無（全新帳戶）</button><button class="${S.initMode=='total'?'on':''}" onclick="setInitMode('total')">直接填總額</button><button class="${S.initMode=='detail'?'on':''}" onclick="setInitMode('detail')">逐檔明細</button></div>
   ${S.initMode=='none'?`<div class=h style="margin:4px 0">信貸資金放在全新帳戶、沒有撥款前的持股與現金時選這個；借錢的效果就等於帳戶淨值。</div>`:''}
   ${S.initMode=='detail'?`<div class="h">最準：結算時逐檔用現價計算「不借錢的話」的價值。</div><div class="h mob">每檔三行：帳戶｜代號｜名稱／股數｜撥款日收盤價／原始成本</div><div class="r-in h"><span class=w-ac>帳戶</span><span class=w-c>代號</span><span class=w-n>名稱</span><span class=w-q>股數</span><span class=w-p>撥款日收盤價</span><span class=w-c0>原始成本(元)</span></div>${(S.init||[]).map((r,i)=>`<div class=r-in><select class=w-ac data-p="init.${i}.ac" data-t="s"><option value=p ${r.ac!='a'?'selected':''}>被動部位</option><option value=a ${r.ac=='a'?'selected':''}>主動部位</option></select>${inp('init.'+i+'.n',r.n,'s','class=w-c placeholder="代號" autocomplete=off')}<span class=w-n id="inN${i}">${esc(nameOf(r.n))}</span>${inp('init.'+i+'.q',r.q,'o','class=w-q placeholder="股數"')}${inp('init.'+i+'.px',r.px,'o','class=w-p placeholder="收盤價"')}${inp('init.'+i+'.c0',r.c0,'o','class=w-c0 placeholder="原始成本(選填)"')}${del('init',i)}</div>`).join('')}<div class=h>原始成本：券商 App 上這批股票的付出成本（元，選填，含手續費）。只用在「📊 資產」顯示跟 App 一樣的損益，信貸計算仍用撥款日收盤價。</div><button onclick="addRow('init')">＋新增一檔</button><div class=h id=initSum style="margin-top:4px"></div>`:S.initMode=='total'?`<div class=h>結算時以「撥款前市值 × 對照基準 ETF 的漲跌」估算「不借錢的話」，原有持股和基準走勢不同時會有誤差。</div><div class=g>${fld(['sv0p','撥款前被動市值(萬)'])}${fld(['sv0a','撥款前主動市值(萬)'])}</div>`:''}
   <div class=g style="margin-top:6px">${S.initMode!='none'?fld(['sc0','撥款前帳戶現金(萬)']):''}<label>對照基準 ETF（代號）${inp('bm',S.bm,'s','placeholder="0050"')}<span class=h id=bmN>${esc(nameOf(S.bm))}</span></label>${hasInit(S)&&(S.init||[]).some(r=>cU(r.n)==bmC(S))?`<label>撥款日 ${esc(bmC(S))} 價格(元)<input value="${esc(S.p0050)}" disabled></label>`:fld(['p0050','撥款日 '+bmC(S)+' 價格(元)','o'])}${fld(['br','機會成本報酬率(%)：月付金若改投入的年報酬'])}</div></details>`+
  `<details ${dOpen("稅費與手續費",0)}><summary>稅費與手續費</summary><div class=g>${[['tax','所得稅級距(%)'],['stE','ETF證交稅(%)'],['stS','股票證交稅(%)']].map(fld).join('')}</div>
   <div class=sub>券商手續費（牌告 0.1425% × 折數；2 折填 2，不打折填 10）</div><label class=ck><input type=checkbox data-p="feeSame" data-t="b" ${S.feeSame?'checked':''} onchange="setTimeout(build,0)">被動、主動用同一家券商</label><div class=g>${S.feeSame?`<label>折數${inp('fees.p.d',S.fees.p.d)}</label><label>最低收費(元)${inp('fees.p.mn',S.fees.p.mn)}</label>`:`<label>被動部位 折數${inp('fees.p.d',S.fees.p.d)}</label><label>被動部位 最低收費(元)${inp('fees.p.mn',S.fees.p.mn)}</label><label>主動部位 折數${inp('fees.a.d',S.fees.a.d)}</label><label>主動部位 最低收費(元)${inp('fees.a.mn',S.fees.a.mn)}</label>`}</div>
   <div class=g><label>折讓方式<select data-p="feeMode" data-t="s" onchange="setTimeout(build,0)"><option value="now" ${S.feeMode!='month'?'selected':''}>成交時直接打折</option><option value="month" ${S.feeMode=='month'?'selected':''}>交易時收全額、每月退回</option></select></label>${S.feeMode=='month'?`<label>退款日（次月幾號，大概就好）${inp('feeDay',S.feeDay,'o')}</label>`:''}</div>
   ${S.feeMode=='month'?'<div class=h>每月退回：信貸與策略仍用折讓後的實際成本；「📊 資產」的成本用全額手續費（和券商 App 一樣）；結算時還沒退回的折讓會自動算成應收退款加回現金，不用另外記錄。</div>':''}
   <div class=h>交易紀錄自動計算手續費、試算頁預測的買賣成本都用這裡的設定（預測不計最低收費）。賣出證交稅：代號 00 開頭以 ETF 稅率計，其餘以股票稅率計。</div></details>`+
  `<details ${dOpen("情境",0)}><summary>情境</summary><div class=sub>提前清償</div><div class=tg>${tg('early','啟用提前清償（一次還清）')}</div><div class=g style="margin-top:4px">${fld(['E','提前清償第幾期（也用於比較卡）'])}${fld(['lock','綁約(月)'])}${fld(['pen','違約金(%)'])}</div>
   <div class=sub>其他</div><div class=tg>${tg('grow','原有部位成長（只影響真實淨資產底線檢查）')}</div><div class=h style="margin-top:4px">市場下跌、收入中斷等壓力測試請到「🛡️ 風險」分頁。</div></details>`+
  `<div style="margin-top:8px"><button onclick="resetPlan()">📌 以目前設定重設「原始計畫」線</button> <span class=h id=pinfo></span></div>`;
 if(op.length)document.querySelectorAll('#ctl details').forEach((d,i)=>{if(i<op.length)d.open=op[i]});
 $('s1').innerHTML=`<label>結算日期 ${S.cur.dtFix?`<span class=h>📌 固定</span> <a href="#" onclick="curToday();return false" class=h>回到今天</a>`:'<span class=h>（自動：今天）</span>'}${dIn('cur.dt',S.cur.dt,'結算日期')}</label>`+(usePx(S)?cashIns():`${cf_('x50',bmC(S)+' 價格(元)')}${cf_('p','被動部位市值(萬)')}${cf_('a','主動部位市值(萬)')}`+cashIns())+`<label style="grid-column:span 2">備註${inp('cur.note',S.cur.note,'s')}</label>`;
 $('s1h').innerText=usePx(S)?'現金照券商 App 上的交割帳戶餘額填寫；現價每個交易日收盤後自動帶入（要改到「📊 資產 → 持股明細表」），被動、主動市值自動計算（可在「修正」覆寫）。尚未交割的交易、尚未發放的股利、還沒退回的手續費折讓會自動處理。':'市值與現金照券商 App 抄；尚未交割的交易與尚未發放的股利會自動處理。建議在試算頁「撥款前狀態」改用逐檔明細，結算只要填各檔現價，借錢效果也會更準。';
 $('s3').innerHTML=cf_('rem','剩餘本金(萬)：以銀行為準時才填')+(usePx(S)?cf_('p','被動市值(萬)：漏填現價或有特殊部位時才填')+cf_('a','主動市值(萬)：漏填現價或有特殊部位時才填'):'')+cf_('bp','本期被動淨買進(萬)：沒記交易紀錄時才填')+cf_('ba','本期主動淨買進(萬)：沒記交易紀錄時才填');
 renderTrades();
 $('ledger').innerHTML=S.ledger.map((e,i)=>`<div class="row r-lg">${dIn('ledger.'+i+'.dt',e.dt||(e.m?e.m+'-01':''),'日期')}<select data-p="ledger.${i}.k" data-t="s">${[['in','入金'],['out','出金'],['cost','外部費用']].map(([v,t])=>`<option value=${v} ${e.k==v?'selected':''}>${t}</option>`).join('')}</select>${inp('ledger.'+i+'.a',e.a,'o')}${inp('ledger.'+i+'.n',e.n,'s')}${del('ledger',i)}</div>`).join('');
 $('gearp').innerHTML=`<div class=h>卡片</div><div class=tg>${(isS()?CARDS.filter(([k])=>SIMPLE_CARDS.includes(k)):CARDS).map(([k,l])=>`<label><input type=checkbox data-h="${k}" ${S.hide[k]?'':'checked'}>${l}</label>`).join('')}</div><div class=h style="margin-top:6px">圖表線</div><div class=tg>${(isS()?LINES.filter(([k])=>['l_af','l_ao','l_sl'].includes(k)):LINES).map(([k,l])=>`<label><input type=checkbox data-h="${k}" ${S.hide[k]?'':'checked'}>${l}</label>`).join('')}<label><input type=checkbox data-h="g_qt" ${S.hide.g_qt?'':'checked'}>季度刻度（3／6／9／12 月）</label>${isS()?'':`<label><input type=checkbox data-p="ptLast" data-t="b" ${S.ptLast?'checked':''}>實際結算：每月只顯示最後一次</label>`}</div><div class=h style="margin-top:6px">實際結算相關的卡片（Alpha、XIRR、被動／主動 vs 0050）在還沒有結算紀錄時會自動隱藏。B 線與 C 線只在「借貸淨效益」縱軸顯示；壓力情境線只在「🛡️ 風險」分頁顯示。</div>`;
 // 風險分頁
 if(!(S.scSel>=0&&S.scSel<S.scen.length))S.scSel=0;const si=S.scSel,sc=S.scen[si];
 $('pkw').innerHTML=fld(['pk0','口袋緩衝(萬)：帳戶以外可動用的緊急預備金'])+`<label class=ck style="align-self:end"><input type=checkbox data-p="pkAcc" data-t="b" ${S.pkAcc?'checked':''}>每月結餘（收入−固定支出−月付）累積進口袋緩衝</label>`;
 $('scEd').innerHTML=`<label style="margin-top:6px">情境名稱${inp('scen.'+si+'.n',sc.n,'s')}</label>`+SCF.map(([g,fs])=>`<div class=sub>${g}</div><div class=g>${fs.map(([k,l])=>`<label>${l}${inp('scen.'+si+'.'+k,sc[k])}</label>`).join('')}</div>`).join('')+`<div class=h id=scNote style="margin-top:4px"></div><div style="margin-top:6px"><button onclick="resetScen()">↺ 還原四個預設情境</button></div>`;
 $('rulesEd').innerHTML=S.rules.map((r,i)=>{const d=RULES[r.k]||[r.k,''];return`<div class=ru id="ru_${r.k}"><div class=hd><label class=ck><input type=checkbox data-p="rules.${i}.on" data-t="b" ${r.on?'checked':''}><b>${d[0]}</b></label><span id="rn_${r.k}"></span></div><div class="row r-ru" style="margin-top:4px"><span class=h>${d[1]}</span>${inp('rules.'+i+'.th',r.th)}</div>${r.k=='dip'?`<label>基準 ETF 近期高點(元)：自行填寫${inp('hi50',S.hi50,'o')}</label>`:''}${r.k=='rebuy'?`<div class=h>觸發 ②～④ 賣出後，${bmC(S)} 收盤站上這條均線就提醒買回。買回後按下面的按鈕，虧損上限從那天的狀態重新起算（回測 v5：2013～2019 每年起算的 7 年期，這樣做最差的一次和不設規則一樣）。</div><div style="margin-top:4px">${num(S.lossRef)?`<span class=h>${esc(S.lossRefD||'')} 已重新起算（當時信貸淨效益 ${W2(num(S.lossRef))} 萬）</span> <button class=lk onclick="lossRefSet(0)">取消重新起算</button>`:`<button class=lk onclick="lossRefSet(1)">已買回，重新起算</button>`}</div>`:''}<label>應對動作${inp('rules.'+i+'.a',r.a,'s')}</label><div class=h id="rs_${r.k}"></div></div>`}).join('');
 $('slIn').innerHTML=fld(['loss','虧損上限：貸款金額的(%)'])+fld(['lossZ','② 減碼試算：假設股市再跌(%)'])+`<label style="grid-column:span 2">停損時轉入的低風險標的（由你選擇）<select data-p="lossTo" data-t="s"><option value="" ${!S.lossTo?'selected':''}>請選擇</option>${S.etfs.map(e=>`<option value="${esc(e.n)}" ${String(S.lossTo)==String(e.n)?'selected':''}>${esc(e.n)}（被動清單）</option>`).join('')}<option value="__cash" ${S.lossTo=='__cash'?'selected':''}>帳戶現金</option></select></label>`;
 $('rbw').innerHTML=fld(['rb','再平衡：被動比例容許偏離(百分點)'])+fld(['du','逢低加碼時動用帳戶現金比例(%)']);
 applyUi();if(typeof stBuild=='function')stBuild();if(typeof asBuild=='function')asBuild();
 $('cvA').className=S.cv=='re'?'':'on';$('cvR').className=S.cv=='re'?'on':'';
}
const TK=[['buy','買進'],['sell','賣出'],['div','配息'],['sdiv','配股']];const trEd=new Set(),trGo={},hsOpen={};
const nameOf=c=>{c=String(c||'').trim().toUpperCase();return(S.names||{})[c]||STK[c]||''};
function trGroups(){const G={};(S.trades||[]).forEach((x,i)=>{const d=x.dt||'';(G[d]=G[d]||[]).push(i)});return Object.keys(G).sort((a,b)=>a==''?1:b==''?-1:(a>b?-1:1)).map(d=>({d,ix:G[d]}))}
function trRow(i){const x=S.trades[i],dv=x.k=='div',ed=trEd.has(i),nm=nameOf(x.n);
 return`<div class=tr><div class=trl><select class=w-ac data-p="trades.${i}.ac" data-t="s"><option value=p ${x.ac!='a'?'selected':''}>被動部位</option><option value=a ${x.ac=='a'?'selected':''}>主動部位</option></select><select class=w-k data-p="trades.${i}.k" data-t="s">${TK.map(([v,t])=>`<option value=${v} ${x.k==v?'selected':''}>${t}</option>`).join('')}</select>${inp('trades.'+i+'.n',x.n,'s','class=w-c placeholder="代號或名稱" autocomplete=off')}<span class=w-n id="tn${i}">${esc(nm)||(String(x.n||'').trim()?'<span class=h>（點 ✎ 自訂名稱）</span>':'')}</span>
  ${dv?inp('trades.'+i+'.dps',x.dps,'o','class=w-p placeholder="每股配息"')+inp('trades.'+i+'.q',x.q,'o','class=w-q data-tq="'+i+'" placeholder="股數"')+`${dIn('trades.'+i+'.pdt',x.pdt,'發放日','class=w-p style="width:120px"')}`:x.k=='sdiv'?inp('trades.'+i+'.q',x.q,'o','class=w-q placeholder="配股股數"'):inp('trades.'+i+'.q',x.q,'o','class=w-q placeholder="股數"')+inp('trades.'+i+'.px',x.px,'o','class=w-p placeholder="成交價"')}
  <span class=fe id="tf${i}" onclick="edTr(${i})" title="手續費、證交稅、日期、備註"></span>${typeof stChip=='function'?stChip(i):''}<button onclick="cpTr(${i})" title="複製一筆">⧉</button>${del('trades',i)}</div>
  <div class=sug id="ts${i}"></div>
  ${ed?`<div class=tre><label>${dv?'除息日':'日期'}${dIn('trades.'+i+'.dt',x.dt,dv?'除息日':'日期')}</label>${dv?`<label>配息金額(元，覆寫)${inp('trades.'+i+'.px',x.px,'o')}</label><label class=ck style="align-self:end"><input type=checkbox data-p="trades.${i}.out" data-t="b" ${+x.out?'checked':''}>匯到追蹤範圍以外（發放日算出金）</label>`:x.k=='sdiv'?'':`<label>手續費(元，留空自動)${inp('trades.'+i+'.fee',x.fee,'o','data-tf="'+i+'"')}</label>`}${x.k=='sell'?`<label>證交稅(元，留空自動)${inp('trades.'+i+'.tax',x.tax,'o','data-tt="'+i+'"')}</label>`:''}<label>備註${inp('trades.'+i+'.note',x.note,'s')}</label>${String(x.n||'').trim()?`<label>自訂名稱（優先於內建）<input data-nm="${esc(String(x.n).trim().toUpperCase())}" value="${esc((S.names||{})[String(x.n).trim().toUpperCase()]||'')}" placeholder="${esc(STK[String(x.n).trim().toUpperCase()]||'')}"></label>`:''}</div>`:''}
  ${ed&&typeof stTradeEd=='function'?stTradeEd(i):''}<div class=h id="tc${i}"></div><div class=h id="tq${i}"></div></div>`}
function renderTrades(){const G=trGroups(),lat=G.length?G[0].d:'';S.trG=S.trG||{};
 $('trd').innerHTML=G.map(g=>{const op=trGo[g.d]!=null?trGo[g.d]:(g.d==TODAY);return`<details class=tgd data-g="${g.d}" ${op?'open':''}><summary id="tgh_${g.d||'none'}"></summary>${g.ix.map(trRow).join('')}<div style="padding:4px 6px"><button onclick="addTr('${g.d||TODAY}')">＋這天再加一筆</button></div></details>`}).join('')||'<div class=h>尚無交易紀錄。</div>';
 $('trWrap').open=!!S.trOpen;if($('trNewD')&&!$('trNewD').value)$('trNewD').value=TODAY;lastHK=''}
window.tgMore=()=>{S.trMore=S.trMore?0:1;lastHK='';save();calc()};
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-sec]');if(!t)return;const ac=t.dataset.sec;hsOpen[ac]=hsOpen[ac]===false;lastHK='';calc()});
window.addTr=d=>{const n=NEW.trades();n.dt=d||TODAY;S.trades.push(n);trGo[n.dt]=1;S.trOpen=1;renderTrades();upd()};
window.cpTr=i=>{const c=clone(S.trades[i]);c.fee='';c.tax='';c.id=newTid();S.trades.splice(i+1,0,c);trEd.clear();renderTrades();upd()};
window.edTr=i=>{trEd.has(i)?trEd.delete(i):trEd.add(i);renderTrades();calc()};
window.pickSt=(i,c)=>{S.trades[i].n=c;const o=(S.trades||[]).find((y,j)=>j!=i&&String(y.n||'').trim().toUpperCase()==c&&y.ac);if(o)S.trades[i].ac=o.ac;renderTrades();upd()};
function trSug(i){const el=$('ts'+i);if(!el)return;const v=String(S.trades[i].n||'').trim(),V=v.toUpperCase();if(!v||STK[V]||(S.names||{})[V]){el.innerHTML='';return}
 const asc=/^[0-9A-Z]+$/.test(V),hits=[];for(const c in STK){if(asc?c.startsWith(V):STK[c].includes(v)){hits.push(c);if(hits.length>=8)break}}
 el.innerHTML=hits.map(c=>`<button onclick="pickSt(${i},'${c}')">${c} ${esc(STK[c])}</button>`).join('')}
let lastHK='';
const NEW={init:()=>({ac:'p',n:'',q:'',px:''}),sals:()=>({m:t2ym(S,12),v:salAt(S,12)}),livs:()=>({m:t2ym(S,12),v:livAt(S,12)}),rates:()=>({k:(Math.max(0,...S.rates.map(e=>+e.k||1))||0)+1,r:rateK(S,999)}),etfs:()=>({n:'新標的',w:0,p:5,y:3,c:1}),ledger:()=>{const d=S.cur.dt||TODAY;return{dt:d,m:d.slice(0,7),k:'in',a:'',n:''}},trades:()=>{const l=(S.trades||[]).filter(x=>x.dt).sort((a,b)=>a.dt>b.dt?1:-1).pop();return{id:newTid(),dt:TODAY,ac:l?l.ac:'p',k:'buy',n:'',q:'',px:'',fee:'',tax:'',out:0,note:'',thesisId:''}},hold:()=>({n:'',k:'p',q:'',c:'',x:''})};
const LBL={sals:'收入',livs:'固定支出',rates:'利率',etfs:'ETF',ledger:'出入金',trades:'交易',init:'期初持股',hold:'持股',snaps:'結算紀錄'};
window.addRow=l=>{S[l].push(NEW[l]());build();upd()};
window.delRow=(l,i)=>{if(l=='trades')trEd.clear();if(l=='rates'&&S.rates.length<=1){toast('至少要保留一列利率',0);return}trash={l,i,item:S[l][i]};S[l].splice(i,1);build();upd();toast('已刪除一筆'+(LBL[l]||''),1)};
window.undo=()=>{if(!trash)return;S[trash.l].splice(trash.i,0,trash.item);trash=null;$('toast').style.display='none';build();upd()};
function toast(t,u){$('toastT').innerText=t;$('toast').querySelector('button').style.display=u?'':'none';$('toast').style.display='flex';clearTimeout(ttm);ttm=setTimeout(()=>{$('toast').style.display='none';trash=null},8000)}
window.setCv=v=>{S.cv=v;build();upd()};
function simpleCtl(){const one=a=>a&&a.length==1;
 const rateF=one(S.rates)?`<label>年利率(%)${inp('rates.0.r',S.rates[0].r)}</label>`:`<div class=gs onclick="goPro()">多段利率：${S.rates.slice().sort((a,b)=>a.k-b.k).map(e=>'第 '+e.k+' 期起 '+e.r+'%').join('、')}<br>（點此到專業版編輯）</div>`;
 const tlF=(l,lb)=>one(S[l])?`<label>${lb}${inp(l+'.0.v',S[l][0].v)}</label>`:`<div class=gs onclick="goPro()">${lb}：有 ${S[l].length} 筆時間軸，目前 ${R(tl(S,S[l],todayT(H_(S))).v)} 元<br>（點此到專業版編輯）</div>`;
 return`<details open><summary>① 貸款</summary><div class=g>${fld(['L','貸款金額(萬)'])}${fld(['Y','年期(年)'])}${rateF}<label>撥款日期<input type=date data-p="dd" data-t="s" value="${S.dd||''}"></label>${fld(['fee','開辦費(元)'])}</div><label class=ck style="margin-top:6px"><input type=checkbox data-p="feeDed" data-t="b" ${S.feeDed?'checked':''}>開辦費從撥款金額直接扣除（取消＝用口袋另付）</label><div class=h id=payday></div></details>`+
 `<details open><summary>② 投入（萬元）</summary><div class=g3><label>被動<input type=number step=any data-sa="Wp" value="${esc(S.Wp)}"></label><label>主動<input type=number step=any data-sa="Wa" value="${esc(S.Wa)}"></label><label>保留現金（自動）<input type=number data-a="Wc" value="${esc(S.Wc)}" disabled></label></div><div class=h id=ahint style="margin-top:4px"></div>
  <div class=g style="margin-top:6px">${fld(['K','分批幾個月投入（含撥款月）'])}${fld(['Ra','主動預期年報酬(%，含息)'])}</div>
  <div class=sub>被動 ETF（含息年報酬＝股價漲幅＋配息）</div><div class="row r-etf3 h"><span>名稱</span><span>比例%</span><span>含息年報酬%</span><span></span></div>${S.etfs.map((e,i)=>`<div class="row r-etf3">${inp('etfs.'+i+'.n',e.n,'s')}${inp('etfs.'+i+'.w',e.w)}<input type=number step=any data-et="${i}" value="${rr((+e.p||0)+(+e.y||0))}">${del('etfs',i)}</div>`).join('')}<button onclick="addRow('etfs')">＋新增 ETF</button> <span id=wsum class=h></span></details>`+
 `<details open><summary>③ 每月與風險</summary><div class=g>${tlF('sals','每月收入(元)')}${tlF('livs','每月固定支出(元)')}${fld(['loss','虧損上限：貸款金額的(%)'])}${fld(['br','不借錢、每月定期定額的預期年報酬(%)'])}</div><div class=h id=lossH></div><div class=h style="margin-top:4px">收入與固定支出只用來檢查每月付不付得起信貸。</div></details>`}
function sRebal(){const av=deposit(S)/1e4;let ex=(+S.Wp||0)+(+S.Wa||0)-av;if(ex>0){const r=Math.min(ex,+S.Wa||0);S.Wa=rr((+S.Wa||0)-r);ex-=r;if(ex>0)S.Wp=rr(Math.max(0,(+S.Wp||0)-ex))}S.Wc=rr(Math.max(0,av-(+S.Wp||0)-(+S.Wa||0)))}
function applyUi(){if(typeof stApplyWs=='function')stApplyWs();document.body.classList.toggle('simple',isS());$('uiS').className=isS()?'on':'';$('uiP').className=isS()?'':'on';document.querySelectorAll('#rngS button').forEach(b=>b.className=(S.rng||'all')==b.dataset.r?'on':'');applyPin()}
window.setUi=m=>{if(S.ui==m)return;S.ui=m;hi=null;if(m=='simple'){curT='F'}build();if(m=='simple')tab('F');else tab(ls('lct2')||'S');save()};
window.pickUi=m=>{$('chz').style.display='none';S.ui=m;hi=null;build();tab(m=='simple'?'F':(ls('lct2')||'S'));save();if(m=='pro'&&ls('lcg')!='1')showGd()};
window.goPro=()=>{setUi('pro');tab('F');setTimeout(()=>$('ctl').scrollIntoView({behavior:'smooth',block:'start'}),60)};
window.setRng=r=>{S.rng=r;hi=null;applyUi();save();draw()};
window.clrHi=()=>{hi=null;draw()};
function applyPin(){$('chp').classList.toggle('pin',!!S.pin);$('pinB').className=S.pin?'on':''}
window.tgPin=()=>{S.pin=S.pin?0:1;applyPin();save();draw()};
window.selSc=i=>{S.scSel=i;build();upd()};
window.resetScen=()=>{if(confirm('把四個情境的參數還原成預設值？')){S.scen=clone(DEF.scen);S.scSel=Math.min(S.scSel,S.scen.length-1);build();upd()}};
// 應對規則：以一串已結算結果（依時間排序，最後一筆為「目前」）判斷
function ruleNow(list,s,emM,lev,aprE,tNow,afNow){const init=(S.sv0+S.sc0)*1e4,r=list[list.length-1],o={};
 for(const R_ of S.rules){const th=+R_.th||0;let v=null,hit=null;
  if(/^loss/.test(R_.k)){const B=lossB(S);if(!(B>0))v='未設定虧損上限';else if(afNow!=null){const u=Math.max(0,-lossAf(afNow))/B*100;v='已用 '+u.toFixed(0)+'%（虧 '+W(Math.max(0,-afNow))+' 萬）';hit=u>=th}}
  else if(R_.k=='dd'){if(r){const pk=Math.max(init+deposit(S),...list.map(x=>x.scope)),d=pk>0?Math.max(0,(1-r.scope/pk)*100):0;v='回落 '+d.toFixed(1)+'%';hit=d>=th}}
  else if(R_.k=='cash'){v=isFinite(emM)?emM.toFixed(1)+' 個月':'—';hit=emM<th}
  else if(R_.k=='lev'){v=lev.toFixed(1)+'%';hit=lev>th}
  else if(R_.k=='cneg'){if(r){let n=0;for(let i=list.length-1;i>=0&&list[i].ao<0;i--)n++;v='連續 '+n+' 次';hit=n>=th}}
  else if(R_.k=='xirr'){if(r){let n=0;for(let i=list.length-1;i>=0&&!isNaN(list[i].x)&&list[i].x<aprE;i--)n++;v='連續 '+n+' 次';hit=n>=th}}
  else if(R_.k=='dip'){const x=num(s&&s.x50),hh=num(S.hi50)??num(s&&s.hi50);if(x!=null&&hh){const d=(1-x/hh)*100;v='回落 '+d.toFixed(1)+'%';hit=d>=th}else v='需填 '+bmC(S)+' 現價與近期高點'}
  else if(R_.k=='rebuy'){const m=typeof CK!='undefined'&&CK&&typeof ckM0=='function'?ckM0(bmC(S)):null,n=th||120,ma=m?(n<=20?m.m20:n<=60?m.m60:m.m120):null;
   const sold=S.rules.some(x=>/^loss[234]$/.test(x.k)&&x.on&&lossB(S)>0&&afNow!=null&&Math.max(0,-lossAf(afNow))/lossB(S)*100>=+x.th);
   if(!m||ma==null)v='讀取 '+bmC(S)+' 均線中';else{const up=m.c>ma;v=`${bmC(S)} 收盤 ${m.c}，${n<=20?'月線':n<=60?'季線':'半年線'} ${ma}（${up?'站上':'在下方'}）`+(num(S.lossRef)?`｜${S.lossRefD||''} 已重新起算`:'');hit=up&&sold}}
  else if(R_.k=='rate'){const rt=rateK(S,Math.max(1,tNow));v=rt.toFixed(2)+'%';hit=rt>=th}
  o[R_.k]={v,hit:R_.on?hit:null,on:R_.on}}
 return o}
// 買回後虧損上限重新起算：lossRef＝買回當時的信貸淨效益（元），之後的虧損從這裡算
const lossAf=af=>af-(num(S.lossRef)||0);
function slCalc(af,act,pas){af=lossAf(af);const B=lossB(S),Z=Math.max(1,+S.lossZ||20),used=B>0?Math.max(0,-af)/B*100:0,rb=B+af,risky=Math.max(0,act)+Math.max(0,pas),x=Math.max(0,risky-Math.max(0,rb)/(Z/100)),sa=Math.min(x,Math.max(0,act));return{B,Z,used,rb,risky,Y:risky>0?Math.max(0,rb)/risky*100:null,x,sa,sp:x-sa,af,act:Math.max(0,act),pas:Math.max(0,pas)}}
// 信貸資金部位：帳戶股票 × 信貸占比；持股明細模式下，你選的轉入標的視為低風險、不計入
const slSplit=(r)=>{const q=r.scope>0?Math.max(0,(r.scope-r.nle)/r.scope):0;let tv=0;if(S.lossTo&&S.lossTo!='__cash'){const c=String(S.lossTo).trim().toUpperCase();holdings(S).forEach(o=>{if(o.ac=='p'&&o.n.toUpperCase()==c&&o.q>0){const px=num((S.px||{})[c]);tv+=px!=null?o.q*px:o.cost}})}return{act:r.a*1e4*q,pas:Math.max(0,r.p*1e4*q-tv)}};
window.lossRefSet=on=>{if(on){const r=settle(S,curEff());if(!r){alert('要先在結算填現金');return}if(!confirm('用今天的狀態重新起算虧損上限？之後的虧損從現在開始算。'))return;S.lossRef=Math.round(r.af);S.lossRefD=TODAY}else{S.lossRef='';S.lossRefD=''}save();build();upd()};
// 設定的每一段記住打開或收合
const dOpen=(k,d)=>{const v=ls('lcd_'+k);return`${(v==null?d:v=='1')?'open':''} ontoggle="ls('lcd_${k}',this.open?'1':'0')"`};
window.yrTog=y=>{ls('lcyr',ls('lcyr')==String(y)?'':String(y));calc()};
const tgName=()=>S.lossTo=='__cash'?'帳戶現金':(S.lossTo||'（尚未選擇轉入標的）');
function slAct(k,sl){if(k=='loss2')return`依規則：信貸資金的主動部位約 ${W2(sl.act)} 萬，賣出一半約 ${W2(sl.act/2)} 萬轉入 ${tgName()}`;if(k=='loss3')return`依規則：信貸資金的主動部位約 ${W2(sl.act)} 萬全部轉入 ${tgName()}；被動先不動`;if(k=='loss4')return`依規則：信貸資金的被動部位約 ${W2(sl.pas)} 萬也轉入 ${tgName()}`;if(k=='rebuy')return'買回後按「🛡️ 風險 → 買回時機」的「已買回，重新起算」';return''}
// 虧損上限 ①②③ 同時觸發時只保留最高的一段
const topLoss=a=>{const l=a.filter(x=>/^loss/.test(x.k)),mx=l.length?l[l.length-1].k:null;return a.filter(x=>(!/^loss/.test(x.k)||x.k==mx)&&!(mx&&x.k=='dip'))};
// 空白日期顯示提示文字，點了才變成日期選擇
const dIn=(p,v,ph,x='')=>`<input type="${v?'date':'text'}" data-p="${p}" data-t="s" value="${v||''}" placeholder="${ph}" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'" ${x}>`;
window.setInitMode=m=>{if(S.initMode==m)return;if(S.initMode!='none'&&m=='none')S._bk0={sv0p:S.sv0p,sv0a:S.sv0a,sc0:S.sc0};else if(S.initMode=='none'&&S._bk0){S.sv0p=S._bk0.sv0p;S.sv0a=S._bk0.sv0a;S.sc0=S._bk0.sc0}S.initMode=m;norm(S);build();upd()};
// 未滿 6 個月：年化會被放大，改顯示期間報酬
function xirrT(r){const days=r?(Date.parse(r.dt||TODAY)-Date.parse(S.dd))/864e5:0;if(!r||isNaN(r.x))return{l:days<182.6?'期間報酬（未年化）':'年化報酬（XIRR）',v:'—',ann:false,days};if(days<182.6){const pr=(Math.pow(1+r.x/100,Math.max(1,days)/365)-1)*100;return{l:'期間報酬（未年化）',v:P1(pr),ann:false,days}}return{l:'年化報酬（XIRR）',v:fx(r.x)+'%',ann:true,days}}
const pill=q=>!q.on?'<span class="pill n">已關閉</span>':q.hit==null?`<span class="pill n">${q.v||'需結算後判斷'}</span>`:q.hit?`<span class="pill y">⚠️ 觸發｜${q.v}</span>`:`<span class="pill g">✅ ${q.v}</span>`;
window.tgGear=()=>{const g=$('gearp');g.style.display=g.style.display=='block'?'none':'block'};
window.tgLk=k=>{if(S.lk[k])delete S.lk[k];else S.lk[k]=1;rebal();build();upd()};
function editAlloc(k,v){const keys=AK.map(a=>a[0]),av=deposit(S)/1e4,oth=keys.filter(x=>x!=k),unl=oth.filter(x=>!S.lk[x]);
 if(!unl.length){S[k]=rr(Math.max(0,v));return false}
 const lockSum=oth.filter(x=>S.lk[x]).reduce((a,x)=>a+(+S[x]||0),0),cl=Math.max(0,Math.min(v,av-lockSum));let left=av-lockSum-cl;
 const ord=unl.slice().sort((x,y)=>lastE.indexOf(y)-lastE.indexOf(x));
 ord.forEach((x,i)=>{const nv=i==ord.length-1?left:Math.min(+S[x]||0,left);S[x]=rr(Math.max(0,nv));left-=nv});
 S[k]=rr(cl);lastE=lastE.filter(x=>x!=k);lastE.push(k);return cl!==v}
function rebal(){const keys=AK.map(a=>a[0]),av=deposit(S)/1e4,sum=keys.reduce((a,x)=>a+(+S[x]||0),0);if(Math.abs(sum-av)<1e-6)return;
 const unl=keys.filter(x=>!S.lk[x]);if(!unl.length)return;const ab=unl.reduce((b,x)=>lastE.indexOf(x)<lastE.indexOf(b)?x:b);const v=av-(sum-(+S[ab]||0));if(v>=0)S[ab]=rr(v)}
function syncAlloc(){document.querySelectorAll('[data-a],[data-sa]').forEach(el=>{if(el!==document.activeElement)el.value=S[el.dataset.a||el.dataset.sa]})}
function setP(p,v){const a=p.split('.');let o=S;for(let i=0;i<a.length-1;i++)o=o[a[i]];o[a[a.length-1]]=v}
function onIn(e){const d=e.target.dataset,el=e.target;
 if(d.h){if(el.checked)delete S.hide[d.h];else S.hide[d.h]=1;upd();return}
 if(d.nm!==undefined){S.names=S.names||{};const v=el.value.trim();if(v)S.names[d.nm]=v;else delete S.names[d.nm];upd();return}
 if(d.px!==undefined){S.px=S.px||{};S.pxd=S.pxd||{};const v=num(el.value);if(v==null){delete S.px[d.px];delete S.pxd[d.px]}else{S.px[d.px]=v;S.pxd[d.px]=sDate(S.cur)||TODAY}upd();return}
 if(d.sa){if(el.value==='')return;const k=d.sa,o=k=='Wp'?'Wa':'Wp',av=deposit(S)/1e4;let v=Math.min(av,Math.max(0,+el.value));if(v!=+el.value)el.value=rr(v);if(v>av-(+S[o]||0))S[o]=rr(Math.max(0,av-v));S[k]=rr(v);S.Wc=rr(Math.max(0,av-(+S.Wp||0)-(+S.Wa||0)));syncAlloc();upd();return}
 if(d.et!==undefined){if(el.value==='')return;const e=S.etfs[+d.et];if(e)e.p=rr(+el.value-(+e.y||0));upd();return}
 if(d.a){if(el.value==='')return;const cl=editAlloc(d.a,+el.value);syncAlloc();if(cl)el.value=S[d.a];upd();return}
 if(!d.p)return;let v;
 if(d.t=='b')v=el.checked?1:0;else if(d.t=='s')v=el.value;else if(d.t=='o')v=el.value===''?'':+el.value;else{if(el.value==='')return;v=+el.value}
 setP(d.p,v);if(d.p=='dd'&&!v)return;norm(S);if(typeof stOnIn=='function')stOnIn(d.p,v);
 if(d.p=='cur.dt'){S.cur.m=String(v).slice(0,7);S.cur.dtFix=1}if(d.p=='cur.ca'||d.p=='cur.cp')cashSync();{const mm=/^ledger\.(\d+)\.dt$/.exec(d.p);if(mm)S.ledger[+mm[1]].m=String(v).slice(0,7)}
 if(/^trades\.\d+\.(k|dt)$/.test(d.p)){renderTrades()}
 {const mm=/^init\.(\d+)\.n$/.exec(d.p);if(mm){const e=$('inN'+mm[1]);if(e)e.innerText=nameOf(v)}}
 if(d.p=='bm'){const e=$('bmN');if(e)e.innerText=nameOf(v)}
 {const mm=/^trades\.(\d+)\.n$/.exec(d.p);if(mm){const i=+mm[1],c=String(v).trim().toUpperCase(),o=(S.trades||[]).find((y,j)=>j!=i&&String(y.n||'').trim().toUpperCase()==c&&y.ac);if(o&&S.trades[i].ac!=o.ac){S.trades[i].ac=o.ac;const s=document.querySelector('[data-p="trades.'+i+'.ac"]');if(s)s.value=o.ac}
  const tn=$('tn'+i);if(tn){const nm=nameOf(c);tn.innerHTML=esc(nm)||(c?'<span class=h>（點 ✎ 自訂名稱）</span>':'')}trSug(i)}}
 if(['L','fee','feeDed'].includes(d.p)){isS()?sRebal():rebal();syncAlloc()}
 upd()}
document.addEventListener('input',onIn);document.addEventListener('change',e=>{if(e.target.type=='checkbox'||e.target.tagName=='SELECT')onIn(e)});
document.addEventListener('toggle',e=>{if(e.target.id=='erd'){S.er=S.er||{};S.er.open=e.target.open?1:0;save()}else if(e.target.id=='trWrap'){S.trOpen=e.target.open?1:0;save()}else if(e.target.dataset&&e.target.dataset.g!==undefined&&e.target.classList.contains('tgd')){trGo[e.target.dataset.g]=e.target.open?1:0}},true);
document.addEventListener('click',e=>{const s=e.target.closest&&e.target.closest('[data-lg]');if(!s)return;const k=s.dataset.lg;if(S.hide[k])delete S.hide[k];else S.hide[k]=1;document.querySelectorAll('[data-h="'+k+'"]').forEach(c=>c.checked=!S.hide[k]);upd()});
document.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.i;if(!k)return;info.has(k)?info.delete(k):info.add(k);calc()});
let tmr;function upd(){save();clearTimeout(tmr);tmr=setTimeout(calc,60)}
const hasSettle=()=>(S.snaps||[]).some(s=>settle(S,s));
function autoPlan(){if(!hasSettle()||!S.plan||!S.plan.af||!S.plan.re){const r=project(S,planInit(S));S.plan={d:(S.plan&&S.plan.d&&hasSettle())?S.plan.d:new Date().toISOString().slice(0,10),af:r.map(x=>Math.round(x.af)),re:r.map(x=>Math.round(x.real))};save()}}
window.resetPlan=()=>{if(confirm('以目前設定覆蓋「原始計畫」線？')){S.plan=null;autoPlan();calc()}};
const cd=(k,t,v,c)=>`<div class=c><small>${t}${k&&INFO[k]?`<span class=ib data-i="${k}">ⓘ</span>`:''}</small><b class="${c||''}">${v}</b>${info.has(k)?`<div class=ix>${INFO[k]}</div>`:''}</div>`;
const sg=v=>(v>=0?'+':'')+W2(v);
// 結算日沒有固定時，自動跟著今天（2026-11-10）；手動改日期或載入舊結算時固定
function curAuto(){if(S.cur&&!S.cur.dtFix&&S.cur.dt!==TODAY){S.cur.dt=TODAY;S.cur.m=TODAY.slice(0,7)}}
window.curToday=()=>{S.cur.dtFix=0;curAuto();build();upd()};
// 現金是在結算日之前填的：用填的那天的餘額，加減之後的買賣、配息推算到結算日（換算回「交割帳戶餘額」，結算時再處理未交割）
function curCash(c,dt){const L=typeof cashLast=='function'?cashLast(S):null;if(!L||L.src!='cur'||!(L.d<dt))return;const A=cashAt(S,dt);if(!A)return;const pa=pendAt(S,dt),v=+((A.t-pa.adj)/1e4).toFixed(4);
 if(Math.abs(v-L.t)<0.0001)return;c.c=v;c._cashEst={from:L.d,raw:L.t}}
function curEff(){const c=Object.assign({},S.cur);curCash(c,sDate(c)||TODAY);if(!usePx(S))return c;const dt=sDate(c)||TODAY,px=S.px||{},mv=marketVals(S,px,dt),nl=nleAt(S,px,dt),miss=[...new Set(mv.miss.concat(nl.miss))];
 c._mv=mv;c._miss=miss;if(miss.length){if(num(c.p)==null||num(c.a)==null){c.p='';c.a=''}return c}
 if(num(c.p)==null)c.p=+(mv.p/1e4).toFixed(4);if(num(c.a)==null)c.a=+(mv.a/1e4).toFixed(4);c.nleS=+(nl.v/1e4).toFixed(4);c.pxs=Object.assign({},px);if(num(c.x50)==null&&num(px[bmC(S)])!=null)c.x50=px[bmC(S)];return c}
function sortedSnaps(){return(S.snaps||[]).map((s,i)=>({s,i})).filter(o=>sDate(o.s)).sort((a,b)=>sDate(a.s)>sDate(b.s)?1:sDate(a.s)<sDate(b.s)?-1:a.i-b.i)}
function calc(){
 norm(S);curAuto();autoPlan();
 const w=[],ws=S.etfs.reduce((a,e)=>a+(+e.w),0);if($('initSum'))$('initSum').innerText='被動 '+(+S.sv0p).toFixed(2)+' 萬｜主動 '+(+S.sv0a).toFixed(2)+' 萬｜合計 '+(+S.sv0).toFixed(2)+' 萬（股數 × 撥款日收盤價）';if($('wsum'))$('wsum').innerText='比例合計 '+ws+'%';
 if(Math.abs(ws-100)>.01)w.push('ETF 比例合計不是 100%（目前 '+ws+'%，計算時等比例換算）');
 const av=deposit(S)/1e4,asum=(+S.Wc||0)+(+S.Wp||0)+(+S.Wa||0),aok=Math.abs(asum-av)<0.005;
 if($('ahint')){$('ahint').className=aok?'h':'h bad';$('ahint').innerHTML=`保留現金 ${(+S.Wc).toFixed(2)} ＋ 被動 ${(+S.Wp).toFixed(2)} ＋ 主動 ${(+S.Wa).toFixed(2)} ＝ ${asum.toFixed(2)} 萬（可投入 ${av.toFixed(2)}）${aok?'✓':'✗ 不相符，請解鎖或調整'}`}
 if(!aok)w.push('資金配置合計 '+asum.toFixed(2)+' 萬，不等於可投入 '+av.toFixed(2)+' 萬');
 const dd=D(S);if($('payday'))$('payday').innerText='信貸每月 '+dd.d+' 日扣款（撥款次月起，第 1 期 '+t2ym(S,1)+'；'+'結算時依結算日期判斷當期是否已扣款）'+(S.feeDed?'；實際撥入 '+av.toFixed(2)+' 萬':'');
 if(S.early&&S.E>0&&S.E<=S.lock)w.push('提前清償落在綁約期內，會計入違約金 '+S.pen+'%');
 const fc=forecast(S),rec=fc.rec,H=rec.length-1,end=rec[H],cf=cashflow(S),L=latest(S),K=Math.max(1,S.K|0);
 let mn=null;for(let t=Math.max(fc.from,fc.from?0:K);t<=H;t++)if(!mn||rec[t].real<mn.real)mn=rec[t];
 const init=(S.sv0+S.sc0)*1e4;if(mn&&mn.real<init)w.push('預測最低真實淨資產 '+W(mn.real)+' 萬，低於撥款前 '+W(init)+' 萬（'+t2ym(S,mn.t)+'）');
 let wf=null,wx=null;for(let t=1;t<=S.Y*12;t++){const b=cf[t].base;if(!wf||b<wf.base-1)wf=cf[t];if(!wx||b>wx.base)wx=cf[t]}
 const f1=cf[1]||cf[0],same=wf&&wx&&wx.base-wf.base<1;
 if(wf&&wf.base<0)w.push('有月份現金流為負：最低 '+R(wf.base)+' 元（'+t2ym(S,wf.t)+'）');
 $('warn').innerHTML=w.join('<br>');
 const apr=aprLoan(S),aprE=(Math.pow(1+apr/1200,12)-1)*100,bT=breakevenT(S,'ao'),bA=breakevenT(S,'af'),asm=blend(S),hd=effHide();
 // 風險：底線跌幅與槓桿
 let scopeNow,remNow;
 if(L){scopeNow=L.r.scope;remNow=L.r.rem}else{const q=rec[Math.min(H,K)];scopeNow=q.X+q.nl;remNow=q.rem}
 const lev=scopeNow>0?remNow/scopeNow*100:0;
 // 虧損上限：目前狀態（有結算用最新結算，否則用試算的本月）
 let sAf,sAct,sPas,sT,sSrc;
 if(L){const sp=slSplit(L.r);sAf=L.r.af;sAct=sp.act;sPas=sp.pas;sT=L.r.ts;sSrc='最新結算 '+L.s.m}
 else{const t0_=ym2t(S,TODAY.slice(0,7)),t=Math.max(0,Math.min(H,isNaN(t0_)?0:t0_)),q=rec[t];sAf=q.af;sAct=q.va;sPas=q.stk-q.va-q.vt;sT=t;sSrc='試算 '+t2ym(S,t)}
 const SL=slCalc(sAf,sAct,sPas),B=SL.B;let minA=null;for(let t=fc.from;t<=H;t++)if(!minA||rec[t].af<minA.af)minA=rec[t];
 const tE=L?L.r.ts:1,cfE=cf[Math.max(1,Math.min(H,tE))]||f1,em=L?(L.r.p+L.r.c)*1e4:((+S.Wp||0)+(+S.Wc||0)+(+S.sv0p||0)+S.sc0)*1e4,need=cfE.lv+cfE.lp,emM=need>0?em/need:Infinity;
 // 績效拆解
 const ss=sortedSnaps(),tw=twr(S,ss.map(o=>o.s)),lastTw=tw.length?tw[tw.length-1]:null;
 const ec=earlyCmp(S);
 const C={};
 if(L){const r=L.r;C.alpha=cd('alpha','實際績效（'+sDate(L.s).slice(5).replace('-','/')+' 結算）',sg(r.af)+'｜'+sg(r.af-r.ao)+'｜'+sg(r.ao)+' 萬<br><small>A 面額｜B 定投收益｜C＝A−B 機會成本<br>'+(()=>{const t=xirrT(r);return t.l+' '+t.v+(t.ann?' vs 信貸成本 '+aprE.toFixed(2)+'%':'（滿 6 個月後顯示年化）')})()+'</small>',r.ao<0?'bad':'ok');
  if(lastTw){const s5=r.sbOk?r.sb:null;C.perf=cd('perf','被動／主動 vs '+bmC(S)+'（撥款以來）',P1(lastTw.rp)+' / '+P1(lastTw.ra)+' / '+(s5!=null?P1(s5):'—')+(s5!=null?`<br><small>超額：被動 ${P1(lastTw.rp-s5)}｜主動 ${P1(lastTw.ra-s5)}</small>`:'<br><small>請填 0050 還原價或報酬</small>'))}}
 if((S.trades||[]).some(x=>x.dt&&x.k!='div')){const nb=netBuy(S,null,'9999-12-31'),pp=+S.Wp||0,pa=+S.Wa||0,pc=v=>v>0?' ('+(v*100).toFixed(0)+'%)':'',lt=(S.trades||[]).map(x=>x.dt||'').sort().pop();
  C.dep=cd('dep','建倉進度（交易紀錄）','被動 '+nb.p.toFixed(1)+'／'+pp.toFixed(0)+' 萬'+pc(pp?nb.p/pp:0)+'<br>主動 '+nb.a.toFixed(1)+'／'+pa.toFixed(0)+' 萬'+pc(pa?nb.a/pa:0)+'<br><small>合計 '+((pp+pa)?((nb.p+nb.a)/(pp+pa)*100).toFixed(0):'—')+'%｜最近一筆 '+lt+'</small>')}
 C.fc=cd('fc','預測期末淨效益（'+t2ym(S,H)+'）',W(end.af)+'｜'+W(end.af-end.ao)+'｜'+W(end.ao)+' 萬<br><small>A 面額｜B 定投收益｜C＝A−B 機會成本</small>',end.ao<0?'bad':'ok');
 {const mg=asm-bT,v_=[0,bA,bT,asm],lo=Math.min(...v_),hi=Math.max(...v_)*1.12+0.5,ps=v=>Math.max(2,Math.min(98,(v-lo)/(hi-lo)*100)),tx=p=>p<30?'0':p>70?'-100%':'-50%',gc=mg>=0?'#16a34a':'#dc2626';
  const pA=ps(bA),pT=ps(bT),pS=ps(asm),near=Math.abs(pT-pA)<24;
  const gauge=`<div class=gg><div class=gl></div><span class=gm style="left:${pA}%;background:#94a3b8"></span><span class=gm style="left:${pT}%;background:#7c3aed"></span><span class="gm ga" style="left:${pS}%;border-bottom-color:${gc}"></span><span class=gt style="left:${pS}%;top:-16px;transform:translateX(${tx(pS)});color:${gc}">你的假設 ${asm.toFixed(1)}%</span><span class=gt style="left:${pA}%;top:19px;transform:translateX(${tx(pA)})">不投資線 ${bA.toFixed(1)}%</span><span class=gt style="left:${pT}%;top:34px;transform:translateX(${tx(pT)});color:#7c3aed">定期定額線 ${bT.toFixed(1)}%</span></div>`;
  C.be=cd('be','划算門檻（每年含息報酬）','至少 '+bT.toFixed(1)+'%'+gauge+'<small style="display:block;text-align:left;font-weight:400;line-height:1.5">你的投資每年至少要賺 '+bT.toFixed(1)+'%（含配息），借錢才比「不借錢、每月定期定額」划算。你目前假設 '+asm.toFixed(1)+'%，'+(mg>=0?'安全空間 '+mg.toFixed(1)+' 個百分點。':'低於門檻 '+(-mg).toFixed(1)+' 個百分點，借錢不如定期定額。')+'</small>',mg>=2?'ok':mg>=0?'wn':'bad')}
 C.early=cd('early','提前清償比較（第 '+ec.te+' 期，'+t2ym(S,ec.te)+'）',ec.na?'不適用':(ec.diff>=0?'持有多 '+W2(ec.diff)+' 萬':'提前還多 '+W2(-ec.diff)+' 萬')+(ec.na?'':`<br><small>價格報酬低於 ${ec.th==null?'—':ec.th.toFixed(2)+'%'} 時提前還較划算</small>`),ec.na?'':(ec.diff>=0?'ok':'wn'));
 C.cf=cd('cf','月現金流（首期 '+t2ym(S,f1.t)+' / 最低）',same?R(f1.base)+' 元<br><small>每月相同</small>':R(f1.base)+' / '+R(wf.base)+' 元<br><small>最低在 '+t2ym(S,wf.t)+'</small>',wf&&wf.base<0?'bad':'ok');
 C.mn=cd('mn','預測最低真實淨資產',mn?W(mn.real)+' 萬 ('+t2ym(S,mn.t)+')':'—',mn&&mn.real<init?'bad':'ok');
 {const l1=rule(S,'loss1'),l3=rule(S,'loss3');C.risk=cd('risk','距離停損線（'+sSrc+'）',B>0?(SL.rb<=0?'已超過虧損上限':'剩 '+W(SL.rb)+' 萬'+(SL.Y!=null?'（≈再跌 '+SL.Y.toFixed(1)+'%）':''))+'<br><small>已用 '+SL.used.toFixed(0)+'%｜上限 '+W(B)+' 萬'+(SL.Y==null?'｜尚未投入股市':'')+'</small>':'未設定虧損上限',!(B>0)?'':(l3.on&&SL.used>=l3.th)||SL.rb<=0?'bad':(l1.on&&SL.used>=l1.th?'wn':'ok'))}
  const cR=rule(S,'cash');C.lev=cd('lev','槓桿與安全存量'+(L?'':'（計畫）'),lev.toFixed(1)+'%｜'+(isFinite(emM)?emM.toFixed(1):'—')+' 個月<br><small>信貸餘額÷帳戶總值｜現金＋被動可撐月數'+(cR.on?'（門檻 '+cR.th+' 個月）':'')+'</small>',cR.on&&emM<cR.th?'bad':'');
 const setL=ss.map(o=>settle(S,o.s)).filter(Boolean),tNow=L?L.r.ts:Math.max(1,ym2t(S,TODAY.slice(0,7))),RN=ruleNow(setL,L?L.s:S.cur,emM,lev,aprE,tNow,sAf);
 $('cards').innerHTML=CARDS.filter(([k])=>k!='health'&&(!isS()||SIMPLE_CARDS.includes(k))).map(([k])=>(!hd[k]&&C[k])||'').join('');{const cs=$('cards').children;if(cs.length%2)cs[cs.length-1].style.gridColumn='span 2'}
 // 健康燈號
 const red=[],yel=[];
 if(wf&&wf.base<0)red.push('有月份現金流為負');{const l3=rule(S,'loss3');if(B>0&&((l3.on&&SL.used>=l3.th)||SL.rb<=0))red.push('虧損已達上限');else if(B>0&&minA&&minA.af<=-B)red.push('預測會超過虧損上限（'+t2ym(S,minA.t)+'）')}if(RN.cash.hit)red.push('安全存量低於 '+cR.th+' 個月');
 if(L&&L.r.af<0)yel.push('Alpha 為負');if(L&&!isNaN(L.r.x)&&xirrT(L.r).ann&&L.r.x<aprE)yel.push('XIRR 低於信貸成本');if(!aok)yel.push('資金配置合計不符');{const o=topLoss(S.rules.filter(x=>x.on&&x.k!='cash'&&RN[x.k]&&RN[x.k].hit)).filter(x=>!(x.k=='loss3'&&red.includes('虧損已達上限'))).map(x=>RULES[x.k][0]);if(o.length)yel.push('應對規則觸發：'+o.join('、'))}
 S.rules.forEach(x=>{const el=$('rn_'+x.k);if(el)el.innerHTML=pill(RN[x.k]);const b=$('ru_'+x.k);if(b)b.className='ru'+(x.on?'':' off')});
 $('health').innerHTML=hd.health?'':(red.length?`<div class="hl r">🔴 需處理<small>${red.concat(yel).join('、')}</small></div>`:yel.length?`<div class="hl y">🟡 需留意<small>${yel.join('、')}</small></div>`:`<div class="hl g">🟢 狀態良好</div>`);
 // 持股明細
 // 交易紀錄：每列金額、群組標題、持股表
 {const T=S.trades||[];T.forEach((x,i)=>{const el=$('tc'+i);if(!el)return;const m=tradeAmt(S,x),fe=$('tf'+i);
   if(x.k=='div'){const q_=document.querySelector('[data-tq="'+i+'"]');if(q_)q_.placeholder='股數 '+R(m.sb);el.innerText=m.cash?'股利 '+R(m.cash)+' 元'+(num(x.dps)!=null&&num(x.px)==null?'（每股 '+x.dps+' × '+R(m.q)+' 股）':'')+'｜除息 '+(x.dt||'—')+' → 發放 '+(x.pdt||'未填（暫以除息日計）')+(+x.out?'｜匯到追蹤範圍以外，發放日算成出金':'')+(m.cash>=20000?'｜單筆 ≥ 2 萬，可能被扣 2.11% 補充保費（約 '+R(m.cash*0.0211)+' 元）':''):'填每股配息（股數留空＝自動帶入除息前股數）';if(fe)fe.innerText='✎';}
   else if(x.k=='sdiv'){el.innerText=num(x.q)?'配股 '+R(num(x.q))+' 股（成本 0，均價會下降）':'';if(fe)fe.innerText='✎'}
   else{el.innerText=m.g?(x.k=='buy'?'付出 ':'入帳 ')+R(Math.abs(m.cash))+' 元（成交 '+R(m.g)+(x.k=='sell'?'、證交稅 '+R(m.tax):'')+'）'+(x.note?'｜'+x.note:''):'';if(fe)fe.innerText='費 '+R(m.fee)+(num(x.fee)!=null?'（手填）':'')+' ✎'}
   const f=document.querySelector('[data-tf="'+i+'"]');if(f)f.placeholder='自動 '+R(m.fa);const tx=document.querySelector('[data-tt="'+i+'"]');if(tx)tx.placeholder='自動 '+R(m.ta)});
  trGroups().forEach(g=>{const el=$('tgh_'+(g.d||'none'));if(!el)return;let bu=0,se=0,dv=0;g.ix.forEach(i=>{const x=T[i],m=tradeAmt(S,x);if(x.k=='buy')bu-=m.cash;else if(x.k=='sell')se+=m.cash;else if(x.k=='div')dv+=m.cash});
   el.innerText=(g.d?g.d.replace(/-/g,'/'):'（未填日期）')+'　'+g.ix.length+' 筆'+(bu?'｜買進 '+W2(bu)+' 萬':'')+(se?'｜賣出 '+W2(se)+' 萬':'')+(dv?'｜配息 '+R(dv)+' 元':'')});
  const lt=T.map(x=>x.dt||'').sort().pop();if($('trHead'))$('trHead').innerText=T.length?'（'+T.length+' 筆'+(lt?'，最近 '+lt.slice(5).replace('-','/'):'')+'）':'（尚無）';
  // 持股表（被動／主動可收合；預設 6 欄，「顯示更多欄位」看全部）
  const hs=holdings(S),ws=S.etfs.reduce((a,e)=>a+(+e.w||0),0)||1,tgt={};S.etfs.forEach(e=>{const c=cU(e.n);tgt[c]=(tgt[c]||0)+(+S.Wp||0)*1e4*(+e.w||0)/ws});
  const rows=[];['p','a'].forEach(ac=>{const L=hs.filter(o=>o.ac==ac&&(o.q>0||Math.abs(o.real)>0.5||o.div>0));if(ac=='p')Object.keys(tgt).forEach(c=>{if(tgt[c]>0&&!L.some(o=>o.n.toUpperCase()==c))L.push({ac:'p',n:c,q:0,cost:0,real:0,div:0,ln:0,iq:0,divs:[]})});L.sort((a,b)=>a.n>b.n?1:-1);rows.push({ac,L})});
  const MORE=!!S.trMore,key=rows.map(r=>r.ac+(hsOpen[r.ac]===false?'-':'+')+':'+r.L.map(o=>o.n).join(',')).join('|')+(MORE?'M':'')+'@'+sDate(S.cur);
  const cell=(o)=>{const c=o.n.toUpperCase(),px=num((S.px||{})[c]),mv=px!=null?o.q*px:null,tg=o.ac=='p'&&(c in tgt)?tgt[c]:null;return{c,px,mv,un:mv!=null?mv-o.cost:null,tg,gap:tg!=null?tg-(o.ln||0):null}};
  const sub=(ac,L)=>{let co=0,mv=0,mvAll=true,mvN=0,un=0,re=0,dv=0,ln=0;L.forEach(o=>{const k=cell(o);co+=o.cost;ln+=o.ln||0;re+=o.real;dv+=o.div;if(o.q>0){if(k.mv==null)mvAll=false;else{mv+=k.mv;un+=k.un;mvN++}}});const plan=(ac=='p'?+S.Wp:+S.Wa)*1e4||0;return{co,mv,mvAll,mvN,un,re,dv,ln,plan,gap:plan-ln}};
  const fmt=(id,v)=>{const el=$(id);if(el)el.innerHTML=v};
  const mvF=(s)=>!s.mvN?'—':s.mvAll?W2(s.mv):W2(s.mv)+'<small>（部分）</small>',unF=(s)=>!s.mvN?'—':`<span class="${s.un<0?'bad':'ok'}">${R(s.un)}</span>`;
  const y1=new Date(Date.parse(TODAY)-365*864e5).toISOString().slice(0,10),yld=o=>{const t=(o.divs||[]).filter(z=>z.d>y1&&z.d<=TODAY).reduce((a,z)=>a+z.v,0);return o.cost>0&&t>0?(t/o.cost*100).toFixed(2)+'%':'—'};
  const COLS=[['n','代號／名稱',0],['q','股數',0],['avg','均價',1],['co','成本(萬)',0],['px','現價',0],['mv','市值(萬)',0],['un','未實現(元)',0],['re','已實現(元)',1],['dv','配息(元)',1],['yl','近12月殖利率',1],['tg','目標(萬)',1],['gap','還差(萬)',1]].filter(c=>MORE||!c[2]);
  const pxd=S.pxd||{},one=(o)=>{const k=cell(o),b='hc_'+o.ac+'_'+k.c,V={n:`${esc(o.n)} <small>${esc(nameOf(o.n))}</small>`,q:R(o.q)+(o.iq?`<br><small>期初 ${R(o.iq)}</small>`:''),avg:o.q>0?(o.cost/o.q).toFixed(2):'—',co:W2(o.cost),
    px:o.q>0?`<input type=number step=any data-px="${k.c}" value="${k.px??''}" placeholder="現價">${pxd[k.c]&&pxd[k.c]!=sDate(S.cur)?`<br><small>沿用 ${String(pxd[k.c]).slice(5).replace('-','/')}</small>`:''}`:'',mv:`<span id="${b}_mv"></span>`,un:`<span id="${b}_un"></span>`,re:`<span class="${o.real<0?'bad':''}">${R(o.real)}</span>`,dv:R(o.div),yl:yld(o),tg:k.tg!=null?W2(k.tg):'',gap:`<span id="${b}_gap"></span>`};return'<tr>'+COLS.map(c=>`<td>${V[c[0]]}</td>`).join('')+'</tr>'};
  const srow=(lb,id,s)=>{const V={n:lb,co:W2(s.co),mv:`<span id="${id}_mv"></span>`,un:`<span id="${id}_un"></span>`,re:R(s.re),dv:R(s.dv),tg:W2(s.plan),gap:`<span id="${id}_gap"></span>`};return'<tr class=sr>'+COLS.map(c=>`<td>${V[c[0]]??''}</td>`).join('')+'</tr>'};
  const put=()=>{let tot={co:0,mv:0,un:0,re:0,dv:0,plan:0,mvAll:true,mvN:0,ln:0};rows.forEach(({ac,L})=>{L.forEach(o=>{const k=cell(o),b='hc_'+ac+'_'+k.c;fmt(b+'_mv',k.mv==null?'—':W2(k.mv));fmt(b+'_un',k.un==null?'—':`<span class="${k.un<0?'bad':'ok'}">${R(k.un)}</span>`);fmt(b+'_gap',k.gap==null?'':W2(k.gap))});
    const s=sub(ac,L);fmt('hs_'+ac+'_mv',mvF(s));fmt('hs_'+ac+'_un',unF(s));fmt('hs_'+ac+'_gap',W2(s.gap));['co','mv','un','re','dv','plan','mvN','ln'].forEach(k=>tot[k]+=s[k]);tot.mvAll=tot.mvAll&&s.mvAll});
   fmt('hs_t_mv',mvF(tot));fmt('hs_t_un',unF(tot));fmt('hs_t_gap',W2(tot.plan-tot.ln));
   {const ce_=curEff(),mv=ce_._mv;if($('mvLine'))$('mvLine').innerHTML=usePx(S)?(ce_._miss&&ce_._miss.length?'<span class=wn>還缺現價：'+ce_._miss.map(c=>c+' '+esc(nameOf(c))).join('、')+'</span>':'依現價計算：被動市值 '+W2(mv.p)+' 萬｜主動市值 '+W2(mv.a)+' 萬'+((num(S.cur.p)!=null||num(S.cur.a)!=null)?'（「修正」有覆寫，以覆寫值計算）':'')):''}};
  const tbl=$('trh'),act=document.activeElement;
  if(tbl&&(key!=lastHK||!(act&&tbl.contains(act)))){lastHK=key;const any=rows.some(r=>r.L.length),all={co:0,re:0,dv:0,plan:0};rows.forEach(r=>{const s=sub(r.ac,r.L);all.co+=s.co;all.re+=s.re;all.dv+=s.dv;all.plan+=s.plan});
   tbl.innerHTML=any?`<thead><tr>${COLS.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(({ac,L})=>{if(!L.length)return'';const op=hsOpen[ac]!==false;
    return`<tr class=x data-sec="${ac}" style="cursor:pointer"><td colspan=${COLS.length}>${op?'▾':'▸'} ${ac=='p'?'被動部位':'主動部位'}（${L.length} 檔）</td></tr>`+(op?L.map(one).join(''):'')+srow('小計','hs_'+ac,sub(ac,L))}).join('')}${srow('合計','hs_t',all)}</tbody>`:'';
   if($('trMoreB'))$('trMoreB').innerHTML=any?`<button onclick="tgMore()">${MORE?'只顯示主要欄位':'顯示更多欄位（均價、已實現、配息、殖利率、目標、還差）'}</button>`:''}
  put();
  const nb=netBuy(S,null,'9999-12-31');if($('trSum2'))$('trSum2').innerText=T.length?'撥款後累計：被動淨投入 '+nb.p.toFixed(2)+' 萬、主動淨投入 '+nb.a.toFixed(2)+' 萬、配息 '+R(nb.d*1e4)+' 元。持股與現價在下方「持股明細表」。':'';if($('trSum'))$('trSum').innerText=(T.length||hasInit(S))?'成本：期初持股以撥款日收盤價計，撥款後依交易紀錄（移動平均）。「還差」＝目標－撥款後淨投入；目標＝資金配置的被動計畫金額 × 試算頁設定的 ETF 比例；主動只比較帳戶合計與計畫金額。小計與合計的「目標」欄為計畫金額。撥款後累計：被動淨投入 '+nb.p.toFixed(2)+' 萬、主動淨投入 '+nb.a.toFixed(2)+' 萬、配息 '+R(nb.d*1e4)+' 元。':''}
 // 本期結算結果
 const ce=curEff(),r=settle(S,ce);
 const prev=ss.filter(o=>sDate(o.s)<sDate(S.cur)).map(o=>o.s),twC=r?twr(S,prev.concat([ce])).pop():null;
 const sdv=(lst)=>{let pd=null,t=0;for(const s of lst){const dt=sDate(s);t+=num(s.d)??netBuy(S,pd,dt).d;pd=dt}return t},pdC=prev.length?sDate(prev[prev.length-1]):null,nbC=sDate(S.cur)?netBuy(S,pdC,sDate(S.cur)):{p:0,a:0,d:0},dCur=num(S.cur.d)??nbC.d,dsum=sdv(prev)+dCur;
 {const ph=(k,v)=>{const el=document.querySelector('[data-p="cur.'+k+'"]');if(el)el.placeholder=sDate(S.cur)?'自動 '+v.toFixed(2):''};ph('bp',nbC.p);ph('ba',nbC.a);ph('d',nbC.d)}
 let extra='';
 if(r){const tgt=((+S.sv0p||0)+(+S.Wp||0))/(((+S.sv0)+(+S.Wp||0)+(+S.Wa||0))||1)*100,act=(r.p+r.a)>0?r.p/(r.p+r.a)*100:0,off=act-tgt;
  extra+=cd('rb','再平衡（被動占股票比例）',act.toFixed(1)+'%<br><small>目標 '+tgt.toFixed(1)+'% ±'+S.rb+'｜'+(Math.abs(off)>S.rb?(off>0?'被動偏高，考慮轉入主動':'被動偏低，考慮補被動'):'在容許範圍內')+'</small>',Math.abs(off)>S.rb?'wn':'ok');
  const x5=num(ce.x50),h5=num(S.hi50)??num(S.cur.hi50);
  const dR=rule(S,'dip'),l1_=rule(S,'loss1'),lossOn=l1_.on&&lossB(S)>0&&Math.max(0,-r.af)/lossB(S)*100>=l1_.th;if(x5!=null&&h5&&dR.on){const dw=(1-x5/h5)*100,hit=dw>=dR.th&&!lossOn;extra+=cd('dq','保留現金動用（'+bmC(S)+' 回落）',dw.toFixed(1)+'%<br><small>'+(lossOn&&dw>=dR.th?'已達 '+dR.th+'%，但虧損上限 ① 已觸發，依規則暫停加碼':hit?'已達 '+dR.th+'%：建議動用 '+(r.c*S.du/100).toFixed(2)+' 萬（帳戶現金 × '+S.du+'%）':'未達 '+dR.th+'% 動用條件')+'</small>',hit?'wn':'')}
  {const cfc=cf[Math.max(1,Math.min(H,r.ts))]||f1,nd=cfc.lv+cfc.lp,em2=nd>0?(r.p+r.c)*1e4/nd:Infinity,lv2=r.scope>0?r.rem/r.scope*100:0;
   const lst=prev.map(s=>settle(S,s)).filter(Boolean).concat([r]),q=ruleNow(lst,ce,em2,lv2,aprE,r.ts,r.af),hits=topLoss(S.rules.filter(x=>q[x.k]&&q[x.k].hit)),sp_=slSplit(r),slc=slCalc(r.af,sp_.act,sp_.pas);
   extra+=`<div class=c style="grid-column:span 2;text-align:left"><small>📏 應對規則提醒（規則可在「🛡️ 風險」分頁修改）</small><div style="margin-top:3px;font-size:12.5px;line-height:1.6">${hits.length?hits.map(x=>`⚠️ <b>${RULES[x.k][0]}</b>（${q[x.k].v}）<br><span class=h>→ ${esc(x.a)||'（未填應對動作）'}${slAct(x.k,slc)?'<br>　'+slAct(x.k,slc):''}</span>`).join('<br>'):'<span class=ok>✅ 沒有觸發的規則</span>'}</div></div>`}
  if(twC)extra+=cd('perfP','被動／主動 vs '+bmC(S)+'（撥款以來）',P1(twC.rp)+' / '+P1(twC.ra)+' / '+(r.sbOk?P1(r.sb):'—')+(r.sbOk?`<br><small>${bmC(S)} 依${r.sbSrc}｜超額 ${P1(twC.rp-r.sb)} / ${P1(twC.ra-r.sb)}</small>`:'<br><small>填 0050 還原價後可比較</small>'))}
 const cE_=curEff()._cashEst;
 $('sres').innerHTML=r?(r.pa&&(r.pa.n||r.pa.dn||r.pa.rn)||cE_?`<div class="c" style="grid-column:span 2;text-align:left;background:#fef3c7;border-color:#fcd34d"><small>⚠️ 現金已自動調整（結算日 ${esc(sDate(S.cur))}）</small><div style="font-size:12.5px;line-height:1.6;margin-top:2px">${cE_?`你的現金是 ${esc(cE_.from)} 填的 ${cE_.raw.toFixed(2)} 萬，已用之後的買賣、配息推算到結算日；請照 App 今天的餘額更新。<br>`:''}${r.pa.n?`有 ${r.pa.n} 筆交易在結算日還沒交割（T+2）：${r.pa.pay?'已扣除應付 '+R(r.pa.pay)+' 元':''}${r.pa.pay&&r.pa.rcv?'、':''}${r.pa.rcv?'已加回應收 '+R(r.pa.rcv)+' 元':''}。<br>`:''}${r.pa.dn?`有 ${r.pa.dn} 筆股利已除息、尚未發放：已加回應收股利 ${R(r.pa.dv)} 元。<br>`:''}${r.pa.rn?`有 ${r.pa.rn} 筆交易的手續費折讓還沒退回（每月退回）：已加回應收退款 ${R(r.pa.rb)} 元。<br>`:''}<span class=h>追蹤帳戶現金請照 App 上的餘額填寫。交割日只跳過週末，遇到國定假日請自行確認。${cE_?'推算的':''}交割帳戶餘額 ${r.cRaw.toFixed(2)} 萬 → 結算用 ${r.c.toFixed(2)} 萬</span></div></div>`:'')+cd('alpha','⚔️ Alpha　A｜B｜C',sg(r.af)+'｜'+sg(r.af-r.ao)+'｜'+sg(r.ao)+' 萬<br><small>A 面額｜B 定投收益｜C＝A−B 機會成本</small>',r.ao<0?'bad':'ok')+(()=>{const t=xirrT(r);return cd('xirr',t.l,t.v+(t.ann?'<br><small>vs 信貸成本 '+aprE.toFixed(2)+'%</small>':'<br><small>撥款至今 '+Math.round(t.days||0)+' 天，滿 6 個月後顯示年化</small>'),t.ann?(r.x>=aprE?'ok':'bad'):'')})()+cd(null,'已繳期數 / 剩餘本金',r.n+' 期 / '+W2(r.rem)+' 萬')+cd(null,'累計成本(月付+開辦+淨入金+費用)',W2(r.ext0)+' 萬')+cd('real','真實淨資產 / 對撥款前',W2(r.real)+' / '+sg(r.d0)+' 萬',r.d0<0?'bad':'ok')+cd('nle','沒借錢估計值',W2(r.nle)+' 萬'+(r.sbOk?'':'<br><small>未填 0050，以 0% 計</small>'))+extra+cd(null,'股息/利息 本期 / 累計（統計）',dCur.toFixed(2)+' / '+dsum.toFixed(2)+' 萬'):`<div class=h style="grid-column:span 2">${ce._miss&&ce._miss.length?'請在上方持股表填入以下各檔現價：'+ce._miss.map(c=>c+' '+nameOf(c)).join('、'):usePx(S)?'請選結算日期，填入追蹤帳戶現金與各檔現價。':'請選結算日期，並填入被動、主動市值與追蹤帳戶現金。'}</div>`;
 // 信貸餘額回填表
 const ln0=loanS(S,0),t0=Math.max(0,isNaN(ym2t(S,S.cur.m))?0:ym2t(S,S.cur.m));let lh='';
 for(let t=t0;t<=Math.min(t0+11,H);t++){const n=paidAt(S,t);lh+=`<tr><td>${t2ym(S,t)}-15</td><td>${n}</td><td>${R(ln0.rem[n])}</td></tr>`}$('liab').innerHTML=lh;
 // 歷次結算表
 $('snaps').innerHTML=ss.map((o,k)=>{const s=o.s,r=settle(S,s),t=tw[k];return r?`<tr><td>${sDate(s)}${s.h?' 📑':''}</td><td>${(+s.p).toFixed(2)}</td><td>${(+s.a).toFixed(2)}</td><td>${s.c}</td><td>${num(s.d)!=null?(+s.d).toFixed(2):''}</td><td>${W2(r.rem)}</td><td>${W2(r.real)}</td><td class="${r.af<0?'bad':'ok'}">${W2(r.af)}</td><td>${W2(r.ao)}</td><td>${isNaN(r.x)?'—':(Math.abs(r.x)<0.05?0:r.x).toFixed(1)+'%'}</td><td>${t?t.rp.toFixed(1)+'/'+t.ra.toFixed(1)+'/'+(r.sbOk?r.sb.toFixed(1):'—'):''}</td><td style="text-align:left">${esc(s.note)}</td><td><button onclick="ldSnap(${o.i})">載入</button><button onclick="delRow('snaps',${o.i})">✕</button></td></tr>`:''}).join('');
 // 年度表
 let th='';for(let y=1;y*12<=H;y++){const a=cf.slice((y-1)*12+1,y*12+1),q=rec[y*12];
  let pr=0,it=0,mr='';for(let t=(y-1)*12+1;t<=y*12&&t<=ln0.N;t++){const p=ln0.pay[t]||0,pp=Math.max(0,(ln0.rem[t-1]||0)-(ln0.rem[t]||0)),ii=Math.max(0,p-pp);if(!(p>0))continue;pr+=pp;it+=ii;const o=tm(S,t);
   mr+=`<tr><td>${t}</td><td>${o.y}-${String(o.m).padStart(2,'0')}-${String(payDay(S,t)).padStart(2,'0')}</td><td>${R(p)}</td><td>${R(pp)}</td><td>${R(ii)}</td><td>${R(ln0.rem[t]||0)}</td></tr>`}
  const op=ls('lcyr')==String(y);
  th+=`<tr class=yrr onclick="yrTog(${y})" style="cursor:pointer"><td>${op?'▾':'▸'} ${y}</td><td>${t2ym(S,(y-1)*12+1)}~${t2ym(S,y*12)}</td><td>${W(a.reduce((x,o)=>x+o.lp,0))}</td><td>${W(pr)}</td><td>${W(it)}</td><td>${W(ln0.rem[Math.min(y*12,ln0.N)])}</td><td>${q?W(q.af):'—'}</td><td>${q?W(q.af-q.ao):'—'}</td><td><b>${q?W(q.ao):'—'}</b></td></tr>`+(op&&mr?`<tr><td colspan=9 style="padding:0 0 6px 10px"><table class=mtb><thead><tr><th>期</th><th>扣款日</th><th>月付金</th><th>本金</th><th>利息</th><th>剩餘本金</th></tr></thead><tbody>${mr}</tbody></table><div class=h>單位：元。利息＝剩餘本金 × 當期年利率 ÷ 12；實際以銀行對帳單為準。</div></td></tr>`:'')}$('tb').innerHTML=th;
 if($('pinfo'))$('pinfo').innerText=hasSettle()?'已於第一次結算後凍結（建立於 '+S.plan.d+'）':'尚未結算：計畫線會跟著設定自動更新';
 const re=effRe();
 if(isS()){const eA=end.af,eC=end.ao;$('verdict').innerHTML=`依你的假設，${S.Y} 年後（${t2ym(S,H)}）借錢投資比每月定期定額<b class="${eC<0?'bad':'ok'}">${eC>=0?'多賺':'少賺'} ${W(Math.abs(eC))} 萬</b>（比完全不投資${eA>=0?'多賺':'少賺'} ${W(Math.abs(eA))} 萬）。每年含息報酬至少 <b>${bT.toFixed(1)}%</b> 才划算（你的假設 ${asm.toFixed(1)}%）${B>0?`；虧損上限 ${W(B)} 萬，目前${SL.rb<=0?'<b class=bad>已超過上限</b>':SL.Y==null?'信貸資金尚未投入股市':'約可承受股市再跌 '+SL.Y.toFixed(0)+'%'}`:''}。`;
  const pn=['稅費與交易成本'];if(S.sv0+S.sc0>0)pn.push('撥款前持股與現金 '+(S.sv0+S.sc0).toFixed(1)+' 萬');if(S.early&&S.E>0)pn.push('第 '+S.E+' 期提前清償');if(S.grow)pn.push('原有部位成長');if(hasSettle())pn.push((S.snaps||[]).length+' 筆結算紀錄（預測從最新結算往後推）');
  $('proNote').innerHTML='這份試算也套用了專業版的設定：'+pn.join('、')+'。<a href="javascript:void 0" onclick="setUi(\'pro\')">切換到專業版查看</a>'}
 if($('lossH'))$('lossH').innerText=B>0?'＝ '+W(B)+' 萬。虧損＝A 面額為負的金額，已含已付利息、開辦費、交易成本與股利稅；不含尚未發生的利息。':'';
 // 風險分頁
 if($('scChips'))$('scChips').innerHTML=S.scen.map((s,i)=>`<button class="${i==S.scSel?'on':''}" onclick="selSc(${i})">${esc(s.n)}</button>`).join('');
 let scRec=null;
 if(curT=='R'){const runs=[Object.assign({sc:SC0},runSc(S,SC0))].concat(S.scen.map(sc=>Object.assign({sc},runSc(S,sc)))),sel=runs[S.scSel+1],cth=rule(S,'cash').th;scRec=sel.rec;
  const slo=slOpt(S),hasT=!!S.lossTo;if(hasT)runs.forEach(q=>{q.sl=runSc(S,Object.assign({},q.sc,{sl:slo}))});
  const ROWS=[['開始月份／下跌',q=>q.sc===SC0?'—':t2ym(S,q.m.st)+'<br><small>'+q.sc.dr+'%・'+q.sc.dn+' 月跌・'+(+q.sc.rc?q.sc.rc+' 月回升':'不回升')+'</small>'],
   ['最低真實淨資產',q=>W(q.m.mn.real)+' 萬<br><small>'+t2ym(S,q.m.mn.t)+'</small>',q=>q.m.mn.real<q.m.init],
   ['最大回撤',q=>q.m.mddp.toFixed(1)+'%<br><small>(−'+W(q.m.mdd)+' 萬)</small>'],
   ['低於底線',q=>q.m.below+' 個月',q=>q.m.below>0],
   ['回到底線',q=>q.m.fb==null?'未跌破':q.m.rec<0?'到期仍未回到':q.m.rec+' 個月'],
   ['被迫賣股',q=>q.m.sold<1?'無':W(q.m.sold)+' 萬<br><small>首次 '+t2ym(S,q.m.sold1)+(q.m.soldA>=1?'<br>含主動／原有 '+W(q.m.soldA):'')+'</small>',q=>q.m.sold>=1],
   ['最低可撐月數',q=>q.m.mc?q.m.mc.cov.toFixed(1)+' 個月<br><small>'+t2ym(S,q.m.mc.t)+'</small>':'—',q=>q.m.mc&&q.m.mc.cov<cth],
   ['期末 A／C',q=>W(q.m.end.af)+'／'+W(q.m.end.ao)+' 萬',q=>q.m.end.ao<0],
   ['觸及停損線',q=>!(B>0)?'未設定':(q.m.slHit!=null?t2ym(S,q.m.slHit):'未觸及')+'<br><small>A 最低 '+W(q.m.mA.af)+' 萬</small>',q=>q.m.slHit!=null],
   ['照規則停損：期末 A／C',q=>!hasT?'<small>請先在上方選轉入標的</small>':!(B>0)?'未設定':(q.sl.rec[H].slS?W(q.sl.m.end.af)+'／'+W(q.sl.m.end.ao)+' 萬<br><small>A 最低 '+W(q.sl.m.mA.af)+(q.sl.rec[H].slT2!=null?'<br>② '+t2ym(S,q.sl.rec[H].slT2):'')+(q.sl.rec[H].slT3!=null?'<br>③ '+t2ym(S,q.sl.rec[H].slT3):'')+'</small>':'未觸發停損'),q=>hasT&&q.sl&&q.sl.m.end.ao<0]];
  const cs=k=>k==S.scSel+1?'sel':'';
  $('scT').innerHTML=`<thead><tr><th class=l>萬元</th>${runs.map((q,k)=>`<th class="${cs(k)}" ${k?`onclick="selSc(${k-1})" style="cursor:pointer"`:''}>${esc(q.sc.n)}</th>`).join('')}</tr></thead><tbody>${ROWS.map(([l,f,b])=>`<tr><td class=l>${l}</td>${runs.map((q,k)=>`<td class="${cs(k)} ${b&&b(q)?'bad':''}">${f(q)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const ss_=S.scen[S.scSel],md=maxDrop(S,ss_),j1=maxJobless(S,ss_,'sold'),j2=maxJobless(S,ss_,'soldA'),st=sel.m.st,b0=runs[0].rec[st],pkq=sel.rec[Math.max(fc.from,st-1)];
  const jf=v=>v==null?'0':v>=H?'≥'+H:String(v);
  $('scM').innerHTML=cd('sdrop','最大可承受跌幅（不回升）',md==null?'—<br><small>這個情境的收入／支出衝擊本身就會被迫賣股</small>':(md>=95?'≥95%':md.toFixed(1)+'%')+'<br><small>從 '+t2ym(S,st)+' 起算</small>',md==null||md<20?'wn':'ok')+
   cd('sjob','最長可承受收入中斷',jf(j1)+'｜'+jf(j2)+' 個月<br><small>不用賣股｜不用賣主動與原有持股</small>',(j1||0)<6?'wn':'ok')+
   cd('spk','情境開始前口袋緩衝',(pkq?W(pkq.pk):'—')+' 萬<br><small>'+t2ym(S,Math.max(fc.from,st-1))+'</small>')+
   cd('srate','升息後月付',(+ss_.ru)?R(b0?b0.pay:0)+' → '+R(sel.rec[st].pay)+' 元<br><small>每月多 '+R(sel.rec[st].pay-(b0?b0.pay:0))+' 元</small>':'未設定升息');
  // 虧損上限面板
  {const ln_=loanS(S,0),n=paidAt(S,sT);let pI=0,fI=0;for(let t=1;t<=ln_.N;t++){const it=ln_.pay[t]-(ln_.rem[t-1]-ln_.rem[t]);if(t<=n)pI+=it;else fI+=it}
   $('slHint').innerHTML=B>0?`貸款 ${S.L} 萬 × ${S.loss}% ＝ <b>${W(B)} 萬</b>。虧損已含已付利息（至 ${t2ym(S,sT)} 約 ${W(pI)} 萬）、開辦費、交易成本與股利稅；不含尚未發生的利息（到期前還要付約 ${W(fI)} 萬）。`:'請設定虧損上限 %。';
   const K_=Math.max(1,S.K|0),tc=L?L.r.ts:Math.max(sT,K_-1),f0=fcInit(S),Ac=L?L.r.af:rec[tc].af;let ca,cp_,rc_;
   if(L){const sp=slSplit(L.r);ca=sp.act;cp_=sp.pas;rc_=L.r.rem}else{ca=rec[tc].va;cp_=rec[tc].stk-rec[tc].va;rc_=rec[tc].rem}
   const cost=ca*(feeR(S,'a')+S.stS/100)+cp_*(feeR(S,'p')+S.stE/100),pen=(paidAt(S,tc)+1)<=S.lock?rc_*S.pen/100:0,bB=Ac-cost-pen;
   let aA=null;if(hasT){const rr_=project(S,f0.o,undefined,Object.assign({},SC0,{cut:{t:tc,x:Infinity}}));aA=rr_[H].af}
   $('slOut').innerHTML=cd('slu','目前虧損額度（'+sSrc+'）',B>0?'已用 '+SL.used.toFixed(0)+'%｜剩 '+W(Math.max(0,SL.rb))+' 萬<br><small>A '+sg(sAf)+' 萬</small>':'—',SL.rb<=0?'bad':'')+
    cd('sly','約可承受再跌',SL.Y==null?'—<br><small>信貸資金尚未投入股市</small>':SL.Y.toFixed(1)+'%<br><small>信貸資金在股市 '+W(SL.risky)+' 萬（不含未投入現金）</small>',SL.Y!=null&&SL.Y<10?'wn':'')+
    `<div style="grid-column:span 2">`+cd('slx','② 減碼試算（股市再跌 '+SL.Z+'%）',SL.x>0?'賣出 '+W2(SL.x)+' 萬<br><small>主動 '+W2(SL.sa)+'、被動 '+W2(SL.sp)+' → '+tgName()+'</small>':'目前不需減碼<br><small>剩餘額度足以承受再跌 '+SL.Z+'%</small>',SL.x>0?'wn':'ok')+`</div>`+
    `<div style="grid-column:span 2">`+cd('slc','③ 如果在 '+t2ym(S,tc)+' 停損（期末 A 比較）',`<span style="font-size:12.5px;font-weight:400;line-height:1.7">不動作（照目前預測）：<b>${W(rec[H].af)} 萬</b><br>(a) 全部轉入 ${tgName()} 持有到期：<b>${aA==null?'請先選擇轉入標的':W(aA)+' 萬'}</b><br>(b) 全部賣出並提前清償：<b>約 ${W(bB)} 萬</b>（含交易成本 ${W2(cost)} 萬${pen?'、違約金 '+W2(pen)+' 萬':''}）</span>`)+`</div>`}
  if($('scNote'))$('scNote').innerText='這個情境實際從 '+t2ym(S,st)+'（撥款後第 '+st+' 個月）開始'+(st>(+ss_.st||1)?'（設定的月份早於最新結算，已改從結算後下個月起算）':'')+'。';
  const fr=scRules(S,sel.rec,fc.from);S.rules.forEach(x=>{const el=$('rs_'+x.k);if(!el)return;el.innerHTML='情境「'+esc(ss_.n)+'」：'+(!x.on?'—':x.k=='xirr'?'不適用（情境無法估 XIRR）':fr[x.k]!=null?'<span class=wn>'+t2ym(S,fr[x.k])+' 第一次觸發</span>':'未觸發')})}
 {const FH=isS()?{l_plan:1,l_b:1,l_pt:1,l_sc:1}:{};$('lg').innerHTML=LINES.filter(([k])=>!FH[k]&&!(re&&(k=='l_ao'||k=='l_b'))&&!(k=='l_sc'&&!scRec)&&!(k=='l_sl'&&(re||!(B>0)))).map(([k,l,c,t])=>`<span data-lg="${k}" class="${S.hide[k]?'off':''}" title="點一下開關這條線"><i style="background:${t=='dash'?`repeating-linear-gradient(90deg,${c} 0 4px,transparent 4px 7px)`:c};${t=='dot'?'height:8px;width:8px;border-radius:50%':''}"></i>${re&&k=='l_af'?'最新預測':k=='l_sc'?'壓力情境：'+esc(S.scen[S.scSel].n):k=='l_sl'?'停損線 −'+W(B):l}</span>`).join('')+(re?'<span><i style="background:repeating-linear-gradient(90deg,#f87171 0 3px,transparent 3px 6px)"></i>底線(撥款前)</span>':'')}
 $('cvh').innerText=isS()?'縱軸＝借貸淨效益（萬元）。A（紫實線）＝比錢放著不投資多賺；C（紫虛線）＝比每月定期定額多賺，主要看 C。按住圖表左右拖動可看各月數值。':re?'縱軸＝真實淨資產（萬元）：追蹤帳戶扣掉信貸與已付成本後的淨值，紅色細虛線為撥款前的底線。按住圖表左右拖動可看各月數值；點圖例可開關線。':'縱軸＝借貸淨效益（萬元）。A（紫實線）＝比不投資多賺；B（橘線）＝月付金改拿去定期定額能多賺的部分；C（紫虛線）＝A−B＝比定期定額多賺，主要看 C。按住圖表左右拖動可看各月數值；點圖例可開關線。';
 let pts=ss.map(o=>settle(S,o.s)).filter(Boolean);if(S.ptLast){const lastM={};pts.forEach(p=>{lastM[p.ts]=p});pts=Object.values(lastM)}
 CH={rec,from:fc.from,H,re,init,plan:S.plan?(re?S.plan.re:S.plan.af):[],pts,sc:scRec,B};draw();if(typeof stCalc=='function')stCalc();if(typeof asCalc=='function')asCalc()}
function draw(){if(!CH)return;const c=$('cv'),d=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;if(!w)return;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.scale(d,d);
 const{rec,from,H,plan,pts,re,init,sc,B}=CH,hd=effHide(),k1=re?'real':'af',pv=p=>re?p.real:p.af,[a,b]=rngAB(H),tt=todayT(H),LS=[];
 if(!hd.l_plan)LS.push({k:'l_plan',lb:'計畫',c:'#94a3b8',w:1.5,d:[5,4],g:t=>plan[t],s:0});
 if(sc&&!hd.l_sc)LS.push({k:'l_sc',lb:'情境',c:'#dc2626',w:2,d:[7,3],g:t=>sc[t]?sc[t][k1]:null,s:from,e:1});
 if(!re&&!hd.l_ao)LS.push({k:'l_ao',lb:'C 機會',c:'#7c3aed',w:1.5,d:[4,3],g:t=>rec[t].ao,s:from,e:1});
 if(!re&&!hd.l_b)LS.push({k:'l_b',lb:'B 定投',c:'#ea580c',w:1.5,g:t=>rec[t].af-rec[t].ao,s:from,e:1});
 if(!hd.l_af)LS.push({k:'l_af',lb:re?'預測':'A 面額',c:'#7c3aed',w:2.5,g:t=>rec[t][k1],s:from,e:1});
 const showL=!re&&!hd.l_sl&&B>0,showP=!hd.l_pt,vs=[re?init:0];if(showL)vs.push(-B);
 LS.forEach(L=>{for(let t=Math.max(a,L.s);t<=b;t++){const v=L.g(t);if(v!=null&&isFinite(v))vs.push(v)}});if(showP)pts.forEach(p=>{if(p.ts>=a&&p.ts<=b)vs.push(pv(p))});
 let lo=Math.min(...vs)/1e4,up=Math.max(...vs)/1e4;if(up-lo<1e-6){up+=1;lo-=1}const st=niceStep((up-lo)/4);lo=Math.floor(lo/st+1e-9)*st;up=Math.ceil(up/st-1e-9)*st;if(up-lo<st)up=lo+st;
 const pl=40,pr=34,pt=16,qt=!hd.g_qt,mLab=qt&&12*(w-pl-pr)/Math.max(1,b-a)>=80,pb=mLab?30:20,ax=h-pb,X=t=>pl+(t-a)*(w-pl-pr)/Math.max(1,b-a),Y=v=>pt+(ax-pt)*(1-(v/1e4-lo)/(up-lo));
 x.font='10px sans-serif';x.lineWidth=1;const dec=st<1?1:0;
 for(let k=0;lo+k*st<=up+1e-9;k++){const v=lo+k*st,yy=Y(v*1e4),z=Math.abs(v)<1e-9;x.strokeStyle=z?'#94a3b8':'#e2e8f0';x.beginPath();x.moveTo(pl,yy);x.lineTo(w-pr,yy);x.stroke();x.fillStyle='#64748b';x.textAlign='right';x.fillText(z?'0':v.toFixed(dec),pl-4,yy+3)}
 x.textAlign='left';x.fillStyle='#64748b';x.fillText('萬',4,10);
 if(re){x.strokeStyle='#f87171';x.setLineDash([3,3]);x.beginPath();x.moveTo(pl,Y(init));x.lineTo(w-pr,Y(init));x.stroke();x.setLineDash([])}
 x.strokeStyle='#cbd5e1';x.beginPath();x.moveTo(pl,ax);x.lineTo(w-pr,ax);x.stroke();
 let fj=null;
 for(let t=a;t<=b;t++){const dm=tm(S,t),xx=X(t);
  if(dm.m==1){if(fj==null)fj=t;x.strokeStyle='#eef2f7';x.beginPath();x.moveTo(xx,pt);x.lineTo(xx,ax);x.stroke();x.strokeStyle='#94a3b8';x.beginPath();x.moveTo(xx,ax);x.lineTo(xx,ax+5);x.stroke();
   const s=String(dm.y),tw=x.measureText(s).width;x.fillStyle='#475569';x.textAlign='left';x.fillText(s,Math.max(2,Math.min(w-tw-2,xx-tw/2)),h-4)}
  else if(qt&&dm.m%3==0){x.strokeStyle='#cbd5e1';x.beginPath();x.moveTo(xx,ax);x.lineTo(xx,ax+3);x.stroke();if(mLab){x.fillStyle='#94a3b8';x.textAlign='center';x.fillText(String(dm.m),xx,ax+13);x.textAlign='left'}}}
 if(fj==null||X(fj)-pl>36){x.fillStyle='#475569';x.textAlign='left';x.fillText(String(tm(S,a).y),pl,h-4)}
 if(tt>=a&&tt<=b){const xx=X(tt);x.strokeStyle='#38bdf8';x.setLineDash([2,3]);x.beginPath();x.moveTo(xx,pt);x.lineTo(xx,ax);x.stroke();x.setLineDash([]);x.fillStyle='#0284c7';x.textAlign='center';x.fillText('今天',Math.max(pl+12,Math.min(w-pr-12,xx)),pt-4);x.textAlign='left'}
 if(showL){const yy=Y(-B);x.strokeStyle='#b91c1c';x.lineWidth=1.2;x.beginPath();x.moveTo(pl,yy);x.lineTo(w-pr,yy);x.stroke();x.lineWidth=1;x.fillStyle='#b91c1c';x.textAlign='right';x.fillText('停損線',w-pr-2,yy-3);x.textAlign='left'}
 LS.forEach(L=>{x.beginPath();x.strokeStyle=L.c;x.lineWidth=L.w;x.setLineDash(L.d||[]);let s=0;for(let t=Math.max(a,L.s);t<=b;t++){const v=L.g(t);if(v==null||!isFinite(v))continue;s++?x.lineTo(X(t),Y(v)):x.moveTo(X(t),Y(v))}x.stroke();x.setLineDash([])});x.lineWidth=1;
 if(showP){x.fillStyle='#16a34a';pts.forEach(p=>{if(p.ts<a||p.ts>b)return;x.beginPath();x.arc(X(Math.max(a,Math.min(b,p.ts+Math.max(-.45,Math.min(.45,((+String(p.dt).slice(8,10)||15)-15)/30))))),Y(pv(p)),4,0,7);x.fill()})}
 const el=[];LS.filter(L=>L.e&&b>=L.s).forEach(L=>{const v=L.g(b);if(v!=null&&isFinite(v))el.push({y:Y(v),t:W(v),c:L.c})});el.sort((p,q)=>p.y-q.y);for(let i=1;i<el.length;i++)if(el[i].y-el[i-1].y<11)el[i].y=el[i-1].y+11;
 x.font='bold 10px sans-serif';el.forEach(e=>{x.fillStyle=e.c;x.fillText(e.t,w-pr+3,Math.min(ax,Math.max(pt+6,e.y+3)))});x.font='10px sans-serif';
 if(hi!=null&&hi>=a&&hi<=b){const xx=X(hi);x.strokeStyle='#334155';x.beginPath();x.moveTo(xx,pt);x.lineTo(xx,ax);x.stroke();LS.forEach(L=>{if(hi<L.s)return;const v=L.g(hi);if(v==null||!isFinite(v))return;x.fillStyle=L.c;x.beginPath();x.arc(xx,Y(v),3,0,7);x.fill()})}
 CH.geo={a,b,pl,pr};CH.LS=LS;cviUpd()}
function cviUpd(){const el=$('cvi');if(!el||!CH||!CH.LS)return;const{pts,re,init,LS,H}=CH,sel=hi!=null,t=sel?hi:todayT(H),parts=[`<b>${sel?'':'今天 '}${t2ym(S,t)}</b>`];
 LS.slice().reverse().forEach(L=>{if(t<L.s||(L.k=='l_plan'&&!pts.length))return;const v=L.g(t);if(v==null||!isFinite(v))return;parts.push(`<span style="color:${L.c}">${L.lb} ${W(v)}</span>`)});
 const sp=pts.filter(p=>p.ts==t);if(sp.length&&!effHide().l_pt)parts.push('<span style="color:#16a34a">實際 '+sp.map(p=>W(re?p.real:p.af)+'（'+String(p.dt).slice(5).replace('-','/')+'）').join('、')+'</span>');if(re)parts.push('<span style="color:#ef4444">底線 '+W(init)+'</span>');
 el.innerHTML=parts.join('<span class=h>｜</span>')+(sel?'<span class=x onclick="clrHi()" title="取消">✕</span>':'<span class=h style="margin-left:auto">↔ 拖動看各月</span>')}
const cvs=$('cv');let drag=false;
const setHi=e=>{if(!CH||!CH.geo)return;const r=cvs.getBoundingClientRect(),{a,b,pl,pr}=CH.geo;hi=Math.max(a,Math.min(b,Math.round(a+(e.clientX-r.left-pl)/(r.width-pl-pr)*(b-a))));draw()};
cvs.addEventListener('pointerdown',e=>{drag=true;try{cvs.setPointerCapture(e.pointerId)}catch(_){}setHi(e)});
cvs.addEventListener('pointermove',e=>{if(drag)setHi(e)});
['pointerup','pointercancel','lostpointercapture'].forEach(n=>cvs.addEventListener(n,()=>{drag=false}));
window.snap=()=>{const ce=curEff(),r=settle(S,ce);if(!r){alert('請先選結算日期（撥款日以後），並填入被動、主動市值與追蹤帳戶現金');return}
 const first=!hasSettle(),c=clone(ce);delete c.h;delete c._mv;delete c._miss;delete c.dtFix;if(c._cashEst){c.cEst=c._cashEst.from;delete c._cashEst}if(usePx(S)){if(num(S.cur.p)==null)c.p_auto=1;}
 const dk=sDate(S.cur),i=S.snaps.findIndex(s=>sDate(s)==dk);if(i>=0){if(!confirm(dk+' 已有結算，要覆蓋嗎？'))return;S.snaps[i]=c}else S.snaps.push(c);
 if(first)S.plan.d=TODAY;save();calc();toast('已儲存 '+dk+' 結算',0)};
window.ldSnap=i=>{const s=clone(S.snaps[i]);delete s.h;s.dtFix=1;if(s.pxs)S.px=clone(s.pxs);if(s.p_auto){s.p='';s.a=''}delete s.p_auto;delete s.nleS;delete s.pxs;S.cur=Object.assign(clone(DEF.cur),s);build();upd()};
window.freshCur=()=>{S.cur=Object.assign(clone(DEF.cur),{dt:TODAY,m:TODAY.slice(0,7)});build();upd()};
window.tab=k=>{if(!['F','R','S','Y'].includes(k)||isS())k='F';curT=k;['F','R','S','Y'].forEach(x=>{const p=$('pg'+x),b=$('tb'+x);if(p)p.style.display=x==k?'':'none';if(b)b.className=x==k?'on':''});ls('lct2',k);calc()};
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
window.exp=()=>{dl('loan-calc-'+TODAY+'.json',JSON.stringify(S,null,1),'application/json');ls('lcx',new Date().toISOString());ls('lch',sig());bkUpd()};
function bkUpd(){const el=$('bkS');if(!el)return;const last=ls('lcx'),dirty=ls('lch')!=sig(),days=last?Math.floor((Date.now()-Date.parse(last))/864e5):null;
 el.innerHTML=' '+(dirty?`<span class=wn>● 有變更尚未備份</span>（上次備份：${last?(days?days+' 天前':'今天'):'從未'}）`:`<span class=ok>✓ 已備份</span>（${last?new Date(last).toLocaleDateString('sv-SE'):''}）`)}
function bkRemind(){if(!S.ui)return;const last=ls('lcx'),dirty=ls('lch')!=sig(),days=last?(Date.now()-Date.parse(last))/864e5:Infinity,lr=ls('lcr');if(!dirty||days<7)return;if(lr&&(Date.parse(TODAY)-Date.parse(lr))/864e5<7)return;ls('lcr',TODAY);toast(last?'已超過 7 天沒備份，建議按「⬇️ 匯出設定檔」存到雲端硬碟':'還沒有備份過，建議按「⬇️ 匯出設定檔」存到雲端硬碟',0)}
window.expCsv=()=>{const ss=sortedSnaps(),tw=twr(S,ss.map(o=>o.s)),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['日期','被動(萬)','主動(萬)','帳戶現金(萬)','本期被動淨買進(萬)','本期主動淨買進(萬)','股息利息(萬)','0050還原價','0050累計報酬%','剩餘本金(元)','真實淨資產(萬)','Alpha面額(萬)','Alpha機會成本(萬)','XIRR%','被動報酬%','主動報酬%','備註']];
 ss.forEach((o,k)=>{const s=o.s,r=settle(S,s),t=tw[k];if(!r)return;rows.push([sDate(s),(+s.p).toFixed(2),(+s.a).toFixed(2),s.c,s.bp??'',s.ba??'',s.d??'',s.x50??'',r.sbOk?r.sb.toFixed(2):'',Math.round(r.rem),W2(r.real),W2(r.af),W2(r.ao),isNaN(r.x)?'':fx(r.x),t?t.rp.toFixed(2):'',t?t.ra.toFixed(2):'',s.note||''])});
 dl('loan-settlements-'+new Date().toISOString().slice(0,10)+'.csv','﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv')};
window.imp=el=>{const f=el.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const raw=JSON.parse(rd.result);if(typeof rpGuard=='function'&&!rpGuard(raw)){el.value='';return}const pu=S.ui,m=migrate(raw);S=m.o;fixCur();ls('lce',sigE());setTimeout(()=>{ls('lch',sig());ls('lcx',new Date().toISOString());bkUpd()},0);if(hasSettle())S.ui='pro';else if(!S.ui)S.ui=pu||'pro';$('chz').style.display='none';hi=null;lastE=[];save();build();tab(isS()?'F':curT);if(m.note)alert(m.note)}catch(e){alert('JSON 格式錯誤')}el.value=''};rd.readAsText(f)};
window.resetD=()=>{if(confirm('清除目前所有設定、出入金與結算紀錄，回到預設？（建議先匯出備份）')){ls('lc3',null);load();lastE=[];hi=null;build();tab('F');if(!S.ui)$('chz').style.display='flex'}};
window.showGd=()=>{$('gdn').checked=ls('lcg')=='1';$('gd').style.display='flex'};
window.closeGd=()=>{ls('lcg',$('gdn').checked?'1':null);$('gd').style.display='none'};
