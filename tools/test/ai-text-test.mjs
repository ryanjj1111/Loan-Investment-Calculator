// 「🤖 AI 討論」複製文字的快照測試：固定的虛構設定檔＋固定的檢核資料 → 每種問題的文字要和 tools/test/ai/*.txt 一樣。
// 這些文字是產品邏輯的一部分（AI 照它回答、App 照它檢查匯入），改壞了不容易發現。
//   node tools/test/ai-text-test.mjs            比對
//   node tools/test/ai-text-test.mjs --update   刻意改了文字、確認新文字正確後才更新
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),D=path.join(ROOT,'tools/test/ai');
const TODAY='2026-11-12';
const files=['data/stocks.js','js/engine.js','js/ui.js','js/strategy-engine.js','js/asset-engine.js','js/prices.js','js/check.js','js/outlook.js','js/strategy-ui.js','js/asset-ui.js','js/eval.js','js/ai-import.js','js/ai-ask.js'];
let src=files.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n').replace(/const TODAY=\(\(\)=>\{[^\n]*?\}\)\(\);/,`const TODAY='${TODAY}';`);
if(!src.includes(`const TODAY='${TODAY}'`))throw new Error('engine.js 的 TODAY 寫法改了，請更新測試');
// 沒有瀏覽器：document、localStorage 用假的（只要不丟錯）
const el=()=>new Proxy(function(){},{get:(t,k)=>k==='style'||k==='dataset'||k==='classList'?new Proxy({},{get:()=>()=>{}}):k==='value'||k==='innerHTML'||k==='textContent'?'':k==='children'||k==='options'?[]:k===Symbol.toPrimitive?()=>'':el(),set:()=>true,apply:()=>el()});
const ctx=vm.createContext({console,Math,JSON,Date,Intl,Promise,setTimeout:()=>0,clearTimeout(){},document:new Proxy({},{get:(t,k)=>k==='querySelectorAll'||k==='getElementsByClassName'?()=>[]:k==='getElementById'||k==='querySelector'?()=>el():k==='createElement'?()=>el():el()}),
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{userAgent:''},location:{href:'',protocol:'file:',search:''},addEventListener(){},matchMedia:()=>({matches:false}),indexedDB:{open(){return{}}},fetch:async()=>({ok:false,json:async()=>({})}),alert(){},confirm:()=>true,prompt:()=>''});
ctx.window=ctx;ctx.globalThis=ctx;ctx.AS_HOUR=20;   // 固定「晚上 8 點」：資料日期判斷才不會跟著執行時間變
vm.runInContext(src,ctx,{filename:'app.js'});const run=c=>vm.runInContext(c,ctx);
ctx.__S=JSON.parse(fs.readFileSync(path.join(D,'settings.json'),'utf8'));ctx.__CK=JSON.parse(fs.readFileSync(path.join(D,'chk.json'),'utf8'));
run(`S=migrate(__S).o;CK=__CK;for(const k in CKM)delete CKM[k];stSync(S);`);
const cases={eval:`aaInit({q:'eval',codes:['2454','2330'],sid:'S01',from:'eval'})`,exit:`aaInit({q:'exit',codes:['2330']})`,exitNoRed:`aaInit({q:'exit',codes:['2454']})`,buy:`aaInit({q:'buy',codes:['2454']})`,review:`aaInit({q:'review'})`,fill:`aaInit({q:'fill'})`,free:`aaInit({q:'free'});AA.free='這兩檔接下來的法說會重點？'`,strat:`aaInit({q:'strat'});AA.perf=1;S.stratDoc='測試：共同規則。'`,pre:`aaInit({q:'pre'})`};
const up=process.argv.includes('--update');let bad=0;
for(const [k,init] of Object.entries(cases)){run(`for(const k in CKM)delete CKM[k];AA_CTX=null;AT_DRAFT=null;${init};`);const got=run('aaText()').replace(/快照 K[0-9a-z]+/g,'快照 K—').replace(/"snap":"K[0-9a-z]+"/g,'"snap":"K—"');const f=path.join(D,k+'.txt');
 if(up||!fs.existsSync(f)){fs.writeFileSync(f,got);console.log('已寫入',k);continue}
 const exp=fs.readFileSync(f,'utf8');if(exp===got){console.log('✓',k);continue}bad++;const a=exp.split('\n'),b=got.split('\n');const i=a.findIndex((l,j)=>l!==b[j]);console.log(`✗ ${k}：第 ${i+1} 行不同\n   預期：${a[i]}\n   得到：${b[i]}`)}
