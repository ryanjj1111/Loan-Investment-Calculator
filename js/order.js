// ↕ 調整順序：按一下進入排序模式，每一列出現 ↑↓，調完按「完成」。手機上比拖曳穩定。
// tw＝台股持股（存在設定檔的 asOrd，項目是「部位|代號」）；us＝美股持股（us.ord）；ua＝美股帳戶（直接改 us.accts 的順序）
// 只影響畫面上的排列，不影響任何計算。
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/
let ORDM='';
const ordIx=(m,k)=>{const L=m=='tw'?(S.asOrd||[]):m=='us'?((S.us&&S.us.ord)||[]):[],i=L.indexOf(k);return i<0?1e6:i};
window.ordMode=m=>{ORDM=ORDM==m?'':m;if(typeof asBuild=='function')asBuild();else asCalc()};
const ordTog=m=>`<button class="${ORDM==m?'pri':''}" onclick="ordMode('${m}')">${ORDM==m?'✓ 完成':'↕ 調整順序'}</button>`;
const ordBtn=(m,k)=>`<span class=ordb><button onclick="event.stopPropagation();ordMove('${m}','${k}',-1)">↑</button><button onclick="event.stopPropagation();ordMove('${m}','${k}',1)">↓</button></span>`;
// 和畫面上相鄰的那一列交換（同一組裡面；碰到分組標題就停）
window.ordMove=(m,k,dir)=>{const el=[...document.querySelectorAll('[data-ok]')].find(e=>e.dataset.ok==k&&e.offsetParent!==null);if(!el)return;let nb=dir<0?el.previousElementSibling:el.nextElementSibling;if(!nb||!nb.dataset||nb.dataset.ok==null)return;const k2=nb.dataset.ok;
 if(m=='ua'){const A=S.us.accts,i=A.findIndex(a=>a.id==k),j=A.findIndex(a=>a.id==k2);if(i<0||j<0)return;[A[i],A[j]]=[A[j],A[i]]}
 else{// 目前畫面上的順序補進清單，再交換
  const vis=[...el.parentElement.querySelectorAll('[data-ok]')].map(e=>e.dataset.ok);let L=(m=='tw'?(S.asOrd||[]):(S.us.ord||[])).slice();const seen=new Set(L);
  if(!vis.every(v=>seen.has(v))||vis.some((v,i)=>i&&L.indexOf(vis[i-1])>L.indexOf(v))){const rest=L.filter(v=>!vis.includes(v));L=vis.concat(rest)}
  const i=L.indexOf(k),j=L.indexOf(k2);if(i<0||j<0)return;[L[i],L[j]]=[L[j],L[i]];if(m=='tw')S.asOrd=L;else S.us.ord=L}
 save();asCalc()};
