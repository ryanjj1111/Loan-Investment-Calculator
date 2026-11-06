// 前瞻資料與股票屬性：法人 EPS 預估、法說指引、主題指標（例如雲端業者資本支出、DRAM 報價）
// 這些資料要人判斷或從新聞、法人報告收集；可以手動填，也可以請 AI 用「投資帳本 v1」的 outlook／themes 區塊整理後匯入
// 投資帳本｜資產・策略・信貸｜https://ryanjj1111.github.io/Loan-Investment-Calculator/

const OL_DIR=[['up','向上'],['flat','持平'],['down','向下']];
const OL_STALE=120;
const olDirN=k=>(OL_DIR.find(x=>x[0]==k)||['','—'])[1];
// AI 或手動填的方向文字 → up／flat／down
const olDir=v=>{const s=String(v??'').trim().toLowerCase();if(!s)return'';if(/^(up|上|向上|上升|成長|增|季增|年增|樂觀|轉強|回升|漲)/.test(s))return'up';if(/^(flat|持平|平|穩|維持|止跌)/.test(s))return'flat';if(/^(down|下|向下|下滑|衰退|減|季減|年減|保守|轉弱|跌)/.test(s))return'down';return''};
const olOld=d=>!d||dDays(d,TODAY)>OL_STALE;
function olRe(){save();if(typeof asCalc=='function')asCalc();if(typeof asCur!='undefined'&&asCur){const b=$('asOvB'),h=b?b.scrollTop:0;asStock(asCur.c,asCur.ac);const b2=$('asOvB');if(b2)b2.scrollTop=h}if(typeof stBuild=='function')stBuild()}

// 個股頁：前瞻資料卡
function olHtml(c){c=cU(c);const a=(S.attr||{})[c]||{},o=(S.outlook||{})[c]||{},E=(o.eps||[]).map((e,i)=>({e,i})).sort((p,q)=>(q.e.d||'')>(p.e.d||'')?1:-1),g=o.guide||{},th=a.theme&&(S.themes||{})[a.theme];
 const miss=['growth','cyc','lead'].filter(k=>a[k]==null||a[k]==='').length+(E.length?0:1)+(g.d?0:1);
 const tri=(k,lb)=>`<div class=olr><span>${lb}</span><div class=chips>${[['1','是'],['0','否'],['','未確認']].map(([v,l])=>`<button class="${String(a[k]??'')==v?'on':''}" onclick="olAttr('${c}','${k}','${v}')">${l}</button>`).join('')}</div></div>`;
 const dir=(f,lb)=>`<div class=olr><span>${lb}</span><div class=chips>${OL_DIR.map(([v,l])=>`<button class="${g[f]==v?'on':''}" onclick="olGuide('${c}','${f}','${v}')">${l}</button>`).join('')}</div></div>`;
 const y1=+TODAY.slice(0,4)+1;
 return`<details class=olc ${ls('lcol')=='1'?'open':''} ontoggle="ls('lcol',this.open?'1':'0')"><summary><b>🔭 前瞻資料與股票屬性</b> <span class=h>${miss?`還有 ${miss} 項沒填`:'已填'}</span></summary>
 <div class=sub>股票屬性（每檔確認一次）</div>${tri('growth','產業有 2 年以上結構性成長')}${tri('cyc','景氣循環股')}${tri('lead','產業龍頭或寡占')}
 <div class=olr><span>所屬主題</span><input list=olThL value="${esc(a.theme||'')}" placeholder="例如 AI 伺服器" onchange="olAttr('${c}','theme',this.value.trim())"><datalist id=olThL>${Object.keys(S.themes||{}).map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
 ${a.theme?`<div class=h>主題「${esc(a.theme)}」：${th&&th.d?`${olDirN(th.st)}（${esc(th.d)}${th.note?'：'+esc(th.note):''}）${olOld(th.d)?' <span class=wn>超過 4 個月，請更新</span>':''}`:'<span class=wn>還沒填</span>，到「🧭 策略 → 📚 策略庫」最上方的主題指標填寫'}</div>`:''}
 <div class=sub>法人 EPS 預估</div>
 ${E.length?`<div class=olt>${E.map(({e,i})=>`<div class="olr ${olOld(e.d)?'old':''}"><span>${esc(e.y)} 年 <b>${esc(e.v)}</b> 元</span><span class=h>${esc(e.src||'未註明來源')}｜${esc(e.d||'')}${olOld(e.d)?'（超過 4 個月）':''}</span><button onclick="olEpsDel('${c}',${i})">✕</button></div>`).join('')}</div>`:'<div class=h>還沒有預估資料。</div>'}
 <div class=olf><input id=olY value="${y1}" type=number style="width:70px" aria-label="年度"><input id=olV type=number step=any placeholder="EPS" style="width:80px"><input id=olS placeholder="來源，例如 元大投顧" style="flex:1;min-width:110px"><input id=olD type=date value="${TODAY}" style="width:140px"><button onclick="olEpsAdd('${c}')">新增</button></div>
 <div class=sub>最近一次法說指引</div>${dir('rev','下一季營收')}${dir('gm','下一季毛利率')}
 <div class=olf><input type=date value="${esc(g.d||'')}" onchange="olGuide('${c}','d',this.value)" style="width:140px"><input value="${esc(g.src||'')}" placeholder="來源" onchange="olGuide('${c}','src',this.value)" style="width:110px"><input value="${esc(g.note||'')}" placeholder="重點，一句話" onchange="olGuide('${c}','note',this.value)" style="flex:1;min-width:120px"></div>
 ${g.d&&olOld(g.d)?'<div class=wn>法說指引超過 4 個月，請更新。</div>':''}
 <div class=h style="margin-top:4px">這些資料用在策略的前瞻條件，超過 ${OL_STALE} 天會顯示 ❔ 提醒更新。每月或每季可以請 AI 收集後，用「投資帳本 v1」的 outlook 區塊匯入。</div></details>`}
