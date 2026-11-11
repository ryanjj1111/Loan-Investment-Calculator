// 自動檢核卡的資料：每個交易日抓全市場公開資料（不含任何個人持股），算好每檔股票的指標存到 data/chk.json
// 來源：證交所（每日收盤行情、三大法人、融資融券、加權指數、三大法人金額）、櫃買中心（上櫃收盤行情、三大法人、融資融券）、
//       公開資訊觀測站（月營收）、集保結算所（股權分散表，每週）
// 歷史資料存在 data/ck/（每月一個檔案），第一次會往回補抓；每次執行有時間上限，沒抓完的下次接著抓
// 用法：node tools/fetch-checks.mjs [分鐘上限，預設 12]
import fs from 'node:fs';
const T0=Date.now(),BUDGET=(+process.argv[2]||12)*60e3,left=()=>BUDGET-(Date.now()-T0);
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const keep=c=>/^(\d{4}|00\d{2,4}[A-Z]?)$/.test(c);
const nz=v=>{v=String(v??'').replace(/<[^>]*>/g,'').replace(/[,\s]/g,'');if(v===''||v=='--'||v=='-')return null;const x=+v;return isFinite(x)?x:null};
const ymdIso=s=>{s=String(s).replace(/\D/g,'');return s.length==8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):''};
const rocIso=s=>{const m=String(s).match(/(\d{2,3})\D(\d{1,2})\D(\d{1,2})/);return m?(+m[1]+1911)+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const twNow=()=>new Date(Date.now()+8*36e5),today=twNow().toISOString().slice(0,10);
const log=[];const say=t=>{console.log(t);log.push(t)};
const last={};// 每個網站上次送出的時間，同一個網站至少間隔 2.2 秒
async function get(u,type='json',enc='utf-8'){const h=new URL(u).host;for(let k=0;k<2;k++){const w=(last[h]||0)+2200-Date.now();if(w>0)await sleep(w);last[h]=Date.now();
 try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(60000)});if(r.ok){const b=Buffer.from(await r.arrayBuffer()),t=new TextDecoder(enc).decode(b);return type=='json'?JSON.parse(t):t}say(`  HTTP ${r.status} ${u}`);if(r.status==404)return null}catch(e){say(`  失敗 ${u}：${e.message}`)}await sleep(5000)}return null}
const rd=f=>fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null;
fs.mkdirSync('data/ck',{recursive:true});
const ST=rd('data/ck/state.json')||{fail:{},rev:{}};const failed=k=>(ST.fail[k]||0)>=3,fail=k=>{ST.fail[k]=(ST.fail[k]||0)+1};

// ---------- 每月歷史檔：{codes:[...], d:{日期:[數值（和 codes 同順序）]}}（和 data/px 同格式）
const arcs={};
function arc(dir,m){const k=dir+'/'+m;if(!arcs[k]){const f=`${dir}/${m}.json`,A=rd(f)||{codes:[],d:{}};A._ix=new Map(A.codes.map((c,i)=>[c,i]));A._f=f;arcs[k]=A}return arcs[k]}
const has=(dir,d,probe)=>{const f=`${dir}/${d.slice(0,7)}.json`;if(!arcs[dir+'/'+d.slice(0,7)]&&!fs.existsSync(f))return false;const A=arc(dir,d.slice(0,7)),r=A.d[d];return!!r&&probe.some(c=>A._ix.has(c)&&r[A._ix.get(c)]!=null)};
function put(dir,d,vals){const A=arc(dir,d.slice(0,7)),row=A.d[d]?A.d[d].slice():new Array(A.codes.length).fill(null);
 for(const c in vals){let i=A._ix.get(c);if(i==null){i=A.codes.length;A.codes.push(c);A._ix.set(c,i);for(const x in A.d)A.d[x].push(null);row.push(null)}row[i]=vals[c]}
 while(row.length<A.codes.length)row.push(null);A.d[d]=row;A._ch=1}
function saveArcs(){for(const k in arcs){const A=arcs[k];if(!A._ch)continue;const days=Object.keys(A.d).sort();fs.mkdirSync(A._f.replace(/\/[^/]+$/,''),{recursive:true});
 fs.writeFileSync(A._f,'{"codes":'+JSON.stringify(A.codes)+',\n"d":{\n'+days.map(d=>JSON.stringify(d)+':'+JSON.stringify(A.d[d])).join(',\n')+'\n}}\n');A._ch=0}}
// 讀一段期間的歷史：回傳 {days:[...], get(code)=>[數值（和 days 同順序）]}
function series(dir,days){const rows=days.map(d=>{const A=fs.existsSync(`${dir}/${d.slice(0,7)}.json`)||arcs[dir+'/'+d.slice(0,7)]?arc(dir,d.slice(0,7)):null;return A&&A.d[d]?{A,r:A.d[d]}:null});
 return c=>rows.map(o=>{if(!o)return null;const i=o.A._ix.get(c);return i==null?null:o.r[i]})}

// ---------- 交易日與加權指數（證交所 FMTQIK，每月一次請求）
const MK=rd('data/ck/market.json')||{taiex:{},fx:{}};
const monthsBack=n=>{const t=twNow(),L=[];for(let k=n;k>=0;k--){const d=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-k,1));L.push(d.toISOString().slice(0,7))}return L};
for(const m of monthsBack(13)){const cur=m>=today.slice(0,7)||m==monthsBack(1)[0];if(!cur&&Object.keys(MK.taiex).some(d=>d.startsWith(m)))continue;
 const j=await get(`https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=${m.replace('-','')}01&response=json`);if(!j||j.stat!='OK'){say(`加權指數 ${m}：抓不到`);continue}
 const F=j.fields||[],id=F.indexOf('日期'),ix=F.indexOf('發行量加權股價指數');for(const a of j.data||[]){const d=rocIso(a[id]),v=nz(a[ix]);if(d&&v)MK.taiex[d]=v}}
const CAL=Object.keys(MK.taiex).sort();say(`交易日：${CAL[0]}～${CAL[CAL.length-1]}，共 ${CAL.length} 天`);

