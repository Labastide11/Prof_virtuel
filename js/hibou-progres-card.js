// V25.7.6 — Carte Mes progrès de l'accueil.
// Module externe : n'alourdit pas index.html et ne touche pas au Conseil de Maître Hibou.
(function(){
  'use strict';
  if(window.__hibouProgressCardV2576) return;
  window.__hibouProgressCardV2576 = true;

  var VERSION = 'V25.7.34';
  var IMG = {
    or: 'images/medaille_or.jpg',
    argent: 'images/medaille_argent.jpg',
    bronze: 'images/medaille_bronze.jpg'
  };

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function esc(v){ return clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function norm(v){
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  }
  function currentName(){
    try{ if(clean(window.prenomActuel)) return clean(window.prenomActuel); }catch(e){}
    try{
      var cur = JSON.parse(localStorage.getItem('hibou_current_student') || 'null');
      if(cur && clean(cur.prenom)) return clean(cur.prenom);
    }catch(e){}
    var keys = ['hibou_prenom','hibou_last_prenom','maitre_hibou_prenom','prenomEleve','prenomActuel','elevePrenom'];
    for(var i=0;i<keys.length;i++){
      try{ var v = clean(localStorage.getItem(keys[i])); if(v) return v; }catch(e){}
    }
    return '';
  }
  function bestRows(){
    try{
      if(typeof window.hibouV195BestRows === 'function'){
        var rows = window.hibouV195BestRows();
        return Array.isArray(rows) ? rows : [];
      }
    }catch(e){}
    try{
      if(typeof window.hibouV194BestBeltRows === 'function'){
        var rows2 = window.hibouV194BestBeltRows();
        return Array.isArray(rows2) ? rows2 : [];
      }
    }catch(e){}
    return [];
  }
  function medalKey(v){
    var s = clean(v).toLowerCase();
    var n = norm(v);
    if(s.indexOf('🥇') !== -1 || n === 'or' || n.indexOf('_or') !== -1 || n.indexOf('gold') !== -1) return 'or';
    if(s.indexOf('🥈') !== -1 || n.indexOf('argent') !== -1 || n.indexOf('silver') !== -1) return 'argent';
    if(s.indexOf('🥉') !== -1 || n.indexOf('bronze') !== -1) return 'bronze';
    return '';
  }
  function rowDomain(row){
    var raw = clean(row && (row.domaine || row.domain || row.matiere || row.subject || row.category || row.competence || row.title || row.label || row.skillId));
    var n = norm(raw);
    var id = norm(row && (row.skillId || row.id || row.competenceId));
    if(n.indexOf('math') !== -1 || id.indexOf('maths_') === 0) return 'Maths';
    if(n.indexOf('franc') !== -1 || n.indexOf('grammaire') !== -1 || id.indexOf('grammaire_') === 0) return 'Français';
    return clean(raw) || '';
  }
  function beltInfo(row){
    var text = norm([row && row.skillId, row && row.id, row && row.ceinture, row && row.colorName, row && row.couleur, row && row.competence, row && row.title, row && row.label].join(' '));
    var order = [
      ['blanche','⚪','blanche',1], ['jaune_clair','🟡','jaune claire',2], ['jaune_fonce','🟡','jaune foncée',3],
      ['jaune','🟡','jaune',3], ['orange_clair','🟠','orange claire',4], ['orange_fonce','🟠','orange foncée',5],
      ['orange','🟠','orange',5], ['vert_clair','🟢','verte claire',6], ['vert_fonce','🟢','verte foncée',7],
      ['verte','🟢','verte',7], ['vert','🟢','verte',7], ['bleu_clair','🔵','bleue claire',8], ['bleu_fonce','🔵','bleue foncée',9],
      ['bleue','🔵','bleue',9], ['bleu','🔵','bleue',9], ['rose','🌸','rose',10], ['beige','🟤','beige',11],
      ['violet','🟣','violette',12], ['marron','🟤','marron',13], ['gris','⚙️','grise',14], ['noire','⚫','noire',15], ['noir','⚫','noire',15], ['rouge','🔴','rouge',16]
    ];
    for(var i=0;i<order.length;i++){
      if(text.indexOf(order[i][0]) !== -1) return {emoji:order[i][1], label:order[i][2], order:order[i][3]};
    }
    return {emoji:'🎗️', label:clean(row && (row.ceinture || row.colorName || row.couleur)) || 'validée', order:99};
  }
  function skillSentence(row){
    var id = norm(row && (row.skillId || row.id || row.competenceId));
    var title = clean(row && (row.competence || row.title || row.label));
    var map = {
      maths_blanche_petits_nombres:'Calculer mentalement avec les petits nombres',
      maths_jaune_dizaines:'Calculer mentalement avec les dizaines',
      maths_orange_sans_retenue:'Calculer sans retenue',
      maths_vert_clair_avec_retenue:'Calculer avec retenue',
      maths_vert_fonce_complement_dizaine:'Trouver un complément à la dizaine',
      maths_bleu_clair_plus_moins_9:'Ajouter ou retrancher 9',
      maths_bleu_fonce_plus_moins_11:'Ajouter ou retrancher 11',
      maths_rose_centaines:'Calculer avec les centaines',
      maths_beige_complement_centaine:'Trouver un complément à la centaine',
      maths_violet_tables_1_2_10:'Multiplier par 1, 2 et 10',
      maths_marron_tables_3_4_5:'Multiplier par 3, 4 et 5',
      maths_rouge_tables_6_7:'Multiplier par 6 et 7',
      maths_gris_tables_8_9:'Multiplier par 8 et 9',
      maths_noir_multiplier_10_100_1000:'Multiplier par 10, 100 et 1 000',
      grammaire_blanche_phrase_negative:'Reconnaître une phrase affirmative ou négative',
      grammaire_blanche_phrase_affirmative_negative:'Reconnaître une phrase affirmative ou négative',
      grammaire_jaune_verbe:'Trouver le verbe',
      grammaire_jaune_trouver_verbe:'Trouver le verbe',
      grammaire_orange_sujet:'Trouver le sujet',
      grammaire_orange_trouver_sujet:'Trouver le sujet',
      grammaire_verte_nom:'Reconnaître un nom',
      grammaire_verte_reconnaitre_nom:'Reconnaître un nom',
      grammaire_bleue_determinant:'Reconnaître un déterminant',
      grammaire_marron_infinitif:'Trouver l’infinitif',
      grammaire_noire_adjectif:'Reconnaître un adjectif',
      grammaire_rouge_groupe_nominal:'Reconnaître le groupe nominal'
    };
    if(map[id]) return map[id];
    if(!title) return 'Valider une nouvelle compétence';
    if(/^je sais/i.test(title)) return title.replace(/^je sais\s*/i,'');
    return title;
  }
  function unique(list){
    var seen = {}, out = [];
    list.forEach(function(v){ var k=norm(v); if(k && !seen[k]){ seen[k]=true; out.push(v); } });
    return out;
  }
  function countMedals(rows){
    var c = {or:0, argent:0, bronze:0};
    rows.forEach(function(r){ var k=medalKey(r && (r.medal || r.medaille || r.rank)); if(c[k] != null) c[k]++; });
    return c;
  }
  function beltSummary(rows, domain){
    var list = rows.filter(function(r){ return rowDomain(r) === domain; }).map(function(r){ return beltInfo(r); });
    if(!list.length) return 'aucune ceinture validée';
    list.sort(function(a,b){ return a.order - b.order; });
    var seen = {}, compact = [];
    list.forEach(function(b){ var k=b.emoji+b.label; if(!seen[k]){ seen[k]=true; compact.push(b); } });
    if(compact.length === 1) return compact[0].emoji + ' ' + compact[0].label + ' validée';
    var visible = compact.slice(0,3).map(function(b){ return b.emoji + ' ' + b.label; }).join(' · ');
    if(compact.length > 3) visible += ' +' + (compact.length - 3);
    return visible;
  }
  function medalTile(kind, label, count){
    return '<div class="v2576-medal-tile '+kind+'">'
      + '<img src="'+IMG[kind]+'" alt="Médaille '+esc(label)+'" loading="lazy">'
      + '<div class="v2576-medal-count">'+esc(count)+'</div>'
      + '<div class="v2576-medal-label">'+esc(label)+'</div>'
      + '</div>';
  }
  function openMedals(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    try{
      if(typeof window.openPodiumCeinturesV1853 === 'function') return window.openPodiumCeinturesV1853();
      if(typeof window.openPodiumCeinturesV1852 === 'function') return window.openPodiumCeinturesV1852();
      if(typeof window.openMedalsModalV1842 === 'function') return window.openMedalsModalV1842();
      if(typeof window.openStudentProfileLifeV23417 === 'function') return window.openStudentProfileLifeV23417(ev);
    }catch(e){}
  }
  function openProgress(ev){
    if(ev && ev.target && ev.target.closest && ev.target.closest('.v21-change-student-btn,.v2576-medals-section,button,a,input,select,textarea')) return;
    if(typeof window.openStudentProfileLifeV23417 === 'function') window.openStudentProfileLifeV23417(ev);
  }
  function render(){
    var card = document.querySelector('.v21-profile-card');
    if(!card) return;
    var stats = card.querySelector('.v21-stats');
    var head = card.querySelector('.v21-profile-head');
    if(!stats || !head) return;

    var name = currentName() || 'Élève';
    var rows = bestRows();
    var medals = countMedals(rows);
    var skills = unique(rows.map(skillSentence)).slice(0,10);

    card.classList.add('profile-life-v23417-clickable','v2576-progress-card');
    card.setAttribute('aria-label','Mes progrès de '+name+'. Ouvrir pour en savoir plus.');
    card.setAttribute('title','Ouvre pour en savoir plus !');
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');

    // V25.7.34 : une seule identité visuelle dans l'en-tête.
    // On conserve le portrait existant et le prénom, et on retire les anciens titres/indices dupliqués.
    var h3 = head.querySelector('h3');
    if(h3) h3.textContent = name;
    Array.prototype.slice.call(head.querySelectorAll('.profile-life-v23417-open-hint')).slice(1).forEach(function(el){ el.remove(); });
    Array.prototype.slice.call(head.querySelectorAll('.v24-progress-title,.legacy-progress-title,.v25733-duplicate-title')).forEach(function(el){ el.remove(); });

    var hint = head.querySelector('.profile-life-v23417-open-hint');
    if(!hint){
      hint = document.createElement('div');
      hint.className = 'profile-life-v23417-open-hint';
      head.appendChild(hint);
    }
    hint.classList.add('v2576-open-hint');
    hint.textContent = '⌄ Ouvre pour en savoir plus !';

    var skillsHtml = skills.length
      ? skills.slice(0,6).map(function(s){return '<span class="v2576-skill">'+esc(s)+'</span>';}).join('')
      : '<span class="v2576-empty">Aucune compétence validée pour le moment.</span>';

    var html = ''
      + '<div class="v2576-progress-scroll" tabindex="0" aria-label="Résumé des progrès de '+esc(name)+'">'
      +   '<section class="v2576-section v2576-medals-section" role="button" tabindex="0" title="Ouvre pour en savoir plus sur les médailles">'
      +     '<div class="v2576-section-title"><span>🏅 Mes médailles</span><span class="v2576-arrow">›</span></div>'
      +     '<div class="v2576-medal-grid">'
      +       medalTile('or','Or',medals.or)
      +       medalTile('argent','Argent',medals.argent)
      +       medalTile('bronze','Bronze',medals.bronze)
      +     '</div>'
      +   '</section>'
      +   '<section class="v2576-section">'
      +     '<div class="v2576-section-title"><span>🎗️ Mes ceintures</span></div>'
      +     '<div class="v2576-lines">'
      +       '<div class="v2576-line"><strong>Maths :</strong><span><span class="v2576-pill">'+esc(beltSummary(rows,'Maths'))+'</span></span></div>'
      +       '<div class="v2576-line"><strong>Français :</strong><span><span class="v2576-pill">'+esc(beltSummary(rows,'Français'))+'</span></span></div>'
      +     '</div>'
      +   '</section>'
      +   '<section class="v2576-section">'
      +     '<div class="v2576-section-title"><span>✔ Je sais déjà...</span></div>'
      +     '<div class="v2576-skills">'+skillsHtml+'</div>'
      +   '</section>'
      + '</div>'
      + '<button class="v21-change-student-btn" onclick="changerEleve()" type="button">👤 Changer d’élève / Donner la tablette</button>';

    if(stats.getAttribute('data-v2576-html') !== html){
      stats.classList.add('v2576-progress-stats');
      stats.innerHTML = html;
      stats.setAttribute('data-v2576-html', html);
      var med = stats.querySelector('.v2576-medals-section');
      if(med){
        med.addEventListener('click', openMedals, true);
        med.addEventListener('keydown', function(ev){ if(ev.key === 'Enter' || ev.key === ' '){ openMedals(ev); } }, true);
      }
    }

    if(!card.__v2576OpenBound){
      card.__v2576OpenBound = true;
      card.addEventListener('click', openProgress, true);
      card.addEventListener('keydown', function(ev){
        if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); openProgress(ev); }
      }, true);
    }
  }
  var lockBusy = false;
  function schedule(delay){
    clearTimeout(schedule.t);
    schedule.t = setTimeout(function(){
      if(lockBusy) return;
      lockBusy = true;
      try{ render(); }finally{ lockBusy = false; }
    }, delay || 0);
  }
  function installPermanentLock(){
    var card = document.querySelector('.v21-profile-card');
    if(!card || card.__v25733Observer) return;
    card.__v25733Observer = new MutationObserver(function(){
      if(lockBusy) return;
      var h3 = card.querySelector('.v21-profile-head h3');
      var hint = card.querySelector('.profile-life-v23417-open-hint');
      var stats = card.querySelector('.v21-stats');
      var invalid = !card.classList.contains('v2576-progress-card')
        || !h3
        || !hint || hint.textContent.indexOf('Ouvre pour en savoir plus') === -1
        || !stats || !stats.querySelector('.v2576-progress-scroll');
      if(invalid) schedule(0);
    });
    card.__v25733Observer.observe(card,{subtree:true,childList:true,characterData:true,attributes:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){schedule(0);setTimeout(installPermanentLock,50);});
  else { schedule(0); setTimeout(installPermanentLock,50); }
  window.addEventListener('load', function(){ [0,80,250,700,1500,3000].forEach(schedule); setTimeout(installPermanentLock,120); });
  window.addEventListener('focus', function(){ schedule(0); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) schedule(0); });
  ['hibou:belts-updated','hibou:bilan-updated','hibou:student-event','hibou:student-changed'].forEach(function(type){
    document.addEventListener(type, function(){ schedule(0); });
  });
  setInterval(function(){ schedule(0); installPermanentLock(); }, 700);

  try{ document.title = '🦉 Maître Hibou '+VERSION; window.MAITRE_HIBOU_VERSION = VERSION; }catch(e){}
})();
