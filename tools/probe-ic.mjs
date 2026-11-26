// 暫時的探測程式（2026-11-26）：看櫃買中心「產業價值鏈資訊平台」的網頁結構，決定怎麼抓。實測完會刪掉。
const UA={'User-Agent':'Mozilla/5.0 (compatible; groups-probe)'};
async function get(u){try{const r=await fetch(u,{headers:UA,redirect:'follow'});const t=await r.text();console.log(`\n=== ${u} → ${r.status} ${r.headers.get('content-type')} ${t.length} 字`);return t}catch(e){console.log(`\n=== ${u} 抓不到：${e.message}`);return ''}}
const show=(t,n=1500)=>console.log(t.replace(/\s+/g,' ').slice(0,n));
const links=t=>[...t.matchAll(/href=["']([^"']+)["'][^>]*>([^<]{0,40})/g)].map(m=>m[1]+' | '+m[2].trim());
const home=await get('https://ic.tpex.org.tw/');show(home,800);
const L=links(home);console.log('連結數',L.length);console.log(L.filter(x=>/ic=|introduce|chain|stock|list|company/i.test(x)).slice(0,80).join('\n'));
// 試幾種常見網址
for(const u of ['https://ic.tpex.org.tw/introduce.php?ic=D000','https://ic.tpex.org.tw/introduce.php?ic=D000&stk_code=','https://ic.tpex.org.tw/company_chain.php?stk_code=2330','https://ic.tpex.org.tw/company_chain.php?stk_code=3533']){const t=await get(u);show(t,1200);const l=links(t);console.log(l.filter(x=>/ic=|stk|company|list/i.test(x)).slice(0,60).join('\n'))}
