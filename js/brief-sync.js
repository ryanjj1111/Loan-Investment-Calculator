// 晨報同步（2026-11-21）：把「論點摘要」和「持股清單」自動上傳到你自己的私人 repo，給 Telegram 晨報與盤前判斷用
// 單一來源：論點只在 App 裡改，改完自動上傳，不用手動匯出或同步。
// 上傳的內容：台股持有中論點的文字（買進理由、什麼情況代表我錯了、支柱、停損價、目標價、重新評估日）、策略的出場規則、持股代號與名稱。
// 2026-11-21：另外上傳啟用中策略的規則（brief/strategies.md，給每週候選篩選用）；論點加同業、規劃中論點；持股清單加規劃中與觀察名單的代號
// 不上傳：股數、成本、均價、金額、交易紀錄（論點文字裡提到成本、均價、萬元、股數的句子會整句拿掉）。
// 金鑰（GitHub token）和 repo 名稱只存在這個瀏覽器（localStorage 的 lcbs），不在設定檔裡，匯出備份也不會帶出去。
const BS_KEY='lcbs',BS_TH='brief/theses.md',BS_HD='brief/holdings.json',BS_SG='brief/strategies.md',BS_WAIT=20000,BS_STALE=3;

// ---- 1) 產生內容（純函式，測試用）
// 含成本、金額、股數的句子整句拿掉。規則裡的「跌破均價 −15%」是百分比，保留。
const BS_MONEY=[/(成本|均價|買進價|進場價|買在|均價約)\s*(約|為|是|：|:)?\s*\d[\d,.]*(?!\s*[%％\d])/,/\d[\d,.]*\s*(萬元|萬|股(?![價利息票東權])|張)/,/(股數|部位金額|投入金額|市值\s*\d)/];
// 以「，。；」切成小段，含成本、金額、股數，或出現這檔的買進價／均價的那一小段拿掉
function bsClean(s,px){s=String(s||'').trim().replace(/\s*\n+\s*/g,'；');if(!s)return'';const P=s.split(/(?<=[，,。；;！!？?])/),pv=(px||[]).filter(p=>p>=1);
 const hit=x=>BS_MONEY.some(r=>r.test(x))||pv.length&&(x.match(/\d[\d,]*(?:\.\d+)?(?!\s*[\d%％倍個])/g)||[]).some(t=>{const v=+t.replace(/,/g,'');return pv.some(p=>Math.abs(v-p)<Math.max(0.051,p*1e-4))});
 return P.filter(x=>!hit(x)).join('').replace(/[，,；;、\s]+$/,'').replace(/([^。！？!?）)])$/,'$1。').trim()}
// 這檔的買進價、期初持股價、起算價、平均成本（只用來把文字裡的這些數字拿掉，不會上傳）
function bsPx(S,T){const c=cU(T.code),L=[num(T.px0),num(T.basePx)];for(const x of S.trades||[])if(cU(x.n)==c&&(x.k=='buy'||x.k=='sell'))L.push(num(x.px));
 for(const r of(Array.isArray(S.init)?S.init:[]))if(cU(r.n)==c)L.push(num(r.px));for(const h of holdings(S))if(cU(h.n)==c&&h.q>0){const a=h.cost/h.q;L.push(Math.round(a*100)/100,Math.round(a*10)/10,Math.round(a))}
 return[...new Set(L.filter(v=>v!=null&&v>0))]}
function bsPillars(T,px){const k=x=>bsClean(x,px).replace(/。$/,'');return(Array.isArray(T&&T.pillars)?T.pillars:[]).map(p=>({t:k(p&&p.t),chk:k(p&&p.chk)})).filter(p=>p.t||p.chk).slice(0,3)}
// 台股：主動＋被動持股裡股數 > 0、代號不是 00 開頭（ETF 不看重大訊息）；美股：所有美股帳戶股數 > 0 的代號（排除當現金的代號）
function bsHold(S,nm){const tw=[],seen=new Set();
 for(const h of holdings(S)){const c=cU(h.n);if(!(h.q>0)||/^00/.test(c)||seen.has(c))continue;seen.add(c);tw.push({code:c,name:nm(c)||''})}
 tw.sort((a,b)=>a.code<b.code?-1:1);let us=[];
 if(typeof usOn=='function'&&usOn(S)){const cash=new Set((S.us.cashLike||[]).map(cU));us=[...new Set(usCalc(S.us,null).rows.filter(r=>r.q>0).map(r=>cU(r.n)).filter(n=>n&&!cash.has(n)))].sort()}
 return{tw,us}}
