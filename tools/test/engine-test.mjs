// 計算核心的回歸測試：用兩份虛構設定檔跑 js/engine.js，和 tools/test/expected/ 的結果逐項比對。
// 目的：升級後「信貸數字不能變」不再靠人工比對。沒有個人資料、不需要安裝套件。
//   node tools/test/engine-test.mjs            比對（不一致時列出差異、結束碼 1）
//   node tools/test/engine-test.mjs --update   改了計算規則、而且確認新數字正確時，才用這個更新預期結果
import fs from 'fs';import vm from 'vm';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),T=path.join(ROOT,'tools/test');
const TODAY='2026-11-10';   // 固定「今天」，結果才不會每天變
const src=fs.readFileSync(path.join(ROOT,'js/engine.js'),'utf8').replace(/const TODAY=\(\(\)=>\{[^\n]*?\}\)\(\);/,`const TODAY='${TODAY}';`);
if(!src.includes(`const TODAY='${TODAY}'`))throw new Error('engine.js 的 TODAY 寫法改了，請更新測試');
const ctx=vm.createContext({console});vm.runInContext(src+'\n;globalThis.__E={migrate,settle,project,planInit,forecast,loanS,aprLoan,breakeven,cashflow};',ctx);const E=ctx.__E;
const r4=v=>typeof v=='number'?(isFinite(v)?Math.round(v*1e4)/1e4:String(v)):v;
const pick=(o,ks)=>o?Object.fromEntries(ks.map(k=>[k,r4(o[k])])):null;
const SK=['ts','scope','rem','cum','cost','nle','real','af','ao','d0','x','fv'],PK=['X','stk','rem','af','ao','real','nl','pay','div'];
function run(file){const m=E.migrate(JSON.parse(fs.readFileSync(file,'utf8'))),S=m.o,ln=E.loanS(S,0),le=E.loanS(S,1),N=ln.N;
 const rec=E.project(S,E.planInit(S)),H=rec.length-1,at=[0,1,12,24,36,H].filter((t,i,a)=>t<=H&&a.indexOf(t)==i);const fc=E.forecast(S);
 return{loan:{N,pay1:r4(ln.pay[1]),payN:r4(ln.pay[N]),paySum:r4(ln.pay.reduce((a,b)=>a+(+b||0),0)),earlySum:r4(le.pay.reduce((a,b)=>a+(+b||0),0)),apr:r4(E.aprLoan(S))},
  project:Object.fromEntries(at.map(t=>['t'+t,pick(rec[t],PK)])),forecastEnd:pick(fc.rec[fc.rec.length-1],PK),breakeven:r4(E.breakeven(S)),
  settle:Object.fromEntries([...(S.snaps||[]),S.cur].map((s,i)=>[(s.dt||'cur')+(i==(S.snaps||[]).length?'(cur)':''),pick(E.settle(S,s),SK)])),
  cashflow:E.cashflow(S).slice(0,3).map(x=>pick(x,['t','inc','lv','lp','base']))}}
const diff=(a,b,p='',out=[])=>{if(a&&b&&typeof a=='object'&&typeof b=='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],p+'.'+k,out)}else if(JSON.stringify(a)!==JSON.stringify(b))out.push(`${p}: 預期 ${JSON.stringify(b)}，得到 ${JSON.stringify(a)}`);return out};
const up=process.argv.includes('--update');let bad=0;
for(const f of fs.readdirSync(path.join(T,'fixtures')).filter(f=>f.endsWith('.json')).sort()){
 const got=run(path.join(T,'fixtures',f)),ef=path.join(T,'expected',f);
 if(up||!fs.existsSync(ef)){fs.writeFileSync(ef,JSON.stringify(got,null,1)+'\n');console.log('已寫入預期結果',f);continue}
 const d=diff(got,JSON.parse(fs.readFileSync(ef,'utf8')));if(d.length){bad++;console.log('✗',f);d.slice(0,40).forEach(x=>console.log('   '+x))}else console.log('✓',f)}
if(bad){console.log(`\n${bad} 份設定檔的計算結果和預期不同。如果是刻意改了計算規則，確認新數字正確後執行 --update。`);process.exit(1)}
