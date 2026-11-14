// 美股計算測試（代號與數字都是虛構的）：node tools/test/us-test.mjs
// 1) 含 us 的設定檔：migrate() 後 us 原樣保留；信貸與台股資產的輸出和沒有 us 時逐字相同
// 2) 快照計算、跨帳戶合併、配置、匯率、總覽、提醒、變動紀錄和手算答案一致
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),TODAY='2026-11-10';
const rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const src=['js/engine.js','js/strategy-engine.js','js/asset-engine.js','js/us-engine.js'].map(rd).join('\n;\n').replace(/const TODAY=\(\(\)=>\{[^\n]*?\}\)\(\);/,`const TODAY='${TODAY}';`);
if(!src.includes(`const TODAY='${TODAY}'`))throw new Error('engine.js 的 TODAY 寫法改了，請更新測試');
const noop=()=>null,el={style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){}};
const ctx=vm.createContext({console,document:{getElementById:noop,querySelector:noop,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el,body:el},localStorage:{getItem:noop,setItem(){}},navigator:{},location:{href:''},setTimeout,fetch:async()=>({ok:false})});ctx.window=ctx;
vm.runInContext(src+'\n;globalThis.__E={migrate,settle,project,planInit,forecast,loanS,aprLoan,breakeven,cashflow,asSum,asRows,asVsBm,asGroups,asOpenRisk,asTrend,usDef,usAcctDef,usOn,usNewId,usPx,usClean,usAcctCalc,usCalc,usAlloc,usFx,usAlerts,usAllView,usDiff,usDays,usAuto,usWeekdays,usMacTw,usWOpt,usWatch,usThemes,usHistAdd,usPasteApply};',ctx);const E=ctx.__E;
const US=JSON.parse(rd('tools/test/us/us-block.json'));let bad=0,n=0;
const ok=(c,m)=>{n++;if(!c){bad++;console.log('✗ '+m)}else console.log('✓ '+m)};
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+(JSON.stringify(a)===JSON.stringify(b)?'':`：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`));
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m+(Math.abs(a-b)<1e-6?'':`：得到 ${a}，預期 ${b}`));

// ---- 1) 不影響信貸與台股
function out(raw){const m=E.migrate(raw),S=m.o,rec=E.project(S,E.planInit(S)),fc=E.forecast(S);
 const loan=JSON.stringify({ln:E.loanS(S,0),le:E.loanS(S,1),apr:E.aprLoan(S),rec,fc:fc.rec,be:E.breakeven(S),st:[...(S.snaps||[]),S.cur].map(s=>E.settle(S,s)),cf:E.cashflow(S)});
 let tw='';try{tw=JSON.stringify({sum:E.asSum(S),p:E.asSum(S,'p'),a:E.asSum(S,'a'),rows:E.asRows(S),bm:E.asVsBm(S),g:E.asGroups(S),risk:E.asOpenRisk(S),tr:E.asTrend(S)})}catch(e){tw='ERR '+e.message}
 return{S,loan,tw}}
for(const f of fs.readdirSync(path.join(ROOT,'tools/test/fixtures')).filter(f=>f.endsWith('.json')).sort()){
 const raw=JSON.parse(rd('tools/test/fixtures/'+f)),a=out(JSON.parse(JSON.stringify(raw))),b=out(Object.assign(JSON.parse(JSON.stringify(raw)),{us:JSON.parse(JSON.stringify(US))}));
 eq(b.S.us,US,f+'：migrate() 後 us 原樣保留');ok(a.loan===b.loan,f+'：信貸輸出逐字相同（'+a.loan.length+' 字）');
 ok(!a.tw.startsWith('ERR')&&a.tw===b.tw,f+'：台股資產輸出逐字相同（'+a.tw.length+' 字）'+(a.tw.startsWith('ERR')?' '+a.tw:''));
 ok(a.S.us===undefined,f+'：沒有 us 的設定檔不會被加上 us');ok(!E.usOn(a.S)&&E.usOn(b.S),f+'：usOn 判斷')}
ok(!E.usOn({us:Object.assign({},US,{on:false})}),'us.on 不是 true 時當作沒有美股');

