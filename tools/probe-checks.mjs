// 一次性測試：確認自動檢核卡要用的公開資料欄位（只抓全市場公開資料）
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const out={};
async function probe(name,u,kind='json',enc='utf-8'){try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(60000)});const b=Buffer.from(await r.arrayBuffer());let t=new TextDecoder(enc).decode(b);const o={status:r.status,ct:r.headers.get('content-type'),len:b.length};
 if(kind=='json'){try{const j=JSON.parse(t);if(Array.isArray(j)){o.n=j.length;o.keys=Object.keys(j[0]||{});o.rows=j.slice(0,2)}else{o.top=Object.keys(j);for(const k of['stat','date','fields','title','notes','groups'])if(j[k]!=null)o[k]=j[k];if(j.data){o.rows=j.data.slice(0,2);o.n=j.data.length}if(j.tables)o.tables=j.tables.map(T=>({title:T.title,fields:T.fields,n:(T.data||[]).length,rows:(T.data||[]).slice(0,2),groups:T.groups}))}}catch(e){o.err=e.message;o.head=t.slice(0,800)}}
 else{o.head=t.slice(0,1200);if(kind=='html'){const i=t.indexOf('2330');o.mid=i>0?t.slice(Math.max(0,i-1500),i+600):t.slice(2000,4000);const j=t.indexOf('1101');if(j>0)o.mid2=t.slice(Math.max(0,j-2500),j+500)}else{o.lines=t.split(/\r?\n/).slice(0,4);o.nlines=t.split(/\n/).length}}
 out[name]=o}catch(e){out[name]={err:e.message}}fs.writeFileSync('data/ck/probe.json',JSON.stringify(out,null,1));await sleep(2500)}
fs.mkdirSync('data/ck',{recursive:true});
await probe('MI_INDEX','https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20261105&type=ALLBUT0999&response=json');
await probe('otc','https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=2026/11/05&type=EW&response=json');
await probe('T86','https://www.twse.com.tw/rwd/zh/fund/T86?date=20261105&selectType=ALLBUT0999&response=json');
await probe('tpexInsti','https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&sect=EW&date=2026/11/05&response=json');
await probe('MI_MARGN','https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=20261105&selectType=ALL&response=json');
await probe('tpexMargin','https://www.tpex.org.tw/www/zh-tw/margin/balance?date=2026/11/05&response=json');
await probe('FMTQIK','https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=20261101&response=json');
await probe('FMTQIK_old','https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=20251001&response=json');
await probe('t187L','https://openapi.twse.com.tw/v1/opendata/t187ap05_L');
await probe('t187O','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O');
await probe('mopsSii','https://mopsov.twse.com.tw/nas/t21/sii/t21sc03_115_9_0.html','html','big5');
await probe('mopsOtc','https://mopsov.twse.com.tw/nas/t21/otc/t21sc03_115_9_0.html','html','big5');
await probe('mopsSii2','https://mops.twse.com.tw/nas/t21/sii/t21sc03_112_9_0.html','html','big5');
await probe('tdcc','https://opendata.tdcc.com.tw/getOD.ashx?id=1-5','csv');
await probe('MI_INDEX_old','https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20251015&type=ALLBUT0999&response=json');
await probe('otc_old','https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=2025/10/15&type=EW&response=json');
await probe('T86_old','https://www.twse.com.tw/rwd/zh/fund/T86?date=20260803&selectType=ALLBUT0999&response=json');
await probe('tpexInsti_old','https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&sect=EW&date=2026/08/03&response=json');
await probe('tpexMargin_old','https://www.tpex.org.tw/www/zh-tw/margin/balance?date=2026/08/03&response=json');
console.log(Object.entries(out).map(([k,v])=>k+':'+(v.status||v.err)).join('\n'));
