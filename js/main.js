// 啟動（最後載入）
// 信貸資產管理試算器｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
load();build();tab(isS()?'F':(ls('lct2')||'F'));bkUpd();setTimeout(bkRemind,800);if(!S.ui)$('chz').style.display='flex';else if(!isS()&&ls('lcg')!='1')showGd();addEventListener('resize',draw);if(typeof pxLoad=='function')setTimeout(()=>pxLoad(0),400);
