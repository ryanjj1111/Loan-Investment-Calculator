// 出場與進場條件的判斷測試：條件文字 → 成立／不成立／資料不足／⏸（起算前已知）。
// 這些判斷直接驅動賣出提醒，改到 js/check.js 時一定要跑：node tools/test/check-test.mjs
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const TODAY='2026-11-11';
let src=['js/engine.js','js/strategy-engine.js','js/check.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n').replace(/const TODAY=\(\(\)=>\{[^\n]*?\}\)\(\);/,`const TODAY='${TODAY}';`);
const noop=()=>null,el={style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){}};
const ctx=vm.createContext({console,document:{getElementById:noop,querySelector:noop,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el,body:el},localStorage:{getItem:noop,setItem(){}},navigator:{},location:{href:''},setTimeout,fetch:async()=>({ok:false})});ctx.window=ctx;
vm.runInContext(src,ctx);const run=c=>vm.runInContext(c,ctx);
const F=['c','m20','m60','m120','gm','ry','rLag','epsQ','jp','hi250'];
function m(o){return o}
// 每個案例：條件文字、這檔的資料、前瞻資料、論點（起算日、kn）→ 預期 v（true／false／null）與 pre
function check(name,text,o,want){
 ctx.__o=o;run(`for(const k in CKM)delete CKM[k];S={outlook:__o.outlook||{},theses:[],strategies:[],trades:[]};CK={f:${JSON.stringify(F)},s:{'9999':${JSON.stringify(F)}.map(k=>__o.m[k]??null)},rM:'2026-10',mkt:{},ind:{}};
  CKX={c:'9999',st:null,T:__o.T||null,start:(__o.T&&__o.T.baseD)||'',first:'',avg:null};EXPRE=false;__r=ckRun(ckParse(exNorm(${JSON.stringify(text)})),ckM('9999'),CK.mkt);`);
 const r=ctx.__r,got={v:r?r.v:undefined,pre:!!(r&&r.pre)},ok=got.v===want.v&&got.pre===!!want.pre;
 console.log(`${ok?'✓':'✗'} ${name}${ok?'':`：預期 ${JSON.stringify(want)}，得到 ${JSON.stringify(got)}｜${r&&(r.why||r.miss)}`}`);return ok}
