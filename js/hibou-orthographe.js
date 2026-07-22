/* Maître Hibou V25.7.66 — Orthographe / dictée modulaire en JSON
   Bandeau compact tablette + exercices fondés sur le guide ministériel CE1,
   adaptés à l'entraînement CE2. Contenu séparé dans data/orthographe_dictee.json.
*/
(function(){
  'use strict';
  if(window.__hibouOrthographeV25730) return;
  window.__hibouOrthographeV25730 = true;

  var DATA_URL = 'data/orthographe_dictee.json?v=25730';
  var CACHE_KEY = 'hibou_orthographe_dictee_json_v25730';
  var state = { data:null, activity:null, questions:[], index:0, score:0, total:0, answers:[], segmentIndex:0, item:null };

  function $(id){ return document.getElementById(id); }
  function popupInner(){ return $('frenchPopupInnerV2348'); }
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function norm(v){ return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }
  function shuffle(a){ var out=(a||[]).slice(); for(var i=out.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=out[i]; out[i]=out[j]; out[j]=t; } return out; }
  function setInner(html){ var el=popupInner(); if(el) el.innerHTML=html; }

  function activityLabel(type){
    return type==='mot_correct'?'Choisis le mot bien écrit':
      type==='erreur'?'Corrige l’erreur':
      type==='dictee_segmentee'?'Dictée segmentée':'Orthographe';
  }

  function setOrthoTopbar(activity, showReturn){
    var chip=document.querySelector('#frenchTrainingOverlayV2348 .fr-v2348-chip');
    if(!chip) return;
    chip.classList.add('ortho-v25730-topbar-chip');
    var label=activity ? activityLabel(activity) : '';
    chip.innerHTML='<span class="ortho-v25730-topbar-title">📖 Français <b>—</b> 🔤 Orthographe'+(label?' <b>—</b> '+esc(label):'')+'</span>'+
      (showReturn?'<button type="button" class="ortho-v25730-topbar-return" onclick="openHibouOrthographeV25730()">← Retour Orthographe</button>':'');
  }

  function resetFrenchTopbar(){
    var chip=document.querySelector('#frenchTrainingOverlayV2348 .fr-v2348-chip');
    if(!chip) return;
    chip.classList.remove('ortho-v25730-topbar-chip');
    chip.textContent='📖 Français';
  }

  function header(title, subtitle, note){
    return '<div class="fr-v2348-header"><div class="fr-v2348-owl">🦉</div><div class="fr-v2348-title"><h2>'+esc(title||'🔤 Orthographe')+'</h2><p>'+esc(subtitle||'Choisis un entraînement.')+'</p><div class="fr-v23411-grammar-note">'+esc(note||'Les exercices sont chargés depuis un fichier JSON externe.')+'</div></div></div>';
  }

  function injectStyle(){
    if($('hibouOrthographeV25730Style')) return;
    var css = ''+
    '.ortho-v25730-menu{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:12px}'+
    '.ortho-v25730-card{border:2px solid #bbf7d0;background:linear-gradient(135deg,#f0fdf4,#fff);border-radius:22px;padding:18px 14px;text-align:center;font-family:inherit;font-weight:900;color:#14532d;cursor:pointer;box-shadow:0 8px 24px rgba(22,163,74,.12)}'+
    '.ortho-v25730-card:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(22,163,74,.16)}'+
    '.ortho-v25730-icon{font-size:42px;margin-bottom:8px}.ortho-v25730-title{font-size:20px;color:#0f5132}.ortho-v25730-desc{font-size:13px;color:#287047;margin-top:5px;line-height:1.25}'+
    '.ortho-v25730-box{background:#fff;border:2px solid #d9f99d;border-radius:18px;padding:16px;margin-top:8px}'+
    '.ortho-v25730-question{background:#f7fee7;border:2px solid #bef264;border-radius:16px;padding:14px;font-size:20px;font-weight:1000;color:#1f3d0c;margin:8px 0;line-height:1.3}'+
    '.ortho-v25730-options{display:flex;flex-direction:column;gap:9px;margin-top:10px}.ortho-v25730-option{border:2px solid #e5e7eb;background:#fff;border-radius:14px;padding:12px 14px;text-align:left;font-size:17px;font-weight:900;color:#172554;font-family:inherit;cursor:pointer}'+
    '.ortho-v25730-option.correct{background:#dcfce7!important;border-color:#22c55e!important;color:#14532d!important}.ortho-v25730-option.wrong{background:#fee2e2!important;border-color:#ef4444!important;color:#7f1d1d!important}'+
    '.ortho-v25730-feedback{margin-top:12px;border-radius:14px;padding:12px;font-weight:900;text-align:center}.ortho-v25730-feedback.ok{background:#dcfce7;color:#14532d;border:2px solid #86efac}.ortho-v25730-feedback.warn{background:#fff7ed;color:#7c2d12;border:2px solid #fdba74}'+
    '.ortho-v25730-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.ortho-v25730-btn{border:0;border-radius:14px;background:#16a34a;color:#fff;padding:11px 14px;font-weight:1000;font-family:inherit;cursor:pointer}.ortho-v25730-btn.secondary{background:#fff;color:#166534;border:2px solid #bbf7d0}'+
    '.ortho-v25730-input{width:100%;border:3px solid #bbf7d0;border-radius:16px;padding:13px 14px;font-size:20px;font-weight:900;color:#172554;outline:none}.ortho-v25730-input:focus{box-shadow:0 0 0 4px rgba(34,197,94,.16)}'+
    '.ortho-v25730-model{font-size:15px;color:#64748b;font-weight:850;margin:8px 0}.ortho-v25730-progress{font-size:15px;font-weight:900;color:#166534;margin-bottom:8px}'+
    '#frenchTrainingOverlayV2348 .fr-v2348-chip.ortho-v25730-topbar-chip{flex:1;max-width:none;background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;display:flex;align-items:center;justify-content:space-between;gap:14px;color:#fff!important;font-weight:1000}'+
    '.ortho-v25730-topbar-title{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ortho-v25730-topbar-title b{opacity:.78;margin:0 4px}.ortho-v25730-topbar-return{border:2px solid rgba(255,255,255,.8);background:rgba(255,255,255,.18);color:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:14px;font-weight:1000;cursor:pointer;white-space:nowrap}.ortho-v25730-topbar-return:hover{background:rgba(255,255,255,.28)}'+
    '@media(max-width:820px){.ortho-v25730-topbar-title{font-size:15px}.ortho-v25730-topbar-return{font-size:12px;padding:6px 9px}.ortho-v25730-menu{grid-template-columns:1fr}.ortho-v25730-card{padding:14px}.ortho-v25730-icon{font-size:34px}.ortho-v25730-box{padding:12px;margin-top:6px}.ortho-v25730-question{font-size:18px;margin:7px 0}.ortho-v25730-option{font-size:16px}}';
    var style=document.createElement('style'); style.id='hibouOrthographeV25730Style'; style.textContent=css; document.head.appendChild(style);
  }

  function loadData(force){
    if(state.data && !force) return Promise.resolve(state.data);
    if(!force){ try{ var cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(cached && cached.exercices){ state.data=cached; return Promise.resolve(cached); } }catch(e){} }
    return fetch(DATA_URL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('json '+r.status); return r.json(); }).then(function(data){ state.data=data||{exercices:[]}; try{ localStorage.setItem(CACHE_KEY,JSON.stringify(state.data)); }catch(e){} return state.data; }).catch(function(err){ console.warn('Orthographe JSON indisponible',err); return {exercices:[]}; });
  }

  function activeItems(type){
    var data=state.data||{exercices:[]};
    return (data.exercices||[]).filter(function(x){ return String(x.actif||'oui').toLowerCase()!=='non' && (!type || x.type===type); });
  }

  function patchDomainMenu(){
    var card=document.querySelector('#frenchTrainingOverlayV2348 .fr-v25720-domain-card.ortho');
    if(!card || card.__hibouOrthoPatched25730) return;
    card.__hibouOrthoPatched25730=true; card.disabled=false; card.removeAttribute('disabled'); card.removeAttribute('aria-disabled'); card.classList.remove('is-disabled');
    var soon=card.querySelector('.fr-v25720-domain-soon'); if(soon){ soon.className='fr-v25720-domain-arrow'; soon.textContent='›'; }
    card.onclick=function(ev){ ev.preventDefault(); window.openHibouOrthographeV25730(); };
  }

  function installMenuPatch(){
    function wrap(name){
      var fn=window[name]; if(typeof fn!=='function' || fn.__hibouOrthoWrapped25730) return;
      var wrapped=function(){ var r=fn.apply(this,arguments); setTimeout(patchDomainMenu,0); setTimeout(patchDomainMenu,80); return r; };
      wrapped.__hibouOrthoWrapped25730=true; window[name]=wrapped;
    }
    wrap('renderFrenchDomainMenuV25720');
    var frenchMenu=window.renderFrenchDomainMenuV25720;
    if(typeof frenchMenu==='function' && !frenchMenu.__orthoTopbarReset25730){
      var resetWrapped=function(){ resetFrenchTopbar(); return frenchMenu.apply(this,arguments); };
      resetWrapped.__hibouOrthoWrapped25730=true; resetWrapped.__orthoTopbarReset25730=true; window.renderFrenchDomainMenuV25720=resetWrapped;
    }
    wrap('openFrenchTrainingPopupV2348'); setTimeout(patchDomainMenu,0); setTimeout(patchDomainMenu,300);
  }

  function showLoading(){
    setOrthoTopbar('',false);
    setInner(header('🔤 Orthographe','Chargement des exercices.','Les exercices sont dans data/orthographe_dictee.json.')+'<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-feedback" style="padding:22px">🦉 Chargement rapide des exercices...</div></section></div>');
  }

  function renderMenu(){
    setOrthoTopbar('',false);
    var count=activeItems().length;
    setInner(header('🔤 Orthographe','Choisis un entraînement.','Banque externe : '+count+' exercice(s), adaptée au CE2 à partir du guide ministériel CE1.')+
      '<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-training-head"><button type="button" class="fr-v2348-back" onclick="renderFrenchDomainMenuV25720()">← Retour au menu Français</button><div class="fr-v2348-training-title">Orthographe</div><div></div></div>'+
      '<div class="ortho-v25730-menu">'+
      '<button class="ortho-v25730-card" type="button" onclick="startHibouOrthographeV25730(\'mot_correct\')"><div class="ortho-v25730-icon">👀</div><div class="ortho-v25730-title">Choisis le mot bien écrit</div><div class="ortho-v25730-desc">Observer, comparer et mémoriser l’orthographe des mots.</div></button>'+
      '<button class="ortho-v25730-card" type="button" onclick="startHibouOrthographeV25730(\'erreur\')"><div class="ortho-v25730-icon">🔎</div><div class="ortho-v25730-title">Corrige l’erreur</div><div class="ortho-v25730-desc">Identifier la difficulté et choisir une correction raisonnée.</div></button>'+
      '<button class="ortho-v25730-card" type="button" onclick="startHibouOrthographeV25730(\'dictee_segmentee\')"><div class="ortho-v25730-icon">✍️</div><div class="ortho-v25730-title">Dictée segmentée</div><div class="ortho-v25730-desc">Écrire une phrase par groupes de sens et vérifier chaque segment.</div></button>'+
      '</div></section></div>');
  }

  window.openHibouOrthographeV25730=function(){ injectStyle(); showLoading(); loadData(false).then(renderMenu); };

  window.startHibouOrthographeV25730=function(type){
    loadData(false).then(function(){
      if(type==='dictee_segmentee') return startSegmented();
      var items=shuffle(activeItems(type)).slice(0,10);
      state.activity=type; state.questions=items; state.index=0; state.score=0; state.total=items.length; state.answers=[];
      if(!items.length) return renderNoData(type); renderQcm();
    });
  };

  function renderNoData(type){
    setOrthoTopbar(type,true);
    setInner('<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="ortho-v25730-feedback warn">Aucun exercice disponible pour : '+esc(activityLabel(type))+'</div><div class="ortho-v25730-actions"><button class="ortho-v25730-btn secondary" onclick="openHibouOrthographeV25730()">← Retour Orthographe</button></div></section></div>');
  }

  function optionsFor(item){
    return shuffle([item.bonne_reponse,item.erreur_1,item.erreur_2,item.erreur_3].filter(function(x){return clean(x);})).map(function(x){return {text:x,ok:norm(x)===norm(item.bonne_reponse)};});
  }

  function renderQcm(){
    setOrthoTopbar(state.activity,true);
    var item=state.questions[state.index]; if(!item) return renderResult();
    var html=optionsFor(item).map(function(o){ return '<button type="button" class="ortho-v25730-option" data-ok="'+(o.ok?'1':'0')+'" onclick="answerHibouOrthographeV25730(this)">'+esc(o.text)+'</button>'; }).join('');
    setInner('<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="ortho-v25730-box"><div class="ortho-v25730-progress">Question '+(state.index+1)+' / '+state.total+'</div><div class="ortho-v25730-question">'+esc(item.question||item.consigne||'Choisis la bonne réponse.')+'</div><div class="ortho-v25730-options">'+html+'</div><div id="orthoFeedbackV25730"></div></div></section></div>');
  }

  window.answerHibouOrthographeV25730=function(btn){
    var item=state.questions[state.index]; if(!item) return;
    var buttons=[].slice.call(document.querySelectorAll('.ortho-v25730-option')); var ok=btn.getAttribute('data-ok')==='1';
    buttons.forEach(function(b){ b.disabled=true; if(b.getAttribute('data-ok')==='1') b.classList.add('correct'); });
    if(!ok) btn.classList.add('wrong'); else state.score++;
    state.answers.push({question:item.question,ok:ok,competence:item.competence||''});
    var fb=$('orthoFeedbackV25730'); var next=(state.index+1>=state.total)?'Voir le résultat':'Question suivante';
    if(fb) fb.innerHTML='<div class="ortho-v25730-feedback '+(ok?'ok':'warn')+'">'+(ok?'✅ Bravo !':'💡 Correction : '+esc(item.bonne_reponse||''))+(item.explication?'<br><small>'+esc(item.explication)+'</small>':'')+'</div><div class="ortho-v25730-actions"><button class="ortho-v25730-btn" onclick="nextHibouOrthographeQuestionV25730()">'+next+'</button></div>';
  };
  window.nextHibouOrthographeQuestionV25730=function(){ state.index++; if(state.index>=state.total) renderResult(); else renderQcm(); };

  function startSegmented(){
    var items=shuffle(activeItems('dictee_segmentee'));
    state.activity='dictee_segmentee'; state.item=items[0]||null; state.segmentIndex=0; state.score=0; state.answers=[];
    if(!state.item) return renderNoData('dictee_segmentee');
    state.questions=[state.item.segment_1,state.item.segment_2,state.item.segment_3,state.item.segment_4].filter(function(x){return clean(x);}); state.total=state.questions.length; renderSegment();
  }

  function renderSegment(){
    setOrthoTopbar('dictee_segmentee',true);
    var seg=state.questions[state.segmentIndex]; if(!seg) return renderResult();
    setInner('<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="ortho-v25730-box"><div class="ortho-v25730-progress">Segment '+(state.segmentIndex+1)+' / '+state.total+'</div><div class="ortho-v25730-model">Phrase à mémoriser : '+esc(state.item.question||'')+'</div><div class="ortho-v25730-question">'+esc(seg)+'</div><input id="orthoSegmentInputV25730" class="ortho-v25730-input" autocomplete="off" placeholder="Recopie le segment sans erreur"><div id="orthoFeedbackV25730"></div><div class="ortho-v25730-actions"><button class="ortho-v25730-btn" onclick="checkHibouSegmentV25730()">✅ Vérifier</button></div></div></section></div>');
    setTimeout(function(){ var inp=$('orthoSegmentInputV25730'); if(inp) inp.focus(); },50);
  }

  window.checkHibouSegmentV25730=function(){
    var inp=$('orthoSegmentInputV25730'); if(!inp || inp.disabled) return;
    var expected=state.questions[state.segmentIndex]||''; var ok=norm(inp.value)===norm(expected); if(ok) state.score++;
    state.answers.push({segment:expected,ok:ok}); inp.disabled=true;
    var fb=$('orthoFeedbackV25730'); var next=(state.segmentIndex+1>=state.total)?'Voir le résultat':'Segment suivant';
    if(fb) fb.innerHTML='<div class="ortho-v25730-feedback '+(ok?'ok':'warn')+'">'+(ok?'✅ Segment juste !':'💡 Segment attendu : <strong>'+esc(expected)+'</strong>')+'</div><div class="ortho-v25730-actions"><button class="ortho-v25730-btn" onclick="nextHibouSegmentV25730()">'+next+'</button></div>';
  };
  window.nextHibouSegmentV25730=function(){ state.segmentIndex++; if(state.segmentIndex>=state.total) renderResult(); else renderSegment(); };

  function renderResult(){
    setOrthoTopbar(state.activity,true);
    var total=state.total||state.questions.length||1; var pct=Math.round((state.score/total)*100); var label=activityLabel(state.activity);
    setInner(header('🔤 Orthographe','Entraînement terminé.','Le résultat est ajouté à Mon parcours récent.')+'<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-result"><h3>Bravo, entraînement terminé !</h3><div class="fr-v2348-score-grid"><div class="fr-v2348-score-card">Score<b>'+state.score+' / '+total+'</b></div><div class="fr-v2348-score-card">Réussite<b>'+pct+'%</b></div></div><div class="fr-v2348-feedback">'+esc(label)+' · Banque pédagogique externe</div><div class="fr-v2348-actions"><button type="button" class="fr-v2348-action" onclick="startHibouOrthographeV25730(\''+esc(state.activity)+'\')">🔁 Refaire</button><button type="button" class="fr-v2348-action secondary" onclick="openHibouOrthographeV25730()">← Retour Orthographe</button><button type="button" class="fr-v2348-action secondary" onclick="renderFrenchDomainMenuV25720()">Menu Français</button></div></div></section></div>');
    track(label,total,pct);
  }

  function track(label,total,pct){
    try{
      var detail=label+' — '+state.score+'/'+total+' ('+pct+' %)';
      if(typeof window.hibouTrackEvent==='function'){
        window.hibouTrackEvent({type:'entrainement_orthographe_termine',matiere:'Français',domaine:'Orthographe',titre:'Orthographe — '+label,detail:detail,score:state.score,total:total,source:'orthographe_guide_json'});
      }else if(typeof window.hibouRecordTrainingSuccess==='function'){
        window.hibouRecordTrainingSuccess('français','Orthographe',detail);
      }
    }catch(e){ console.warn('Mon parcours récent non mis à jour pour Orthographe',e); }
  }

  function boot(){ injectStyle(); installMenuPatch(); loadData(false); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0);
  window.addEventListener('load',function(){ setTimeout(installMenuPatch,200); });
})();
