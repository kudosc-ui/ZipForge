'use strict';
/* ZipForge — vanilla JS. Sections: 1 utils · 2 state · 3 intake · 4 clean rules · 5 UI · 6 ZIP engine (CRC32, SHA-1, AES-256) · 7 run */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

/* ---------- 1. utils & icons ---------- */
const ICO={file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',plus:'<path d="M12 5v14M5 12h14"/>',sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',check:'<path d="M20 6L9 17l-5-5"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',bolt:'<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',refresh:'<path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/>',broom:'<path d="M3 21l6-6M14 3l7 7-7 7-4-4z"/><path d="M9 15l-3 3"/>',archive:'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',back:'<path d="M15 18l-6-6 6-6"/>',lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',eyeoff:'<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.7 9.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>'};
const I=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n]}</svg>`;
const icons=()=>$$('[data-i]').forEach(e=>e.innerHTML=I(e.dataset.i));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=b=>{if(b<1024)return b+' B';const u=['KB','MB','GB','TB'];let i=-1;do{b/=1024;i++}while(b>=1024&&i<3);return(b>=100?b.toFixed(0):b.toFixed(1)).replace(/\.0$/,'')+' '+u[i]};
const say=t=>{$('#live').textContent=t};
const LS={get(){try{return JSON.parse(localStorage.getItem('zipforge')||'{}')}catch{return{}}},set(o){try{localStorage.setItem('zipforge',JSON.stringify({...LS.get(),...o}))}catch{}},clear(){try{localStorage.removeItem('zipforge')}catch{}}};
const open=d=>d.showModal?d.showModal():d.setAttribute('open','');

/* ---------- 2. state ---------- */
const saved=LS.get();
const S={entries:[],step:'home',prevStep:'home',level:saved.level||'balanced',theme:saved.theme==='light'?'light':'dark',nameEdited:false,rules:[],preset:'off',result:null,busy:false,cancel:false,url:null};
let nid=0;
const LV={fast:'Quicker. Compresses small text-like files only.',balanced:'Recommended. Compresses everything that benefits from it.',max:'Smaller ZIP, may take longer. Compresses every file.'};
const LVN={fast:'Fast',balanced:'Balanced',max:'Maximum'};
const PRESETS={general:['.git/','.cache/','*.log','*.tmp','.DS_Store','Thumbs.db'],web:['.git/','.cache/','.parcel-cache/','dist/','build/','*.log','.DS_Store'],node:['node_modules/','.git/','.cache/','dist/','build/','coverage/','.next/','*.log'],react:['node_modules/','.git/','build/','dist/','.next/','coverage/','.cache/','*.log'],python:['__pycache__/','.venv/','venv/','.pytest_cache/','.mypy_cache/','.git/','*.pyc','*.log'],android:['build/','.gradle/','.idea/','captures/','.git/','local.properties','*.log']};
const ERR={none:['No files selected','Add at least one file or folder to continue.'],empty:['Nothing to add','That selection had no readable files.'],access:['File access denied',"ZipForge couldn't read one of your files. It may have been moved, deleted or protected. Try selecting it again."],dir:['Folder selection unsupported',"This browser can't pick folders. Try Chrome, Edge or Safari, or select individual files."],pwmatch:["Passwords don't match",'Make sure both password fields are identical.'],pwbad:['Invalid password','Use at least 6 characters.'],limit:['Browser limitation','This selection is too large for one ZIP in the browser (max about 4 GB or 65,535 files). Try splitting it into smaller parts.'],mem:['Not enough memory','Your device ran out of memory. Try fewer or smaller files, or close other tabs.'],unsup:['Unsupported operation','Password ZIPs need a modern browser opened over HTTPS (or localhost).'],fail:["Couldn't create the ZIP",'Something went wrong while processing your files.']};
function showErr(k){const[t,p]=ERR[k]||ERR.fail;$('#eT').textContent=t;$('#eP').textContent=p;open($('#dlgErr'));say(t)}
const errKind=e=>e&&e.code&&ERR[e.code]?e.code:(e&&['NotReadableError','NotFoundError','SecurityError','NotAllowedError'].includes(e.name))?'access':(e&&(e.name==='RangeError'||e.name==='QuotaExceededError'||/memory|allocation/i.test(e.message)))?'mem':'fail';

/* ---------- 3. intake (pickers + drag & drop) ---------- */
function push(name,kind,files){S.entries.push({id:++nid,name,kind,files,size:files.reduce((a,f)=>a+f.file.size,0)})}
function added(){if(!S.entries.length)return showErr('empty');if(S.step==='home'||S.step==='done')go('files');else render()}
function fromInput(list){const dirs=new Map(),loose=[];for(const f of list){const rp=f.webkitRelativePath;if(rp){const top=rp.split('/')[0];if(!dirs.has(top))dirs.set(top,[]);dirs.get(top).push({file:f,path:rp})}else loose.push({file:f,path:f.name})}
  for(const[n,fl]of dirs)push(n,'folder',fl);for(const x of loose)push(x.path,'file',[x]);added()}
async function walk(en,path,out){if(en.isFile)await new Promise(r=>en.file(f=>{out.push({file:f,path:path+en.name});r()},()=>r()));else{const rd=en.createReader();let b;do{b=await new Promise((res,rej)=>rd.readEntries(res,rej));for(const c of b)await walk(c,path+en.name+'/',out)}while(b.length)}}
async function fromDrop(dt){const ens=[...dt.items].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
  try{for(const en of ens){if(en.isFile){const f=[];await walk(en,'',f);f.forEach(x=>push(x.path,'file',[x]))}else{const f=[];await walk(en,'',f);if(f.length)push(en.name,'folder',f)}}added()}catch(e){showErr('access')}}
$('#inF').onchange=e=>{fromInput(e.target.files);e.target.value=''};
$('#inD').onchange=e=>{fromInput(e.target.files);e.target.value=''};
const app=$('#app');
['dragenter','dragover'].forEach(t=>app.addEventListener(t,e=>{e.preventDefault();$('#drop').classList.add('drag')}));
['dragleave','drop'].forEach(t=>app.addEventListener(t,e=>{if(t==='drop'||e.target===app)$('#drop').classList.remove('drag')}));
app.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer&&e.dataTransfer.items&&!S.busy)fromDrop(e.dataTransfer)});

/* ---------- 4. clean rules ---------- */
const match=(p,path)=>{const s=path.split('/'),n=s.pop();return p.endsWith('/')?s.includes(p.slice(0,-1)):p[0]==='*'?n.endsWith(p.slice(1)):n===p};
const allFiles=()=>S.entries.flatMap(e=>e.files);
function eff(){const on=S.rules.filter(r=>r.on);return allFiles().filter(f=>!on.some(r=>match(r.p,f.path)))}
function stats(fs){const d=new Set();let size=0;for(const f of fs){size+=f.file.size;const p=f.path.split('/');for(let i=1;i<p.length;i++)d.add(p.slice(0,i).join('/'))}return{n:fs.length,d:d.size,size}}
$('#preset').onchange=e=>{S.preset=e.target.value;S.rules=S.preset==='off'?[]:PRESETS[S.preset].map(p=>({p,on:true}));render()};

/* ---------- 5. UI ---------- */
function applyTheme(){document.documentElement.dataset.theme=S.theme;const d=S.theme==='dark'||(S.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);$('meta[name=theme-color]').content=d?'#000000':'#ffffff'}
function syncSeg(){$$('[data-th]').forEach(b=>b.setAttribute('aria-checked',b.dataset.th===S.theme));$$('[data-lv]').forEach(b=>b.setAttribute('aria-checked',b.dataset.lv===S.level));$('#lvDesc').textContent=LVN[S.level]+': '+LV[S.level]}
const defName=()=>{const e=S.entries;return e.length===1?(e[0].kind==='folder'?e[0].name:e[0].name.replace(/\.[^.]+$/,'')||e[0].name):'Archive'};
const zipName=()=>{let n=$('#zname').value.trim().replace(/\.zip$/i,'').replace(/[\\/:*?"<>|]+/g,'_')||defName();return n+'.zip'};
function strength(p){let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p)&&/[^A-Za-z0-9]/.test(p))s++;return p?Math.max(1,s):0}
function meter(){const s=strength($('#pw').value);$$('#meter i').forEach((i,k)=>i.classList.toggle('on',k<s));$('#meter').dataset.s=s;$('#meterTxt').textContent=(['Not set','Weak','Fair','Good','Strong'][s]);pwMatch()}
function pwMatch(){const a=$('#pw').value,b=$('#pw2').value,m=$('#pwMatch');if(!b){m.textContent='';m.className='match';return}const ok=a===b;m.textContent=ok?'Passwords match':'Passwords don\'t match';m.className='match '+(ok?'ok':'bad')}
function pwVis(show){$('#pw').type=$('#pw2').type=show?'text':'password';const b=$('#pwBox .eye');b.innerHTML=I(show?'eyeoff':'eye');b.setAttribute('aria-label',show?'Hide password':'Show password');b.setAttribute('aria-pressed',show)}
function go(step,opts){S.step=step;render();$('#main').scrollTop=0;say({files:'Review files',opts:'ZIP options',sum:'Ready to compress',prog:'Creating ZIP',done:'ZIP ready',settings:'Settings',details:'ZIP details'}[step]||'')}
function openSub(step){S.prevStep=S.step;if(step==='settings')syncSeg();if(step==='details')renderDetails();go(step)}
function render(){
  const st=S.step;$$('.scr').forEach(s=>s.hidden=s.id!=='s-'+st);
  const sub=st==='settings'||st==='details';
  $('#hdBack').hidden=!sub;$('#hdBrand').hidden=sub;$('#hdTitle').hidden=!sub;$('#hdSettings').hidden=sub;
  if(sub)$('#hdTitle').textContent=st==='settings'?'Settings':'ZIP details';
  $('#footClear').hidden=st!=='home';
  const idx={files:0,opts:1,sum:2,prog:3,done:3}[st],T=$('#steps');T.hidden=idx===undefined;
  $$('#steps li').forEach((li,i)=>{li.classList.toggle('done',i<idx);li.classList.toggle('cur',i===idx);if(i===idx)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
  const ef=eff(),B=$('#bBack'),N=$('#bNext');$('#bar').hidden=!['files','opts','sum','prog'].includes(st);
  B.hidden=st==='files';N.hidden=st==='prog';B.textContent=st==='prog'?'Cancel':'Back';N.textContent=st==='sum'?'Create ZIP':'Continue';N.disabled=st==='files'&&!ef.length;
  if(st==='files'){const s=stats(ef);
    $('#stats').innerHTML=`<div><b>${s.n.toLocaleString()}</b><span>Files</span></div><div><b>${s.d.toLocaleString()}</b><span>Folders</span></div><div><b>${fmt(s.size)}</b><span>Total size</span></div>`;
    $('#list').innerHTML=S.entries.map(e=>`<li class="row"><span class="ri">${I(e.kind==='folder'?'folder':'file')}</span><div class="rt"><b>${esc(e.name)}</b><small>${e.kind==='folder'?e.files.length.toLocaleString()+' files · '+fmt(e.size):fmt(e.size)}</small></div><button class="ib x" data-rm="${e.id}" aria-label="Remove ${esc(e.name)}">${I('x')}</button></li>`).join('');
    const all=allFiles();$('#rules').innerHTML=S.preset==='off'?'':S.rules.map((r,i)=>{const m=all.filter(f=>match(r.p,f.path));const sz=m.reduce((a,f)=>a+f.file.size,0);return`<label class="rule ${m.length?'':'zero'}"><input type="checkbox" data-rule="${i}" ${r.on?'checked':''}><span><b>Exclude ${esc(r.p)}</b><small>${m.length?m.length.toLocaleString()+' files · '+fmt(sz):'Not in your selection'}</small></span></label>`}).join('')}
  if(st==='opts'){syncSeg();if(!S.nameEdited)$('#zname').value=defName()}
  if(st==='sum')renderSum();
}
function renderSum(){const s=stats(eff()),pw=$('#pwOn').checked,rows=[['Files',s.n.toLocaleString()],['Folders',s.d.toLocaleString()],['Total size',fmt(s.size)],['ZIP name',esc(zipName())],['Compression',LVN[S.level]],['Password',pw?'Protected 🔐':'None']];
  $('#sumRows').innerHTML=rows.map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}
function renderDone(){const r=S.result;$('#dName').textContent=r.name;$('#dSizes').textContent=fmt(r.orig)+' → '+fmt(r.zip);
  const p=r.orig?Math.round((1-r.zip/r.orig)*100):0;$('#dPct').textContent=p>0?p+'% smaller':'No size reduction (already compressed data)';
  const f=new File([r.blob],r.name,{type:'application/zip'});$('#btnShare').hidden=!(navigator.canShare&&navigator.canShare({files:[f]}));r.file=f}
function renderDetails(){const r=S.result;if(!r)return;const p=r.orig?Math.max(0,Math.round((1-r.zip/r.orig)*100)):0;
  const rows=[['Original size',fmt(r.orig)],['ZIP size',fmt(r.zip)],['Compression',p+'% smaller'],['Files',r.files.toLocaleString()],['Folders',r.dirs.toLocaleString()],['Level',LVN[r.level]+(r.stored?` (${r.stored} stored as-is)`:'')],['Password',r.pw?'Protected (AES-256) 🔐':'Not protected']];
  $('#detRows').innerHTML=rows.map(x=>`<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('')}

