// 手機「上一頁」關閉視窗（2026-11-14）
// 浮層（個股頁、記交易、AI 討論、評估、匯出選單＝#asOv；使用說明＝#gd）打開時，在瀏覽紀錄多放一筆；
// 按上一頁＝按那個畫面左上角的 ✕（從個股頁進到記交易的，回到個股頁）。按 ✕ 關閉時把那一筆退掉。
// 在最外層按上一頁照舊離開。只管畫面開關，不碰任何計算、不改設定檔。
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
(()=>{
 if(typeof history=='undefined'||!history.pushState)return;
 const IDS=['asOv','gd'];
 let skip=0,tm=0,sk=0; // skip：自己呼叫 history.back() 造成的那一次 popstate 要略過
 const mine=()=>{try{return !!(history.state&&history.state.lcOv)}catch(e){return false}};
 const shown=id=>{const e=document.getElementById(id);return !!e&&e.style.display=='flex'};
 const anyOpen=()=>IDS.some(shown);
 const drop=()=>{skip=1;clearTimeout(sk);sk=setTimeout(()=>{skip=0},800);try{history.back()}catch(e){skip=0}};
 // 畫面狀態和瀏覽紀錄對齊：有浮層就要有一筆，沒有浮層就把那一筆退掉
 const sync=()=>{clearTimeout(tm);tm=setTimeout(()=>{if(skip)return;
  if(anyOpen()){if(!mine())try{history.pushState({lcOv:1},'')}catch(e){}}
  else if(mine())drop()},0)};
 addEventListener('popstate',()=>{
  if(skip){skip=0;clearTimeout(sk);sync();return}
  if(shown('asOv')){const b=document.querySelector('#asOvB .ovh button');
   if(b&&b.textContent.trim()=='✕')b.click();else if(typeof asClose=='function')asClose()}
  else if(shown('gd')){if(typeof closeGd=='function')closeGd()}
  sync()});
 // 不改各畫面的開關程式：直接看浮層的顯示狀態有沒有變
 if(typeof MutationObserver!='undefined'){const mo=new MutationObserver(sync);
  IDS.forEach(id=>{const e=document.getElementById(id);if(e)mo.observe(e,{attributes:true,attributeFilter:['style']})})}
 sync();
})();