// ---------- 每日資料
const TSE_P=['2330','2317','2454'],OTC_P=['6488','5347','8299','3105'];
const pxIx=s=>{const T=s.find(t=>(t.fields||[]).includes('證券代號')&&(t.fields||[]).includes('收盤價'));return T};
async function tseDay(d){const j=await get(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${d.replace(/-/g,'')}&type=ALLBUT0999&response=json`);if(!j||j.stat!='OK'||ymdIso(j.date)!=d)return null;
 const T=pxIx(j.tables||[]);if(!T)return null;const F=T.fields,ic=F.indexOf('證券代號'),iv=F.indexOf('成交股數'),ip=F.indexOf('收盤價'),px={},vol={};
 for(const a of T.data||[]){const c=String(a[ic]).trim();if(!keep(c))continue;const v=nz(a[iv]),p=nz(a[ip]);if(v!=null)vol[c]=Math.round(v/1000);if(p)px[c]=p}return{px,vol}}
async function otcDay(d){const j=await get(`https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=${d.replace(/-/g,'/')}&type=EW&response=json`);if(!j||ymdIso(j.date)!=d)return null;
 const T=(j.tables||[])[0];if(!T)return null;const F=(T.fields||[]).map(s=>String(s).trim()),ic=F.indexOf('代號'),ip=F.indexOf('收盤'),iv=F.indexOf('成交股數'),px={},vol={};if(ic<0||iv<0)return null;
 for(const a of T.data||[]){const c=String(a[ic]).trim();if(!keep(c))continue;const v=nz(a[iv]),p=nz(a[ip]);if(v!=null)vol[c]=Math.round(v/1000);if(p)px[c]=p}return{px,vol}}
// 三大法人：外資（不含外資自營商）與投信買賣超（張）
async function tseInst(d){const j=await get(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${d.replace(/-/g,'')}&selectType=ALLBUT0999&response=json`);if(!j||j.stat!='OK'||ymdIso(j.date)!=d)return null;
 const F=j.fields||[],ic=F.indexOf('證券代號'),iF=F.indexOf('外陸資買賣超股數(不含外資自營商)'),iT=F.indexOf('投信買賣超股數');if(ic<0||iF<0||iT<0){say('T86 欄位改了');return null}
 const fi={},it={};for(const a of j.data||[]){const c=String(a[ic]).trim();if(!keep(c))continue;fi[c]=Math.round((nz(a[iF])||0)/1000);it[c]=Math.round((nz(a[iT])||0)/1000)}return{fi,it}}
async function otcInst(d){const j=await get(`https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&sect=EW&date=${d.replace(/-/g,'/')}&response=json`);if(!j||ymdIso(j.date)!=d)return null;
 const T=(j.tables||[])[0];if(!T||(T.fields||[]).length<24){say('櫃買三大法人欄位改了');return null}
 // 欄位順序：代號、名稱、外資及陸資(不含外資自營商) 買/賣/超、外資自營商 買/賣/超、外資合計 買/賣/超、投信 買/賣/超、…
 const fi={},it={};for(const a of T.data||[]){const c=String(a[0]).trim();if(!keep(c))continue;fi[c]=Math.round((nz(a[4])||0)/1000);it[c]=Math.round((nz(a[13])||0)/1000)}return{fi,it}}
// 融資餘額（張）
async function tseMg(d){const j=await get(`https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=${d.replace(/-/g,'')}&selectType=ALL&response=json`);if(!j||j.stat!='OK'||ymdIso(j.date)!=d)return null;
 const T=(j.tables||[]).find(t=>(t.fields||[]).includes('代號')&&(t.fields||[]).includes('今日餘額'));if(!T)return null;const ic=T.fields.indexOf('代號'),ib=T.fields.indexOf('今日餘額'),mg={};
 for(const a of T.data||[]){const c=String(a[ic]).trim();if(keep(c)&&nz(a[ib])!=null)mg[c]=nz(a[ib])}return mg}
async function otcMg(d){const j=await get(`https://www.tpex.org.tw/www/zh-tw/margin/balance?date=${d.replace(/-/g,'/')}&response=json`);if(!j||ymdIso(j.date)!=d)return null;
 const T=(j.tables||[])[0];if(!T)return null;const F=(T.fields||[]).map(s=>String(s).trim()),ic=F.indexOf('代號'),ib=F.indexOf('資餘額'),mg={};if(ic<0||ib<0)return null;
 for(const a of T.data||[]){const c=String(a[ic]).trim();if(keep(c)&&nz(a[ib])!=null)mg[c]=nz(a[ib])}return mg}
// 外資（不含外資自營商）全市場買賣超金額（億元，證交所 BFI82U）
async function bfi(d){const j=await get(`https://www.twse.com.tw/rwd/zh/fund/BFI82U?type=day&dayDate=${d.replace(/-/g,'')}&response=json`);if(!j||j.stat!='OK')return null;
 const r=(j.data||[]).find(a=>/外資及陸資/.test(a[0]));if(!r){say('BFI82U 找不到外資那一列：'+JSON.stringify(j.data||[]).slice(0,200));return null}return Math.round(nz(r[r.length-1])/1e6)/100}

const pxFirst=(()=>{const L=fs.existsSync('data/px')?fs.readdirSync('data/px').filter(f=>/^\d{4}-\d{2}\.json$/.test(f)).sort():[];return L.length?L[0].slice(0,7):'9999'})();
const N_PX=260,N_CH=65,N_FX=250;
const D=CAL.slice(-N_PX).reverse();let nReq=0,stop=false;
for(const [k,d] of D.entries()){if(left()<60e3){stop=true;break}
 const mon=d.slice(0,7);
 for(const [nm,fn,P] of [['上市',tseDay,TSE_P],['上櫃',otcDay,OTC_P]]){const key='p|'+nm+'|'+d;if(has('data/ck/vol',d,P)||failed(key))continue;
  const r=await fn(d);nReq++;if(!r){if(d<today)fail(key);continue}put('data/ck/vol',d,r.vol);
  // 收盤價：只補 data/px 還沒有的月份（現有月份由收盤價流程負責，避免兩邊同時改同一個檔案）
  if(mon<pxFirst)put('data/px',d,r.px)}
 if(k<N_CH){for(const [nm,fn,P] of [['上市',tseInst,TSE_P],['上櫃',otcInst,OTC_P]]){const key='i|'+nm+'|'+d;if(has('data/ck/fi',d,P)||failed(key))continue;const r=await fn(d);nReq++;if(!r){if(d<today)fail(key);continue}put('data/ck/fi',d,r.fi);put('data/ck/it',d,r.it)}
  for(const [nm,fn,P] of [['上市',tseMg,TSE_P],['上櫃',otcMg,OTC_P]]){const key='m|'+nm+'|'+d;if(has('data/ck/mg',d,P)||failed(key))continue;const r=await fn(d);nReq++;if(!r){if(d<today)fail(key);continue}put('data/ck/mg',d,r)}}
 if(k<N_FX&&MK.fx[d]==null&&!failed('f|'+d)){const v=await bfi(d);nReq++;if(v==null){if(d<today)fail('f|'+d)}else MK.fx[d]=v}
 if(nReq&&nReq%40==0){saveArcs();say(`…已處理到 ${d}（${nReq} 次請求，剩 ${Math.round(left()/6e4)} 分鐘）`)}}