function bsBuild(S,nm){nm=nm||(()=>'');const H=bsHold(S,nm),held=new Set(H.tw.map(x=>x.code));
 const TH=(S.theses||[]).filter(T=>T.status=='hold'&&held.has(cU(T.code))).sort((a,b)=>cU(a.code)<cU(b.code)?-1:1);
 const sids=[...new Set(TH.map(T=>T.sid||''))].sort((a,b)=>a==ST_U?1:b==ST_U?-1:a<b?-1:1),L=[];
 L.push('## 用到的策略（出場規則）','');
 for(const id of sids){if(id==ST_U){L.push('### U 不歸類','','- 不屬於任何策略：只看停損價與重新評估日，沒有策略的停利、理由失效規則。','');continue}
  const st=stStrat(S,id);if(!st){L.push(`### ${id||'未指定策略'}`,'','- （策略庫裡找不到這個策略）','');continue}
  L.push(`### ${st.id} ${st.name||''}（v${st.ver||1}）`,'');if(st.logic)L.push(`- 邏輯：${String(st.logic).trim()}`);
  const ex=String(st.exit||'').split('\n').map(s=>s.trim()).filter(Boolean);if(ex.length){L.push('- 何時賣：');for(const x of ex)L.push('  '+(/^\d+[.、]/.test(x)?x:'- '+x))}L.push('')}
 L.push('## 各檔','');
 for(const T of TH)bsThLines(S,T,nm,L,1);
 const miss=H.tw.filter(x=>!TH.some(T=>cU(T.code)==x.code));if(miss.length)L.push('## 有持股但沒有論點','',...miss.map(x=>`- ${x.code} ${x.name}`),'');
 const PL=(S.theses||[]).filter(T=>T.status=='plan').sort((a,b)=>a.id<b.id?-1:1);
 if(PL.length){L.push('## 規劃中（還沒買：不寫進持股判斷，只給每週候選與同業比價用）','');for(const T of PL)bsThLines(S,T,nm,L,0)}
 const W=(Array.isArray(S.watch)?S.watch:[]).map(w=>({code:cU(w.c),name:nm(cU(w.c))||'',sid:w.sid})).filter(w=>w.code);
 const body=L.join('\n'),hold={_說明:'晨報用的持股清單，由投資帳本 App 自動上傳：只放代號與名稱，不放股數、成本、金額。不要手動改，改了下次會被 App 蓋掉。tw、us 是持股（ETF 不列，不看重大訊息）；plan 是規劃中論點、watch 是觀察名單（sid X＝工具自選），每週候選不重複列這些',tw:H.tw,us:H.us,plan:PL.map(T=>({code:cU(T.code),name:nm(cU(T.code))||'',sid:T.sid,id:T.id})),watch:W};
 return{body,hold:JSON.stringify(hold,null,1)+'\n',strat:bsStrat(S),n:TH.length,noPl:TH.filter(T=>!bsPillars(T,[]).length).map(T=>cU(T.code)),noPe:TH.filter(T=>!(Array.isArray(T.peers)&&T.peers.length)).map(T=>cU(T.code))}}
