// 🤖 AI 討論：「📋 問 AI」把 App 已經算好的資料整理成一段文字（複製或分享給任何 AI），
// AI 用「投資帳本 v1」回覆後，在「📥 貼上回覆」匯入（ai-import.js）。
// 分工：App 管數字和規則，AI 管查資料和挑毛病，你管決定和紀錄。
// 依賴 check.js（exEval、exTrig、ckGroups、ckAiText）、strategy-engine.js、asset-engine.js、asset-ui.js、ai-import.js

const AA_Q={exit:'出場訊號',buy:'買或加碼',review:'月底復盤',fill:'補資料',free:'自由提問',strat:'策略檢討'};
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
// 論點跟隨的策略版本的【何時賣】原文
function aaExitText(T,st){const v=+(T.sver||st.ver);if(v&&v!=+st.ver){const h=(st.hist||[]).find(h=>+h.ver==v);if(h&&h.snap&&h.snap.exit)return h.snap.exit}return st.exit||''}
// 接下來會改變判斷的資料公布日：月營收、財報期限、已記錄的事件（財報期限是一般公司的法定期限，金融業不同）
function aaNext(c){const out=[],y=+TODAY.slice(0,4),m=+TODAY.slice(5,7),d=+TODAY.slice(8,10),p2=n=>String(n).padStart(2,'0');
 {const nm=d<=10?m:m%12+1,ny=d<=10||m<12?y:y+1,rm=nm==1?12:nm-1;out.push({d:`${ny}-${p2(nm)}-10`,t:`${rm} 月營收公布期限`})}
 const FQ=[['03-31','年報（第四季）'],['05-15','第一季財報'],['08-14','第二季財報'],['11-14','第三季財報']],fs=[];
 for(const yy of[y,y+1])for(const[md,t]of FQ){const dd=`${yy}-${md}`;if(dd>=TODAY)fs.push({d:dd,t:t+'期限'})}
 out.push(...fs.slice(0,2));
 for(const e of(S.events||[]))if(!e.done&&cU(e.code)==c&&e.date>=TODAY)out.push({d:e.date,t:e.type+(e.note?'（'+e.note.slice(0,60)+'）':'')});
 return out.sort((a,b)=>a.d<b.d?-1:1).slice(0,5).map(o=>`${o.d} ${o.t}`)}
const aaPct=v=>v==null||!isFinite(v)?'—':(v>=0?'+':'')+v.toFixed(1)+'%';
function aaMarket(){const L=[],t=CK&&CK.mkt&&CK.mkt.taiex;
 if(t&&t.c)L.push(`加權指數 ${f2(t.c)}（${ckMD(CK.d)} 收盤），離 250 日高點 ${aaPct((t.c/t.hi250-1)*100)}，${t.c>=t.m20?'在月線之上':'低於月線'}、${t.c>=t.m60?'在季線之上':'低於季線'}`);
 try{const H=asHeatCap(S);if(H.tot!=null&&H.cap!=null)L.push(AA.amt?`壓力虧損 ${W2(H.tot)} 萬／剩下的虧損額度 ${W2(H.cap)} 萬（信貸虧損上限已用 ${H.L?H.L.used.toFixed(0):'—'}%）`:`壓力虧損約是剩下虧損額度的 ${H.cap>0?(H.tot/H.cap*100).toFixed(0):'—'}%（信貸虧損上限已用 ${H.L?H.L.used.toFixed(0):'—'}%）`)}catch(e){}
 const es=asExitStat(S);if(es.n)L.push(`出場訊號照規則賣出 ${es.f}／${es.n} 次`);
 return L.length?'【大環境】\n'+L.map(s=>'- '+s).join('\n'):''}