document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-rm]');if(!t)return;
  if(t.dataset.rm){S.entries=S.entries.filter(x=>x.id!=t.dataset.rm);S.entries.length?render():go('home');return}
  if(t.dataset.lv){S.level=t.dataset.lv;LS.set({level:S.level});syncSeg();return}
  if(t.dataset.th){S.theme=t.dataset.th;LS.set({theme:S.theme});applyTheme();syncSeg();return}
  const a=t.dataset.act;if(!a)return;
  if(a==='pickFiles')$('#inF').click();
  else if(a==='pickDir'){'webkitdirectory'in $('#inD')?$('#inD').click():showErr('dir')}
  else if(a==='settings')openSub('settings');
  else if(a==='details')openSub('details');
  else if(a==='back')go(S.prevStep||'home');
  else if(a==='close')t.closest('dialog').close();
  else if(a==='showpw'){pwVis($('#pw').type==='password')}
  else if(a==='gen'){const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_';const r=crypto.getRandomValues(new Uint32Array(18));const p=[...r].map(x=>c[x%c.length]).join('');$('#pw').value=$('#pw2').value=p;pwVis(true);meter()}
  else if(a==='dl'){const l=document.createElement('a');l.href=S.url;l.download=S.result.name;document.body.append(l);l.click();l.remove()}
  else if(a==='share'){navigator.share({files:[S.result.file],title:S.result.name}).catch(()=>{})}
  else if(a==='again'){resetAll(false)}
  else if(a==='clear'){resetAll(true)}
});
document.addEventListener('change',e=>{if(e.target.dataset.rule!==undefined){S.rules[e.target.dataset.rule].on=e.target.checked;render()}});
$('#pwOn').onchange=e=>{$('#pwBox').hidden=!e.target.checked};
$('#pw').oninput=meter;$('#pw2').oninput=pwMatch;$('#zname').oninput=()=>{S.nameEdited=true};
$('#bBack').onclick=()=>{if(S.step==='opts')go('files');else if(S.step==='sum')go('opts');else if(S.step==='prog')S.cancel=true};
$('#bNext').onclick=()=>{
  if(S.step==='files')return eff().length?go('opts'):showErr('none');
  if(S.step==='opts'){if($('#pwOn').checked){const a=$('#pw').value;if(a.length<6)return showErr('pwbad');if(a!==$('#pw2').value)return showErr('pwmatch')}return go('sum')}
  if(S.step==='sum')run()};
