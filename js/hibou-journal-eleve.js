/*
 * Maître Hibou V25.7.62 — Journal élève consolidé
 * Source unique pour le parcours, l'historique local, la file de synchronisation
 * et le chargement du dossier distant d'un élève.
 */
(function(){
  'use strict';
  if(window.__hibouStudentSystemV25761) return;
  window.__hibouStudentSystemV25761=true;

  var VERSION='V25.7.62';
  var LAST_PREFIX='hibou_journal_last_';
  var HISTORY_PREFIX='hibou_journal_history_';
  var SNAPSHOT_PREFIX='hibou_student_snapshot_';
  var QUEUE_KEY='hibou_journal_queue_v25713';
  var RECORD_QUEUE_KEY='hibou_records_calcul_queue_v25713';
  var CFG_URL='hibou_sync_api_url_v25754';
  var CFG_KEY='hibou_sync_device_key_v25754';
  var MAX_HISTORY=200;
  var LIVE_DEDUPE_MS=1800;
  var recent={};
  var inflight={};

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
  function cap(v){v=clean(v);return v?v.charAt(0).toUpperCase()+v.slice(1).toLowerCase():'';}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function get(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
  function set(k,v){try{localStorage.setItem(k,String(v));}catch(e){}}
  function read(k,f){try{var x=JSON.parse(get(k)||'null');return x==null?f:x;}catch(e){return f;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function device(){return /Android|iPad|Tablet|Mobile/i.test(navigator.userAgent||'')?'tablette':'pc';}
  function now(){return new Date().toISOString();}
  function formatDate(iso){var d=new Date(iso||Date.now());return isNaN(d)?'':d.toLocaleDateString('fr-FR');}
  function formatHour(iso){var d=new Date(iso||Date.now());return isNaN(d)?'':d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
  function currentName(){
    var c=[];
    try{c.push(window.prenomActuel);}catch(e){}
    try{c.push(typeof window.currentStudentName==='function'?window.currentStudentName():window.currentStudentName);}catch(e){}
    try{c.push(window.__hibouCurrentStudent);}catch(e){}
    try{var o=JSON.parse(get('hibou_current_student')||'{}');c.push(o.prenom||o.name);}catch(e){}
    ['hibou_prenom','hibou_last_prenom','elevePrenom','maitre_hibou_prenom','hibou_student_name'].forEach(function(k){c.push(get(k));});
    for(var i=0;i<c.length;i++){var n=clean(c[i]);if(n&&!/^(jo|eleve|élève|undefined|null|prenom|prénom)$/i.test(n))return cap(n);}
    return '';
  }
  function key(prefix,name){return prefix+norm(name);}
  function configured(){var u=clean(get(CFG_URL)),k=clean(get(CFG_KEY));return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u)&&k.length>=16;}
  function config(){return {url:clean(get(CFG_URL)),key:clean(get(CFG_KEY))};}

  function outcome(raw,score,total,type){
    var s=norm(raw.resultat||raw.outcome||raw.statut||raw.status);
    if(/erreur|echec|echoue|rate|incorrect|non_valide|a_reprendre/.test(s)) return 'erreur';
    if(/reussi|reussite|valide|acquis|correct|termine/.test(s)) return 'reussite';
    if(type==='ceinture_validee') return 'reussite';
    if(score!==''&&total!==''&&Number(total)>0){
      var ratio=Number(score)/Number(total);
      if(type.indexOf('entrainement')===0) return ratio>=0.7?'reussite':'erreur';
      return ratio>=0.75?'reussite':'erreur';
    }
    return 'trace';
  }
  function medal(score,total,v){
    var x=clean(v);if(/or|🥇/i.test(x))return 'Or';if(/argent|🥈/i.test(x))return 'Argent';if(/bronze|🥉/i.test(x))return 'Bronze';
    score=Number(score);total=Number(total)||20;if(!isFinite(score)||!total)return '';
    var scaled=total===20?score:Math.round(score/total*20);return scaled>=19?'Or':scaled>=17?'Argent':scaled>=15?'Bronze':'';
  }
  function normalizeType(v){
    var t=norm(v||'activite');
    var map={ceinture:'ceinture_validee',ceinture_francais_validee:'ceinture_validee',ceinture_maths_validee:'ceinture_validee',entrainement:'entrainement_termine',question:'question_posee',bilan:'bilan_termine'};
    return map[t]||t;
  }
  function eventId(e){return [norm(e.prenom),norm(e.type),norm(e.matiere),norm(e.titre),Date.now(),Math.random().toString(36).slice(2,8)].join('-');}
  function display(e){
    var icon=e.resultat==='erreur'?'❌':e.resultat==='reussite'?'✅':'🧭';
    var parts=[e.titre];if(e.detail)parts.push(e.detail);if(e.score!==''&&e.total!=='')parts.push(e.score+'/'+e.total);if(e.medaille)parts.push(e.medaille);
    return icon+' '+parts.filter(Boolean).join(' — ');
  }
  function normalizeEvent(raw){
    raw=raw||{};var name=cap(raw.prenom||raw.eleve||raw.name||raw.student||currentName());if(!name)return null;
    var type=normalizeType(raw.type||raw.kind);var score=raw.score==null||raw.score===''?'':Number(raw.score);var total=raw.total==null||raw.total===''?'':Number(raw.total);
    var iso=clean(raw.date_iso||raw.dateIso||raw.date)||now();var result=outcome(raw,score,total,type);
    var e={version:VERSION,id_evenement:clean(raw.id_evenement||raw.event_id||raw.id),date_iso:iso,date:formatDate(iso),heure:formatHour(iso),prenom:name,type:type,
      matiere:clean(raw.matiere||raw.subject),domaine:clean(raw.domaine||raw.domain),titre:clean(raw.titre||raw.title||raw.texte||raw.text||'Activité'),detail:clean(raw.detail||raw.details),
      score:score,total:total,temps_secondes:raw.temps_secondes==null||raw.temps_secondes===''?'':Math.max(0,Math.round(Number(raw.temps_secondes)||0)),
      resultat:result,medaille:medal(score,total,raw.medaille||raw.medal||raw.niveau),source:clean(raw.source||'maitre_hibou'),appareil:clean(raw.appareil||device())};
    e.id_evenement=e.id_evenement||eventId(e);e.affichage=clean(raw.affichage)||display(e);return e;
  }
  function sig(e){return [norm(e.prenom),norm(e.type),norm(e.matiere),norm(e.titre),norm(e.detail),e.score,e.total,e.resultat].join('|');}
  function valid(e){return !!(e&&e.prenom&&e.type&&e.titre&&e.date_iso);}
  function saveLocal(e){
    write(key(LAST_PREFIX,e.prenom),e);var h=read(key(HISTORY_PREFIX,e.prenom),[]);h.unshift(e);var seen={};
    h=h.filter(function(x){var id=clean(x&&x.id_evenement);if(!id||seen[id])return false;seen[id]=1;return true;}).sort(function(a,b){return String(b.date_iso).localeCompare(String(a.date_iso));}).slice(0,MAX_HISTORY);
    write(key(HISTORY_PREFIX,e.prenom),h);
  }
  function enqueue(k,e,max){var q=read(k,[]);if(!q.some(function(x){return x.id_evenement===e.id_evenement;}))q.push(e);write(k,q.slice(-(max||500)));}
  function track(raw){
    var e=normalizeEvent(raw);if(!valid(e))return null;var s=sig(e),n=Date.now();if(recent[s]&&n-recent[s]<LIVE_DEDUPE_MS)return e;recent[s]=n;
    saveLocal(e);enqueue(QUEUE_KEY,e,500);if(e.type==='entrainement_termine'&&norm(e.matiere)==='maths'&&e.temps_secondes)enqueue(RECORD_QUEUE_KEY,e,200);
    renderRecent(e.prenom);dispatch('hibou:student-event',{event:e,student:e.prenom});try{if(typeof window.hibouScheduleSync==='function')window.hibouScheduleSync();}catch(err){}
    return e;
  }
  function getHistory(name){name=cap(name||currentName());return name?read(key(HISTORY_PREFIX,name),[]):[];}
  function getLast(name){var h=getHistory(name);return h[0]||null;}
  function mergeRemote(name,rows){
    name=cap(name||currentName());var h=getHistory(name),all=h.concat((rows||[]).map(function(r){return normalizeEvent({id_evenement:r.event_id,date_iso:r.date,prenom:r.prenom||name,type:r.type,
      titre:r.texte||r.activite||'Activité',detail:r.resultat||'',score:r.score,total:r.total,temps_secondes:r.temps_secondes,medaille:r.medaille,source:r.source,matiere:r.matiere,domaine:r.activite,resultat:r.resultat});}).filter(Boolean));
    var seen={};all=all.filter(function(x){var id=x.id_evenement||sig(x);if(seen[id])return false;seen[id]=1;return true;}).sort(function(a,b){return String(b.date_iso).localeCompare(String(a.date_iso));}).slice(0,MAX_HISTORY);
    write(key(HISTORY_PREFIX,name),all);if(all[0])write(key(LAST_PREFIX,name),all[0]);return all;
  }
  function dispatch(type,detail){try{document.dispatchEvent(new CustomEvent(type,{detail:detail}));}catch(e){}}
  function icon(e){if(!e)return'🧭';if(e.resultat==='erreur')return'❌';if(e.type==='ceinture_validee')return'🏅';if(/question/.test(e.type))return'💬';if(/entrainement|record/.test(e.type))return'🧮';return e.resultat==='reussite'?'✅':'⭐';}
  function renderRecent(name){
    var card=document.getElementById('bandeauLastCard');if(!card)return;var e=getLast(name),text=e?e.affichage:'Ta prochaine activité apparaîtra ici.';
    card.innerHTML='<span class="bandeau-info-icon">'+icon(e)+'</span><span class="bandeau-info-text"><span class="bandeau-info-label">Mon parcours récent</span><span id="bandeauLastText">'+esc(text)+'</span></span>';
    card.classList.add('mh-journal-eleve');card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('title','Voir mon historique complet');
  }
  function jsonp(params){return new Promise(function(resolve,reject){if(!configured())return reject(new Error('API non configurée'));var c=config(),cb='__hibouSnap_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script'),done=false;
    var timer=setTimeout(function(){finish(false,new Error('Délai dépassé'));},15000);function finish(ok,v){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){}if(s.parentNode)s.parentNode.removeChild(s);ok?resolve(v):reject(v);}window[cb]=function(d){if(d&&d.ok===false)finish(false,new Error(d.error||d.code));else finish(true,d);};s.onerror=function(){finish(false,new Error('Connexion impossible'));};
    params=params||{};params.device_key=c.key;params.tablet_key=c.key;params.callback=cb;params._=Date.now();s.src=c.url+'?'+Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');document.head.appendChild(s);});}
  function loadSnapshot(name,force){
    name=cap(name||currentName());if(!name)return Promise.resolve(null);var nk=norm(name);if(inflight[nk])return inflight[nk];var cached=read(key(SNAPSHOT_PREFIX,name),null);if(cached&&!force&&Date.now()-Date.parse(cached.loaded_at||0)<60000){mergeRemote(name,cached.reussites||[]);renderRecent(name);return Promise.resolve(cached);}
    inflight[nk]=jsonp({action:'student_snapshot',prenom:name,limit:300}).then(function(d){var snap=d&&d.snapshot?d.snapshot:d;snap=snap||{};snap.loaded_at=now();write(key(SNAPSHOT_PREFIX,name),snap);mergeRemote(name,snap.reussites||[]);renderRecent(name);dispatch('hibou:student-snapshot',{student:name,snapshot:snap});return snap;}).catch(function(err){console.warn('V25.7.62 snapshot',err);return cached;}).finally(function(){delete inflight[nk];});return inflight[nk];
  }
  function recordSuccess(text,type,meta){meta=meta||{};return track(Object.assign({},meta,{type:type||meta.type||'activite_terminee',titre:text||meta.titre,resultat:meta.resultat||'reussite'}));}
  function recordError(text,type,meta){meta=meta||{};return track(Object.assign({},meta,{type:type||meta.type||'activite_terminee',titre:text||meta.titre,resultat:'erreur'}));}
  function refreshStudent(force){var n=currentName();renderRecent(n);return loadSnapshot(n,!!force);}

  window.hibouTrackEvent=track;window.hibouTrackSuccess=recordSuccess;window.hibouTrackError=recordError;window.recordMaitreHibouSuccess=recordSuccess;
  window.hibouGetEventHistory=getHistory;window.hibouGetLastEvent=getLast;window.hibouLoadStudentSnapshot=loadSnapshot;window.hibouRefreshStudent=refreshStudent;
  window.hibouStudentSystem={version:VERSION,track:track,success:recordSuccess,error:recordError,currentName:currentName,getHistory:getHistory,getLast:getLast,loadSnapshot:loadSnapshot,refresh:refreshStudent,configured:configured,config:config};

  function boot(){renderRecent();setTimeout(function(){refreshStudent(false);},500);setTimeout(function(){refreshStudent(false);},1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  document.addEventListener('hibou:student-changed',function(){setTimeout(function(){refreshStudent(true);},80);});
  window.addEventListener('storage',function(e){if(e.key&&(/hibou_current_student|hibou_prenom|elevePrenom/.test(e.key)))setTimeout(function(){refreshStudent(true);},50);});
})();
