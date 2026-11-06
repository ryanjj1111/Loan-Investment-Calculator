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
function macdHist(c){if(c.length<35)return[];const e12=ema(c,12),e26=ema(c,26),dif=c.map((_,i)=>e12[i]-e26[i]),sig=ema(dif,9);return dif.map((x,i)=>x-sig[i])}
// 收盤價：data/px（收盤價流程）＋ 補抓的較早月份
const PD=CAL.filter(d=>d<=today).slice(-N_PX);const pxS=series('data/px',PD),vS=series('data/ck/vol',PD);
const CH=PD.slice(-N_CH),fiS=series('data/ck/fi',CH),itS=series('data/ck/it',CH),mgS=series('data/ck/mg',CH);
const lastWith=(dir,days,P)=>{for(let i=days.length-1;i>=0;i--)if(has(dir,days[i],P))return i;return-1};
const iP=Math.max(lastWith('data/px',PD,TSE_P),lastWith('data/px',PD,OTC_P)),iC=lastWith('data/ck/fi',CH,TSE_P),iM=lastWith('data/ck/mg',CH,TSE_P);
const dP=PD[iP]||'',dC=CH[iC]||'',dM=CH[iM]||'';
const codes=new Set();for(const m of new Set(PD.slice(-5).map(d=>d.slice(0,7))))for(const c of arc('data/px',m).codes)codes.add(c);
const RM=Object.keys(RV).sort(),BW=Object.keys(BH).sort().slice(-3);
const F=['c','m20','m60','m120','m20p','m60p','rsi','rsiLo','mh','mhLo','hi60','hi250','n','v','av20','fi','it','mg','ry','rHi','rN','bh','rLag'];
const out={};
for(const c of codes){const raw=pxS(c).slice(0,iP+1),vv=vS(c).slice(0,iP+1),cl=[],vl=[];raw.forEach((x,i)=>{if(x!=null){cl.push(x);vl.push(vv[i])}});if(!cl.length||raw[iP]==null)continue;
 const n=cl.length,cur=cl[n-1],rs=rsiSeries(cl),mh=macdHist(cl),vols=vl.filter(x=>x!=null);
 const fi=fiS(c).slice(0,iC+1).slice(-10),it=itS(c).slice(0,iC+1).slice(-10),mgA=mgS(c).slice(0,iM+1);
 const mgV=k=>mgA.length>k?mgA[mgA.length-1-k]:null;
 let ry=null,rHi=null,rN=0,rLag=null;if(RM.length){const s=RM.map(m=>RV[m][c]||null);rN=s.filter(Boolean).length;const lastI=s.map(Boolean).lastIndexOf(true);if(lastI>=0){rLag=RM.length-1-lastI;ry=s.slice(Math.max(0,lastI-5),lastI+1).map(x=>x?x[1]:null);const rev=s.slice(0,lastI+1).filter(Boolean).map(x=>x[0]);rHi=rev[rev.length-1]>=Math.max(...rev)?1:0}}
 const bh=BW.length?BW.map(d=>BH[d][c]??null):null;
 out[c]=[cur,r2(sma(cl,20)),r2(sma(cl,60)),r2(sma(cl,120)),r2(sma(cl,20,n-5)),r2(sma(cl,60,n-5)),r1(rs[n-1]),r1(Math.min(...rs.slice(-20).filter(x=>x!=null))),r2(mh[n-1]),r2(mh.length>3?Math.min(...mh.slice(-4,-1)):null),
  n>1?Math.max(...cl.slice(Math.max(0,n-61),n-1)):null,Math.max(...cl.slice(-250)),n,vl[n-1],vols.length>1?Math.round(avg(vl.slice(Math.max(0,n-21),n-1).filter(x=>x!=null))||0):null,
  fi.some(x=>x!=null)?fi:null,it.some(x=>x!=null)?it:null,mgA.length?[mgV(0),mgV(10),mgV(20)]:null,ry,rHi,rN,bh&&bh.some(x=>x!=null)?bh:null,rLag]}
const tx=CAL.filter(d=>d<=today).map(d=>MK.taiex[d]),fxD=Object.keys(MK.fx).sort(),fxL=fxD.slice(-250).map(d=>MK.fx[d]),fxT=fxL[fxL.length-1];
const mkt={d:CAL.filter(d=>d<=today).slice(-1)[0],taiex:{c:tx[tx.length-1],m20:r2(sma(tx,20)),hi250:Math.max(...tx.slice(-250)),n:tx.length},
 fx:fxL.length?{d:fxD[fxD.length-1],v:fxT,rank:fxL.filter(x=>x<fxT).length+1,n:fxL.length}:null};
const J={upd:new Date().toISOString(),d:dP,dC,dM,rM:RM[RM.length-1]||'',rFrom:RM[0]||'',bW:BW,mkt,f:F,s:out,
 src:'證交所 www.twse.com.tw、櫃買中心 www.tpex.org.tw、公開資訊觀測站 mopsov.twse.com.tw、集保結算所 opendata.tdcc.com.tw 公開資料'};
fs.writeFileSync('data/chk.json',JSON.stringify(J));
say(`寫入 data/chk.json：${Object.keys(out).length} 檔；收盤 ${dP}、法人 ${dC}、融資 ${dM}、月營收 ${J.rFrom}～${J.rM}、股權分散 ${BW.join('、')||'無'}；檔案 ${Math.round(fs.statSync('data/chk.json').size/1024)} KB；耗時 ${Math.round((Date.now()-T0)/1000)} 秒`);
fs.writeFileSync('data/ck/log.txt',log.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,log.map(s=>'- '+s).join('\n')+'\n');