// ---- 2) 手算答案
const before=JSON.stringify(US),T=E.usCalc(US,null),A=Object.fromEntries(T.accts.map(a=>[a.id,a])),R=Object.fromEntries(T.rows.map(r=>[r.n,r]));
eq([A.a1.mvC,A.a1.costC,A.a1.plC,A.a1.plBase,A.a1.cashC,A.a1.valC,A.a1.noCost],[188025,150025,23000,150025,123456,311481,1],'帳戶一：市值、成本、損益、現金、總值');
near(A.a1.plp,23000/150025*100,'帳戶一：損益 %');
eq([A.a2.mvC,A.a2.costC,A.a2.plC,A.a2.cashC,A.a2.cashNull,A.a2.valC,A.a2.noCost],[124738,70000,-7000,0,true,124738,1],'帳戶二：沒填成本的那檔只算市值、現金沒填當 0');
eq([A.a3.mvC,A.a3.costC,A.a3.plC,A.a3.plBase,A.a3.valC,A.a3.miss],[31515,73000,-1485,33000,31515,['EEE']],'帳戶三：沒有現價的那檔不算市值與損益');
eq([T.mvC,T.cashC,T.valC,T.costC,T.plC,T.plBase,T.noCost,T.miss],[344278,123456,467734,293025,14515,253025,2,['EEE']],'美股合計');
near(T.plp,14515/253025*100,'美股合計：損益 %');
eq([R.AAA.q,R.AAA.cC,R.AAA.cQ,R.AAA.avg,R.AAA.allCost,R.AAA.mvC,R.AAA.plC,R.AAA.parts.length],[15.123456,100000,10,100,false,182238,20500,2],'合併 AAA：股數相加、均價只算有成本的那部分');
eq([R.BBB.q,R.BBB.cC,R.BBB.avg,R.BBB.allCost,R.BBB.mvC,R.BBB.plC],[4,83025,207.5625,true,84040,1015],'合併 BBB');
eq([R.EEE.mvC,R.EEE.plC,R.EEE.w,R.EEE.px],[null,null,null,null],'沒有現價的 EEE');
near(R.AAA.w,182238/344278*100,'AAA 占美股持股');eq([R.AAA.name,R.AAA.tag,R.CCC.tag],['測試公司 A','測試主題一',''],'名稱與主題');
const al=E.usAlloc(T);eq(al.top.map(x=>x.n),['AAA','BBB','DDD'],'前三大');near(al.top3,(182238+84040+63000)/344278*100,'前三大占比');
eq(al.byAcct.map(x=>x.name),['測試海外券商','測試員工認股','測試複委託'],'各帳戶占比排序');near(al.stockP+al.cashP,100,'持股＋現金＝100%');
eq(al.byTag.map(x=>x.tag),['測試主題一','測試主題二','未標籤'],'主題占比');
// 現價：自動價與手填價取日期較新的
eq(E.usPx(US,'aaa',{d:'2026-11-11',px:{AAA:130}}),{v:130,d:'2026-11-11',src:'a'},'自動價比較新 → 用自動價');
eq(E.usPx(US,'AAA',{d:'2026-11-09',px:{AAA:130}}),{v:120.5,d:'2026-11-10',src:'m'},'手填價比較新 → 用手填價');
eq(E.usPx(US,'AAA',{d:'2026-11-10',px:{AAA:130}}).src,'a','同一天 → 用自動價');eq(E.usPx(US,'EEE',null),null,'都沒有 → null');
// 整理持股
eq(E.usClean([{n:' aaa ',q:'1.2345678',c0:'10.555'},{n:'AAA',q:2,c0:5},{n:'bbb',q:0,c0:1},{n:'',q:3},{n:'CCC',q:1,c0:''}]),[{n:'AAA',q:3.234568,c0:15.56},{n:'CCC',q:1,c0:null}],'整理：大寫、同代號合併、6 位小數、去掉 0 股');
// 匯率
eq(E.usFx({d:'2026-11-13',buy:32.0,sell:32.1},null,null),{v:32.05,d:'2026-11-13',src:'bot',o:0},'匯率：臺銀即期中價');
eq(E.usFx({d:'2026-11-13',buy:32.0,sell:32.1},{d:'2026-11-13',v:32.2,src:'x'},{d:'2026-11-14',v:32.3}).src,'manual','匯率：手填比較新就用手填');
eq(E.usFx(null,{d:'2026-11-13',v:32.2,src:'x'},{d:'2026-11-13',v:32.3}).src,'alt','匯率：同一天備援先於手填');eq(E.usFx(null,null,null),null,'匯率：都沒有');
// 總覽
const fx=E.usFx({d:'2026-11-13',buy:32.0,sell:32.1},null,null),V=E.usAllView({p:1e6,a:2e6,cash:3e5},T,fx,1e6);
eq([V.tot,V.twd,V.usd,V.segs.map(s=>s.v)],[3449909,3300000,149909,[1000000,2000000,300000,110341,39568]],'總覽：新台幣全資產與五段');
near(V.loan.p,1e6/3449909*100,'信貸餘額 ÷ 全資產');near(V.ccy[0].p+V.ccy[1].p,100,'幣別曝險合計 100%');
const V2=E.usAllView({p:1e6,a:2e6,cash:null},T,null,null);eq([V2.tot,V2.noFx,V2.cashNull,V2.loan],[3000000,true,true,null],'總覽：沒有匯率時只算台股並標示');
// 提醒
const AL=E.usAlerts(US,T,fx,'2026-11-14').map(a=>a.k+':'+(a.codes||a.id||''));eq(AL,['nopx:EEE','oldpx:CCC','acct:a2'],'提醒：沒有現價、手填價超過 30 天、帳戶超過 90 天');
eq(E.usAlerts(US,T,null,'2026-11-14').some(a=>a.k=='fx'),true,'提醒：沒有匯率');
// 變動紀錄
eq(E.usDiff(US.accts[0],{name:'測試海外券商',cash:1000,items:[{n:'AAA',q:12,c0:1250},{n:'BBB',q:2.5,c0:500.25},{n:'FFF',q:1,c0:null}]}),['AAA 10 → 12 股','AAA 成本 1000 → 1250','FFF 新增 1 股','CCC 移除（原 3 股）','現金 1234.56 → 1000'],'變動紀錄');
eq(E.usDiff(US.accts[0],JSON.parse(JSON.stringify(US.accts[0]))),[],'沒有變動 → 空的');
eq(E.usNewId(US),'a4','新帳戶編號');ok(JSON.stringify(US)===before,'計算過程沒有改到 us');
// ---- 3) B 批：自動現價、要注意的事、跨市場主題、走勢、貼上更新
const AU=E.usAuto({d:'2026-11-12',upd:'x',px:{AAA:126.525,BBB:210.1,'ZZZ.B':10,EEE:25},pv:{AAA:120.5,BBB:212,EEE:26,'ZZZ.B':10}});
eq([AU.px['ZZZ-B'],AU.px['ZZZ.B']],[10,10],'自動價：類股代號兩種寫法都查得到');eq(E.usAuto(null),null,'沒有價格檔 → null');
const T2=E.usCalc(US,AU),R2=Object.fromEntries(T2.rows.map(r=>[r.n,r]));
eq([R2.AAA.px,R2.AAA.src,R2.EEE.px,R2.EEE.src,R2.CCC.src,T2.miss],[126.525,'a',25,'a','m',[]],'有自動價：AAA 用比較新的自動價、EEE 補上現價、CCC 不在範圍用手填');
eq(R2.AAA.mvC,Math.round(10*126.525*100)+Math.round(5.123456*126.525*100),'自動價算市值');
eq([E.usWeekdays('2026-11-13','2026-11-16'),E.usWeekdays('2026-11-13','2026-11-18'),E.usWeekdays('2026-11-13','2026-11-13')],[1,3,0],'平日天數（跳過週末）');
eq([E.usMacTw({d:'2026-12-09',k:'fomc'}),E.usMacTw({d:'2026-12-10',k:'cpi'})],[{d:'2026-12-10',when:'凌晨'},{d:'2026-12-10',when:'晚上'}],'總經換成台灣日期');
const EV={earn:{AAA:{d:'2026-11-19',t:'post'},BBB:{d:'2026-11-12',t:'pre'},DDD:{d:'2027-02-01',t:''},QQQQ:{d:'2026-11-15',t:''}}},MC={ev:[{d:'2026-11-17',k:'fomc'},{d:'2026-11-14',k:'cpi'},{d:'2026-12-20',k:'jobs'},{d:'2026-11-10',k:'jobs'}]};
const W=E.usWatch(US,T2,AU,EV,MC,'2026-11-14').map(w=>w.k+':'+(w.n||w.mk||''));
eq(W,['earnDone:BBB','move:AAA','macro:cpi','cap:AAA','macro:fomc','earn:AAA'],'要注意：BBB 財報後檢查、AAA 單日 +5.0%、今天 CPI（先列緊急的），再來 AAA 超過占比上限、聯準會、AAA 5 天後財報；不是持股的不列');
eq(E.usWatch(US,T2,AU,EV,MC,'2026-11-19').some(w=>w.k=='stale'),true,'價格超過 3 個平日沒更新 → 提醒');
eq(E.usWatch(Object.assign({},US,{watch:{mv:8,cap:60}}),T2,AU,null,null,'2026-11-14'),[],'門檻調高、沒有事件 → 沒有提醒');
eq(E.usWOpt(US),{mv:5,cap:30},'預設門檻：單日 5%、單一持股 30%');
const TH=E.usThemes({'測試主題一':500000,'台股主題':200000},T,fx,3449909);
eq(TH.map(x=>[x.g,Math.round(x.tw),Math.round(x.us)]),[['測試主題一',500000,58407],['台股主題',200000,0],['測試主題二',0,26935],['美股未標籤',0,24999]],'跨市場主題：同名主題台股＋美股相加');
near(TH[0].p,(500000+1822.38*32.05)/3449909*100,'跨市場主題占全資產');eq(E.usThemes({a:1},T,null,100).map(x=>x.us),[0],'沒有匯率時只算台股');
let H=E.usHistAdd([],{d:'2026-11-13',usd:100},'2026-11-14');H=E.usHistAdd(H,{d:'2026-11-13',usd:120},'2026-11-14');H=E.usHistAdd(H,{d:'2026-11-12',usd:90},'2026-11-14');
eq(H.map(h=>h.d+':'+h.usd),['2026-11-12:90','2026-11-13:120'],'走勢：同一天只留最新一筆、依日期排序');
eq(E.usHistAdd([{d:'2025-08-03',usd:1},{d:'2025-08-20',usd:2},{d:'2025-09-05',usd:3},{d:'2026-01-02',usd:4},{d:'2026-01-09',usd:5}],{d:'2026-11-13',usd:9},'2026-11-14').map(h=>h.d),['2025-08-20','2025-09-05','2026-01-02','2026-01-09','2026-11-13'],'走勢：超過一年的每月只留最後一筆');
const P1=E.usPasteApply(US.accts[0],{account:'測試海外券商',cash:900,items:[{code:'aaa',qty:12,cost:1250,price:131},{code:'BBB',qty:2.5},{code:'FFF',qty:1,avg:20}]},false);
eq([P1.after.items,P1.after.cash,P1.px],[[{n:'AAA',q:12,c0:1250},{n:'BBB',q:2.5,c0:500.25},{n:'FFF',q:1,c0:20}],900,{AAA:131}],'貼上（整個覆寫）：沒帶成本的保留原成本、均價換成總額、帶現價');
eq(P1.diff,['AAA 10 → 12 股','AAA 成本 1000 → 1250','FFF 新增 1 股','CCC 移除（原 3 股）','現金 1234.56 → 900'],'貼上：差異清單');
const P2=E.usPasteApply(US.accts[0],{items:[{code:'AAA',qty:12}]},true);eq([P2.after.items.map(x=>x.n+':'+x.q),P2.after.cash,P2.diff],[['AAA:12','BBB:2.5','CCC:3'],1234.56,['AAA 10 → 12 股']],'貼上（只更新出現的代號）：其他不動、現金沒帶就不動');
eq(E.usPasteApply(US.accts[0],{cash:1234.56,items:US.accts[0].items.map(x=>({code:x.n,qty:x.q}))},false).diff,[],'貼同一份 → 沒有變動');
eq(E.usPasteApply(null,{account:'新帳戶',items:[{code:'GGG',qty:3,cost:30},{code:'',qty:1},{code:'HHH'}]},false).bad,['有一筆沒有代號','HHH 沒有股數'],'貼上：缺代號、缺股數會列出來');
ok(JSON.stringify(US)===before,'B 批的計算也沒有改到 us');
console.log(`\n${n-bad}／${n} 通過`);process.exit(bad?1:0);