saveArcs();say(`每日資料：${nReq} 次請求${stop?'（時間到，下次繼續）':''}`);

// ---------- 還原事件（2026-11-11）：除權息、減資、面額變更、ETF 分割的「前一日收盤 → 參考價」
// 證交所 TWT49U（除權除息計算結果）、TWTAUU（減資恢復買賣）、TWTB8U（變更面額恢復買賣）、TWTCAU（ETF 分割）；
// 櫃買中心 bulletin/exDailyQ（除權除息計算結果）、bulletin/revivt（減資）。每月一次請求，最近 2 個月每次重抓。
// f＝參考價 ÷ 前一日收盤（之前的股價乘上 f 就是還原價，含現金股利）；fs＝只算股數變動的部分（配股、減資、分割），每股數字（EPS、股利）用這個換算
// 抓不到的事件由跳動保險（jp）擋住
const ADJ=rd('data/ck/adj.json')||{ev:{},mon:{}};ADJ.ev=ADJ.ev||{};ADJ.mon=ADJ.mon||{};
const anyIso=s=>{s=String(s??'').trim();let m=s.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);if(m&&+m[1]>1990)return`${m[1]}-${m[2]}-${m[3]}`;
 m=s.match(/^(\d{2,3})\D+(\d{1,2})\D+(\d{1,2})/);if(m)return(+m[1]+1911)+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');m=s.match(/^(\d{3})(\d{2})(\d{2})$/);return m?(+m[1]+1911)+'-'+m[2]+'-'+m[3]:''};
const lastDay=m=>new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),0)).getUTCDate();
const ymd=(m,d)=>m.replace('-','')+String(d).padStart(2,'0'),slash=(m,d)=>m.replace('-','/')+'/'+String(d).padStart(2,'0');
// 欄位：先用欄名找，找不到用固定位置
function adjRows(j){if(!j)return null;const T=Array.isArray(j.tables)?j.tables[0]:j;if(!T)return[];const F=(T.fields||[]).map(x=>String(x).trim());return{F,data:T.data||[]}}
const col=(F,re,def)=>{const i=F.findIndex(f=>re.test(f));return i>=0?i:def};
const ADJ_SRC=[
 {k:'tse-x',u:m=>`https://www.twse.com.tw/rwd/zh/exRight/TWT49U?response=json&startDate=${ymd(m,1)}&endDate=${ymd(m,lastDay(m))}`,
  row:(F,a)=>{const pr=nz(a[col(F,/除權息前收盤價/,3)]),rf=nz(a[col(F,/^除權息參考價$/,4)]),kd=String(a[col(F,/權\/息/,6)]||''),xd=nz(a[col(F,/減除股利參考價/,10)]);
   return{d:anyIso(a[col(F,/資料日期/,0)]),c:String(a[col(F,/股票代號/,1)]).trim(),pr,rf,fs:/權/.test(kd)&&xd>0&&rf>0?rf/xd:1,kd:'x'}}},
 {k:'tse-r',u:m=>`https://www.twse.com.tw/rwd/zh/reducation/TWTAUU?response=json&startDate=${ymd(m,1)}&endDate=${ymd(m,lastDay(m))}`,
  row:(F,a)=>({d:anyIso(a[0]),c:String(a[1]).trim(),pr:nz(a[3]),rf:nz(a[4]),kd:'r'})},
 {k:'tse-p',u:m=>`https://www.twse.com.tw/rwd/zh/change/TWTB8U?response=json&startDate=${ymd(m,1)}&endDate=${ymd(m,lastDay(m))}`,
  row:(F,a)=>({d:anyIso(a[0]),c:String(a[1]).trim(),pr:nz(a[3]),rf:nz(a[4]),kd:'p'})},
 {k:'tse-e',u:m=>`https://www.twse.com.tw/rwd/zh/split/TWTCAU?response=json&startDate=${ymd(m,1)}&endDate=${ymd(m,lastDay(m))}`,
  row:(F,a)=>({d:anyIso(a[0]),c:String(a[1]).trim(),pr:nz(a[4]),rf:nz(a[5]),kd:'p'})},
 {k:'otc-x',u:m=>`https://www.tpex.org.tw/www/zh-tw/bulletin/exDailyQ?startDate=${slash(m,1)}&endDate=${slash(m,lastDay(m))}&response=json`,
  row:(F,a)=>{const pr=nz(a[col(F,/除權息前收盤價/,3)]),rf=nz(a[col(F,/^除權息參考價$/,4)]),kd=String(a[col(F,/權\/息/,8)]||''),dv=nz(a[col(F,/^息值$/,6)])||0;
   return{d:anyIso(a[col(F,/除權息日期/,0)]),c:String(a[col(F,/^代號$/,1)]).trim(),pr,rf,fs:/權/.test(kd)&&pr-dv>0&&rf>0?rf/(pr-dv):1,kd:'x'}}},
 {k:'otc-r',u:m=>`https://www.tpex.org.tw/www/zh-tw/bulletin/revivt?startDate=${slash(m,1)}&endDate=${slash(m,lastDay(m))}&response=json`,
  row:(F,a)=>({d:anyIso(a[0]),c:String(a[1]).trim(),pr:nz(a[3]),rf:nz(a[4]),kd:'r'})}];
{let nA=0,got={};const MS=monthsBack(13).filter(m=>m>='2025-10'),recent=new Set(MS.slice(-2));
 for(const m of MS)for(const S0 of ADJ_SRC){const key=S0.k+'|'+m;if(ADJ.mon[key]&&!recent.has(m))continue;if(left()<50e3)break;
  const j=await get(S0.u(m));nA++;const R0=adjRows(j);if(!R0){say(`還原事件 ${key}：抓不到`);continue}
  const st=String(j.stat||'');if(!R0.data.length&&!/ok|沒有符合|查無/i.test(st)&&st){say(`還原事件 ${key}：${st}`)}
  let n=0;for(const a of R0.data){const o=S0.row(R0.F,a);if(!o||!o.d||!keep(o.c)||!(o.pr>0)||!(o.rf>0))continue;const f=o.rf/o.pr,fs=o.fs!=null?o.fs:f;if(Math.abs(f-1)<5e-4&&Math.abs(fs-1)<5e-4)continue;
   const L=ADJ.ev[o.c]=ADJ.ev[o.c]||[];const i=L.findIndex(e=>e[0]==o.d&&e[3]==o.kd);const e=[o.d,+f.toFixed(6),+fs.toFixed(6),o.kd];if(i>=0)L[i]=e;else L.push(e);n++}
  ADJ.mon[key]=1;got[S0.k]=(got[S0.k]||0)+n}
 for(const c in ADJ.ev)ADJ.ev[c].sort((a,b)=>a[0]<b[0]?-1:1);ADJ.upd=today;
 fs.writeFileSync('data/ck/adj.json',JSON.stringify(ADJ));say(`還原事件：${nA} 次請求；這次新增或更新 ${Object.entries(got).map(([k,v])=>k+' '+v).join('、')||'0'}；共 ${Object.values(ADJ.ev).reduce((a,L)=>a+L.length,0)} 筆、${Object.keys(ADJ.ev).length} 檔`)}

