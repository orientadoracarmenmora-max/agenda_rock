(()=>{'use strict';
const bar=document.createElement('div');bar.className='agenda-install';bar.innerHTML='<span id="agenda-save">Preparando guardado…</span><span id="agenda-offline"></span><button id="agenda-install" type="button" aria-controls="agenda-install-help" aria-expanded="false">Instalar</button><span id="agenda-install-help" role="status" hidden style="flex-basis:100%;text-align:center"></span><button id="agenda-update" type="button" hidden>Actualizar</button>';document.querySelector('.switcher').after(bar);
const label=bar.querySelector('#agenda-save'),off=bar.querySelector('#agenda-offline');let db,ready=false,last='',promptEvent=null;
const scope=location.pathname.replace(/index\.html$/,'');const key='carmen-agenda-copia:'+scope;
function calendar(){return document.getElementById('calendar').contentWindow}
function snapshot(){const w=calendar();w.calendarStore.save();const months={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^carmen-recursos-conectados-v3-\d{4}-\d{1,2}$/.test(k)){try{months[k]=JSON.parse(localStorage.getItem(k))}catch{}}}Object.assign(months,w.calendarStore.snapshot());return {format:'orientadora-carmen-mora-recursos-conectados',version:1,calendar:{selectedMonth:+w.document.getElementById('month').value,selectedYear:+w.document.getElementById('year').value,months},planner:plannerStore.snapshot(),diary:diaryStore.snapshot()}}
function write(value){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value,'workspace');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function save(){if(!ready)return;try{const value=snapshot(),json=JSON.stringify(value);if(json===last)return;localStorage.setItem(key,json);await write(value);last=json;label.textContent='Guardado en este dispositivo'}catch(e){label.textContent='Usa Guardar para conservar una copia';console.error('Agenda autosave',e)}}
function currentDate(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
async function init(){if(!window.plannerStore||!window.diaryStore||!calendar()?.calendarStore){setTimeout(init,100);return}try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open('carmen-agenda:'+scope,1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const stored=await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});let value;try{value=JSON.parse(localStorage.getItem(key))||stored}catch{value=stored}if(value){plannerStore.validate(value.planner);diaryStore.validate(value.diary);const w=calendar();w.calendarStore.replaceAll(value.calendar.months);plannerStore.restore(value.planner);diaryStore.restore({...value.diary,date:currentDate()})}plannerStore.focusDate(currentDate());ready=true;label.textContent='Guardado en este dispositivo';await save();setInterval(save,1200);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});window.addEventListener('pagehide',()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(snapshot()))}catch{}})}catch(e){label.textContent='Usa Guardar para conservar una copia';console.error(e)}}
const installButton=bar.querySelector('#agenda-install');
const installHelp=bar.querySelector('#agenda-install-help');
const standalone=matchMedia('(display-mode: standalone)');
let installed=standalone.matches||navigator.standalone===true;
function setInstallHelp(message){
  installHelp.textContent=message;
  installHelp.hidden=!message;
  installButton.setAttribute('aria-expanded',String(Boolean(message)));
}
function refreshInstall(){
  installButton.hidden=installed||standalone.matches||navigator.standalone===true;
  if(installButton.hidden)setInstallHelp('');
}
function installInstructions(){
  const ua=navigator.userAgent;
  if(/iPhone|iPad|iPod/.test(ua)||(ua.includes('Macintosh')&&navigator.maxTouchPoints>1))return 'En Safari, toca Compartir (el cuadrado con la flecha hacia arriba). Elige «Añadir a pantalla de inicio», activa «Abrir como app web» si aparece y toca «Añadir». En iPad, busca la opción en «Ver más» si hace falta.';
  if(ua.includes('Edg/'))return 'Haz clic en los tres puntos ⋯ de la esquina superior derecha de Edge. Elige «Más herramientas», luego «Aplicaciones» y «Instalar este sitio como una aplicación».';
  if(ua.includes('Macintosh')&&ua.includes('Safari')&&!/Chrome|Chromium|CriOS|Firefox|FxiOS|OPR/.test(ua))return 'En la barra de menús del Mac, arriba de la pantalla, abre «Archivo» y selecciona «Añadir al Dock».';
  if(ua.includes('Android'))return 'En Chrome, toca los tres puntos ⋮ junto a la barra de direcciones. Elige «Instalar y crear acceso directo» o «Añadir a pantalla de inicio» y toca «Instalar» si aparece.';
  if(/Chrome|Chromium/.test(ua))return 'Haz clic en los tres puntos ⋮ de la esquina superior derecha de la ventana de Chrome, al lado de la barra de direcciones. En el menú, selecciona «Enviar, guardar y compartir» y luego «Instalar página como aplicación». Si en su lugar ves «Abrir en…», pulsa esa opción para abrir la agenda que ya está instalada.';
  return 'Abre esta agenda en Chrome, Edge o Safari y usa la opción de instalar del navegador.';
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  if(!installed){promptEvent=event;setInstallHelp('');}
});
window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;refreshInstall()});
standalone.addEventListener('change',refreshInstall);
installButton.onclick=async()=>{
  if(!promptEvent){setInstallHelp(installHelp.hidden?installInstructions():'');return;}
  const event=promptEvent;
  promptEvent=null;
  setInstallHelp('');
  installButton.disabled=true;
  try{await event.prompt();}catch{setInstallHelp(installInstructions());}
  finally{installButton.disabled=false;}
};
refreshInstall();
init();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').then(async reg=>{await navigator.serviceWorker.ready;off.textContent='Sin conexión disponible';const update=()=>{if(reg.waiting){const b=bar.querySelector('#agenda-update');b.hidden=false;b.onclick=async()=>{await save();navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});reg.waiting.postMessage('ACTIVATE')}}};update();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',update))}).catch(()=>off.textContent='Sin conexión aún no disponible')}else off.textContent='Publica la agenda para instalarla';
})();