const e=(y,v,d,src)=>({y,v,d,src});
const C=[];
// 法人 EPS 預估下修 > 10%（明年＝2027）
C.push(check('EPS 比 3 個月前下修 12%','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2027,100,'2026-08-20','FactSet（a）'),e(2027,88,'2026-11-01','FactSet（b）')]}},T:{baseD:'2026-07-01'}},{v:true}));
C.push(check('EPS 下修 7.5% 沒到門檻','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2027,123.18,'2026-08-20','FactSet'),e(2027,113.99,'2026-11-01','FactSet')]}},T:{baseD:'2026-07-01'}},{v:false}));
C.push(check('連續小幅下修：比起算時 −12% 成立','法人明年 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2027,100,'2026-05-01','FactSet'),e(2027,93,'2026-08-20','FactSet'),e(2027,88,'2026-11-01','FactSet')]}},T:{baseD:'2026-05-10'}},{v:true}));
C.push(check('新舊各一家、不同來源 → ❔','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2027,100,'2026-08-20','元大投顧'),e(2027,80,'2026-11-01','凱基投顧')]}}},{v:null}));
C.push(check('嘉澤：兩筆都在起算前 → ⏸','法人 EPS 預估下修 > 5%',{m:{c:100},outlook:{'9999':{eps:[e(2027,123.18,'2026-08-14','FactSet 分析師中位數（18 位）'),e(2027,113.99,'2026-10-06','FactSet 分析師中位數（16 位）')]}},T:{baseD:'2026-11-06'}},{v:false,pre:true}));
C.push(check('跨年：舊預估只有 2026 年 → 不比','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2026,100,'2026-08-20','FactSet'),e(2027,70,'2026-11-01','FactSet')]}}},{v:null}));
C.push(check('沒有 EPS 預估 → 資料不足','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{}},{v:null}));
C.push(check('預估超過 4 個月 → 資料不足','法人 EPS 預估下修 > 10%',{m:{c:100},outlook:{'9999':{eps:[e(2027,100,'2026-05-01','FactSet')]}}},{v:null}));
// 毛利率連 2 季下滑與 ⏸
const gm=[51.2,51.5,49.5,45.5];
C.push(check('毛利率連 2 季下滑','毛利率連 2 季下滑',{m:{c:100,gm}},{v:true}));
C.push(check('毛利率沒有連續下滑','毛利率連 2 季下滑',{m:{c:100,gm:[45,46,44,45]}},{v:false}));
C.push(check('毛利率資料不足','毛利率連 2 季下滑',{m:{c:100,gm:[45,44]}},{v:null}));
C.push(check('毛利率：起算時就是這樣 → ⏸','毛利率連 2 季下滑',{m:{c:100,gm},T:{baseD:'2026-11-06',kn:{d:'2026-11-11',gm:gm.join(',')}}},{v:false,pre:true}));
C.push(check('毛利率：起算後有新一季 → 成立','毛利率連 2 季下滑',{m:{c:100,gm:[51.5,49.5,45.5,44.6]},T:{baseD:'2026-11-06',kn:{d:'2026-11-11',gm:gm.join(',')}}},{v:true}));
// 月營收年增率轉負連 2 個月
C.push(check('月營收轉負連 2 個月','月營收年增率轉負連 2 個月',{m:{c:100,ry:[5,3,1,2,-1,-3],rLag:0}},{v:true}));
C.push(check('月營收沒有轉負','月營收年增率轉負連 2 個月',{m:{c:100,ry:[5,3,1,2,1,-3],rLag:0}},{v:false}));
// 或：任一段成立
C.push(check('或：EPS 沒到、毛利率成立 → 成立','月營收年增率轉負連 2 個月、法人 EPS 預估下修 > 10%、或毛利率連 2 季下滑',{m:{c:100,gm,ry:[5,3,1,2,1,3],rLag:0},outlook:{'9999':{eps:[e(2027,100,'2026-08-20','FactSet'),e(2027,95,'2026-11-01','FactSet')]}}},{v:true}));
// 跳動保險：近一年有單日漲跌 > 10.5%、還沒還原 → 和價格有關的條件不判斷；大盤條件、基本面條件照常
function evalCk(name,text,o,want){ctx.__o=o;run(`for(const k in CKM)delete CKM[k];S={outlook:{},theses:[],strategies:[],trades:[]};CK={f:${JSON.stringify(F)},s:{'9999':${JSON.stringify(F)}.map(k=>__o.m[k]??null)},rM:'2026-10',mkt:{taiex:{c:100,m20:110,m60:120,hi250:130}},ind:{}};__r=ckEval('9999',${JSON.stringify(text)},null);`);
 const r=ctx.__r,v=r?r.v:undefined,ok=v===want.v&&!!(r&&r.jump)===!!want.jump;console.log(`${ok?'✓':'✗'} ${name}${ok?'':`：預期 ${JSON.stringify(want)}，得到 ${JSON.stringify(r)}`}`);return ok}
const J={c:1680,m20:1868,m60:3209,m120:4215,hi250:7800,jp:['2026-09-02',-66.5],gm};
C.push(evalCk('跳動：季線條件不判斷','〔技〕收盤低於季線 20% 以上',{m:J},{v:null,jump:true}));
C.push(evalCk('跳動：52 週高點條件不判斷','〔技〕個股從 52 週高點回落 ≥ 20%',{m:J},{v:null,jump:true}));
C.push(evalCk('跳動：大盤條件照常判斷','〔盤〕大盤從高點回檔 ≥ 10%',{m:J},{v:true}));
C.push(evalCk('跳動：毛利率條件照常判斷','〔基〕毛利率沒有連 2 季下滑',{m:J},{v:false}));
C.push(evalCk('沒有跳動：季線條件照常','〔技〕收盤低於季線 20% 以上',{m:Object.assign({},J,{jp:null})},{v:true}));
const bad=C.filter(x=>!x).length;console.log(`\n${C.length-bad}／${C.length} 通過`);if(bad)process.exit(1);