window.olAttr=(c,k,v)=>{S.attr=S.attr||{};const a=S.attr[c]=S.attr[c]||{};if(k=='theme')a.theme=v;else a[k]=v===''?'':+v;a.d=TODAY;olRe()};
window.olGuide=(c,f,v)=>{S.outlook=S.outlook||{};const o=S.outlook[c]=S.outlook[c]||{},g=o.guide=o.guide||{};g[f]=v;if(f=='rev'||f=='gm'){if(!g.d)g.d=TODAY}olRe()};
window.olEpsAdd=c=>{const y=num($('olY').value),v=num($('olV').value),d=$('olD').value||TODAY,s=$('olS').value.trim();if(!y||v==null){toast('請填年度和 EPS',0);return}
 S.outlook=S.outlook||{};const o=S.outlook[c]=S.outlook[c]||{};o.eps=o.eps||[];o.eps.push({y,v,src:s,d});olRe()};
window.olEpsDel=(c,i)=>{const o=(S.outlook||{})[c];if(!o||!o.eps)return;o.eps.splice(i,1);olRe()};

// 策略頁：主題指標（一個主題可以套用到很多檔股票）
function olThemesHtml(){const T=S.themes||{},L=Object.keys(T).sort(),used={};for(const c in S.attr||{}){const n=S.attr[c].theme;if(n)(used[n]=used[n]||[]).push(c)}
 return`<details class="stc olc" ${ls('lcth')=='0'?'':'open'} ontoggle="ls('lcth',this.open?'1':'0')"><summary><b>🧭 主題指標</b> <span class=h>${L.length} 個主題｜一個主題可以套用到很多檔股票，每季更新一次</span></summary>
 ${L.map(n=>{const t=T[n];return`<details class="olth ${t.d&&olOld(t.d)?'old':''}"><summary><b>${esc(n)}</b>　${t.d?`${olDirN(t.st)} <span class=h>${esc(t.d)}${t.note?'｜'+esc(t.note):''}</span>${olOld(t.d)?' <span class=wn>超過 4 個月，請更新</span>':''}`:'<span class=wn>還沒填</span>'} <span class=h>✎</span></summary><div class=olr><div class=chips>${OL_DIR.map(([v,l])=>`<button class="${t.st==v?'on':''}" onclick="thSet('${esc(n)}','st','${v}')">${l}</button>`).join('')}</div><button onclick="thDel('${esc(n)}')">✕</button></div>
  <div class=olf><input type=date value="${esc(t.d||'')}" onchange="thSet('${esc(n)}','d',this.value)" style="width:140px"><input value="${esc(t.src||'')}" placeholder="來源" onchange="thSet('${esc(n)}','src',this.value)" style="width:110px"><input value="${esc(t.note||'')}" placeholder="重點，例如：四大雲端業者明年資本支出年增 3 成" onchange="thSet('${esc(n)}','note',this.value)" style="flex:1;min-width:140px"></div>
  <div class=h>套用到：${(used[n]||[]).map(c=>esc(c+' '+nameOf(c))).join('、')||'（還沒有股票）'}</div></details>`}).join('')||'<div class=h>還沒有主題。例如「AI 伺服器」看雲端業者資本支出、「記憶體」看 DRAM 報價。</div>'}
 <div class=olf><input id=thN placeholder="新主題名稱" style="flex:1"><button onclick="thAdd()">新增主題</button></div></details>`}
window.thSet=(n,f,v)=>{S.themes=S.themes||{};const t=S.themes[n]=S.themes[n]||{};t[f]=v;if(f=='st'&&!t.d)t.d=TODAY;olRe()};
window.thAdd=()=>{const n=$('thN').value.trim();if(!n)return;S.themes=S.themes||{};if(!S.themes[n])S.themes[n]={st:'',d:'',src:'',note:''};olRe()};
window.thDel=n=>{if(!confirm(`刪除主題「${n}」？`))return;delete S.themes[n];olRe()};