// 匯入端：問題類型不該有的欄位要預設不勾
run(`AA_CTX=null;__P=aiPlan({format:'投資帳本 v1',ai:'T',q:'exit',outlook:[{code:'2330',eps:[{year:2027,eps:60,src:'某投顧',date:'${TODAY}'}]}],updates:[{thesis:'T001',stop:500}],strategies:[{id:'S01',ver:9,reason:'x',stopPct:30}]})`);
const P=ctx.__P,okU=P.up.every(it=>!it.on),okS=P.sg.every(it=>!it.on),okO=P.ol.every(it=>it.on||it.sus);
console.log(`${okU&&okS?'✓':'✗'} 出場訊號的回覆裡有 updates、strategies → 預設不勾（${(P.qBad||[]).join('、')}）`);if(!(okU&&okS))bad++;
// 匯出「只有策略」：只能有白名單裡的欄位（擋不住自由文字，所以「附版本紀錄」預設不附）
{const o=run('stExpObj(S,{})'),ok=o.kind=='strategies'&&o.strategies.length>0&&o.strategies.every(x=>Object.keys(x).every(k=>run('ST_EXP_KEYS').includes(k)))&&!('theses' in o)&&!('trades' in o);console.log(`${ok?'✓':'✗'} 只有策略的匯出只含白名單欄位`);if(!ok)bad++;
 const h=run('stExpObj(S,{hist:1})'),okh=h.strategies.every(x=>(x.hist||[]).every(z=>Object.keys(z).every(k=>['ver','date','reason'].includes(k))));console.log(`${okh?'✓':'✗'} 附版本紀錄時只有版本、日期、原因`);if(!okh)bad++}
// 策略檢討：標收緊但數字變大 → 預設不勾
run(`__P=aiPlan({format:'投資帳本 v1',ai:'T',q:'strat',strategies:[{id:'S01',reason:'x',dir:'tighten',basis:'logic',stopPct:'40'},{id:'S02',reason:'y',dir:'tighten',basis:'logic',stopPct:'1'}]})`);
{const P=ctx.__P,a=P.sg[0],b=P.sg[1],ok=!a.on&&b.on;console.log(`${ok?'✓':'✗'} 策略檢討：停損變寬卻標收緊 → 預設不勾；真的收緊 → 預設勾`);if(!ok)bad++}
// 別人的策略檔：編號撞到預設「新增成另一個編號」
run(`__P=aiPlan({format:'投資帳本 v1',kind:'strategies',strategies:[{id:'S01',ver:3,name:'朋友的策略',stopPct:'12',exit:'1. 停損：跌破均價 −12%，全部賣出'}]})`);
{const it=ctx.__P.sg[0],ok=it.asNew===1&&it.parse&&it.parse.xn===1;console.log(`${ok?'✓':'✗'} 匯入策略檔：編號撞到預設新增；顯示讀得懂幾條（出場 ${it.parse&&it.parse.xa}／${it.parse&&it.parse.xn}）`);if(!ok)bad++}
// 評估新股票（2026-11-13）：EPS 沒寫機構和日期 → 剔除；App 判斷不是 ✅ 的論點預設不勾，勾了標「規則外觀察」；停損、分批由 App 算
run(`__S0=clone(S);AA_CTX={from:'eval',src0:'screen'};__P=aiPlan({format:'投資帳本 v1',ai:'T',q:'eval',theses:[{code:'0050',strategy:'S01',why:'測試',wrongIf:'測試',risk:'測試風險',stop:1,plan:[{n:1,pct:50}]}],outlook:[{code:'0050',eps:[{year:2027,eps:10,src:'法人',date:'${TODAY}'},{year:2027,eps:11,src:'測試投顧',date:'${TODAY}'}]}]})`);
{const P=ctx.__P,t=P.th[0],o=P.ol[0],ok1=t&&!t.on&&t.stop==null&&!t.plan.length&&t.warn.some(w=>/規則外觀察/.test(w)),ok2=o&&o.eps.length==1&&o.warn.some(w=>/剔除/.test(w));
 console.log(`${ok1?'✓':'✗'} 評估：App 判斷不是 ✅ 的論點預設不勾，AI 給的停損和分批略過`);if(!ok1)bad++;console.log(`${ok2?'✓':'✗'} 評估：EPS 沒寫明機構的剔除`);if(!ok2)bad++;
 t.on=1;run('aiApplyTo(__P)');const T=run(`S.theses.find(T=>cU(T.code)=='0050'&&T.sid=='S01')`),ok3=T&&T.status=='plan'&&T.ovr&&T.src0=='screen'&&T.riskNote=='測試風險';console.log(`${ok3?'✓':'✗'} 評估：勾了建立規劃中論點，標規則外觀察、來源、最大風險`);if(!ok3)bad++}
run(`S=clone(__S0);for(let k=0;k<5;k++)S.theses.push(stNewThesis(S,{code:'990'+k,sid:'S01',sver:1,status:'plan',created:'${TODAY}'}));__P=aiPlan({format:'投資帳本 v1',ai:'T',q:'eval',theses:[{code:'0050',strategy:'S01',why:'x'}]})`);
{const ok=ctx.__P.th[0].err.some(e=>/上限/.test(e));console.log(`${ok?'✓':'✗'} 評估：規劃中論點已有 5 個 → 不能再建立`);if(!ok)bad++}
run(`S=__S0;AA_CTX=null;for(const k in CKM)delete CKM[k]`);
if(bad){console.log(`\n${bad} 項不一致。刻意改了文字並確認正確後：node tools/test/ai-text-test.mjs --update`);process.exit(1)}
