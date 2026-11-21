// 晨報同步測試（代號、名稱與數字都是虛構的）：node tools/test/brief-sync-test.mjs
// 1) 只上傳持有中論點；股數、成本、金額不會出現在上傳內容
// 2) 支柱、策略出場規則、持股清單（台股排除 ETF、美股排除當現金的代號）
// 3) 內容不變 → 雜湊不變（不會重複上傳）；論點檔比對時忽略上傳時間
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),TODAY='2026-11-21';
const rd=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const src=['js/engine.js','js/strategy-engine.js','js/us-engine.js','js/brief-sync.js'].map(rd).join('\n;\n').replace(/const TODAY=\(\(\)=>\{[^\n]*?\}\)\(\);/,`const TODAY='${TODAY}';`);
const noop=()=>null,el={style:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){}};
const ctx=vm.createContext({console,document:{getElementById:noop,querySelector:noop,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el,body:el},localStorage:{getItem:noop,setItem(){}},navigator:{},location:{href:''},setTimeout:()=>0,clearTimeout(){},addEventListener(){},ls:noop,fetch:async()=>({ok:false})});ctx.window=ctx;
vm.runInContext(src+'\n;globalThis.__E={bsBuild,bsClean,bsHold,bsMd,bsBodyOf,bsHash,bsPillars};',ctx);
const E=ctx.__E;let bad=0,n=0;
const ok=(c,m)=>{n++;if(!c){bad++;console.log('✗ '+m)}else console.log('✓ '+m)};
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+(JSON.stringify(a)===JSON.stringify(b)?'':`：得到 ${JSON.stringify(a)}，預期 ${JSON.stringify(b)}`));
const nm=c=>({'9101':'甲公司','9202':'乙公司','9303':'丙公司','0099':'測試ETF'})[c]||'';
const tr=(dt,n,k,q,px,ac='a',thesisId='')=>({dt,n,k,q,px,ac,thesisId,fee:'',tax:''});
const S={feeMode:'full',strategies:[{id:'S91',name:'測試成長',ver:3,on:1,logic:'測試用邏輯',exit:'1. 停利：測試條件\n2. 停損：跌破均價 −15%\n持有中檢查：每月看營收'}],
 theses:[
  {id:'T901',code:'9101',sid:'S91',status:'hold',created:'2026-11-01',why:'營收年增 30%。均價 123.5 元買進 2,000 股，投入 25 萬元。毛利率創高，明年 EPS 估 6 元，123.5 元約 20 倍。成本 120 元，當核心',wrongIf:'跌破均價 −15% 或營收轉負',stop:'110',tgtPx:'',target:'',pillars:[{t:'需求續強',chk:'月營收年增 > 20%'},{t:'',chk:''},{t:'毛利率',chk:''}]},
  {id:'T902',code:'9202',sid:'U',status:'hold',created:'2026-11-02',why:'景氣循環上升段',wrongIf:'報價轉跌',stop:'50',reviewD:'2027-01-10',riskNote:'波動大'},
  {id:'T903',code:'9303',sid:'S91',status:'plan',created:'2026-11-03',why:'規劃中，不上傳',wrongIf:'x',stop:'1'},
  {id:'T904',code:'9404',sid:'S91',status:'exit',created:'2026-10-01',why:'已結案，不上傳',wrongIf:'x',stop:'1'}],
 trades:[tr('2026-11-01','9101','buy',2000,123.5,'a','T901'),tr('2026-11-02','9202','buy',1000,60,'a','T902'),tr('2026-11-03','0099','buy',500,40,'p'),tr('2026-11-04','9505','buy',100,10),tr('2026-11-05','9505','sell',100,11)],
 us:{v:1,on:true,cashLike:['CASHX'],attr:{},px:{},pxd:{},pxa:{},opt:{},accts:[{id:'a1',name:'測試券商',mode:'snap',items:[{n:'zzz',q:2,c0:100},{n:'AAA',q:1.5,c0:50},{n:'CASHX',q:10,c0:1000},{n:'BBB',q:0,c0:0}],trades:[],flows:[],init:[]}]}};
const R=E.bsBuild(S,nm),H=JSON.parse(R.hold),md=E.bsMd(R.body,'2026-11-21 08:00');
eq(H.tw,[{code:'9101',name:'甲公司'},{code:'9202',name:'乙公司'}],'台股持股：排除 ETF（00 開頭）、已賣光的');
eq(H.us,['AAA','ZZZ'],'美股持股：股數 > 0、排除當現金的代號、轉大寫、排序');
ok(R.n==2,'只放持有中論點（2 檔）');ok(!/T903|T904|規劃中|已結案/.test(md),'規劃中、已結案的論點不上傳');
ok(!/2,000|2000 股|25 萬|123\.5/.test(md),'股數、成本、金額的句子整句拿掉');ok(/營收年增 30%/.test(md)&&/毛利率創高/.test(md),'同一段其他句子保留');
ok(/跌破均價 −15% 或營收轉負/.test(md),'規則裡的「跌破均價 −15%」是百分比，保留');
ok(/1\. 需求續強｜檢查：月營收年增 > 20%/.test(md)&&/2\. 毛利率/.test(md),'支柱：略過空白、依序編號');
ok(/### 9202 乙公司（T902｜U 不歸類）[\s\S]*支柱：還沒寫/.test(md),'沒寫支柱的標「還沒寫」');eq(R.noPl,['9202'],'列出還沒寫支柱的代號');
ok(/重新評估日：2027-01-10/.test(md)&&/主要風險：波動大/.test(md)&&/停損價：110/.test(md),'停損價、重新評估日、主要風險');
ok(/### S91 測試成長（v3）[\s\S]*1\. 停利：測試條件[\s\S]*- 持有中檢查/.test(md),'用到的策略與出場規則');ok(/### U 不歸類/.test(md),'不歸類放最後');
ok(md.indexOf('### S91')<md.indexOf('### U 不歸類'),'策略順序：S 開頭在前');
eq(E.bsBodyOf(md),R.body,'比對內容時忽略開頭的上傳時間');
ok(E.bsHash(E.bsBuild(S,nm).body)===E.bsHash(R.body),'內容不變 → 雜湊不變');
const S2=JSON.parse(JSON.stringify(S));S2.theses[0].pillars[0].chk='月營收年增 > 25%';ok(E.bsHash(E.bsBuild(S2,nm).body)!==E.bsHash(R.body),'改了支柱 → 雜湊改變');
const S3=JSON.parse(JSON.stringify(S));delete S3.us;eq(JSON.parse(E.bsBuild(S3,nm).hold).us,[],'沒有美股帳戶 → us 是空的');
eq(E.bsClean('EPS 3.2 元。成本約 500 元；目標 600'),'EPS 3.2 元。目標 600。','bsClean：拿掉提到成本的那一小段');
ok(/明年 EPS 估 6 元，當核心。/.test(md)&&!/約 20 倍/.test(md),'出現這檔買進價（123.5）的那一小段拿掉');ok(/當核心/.test(md)&&!/成本 120/.test(md),'同一句裡「成本 N 元」拿掉、其他保留');
eq(E.bsClean('回到前高先賣一半\n持有 12 個月重新評估'),'回到前高先賣一半；持有 12 個月重新評估。','換行改成分號，維持一行');
console.log(`\n${n-bad}/${n} 通過`);if(bad)process.exit(1);
