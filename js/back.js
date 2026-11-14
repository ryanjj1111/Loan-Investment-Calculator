// 手機「上一頁」關閉視窗（2026-11-14）
// 浮層（個股頁、記交易、AI 討論、評估、匯出選單＝#asOv；使用說明＝#gd）打開時，在瀏覽紀錄多放一筆；
// 按上一頁＝按那個畫面左上角的 ✕（從個股頁進到記交易的，回到個股頁）。按 ✕ 關閉時把那一筆退掉。
// 在最外層按上一頁照舊離開。只管畫面開關，不碰任何計算、不改設定檔。
// 做法：畫面有「幾層」（0 沒有浮層、1 浮層、2 從個股頁再進去的畫面），瀏覽紀錄就多幾筆；
// 多的紀錄都在使用者點了東西之後才放（瀏覽器會略過沒有操作就放進去的紀錄）。
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
(()=>{
 if(typeof history=='undefined'||!history.pushState)return;
 const el=id=>document.getElementById(id),shown=id=>{const e=el(id);return !!e&&e.style.display=='flex'};
 let skip=0,tm=0,sk=0; // skip：自己呼叫 history.go() 造成的那一次 popstate 要略過
 const depth=()=>{try{return(history.state&&+history.state.lcOv)||0}catch(e){return 0}};
 const xBtn=()=>{const b=document.querySelector('#asOvB .ovh button');return b&&b.textContent.trim()=='✕'?b:null};
 // ✕ 會回到個股頁（不是直接關閉）的畫面算第 2 層
 const level=()=>{if(shown('asOv')){const b=xBtn(),oc=b?(b.getAttribute('onclick')||''):'';
   if(!b||/^asClose\(\)/.test(oc))return 1;
   if(/^asBack\(\)/.test(oc))return typeof AT!='undefined'&&AT&&AT.from?2:1;
   return 2}
  return shown('gd')?1:0};
 const go=n=>{skip=1;clearTimeout(sk);sk=setTimeout(()=>{skip=0},800);try{history.go(n)}catch(e){skip=0}};
 // 畫面層數和瀏覽紀錄對齊
 const sync=()=>{clearTimeout(tm);tm=setTimeout(()=>{if(skip)return;const L=level();let d=depth();
  if(L>d){try{while(d<L)history.pushState({lcOv:++d},'')}catch(e){}}
  else if(L<d)go(L-d)},0)};
 addEventListener('popstate',()=>{
  if(skip){skip=0;clearTimeout(sk);sync();return}
  if(level()>depth()){
   if(shown('asOv')){const b=xBtn();if(b)b.click();else if(typeof asClose=='function')asClose()}
   else if(shown('gd')&&typeof closeGd=='function')closeGd()}
  sync()});
 // 不改各畫面的開關程式：直接看浮層有沒有顯示、內容有沒有換
 if(typeof MutationObserver!='undefined'){const mo=new MutationObserver(sync);
  ['asOv','gd'].forEach(id=>{const e=el(id);if(e)mo.observe(e,{attributes:true,attributeFilter:['style']})});
  if(el('asOvB'))mo.observe(el('asOvB'),{childList:true})}
 sync();
})();
