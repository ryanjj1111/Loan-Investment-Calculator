// 暫時的探測程式（2026-11-26）：把產業價值鏈平台的首頁與各產業鏈頁存下來，研究結構。實測完會刪掉。
import fs from 'fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; groups-probe)'};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('probe',{recursive:true});
async function get(u){try{const r=await fetch(u,{headers:UA});return await r.text()}catch(e){console.log('抓不到',u,e.message);return ''}}
const home=await get('https://ic.tpex.org.tw/');fs.writeFileSync('probe/home.html',home);
const ics=[...new Set([...home.matchAll(/introduce\.php\?ic=([A-Z0-9]+)/g)].map(m=>m[1]))];console.log('產業鏈',ics.length,ics.join(' '));
for(const ic of ics){const t=await get(`https://ic.tpex.org.tw/introduce.php?ic=${ic}`);fs.writeFileSync(`probe/${ic}.html`,t);console.log(ic,t.length,(t.match(/<title>([^<]*)/)||[])[1]);await sleep(1500)}
const c=await get('https://ic.tpex.org.tw/company_basic.php?stk_code=3533');fs.writeFileSync('probe/c3533.html',c);
