(function(){
  'use strict';
  if(window.__hibouMesLeconsV25749) return;
  window.__hibouMesLeconsV25749 = true;

  var VERSION = window.MAITRE_HIBOU_TITLE || '🦉 Maître Hibou V25.7.54';

  function byId(id){ return document.getElementById(id); }

  function setVersion(){
    try{ document.title = VERSION; }catch(e){}
  }

  function createPopup(){
    if(byId('hibouLessonsOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'hibouLessonsOverlay';
    overlay.className = 'hibou-lessons-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML =
      '<section class="hibou-lessons-dialog" role="dialog" aria-modal="true" aria-labelledby="hibouLessonsTitle">' +
        '<header class="hibou-lessons-header">' +
          '<div class="owl" aria-hidden="true"><img src="bibliotheque_lecons/images/logo_lecons_officiel.png?v=25749-logo-officiel-2" alt=""></div>' +
          '<div class="hibou-lessons-title"><h2 id="hibouLessonsTitle">Mes leçons</h2><p>Choisis une matière, recherche une notion puis ouvre la leçon dans cette fenêtre.</p></div>' +
          '<button type="button" class="hibou-lessons-close" id="hibouLessonsClose" aria-label="Fermer">×</button>' +
        '</header>' +
        '<nav class="hibou-lessons-tabs" aria-label="Choisir une matière">' +
          '<button type="button" class="hibou-lessons-tab active" id="hibouLessonsFrench">📘 Français</button>' +
          '<button type="button" class="hibou-lessons-tab" id="hibouLessonsMaths">📐 Mathématiques</button>' +
        '</nav>' +
        '<div class="hibou-lessons-content">' +
          '<iframe class="hibou-lessons-frame" id="hibouLessonsFrame" title="Bibliothèque des leçons de français" src="bibliotheque_lecons/index.html"></iframe>' +
        '</div>' +
      '</section>';
    document.body.appendChild(overlay);

    var close = byId('hibouLessonsClose');
    var french = byId('hibouLessonsFrench');
    var maths = byId('hibouLessonsMaths');
    if(close) close.addEventListener('click', closeLessons);
    if(french) french.addEventListener('click', function(){ selectSubject('francais'); });
    if(maths) maths.addEventListener('click', function(){ selectSubject('maths'); });
    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeLessons(); });
  }

  function selectSubject(subject){
    var french = byId('hibouLessonsFrench');
    var maths = byId('hibouLessonsMaths');
    var frame = byId('hibouLessonsFrame');
    var isMaths = subject === 'maths';
    if(french) french.classList.toggle('active', !isMaths);
    if(maths) maths.classList.toggle('active', isMaths);
    if(frame){
      var nextSrc = isMaths ? 'bibliotheque_math/index.html' : 'bibliotheque_lecons/index.html';
      if(frame.getAttribute('src') !== nextSrc) frame.setAttribute('src', nextSrc);
      frame.title = isMaths ? 'Bibliothèque des leçons de mathématiques' : 'Bibliothèque des leçons de français';
      frame.style.display = 'block';
    }
  }

  function openLessons(){
    createPopup();
    selectSubject('francais');
    var overlay = byId('hibouLessonsOverlay');
    if(overlay){
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
      setTimeout(function(){ var c=byId('hibouLessonsClose'); if(c) c.focus(); },30);
    }
  }

  function closeLessons(){
    var overlay = byId('hibouLessonsOverlay');
    if(overlay){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }
  }

  function installButton(){
    var actions = document.querySelector('.v24-advice-actions');
    if(!actions) return false;

    var lessons = byId('v24AdviceLessons');
    if(!lessons){
      lessons = document.createElement('button');
      lessons.type = 'button';
      lessons.id = 'v24AdviceLessons';
      lessons.className = 'v24-advice-btn v24-advice-lessons';
      lessons.innerHTML = '📚 Revoir une leçon<small>Français et Maths</small>';
      actions.insertBefore(lessons, actions.firstChild);
      lessons.addEventListener('click', function(ev){ ev.preventDefault(); openLessons(); }, true);
    }

    var train = byId('v24AdviceTrain');
    var belt = byId('v24AdviceBelt');
    var question = byId('v24AdviceQuestion');
    [train,belt,lessons,question].forEach(function(btn){ if(btn && btn.parentNode === actions) actions.appendChild(btn); });
    return true;
  }

  function install(){
    if(!document.body) return;
    document.body.classList.add('hibou-lessons-ready');
    setVersion();
    createPopup();
    installButton();
  }

  window.openHibouLessons = openLessons;
  window.closeHibouLessons = closeLessons;

  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape' && byId('hibouLessonsOverlay') && byId('hibouLessonsOverlay').classList.contains('open')) closeLessons();
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', install);
  [50,150,350,700,1200,2200,4000].forEach(function(ms){ setTimeout(install,ms); });
  setInterval(function(){ setVersion(); installButton(); },3000);
})();
