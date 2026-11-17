// 資料補跑：檢查公開資料是不是最新，過期的就列出對應的抓資料流程（GitHub 排程停跑或延誤時自動補上）
// 由「資料補跑」流程執行；那個流程同時有 GitHub 排程和外部定時器（workflow_dispatch）兩條路觸發，互為備援
// 資料已是最新就什麼都不列，重複觸發沒有副作用。只讀公開資料，不含任何個人持股
// 用法：node tools/catchup.mjs        每行印一個過期的流程檔名（prices.yml、checks.yml、mkt.yml、us-prices.yml）
import fs from 'node:fs';
const rd=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return null}};
const H=rd('data/mkt/holidays.json')||{},TW=H.tw||[],US=H.us||[];
const add=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const wd=s=>new Date(s+'T00:00:00Z').getUTCDay();
const isTd=(s,hol)=>wd(s)>0&&wd(s)<6&&!hol.includes(s);
const prevTd=(s,hol)=>{let x=add(s,-1);while(!isTd(x,hol))x=add(x,-1);return x};
// 某個時區現在的日期與分鐘數
function clock(tz){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(o=>[o.type,o.value]));
 return{d:`${p.year}-${p.month}-${p.day}`,m:+p.hour*60+ +p.minute,t:`${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`}}
const tw=clock('Asia/Taipei'),et=clock('America/New_York');
// 台股：最近一個「應該已經有資料」的交易日（當天要過了 afterMin 才算）
const twExp=afterMin=>isTd(tw.d,TW)&&tw.m>=afterMin?tw.d:prevTd(tw.d,TW);
// 美股：正常盤收盤（含提早收盤）75 分鐘後才算當天
const usExp=()=>{const e=(H.usEarly||{})[et.d],close=e?+e.slice(0,2)*60+ +e.slice(3,5):960;return isTd(et.d,US)&&et.m>=close+75?et.d:prevTd(et.d,US)};
const out=[],note=[];
const chk=(wf,name,have,want)=>{const bad=!have||have<want;note.push(`${bad?'⚠️':'✓'} ${name}：資料 ${have||'無'}，應該要 ${want}`);if(bad)out.push(wf)};
// 收盤價（排程 14:47 起）：上市、上櫃取比較舊的那個
{const P=rd('data/prices.json')||{};chk('prices.yml','台股收盤價',[P.tse&&P.tse.date,P.otc&&P.otc.date].filter(Boolean).sort()[0]||'',twExp(14*60+45))}
// 檢核資料（三大法人 15:37 起；給到 17:45 再判斷）
{const C=rd('data/chk.json')||{};chk('checks.yml','檢核資料',C.d||'',twExp(17*60+45))}
// 市場面（台指期夜盤 05:45、融資 22:20）：比最近一個排程時間點舊就補
{const M=rd('data/mkt/tw.json')||{};let slot='';
 for(let k=0;k<7&&!slot;k++){const d=add(tw.d,-k),w=wd(d);for(const [hm,ok] of [['22:20',w>=1&&w<=5],['05:45',w>=2&&w<=6]]){const t=`${d} ${hm}`;if(ok&&t<=tw.t){slot=t;break}}}
 // 排程時間點後 40 分鐘內還在等排程，不算過期
 const due=slot&&(Date.parse(tw.t.replace(' ','T')+'Z')-Date.parse(slot.replace(' ','T')+'Z'))>=40*6e4;
 const have=String(M.upd||'');note.push(`${due&&have<slot?'⚠️':'✓'} 台股市場面：更新於 ${have||'無'}，最近排程 ${slot||'—'}`);if(due&&have<slot)out.push('mkt.yml')}
// 美股收盤價
{const U=rd('data/us/prices.json')||{};chk('us-prices.yml','美股收盤價',U.tradeDate||U.d||'',usExp())}
for(const s of note)console.error(s);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`台灣 ${tw.t}｜美東 ${et.t}\n\n`+note.map(s=>'- '+s).join('\n')+'\n');
console.log(out.join('\n'));
