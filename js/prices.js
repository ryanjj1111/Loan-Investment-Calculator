// 自動現價：每個交易日收盤後，GitHub Actions 抓證交所、櫃買中心的全市場收盤價存到 data/
// 網頁打開時讀取並帶入持股的現價；證交所收盤價也可以直接從瀏覽器抓（盤中價格的來源不允許網頁直接讀取，所以不提供）
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

const PX_BASE=['https://raw.githubusercontent.com/ryanjj1111/Loan-Investment-Calculator/main/data/','data/'];
const PX_TWSE='https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL?response=json';
let PXL={},PXU='',pxBusy=0,pxErr='',IND={};
// 產業別（證交所、櫃買中心月營收公開資料裡的「產業別」），新論點沒有族群標籤時自動帶入
const indOf=c=>IND[cU(c)]||'';
// 族群標籤空白時，族群自動用所屬主題、再來是產業別（stGrpOf），所以新論點不再自動寫入標籤
function asTagDef(c){}const PXH={},pxMon=new Set();
const pxTw=()=>new Date(Date.now()+8*36e5);
const pxRoc=s=>{s=String(s).replace(/\D/g,'');if(s.length<7)return'';return(+s.slice(0,s.length-4)+1911)+'-'+s.slice(-4,-2)+'-'+s.slice(-2)};
async function pxGet(path){for(const b of PX_BASE){if(!b.startsWith('http')&&location.protocol=='file:')continue;try{const r=await fetch(b+path+(b.startsWith('http')?'?t='+Math.floor(Date.now()/3e5):''),{cache:'no-cache'});if(r.ok)return await r.json()}catch(e){}}return null}
function pxPut(px,d,src){let n=0;for(const c in px){const v=num(px[c]);if(v==null||v<=0)continue;const o=PXL[c];if(!o||d>=o.d){PXL[c]={v,d,src};n++}}return n}
// 需要價格的代號：持股、論點、基準 ETF
function pxCodes(){const s=new Set([bmC(S)]);for(const o of holdings(S))if(o.q>0)s.add(cU(o.n));for(const T of S.theses||[])if(cU(T.code))s.add(cU(T.code));return s}
// 自動價格的日期不比手填的舊，就帶入（手填的會被當天或更新的收盤價取代）
function pxApply(){let ch=0;S.px=S.px||{};S.pxd=S.pxd||{};S.pxa=S.pxa||{};
 for(const c of pxCodes()){const o=PXL[c];if(!o)continue;const d0=S.pxd[c]||'';if(d0&&o.d<d0)continue;if(num(S.px[c])===o.v&&d0==o.d&&S.pxa[c])continue;S.px[c]=o.v;S.pxd[c]=o.d;S.pxa[c]=o.src||1;ch++}
 if(ch){save();calc();
  // 個股頁開著（不是在記交易）時，用新價格重畫
  if(typeof asCur!='undefined'&&asCur&&typeof AT!='undefined'&&!AT&&typeof asStock=='function'&&$('asOvB')){const b=$('asOvB'),h=b.scrollTop;asStock(asCur.c,asCur.ac);const b2=$('asOvB');if(b2)b2.scrollTop=h}}return ch}
// 歷史收盤價（每月一個檔案），用來自動帶入每筆交易當天的基準 ETF 價格
async function pxHist(){const need=new Set();const add=d=>{if(d&&/^\d{4}-\d{2}/.test(d))need.add(d.slice(0,7))};add(S.dd);for(const x of S.trades||[])if(x.k=='buy'||x.k=='sell')add(x.dt);for(const T of S.theses||[])if(+T.useInit&&num(T.basePx)==null)add(T.baseD||T.created);
 const keep=pxCodes();let got=0;for(const m of need){if(pxMon.has(m))continue;pxMon.add(m);const j=await pxGet('px/'+m+'.json');if(!j||!j.codes||!j.d)continue;
  const ix=[];j.codes.forEach((c,i)=>{if(keep.has(c))ix.push([c,i])});for(const d in j.d){const a=j.d[d],o=PXH[d]||(PXH[d]={});for(const[c,i]of ix)if(a[i]!=null)o[c]=a[i]}got++}
 if(got)calc()}