function aaStock(c){const T=aaThOf(c),st=T?stStrat(S,T.sid):(AA.sid?stStrat(S,AA.sid):null),L=[],E=stExposure(S),px=num((S.px||{})[c]),q=AA.q;
 const r=asRows(S).filter(o=>o.c==c&&o.open),qty=r.reduce((a,o)=>a+o.q,0),mv=r.reduce((a,o)=>a+(o.mv||0),0);
 const p=T?stPerf(S,T):null,avg=p&&p.q>0?p.cost/p.q:null,stop=T?num(T.stop):null;
 L.push(`■ ${c} ${nameOf(c)}${!T&&st?`｜還沒有論點，打算用 ${st.id} ${st.name} v${st.ver} 買進`:''}${T?`｜${T.id}｜${st?st.id+' '+st.name+' v'+(T.sver||st.ver):T.sid}｜${T.convFrom?`由 ${T.convFrom.id} 轉換，${T.convFrom.d} 起算`:+T.useInit===1?'撥款前持股，'+(T.baseD||T.created)+' 歸入策略'+(stBkPost(S,T)?`，之後加碼 ${stBkPost(S,T)} 筆（補記不算策略績效）`:''):'起算 '+(T.baseD||(p&&p.first)||T.created)}${T.status=='plan'?'｜規劃中（還沒買）':''}`:'｜沒有論點'}`);
 const pos=[];if(E.tot>0&&E.by[c])pos.push(`占主動資本 ${(E.by[c]/E.tot*100).toFixed(1)}%`);if(px!=null){const pd=(S.pxd||{})[c]||'',pa=(S.pxa||{})[c];pos.push(`現價 ${f2(px)}（${pd?ckMD(pd)+' ':''}${pa?'收盤':'自己填的'}）`)}if(avg!=null){pos.push(`策略均價 ${f2(avg)}`);if(px!=null)pos.push(`起算後損益 ${aaPct((px/avg-1)*100)}`)}
 if(stop!=null&&px!=null){pos.push(`停損 ${f2(stop)}（距現價 ${aaPct((stop/px-1)*100)}）`);if(E.tot>0&&qty)pos.push(`停損風險占主動資本 ${(qty*Math.max(0,px-stop)/E.tot*100).toFixed(1)}%${st&&num(st.riskPct)!=null?'（策略每筆 '+st.riskPct+'%）':''}`)}
 const rm=T&&p&&typeof stRmul=='function'?stRmul(T,p.ret):null;if(rm!=null)pos.push(`${rm>=0?'+':''}${rm.toFixed(2)}R`);
 if(AA.amt&&qty)pos.push(`股數 ${qty.toLocaleString()}｜市值 ${W2(mv)} 萬`);
 if(pos.length)L.push(pos.join('｜'));
 if(T){if(T.metLate)L.push(`註記：${T.metLate}`);const wd=T.created||T.baseD||'';if(T.why)L.push(`買進理由（${wd} 建立論點時寫的，裡面的數字不是現況）：${T.why}`);if(T.wrongIf)L.push(`什麼情況代表我錯了：${T.wrongIf}`)}
 if(T&&st&&T.status=='hold'&&(q=='exit'||q=='review'||q=='free'||q=='buy')){const X=exEval(T);if(X.length){L.push('出場條件（'+st.id+' 何時賣，逐條附判斷用的數字）：');
  for(const x of X){const a=exAckOf(T,x.key),r0=x.r,ic=a&&a.k=='na'?'🚫':!r0?'❔':r0.v===true?'🔴':r0.pre?'⏸':r0.v===false?'✓':'⏳';
   let ms=r0&&r0.miss||'';if(ms&&+T.useInit===1&&/進場前/.test(ms))ms+='（補記的論點沒有買進日，這一部分不判斷）';
   const nt=ic=='✓'?'沒有成立':ic=='⏳'?'資料不足':ic=='⏸'?'起算前就已公布的資料，不算':'';
   L.push(`  ${ic} ${x.lb}：${x.cond}${x.act?' → '+x.act:''}${nt?'｜'+nt:''}${r0&&(r0.why||ms)?`\n     （${[r0.why,ms].filter(Boolean).join('；')}）`:''}${a?`\n     ［我已決定：${EX_KN[a.k]||'已處理'}${a.n?'：'+a.n:''}${a.aiV?'；當時 AI：'+a.aiV:''}，${a.d}］`:''}${AA.th==T.id&&AA.rule==x.key?'\n     ← 這次要討論的訊號':''}`)}}
  if(q=='exit'){const tx=aaExitText(T,st);if(tx)L.push(`策略原文（${st.id} v${T.sver||st.ver}【何時賣】，規則適用與否只能引用這段）：\n${tx.split('\n').map(l=>'  '+l).join('\n')}`)}
  const G=typeof exTrig=='function'?exTrig(T).slice(0,4):[];if(G.length)L.push('收盤觸發價（均線、本益比用 '+ckMD(CK.d)+' 的檢核資料換算）：'+G.map(o=>`收盤 ${o.dir} ${o.ap?'約 ':''}${f2(o.px)}${o.gap!=null?'（距現價 '+aaPct(o.gap)+'）':''} ${o.what}`).join('；'))}
 if(st&&(q=='buy'||q=='review'||q=='free')&&CK){const G=ckGroups(st,c),M=new Set((T&&T.met)||(AT_DRAFT&&AT_DRAFT.met)||[]),done=T&&T.status=='hold'&&typeof ckDone=='function'?ckDone(T).n:0;L.push(`今日條件檢核（${st.id}${done?`，已買 ${done} 批，加碼只看下一批`:''}）：`);
  for(const g of G){const ok=[],rows=[],its=/依序/.test(g.rule||'')?g.items.slice(done,done+1):g.items;if(!its.length){L.push(`  【${g.sec}】已經全部買完`);continue}for(const i of its){const r0=i.r;let ic;if(r0)ic=g.need=='none'?(r0.v===true?'⛔':r0.v===false?'✓':'⏳'):(r0.v===true?'✅':r0.v===false?'❌':'⏳');else ic=M.has(i.t)?'☑️':'❔';
    if((ic=='✅'||ic=='✓')&&AA.merge){ok.push(i.t.replace(/〔[^〕]*〕/g,''));continue}rows.push(`    ${ic} ${i.t}${r0&&(r0.why||r0.miss)?'（'+[r0.why,r0.miss].filter(Boolean).join('；')+'）':!r0?(M.has(i.t)?'（我確認過符合）':'（要自己判斷）'):''}`)}
   L.push(`  【${g.sec}】${g.need=='none'?'任何一項成立就不買':g.need=='all'?'需要全部':g.need?'至少 '+g.need+' 項':''}`);if(ok.length)L.push(`    ${g.need=='none'?'✓ 沒有':'✅ 符合'}：${ok.join('、')}`);L.push(...rows)}}
 if(q=='buy'&&st){const bl=aaBuyLine(c,T,st);if(bl)L.push(bl)}
 // 前瞻資料
 const o=(S.outlook||{})[c]||{},ep=(o.eps||[]).filter(e=>e.d&&dDays(e.d,TODAY)<=200).sort((a,b)=>a.d<b.d?1:-1);
 if(ep.length)L.push('法人 EPS 預估：'+ep.map(e=>`${e.y} 年 ${e.v}（${e.src||'未註明'}，${e.d}）`).join('；'));
 if(o.guide&&o.guide.d)L.push(`法說指引（${o.guide.d}）：營收${olDirN(o.guide.rev)}、毛利率${olDirN(o.guide.gm)}${o.guide.note?'｜'+o.guide.note:''}`);
 const at=(S.attr||{})[c]||{},th=at.theme&&(S.themes||{})[at.theme];
 const ab=[['growth','結構性成長'],['cyc','景氣循環'],['lead','產業龍頭']].filter(([k])=>at[k]!=null&&at[k]!=='').map(([k,n])=>n+(+at[k]?'：是':'：否'));if(at.theme)ab.push(`主題：${at.theme}${th&&th.st?'（'+olDirN(th.st)+(th.d?'，'+th.d:'')+(th.note?'，'+th.note:'')+'）':'（狀態還沒填）'}`);if(ab.length)L.push('股票屬性：'+ab.join('、'));
 const nx=aaNext(c);if(nx.length)L.push('接下來的資料公布日：'+nx.join('；'));
 if(T){const lg=(T.exLog||[]).slice(-4);if(lg.length)L.push('過去的出場決定：'+lg.map(x=>`${x.d} ${x.lb||''} ${EX_KN[x.k]||x.k}${x.n?'（'+x.n+'）':''}${x.aiV?`［當時 AI：${x.aiV}］`:''}`).join('；'));
  const rv=(T.aiRev||[]).slice(-3);if(rv.length)L.push('之前 AI 的看法：'+rv.map(x=>`${x.d} ${x.rule||''}：${x.view}${x.ai?'（'+x.ai+'）':''}`).join('；'))}
 return L.join('\n')}