function resetAll(hard){if(S.busy)return;S.entries=[];S.rules=[];S.preset='off';$('#preset').value='off';S.nameEdited=false;S.result=null;if(S.url)URL.revokeObjectURL(S.url);S.url=null;$('#pw').value=$('#pw2').value='';$('#pwOn').checked=false;$('#pwBox').hidden=true;meter();
  if(hard){LS.clear();S.level='balanced';S.theme='dark';applyTheme();syncSeg()}go('home')}

/* ---------- 6. ZIP engine ---------- */
const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(c,b){c^=-1;for(let i=0;i<b.length;i++)c=CT[(c^b[i])&255]^(c>>>8);return(c^-1)>>>0}
/* little-endian packer: le([bytes,value,...]) */
function le(sp){let n=0;for(let i=0;i<sp.length;i+=2)n+=sp[i];const u=new Uint8Array(n),v=new DataView(u.buffer);let o=0;for(let i=0;i<sp.length;i+=2){const s=sp[i],x=sp[i+1];s===1?v.setUint8(o,x):s===2?v.setUint16(o,x,true):v.setUint32(o,x>>>0,true);o+=s}return u}
function dos(ms){const d=new Date(ms||Date.now()),y=Math.max(1980,d.getFullYear());return[(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),((y-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()]}
/* SHA-1 + HMAC-SHA1 (incremental, for the WinZip AES authentication code) */
function sha1(){const h=new Uint32Array([0x67452301,0xEFCDAB89,0x98BADCFE,0x10325476,0xC3D2E1F0]),b=new Uint8Array(64),w=new Uint32Array(80);let n=0,L=0;const rl=(x,s)=>(x<<s)|(x>>>(32-s));
  function blk(){for(let i=0;i<16;i++)w[i]=b[4*i]<<24|b[4*i+1]<<16|b[4*i+2]<<8|b[4*i+3];for(let i=16;i<80;i++)w[i]=rl(w[i-3]^w[i-8]^w[i-14]^w[i-16],1);
    let a=h[0],bb=h[1],c=h[2],d=h[3],e=h[4];for(let i=0;i<80;i++){let f,k;if(i<20){f=(bb&c)|(~bb&d);k=0x5A827999}else if(i<40){f=bb^c^d;k=0x6ED9EBA1}else if(i<60){f=(bb&c)|(bb&d)|(c&d);k=0x8F1BBCDC}else{f=bb^c^d;k=0xCA62C1D6}const t=(rl(a,5)+f+e+k+w[i])|0;e=d;d=c;c=rl(bb,30);bb=a;a=t}
    h[0]+=a;h[1]+=bb;h[2]+=c;h[3]+=d;h[4]+=e}
  return{update(d){for(let i=0;i<d.length;i++){b[n++]=d[i];if(n===64){blk();n=0}}L+=d.length},
    digest(){const l=L*8;b[n++]=128;if(n>56){b.fill(0,n);blk();n=0}b.fill(0,n);const v=new DataView(b.buffer);v.setUint32(56,Math.floor(l/4294967296));v.setUint32(60,l>>>0);blk();const o=new Uint8Array(20),ov=new DataView(o.buffer);for(let i=0;i<5;i++)ov.setUint32(4*i,h[i]);return o}}}
function hmac(key){const ip=new Uint8Array(64).fill(0x36),op=new Uint8Array(64).fill(0x5c);key.forEach((k,i)=>{ip[i]^=k;op[i]^=k});const s=sha1();s.update(ip);return{update:d=>s.update(d),digest(){const inner=s.digest(),o=sha1();o.update(op);o.update(inner);return o.digest()}}}
/* AES-256 block encrypt (used to build the CTR keystream; WinZip uses a little-endian counter, which WebCrypto can't do) */
const SB=new Uint8Array(256),XT=new Uint8Array(256);
(()=>{let p=1,q=1;const rl=(x,s)=>((x<<s)|(x>>(8-s)))&255;do{p=(p^(p<<1)^(p&128?27:0))&255;q^=(q<<1)&255;q^=(q<<2)&255;q^=(q<<4)&255;if(q&128)q^=9;SB[p]=q^rl(q,1)^rl(q,2)^rl(q,3)^rl(q,4)^99}while(p!==1);SB[0]=99;for(let i=0;i<256;i++)XT[i]=((i<<1)^(i&128?27:0))&255})();
function expandKey(k){const w=new Uint8Array(240);w.set(k);let rc=1;for(let i=8;i<60;i++){let t=Array.from(w.subarray(4*i-4,4*i));if(i%8===0){t=[SB[t[1]]^rc,SB[t[2]],SB[t[3]],SB[t[0]]];rc=XT[rc]}else if(i%8===4)t=t.map(x=>SB[x]);for(let j=0;j<4;j++)w[4*i+j]=w[4*i-32+j]^t[j]}return w}
const _s=new Uint8Array(16),_t=new Uint8Array(16);
function encBlock(w,inp,out){for(let i=0;i<16;i++)_s[i]=inp[i]^w[i];
  for(let r=1;r<=14;r++){for(let c=0;c<4;c++)for(let j=0;j<4;j++)_t[4*c+j]=SB[_s[4*((c+j)&3)+j]];
    if(r<14){for(let c=0;c<16;c+=4){const a=_t[c],b=_t[c+1],d=_t[c+2],e=_t[c+3],x=a^b^d^e;_s[c]=a^x^XT[a^b];_s[c+1]=b^x^XT[b^d];_s[c+2]=d^x^XT[d^e];_s[c+3]=e^x^XT[e^a]}}else _s.set(_t);
    for(let i=0;i<16;i++)_s[i]^=w[16*r+i]}out.set(_s)}
/* WinZip AE-2: PBKDF2-HMAC-SHA1(1000) → 32B AES key + 32B HMAC key + 2B verifier; AES-CTR (LE counter from 1); 10B HMAC-SHA1 tag */
async function aesInit(pw){const salt=crypto.getRandomValues(new Uint8Array(16));
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  const d=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:1000,hash:'SHA-1'},k,528));
  const rk=expandKey(d.subarray(0,32)),hm=hmac(d.subarray(32,64)),ctr=new Uint8Array(16),ks=new Uint8Array(16);let ki=16;
  const head=new Uint8Array(18);head.set(salt);head.set(d.subarray(64,66),16);
  return{head,push(c){for(let i=0;i<c.length;i++){if(ki===16){for(let j=0;j<16;j++){ctr[j]=(ctr[j]+1)&255;if(ctr[j])break}encBlock(rk,ctr,ks);ki=0}c[i]^=ks[ki++]}hm.update(c);return c},finish:()=>hm.digest().subarray(0,10)}}

