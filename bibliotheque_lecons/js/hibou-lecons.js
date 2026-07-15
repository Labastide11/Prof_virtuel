
(function(){
  function clean(s){return String(s||'').trim();}
  function currentStudent(){return clean(window.currentStudentName||window.currentStudent||window.studentName||localStorage.getItem('hibou_current_student')||localStorage.getItem('prenom')||'élève');}
  window.HibouLesson={
    answer:function(button,isCorrect){var wrap=button.closest('.block.check'); if(!wrap) return; wrap.querySelectorAll('.answer').forEach(function(b){b.disabled=true;}); button.classList.add(isCorrect?'correct':'wrong'); if(!isCorrect){var c=wrap.querySelector('.answer[data-correct="true"]'); if(c) c.classList.add('correct');} var fb=wrap.querySelector('.feedback'); if(fb) fb.textContent=isCorrect?'✅ Bravo, c’est juste !':'💡 Relis la leçon et regarde l’exemple.'; wrap.dataset.answered='1';},
    complete:function(meta,button){meta=meta||{}; var payload={type:'lecon_consultee',matiere:'Français',domaine:clean(meta.domaine||''),titre:'Leçon comprise',detail:clean(meta.titre||''),source:'bibliotheque_lecons'}; try{ if(typeof window.hibouTrackEvent==='function') window.hibouTrackEvent(payload); else if(window.parent&&window.parent!==window&&typeof window.parent.hibouTrackEvent==='function') window.parent.hibouTrackEvent(payload); else if(window.parent&&window.parent!==window) window.parent.postMessage({type:'hibou:lesson-completed',detail:payload},'*'); }catch(e){} try{var key='hibou_lecons_comprises_'+currentStudent().toLowerCase(); var data=JSON.parse(localStorage.getItem(key)||'{}'); data[meta.id||meta.titre||Date.now()]={titre:meta.titre,domaine:meta.domaine,date:new Date().toISOString()}; localStorage.setItem(key,JSON.stringify(data));}catch(e){} if(button){button.classList.add('done'); button.textContent='✅ Leçon enregistrée'; button.disabled=true;}}
  };
})();
