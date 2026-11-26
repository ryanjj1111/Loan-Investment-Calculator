// 暫時的探測程式（2026-11-26）：印出產業鏈頁裡「環節名稱」和公司清單附近的 HTML。實測完會刪掉。
const UA={'User-Agent':'Mozilla/5.0 (compatible; groups-probe)'};
const t=await (await fetch('https://ic.tpex.org.tw/introduce.php?ic=D000',{headers:UA})).text();
const i=t.indexOf('company_basic.php?stk_code=2401');
console.log('--- 第一個公司連結前 6000 字 ---');console.log(t.slice(Math.max(0,i-6000),i+600).replace(/\s+/g,' '));
const j=t.indexOf('company_basic.php?stk_code=2454');console.log('--- 聯發科附近 ---');console.log(t.slice(j-2500,j+300).replace(/\s+/g,' '));
const ids=[...t.matchAll(/id=["']([^"']+)["']/g)].map(m=>m[1]);console.log('--- id 範例 ---',[...new Set(ids)].slice(0,120).join(' '));
const cls=[...t.matchAll(/class=["']([^"']+)["']/g)].map(m=>m[1]);const C={};cls.forEach(c=>C[c]=(C[c]||0)+1);console.log('--- class 次數 ---',JSON.stringify(C));