// 買進試算：用表單的股數（從記交易表單來）或建議股數，算買進後的占比、主題占比、壓力虧損變化
function aaBuyLine(c,T,st){const px=num((S.px||{})[c]);if(px==null)return'';const E=stExposure(S);if(!(E.tot>0))return'';
 const sc=typeof stStopCalc=='function'?stStopCalc(st,c,px):null,stop=num(T&&T.stop)??(sc&&sc.v!=null?sc.v:(num(st.stopPct)?px*(1-num(st.stopPct)/100):null));
 const fq=AT_DRAFT&&cU(AT_DRAFT.c)==c?num(AT_DRAFT.q):null,sh=stop!=null&&stop<px?asSizeHint(S,px,(1-stop/px)*100,st.riskPct):null,q=fq??(sh?sh.q:null);if(!q)return'';
 const add=q*px,cap=stCapStock(S,c),g=stGrpOf(S,c)[0],gv=g?(E.grp[g]||0):0,gc=g?stCapGroup(S,g):null,H=typeof asHeatCap=='function'?asHeatCap(S):null,dH=H&&H.q!=null&&stop!=null?q*(px-stop)*H.q:null;
 return`買進試算（${fq!=null?'表單上的':'建議'} ${q.toLocaleString()} 股 × ${f2(px)}${stop!=null?`，停損 ${f2(stop)}`:''}）：買進後這檔占主動 ${((E.by[c]||0)/E.tot*100).toFixed(1)}% → ${(((E.by[c]||0)+add)/E.tot*100).toFixed(1)}%（上限 ${cap}%）${g?`；主題「${g}」${(gv/E.tot*100).toFixed(1)}% → ${((gv+add)/E.tot*100).toFixed(1)}%（上限 ${gc}%）`:''}${dH!=null?`；壓力虧損 +${W2(dH)} 萬（目前 ${W2(H.tot)} 萬，剩下額度 ${W2(H.cap)} 萬）`:''}`}
