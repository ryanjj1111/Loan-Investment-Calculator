// 台股族群分類的「環節」層（2026-11-26）：櫃買中心「產業價值鏈資訊平台」（https://ic.tpex.org.tw/）
// 公開資料，不含任何個人資料。47 條產業鏈，每條分上中下游的環節（例如半導體 → IC設計、IC/晶圓製造、IC封裝測試…），
// 每個環節列出本國上市、上櫃、興櫃公司；一檔可以屬於好幾個環節、好幾條產業鏈。
// 輸出 data/groups.json：
//   chains：{產業鏈代號: {n: 名稱, segs: {環節代號: {n: 名稱, s: 上游/中游/下游/''}}}}
//   stocks：{股票代號: [環節代號, …]}（只收本國上市、上櫃；興櫃、創櫃、外國企業不收）
//   foreign：{環節代號: [外國企業名稱…]}（平台列的「知名外國企業」，對照美股用）
// App 目前不讀這份；給晨報、週報告、財報彙整用（使用者 2026-11-26：先不進 App）。
// 用法：node tools/fetch-groups.mjs（GROUPS_DEBUG=1 印更多）
import fs from 'fs';
const OUT='data/groups.json',BASE='https://ic.tpex.org.tw/',DEBUG=process.env.GROUPS_DEBUG==='1';
const UA={'User-Agent':'Mozilla/5.0 (compatible; groups-fetch)'};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u,tries=3){for(let i=0;i<tries;i++){try{const r=await fetch(u,{headers:UA});if(r.ok)return await r.text();console.log(`${u} → HTTP ${r.status}`)}catch(e){console.log(`${u} 抓不到：${e.message}`)}await sleep(3000*(i+1))}return ''}
const clean=s=>s.replace(/<br\s*\/?>/gi,'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,'').trim();

// 一條產業鏈：環節名稱與上中下游（看示意圖裡 chain-title-panel 之後出現的 ic_link_ 代號），再讀每個 companyList_ 區塊
function parseChain(html){
  const segs={},stream={};
  const parts=html.split(/<div class=["']chain-title-panel["']>/);
  for(const p of parts.slice(1)){const s=clean(p.slice(0,p.indexOf('</div>')));for(const m of p.matchAll(/id=["']ic_link_([A-Z0-9]+)["'][^>]*>([\s\S]*?)<\/div>/g))if(!(m[1] in stream))stream[m[1]]=s}
  const stocks={},foreign={};
  const re=/<div id=["']companyList_([A-Z0-9]+)["'] title=["']([^"']*)["'][^>]*>/g;const hits=[...html.matchAll(re)];
  hits.forEach((m,k)=>{const id=m[1],end=k+1<hits.length?hits[k+1].index:html.length,blk=html.slice(m.index,end);
    // 上中下游：示意圖有的直接用；子環節（例如 D110）跟著同一條產業鏈裡前兩碼相同、末兩碼 00 的上層
    const up=stream[id]??stream[id.slice(0,2)+'00']??stream[id.slice(0,3)+'0']??'';
    segs[id]={n:m[2].replace(/\s+/g,''),s:up};
    // 依小標分段：本國上市、本國上櫃收；興櫃、創櫃、外國不收（外國企業另外記名稱）
    let kind='';for(const x of blk.matchAll(/<b>([^<]+)<\/b>|href=["']company_basic\.php\?stk_code=([0-9A-Z]+)["']|<a href=["'](https?:[^"']+)["'][^>]*title=["']([^"']+)["']/g)){
      if(x[1]){kind=/上市/.test(x[1])?'L':/上櫃/.test(x[1])?'O':/外國/.test(x[1])?'F':'X';continue}
      if(x[2]&&(kind==='L'||kind==='O')){const L=stocks[x[2]]=stocks[x[2]]||[];if(!L.includes(id))L.push(id)}
      else if(x[4]&&kind==='F'){const F=foreign[id]=foreign[id]||[];if(!F.includes(x[4]))F.push(x[4])}}
  });
  return{segs,stocks,foreign}}

async function main(){
  const home=await get(BASE);if(!home){console.log('首頁抓不到，這次不更新');process.exitCode=1;return}
  const names={};for(const m of home.matchAll(/<option value=["']([A-Z0-9]+)["'][^>]*>([^<]+)</g))names[m[1]]=m[2].trim();
  let ics=[...new Set([...home.matchAll(/introduce\.php\?ic=([A-Z0-9]+)/g)].map(m=>m[1]))];
  const chains={},stocks={},foreign={};let bad=[];
  for(const ic of ics){const h=await get(`${BASE}introduce.php?ic=${ic}`);await sleep(1200);
    if(!h){bad.push(ic);continue}
    if(!names[ic]){const t=(h.match(/<h3>([^<]+)產業鏈簡介<\/h3>/)||[])[1];if(t)names[ic]=t.trim()}
    const r=parseChain(h);if(!Object.keys(r.segs).length){bad.push(ic);continue}
    chains[ic]={n:names[ic]||ic,segs:r.segs};
    for(const[c,L]of Object.entries(r.stocks)){const A=stocks[c]=stocks[c]||[];L.forEach(x=>{if(!A.includes(x))A.push(x)})}
    Object.assign(foreign,r.foreign);
    console.log(`${ic} ${chains[ic].n}：${Object.keys(r.segs).length} 個環節、${Object.keys(r.stocks).length} 檔`)}
  if(bad.length)console.log('沒抓到或解析不到：'+bad.join(' '));
  // 安全檢查：抓到的產業鏈太少（網站改版或擋掉）就不覆蓋舊檔
  let old=null;try{old=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch(e){}
  const nC=Object.keys(chains).length,nS=Object.keys(stocks).length;
  if(nC<40||nS<1000||(old&&nS<Object.keys(old.stocks||{}).length*0.8)){console.log(`只抓到 ${nC} 條產業鏈、${nS} 檔，可能是網站改版或暫時擋掉，不覆蓋舊檔`);process.exitCode=1;return}
  const sorted=Object.fromEntries(Object.keys(stocks).sort().map(k=>[k,stocks[k].sort()]));
  const o={upd:new Date(Date.now()+8*36e5).toISOString().slice(0,16).replace('T',' '),src:'櫃買中心 產業價值鏈資訊平台（ic.tpex.org.tw）',note:'chains：產業鏈→環節（s＝上中下游）；stocks：股票代號→所屬環節（本國上市、上櫃）；foreign：環節→平台列的知名外國企業',chains,stocks:sorted,foreign};
  // 覆蓋率：和檢核資料的全市場代號比
  try{const ck=JSON.parse(fs.readFileSync('data/chk.json','utf8'));const all=Object.keys(ck.s||{});const hit=all.filter(c=>sorted[c]).length;console.log(`檢核資料 ${all.length} 檔，有環節的 ${hit} 檔（${(hit/all.length*100).toFixed(1)}%）`)}catch(e){}
  for(const c of ['2330','2454','2317','2382'])console.log(`  ${c}：${(sorted[c]||[]).map(x=>{for(const k in chains)if(chains[k].segs[x])return chains[k].n+'/'+chains[k].segs[x].n+(chains[k].segs[x].s?`(${chains[k].segs[x].s})`:'');return x}).join('、')}`);
  fs.mkdirSync('data',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(o));
  console.log(`已寫入 ${OUT}：${nC} 條產業鏈、${Object.values(chains).reduce((a,x)=>a+Object.keys(x.segs).length,0)} 個環節、${nS} 檔；${(fs.statSync(OUT).size/1024).toFixed(0)} KB`)}
main();