// ---------- 月營收（公開資訊觀測站，每月一個檔案；最近 2 個月每次重抓，因為公司陸續公布）
const RV=rd('data/ck/rev.json')||{};// {'2026-09':{code:[營收（千元）, 年增率 %]}}
const revMonths=monthsBack(38).slice(0,-1);
for(const m of revMonths.slice().reverse()){if(left()<45e3)break;const recent=revMonths.indexOf(m)>=revMonths.length-2;if(RV[m]&&!recent)continue;if(!recent&&failed('r|'+m))continue;
 const [y,mm]=m.split('-').map(Number),o={};let ok=0;
 for(const mk of['sii','otc'])for(const t of[0,1]){const h=await get(`https://mopsov.twse.com.tw/nas/t21/${mk}/t21sc03_${y-1911}_${mm}_${t}.html`,'text','big5');if(!h)continue;ok=1;
  for(const r of h.matchAll(/<tr[^>]*>\s*<td[^>]*>\s*([0-9A-Z]{4,6})\s*<\/td>\s*<td[^>]*>[^<]*<\/td>((?:\s*<td[^>]*>[^<]*<\/td>){5})/gi)){const c=r[1].trim();if(!keep(c))continue;const v=[...r[2].matchAll(/<td[^>]*>([^<]*)<\/td>/gi)].map(x=>nz(x[1]));if(v[0]==null)continue;o[c]=[v[0],v[4]==null?null:Math.round(v[4]*10)/10]}}
 if(ok&&Object.keys(o).length>300){RV[m]=o;delete ST.fail['r|'+m]}else if(!recent)fail('r|'+m);say(`月營收 ${m}：${Object.keys(o).length} 家`)}
for(const m in RV)if(m<revMonths[0])delete RV[m];
fs.writeFileSync('data/ck/rev.json',JSON.stringify(RV));

// ---------- 千張大戶持股比例（集保結算所股權分散表，只有最新一週，所以每週累積）
const BH=rd('data/ck/tdcc.json')||{};
if(left()>40e3){const t=await get('https://opendata.tdcc.com.tw/getOD.ashx?id=1-5','text');if(t){const o={};let dt='';
 for(const ln of t.split(/\r?\n/)){const a=ln.split(',');if(a.length<6||a[2]!='15')continue;const c=a[1].trim();if(!keep(c))continue;dt=ymdIso(a[0]);o[c]=nz(a[5])}
 if(dt&&Object.keys(o).length>500){BH[dt]=o;say(`股權分散表 ${dt}：${Object.keys(o).length} 檔`)}}
 const w=Object.keys(BH).sort();for(const d of w.slice(0,-12))delete BH[d];fs.writeFileSync('data/ck/tdcc.json',JSON.stringify(BH))}