// 一個論點的段落（持有中 full=1：含停損、目標；規劃中 full=0）
function bsThLines(S,T,nm,L,full){const c=cU(T.code),st=stStrat(S,T.sid),sn=T.sid==ST_U?'U 不歸類':st?`${st.id} ${st.name||''}`:(T.sid||'未指定');
 L.push(`### ${c} ${nm(c)||''}（${T.id}｜${sn}）`,'');
 const px=bsPx(S,T),w=bsClean(T.why,px),f=bsClean(T.wrongIf,px),tg=bsClean(T.target,px),rk=bsClean(T.riskNote,px),P=bsPillars(T,px),pe=(Array.isArray(T.peers)?T.peers:[]).map(cU).filter(Boolean).slice(0,5);
 if(T.ovr)L.push(`- 規則外觀察：${T.ovr.d} 建立時 App 判斷${T.ovr.v=='bad'?'不買':'還差資料'}`);
 if(w)L.push(`- 買進理由（${T.created||''} 寫的，數字不是現況）：${w}`);if(f)L.push(`- 什麼情況代表我錯了：${f}`);
 if(P.length){L.push('- 支柱（盤前判斷逐一對照）：');P.forEach((p,j)=>L.push(`  ${j+1}. ${p.t||'（沒寫名稱）'}${p.chk?`｜檢查：${p.chk}`:''}`))}else L.push('- 支柱：還沒寫');
 L.push(pe.length?`- 同業（比價用）：${pe.map(x=>x+(nm(x)?' '+nm(x):'')).join('、')}`:'- 同業：還沒寫');
 if(full){if(num(T.stop)!=null)L.push(`- 停損價：${num(T.stop)}`);if(num(T.tgtPx)!=null)L.push(`- 目標價：${num(T.tgtPx)}`);if(tg)L.push(`- 停利／期限：${tg}`)}
 if(T.reviewD)L.push(`- 重新評估日：${T.reviewD}`);if(rk)L.push(`- 主要風險：${rk}`);L.push('')}
// 啟用中策略的規則（給每週候選篩選用）：只有規則文字，沒有個人金額
function bsStrat(S){const L=['## 啟用中的策略',''],SL=(S.strategies||[]).filter(s=>+s.on).sort((a,b)=>a.id<b.id?-1:1),ln=t=>String(t||'').split('\n').map(x=>x.trim()).filter(Boolean);
 for(const st of SL){L.push(`### ${st.id} ${st.name||''}（v${st.ver||1}${st.term?`｜${st.term}期`:''}）`,'');if(st.logic)L.push(`- 邏輯：${String(st.logic).trim()}`);
  for(const[k,lb]of[['screen','選什麼'],['entry','何時買'],['exit','何時賣']]){const X=ln(st[k]);if(!X.length)continue;L.push(`- ${lb}：`);for(const x of X)L.push('  '+(/^\d+[.、]/.test(x)?x:'- '+x))}L.push('')}
 if(!SL.length)L.push('（沒有啟用中的策略）','');return L.join('\n')}
function bsSgMd(body,at){return`# 策略規則（每週候選篩選用）\n\n> 由投資帳本 App 自動上傳（${at}）。只在 App 的策略頁改，不要直接改這個檔。\n> 只有規則文字，不放個人金額。〔基〕〔技〕〔籌〕〔盤〕是資料類型；（股票屬性）（前瞻資料）（主題指標）是要另外查的資料。\n\n${body}`}
function bsMd(body,at){return`# 台股持股論點摘要（盤前判斷用）\n\n> 由投資帳本 App 自動上傳（${at}）。只在 App 裡改論點，不要直接改這個檔，改了下次會被蓋掉。\n> 只放判斷需要的文字與價位，不放股數、成本、金額。\n\n${body}`}
function bsHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h)}

// ---- 2) 設定與狀態（只存在這個瀏覽器）
function bsCfg(){try{return JSON.parse(ls(BS_KEY)||'{}')||{}}catch(e){return{}}}
function bsPut(o){ls(BS_KEY,JSON.stringify(Object.assign(bsCfg(),o)))}
const bsOn=()=>{const c=bsCfg();return!!(c.on&&c.tok&&c.repo)};