// 月底復盤：這個月每一筆「不照做」「不適用」的原因
function aaMonthSkips(){const d0=ckAddD(TODAY,-31),L=[];for(const T of S.theses||[])for(const x of T.exLog||[]){if(!x.d||x.d<d0||(x.k!='skip'&&x.k!='na'))continue;L.push(`- ${x.d} ${T.id} ${cU(T.code)} ${nameOf(T.code)}「${x.lb||x.key}」${EX_KN[x.k]||x.k}：${String(x.n||'（沒寫原因）').replace(/\n+/g,' ').slice(0,300)}`)}return L}
function aaPortfolio(){const L=['【組合】'],E=stExposure(S);const by={};for(const T of S.theses||[]){if(T.status!='hold')continue;(by[T.sid]=by[T.sid]||[]).push(T.id+' '+cU(T.code))}
 for(const st of S.strategies||[])if(by[st.id])L.push(`- ${st.id} ${st.name} v${st.ver}：${by[st.id].join('、')}`);
 const pas=holdings(S).filter(h=>h.ac=='p'&&h.q>0).map(h=>cU(h.n));if(pas.length)L.push(`- 被動：${[...new Set(pas)].join('、')}`);
 return L.join('\n')}
function aaRed(){for(const c of aaCodes()){const T=aaThOf(c);if(!T||T.status!='hold')continue;for(const x of exEval(T)){const a=exAckOf(T,x.key);if(x.r&&x.r.v===true&&!(a&&a.k=='na'))return true}}return false}
function aaAsk(){const q=AA.q,T=AA.th?stThesis(S,AA.th):null,x=T&&AA.rule?(exEval(T).find(z=>z.key==AA.rule)||null):null,ex=(AA.free||'').trim();
 if(q=='exit')return`【要你做的事】
${x||aaRed()?`${x?`這次要討論的是 ${T.id} ${cU(T.code)} ${nameOf(T.code)} 的「${x.lb}：${x.cond}」。`:'上面標 🔴 的出場訊號。'}請只查三件事，決定由我做：
1. App 給的資料對不對（附來源和日期）。
2. 這條規則的適用前提成不成立（只能引用上面的策略原文）。
3. 有沒有一次性因素（例如存貨跌價、匯兌、業外）。
以上三項都查不到，預設照規則。`:`目前沒有成立的出場訊號（沒有 🔴），不要自己找一條當成訊號。請查三件事：
1. App 給的資料對不對（附來源和日期），特別是 ✓ 和 ⏳ 那幾條用到的數字。
2. 哪一條最接近成立、還差多少，下一次可能成立是哪一天（看「接下來的資料公布日」）。
3. 有沒有一次性因素讓數字失真（例如存貨跌價、匯兌、業外、專案認列時點）。`}
回答開頭請先用三行：① 資料有沒有錯 ② 有沒有規則成立 ③ 最接近成立的條件和日期。之後才寫細節。${ex?'\n補充：'+ex:''}`;
 if(q=='buy')return`【要你做的事】
1. App 給的資料對不對（附來源和日期），特別是 ❌、⏳ 那幾條用到的數字。
2. 照目前的規則還差哪些條件；【不買】有任何一項成立就先寫出來。加碼只看下一批的條件。
3. 要自己判斷的條件（❔）和缺的前瞻資料（法人 EPS 預估、法說指引、主題狀態），查有沒有最新、有來源的資料。
回答開頭請先用三行：① 資料有沒有錯 ② 還差哪些條件（含【不買】有沒有成立）③ 補了哪些前瞻資料、來源。之後才寫細節。${ex?'\n補充：'+ex:''}`;
 if(q=='review'){const sk=aaMonthSkips();return`【這個月的「不照做」與「不適用」】
${sk.length?sk.join('\n'):'（這個月沒有）'}

【要你做的事】月底復盤
1. 上面每一筆「不照做」「不適用」的原因，現在還成不成立（逐筆回答，附來源）。
2. 有沒有違反規則的地方：照規則比例、超過上限（個股、主題、策略）、壓力虧損。
3. 更新每一檔的法人 EPS 預估與主題狀態（附來源）。
4. 下個月要注意的資料公布日（營收、財報、法說、除息）。
已平倉的論點不到 20 筆，不評論策略有沒有效；策略規則的修改只在每季檢討時做，這次不要提出策略修改。
回答開頭請先用三行：① 有沒有違反規則 ② 這個月最該處理的 3 件事 ③ 下個月的資料公布日。之後才寫細節。${ex?'\n補充：'+ex:''}`}
 if(q=='fill')return`【要你做的事】補資料
上面每一項，查有沒有最新、有來源的資料：
- 每一項寫年度，並註明是共識值（幾家機構的中位數）還是單一機構。
- 和 App 現有資料差 15% 以上的，另外列出來並說明原因。
- 查不到的寫「查不到」，並寫查過哪裡；不要推算。
- 找資料時看到的法說、財報、除息日期，放進 events。
回答開頭請先用兩行：① 找到幾項、查不到幾項 ② 哪些和 App 現有資料差很多。之後才寫細節。${ex?'\n補充：'+ex:''}`;
 if(q=='free')return`【我的問題】\n${ex||'（請在 App 裡填寫問題）'}\n\n要匯回 App 的內容只能有 outlook（前瞻資料）和 events（之後的日期）。`;return''}