// ---------- 估值（證交所 BWIBBU_d、櫃買中心 peQryDate：本益比、股價淨值比、殖利率、每股股利）；每月一個樣本，近 10 年
const N_VAL=121;fs.mkdirSync('data/ck/val',{recursive:true});
async function valDay(d){const a=await get(`https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=${d.replace(/-/g,'')}&selectType=ALL&response=json`);if(!a||a.stat!='OK'||!(a.data||[]).length)return null;
 const s={},F=a.fields||[],I=k=>F.indexOf(k),ic=I('證券代號'),ip=I('收盤價'),iy=I('殖利率(%)'),idy=I('股利年度'),ie=I('本益比'),ib=I('股價淨值比');
 for(const r of a.data){const c=String(r[ic]).trim();if(!keep(c))continue;const px=ip>=0?nz(r[ip]):null,y=nz(r[iy]);s[c]=[nz(r[ie]),nz(r[ib]),px&&y!=null?Math.round(px*y)/100:null,idy>=0?nz(r[idy]):null]}
 const b=await get(`https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=${d.replace(/-/g,'/')}&response=json`),T=b&&(b.tables||[])[0];
 if(T&&(T.data||[]).length){const F2=(T.fields||[]).map(x=>String(x).trim()),J=k=>F2.indexOf(k),ic2=J('股票代號'),ie2=J('本益比'),id2=J('每股股利'),iy2=J('股利年度'),ib2=J('股價淨值比');
  for(const r of T.data){const c=String(r[ic2]).trim();if(!keep(c))continue;s[c]=[nz(r[ie2]),nz(r[ib2]),nz(r[id2]),nz(r[iy2])]}}
 return s}
{const months=monthsBack(N_VAL-1),cur=months[months.length-1];let nv=0;
 // 這個月：每次更新成最近一個交易日
 const dl=CAL.filter(d=>d<=today).slice(-1)[0];const fc=`data/ck/val/${cur}.json`,oc=rd(fc);if(dl&&(!oc||oc.d<dl)&&left()>60e3){const s=await valDay(dl);nv++;if(s){fs.writeFileSync(fc,JSON.stringify({d:dl,s}));say(`估值 ${dl}：${Object.keys(s).length} 檔`)}}
 for(const m of months.slice(0,-1).reverse()){if(left()<90e3)break;const f=`data/ck/val/${m}.json`;if(fs.existsSync(f)||failed('v|'+m))continue;
  const[y,mm]=m.split('-').map(Number);let s=null,dd='';for(let k=0;k<8&&!s;k++){const t=new Date(Date.UTC(y,mm,0-k)),wd=t.getUTCDay();if(wd==0||wd==6)continue;dd=t.toISOString().slice(0,10);s=await valDay(dd);nv++}
  if(s){fs.writeFileSync(f,JSON.stringify({d:dd,s}));delete ST.fail['v|'+m]}else fail('v|'+m)}
 for(const f of fs.readdirSync('data/ck/val'))if(f.slice(0,7)<months[0])fs.unlinkSync('data/ck/val/'+f);
 say(`估值：${nv} 次請求，已有 ${fs.readdirSync('data/ck/val').length} 個月`)}

// ---------- 財報（公開資訊觀測站彙總報表：綜合損益表、資產負債表、現金流量表；單位千元）
// 公布期限：第一季 5/15、第二季 8/14、第三季 11/14、年報隔年 3/31；期限前每天重抓一次，之後不再重抓
const FIN=rd('data/ck/fin.json')||{};ST.finAt=ST.finAt||{};
const finDue=(y,s)=>{const Y=y+1911;return s==1?`${Y}-05-20`:s==2?`${Y}-08-19`:s==3?`${Y}-11-19`:`${Y+1}-04-05`};
const finOpen=(y,s)=>{const Y=y+1911;return s==1?`${Y}-04-01`:s==2?`${Y}-07-01`:s==3?`${Y}-10-01`:`${Y+1}-01-01`};
const SEAS=(()=>{const L=[];const t=twNow();let y=t.getUTCFullYear()-1911,s=Math.floor(t.getUTCMonth()/3);if(s==0){y--;s=4}for(let k=0;k<9;k++){L.push([y,s]);s--;if(s==0){y--;s=4}}return L})();
const NEEDF=new Set();{const [y0]=SEAS[0];for(const [y,s] of SEAS.slice(0,7))NEEDF.add(y+'-'+s);for(const y of[y0-1,y0-2,y0-3])NEEDF.add(y+'-4')}
// 資產負債表只要最近 2 季；現金流量表要最近 2 季、去年同季與去年年報（算近 4 季）
const FNEED={sb05:new Set(SEAS.slice(0,2).map(([y,s])=>y+'-'+s)),sb20:new Set(SEAS.slice(0,2).flatMap(([y,s])=>[y+'-'+s,(y-1)+'-'+s,(y-1)+'-4']))};
async function mops(kind,y,s,ty){const u=`https://mopsov.twse.com.tw/mops/web/ajax_t163${kind}`,body=`encodeURIComponent=1&step=1&firstin=1&off=1&isQuery=Y&TYPEK=${ty}&year=${y}&season=${String(s).padStart(2,'0')}`;
 for(let k=0;k<2;k++){const w=(last.mops||0)+4000-Date.now();if(w>0)await sleep(w);last.mops=Date.now();try{const r=await fetch(u,{method:'POST',headers:Object.assign({},UA,{'Content-Type':'application/x-www-form-urlencoded'}),body,signal:AbortSignal.timeout(Math.max(30e3,Math.min(220e3,left()-20e3)))});if(r.ok)return await r.text();say(`  HTTP ${r.status} ${kind} ${y}/${s} ${ty}`)}catch(e){say(`  失敗 ${kind} ${y}/${s} ${ty}：${e.message}`)}if(left()<120e3)break;await sleep(5000)}return null}
const cellT=x=>x.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim();
function mopsRows(h,cols){const out={};for(const tb of h.match(/<table[^>]*>[\s\S]*?<\/table>/gi)||[]){const th=[...tb.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>cellT(m[1]));const ic=th.indexOf('公司代號');if(ic<0)continue;
  const ix=cols.map(alts=>{for(const a of alts){const i=th.indexOf(a);if(i>=0)return i}return-1});
  for(const tr of tb.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)||[]){const td=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>cellT(m[1]));if(td.length<th.length-1)continue;const c=td[ic];if(!keep(c))continue;out[c]=ix.map(i=>i>=0?nz(td[i]):null)}}return out}
const FCOL={sb04:[['營業收入'],['營業毛利（毛損）淨額','營業毛利（毛損）'],['基本每股盈餘（元）']],sb05:[['資產總計','資產總額'],['負債總計','負債總額']],sb20:[['營業活動之淨現金流入（流出）'],['投資活動之淨現金流入（流出）']]};
{let nf=0;const ALLF=[...new Set([...NEEDF,...FNEED.sb20])].map(k=>k.split('-').map(Number)).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);for(const [y,s] of ALLF){const key=y+'-'+s;const T=FIN[key]=FIN[key]||{};const open=today>=finOpen(y,s),closed=today>finDue(y,s);if(!open)continue;
  for(const kind of['sb04','sb05','sb20']){if(!(FNEED[kind]||NEEDF).has(key))continue;if(left()<150e3)break;
   const k2=kind+'|'+key,done=T[kind]&&(closed?T[kind+'_c']:ST.finAt[k2]==today);if(done||failed('f|'+k2))continue;let ok=0;const o=T[kind]||{};
   for(const ty of['sii','otc']){if(left()<150e3)break;const h=await mops(kind,y,s,ty);nf++;if(!h)continue;const R=mopsRows(h,FCOL[kind]);if(Object.keys(R).length>20){Object.assign(o,R);ok++}}
   if(ok==2){T[kind]=o;ST.finAt[k2]=today;if(closed)T[kind+'_c']=1;say(`財報 ${kind} ${y}/${s}：${Object.keys(o).length} 家`)}else if(closed)fail('f|'+k2);else if(ok)T[kind]=o}}
 for(const k in FIN)if(!ALLF.some(([y,s])=>y+'-'+s==k))delete FIN[k];fs.writeFileSync('data/ck/fin.json',JSON.stringify(FIN));say(`財報：${nf} 次請求`)}

