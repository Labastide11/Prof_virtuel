/* Maître Hibou V25.7.66 — Vocabulaire modulaire en JSON
   Activités : familles de mots, synonymes, contraires, mots génériques.
   Contenu pédagogique séparé dans data/vocabulaire.json pour garder index.html léger.
*/
(function(){
  'use strict';
  if(window.__hibouVocabulaireV25729) return;
  window.__hibouVocabulaireV25729 = true;

  var DATA_URL = 'data/vocabulaire.json?v=25729';
  var CACHE_KEY = 'hibou_vocabulaire_json_v25729';
  var state = { data:null, activity:null, questions:[], index:0, score:0, total:0, answers:[], hintsUsed:0, hintsByQuestion:{} };

  function $(id){ return document.getElementById(id); }
  function popupInner(){ return $('frenchPopupInnerV2348'); }
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function norm(v){ return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }
  function shuffle(a){ var out=(a||[]).slice(); for(var i=out.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=out[i]; out[i]=out[j]; out[j]=t; } return out; }
  function setInner(html){ var el=popupInner(); if(el) el.innerHTML=html; }

  function setVocabTopbar(activity, showReturn){
    var chip=document.querySelector('#frenchTrainingOverlayV2348 .fr-v2348-chip');
    if(!chip) return;
    chip.classList.add('vocab-v25729-topbar-chip');
    var label=activity ? activityLabel(activity) : '';
    chip.innerHTML='<span class="vocab-v25729-topbar-title">📖 Français <b>—</b> 🧩 Vocabulaire'+(label?' <b>—</b> '+esc(label):'')+'</span>'+(showReturn?'<button type="button" class="vocab-v25729-topbar-return" onclick="openHibouVocabulaireV25729()">← Retour Vocabulaire</button>':'');
  }

  function resetFrenchTopbar(){
    var chip=document.querySelector('#frenchTrainingOverlayV2348 .fr-v2348-chip');
    if(!chip) return;
    chip.classList.remove('vocab-v25729-topbar-chip');
    chip.textContent='📖 Français';
  }

  function header(title, subtitle, note){
    return '<div class="fr-v2348-header"><div class="fr-v2348-owl">🦉</div><div class="fr-v2348-title"><h2>'+esc(title||'🧩 Vocabulaire')+'</h2><p>'+esc(subtitle||'Choisis un entraînement.')+'</p><div class="fr-v23411-grammar-note">'+esc(note||'Les exercices sont chargés depuis un fichier JSON externe pour garder la page légère et rapide.')+'</div></div></div>';
  }

  function injectStyle(){
    if($('hibouVocabulaireV25729Style')) return;
    var css = ''+
    '.vocab-v25729-menu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}'+
    '.vocab-v25729-card{border:2px solid #ddd6fe;background:linear-gradient(135deg,#faf5ff,#ffffff);border-radius:22px;padding:18px 14px;text-align:center;font-family:inherit;font-weight:900;color:#4c1d95;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.12)}'+
    '.vocab-v25729-card:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(124,58,237,.16)}'+
    '.vocab-v25729-icon{font-size:42px;margin-bottom:8px}.vocab-v25729-title{font-size:20px;color:#4c1d95}.vocab-v25729-desc{font-size:13px;color:#6d28d9;margin-top:5px;line-height:1.25}'+
    '.vocab-v25729-box{background:#fff;border:2px solid #e9d5ff;border-radius:18px;padding:16px;margin-top:12px}'+
    '.vocab-v25729-question{background:#faf5ff;border:2px solid #ddd6fe;border-radius:16px;padding:14px;font-size:20px;font-weight:1000;color:#2e1065;margin:10px 0;line-height:1.3}'+
    '.vocab-v25729-options{display:flex;flex-direction:column;gap:9px;margin-top:10px}.vocab-v25729-option{border:2px solid #e5e7eb;background:#fff;border-radius:14px;padding:12px 14px;text-align:left;font-size:17px;font-weight:900;color:#172554;font-family:inherit;cursor:pointer}'+
    '.vocab-v25729-option.correct{background:#dcfce7!important;border-color:#22c55e!important;color:#14532d!important}.vocab-v25729-option.wrong{background:#fee2e2!important;border-color:#ef4444!important;color:#7f1d1d!important}'+
    '.vocab-v25729-feedback{margin-top:12px;border-radius:14px;padding:12px;font-weight:900;text-align:center}.vocab-v25729-feedback.ok{background:#dcfce7;color:#14532d;border:2px solid #86efac}.vocab-v25729-feedback.warn{background:#fff7ed;color:#7c2d12;border:2px solid #fdba74}'+
    '.vocab-v25729-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.vocab-v25729-btn{border:0;border-radius:14px;background:#7c3aed;color:#fff;padding:11px 14px;font-weight:1000;font-family:inherit;cursor:pointer}.vocab-v25729-btn.secondary{background:#fff;color:#5b21b6;border:2px solid #ddd6fe}'+
    '.vocab-v25729-progress{font-size:13px;text-transform:uppercase;font-weight:1000;color:#6d28d9;margin-bottom:8px}'+
    '#frenchTrainingOverlayV2348 .fr-v2348-chip.vocab-v25729-topbar-chip{flex:1;max-width:none;background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;display:flex;align-items:center;justify-content:space-between;gap:14px;color:#fff!important;font-weight:1000}'+
    '.vocab-v25729-topbar-title{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vocab-v25729-topbar-title b{opacity:.78;margin:0 4px}.vocab-v25729-topbar-return{border:2px solid rgba(255,255,255,.8);background:rgba(255,255,255,.18);color:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:14px;font-weight:1000;cursor:pointer;white-space:nowrap}.vocab-v25729-topbar-return:hover{background:rgba(255,255,255,.28)}'+
    '.vocab-v25729-hint-row{margin:10px 0 4px;display:flex;justify-content:center}.vocab-v25729-hint-btn{border:2px dashed #c4b5fd;background:#fff;color:#5b21b6;border-radius:999px;padding:8px 12px;font-weight:1000;font-family:inherit;cursor:pointer}.vocab-v25729-hint-box{display:none;margin:8px 0 10px;background:#fefce8;border:2px solid #fde68a;color:#713f12;border-radius:14px;padding:10px 12px;font-size:15px;font-weight:850;line-height:1.35}.vocab-v25729-hint-box.show{display:block}.vocab-v25729-hints-used{margin-top:10px;background:#faf5ff;border:2px solid #e9d5ff;color:#5b21b6;border-radius:14px;padding:10px;font-weight:900;text-align:center}'+
    '@media(max-width:820px){.vocab-v25729-topbar-title{font-size:15px}.vocab-v25729-topbar-return{font-size:12px;padding:6px 9px}.vocab-v25729-menu{grid-template-columns:1fr}.vocab-v25729-card{padding:14px}.vocab-v25729-icon{font-size:34px}.vocab-v25729-box{padding:12px;margin-top:6px}.vocab-v25729-question{font-size:18px;margin:7px 0}.vocab-v25729-option{font-size:16px}.vocab-v25729-exercise-head{grid-template-columns:minmax(0,.9fr) minmax(0,1.2fr) minmax(0,1fr);gap:6px;padding:8px}.vocab-v25729-domain{font-size:15px}.vocab-v25729-subdomain{font-size:16px}.vocab-v25729-return{font-size:13px;padding:7px 8px}}';
    var style=document.createElement('style'); style.id='hibouVocabulaireV25729Style'; style.textContent=css; document.head.appendChild(style);
  }

  function loadData(force){
    if(state.data && !force) return Promise.resolve(state.data);
    if(!force){
      try{ var cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); if(cached && cached.exercices){ state.data=cached; return Promise.resolve(cached); } }catch(e){}
    }
    return fetch(DATA_URL,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('json '+r.status); return r.json(); }).then(function(data){ state.data=data||{exercices:[]}; try{ localStorage.setItem(CACHE_KEY,JSON.stringify(state.data)); }catch(e){} return state.data; }).catch(function(err){
      console.warn('Vocabulaire JSON indisponible',err);
      return {exercices:[]};
    });
  }

  function activeItems(type){
    var data=state.data||{exercices:[]};
    return (data.exercices||[]).filter(function(x){ return String(x.actif||'oui').toLowerCase()!=='non' && (!type || x.type===type); });
  }

  function patchDomainMenu(){
    var card=document.querySelector('#frenchTrainingOverlayV2348 .fr-v25720-domain-card.vocab');
    if(!card || card.__hibouVocabPatched) return;
    card.__hibouVocabPatched=true;
    card.disabled=false;
    card.removeAttribute('disabled');
    card.removeAttribute('aria-disabled');
    card.classList.remove('is-disabled');
    var soon=card.querySelector('.fr-v25720-domain-soon');
    if(soon){ soon.className='fr-v25720-domain-arrow'; soon.textContent='›'; }
    card.onclick=function(ev){ ev.preventDefault(); window.openHibouVocabulaireV25729(); };
  }

  function installMenuPatch(){
    function wrap(name){
      var fn=window[name];
      if(typeof fn!=='function' || fn.__hibouVocabWrapped) return;
      var wrapped=function(){ var r=fn.apply(this,arguments); setTimeout(patchDomainMenu,0); setTimeout(patchDomainMenu,80); return r; };
      wrapped.__hibouVocabWrapped=true;
      window[name]=wrapped;
    }
    wrap('renderFrenchDomainMenuV25720');
    var frenchMenu=window.renderFrenchDomainMenuV25720;
    if(typeof frenchMenu==='function' && !frenchMenu.__vocabTopbarReset){
      var resetWrapped=function(){ resetFrenchTopbar(); return frenchMenu.apply(this,arguments); };
      resetWrapped.__hibouVocabWrapped=true; resetWrapped.__vocabTopbarReset=true; window.renderFrenchDomainMenuV25720=resetWrapped;
    }
    wrap('openFrenchTrainingPopupV2348');
    setTimeout(patchDomainMenu,0); setTimeout(patchDomainMenu,300);
  }

  function showLoading(){
    setVocabTopbar('', false);
    setInner(header('🧩 Vocabulaire','Chargement des exercices.','Les exercices sont dans data/vocabulaire.json.')+'<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-feedback" style="padding:22px">🦉 Chargement rapide des exercices...</div></section></div>');
  }

  function renderMenu(){
    setVocabTopbar('', false);
    var count = activeItems().length;
    setInner(header('🧩 Vocabulaire','Choisis un entraînement.','Contenu chargé depuis le fichier JSON externe : '+count+' exercice(s) disponible(s).')+
      '<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-training-head"><button type="button" class="fr-v2348-back" onclick="renderFrenchDomainMenuV25720()">← Retour au menu Français</button><div class="fr-v2348-training-title">Vocabulaire</div><div></div></div>'+
      '<div class="vocab-v25729-menu">'+
      '<button class="vocab-v25729-card" type="button" onclick="startHibouVocabulaireV25729(\'famille\')"><div class="vocab-v25729-icon">🌳</div><div class="vocab-v25729-title">Familles de mots</div><div class="vocab-v25729-desc">Reconnaître les mots qui appartiennent à la même famille.</div></button>'+
      '<button class="vocab-v25729-card" type="button" onclick="startHibouVocabulaireV25729(\'synonyme\')"><div class="vocab-v25729-icon">🔁</div><div class="vocab-v25729-title">Synonymes</div><div class="vocab-v25729-desc">Trouver un mot de sens proche.</div></button>'+
      '<button class="vocab-v25729-card" type="button" onclick="startHibouVocabulaireV25729(\'contraire\')"><div class="vocab-v25729-icon">↔️</div><div class="vocab-v25729-title">Contraires</div><div class="vocab-v25729-desc">Trouver un mot de sens opposé.</div></button>'+
      '<button class="vocab-v25729-card" type="button" onclick="startHibouVocabulaireV25729(\'generique\')"><div class="vocab-v25729-icon">📦</div><div class="vocab-v25729-title">Mots génériques</div><div class="vocab-v25729-desc">Ranger des mots dans une catégorie.</div></button>'+
      '</div></section></div>');
  }

  window.openHibouVocabulaireV25729 = function(){
    injectStyle();
    showLoading();
    loadData(false).then(renderMenu);
  };

  window.startHibouVocabulaireV25729 = function(type){
    loadData(false).then(function(){
      var items=shuffle(activeItems(type)).slice(0,10);
      state.activity=type; state.questions=items; state.index=0; state.score=0; state.total=items.length; state.answers=[]; state.hintsUsed=0; state.hintsByQuestion={};
      if(!items.length) return renderNoData(type);
      renderQcm();
    });
  };

  function activityLabel(type){ return type==='famille'?'Familles de mots':type==='synonyme'?'Synonymes':type==='contraire'?'Contraires':type==='generique'?'Mots génériques':'Vocabulaire'; }

  function defaultHint(type){
    if(type==='famille') return 'Regarde si les mots ont une partie commune ET un sens proche.';
    if(type==='synonyme') return 'Cherche le mot qui pourrait remplacer le mot demandé dans une phrase.';
    if(type==='contraire') return 'Cherche le mot qui veut dire l’inverse.';
    if(type==='generique') return 'Cherche le mot-étiquette qui peut ranger tous les mots ensemble.';
    return 'Relis bien la question et élimine les réponses impossibles.';
  }

  function renderNoData(type){
    setVocabTopbar(type, true);
    setInner(header('🧩 Vocabulaire','Aucun exercice trouvé.','Ajoute des lignes actives dans data/vocabulaire.json pour cette activité.')+'<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="vocab-v25729-feedback warn">Aucun exercice disponible pour : '+esc(activityLabel(type))+'</div><div class="vocab-v25729-actions"><button class="vocab-v25729-btn secondary" onclick="openHibouVocabulaireV25729()">← Retour Vocabulaire</button></div></section></div>');
  }

  function optionsFor(item){
    var opts=[item.bonne_reponse,item.erreur_1,item.erreur_2,item.erreur_3].filter(function(x){return clean(x);});
    return shuffle(opts).map(function(x){return {text:x, ok:norm(x)===norm(item.bonne_reponse)};});
  }
  function renderQcm(){
    setVocabTopbar(state.activity, true);
    var item=state.questions[state.index];
    if(!item) return renderResult();
    var opts=optionsFor(item);
    var html=opts.map(function(o){ return '<button type="button" class="vocab-v25729-option" data-ok="'+(o.ok?'1':'0')+'" onclick="answerHibouVocabulaireV25729(this)">'+esc(o.text)+'</button>'; }).join('');
    setInner('<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="vocab-v25729-box"><div class="vocab-v25729-exercise-progress">Question '+(state.index+1)+' / '+state.total+'</div><div class="vocab-v25729-question">'+esc(item.question||item.consigne||'Choisis la bonne réponse.')+'</div>'+(clean(item.hint||defaultHint(state.activity))?'<div class="vocab-v25729-hint-row"><button type="button" class="vocab-v25729-hint-btn" onclick="showHibouVocabHintV25729()">💡 Besoin d’un indice ?</button></div><div id="vocabHintV25729" class="vocab-v25729-hint-box">💡 '+esc(item.hint||defaultHint(state.activity))+'</div>':'')+'<div class="vocab-v25729-options">'+html+'</div><div id="vocabFeedbackV25729"></div></div></section></div>');
  }
  window.showHibouVocabHintV25729 = function(){
    var box=$('vocabHintV25729'); if(box) box.classList.add('show');
    var key=String(state.activity||'')+'_'+String(state.index||0);
    if(!state.hintsByQuestion[key]){ state.hintsByQuestion[key]=true; state.hintsUsed++; }
  };

  window.answerHibouVocabulaireV25729 = function(btn){
    var item=state.questions[state.index]; if(!item) return;
    var buttons=[].slice.call(document.querySelectorAll('.vocab-v25729-option'));
    var ok=btn.getAttribute('data-ok')==='1';
    buttons.forEach(function(b){ b.disabled=true; if(b.getAttribute('data-ok')==='1') b.classList.add('correct'); });
    if(!ok) btn.classList.add('wrong'); else state.score++;
    state.answers.push({question:item.question, ok:ok, hint:!!state.hintsByQuestion[String(state.activity||'')+'_'+String(state.index||0)]});
    var fb=$('vocabFeedbackV25729');
    var nextLabel = (state.index+1>=state.total) ? 'Voir le résultat' : 'Question suivante';
    if(fb) fb.innerHTML='<div class="vocab-v25729-feedback '+(ok?'ok':'warn')+'">'+(ok?'✅ Bravo !':'💡 Correction : '+esc(item.bonne_reponse||''))+(item.explication?'<br><small>'+esc(item.explication)+'</small>':'')+'</div><div class="vocab-v25729-actions"><button class="vocab-v25729-btn" onclick="nextHibouVocabulaireQuestionV25729()">'+nextLabel+'</button></div>';
  };
  window.nextHibouVocabulaireQuestionV25729 = function(){
    state.index++;
    if(state.index>=state.total) renderResult();
    else renderQcm();
  };

  function renderResult(){
    setVocabTopbar(state.activity, true);
    var total=state.total||state.questions.length||1;
    var pct=Math.round((state.score/total)*100);
    var label=activityLabel(state.activity);
    setInner(header('🧩 Vocabulaire','Entraînement terminé.','Le résultat est ajouté à Mon parcours récent.')+
      '<div class="fr-v2348-content"><section class="fr-v2348-panel"><div class="fr-v2348-result"><h3>Bravo, entraînement terminé !</h3><div class="fr-v2348-score-grid"><div class="fr-v2348-score-card">Score<b>'+state.score+' / '+total+'</b></div><div class="fr-v2348-score-card">Réussite<b>'+pct+'%</b></div></div><div class="fr-v2348-feedback">'+esc(label)+' · Source : JSON externe</div><div class="vocab-v25729-hints-used">💡 Aides utilisées : '+(state.hintsUsed||0)+'</div><div class="fr-v2348-actions"><button type="button" class="fr-v2348-action" onclick="startHibouVocabulaireV25729(\''+esc(state.activity)+'\')">🔁 Refaire</button><button type="button" class="fr-v2348-action secondary" onclick="openHibouVocabulaireV25729()">← Retour Vocabulaire</button><button type="button" class="fr-v2348-action secondary" onclick="renderFrenchDomainMenuV25720()">Menu Français</button></div></div></section></div>');
    track(label,total);
  }
  function track(label,total){
    try{
      if(typeof window.hibouTrackEvent==='function'){
        window.hibouTrackEvent({type:'entrainement_vocabulaire_termine', matiere:'Français', domaine:'Vocabulaire', titre:'Entraînement vocabulaire terminé', detail:label+' — '+state.score+'/'+total+' · aides '+(state.hintsUsed||0), score:state.score, total:total, source:'vocabulaire_json'});
      }else if(typeof window.hibouRecordTrainingSuccess==='function'){
        window.hibouRecordTrainingSuccess('français','Vocabulaire',label+' — '+state.score+' / '+total);
      }
    }catch(e){ console.warn('Journal vocabulaire non mis à jour', e); }
  }

  function boot(){ injectStyle(); installMenuPatch(); loadData(false); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot,0);
  window.addEventListener('load', function(){ setTimeout(installMenuPatch,200); });
})();