// 回答規則依問題類型（2026-11-12）：原本 5 條都是為出場寫的，買進、復盤也套同一套
const AA_R0='三種來源分開標：【App】上面 App 給的數字、【查到】你查到的（附來源和日期）、【推論】你自己的推論。',AA_REPS='EPS 預估只輸出寫明機構、日期、數字的；未具名來源不要輸出。查不到就寫查不到，不要推算。';
const AA_RQ={exit:['先寫最不利於續抱的解讀，再寫另一面。','不建議放寬停損或延後出場；認為規則不適用時，只能引用策略原文或指出資料錯誤。',AA_REPS,'決定由我做，不用替我選「照規則賣出／不適用／不照做」。'],
 buy:['先寫最不利於買進的解讀，再寫另一面。','不建議放寬條件，也不要用「快符合了」代替符合；【不買】成立就是不買。',AA_REPS,'manual 的 ok 只能是 true（符合）、false（不符合）、null（查不到），每一筆都要附 src；App 只顯示，不會替我勾。','決定由我做。'],
 review:['先寫照規則的看法，再寫例外。','已平倉的論點不到 20 筆，不評論策略有沒有效；不提出策略修改。',AA_REPS,'決定由我做。'],
 fill:[AA_REPS,'每一項寫年度、共識值或單一機構；和 App 現有資料差 15% 以上的另外列出；查不到的寫查過哪裡。'],
 free:[AA_REPS,'決定由我做。'],
 strat:['每一項修改都要標 dir（loosen 放寬／tighten 收緊）和 basis（logic 邏輯／limit 硬限制／test 事前登記的測試），沒有依據的不要提。','放寬的修改（停損變寬、條件變鬆、上限變大）只適用之後新建的部位；大盤從高點回檔 10% 以上的期間不放寬。','不接受「用同一段歷史資料再調一次參數」當依據；要測的寫成「待回測」，不要直接改。','已平倉的論點不到 20 筆時，不用勝率判斷策略好壞。','決定由我做。']};
