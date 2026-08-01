/* Maître Hibou V25.7.60 — synchronisation avec accusé de réception */
(function(){
  'use strict';
  if(window.__hibouSyncV25754) return;
  window.__hibouSyncV25754 = true;

  var VERSION = 'V25.7.60';
  var CFG_URL = 'hibou_sync_api_url_v25754';
  var CFG_KEY = 'hibou_sync_device_key_v25754';
  var LAST_SYNC = 'hibou_sync_last_success_v25754';
  var LAST_ROSTER = 'hibou_sync_last_roster_v25754';
  var LAST_ERROR = 'hibou_sync_last_error_v25754';
  var ARCHIVE = 'hibou_sync_sent_archive_v25754';
  var QUEUE_EVENTS = 'hibou_journal_queue_v25713';
  var QUEUE_RECORDS = 'hibou_records_calcul_queue_v25713';
  var BATCH_SIZE = 25;
  var AUTO_DELAY_MS = 30000;
  var STARTUP_DELAY_MS = 60000;
  var ROSTER_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  var busy = false;
  var timer = null;
  var failures = 0;

  function get(k){ try{return localStorage.getItem(k)||'';}catch(e){return '';} }
  function set(k,v){ try{localStorage.setItem(k,String(v));}catch(e){} }
  function read(k,fallback){ try{var x=JSON.parse(get(k)||'null');return x==null?fallback:x;}catch(e){return fallback;} }
  function write(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function clean(v){ return String(v==null?'':v).trim(); }
  function config(){ return {url:clean(get(CFG_URL)), key:clean(get(CFG_KEY))}; }
  function configured(){ var c=config(); return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(c.url) && c.key.length>=16; }
  function queues(){ return {events:read(QUEUE_EVENTS,[]), records:read(QUEUE_RECORDS,[])}; }
  function status(){
    var q=queues();
    return {version:VERSION, configured:configured(), syncing:busy, queuedEvents:q.events.length, queuedRecords:q.records.length,
      lastSync:get(LAST_SYNC), lastRoster:get(LAST_ROSTER), lastError:get(LAST_ERROR)};
  }
  function device(){ return /Android|iPad|Tablet|Mobile/i.test(navigator.userAgent||'')?'tablette':'pc'; }
  function eventToParcours(e){
    return {event_id:e.id_evenement||e.event_id||'',date:e.date_iso||e.date||new Date().toISOString(),prenom:e.prenom||'',type:e.type||'activite',
      texte:e.affichage||e.titre||e.texte||'',score:e.score==null?'':e.score,total:e.total==null?'':e.total,temps_secondes:e.temps_secondes||'',
      appareil:e.appareil||device(),source:e.source||'maitre_hibou_v25_7_54',matiere:e.matiere||e.domaine||'',activite:e.titre||e.domaine||'',
      resultat:e.detail||'',medaille:e.niveau||'',version:VERSION,synchronise:'oui'};
  }
  function eventToRecord(e){
    return {prenom:e.prenom||'',ceinture:e.domaine||e.titre||'Maths',score:e.score||0,total:e.total||10,
      temps_secondes:e.temps_secondes||0,temps_moyen:e.total?Math.round((Number(e.temps_secondes||0)/Number(e.total||1))*100)/100:0,
      date:e.date_iso||new Date().toISOString(),appareil:e.appareil||device()};
  }
  function archive(batch){
    var rows=read(ARCHIVE,[]); rows.push({sent_at:new Date().toISOString(),events:batch.events.length,records:batch.records.length});
    write(ARCHIVE,rows.slice(-50));
  }
  function nextDelay(){ return Math.min(15*60*1000, AUTO_DELAY_MS*Math.pow(2,Math.min(failures,5))); }
  function schedule(delay){ clearTimeout(timer); timer=setTimeout(function(){syncNow(false);}, delay==null?AUTO_DELAY_MS:delay); }

  function makeBatchId(){
    return 'hibou-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
  }
  function itemKey(item){
    return clean(item&&(item.id_evenement||item.event_id||item.id)) || JSON.stringify(item||{});
  }
  function removeConfirmedItems(queueKey, sentItems){
    var counts={};
    sentItems.forEach(function(item){var k=itemKey(item);counts[k]=(counts[k]||0)+1;});
    var current=read(queueKey,[]);
    var kept=current.filter(function(item){
      var k=itemKey(item);
      if(counts[k]>0){counts[k]--;return false;}
      return true;
    });
    write(queueKey,kept);
  }
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
  async function waitForBatchConfirmation(c,batchId){
    var last=null;
    for(var attempt=0;attempt<10;attempt++){
      if(attempt) await sleep(Math.min(3500,900+attempt*350));
      try{
        var url=c.url+'?action=batch_status&device_key='+encodeURIComponent(c.key)+'&batch_id='+encodeURIComponent(batchId);
        last=await jsonp(url);
        if(last&&last.status==='confirmed') return last;
        if(last&&last.status==='failed') throw new Error(last.error||'Le serveur a refusé le lot.');
      }catch(err){
        if(attempt===9) throw err;
      }
    }
    throw new Error('Aucune confirmation reçue pour le lot '+batchId+'. Les données sont conservées localement.');
  }

  async function syncNow(manual){
    if(busy) return {ok:false,error:'Synchronisation déjà en cours.'};
    if(!configured()){
      if(manual) openSettings();
      return {ok:false,error:'Configuration absente.'};
    }
    var q=queues();
    if(!q.events.length && !q.records.length){
      set(LAST_ERROR,''); updateButtons();
      if(manual) alert('Aucune trace locale en attente.');
      return {ok:true,empty:true};
    }
    busy=true; updateButtons();
    var c=config();
    var ev=q.events.slice(0,BATCH_SIZE), rec=q.records.slice(0,BATCH_SIZE);
    var batchId=makeBatchId();
    var payload={device_key:c.key,batch_id:batchId,source:'maitre_hibou_v25_7_60',version:VERSION,appareil:device(),
      parcours_eleves:ev.map(eventToParcours),records_calcul:rec.map(eventToRecord)};
    try{
      await fetch(c.url,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
      var ack=await waitForBatchConfirmation(c,batchId);
      removeConfirmedItems(QUEUE_EVENTS,ev);
      removeConfirmedItems(QUEUE_RECORDS,rec);
      archive({events:ev,records:rec,batch_id:batchId,ack:ack});
      set(LAST_SYNC,new Date().toISOString()); set(LAST_ERROR,''); failures=0;
      busy=false; updateButtons();
      var remain=queues();
      if(manual) alert('Synchronisation confirmée : '+ev.length+' parcours et '+rec.length+' record(s). Restent '+remain.events.length+' parcours et '+remain.records.length+' record(s).');
      if(remain.events.length||remain.records.length) schedule(AUTO_DELAY_MS); else schedule(5*60*1000);
      return {ok:true,confirmed:true,batch_id:batchId,events:ev.length,records:rec.length};
    }catch(err){
      failures++; set(LAST_ERROR,String(err&&err.message||err)); busy=false; updateButtons(); schedule(nextDelay());
      if(manual) alert('Synchronisation non confirmée. Les données restent sur la tablette.\n'+String(err&&err.message||err));
      return {ok:false,error:String(err&&err.message||err),batch_id:batchId};
    }
  }

  function jsonp(url){
    return new Promise(function(resolve,reject){
      var cb='__hibouRoster_'+Date.now()+'_'+Math.floor(Math.random()*100000), script=document.createElement('script'), done=false;
      var timer=setTimeout(function(){finish(false,new Error('Délai dépassé'));},12000);
      function finish(ok,v){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){};if(script.parentNode)script.parentNode.removeChild(script);ok?resolve(v):reject(v);}
      window[cb]=function(data){finish(!!(data&&data.ok!==false),data);}; script.onerror=function(){finish(false,new Error('Erreur réseau'));};
      script.src=url+(url.indexOf('?')>=0?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now(); document.head.appendChild(script);
    });
  }
  async function refreshRoster(manual){
    if(!configured()){ if(manual) openSettings(); return false; }
    var c=config();
    try{
      var url=c.url+'?action=eleves&device_key='+encodeURIComponent(c.key);
      var data=await jsonp(url);
      var rows=Array.isArray(data)?data:(Array.isArray(data.eleves)?data.eleves:[]);
      var roster=rows.map(function(r){return typeof r==='string'?r:clean(r.prenom||r.name);}).filter(Boolean);
      write('hibou_roster',roster); set(LAST_ROSTER,new Date().toISOString()); set(LAST_ERROR,'');
      try{window.dispatchEvent(new CustomEvent('hibou:roster-updated',{detail:{roster:roster}}));}catch(e){}
      if(manual) alert('Liste des élèves actualisée : '+roster.length+' élève(s).');
      updateButtons(); return true;
    }catch(err){set(LAST_ERROR,String(err&&err.message||err));updateButtons();if(manual)alert('Actualisation impossible : '+String(err&&err.message||err));return false;}
  }
  function maybeRefreshRoster(){ var last=Date.parse(get(LAST_ROSTER)||''); if(!last||Date.now()-last>ROSTER_MAX_AGE_MS) refreshRoster(false); }

  function openSettings(){
    var c=config();
    var url=prompt('URL de la nouvelle API Apps Script (se termine par /exec) :',c.url||''); if(url===null)return;
    var key=prompt('Clé tablette TABLET_DEVICE_KEY :',c.key||''); if(key===null)return;
    url=clean(url); key=clean(key);
    if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)){alert('URL invalide : elle doit être une URL Apps Script terminée par /exec.');return;}
    if(key.length<16){alert('Clé tablette trop courte.');return;}
    set(CFG_URL,url);set(CFG_KEY,key);set(LAST_ERROR,'');updateButtons();alert('Configuration enregistrée uniquement sur cet appareil.');
    refreshRoster(true);
  }

  function fmt(iso){ if(!iso)return 'jamais'; var d=new Date(iso); return isNaN(d)?'jamais':d.toLocaleString('fr-FR'); }
  function updateButtons(){
    var s=status();
    document.querySelectorAll('[data-hibou-sync-status]').forEach(function(el){el.textContent=(s.syncing?'Synchronisation…':'☁️ Synchroniser maintenant')+' ('+(s.queuedEvents+s.queuedRecords)+' en attente)';});
    document.querySelectorAll('[data-hibou-sync-info]').forEach(function(el){el.textContent='Dernier envoi confirmé : '+fmt(s.lastSync)+' · Élèves : '+fmt(s.lastRoster)+(s.lastError?' · Erreur : '+s.lastError:'');});
  }
  function injectTeacherButtons(){
    var actions=document.querySelector('.teacher-fullscreen-actions'); if(!actions)return;
    Array.from(actions.querySelectorAll('button')).forEach(function(b){if((b.textContent||'').toLowerCase().includes('synchroniser google sheets'))b.remove();});
    if(!actions.querySelector('[data-hibou-sync-status]')){
      var b=document.createElement('button');b.className='teacher-btn';b.dataset.hibouSyncStatus='1';b.onclick=function(){syncNow(true);};actions.appendChild(b);
      var r=document.createElement('button');r.className='teacher-btn';r.textContent='👥 Actualiser les élèves';r.onclick=function(){refreshRoster(true);};actions.appendChild(r);
      var c=document.createElement('button');c.className='teacher-btn';c.textContent='⚙️ Configurer la synchronisation';c.onclick=openSettings;actions.appendChild(c);
      var info=document.createElement('span');info.dataset.hibouSyncInfo='1';info.style.cssText='display:block;width:100%;font-size:12px;opacity:.8;margin-top:6px';actions.appendChild(info);
    }
    updateButtons();
  }

  window.hibouSyncNow=syncNow; window.hibouRefreshRoster=refreshRoster; window.hibouOpenSyncSettings=openSettings; window.hibouSyncStatus=status;
  window.syncMaitreHibouToGoogleSheets=function(){return syncNow(true);};
  document.addEventListener('DOMContentLoaded',function(){injectTeacherButtons();setTimeout(injectTeacherButtons,1200);setTimeout(function(){if(configured()){maybeRefreshRoster();schedule(STARTUP_DELAY_MS);}},1500);});
  window.addEventListener('load',function(){setTimeout(injectTeacherButtons,500);});
  setInterval(updateButtons,10000);
})();
