import fs from 'node:fs';
const O='https://ryanjj1111.github.io';
const tw=new Date(Date.now()+8*3600e3),ymd=tw.toISOString().slice(0,10).replace(/-/g,''),roc=(tw.getUTCFullYear()-1911)+'/'+ymd.slice(4,6)+'/'+ymd.slice(6);
const U={
 twse_open:'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
 twse_rwd_all:'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL?response=json',
 twse_old_all:'https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json',
 twse_mi_index:`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${ymd}&type=ALLBUT0999&response=json`,
 twse_mi_index_prev:`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=20261104&type=ALLBUT0999&response=json`,
 twse_stock_day:`https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=20261001&stockNo=0050&response=json`,
 tpex_open:'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
 tpex_www_dailyq:`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQ?date=2026/11/04&response=json`,
 tpex_www_otc:`https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=2026/11/04&type=EW&response=json`,
 tpex_old:`https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&d=115/11/04&o=json`,
 mis:'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_0050.tw|tse_2330.tw&json=1&delay=0',
 mis_otc:'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_3529.tw&json=1&delay=0',
 twse_t86:`https://www.twse.com.tw/rwd/zh/fund/T86?date=20261104&selectType=ALLBUT0999&response=json`,
 twse_margin:`https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=20261104&selectType=ALL&response=json`,
 tpex_open_inst:'https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading',
 twse_open_rev:'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
 tpex_open_rev:'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O',
 tdcc:'https://opendata.tdcc.com.tw/getOD.ashx?id=1-5',
};
const out={at:new Date().toISOString(),ymd,r:{}};
for(const [k,u] of Object.entries(U)){const t0=Date.now();try{const r=await fetch(u,{headers:{Origin:O,'User-Agent':'Mozilla/5.0 (loan-calc probe)'},signal:AbortSignal.timeout(30000)});const tx=await r.text();let info={};try{const j=JSON.parse(tx);if(Array.isArray(j)){info={arr:j.length,keys:Object.keys(j[0]||{}),first:j[0],find:j.find(x=>JSON.stringify(x).includes('"0050"')||JSON.stringify(x).includes('2330')||JSON.stringify(x).includes('3529'))}}else{info={keys:Object.keys(j),stat:j.stat,date:j.date,title:j.title,fields:j.fields,dlen:(j.data||j.aaData||[]).length,d0:(j.data||j.aaData||[])[0],tables:(j.tables||[]).map(t=>({title:t.title,fields:t.fields,n:(t.data||[]).length,d0:(t.data||[])[0]})),msg:j.msgArray?j.msgArray.slice(0,2):undefined}}}catch(e){info={text:tx.slice(0,300)}}
 out.r[k]={u,status:r.status,ms:Date.now()-t0,acao:r.headers.get('access-control-allow-origin'),ct:r.headers.get('content-type'),len:tx.length,info}}catch(e){out.r[k]={u,err:String(e)}}}
fs.writeFileSync('probe-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out).slice(0,3000));
