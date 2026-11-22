// 亮色／暗色主題（2026-11-22 介面改版第一批）
// 第一次跟手機設定；按右上角的按鈕切換後記在這台裝置（localStorage lcth），不放進設定檔。
// 顏色都在 index.html 的 CSS 變數；畫布圖表用 thC() 讀目前主題的顏色。
const TH_K='lcth';
const TH_IC={
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
 sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'};
function thSaved(){try{const t=localStorage.getItem(TH_K);return t=='dark'||t=='light'?t:null}catch(e){return null}}
function thSys(){try{return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){return'light'}}
function thCur(){return document.documentElement.dataset.theme=='dark'?'dark':'light'}
// 讀 CSS 變數（畫布用），例如 thC('pri')
function thC(n){try{return getComputedStyle(document.documentElement).getPropertyValue('--'+n).trim()||'#888'}catch(e){return'#888'}}
function thBtn(){const b=document.getElementById('thB');if(!b)return;const d=thCur()=='dark';b.innerHTML=d?TH_IC.sun:TH_IC.moon;b.title=d?'換成亮色':'換成暗色'}
function thApply(t,redraw){document.documentElement.dataset.theme=t;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t=='dark'?'#0c1211':'#f3f5f4';thBtn();if(redraw)thRedraw()}
// 畫布圖表不會跟著 CSS 變，要重畫；其他畫面都用 CSS 變數，不用重畫
function thRedraw(){try{if(typeof draw=='function')draw()}catch(e){}}
function thTog(){const t=thCur()=='dark'?'light':'dark';try{localStorage.setItem(TH_K,t)}catch(e){}thApply(t,1)}
thApply(thSaved()||thSys(),0);
document.addEventListener('DOMContentLoaded',thBtn);
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{if(!thSaved())thApply(e.matches?'dark':'light',1)})}catch(e){}
