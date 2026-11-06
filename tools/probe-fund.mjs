// 一次性測試（第 2 次）：公開資訊觀測站彙總報表完整內容、非交易日查詢行為
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync('data/ck/probe',{recursive:true});const log=[];
async function save(name,u,body,to=170000){const t0=Date.now();try{const r=await fetch(u,{method:body?'POST':'GET',headers:Object.assign({},UA,body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),body,signal:AbortSignal.timeout(to)});const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync('data/ck/probe/'+name,b);log.push(`${name} ${r.status} ${b.length} ${Date.now()-t0}ms`)}catch(e){log.push(`${name} ERR ${e.message} ${Date.now()-t0}ms`)}fs.writeFileSync('data/ck/probe/log.txt',log.join('\n'));await sleep(3000)}
const q=(yr,se,ty)=>`encodeURIComponent=1&step=1&firstin=1&off=1&isQuery=Y&TYPEK=${ty}&year=${yr}&season=${se}`;
await save('sb04_sii_115_2.html','https://mopsov.twse.com.tw/mops/web/ajax_t163sb04',q(115,'02','sii'));
await save('sb04_otc_115_2.html','https://mopsov.twse.com.tw/mops/web/ajax_t163sb04',q(115,'02','otc'));
await save('sb20_otc_115_2.html','https://mopsov.twse.com.tw/mops/web/ajax_t163sb20',q(115,'02','otc'));
await save('sb20_sii_114_4.html','https://mopsov.twse.com.tw/mops/web/ajax_t163sb20',q(114,'04','sii'));
await save('sb05_sii_115_2.html','https://mopsov.twse.com.tw/mops/web/ajax_t163sb05',q(115,'02','sii'));
await save('bwibbu_sat.json','https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=20261031&selectType=ALL&response=json');
await save('tpexpe_sat.json','https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=2026/10/31&response=json');
await save('tpexpe_old.json','https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=2017/01/26&response=json');
await save('bwibbu_old.json','https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=20170126&selectType=ALL&response=json');
for(const f of fs.readdirSync('data/ck/probe'))if(/\.html$/.test(f)){const s=fs.readFileSync('data/ck/probe/'+f);if(s.length>400000){const t=s.toString('utf8');const i=t.indexOf('</table>',200000);fs.writeFileSync('data/ck/probe/'+f,t.slice(0,i>0?i+8:400000))}}
console.log(log.join('\n'));
