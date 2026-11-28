// 投資晨報用的台股市場面資料（公開資料，每個人都一樣，不含任何個人持股）→ data/mkt/tw.json
//   台指期夜盤（期交所，盤後交易時段）：近月台指期的最後價格、漲跌、交易日
//   集中市場融資餘額（證交所信用交易統計，億元）：保留最近 40 個交易日，算「近 10 日」變化用
//   集中市場融券、融資餘額（張）：同一份資料，算券資比與融券 10 日變化（2026-11-26）
//   台指期未平倉（2026-11-28）：一般交易時段收盤後的全市場未平倉口數，和外資的多空未平倉淨額（口）
// 用法：node tools/fetch-mkt.mjs
// 任何一段抓不到就保留上一次的那一段，不寫半套；交易日一律寫出來，晨報用它判斷資料新不新。
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator data bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const nz=v=>{v=String(v??'').replace(/<[^>]*>/g,'').replace(/[,\s%+]/g,'');if(v===''||v=='-'||v=='--')return null;const x=+v;return isFinite(x)?x:null};
const ymdIso=s=>{s=String(s).replace(/\D/g,'');return s.length==8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):''};
const twNow=()=>new Date(Date.now()+8*36e5),stamp=()=>twNow().toISOString().slice(0,16).replace('T',' ');
const rd=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return null}};
async function get(u,opt={},type='json'){for(let k=0;k<3;k++){try{const r=await fetch(u,{...opt,headers:{...UA,...(opt.headers||{})},signal:AbortSignal.timeout(60000)});
 if(r.ok){const b=Buffer.from(await r.arrayBuffer());const t=new TextDecoder(opt.enc||'utf-8').decode(b);return type=='json'?JSON.parse(t):t}console.log(`  HTTP ${r.status} ${u}`)}catch(e){console.log(`  失敗 ${u}：${e.message}`)}await sleep(3000*(k+1))}return null}

const OUT='data/mkt/tw.json',old=rd(OUT)||{},out={...old,upd:stamp(),note:'公開資料。tx：台指期夜盤（盤後交易時段；tradeDate 是期交所的交易日，也就是這場夜盤所屬的下一個交易日，例如週五晚上的夜盤是下週一；chg 相對前一個一般交易時段的結算價）；margin：集中市場融資餘額（億元）；oi：台指期未平倉（口，一般交易時段）。'};
const CAL=rd('data/mkt/holidays.json')||{};
const twTrading=d=>{const w=new Date(d+'T00:00:00Z').getUTCDay();return w>0&&w<6&&!(CAL.tw||[]).includes(d)};
// 台股交易日：以 data/px 已經有收盤的日期為準（只用來回補融資，不用來判斷今天開不開）
function pxDays(){const L=fs.existsSync('data/px')?fs.readdirSync('data/px').filter(f=>/^\d{4}-\d{2}\.json$/.test(f)).sort().slice(-3):[];const D=[];
 for(const f of L){const j=rd('data/px/'+f);if(j&&j.d)D.push(...Object.keys(j.d))}return [...new Set(D)].sort()}

