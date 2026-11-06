// 啟動（最後載入）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
load();build();tab(isS()?'F':(ls('lct2')||'F'));bkUpd();setTimeout(bkRemind,800);if(!S.ui)$('chz').style.display='flex';else if(!isS()&&ls('lcg')!='1')showGd();addEventListener('resize',draw);if(typeof pxLoad=='function')setTimeout(()=>pxLoad(0),400);
// 加入主畫面（PWA）：只在網址開啟時註冊；iPhone Safari 提示加入主畫面
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
(()=>{const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),sa=navigator.standalone||matchMedia('(display-mode: standalone)').matches,el=$('iosHint');if(el&&ios&&!sa){el.style.display='';el.innerHTML='📱 iPhone 建議：Safari 下方「分享」→「加入主畫面」，之後從主畫面打開。Safari 裡的網站資料在一段時間沒打開時可能被清除，加入主畫面後正常使用不會；第一次請先在這裡「⬇️ 匯出設定檔」，再到主畫面的 App「⬆️ 匯入」。'}})();
// 使用說明：點目錄打開並捲到那一段
window.gdGo=id=>{const d=$(id);if(!d)return;d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})};
