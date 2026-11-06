// 一次性測試：財報、估值、股利資料來源（只抓全市場公開資料）
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const out={};
async function probe(name,u,opt={}){try{const r=await fetch(u,{method:opt.body?'POST':'GET',headers:Object.assign({},UA,opt.body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),body:opt.body,signal:AbortSignal.timeout(60000)});
 const b=Buffer.from(await r.arrayBuffer());const t=new TextDecoder(opt.enc||'utf-8').decode(b);const o={status:r.status,ct:r.headers.get('content-type'),len:b.length};
 try{const j=JSON.parse(t);if(Array.isArray(j)){o.n=j.length;o.keys=Object.keys(j[0]||{});o.rows=j.filter(x=>JSON.stringify(x).includes('2330')||JSON.stringify(x).includes('3596')).slice(0,2);if(!o.rows.length)o.rows=j.slice(0,1)}else{o.top=Object.keys(j);for(const k of['stat','date','fields','title'])if(j[k]!=null)o[k]=j[k];if(j.data){o.n=j.data.length;o.rows=j.data.slice(0,2)}if(j.tables)o.tables=j.tables.map(T=>({title:T.title,fields:T.fields,n:(T.data||[]).length,rows:(T.data||[]).slice(0,2)}))}}
 catch(e){o.head=t.slice(0,600);const i=t.indexOf('2330');o.mid=i>0?t.slice(Math.max(0,i-2500),i+1500):t.slice(0,3000)}
 out[name]=o}catch(e){out[name]={err:e.message}}fs.writeFileSync('data/ck/probe-fund.json',JSON.stringify(out,null,1));await sleep(2500)}
fs.mkdirSync('data/ck',{recursive:true});
await probe('BWIBBU_ALL','https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL');
await probe('BWIBBU_d','https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=20261105&selectType=ALL&response=json');
await probe('BWIBBU_d_old','https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=20211105&selectType=ALL&response=json');
await probe('tpexPE_open','https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis');
await probe('tpexPE_d','https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=2026/11/05&response=json');
await probe('tpexPE_d2','https://www.tpex.org.tw/www/zh-tw/afterTrading/peRatio?date=2026/11/05&response=json');
await probe('t187ap06_L_ci','https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci');
await probe('t187ap07_L_ci','https://openapi.twse.com.tw/v1/opendata/t187ap07_L_ci');
await probe('t187ap45_L','https://openapi.twse.com.tw/v1/opendata/t187ap45_L');
await probe('t187ap14_L','https://openapi.twse.com.tw/v1/opendata/t187ap14_L');
await probe('tpex_ap06_O_ci','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap06_O_ci');
await probe('tpex_ap07_O_ci','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap07_O_ci');
await probe('tpex_ap45_O','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap45_O');
const q=(s,yr,se,ty)=>`encodeURIComponent=1&step=1&firstin=1&off=1&isQuery=Y&TYPEK=${ty}&year=${yr}&season=${se}`;
await probe('mops_sb04_sii','https://mopsov.twse.com.tw/mops/web/ajax_t163sb04',{body:q(0,115,'02','sii')});
await probe('mops_sb05_sii','https://mopsov.twse.com.tw/mops/web/ajax_t163sb05',{body:q(0,115,'02','sii')});
await probe('mops_sb20_sii','https://mopsov.twse.com.tw/mops/web/ajax_t163sb20',{body:q(0,115,'02','sii')});
await probe('mops_sb04_otc_old','https://mopsov.twse.com.tw/mops/web/ajax_t163sb04',{body:q(0,113,'01','otc')});
await probe('mops_sb04_new','https://mops.twse.com.tw/mops/web/ajax_t163sb04',{body:q(0,115,'02','sii')});
await probe('mops_t05st09','https://mopsov.twse.com.tw/mops/web/ajax_t05st09_2',{body:'encodeURIComponent=1&step=1&firstin=1&off=1&isQuery=Y&TYPEK=sii&year=114&qryType=1'});
await probe('TWT49U','https://www.twse.com.tw/rwd/zh/exRight/TWT49U?startDate=20250101&endDate=20251231&response=json');
console.log(Object.entries(out).map(([k,v])=>k+':'+(v.status||v.err)+' '+(v.len||'')).join('\n'));
