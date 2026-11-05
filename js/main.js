// 啟動（最後載入）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
load();build();tab(isS()?'F':(ls('lct2')||'F'));bkUpd();setTimeout(bkRemind,800);if(!S.ui)$('chz').style.display='flex';else if(!isS()&&ls('lcg')!='1')showGd();addEventListener('resize',draw);if(typeof pxLoad=='function')setTimeout(()=>pxLoad(0),400);
