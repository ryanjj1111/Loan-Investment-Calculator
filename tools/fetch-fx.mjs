// 匯率：臺灣銀行牌告的美金即期買入、賣出（公開資料，不讀任何使用者資料）→ data/fx/usdtwd.json（只存最新一筆）
//   node tools/fetch-fx.mjs
// 抓不到或格式不對時不寫檔、結束碼 0（保留上一次的檔案；網頁會標日期，必要時改用備援或手填）
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'data/fx/usdtwd.json');
const URL_='https://rate.bot.com.tw/xrt/flcsv/0/day';
const tw=()=>new Date(Date.now()+8*36e5).toISOString();
// CSV 一列：幣別,「本行買入」,現金,即期,遠期…,「本行賣出」,現金,即期,…　→ 取兩個標記後面第 2 欄（即期）
export function parseBot(csv){for(const line of String(csv).replace(/^﻿/,'').split(/\r?\n/)){const c=line.split(',').map(x=>x.trim());if(c[0]!='USD')continue;
  const b=c.findIndex(x=>x.includes('買入')),s=c.findIndex(x=>x.includes('賣出'));if(b<0||s<0)return null;const buy=+c[b+2],sell=+c[s+2];
  if(!(buy>10&&buy<100&&sell>10&&sell<100&&sell>=buy&&sell-buy<1))return null;return{buy,sell}}return null}
async function main(){let res,txt;try{res=await fetch(URL_,{headers:{'User-Agent':'Mozilla/5.0 (compatible; fx-fetch)','Accept':'text/csv,*/*'}});txt=await res.text()}catch(e){console.log('抓不到臺銀牌告：'+e.message);return}
 if(!res.ok){console.log('臺銀牌告回應 '+res.status);return}
 const r=parseBot(txt);if(!r){console.log('臺銀牌告格式和預期不同，前 200 字：'+txt.slice(0,200).replace(/\s+/g,' '));return}
 // 牌告時間在檔名裡（ExchangeRate@YYYYMMDDHHmm.csv）；沒有就用台灣現在的日期
 const cd=res.headers.get('content-disposition')||'',m=/(\d{4})(\d{2})(\d{2})\d{4}\.csv/.exec(cd),now=tw();console.log('檔名標頭：'+(cd||'（沒有）'));
 // 沒有檔名時用台灣今天；週六、週日退回週五（牌告只在營業日更新）
 let d=m?`${m[1]}-${m[2]}-${m[3]}`:now.slice(0,10);if(!m){const t=new Date(d+'T00:00:00Z'),w=t.getUTCDay();if(w==6||w==0){t.setUTCDate(t.getUTCDate()-(w==6?1:2));d=t.toISOString().slice(0,10)}}
 const o={upd:now.slice(0,16).replace('T',' '),src:'臺灣銀行牌告（美金即期）',d,buy:r.buy,sell:r.sell};
 let old=null;try{old=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch(e){}
 if(old&&old.d==o.d&&old.buy==o.buy&&old.sell==o.sell){console.log('沒有變動',JSON.stringify(old));return}
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(o)+'\n');console.log('已寫入',JSON.stringify(o))}
if(process.argv[1]&&path.resolve(process.argv[1])==fileURLToPath(import.meta.url))main();