async function*chunks(file){if(file.stream){const r=file.stream().getReader();for(;;){const{done,value}=await r.read();if(done)return;yield value}}else for(let o=0;o<file.size;o+=1<<20)yield new Uint8Array(await file.slice(o,o+(1<<20)).arrayBuffer())}
const PACKED=/\.(zip|rar|7z|gz|bz2|xz|zst|jpe?g|png|gif|webp|avif|heic|mp3|m4a|aac|ogg|opus|mp4|m4v|mov|mkv|webm|avi|pdf|docx|xlsx|pptx|apk|jar)$/i;
const CAN_DEFLATE=typeof CompressionStream!=='undefined';
function shouldDeflate(f,path,lv){if(!CAN_DEFLATE||!f.size)return false;if(lv==='max')return true;if(PACKED.test(path))return false;return lv==='balanced'||f.size<8<<20}
/* pack one file: stream → CRC → (deflate) → (AES) → Blob (browser can spill big blobs to disk) */
async function packFile(f,path,lv,pw,tick){let crc=0,size=0;const it=chunks(f),def=shouldDeflate(f,path,lv);
  let rs=new ReadableStream({async pull(c){if(S.cancel)throw{code:'cancel'};const{value,done}=await it.next();if(done)c.close();else{crc=crc32(crc,value);size+=value.length;tick(value.length);c.enqueue(value)}}});
  if(def)rs=rs.pipeThrough(new CompressionStream('deflate-raw'));
  const aes=pw?await aesInit(pw):null,out=[];let cs=0;if(aes){out.push(aes.head);cs+=18}
  const rd=rs.getReader();for(;;){const{done,value}=await rd.read();if(done)break;const c=aes?aes.push(value):value;out.push(c);cs+=c.length}
  if(aes){const t=aes.finish();out.push(t);cs+=10}
  return{crc,size,cs,method:def?8:0,blob:new Blob(out)}}