// ---------- 刪掉太舊的籌碼資料
for(const dir of['data/ck/fi','data/ck/it','data/ck/mg','data/ck/vol']){if(!fs.existsSync(dir))continue;const keepM=new Set(CAL.slice(-(dir.endsWith('vol')?N_PX:N_CH)-25).map(d=>d.slice(0,7)));for(const f of fs.readdirSync(dir))if(!keepM.has(f.slice(0,7)))fs.unlinkSync(`${dir}/${f}`)}
fs.writeFileSync('data/ck/market.json',JSON.stringify(MK));ST.upd=new Date().toISOString();fs.writeFileSync('data/ck/state.json',JSON.stringify(ST));

// ---------- 計算指標，寫 data/chk.json（網頁讀這個檔案）
const r2=x=>x==null||!isFinite(x)?null:Math.round(x*100)/100,r1=x=>x==null||!isFinite(x)?null:Math.round(x*10)/10;
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sma=(a,n,end=a.length)=>end>=n?avg(a.slice(end-n,end)):null;
function rsiSeries(c,n=14){const out=new Array(c.length).fill(null);if(c.length<=n)return out;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];d>0?g+=d:l-=d}g/=n;l/=n;out[n]=l==0?100:100-100/(1+g/l);
 for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+(d>0?d:0))/n;l=(l*(n-1)+(d<0?-d:0))/n;out[i]=l==0?100:100-100/(1+g/l)}return out}
const ema=(a,n)=>{const k=2/(n+1),o=[];let e=null;for(const x of a){e=e==null?x:x*k+e*(1-k);o.push(e)}return o};
// 連幾日沒有創 20 日新低（收盤高於前 20 日最低收盤）
const dNL=c=>{let k=0;for(let i=c.length-1;i>=20&&k<20;i--){if(c[i]>Math.min(...c.slice(i-20,i)))k++;else break}return k};
function macdHist(c){if(c.length<35)return[];const e12=ema(c,12),e26=ema(c,26),dif=c.map((_,i)=>e12[i]-e26[i]),sig=ema(dif,9);return dif.map((x,i)=>x-sig[i])}
// 跳動保險（2026-11-11）：單日漲跌超過 10.5%（漲跌幅限制 10%），多半是除權、分割、減資讓原始收盤價不連續；
// 回傳最近一次的［日期, 漲跌 %］，網頁上和價格有關的條件改標 ❔。上市後前 5 個交易日沒有漲跌幅限制，不算
function jumpOf(cl,cd){let r=null;for(let i=5;i<cl.length;i++){const q=cl[i]/cl[i-1]-1;if(Math.abs(q)>0.105)r=[cd[i],Math.round(q*1000)/10]}return r}
// 收盤價：data/px（收盤價流程）＋ 補抓的較早月份
const PD=CAL.filter(d=>d<=today).slice(-N_PX);const pxS=series('data/px',PD),vS=series('data/ck/vol',PD);
const CH=PD.slice(-N_CH),fiS=series('data/ck/fi',CH),itS=series('data/ck/it',CH),mgS=series('data/ck/mg',CH);
const lastWith=(dir,days,P)=>{for(let i=days.length-1;i>=0;i--)if(has(dir,days[i],P))return i;return-1};
const iP=Math.max(lastWith('data/px',PD,TSE_P),lastWith('data/px',PD,OTC_P)),iC=lastWith('data/ck/fi',CH,TSE_P),iM=lastWith('data/ck/mg',CH,TSE_P);
const dP=PD[iP]||'',dC=CH[iC]||'',dM=CH[iM]||'';
const codes=new Set();for(const m of new Set(PD.slice(-5).map(d=>d.slice(0,7))))for(const c of arc('data/px',m).codes)codes.add(c);
const RM=Object.keys(RV).sort(),BW=Object.keys(BH).sort().slice(-3);
// 估值、財報的衍生指標
const VM=fs.existsSync('data/ck/val')?fs.readdirSync('data/ck/val').filter(f=>/\.json$/.test(f)).sort().map(f=>rd('data/ck/val/'+f)):[];const VL=VM[VM.length-1]||null;
const med=a=>{a=a.slice().sort((x,y)=>x-y);if(!a.length)return null;const k=a.length>>1;return a.length%2?a[k]:(a[k-1]+a[k])/2};
const FK=Object.keys(FIN).filter(k=>FIN[k].sb04).sort((a,b)=>{const[p,q]=a.split('-').map(Number),[r,s]=b.split('-').map(Number);return p-r||q-s});
const fv=(k,c,i)=>{const t=FIN[k]&&FIN[k].sb04&&FIN[k].sb04[c];return t?t[i]:null};
function finOf(c){// 季資料：每季的營收、毛利（累計數相減）
 const Q=[];for(const k of FK){const[y,s]=k.split('-').map(Number);const r=fv(k,c,0),g=fv(k,c,1),e=fv(k,c,2);if(r==null&&e==null)continue;let rq=r,gq=g,eq=e;
  if(s>1){const p=y+'-'+(s-1);const r0=fv(p,c,0),g0=fv(p,c,1),e0=fv(p,c,2);if(!FIN[p]||(r!=null&&r0==null)){rq=gq=null;eq=e0==null?null:eq}else{rq=r!=null&&r0!=null?r-r0:null;gq=g!=null&&g0!=null?g-g0:null;eq=e!=null&&e0!=null?e-e0:null}}
  Q.push({k,y,s,rq,gq,eq,cum:e})}
 const gm=Q.filter(q=>q.rq>0&&q.gq!=null).slice(-4).map(q=>r1(q.gq/q.rq*100));
 // 近 4 季 EPS：最新一季累計＋去年年報－去年同季累計
 let eps4=null;const L=Q.filter(q=>q.cum!=null).slice(-1)[0];if(L){if(L.s==4)eps4=L.cum;else{const a=fv((L.y-1)+'-4',c,2),b=fv((L.y-1)+'-'+L.s,c,2);if(a!=null&&b!=null)eps4=r2(L.cum+a-b)}}
 const Y4=FK.filter(k=>k.endsWith('-4')).map(k=>+k.split('-')[0]).sort((a,b)=>a-b).slice(-3),epsY=Y4.length==3?Y4.map(y=>fv(y+'-4',c,2)):null;
 let debt=null;for(const k of FK.slice().reverse()){const b=FIN[k].sb05&&FIN[k].sb05[c];if(b&&b[0]){debt=r1(b[1]/b[0]*100);break}}
 let fcf=null;for(const k of FK.slice().reverse()){const t=FIN[k].sb20&&FIN[k].sb20[c];if(!t)continue;const[y,s]=k.split('-').map(Number),cf=x=>x?(x[0]??0)+(x[1]??0):null,now=cf(t);
  if(s==4){fcf=now;break}const a=FIN[(y-1)+'-4'],b=FIN[(y-1)+'-'+s];const A=a&&a.sb20&&a.sb20[c],B=b&&b.sb20&&b.sb20[c];if(A&&B){fcf=now+cf(A)-cf(B);break}}
 // 近 8 季單季 EPS（出場條件「EPS 連 N 季年減」用）
 const epsQ=Q.slice(-8).map(q=>q.eq==null?null:r2(q.eq)),qk=Q.slice(-8).map(q=>q.k);
 return{gm:gm.length?gm:null,eps4,epsY:epsY&&epsY.every(v=>v!=null)?epsY:null,debt,fcf,Y4,epsQ:epsQ.length>=6&&epsQ.some(v=>v!=null)?epsQ:null,qk}}