// 直接從證交所網站抓上市收盤價（網站允許網頁直接讀取）
async function pxTwse(){try{const r=await fetch(PX_TWSE,{cache:'no-cache'});if(!r.ok)return 0;const t=await r.text();const px={};let d='';
  if(t.trim().startsWith('{')){const j=JSON.parse(t),F=j.fields||[],ic=F.indexOf('證券代號'),ip=F.indexOf('收盤價');d=pxRoc(j.date||'');for(const a of j.data||[]){if(ic<0||ip<0)break;px[String(a[ic]).trim()]=String(a[ip]).replace(/,/g,'')}}
  else for(const ln of t.split(/\r?\n/).slice(1)){const a=ln.split('","').map(s=>s.replace(/^"|"$/g,''));if(a.length<9)continue;if(!d)d=pxRoc(a[0]);px[a[1].trim()]=a[8].replace(/,/g,'')}
  return d?pxPut(px,d,'證交所'):0}catch(e){return 0}}
async function pxLoad(force){if(pxBusy)return;pxBusy=1;pxErr='';try{
 if(!Object.keys(IND).length){const ind=await pxGet('industry.json');if(ind)IND=ind.ind||{}}
 const j=await pxGet('prices.json');if(j){PXU=j.upd||'';for(const k of['tse','otc'])if(j[k]&&j[k].date)pxPut(j[k].px||{},j[k].date,k=='tse'?'證交所':'櫃買中心')}else pxErr='讀不到自動價格（離線，或網站還沒有價格資料）';
 // 收盤後（台灣時間 14:00 起的平日）如果還沒有今天的上市收盤價，直接向證交所抓一次（30 分鐘內不重複）
 const tw=pxTw(),today=tw.toISOString().slice(0,10),wd=tw.getUTCDay(),late=tw.getUTCHours()>=14,o=PXL[bmC(S)];
 if(force||(wd>0&&wd<6&&late&&(!o||o.d<today)&&Date.now()-(+ls('lcpx')||0)>18e5)){ls('lcpx',String(Date.now()));await pxTwse()}
 const n=pxApply();await pxHist();if(typeof ckLoad=='function'){if(force&&CK)CK._t=0;ckLoad()}if(force)toast(n?`已更新 ${n} 檔現價`:(Object.keys(PXL).length?'現價已是最新':'讀不到自動價格，請手動填寫'),0);
 if(typeof asCalc=='function')asCalc()}finally{pxBusy=0}}
window.pxRefresh=()=>pxLoad(1);
// 手動改了現價，就不再標示「自動」
document.addEventListener('input',e=>{const c=e.target.dataset&&e.target.dataset.px;if(c&&S.pxa)delete S.pxa[c]});
// 現價狀態一句話（資產頁、結算頁共用）
function pxStatus(){const L=[...pxCodes()].filter(c=>holdings(S).some(o=>o.q>0&&cU(o.n)==c));let a=0,m=0,x=0;const ds=new Set();
 for(const c of L){const v=num((S.px||{})[c]);if(v==null){x++;continue}if((S.pxa||{})[c]){a++;ds.add((S.pxd||{})[c])}else m++}
 const dd=[...ds].sort(),dt=dd.length?dd[dd.length-1].slice(5).replace('-','/'):'';
 return(a?`自動 ${dt} 收盤 ${a} 檔`:'')+(m?`${a?'｜':''}手填 ${m} 檔`:'')+(x?`${a||m?'｜':''}<span class=wn>沒有現價 ${x} 檔</span>`:'')+(pxErr&&!a?`<span class=h>（${pxErr}）</span>`:'')}