async function build(files,{level,pw,tick}){const parts=[],cd=[],enc=new TextEncoder();let off=0,total=0,stored=0;
  for(const x of files)total+=x.file.size;
  if(files.length>65535||total>=0xF0000000)throw{code:'limit'};
  let doneBytes=0,n=0;
  for(const{file,path}of files){tick({path,n,total:files.length,frac:doneBytes/(total||1)});
    const r=await packFile(file,path,level,pw,b=>{doneBytes+=b;tick({path,n,total:files.length,frac:doneBytes/(total||1)})});
    if(r.method===0)stored++;if(off+r.cs>=0xF0000000)throw{code:'limit'};
    const nm=enc.encode(path),[tm,dt]=dos(file.lastModified),ex=pw?le([2,0x9901,2,7,2,2,2,0x4541,1,3,2,r.method]):new Uint8Array(0);
    const m=pw?99:r.method,ver=pw?51:20,fl=(pw?1:0)|0x800,crc=pw?0:r.crc;
    parts.push(le([4,0x04034b50,2,ver,2,fl,2,m,2,tm,2,dt,4,crc,4,r.cs,4,r.size,2,nm.length,2,ex.length]),nm,ex,r.blob);
    cd.push(le([4,0x02014b50,2,ver,2,ver,2,fl,2,m,2,tm,2,dt,4,crc,4,r.cs,4,r.size,2,nm.length,2,ex.length,2,0,2,0,2,0,4,0,4,off]),nm,ex);
    off+=30+nm.length+ex.length+r.cs;n++}
  const cdSize=cd.reduce((a,b)=>a+b.length,0);
  const end=le([4,0x06054b50,2,0,2,0,2,files.length,2,files.length,4,cdSize,4,off,2,0]);
  return{blob:new Blob([...parts,...cd,end],{type:'application/zip'}),stored}}