function valOf(c,f){const cur=VL&&VL.s[c];const pe=cur?cur[0]:null,pb=cur?cur[1]:null;
 const P5=VM.slice(-61,-1).map(v=>v.s[c]&&v.s[c][0]).filter(x=>x>0),B10=VM.slice(-121).map(v=>v.s[c]&&v.s[c][1]).filter(x=>x>0);
 const pct=(a,p)=>{a=a.slice().sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)};
 const peHi5=P5.length>=24?r1(pct(P5,0.8)):null;
 const peMed5=P5.length>=24?r1(med(P5)):null,pbPct10=pb>0&&B10.length>=36?r2(B10.filter(x=>x<pb).length/B10.length):null;
 // 每股現金股利（依股利年度，取最新一個樣本）
 const D={};for(const v of VM){const x=v.s[c];if(x&&x[3]!=null&&x[2]!=null)D[x[3]]=x[2]}const dy=Object.keys(D).map(Number).sort((a,b)=>a-b).slice(-3);
 const dps3=dy.length==3?r2((D[dy[0]]+D[dy[1]]+D[dy[2]])/3):null;
 let pay3=null;if(dy.length==3&&f.epsY){const E={};f.Y4.forEach((y,i)=>E[y]=f.epsY[i]);const P=dy.map(y=>E[y]>0?D[y]/E[y]*100:null);if(P.every(x=>x!=null))pay3=r1((P[0]+P[1]+P[2])/3)}
 return{pe,pb,peMed5,pbPct10,dps3,pay3,peHi5,dy,D}}
// 同產業月營收年增率中位數（近 4 個月）
const INDF=rd('data/industry.json'),IND2=INDF?INDF.ind:{},INDM={};{const ms=Object.keys(RV).sort().slice(-4),G={};for(const c in IND2){(G[IND2[c]]=G[IND2[c]]||[]).push(c)}
 for(const g in G){const a=ms.map(m=>{const L=G[g].map(c=>RV[m][c]&&RV[m][c][1]).filter(x=>x!=null);return L.length>=5?r1(med(L)):null});if(a.every(x=>x!=null))INDM[g]=a}}
// 每股數字換算成最新的股數單位：事件日之後才公布的不用換（季報用法定期限估公布日）
const qDue=(y,s)=>{y=+y+1911;return s==1?`${y}-05-15`:s==2?`${y}-08-14`:s==3?`${y}-11-14`:`${y+1}-03-31`};
const shareK=(c,d)=>{let k=1;for(const e of ADJ.ev[c]||[])if(e[0]>d&&e[0]<=today)k*=e[2];return k};
function perShare(c,fn,fd){if(!(ADJ.ev[c]||[]).some(e=>Math.abs(e[2]-1)>0.02))return;const r2_=v=>v==null?v:Math.round(v*100)/100;
 if(fn.epsQ&&fn.qk)fn.epsQ=fn.epsQ.map((v,i)=>v==null?v:r2_(v*shareK(c,qDue(...fn.qk[i].split('-')))));
 if(fn.eps4!=null&&fn.qk&&fn.qk.length){const[y,s]=fn.qk[fn.qk.length-1].split('-');fn.eps4=r2_(fn.eps4*shareK(c,qDue(y,s)))}
 if(fn.epsY&&fn.Y4)fn.epsY=fn.epsY.map((v,i)=>v==null?v:r2_(v*shareK(c,qDue(fn.Y4[i],4))));
 if(fd.dps3!=null&&fd.dy)fd.dps3=r2_(fd.dy.reduce((a,y)=>a+fd.D[y]*shareK(c,(+y+1912)+'-07-01'),0)/3)}
