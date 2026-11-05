// 每個交易日收盤後，抓證交所、櫃買中心的全市場收盤價（公開資料，不含任何個人持股）
// 產生 data/prices.json（最新一天）與 data/px/YYYY-MM.json（每月歷史，用來自動帶入交易當天的基準 ETF 價格）
// 用法：node tools/fetch-prices.mjs              只抓最新
//       node tools/fetch-prices.mjs 2026-09-01   從這天補抓到今天，再抓最新
import fs from 'node:fs';
const UA={'User-Agent':'Mozilla/5.0 (compatible; Loan-Investment-Calculator price bot; +https://github.com/ryanjj1111/Loan-Investment-Calculator)'};
const keep=c=>/^(\d{4}|00\d{2,4}[A-Z]?)$/.test(c);              // 股票（4 碼）與 ETF（00 開頭）；不含權證、債券
const num=v=>{v=String(v??'').replace(/,/g,'').trim();const x=+v;return v&&isFinite(x)&&x>0?x:null};
const roc=s=>{s=String(s).replace(/\D/g,'');return s.length>=7?(+s.slice(0,-4)+1911)+'-'+s.slice(-4,-2)+'-'+s.slice(-2):''};
const ymdIso=s=>{s=String(s).replace(/\D/g,'');return s.length==8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):''};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const twToday=()=>new Date(Date.now()+8*36e5).toISOString().slice(0,10);
const log=[];const say=t=>{console.log(t);log.push(t)};
async function get(u,type='json'){for(let k=0;k<3;k++){try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(45000)});if(r.ok){const t=await r.text();return type=='json'?JSON.parse(t):t}say(`  HTTP ${r.status} ${u}`)}catch(e){say(`  失敗 ${u}：${e.message}`)}await sleep(4000)}return null}
const pick=(px,c,v)=>{c=String(c).trim();v=num(v);if(keep(c)&&v!=null)px[c]=v};

// 上市：最新一天（證交所網站；回傳 CSV 或 JSON）
async function tseLatest(){const t=await get('https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL?response=json','text');if(!t)return null;const px={};let date='';
 if(t.trim().startsWith('{')){const j=JSON.parse(t),F=j.fields||[],ic=F.indexOf('證券代號'),ip=F.indexOf('收盤價');date=ymdIso(j.date);for(const a of j.data||[])pick(px,a[ic],a[ip])}
 else for(const ln of t.split(/\r?\n/).slice(1)){const a=ln.split('","').map(s=>s.replace(/^"|"$/g,''));if(a.length<9)continue;if(!date)date=roc(a[0]);pick(px,a[1],a[8])}
 return date&&Object.keys(px).length?{date,px}:null}