// ---------- 台指期夜盤
// 先試期交所 OpenAPI（每日行情，有交易時段欄位），抓不到再試網站的每日行情下載（CSV）
const DEBUG=process.env.MKT_DEBUG;
function pickTX(rows){// rows: {date,contract,month,session,last,chg,pct,vol}
 if(DEBUG)console.log(rows.filter(r=>r.contract=='TX'&&!/\//.test(r.month)).map(r=>[r.date,r.month,r.session,'open',r.open,'last',r.last,'chg',r.chg,'vol',r.vol].join(' ')).join('\n'));
 const T=rows.filter(r=>r.contract=='TX'&&/盤後|After/i.test(r.session)&&!/\//.test(r.month)&&r.last!=null&&r.vol>0);
 if(!T.length)return null;T.sort((a,b)=>b.vol-a.vol);const r=T[0];
 const ref=r.chg!=null?r.last-r.chg:null,pct=r.pct!=null?r.pct:(ref?Math.round((r.chg/ref)*1e4)/100:null);
 return{tradeDate:r.date,session:'night',contract:'TX '+r.month,c:r.last,chg:r.chg,pct,ref:ref!=null?Math.round(ref*100)/100:null,vol:r.vol}}
async function txOpenApi(){const j=await get('https://openapi.taifex.com.tw/v1/DailyMarketReportFut',{headers:{Accept:'application/json'}});
 if(!Array.isArray(j)||!j.length){console.log('期交所 OpenAPI 沒有資料');return null}
 const K=Object.keys(j[0]);console.log('OpenAPI 欄位：'+K.join('、'));
 const f=(o,...ks)=>{for(const k of ks){const m=K.find(x=>x.toLowerCase().replace(/[^a-z%]/g,'')==k.toLowerCase().replace(/[^a-z%]/g,''));if(m!=null&&o[m]!=null&&o[m]!=='')return o[m]}return null};
 const rows=j.map(o=>({date:ymdIso(f(o,'Date')),contract:String(f(o,'Contract')||'').trim(),month:String(f(o,'ContractMonth(Week)','ContractMonth')||'').trim(),session:String(f(o,'TradingSession')||''),
  open:nz(f(o,'Open')),last:nz(f(o,'Last')),chg:nz(f(o,'Change')),pct:nz(f(o,'%','ChangePercent')),vol:nz(f(o,'Volume'))||0}));
 const r=pickTX(rows);if(r)r.src='期交所 OpenAPI 每日行情';return r}
// 2026-11-21：夜盤的交易日是「下一個交易日」，週五晚上那場寫成下週一。查詢只到今天時，週六、連假前會漏掉最新一場
// （11/21 漏了 11/20 晚上 −1,881 點那場），所以查詢範圍往後多 6 天；期交所不接受未來日期時，退回只查到今天
async function txCsv(){const d=twNow(),s=x=>x.toISOString().slice(0,10).replace(/-/g,'/');const a=new Date(d.getTime()-6*864e5),z=new Date(d.getTime()+6*864e5);
 const q=end=>get('https://www.taifex.com.tw/cht/3/futDataDown',{method:'POST',body:new URLSearchParams({down_type:'1',commodity_id:'TX',queryStartDate:s(a),queryEndDate:s(end)}),headers:{'Content-Type':'application/x-www-form-urlencoded'},enc:'big5'},'text');
 let t=null;try{t=await q(z)}catch(e){console.log('期交所 CSV（查到未來 6 天）失敗：'+e.message)}
 if(!t||!/交易日期/.test(t)){console.log('期交所 CSV 查到未來日期沒有資料，改查到今天：'+String(t||'').slice(0,80));t=await q(d)}
 if(!t||!/交易日期/.test(t)){console.log('期交所 CSV 沒有資料：'+String(t||'').slice(0,120));return null}
 const L=t.trim().split(/\r?\n/).map(x=>x.split(',').map(y=>y.trim()));const H=L[0],ix=n=>H.findIndex(h=>h.includes(n));
 const iD=ix('交易日期'),iC=ix('契約'),iM=ix('到期月份'),iS=ix('交易時段'),iL=ix('收盤價'),iCh=ix('漲跌價'),iP=ix('漲跌%'),iV=ix('成交量');
 console.log('CSV 欄位：'+H.join('、'));
 const rows=L.slice(1).map(a=>({date:ymdIso(a[iD]),contract:a[iC],month:a[iM],session:a[iS]||'',open:nz(a[ix('開盤價')]),last:nz(a[iL]),chg:nz(a[iCh]),pct:nz(a[iP]),vol:nz(a[iV])||0}));
 const last=rows.filter(r=>/盤後/.test(r.session)).map(r=>r.date).sort().pop();const r=pickTX(rows.filter(x=>x.date==last));if(r)r.src='期交所每日行情下載';return r}
// 2026-11-16 實測：網站 CSV 有最新一場夜盤（交易日寫成「下一個交易日」，例如週五晚上的夜盤寫 11/16）；
// OpenAPI 要等日盤結束才更新，夜盤會晚一天，所以只當備援，而且交易日比現有的舊就不用
async function tx(){let r=null;try{r=await txCsv()}catch(e){console.log('CSV 解析失敗：'+e.message)}
 if(!r)try{r=await txOpenApi()}catch(e){console.log('OpenAPI 解析失敗：'+e.message)}
 if(!r){console.log('台指期夜盤：抓不到，保留上一次');return}
 // 期交所的夜盤屬於「下一個交易日」；有些來源寫的是開盤那一天，統一成下一個台股交易日
 if(old.tx&&r.tradeDate<old.tx.tradeDate){console.log(`夜盤交易日 ${r.tradeDate} 比現有的 ${old.tx.tradeDate} 舊，不覆蓋`);return}
 if(r.tradeDate&&!twTrading(r.tradeDate))console.log('⚠️ 夜盤交易日不是台股交易日（休市日曆要更新？）：'+r.tradeDate);
 console.log(`台指期夜盤：${r.tradeDate} ${r.contract} ${r.c}（${r.chg>=0?'+':''}${r.chg}，${r.pct}%）來源：${r.src}`);out.tx=r}

// ---------- 集中市場融資餘額（億元）
// 同一份資料（MI_MARGN，selectType=MS）裡也有融資、融券的張數（2026-11-26）：sh＝[日期, 融券餘額（張）, 融資餘額（張）]，晨報算券資比用
async function marginDay(d){const j=await get(`https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=${d.replace(/-/g,'')}&selectType=MS&response=json`);
 if(!j||j.stat!='OK'||ymdIso(j.date)!=d)return null;let amt=null,sh=null,mz=null;
 for(const T of j.tables||[]){const F=T.fields||[],ib=F.findIndex(x=>/今日餘額/.test(x));
  for(const a of T.data||[]){const k=String(a[0]),v=nz(a[ib>0?ib:a.length-1]);if(v==null)continue;
   if(/融資金額/.test(k))amt=Math.round(v/1e3)/100;// 仟元 → 億元
   else if(/融券/.test(k)&&/交易單位/.test(k))sh=v;else if(/融資/.test(k)&&/交易單位/.test(k))mz=v}}
 if(DEBUG)console.log(`  ${d} 融資金額 ${amt} 億、融券 ${sh} 張、融資 ${mz} 張`);
 if(amt==null)console.log('MI_MARGN 找不到融資金額：'+JSON.stringify(j.tables?.[0]||{}).slice(0,300));
 return amt==null&&sh==null?null:{amt,sh,mz}}
async function margin(){const H=new Map((old.margin&&old.margin.hist)||[]),SH=new Map(((old.margin&&old.margin.sh)||[]).map(x=>[x[0],x]));
 const D=pxDays().slice(-25),need=D.filter(d=>!H.has(d)||!SH.has(d)).slice(-25);
 let n=0;for(const d of need){const v=await marginDay(d);if(v){if(v.amt!=null)H.set(d,v.amt);if(v.sh!=null&&v.mz!=null)SH.set(d,[d,v.sh,v.mz]);n++}await sleep(2200)}
 const hist=[...H].sort((a,b)=>a[0]<b[0]?-1:1).slice(-40);if(!hist.length){console.log('融資餘額：沒有資料');return}
 const sh=[...SH.values()].sort((a,b)=>a[0]<b[0]?-1:1).slice(-40);
 out.margin={src:'證交所信用交易統計（集中市場）',unit:'億元',tradeDate:hist[hist.length-1][0],hist,sh,shNote:'sh：[日期, 融券餘額（張）, 融資餘額（張）]'};
 const L=sh[sh.length-1];console.log(`融資餘額：新增 ${n} 天，最新 ${out.margin.tradeDate} ${hist[hist.length-1][1]} 億${L?`；融券 ${L[0]} ${L[1]} 張、融資 ${L[2]} 張`:''}`)}

// ---------- 台指期未平倉（2026-11-28）：一般交易時段（日盤）收盤後的數字；夜盤不更新未平倉
// 全市場：每日行情下載（CSV）一般時段各月份 TX 的「未沖銷契約數」加總（不含價差單）
// 外資：三大法人區分各期貨契約（CSV）「外資」那一列的「多空未平倉口數淨額」（正＝淨多單、負＝淨空單）
// oi＝{tradeDate, total, fi, hist:[[日期, 全市場, 外資淨額]]}，保留 40 天，晨報算和前一天比的增減
function csvRows(t){return t.trim().split(/\r?\n/).map(x=>x.split(',').map(y=>y.trim().replace(/^"|"$/g,'')))}
async function oiTotal(a,z){const s=x=>x.toISOString().slice(0,10).replace(/-/g,'/');
 const t=await get('https://www.taifex.com.tw/cht/3/futDataDown',{method:'POST',body:new URLSearchParams({down_type:'1',commodity_id:'TX',queryStartDate:s(a),queryEndDate:s(z)}),headers:{'Content-Type':'application/x-www-form-urlencoded'},enc:'big5'},'text');
 if(!t||!/交易日期/.test(t))return {};const L=csvRows(t),H=L[0],ix=n=>H.findIndex(h=>h.includes(n));
 const iD=ix('交易日期'),iM=ix('到期月份'),iS=ix('交易時段'),iO=ix('未沖銷契約數');if(iO<0){console.log('期貨行情 CSV 沒有未沖銷契約數欄位：'+H.join('、'));return {}}
 const T={};for(const a of L.slice(1)){if(/盤後/.test(a[iS]||'')||/\//.test(a[iM]||''))continue;const v=nz(a[iO]);if(v==null)continue;const d=ymdIso(a[iD]);T[d]=(T[d]||0)+v}
 return T}
async function oiForeign(a,z){const s=x=>x.toISOString().slice(0,10).replace(/-/g,'/');
 // 網站 CSV 的參數名稱試兩種；都不是 CSV 就改用 OpenAPI（只有最近一天）
 let t=null;for(const body of [{queryStartDate:s(a),queryEndDate:s(z),commodityId:'TXF'},{firstDate:s(a),lastDate:s(z),queryStartDate:s(a),queryEndDate:s(z),commodityId:'TXF',commodity_id:'TXF'}]){
  t=await get('https://www.taifex.com.tw/cht/3/futContractsDateDown',{method:'POST',body:new URLSearchParams(body),headers:{'Content-Type':'application/x-www-form-urlencoded'},enc:'big5'},'text');
  if(t&&/身份別/.test(t))break;if(DEBUG)console.log('三大法人期貨 CSV 不是資料：'+String(t||'').replace(/\s+/g,' ').slice(0,200));t=null;await sleep(1500)}
 const F={};
 if(t){const L=csvRows(t),H=L[0],ix=n=>H.findIndex(h=>h.includes(n));const iD=ix('日期'),iC=ix('商品'),iW=ix('身份別'),iN=H.findIndex(h=>/多空未平倉口數淨額/.test(h));
  if(DEBUG)console.log('三大法人期貨 CSV 欄位：'+H.join('、'));
  if(iN>=0)for(const r of L.slice(1)){if(!/外資/.test(r[iW]||'')||(iC>=0&&!/臺股期貨|台股期貨|TX/.test(r[iC]||'')))continue;const v=nz(r[iN]);if(v!=null)F[ymdIso(r[iD])]=v}}
 if(Object.keys(F).length)return F;
 // OpenAPI 的路徑名稱從說明文件（swagger.json）找「三大法人、各期貨契約、依日期」那一個，不寫死
 const sw=await get('https://openapi.taifex.com.tw/swagger.json',{headers:{Accept:'application/json'}});const P=Object.keys((sw&&sw.paths)||{});
 const path=P.find(x=>/MajorInstitutional/i.test(x)&&/Futures?Contract/i.test(x)&&/Date/i.test(x)&&!/Week|Option/i.test(x));
 if(DEBUG)console.log('三大法人 OpenAPI 路徑：'+P.filter(x=>/Institutional/i.test(x)).join('、'));
 if(!path){console.log('期交所 OpenAPI 找不到三大法人各期貨契約的資料');return F}
 const j=await get('https://openapi.taifex.com.tw/v1'+path.replace(/^\/v1/,''),{headers:{Accept:'application/json'}});
 if(!Array.isArray(j)||!j.length){console.log('三大法人期貨 OpenAPI 沒有資料：'+path);return F}
 const K=Object.keys(j[0]);if(DEBUG)console.log('三大法人期貨 OpenAPI 欄位：'+K.join('、')+'\n'+JSON.stringify(j.filter(o=>/臺股期貨|TX/.test(JSON.stringify(o))).slice(0,3)));
 const k=re=>K.find(x=>re.test(x));const kD=k(/date|日期/i),kC=k(/contract|商品/i),kW=k(/item|identity|身份/i),kN=k(/(open.?interest.*net.*volume|未平倉.*口數.*淨額|NetOpenInterest.*Volume)/i);
 if(!kN){console.log('三大法人期貨 OpenAPI 找不到未平倉淨額欄位：'+K.join('、'));return F}
 for(const o of j){if(!/外資|Foreign/i.test(String(o[kW]))||!/臺股期貨|台股期貨|^TX|TAIEX/i.test(String(o[kC])))continue;const v=nz(o[kN]);if(v!=null)F[ymdIso(o[kD])]=v}
 return F}
async function oi(){const d=twNow(),a=new Date(d.getTime()-14*864e5);let T={},F={};
 try{T=await oiTotal(a,d)}catch(e){console.log('全市場未平倉解析失敗：'+e.message)}
 await sleep(1500);try{F=await oiForeign(a,d)}catch(e){console.log('外資未平倉解析失敗：'+e.message)}
 const H=new Map(((old.oi&&old.oi.hist)||[]).map(x=>[x[0],x]));
 for(const k of new Set([...Object.keys(T),...Object.keys(F)])){if(!k)continue;const p=H.get(k)||[k,null,null];H.set(k,[k,T[k]??p[1],F[k]??p[2]])}
 const hist=[...H.values()].filter(x=>x[1]!=null||x[2]!=null).sort((x,y)=>x[0]<y[0]?-1:1).slice(-40);
 if(!hist.length){console.log('台指期未平倉：抓不到，保留上一次');return}
 const z=hist[hist.length-1];out.oi={src:'期交所每日行情、三大法人區分各期貨契約（一般交易時段）',unit:'口',tradeDate:z[0],total:z[1],fi:z[2],hist,histNote:'hist：[日期, 全市場台指期未平倉口數, 外資多空未平倉口數淨額]'};
 console.log(`台指期未平倉：${z[0]} 全市場 ${z[1]} 口、外資淨額 ${z[2]} 口（新增 ${Object.keys(T).length}／${Object.keys(F).length} 天）`)}

await tx();
await oi();
await margin();
fs.mkdirSync('data/mkt',{recursive:true});
const s=JSON.stringify({...out,upd:undefined}),o=JSON.stringify({...old,upd:undefined});
if(s==o)console.log('沒有新資料');else{fs.writeFileSync(OUT,JSON.stringify(out)+'\n');console.log('已寫入 '+OUT)}