// 給網頁的事件（近一年多）：［日期, f, fs］
const adjOut=c=>{const L=(ADJ.ev[c]||[]).filter(e=>e[0]>=PD[0]).map(e=>[e[0],e[1],e[2]]);return L.length?L:null};
const F=['c','m20','m60','m120','m20p','m60p','rsi','rsiLo','mh','mhLo','hi60','hi250','n','v','av20','fi','it','mg','ry','rHi','rN','bh','rLag','lo20','hi20','lo250','dNL','pe','pb','peMed5','pbPct10','dps3','pay3','gm','eps4','epsY','debt','fcf','peHi5','epsQ','jp','adj'];
const out={};
for(const c of codes){const raw=pxS(c).slice(0,iP+1),vv=vS(c).slice(0,iP+1),cl=[],vl=[],cd=[];raw.forEach((x,i)=>{if(x!=null){cl.push(x);vl.push(vv[i]);cd.push(PD[i])}});if(!cl.length||raw[iP]==null)continue;
 // 還原價：每個事件日之前的收盤乘上 f（只用在算指標；data/px 保留原始價）
 const EV=(ADJ.ev[c]||[]).filter(e=>e[0]>cd[0]&&e[0]<=cd[cd.length-1]);if(EV.length){for(let i=0;i<cl.length;i++){let k=1;for(const e of EV)if(cd[i]<e[0])k*=e[1];if(k!=1)cl[i]=+(cl[i]*k).toFixed(4)}}
 // 股數變動（配股、減資、分割）的事件日落在視窗裡：張數類的指標（20 日均量、法人、融資）不判斷
 const SH=EV.filter(e=>Math.abs(e[2]-1)>0.02).map(e=>e[0]),shIn=n0=>SH.some(d=>d>cd[Math.max(0,cd.length-n0)]);
 const n=cl.length,cur=cl[n-1],rs=rsiSeries(cl),mh=macdHist(cl),vols=vl.filter(x=>x!=null);
 const fi=fiS(c).slice(0,iC+1).slice(-10),it=itS(c).slice(0,iC+1).slice(-10),mgA=mgS(c).slice(0,iM+1);
 const mgV=k=>mgA.length>k?mgA[mgA.length-1-k]:null;
 let ry=null,rHi=null,rN=0,rLag=null;if(RM.length){const s=RM.map(m=>RV[m][c]||null);rN=s.filter(Boolean).length;const lastI=s.map(Boolean).lastIndexOf(true);if(lastI>=0){rLag=RM.length-1-lastI;ry=s.slice(Math.max(0,lastI-5),lastI+1).map(x=>x?x[1]:null);const rev=s.slice(0,lastI+1).filter(Boolean).map(x=>x[0]);rHi=rev[rev.length-1]>=Math.max(...rev)?1:0}}
 const bh=BW.length?BW.map(d=>BH[d][c]??null):null;
 const fn=finOf(c),fd=valOf(c,fn);perShare(c,fn,fd);
 out[c]=[cur,r2(sma(cl,20)),r2(sma(cl,60)),r2(sma(cl,120)),r2(sma(cl,20,n-5)),r2(sma(cl,60,n-5)),r1(rs[n-1]),r1(Math.min(...rs.slice(-20).filter(x=>x!=null))),r2(mh[n-1]),r2(mh.length>3?Math.min(...mh.slice(-4,-1)):null),
  n>1?Math.max(...cl.slice(Math.max(0,n-61),n-1)):null,Math.max(...cl.slice(-250)),n,vl[n-1],vols.length>1&&!shIn(21)?Math.round(avg(vl.slice(Math.max(0,n-21),n-1).filter(x=>x!=null))||0):null,
  fi.some(x=>x!=null)&&!shIn(11)?fi:null,it.some(x=>x!=null)&&!shIn(11)?it:null,mgA.length&&!shIn(21)?[mgV(0),mgV(10),mgV(20)]:null,ry,rHi,rN,bh&&bh.some(x=>x!=null)?bh:null,rLag,
  n>1?Math.min(...cl.slice(Math.max(0,n-21),n-1)):null,n>1?Math.max(...cl.slice(Math.max(0,n-21),n-1)):null,Math.min(...cl.slice(-250)),dNL(cl),
  fd.pe,fd.pb,fd.peMed5,fd.pbPct10,fd.dps3,fd.pay3,fn.gm,fn.eps4,fn.epsY,fn.debt,fn.fcf,fd.peHi5,fn.epsQ,jumpOf(cl,cd),adjOut(c)]}
{const J=Object.entries(out).filter(([c,a])=>a[a.length-1]).map(([c,a])=>c+' '+a[a.length-1].join(' '));if(J.length)say(`跳動保險：${J.length} 檔近一年有單日漲跌超過 10.5%（價格相關條件標 ❔）：${J.slice(0,20).join('、')}${J.length>20?'…':''}`)}
const tx=CAL.filter(d=>d<=today).map(d=>MK.taiex[d]),fxD=Object.keys(MK.fx).sort(),fxL=fxD.slice(-250).map(d=>MK.fx[d]),fxT=fxL[fxL.length-1];
const mkt={d:CAL.filter(d=>d<=today).slice(-1)[0],taiex:{c:tx[tx.length-1],m20:r2(sma(tx,20)),m60:r2(sma(tx,60)),hi250:Math.max(...tx.slice(-250)),n:tx.length},
 fx:fxL.length?{d:fxD[fxD.length-1],v:fxT,rank:fxL.filter(x=>x<fxT).length+1,n:fxL.length}:null};
const J={upd:new Date().toISOString(),d:dP,dC,dM,rM:RM[RM.length-1]||'',rFrom:RM[0]||'',bW:BW,vD:VL?VL.d:'',fQ:FK.slice(-1)[0]||'',ind:INDM,mkt,f:F,s:out,
 src:'證交所 www.twse.com.tw、櫃買中心 www.tpex.org.tw、公開資訊觀測站 mopsov.twse.com.tw、集保結算所 opendata.tdcc.com.tw 公開資料'};
fs.writeFileSync('data/chk.json',JSON.stringify(J));
say(`寫入 data/chk.json：${Object.keys(out).length} 檔；收盤 ${dP}、法人 ${dC}、融資 ${dM}、月營收 ${J.rFrom}～${J.rM}、股權分散 ${BW.join('、')||'無'}；檔案 ${Math.round(fs.statSync('data/chk.json').size/1024)} KB；耗時 ${Math.round((Date.now()-T0)/1000)} 秒`);
fs.writeFileSync('data/ck/log.txt',log.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,log.map(s=>'- '+s).join('\n')+'\n');