// 上市：指定日期（每日收盤行情）
async function tseDay(iso){const j=await get(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${iso.replace(/-/g,'')}&type=ALLBUT0999&response=json`);if(!j||j.stat!='OK'||ymdIso(j.date)!=iso)return null;
 const T=(j.tables||[]).find(t=>(t.fields||[]).includes('證券代號')&&(t.fields||[]).includes('收盤價'));if(!T)return null;const ic=T.fields.indexOf('證券代號'),ip=T.fields.indexOf('收盤價'),px={};for(const a of T.data||[])pick(px,a[ic],a[ip]);
 return Object.keys(px).length?{date:iso,px}:null}
// 上櫃：最新一天（櫃買中心 OpenAPI）
async function otcLatest(){const j=await get('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes');if(!Array.isArray(j)||!j.length)return null;const px={};let date='';
 for(const o of j){if(!date)date=roc(o.Date);pick(px,o.SecuritiesCompanyCode,o.Close)}return date&&Object.keys(px).length?{date,px}:null}
// 上櫃：指定日期
async function otcDay(iso){const j=await get(`https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=${iso.replace(/-/g,'/')}&type=EW&response=json`);if(!j||ymdIso(j.date)!=iso)return null;
 const T=(j.tables||[])[0];if(!T)return null;const F=(T.fields||[]).map(s=>String(s).trim()),ic=F.indexOf('代號'),ip=F.indexOf('收盤');if(ic<0||ip<0)return null;const px={};for(const a of T.data||[])pick(px,a[ic],a[ip]);
 return Object.keys(px).length?{date:iso,px}:null}

// 每月歷史：{codes:[...], d:{日期:[收盤價（和 codes 同順序）]}}
const arc={};
function arcGet(m){if(!arc[m]){const f=`data/px/${m}.json`;arc[m]=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{codes:[],d:{}};arc[m]._ix=new Map(arc[m].codes.map((c,i)=>[c,i]))}return arc[m]}
function arcPut(r){const A=arcGet(r.date.slice(0,7)),row=A.d[r.date]?A.d[r.date].slice():new Array(A.codes.length).fill(null);
 for(const c in r.px){let i=A._ix.get(c);if(i==null){i=A.codes.length;A.codes.push(c);A._ix.set(c,i);for(const d in A.d)A.d[d].push(null);while(row.length<A.codes.length)row.push(null)}row[i]=r.px[c]}
 while(row.length<A.codes.length)row.push(null);A.d[r.date]=row;A._ch=1}
function arcSave(){for(const m in arc){const A=arc[m];if(!A._ch)continue;const days=Object.keys(A.d).sort();
 fs.writeFileSync(`data/px/${m}.json`,'{"codes":'+JSON.stringify(A.codes)+',\n"d":{\n'+days.map(d=>JSON.stringify(d)+':'+JSON.stringify(A.d[d])).join(',\n')+'\n}}\n');say(`寫入 data/px/${m}.json（${days.length} 天、${A.codes.length} 檔）`)}}

const from=process.argv[2]||'',today=twToday();fs.mkdirSync('data/px',{recursive:true});
if(from){say(`補抓 ${from} ～ ${today}`);for(let d=new Date(from+'T00:00:00Z');d.toISOString().slice(0,10)<=today;d.setUTCDate(d.getUTCDate()+1)){const iso=d.toISOString().slice(0,10),wd=d.getUTCDay();if(wd==0||wd==6)continue;
 const a=await tseDay(iso);await sleep(1500);const b=await otcDay(iso);await sleep(1500);if(a)arcPut(a);if(b)arcPut(b);say(`${iso}：上市 ${a?Object.keys(a.px).length:0}、上櫃 ${b?Object.keys(b.px).length:0}`)}}
const P=fs.existsSync('data/prices.json')?JSON.parse(fs.readFileSync('data/prices.json','utf8')):{};let ch=0;
for(const [k,f1,f2,nm] of [['tse',tseLatest,tseDay,'上市'],['otc',otcLatest,otcDay,'上櫃']]){let r=await f1();if(!r||r.date<today){const r2=await f2(today);if(r2&&(!r||r2.date>r.date))r=r2}
 if(!r){say(`${nm}：抓不到`);continue}arcPut(r);const old=P[k]&&P[k].date||'';if(r.date>=old){P[k]={date:r.date,n:Object.keys(r.px).length,px:r.px};ch=1}say(`${nm}：${r.date}，${Object.keys(r.px).length} 檔（原本 ${old||'無'}）`)}
if(ch){P.upd=new Date().toISOString();P.src='證交所 www.twse.com.tw、櫃買中心 www.tpex.org.tw 公開資料';fs.writeFileSync('data/prices.json',JSON.stringify(P))}
// 產業別（月營收公開資料的「產業別」），網頁用來自動帶入族群標籤
{const ind={};for(const u of['https://openapi.twse.com.tw/v1/opendata/t187ap05_L','https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O']){const j=await get(u);if(Array.isArray(j))for(const o of j){const c=String(o['公司代號']||'').trim(),g=String(o['產業別']||'').trim();if(keep(c)&&g)ind[c]=g}}
 const n=Object.keys(ind).length;if(n>500){const old=fs.existsSync('data/industry.json')?fs.readFileSync('data/industry.json','utf8'):'',nw=JSON.stringify({src:'證交所 t187ap05_L、櫃買中心 mopsfin_t187ap05_O（月營收公開資料的產業別）',ind},null,0);if(old.replace(/"upd":"[^"]*",?/,'')!=nw){fs.writeFileSync('data/industry.json',nw);say(`寫入 data/industry.json（${n} 檔）`)}}else say(`產業別：只抓到 ${n} 檔，不更新`)}
arcSave();if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,log.map(s=>'- '+s).join('\n')+'\n');