// ---- 3) 上傳（GitHub contents API）
const b64=s=>{const u=new TextEncoder().encode(s);let b='';for(let i=0;i<u.length;i+=8192)b+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(b)};
const unb64=s=>new TextDecoder().decode(Uint8Array.from(atob(String(s||'').replace(/\s/g,'')),c=>c.charCodeAt(0)));
async function bsGh(c,path,init){const r=await fetch(`https://api.github.com/repos/${c.repo}/contents/${path}`,Object.assign({cache:'no-store'},init||{},{headers:{Authorization:'Bearer '+c.tok,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'}}));
 if(r.status==404&&!(init&&init.method))return null;if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(e){}throw new Error(bsErrTxt(r.status,m))}return r.json()}
function bsErrTxt(s,m){return s==401?'金鑰無效或過期（401），請重新產生並貼上':s==403?`金鑰沒有權限（403）：要勾 Contents 讀寫，且 Repository access 要選到這個 repo${m?'｜'+m:''}`:s==404?'找不到 repo（404）：檢查 repo 名稱（帳號/名稱），以及金鑰有沒有選到這個 repo':s==409||s==422?`檔案剛被改過（${s}），稍後會自動重試`:`GitHub 回應 ${s}${m?'：'+m:''}`}
// 檔案內容一樣就不上傳；論點檔比對時忽略第一段的上傳時間
async function bsOne(c,path,text,cmp){const cur=await bsGh(c,path),old=cur?unb64(cur.content):null;
 if(old!=null&&(cmp?cmp(old)===cmp(text):old===text))return 0;
 await bsGh(c,path,{method:'PUT',body:JSON.stringify({message:`投資帳本同步：${path.split('/').pop()}（${bsNow()}）`,content:b64(text),sha:cur?cur.sha:undefined})});return 1}
const bsNow=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const bsBodyOf=md=>md.replace(/^[\s\S]*?\n\n(?=## )/,'');
let bsBusy=false,bsTm=null;
async function bsRun(force){const c=bsCfg();if(!bsOn()||bsBusy)return;const R=bsBuild(S,nameOf),h=bsHash(R.body+R.hold+R.strat);
 if(!force&&h===c.hash&&c.ok)return;bsBusy=true;bsPut({try:new Date().toISOString()});
 try{const n=(await bsOne(c,BS_TH,bsMd(R.body,bsNow()),md=>bsBodyOf(md)))+(await bsOne(c,BS_HD,R.hold))+(await bsOne(c,BS_SG,bsSgMd(R.strat,bsNow()),md=>bsBodyOf(md)));
  bsPut({hash:h,ok:new Date().toISOString(),err:'',n:R.n,noPl:R.noPl,noPe:R.noPe});if(force)toast(n?'✅ 已上傳到晨報 repo':'✅ 晨報 repo 已經是最新的')}
 catch(e){bsPut({err:String(e.message||e),errAt:new Date().toISOString()});if(force)toast('⚠️ 上傳失敗：'+(e.message||e))}
 finally{bsBusy=false;bsPaint()}}
// save() 每次存檔都會呼叫；停手 20 秒後才上傳，連續修改只傳一次
function bsQueue(){if(!bsOn())return;clearTimeout(bsTm);bsTm=setTimeout(()=>bsRun(false),BS_WAIT)}
window.addEventListener('pagehide',()=>{if(bsTm&&bsOn()){clearTimeout(bsTm);bsRun(false)}});
setTimeout(()=>{if(bsOn())bsRun(false)},4000);

// ---- 4) 畫面
// 資產頁「📅 明天要做的事」最上面：上傳失敗、或論點改了但還沒傳上去超過 3 天，才顯示
function bsWarn(){if(!bsOn())return'';const c=bsCfg(),R=bsBuild(S,nameOf),pend=bsHash(R.body+R.hold+R.strat)!==c.hash,ok=c.ok?Date.parse(c.ok):0;
 if(c.err&&pend)return`<div class=wn style="margin:4px 0">📡 晨報同步失敗：${esc(c.err)} <button class=lk onclick="bsOpen()">設定 ›</button></div>`;
 if(pend&&ok&&Date.now()-ok>BS_STALE*864e5)return`<div class=wn style="margin:4px 0">📡 論點改了，但已經 ${Math.floor((Date.now()-ok)/864e5)} 天沒有傳到晨報 repo <button class=lk onclick="bsRun(true)">立即上傳</button></div>`;return''}
function bsStat(){const c=bsCfg(),t=x=>x?new Date(x).toLocaleString('zh-TW',{hour12:false}):'—';
 if(!bsOn())return'<span class=h>還沒啟用</span>';
 return`${c.err?`<span class=wn>上次失敗（${t(c.errAt)}）：${esc(c.err)}</span><br>`:''}<span class=${c.ok?'ok':'h'}>最後成功：${t(c.ok)}${c.ok?`｜${c.n||0} 檔論點`:''}</span>${(c.noPl||[]).length?`<br><span class=h>還沒寫支柱：${esc(c.noPl.join('、'))}</span>`:''}${(c.noPe||[]).length?`<br><span class=h>還沒寫同業：${esc(c.noPe.join('、'))}</span>`:''}`}
function bsPaint(){const e=$('bsSt');if(e)e.innerHTML=bsStat();const b=$('bsBtn');if(b){const c=bsCfg();b.textContent=bsOn()?(c.err?'📡 晨報同步 ⚠️':'📡 晨報同步 ✓'):'📡 晨報同步'}}
window.bsOpen=()=>{const c=bsCfg();asOvOpen(`<div class=ovh><button onclick="asClose()">✕</button><b>📡 晨報同步</b></div>
 <div class=h>論點、支柱、持股清單改了之後，App 會自動上傳到你的私人 repo，Telegram 晨報與每天的盤前判斷都讀這份。只上傳論點文字、停損／目標價和持股代號；<b>不上傳股數、成本、金額</b>。</div>
 <label class=ck style="margin-top:8px"><input type=checkbox id=bsOn ${c.on?'checked':''}>自動上傳</label>
 <label>私人 repo（帳號/名稱）<input id=bsRepo value="${esc(c.repo||'')}" placeholder="例如 yourname/us-stock-agent" autocomplete=off></label>
 <label>GitHub 金鑰（fine-grained token）<input id=bsTok type=password value="${c.tok?'••••••••':''}" placeholder="github_pat_…" autocomplete=off></label>
 <div class=h>金鑰只存在這個瀏覽器，不在設定檔裡，匯出備份也不會帶出去；換手機或電腦要重新貼一次。${tipI('到 GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token：Repository access 選 Only select repositories，只選晨報用的私人 repo；Permissions 只開 Contents：Read and write（不要開 Workflows）；Expiration 建議 90 天，到期 App 會顯示上傳失敗，再產生一個貼上。這把金鑰能改那個 repo 裡的所有檔案（GitHub 沒辦法限制到單一檔案），所以只貼在自己的裝置上。','GitHub 金鑰')}</div>
 <div class=asbtn style="margin-top:8px"><button class=pri onclick="bsSave()">儲存並上傳</button><button onclick="bsPrev()">預覽要上傳的內容</button>${c.tok?'<button onclick="bsForget()">清除金鑰</button>':''}</div>
 <div id=bsSt style="margin-top:8px">${bsStat()}</div><pre id=bsPv style="display:none;white-space:pre-wrap;font-size:12px;max-height:50vh;overflow:auto;background:#f8fafc;padding:6px;border-radius:6px"></pre>`)};
window.bsSave=()=>{const t=$('bsTok').value.trim(),repo=$('bsRepo').value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$|\/+$/g,'');
 if(repo&&!/^[\w.-]+\/[\w.-]+$/.test(repo)){toast('repo 名稱要是「帳號/名稱」');return}
 const o={on:$('bsOn').checked,repo};if(t&&!/^•+$/.test(t))o.tok=t;if(repo!==bsCfg().repo)o.hash='';bsPut(o);bsPaint();if(bsOn())bsRun(true);else toast(o.on?'還缺 repo 或金鑰':'已關閉自動上傳')};
window.bsForget=()=>{const c=bsCfg();delete c.tok;c.on=false;ls(BS_KEY,JSON.stringify(c));bsOpen();bsPaint();toast('已清除這個瀏覽器裡的金鑰')};
window.bsPrev=()=>{const R=bsBuild(S,nameOf),e=$('bsPv');e.textContent=bsMd(R.body,'預覽')+'\n\n---- holdings.json ----\n'+R.hold+'\n---- strategies.md ----\n'+bsSgMd(R.strat,'預覽');e.style.display='block'};
window.bsRun=bsRun;
document.addEventListener('DOMContentLoaded',bsPaint);setTimeout(bsPaint,0);