/* ---------- 7. run ---------- */
let lastUi=0;
function tick(p){const now=performance.now();if(now-lastUi<80&&p.frac<1)return;lastUi=now;const pc=Math.min(100,Math.floor(p.frac*100));
  $('#pfill').style.width=pc+'%';$('#ppct').textContent=pc+'%';$('#pbar').setAttribute('aria-valuenow',pc);$('#pfile').textContent=p.path;$('#pcount').textContent=`${p.n} / ${p.total} files`;$('#pstage').textContent=$('#pwOn').checked?'Compressing & encrypting':'Compressing'}
async function run(){
  if(S.busy)return;const files=eff();if(!files.length)return showErr('none');
  const pw=$('#pwOn').checked?$('#pw').value:null;if(pw&&!(window.crypto&&crypto.subtle))return showErr('unsup');
  const name=zipName(),level=S.level,s=stats(files);S.busy=true;S.cancel=false;go('prog');tick({path:'–',n:0,total:files.length,frac:0});
  let res=null,err=null;
  try{res=await build(files,{level,pw,tick})}catch(e){err=e}
  S.busy=false;$('#pw').value=$('#pw2').value='';pwVis(false);meter(); /* password never kept */
  if(err){go('sum');if(!(err&&err.code==='cancel'))showErr(errKind(err));return}
  if(S.url)URL.revokeObjectURL(S.url);S.url=URL.createObjectURL(res.blob);
  S.result={blob:res.blob,name,orig:s.size,zip:res.blob.size,files:s.n,dirs:s.d,level,pw:!!pw,stored:res.stored};
  $('#pwOn').checked=false;$('#pwBox').hidden=true;renderDone();go('done');say('ZIP ready. '+name)}

/* ---------- init ---------- */
icons();applyTheme();syncSeg();matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