const aaRules=q=>'【回答規則】\n'+[AA_R0].concat(AA_RQ[q]||AA_RQ.free).map((t,i)=>`${i+1}. ${t}`).join('\n');
// 每種問題可以匯回 App 的欄位；匯入端也用同一張表檢查（ai-import.js）
const AA_QK={exit:['review','outlook','events'],buy:['manual','outlook','events'],review:['outlook','themes','events'],fill:['outlook','themes','events'],free:['outlook','events'],strat:['strategies']};
function aaFmt(snap){const q=AA.q,y=+TODAY.slice(0,4),CS=new Set(q=='strat'?[]:aaCodes()),Ts=(S.theses||[]).filter(T=>q!='strat'&&T.status!='exit'&&(CS.has(cU(T.code))||T.id==AA.th)).map(T=>{const st=stStrat(S,T.sid);return`${T.id} ${cU(T.code)} ${T.sid} v${T.sver||(st&&st.ver)||''}`});
 const ex={format:'投資帳本 v1',ai:'你的名稱（例如 Claude、Gemini）',q,snap};
 const T0=(AA.th&&stThesis(S,AA.th))||aaThOf(aaCodes()[0]||'')||(S.theses||[])[0]||{id:'T001',code:'2301'},x0=AA.th&&AA.rule&&T0?(exRules(stStrat(S,T0.sid))||[]).find(z=>z.key==AA.rule):null,c0=cU(T0.code||'2301');
 const D0='<YYYY-MM-DD>',rv={thesis:T0.id,rule:x0?x0.lb:'<規則名稱>',view:'<五種看法之一>',why:'<一句話>',src:[{name:'<來源>',date:D0,url:'<網址>'}]},ol={code:c0,eps:[{year:'<年度>',eps:'<數字>',src:'<機構（引用的媒體）>',date:D0}],guide:{rev:'<up/flat/down>',gm:'<up/flat/down>',date:D0,src:'<法說會或公告>',note:'<一句重點>'}},
  tm={name:'<主題名稱>',status:'<up/flat/down>',date:D0,src:'<來源>',note:'<一句重點>'},ev={date:D0,code:c0,type:'<法說／財報／除息／營收>',note:'<一句重點>'},up={thesis:T0.id,stop:'<新的停損價>'};
 const K=AA_QK[q]||AA_QK.free;
 const sg={id:'S01',reason:'<一句話：為什麼改>',dir:'<loosen/tighten>',basis:'<logic/limit/test>',stopPct:'<只放要改的欄位>'};
 const mn={code:c0,cond:'<條件原文（照上面的寫法）>',ok:'<true/false/null>',why:'<一句話>',src:[{name:'<來源>',date:D0}]};
 const D={manual:'manual：要自己判斷的條件（❔）你的看法，一條一筆，cond 照抄條件原文；App 只顯示你的看法，不會替我勾',review:`review：每一條討論的訊號一筆。view 只能是「${AA_VIEW.join('／')}」其中一個，每一筆都要附 src（來源、日期）`,outlook:'outlook：有查到才放；eps 要寫明機構與日期，guide 的 rev、gm 用 up／flat／down',themes:'themes：主題狀態 status 用 up／flat／down，附來源與日期',events:'events：之後要注意的日期（法說、財報、除息）',updates:'updates：只能把停損價往上調（收緊），不要往下調',strategies:'strategies：每個要改的策略一筆，只放要改的欄位（name、logic、term、screen、entry、exit、holdMin、holdMax、capStock、capGroup、capStrat、stopPct、stopTech、riskPct、rr、addDays、addPx、addPxPct、addHalt），加 reason、dir、basis；版本號 App 自己加'};
 const eg=Object.assign({},ex);for(const k of K)eg[k]=[{manual:mn,review:rv,outlook:ol,themes:tm,events:ev,updates:up,strategies:sg}[k]];
 return`【輸出格式】
最後請把要匯回 App 的內容放在一個 \`\`\`json 區塊，格式是「投資帳本 v1」，只放有根據的內容：
- 一定要有 "format"、"ai"（你的名稱）、"q":"${q}"、"snap":"${snap}"（照抄，App 用來檢查資料有沒有變）
${K.map(k=>'- '+D[k]).join('\n')}
${q=='strat'?'- 只能有 strategies；不要輸出 trades、theses、updates、outlook。':'- 只能有上面列的欄位；不要輸出 strategies、trades、theses、updates：策略修改只在每季檢討時做，交易和停損我自己記。'}
範例（只示範格式；< > 裡要換成真實內容，數字和 true/false 不加引號，查不到的欄位整個拿掉，不要照抄）：
${JSON.stringify(eg)}${Ts.length?'\n這次範圍內的論點與策略版本：'+Ts.join('｜'):''}`}
// 策略檢討（2026-11-12）：只放策略、共同規則、比例類的風險設定與（選擇附上的）不含金額的績效；不放持股、金額
// 加權指數離 250 日高點幾 %（策略檢討與匯入檢查用；回檔 10% 以上不放寬規則）
const aaDD=()=>{const t=CK&&CK.mkt&&CK.mkt.taiex;return t&&t.c&&t.hi250?(t.c/t.hi250-1)*100:null};
function aaStrat(){const L=[],dd=aaDD();
 L.push(`【大環境】加權指數${dd!=null?`離 250 日高點 ${aaPct(dd)}${dd<=-10?'（回檔 10% 以上：這段期間不放寬規則）':''}`:'：沒有資料'}`);
 L.push(`【共同規則與依據】（我手寫的）\n${String(S.stratDoc||'（還沒填）').trim()}`);
 L.push(`【風險設定（比例）】信貸虧損上限＝貸款金額 ${S.loss??'—'}%，分段：50% 停止加碼、75% 主動減半、100% 主動全出、150% 被動也出；壓力跌幅 ${S.stressP??25}%；買回後重新起算最多 ${S.lossRebuyMax??1} 次`);
 if(AA.perf){const P=[];for(const st of S.strategies||[]){if(!+st.on)continue;const it=stThesisItems(S,st.id).filter(o=>!stBk(o.T)),a=stAgg(it);P.push(`- ${st.id}：持有中 ${a.open||0}、已出場 ${a.closed||0}${a.win!=null?`、勝率 ${a.win.toFixed(0)}%`:''}${a.sn?`、出場訊號照規則 ${a.sf}／${a.sn}`:''}`)}
  const ex=typeof asExitStat=='function'?asExitStat(S):null;L.push(`【我的執行紀錄（不含金額；補記的論點不算）】\n${P.join('\n')||'（沒有）'}${ex?`\n出場訊號照規則賣出 ${ex.f}／${ex.n} 次`:''}`)}
 L.push('【策略】\n'+(S.strategies||[]).filter(s=>+s.on).map(s=>stMdOne(s,{hist:1})).join('\n\n'));
 L.push(`【要你做的事】策略檢討
1. 每個策略的規則有沒有邏輯矛盾、寫不清楚、工具判斷不了的地方（指出是哪一條）。
2. 有依據的修改建議：每一項寫清楚改哪個欄位、改成什麼、放寬或收緊、依據是什麼。
3. 只是想法、還需要驗證的，寫成「待回測」，不要放進 json。
回答開頭請先用三行：① 有沒有矛盾或判斷不了的規則 ② 建議修改幾項（放寬幾項、收緊幾項）③ 建議回測的項目。之後才寫細節。${(AA.free||'').trim()?'\n補充：'+AA.free.trim():''}`);return L.join('\n\n')}
function aaText(){const snap=aaSnap(),q=AA.q,P=[q=='strat'?`【投資帳本｜${AA_Q[q]}】${TODAY}｜只有策略與比例，不含持股與金額｜快照 ${snap}`:`【投資帳本｜${AA_Q[q]}】${TODAY}｜現價各檔另標日期；其他指標（均線、本益比、法人、營收、財報）是 ${CK?CK.d:'—'} 的檢核資料｜快照 ${snap}`,'分工：App 管數字和規則，AI 管查資料和挑毛病，我管決定和紀錄。'];
 if(q=='strat'){P.push(aaStrat());P.push(aaRules(q));P.push(aaFmt(snap));return P.join('\n\n')}
 if(q=='fill'){let t=typeof ckAiText=='function'?ckAiText():'';const k=t.indexOf('最後請用');if(k>0)t=t.slice(0,k).trim();P.push(t||'目前沒有待補資料。');P.push(aaAsk());P.push(aaRules(q));P.push(aaFmt(snap));return P.join('\n\n')}
 P.push(aaMarket());if(q=='review')P.push(aaPortfolio());const C=aaCodes();
 if(!C.length&&q!='free')P.push('（這個範圍沒有股票）');for(const c of C)P.push(aaStock(c));
 P.push(aaAsk());P.push(aaRules(q));P.push(aaFmt(snap));return P.filter(Boolean).join('\n\n')}

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
 ${AA.q=='strat'?`<div class=h style="margin-top:6px">範圍：所有啟用中的策略、「📚 策略庫 → 📝 共同規則與依據」、比例類的風險設定；不附持股與金額。</div><label class=ck><input type=checkbox ${AA.perf?'checked':''} onchange="aaSet('perf',this.checked?1:0)">附我的執行紀錄（筆數、勝率、照規則比例，不含金額）</label>`:AA.q=='fill'?`<div class=h style="margin-top:6px">範圍：資產頁「✏️ 待補資料」裡缺的與要更新的資料。</div>`:`<div class=sub>範圍</div><select onchange="aaSet('scope',this.value)">${scs}</select>
 ${AA.scope=='pick'?`<div class=aipk>${aaActive().map(c=>`<label class=ck><input type=checkbox ${AA.codes.includes(c)?'checked':''} onchange="aaPick('${c}',this.checked)">${nm(c)}</label>`).join('')}</div>`:''}`}
 ${AA.q=='free'?`<div class=sub>你的問題</div><textarea id=aaFree rows=3 style="width:100%" oninput="AA.free=this.value" onchange="aaRender()">${esc(AA.free)}</textarea>`:`<details ${AA.free?'open':''}><summary class=h>補充問題（可不填）</summary><textarea id=aaFree rows=2 style="width:100%" oninput="AA.free=this.value" onchange="aaRender()">${esc(AA.free)}</textarea></details>`}
 ${AA.q=='strat'?'':`<label class=ck><input type=checkbox ${AA.amt?'checked':''} onchange="aaSet('amt',this.checked?1:0)">附上股數與金額（預設只放比例；貼給其他公司的 AI 時建議不勾）</label>
 <label class=ck><input type=checkbox ${AA.merge?'checked':''} onchange="aaSet('merge',this.checked?1:0)">買進條件裡已符合的合併成一行（出場條件一律逐條附數字）</label>`}
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
