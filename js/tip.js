// ⓘ 說明小視窗（2026-11-15）
// 長的說明文字不再佔版面：標題或按鈕旁放一個灰色 ⓘ，點了跳出小視窗；按 ✕、點視窗外面、按 Esc 或手機的上一頁都會關。
// 一次只開一個。信貸卡片原本「點了在卡片裡展開」的 ⓘ（data-i）也改成同一種小視窗。
// 用法：tipI('說明文字','標題') 回傳一個 ⓘ 的 HTML；靜態 HTML 寫 <span class="ib" role="button" tabindex="0" data-tn="標題" data-tt="說明文字">ⓘ</span>
// 說明文字是純文字（換行用 \n）。只管畫面，不碰任何計算。
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
const tipE=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function tipI(t,n){return t?`<span class="ib" role="button" tabindex="0" aria-label="說明：${tipE(n||'說明')}" data-tn="${tipE(n||'說明')}" data-tt="${tipE(t)}">ⓘ</span>`:''}
(()=>{
 let ov=null,pushed=0;
 const close=fromPop=>{if(!ov||ov.style.display=='none')return;ov.style.display='none';if(pushed&&!fromPop){pushed=0;try{history.back()}catch(e){}}pushed=0};
 const open=(title,text)=>{
  if(!ov){ov=document.createElement('div');ov.id='tipOv';ov.className='tipov';
   ov.innerHTML='<div class="tipbx" role="dialog" aria-modal="true" aria-labelledby="tipH"><div class="tiph"><b id="tipH"></b><button type="button" aria-label="關閉" class="tipx">✕</button></div><div class="tipc" id="tipC"></div></div>';
   document.body.appendChild(ov);
   ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('.tipx'))close()})}
  ov.querySelector('#tipH').textContent=title||'說明';ov.querySelector('#tipC').textContent=text||'';ov.style.display='flex';
  // 多放一筆瀏覽紀錄，按上一頁時關掉（沿用同一層的 lcOv，back.js 不會把它當成新的一層）
  if(!pushed){try{const st=history.state&&typeof history.state=='object'?history.state:{};history.pushState(Object.assign({},st,{lcTip:1}),'');pushed=1}catch(e){}}
  setTimeout(()=>{const x=ov.querySelector('.tipx');if(x)x.focus()},0)};
 addEventListener('popstate',()=>{if(pushed){pushed=0;close(1)}});
 addEventListener('keydown',e=>{if(e.key=='Escape')close()});
 // 捕獲階段先處理，避免點到收合標題、列表那一列
 const hit=e=>{const el=e.target.closest&&e.target.closest('[data-tt],[data-i]');if(!el)return null;
  if(el.dataset.tt!=null)return{n:el.dataset.tn,t:el.dataset.tt};
  const k=el.dataset.i;if(typeof INFO!='undefined'&&INFO[k]){const c=el.closest('.c'),sm=c&&c.querySelector('small');
   const d=document.createElement('div');d.innerHTML=INFO[k];return{n:sm?sm.textContent.replace('ⓘ','').trim():'說明',t:d.textContent}}return null};
 document.addEventListener('click',e=>{const h=hit(e);if(!h)return;e.preventDefault();e.stopPropagation();open(h.n,h.t)},true);
 document.addEventListener('keydown',e=>{if(e.key!='Enter'&&e.key!=' ')return;const h=hit(e);if(!h)return;e.preventDefault();e.stopPropagation();open(h.n,h.t)},true);
 window.tipOpen=open;window.tipClose=()=>close();
})();
