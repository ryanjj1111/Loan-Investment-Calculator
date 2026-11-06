// 一次性：抓 2026-11-06 收盤價（給重新分類持股的停損計算用）
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const out={};
const a=await (await fetch('https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20261106&type=ALLBUT0999&response=json',{headers:UA})).json();
const T=(a.tables||[]).find(t=>(t.fields||[]).includes('證券代號')&&(t.fields||[]).includes('收盤價'));if(T){const ic=T.fields.indexOf('證券代號'),ip=T.fields.indexOf('收盤價');for(const r of T.data)out[String(r[ic]).trim()]=r[ip]}
await new Promise(r=>setTimeout(r,3000));
const b=await (await fetch('https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=2026/11/06&type=EW&response=json',{headers:UA})).json();
const T2=(b.tables||[])[0];if(T2){const F=T2.fields.map(s=>String(s).trim()),ic=F.indexOf('代號'),ip=F.indexOf('收盤');for(const r of T2.data)out[String(r[ic]).trim()]=r[ip]}
fs.mkdirSync('data/ck/probe',{recursive:true});fs.writeFileSync('data/ck/probe/px1106.json',JSON.stringify({tse:a.date,otc:b.date,n:Object.keys(out).length,px:Object.fromEntries(['2308','2301','3533','3044','5269','3596','3029','3680','2395','0050','006208','00713'].map(c=>[c,out[c]]))}));
