
window.HibouMathLesson={
 answer:function(btn,ok){const b=btn.closest('.block');b.querySelectorAll('.ans').forEach(x=>x.disabled=true);btn.classList.add(ok?'correct':'wrong');if(!ok){const c=b.querySelector('[data-correct=true]');if(c)c.classList.add('correct')}b.querySelector('.feedback').textContent=ok?'✅ Bravo, c’est juste !':'💡 Relis la leçon et observe l’exemple.'},
 complete:function(meta,btn){const p={type:'lecon_consultee',matiere:'Mathématiques',domaine:meta.domaine,titre:'Leçon comprise',detail:meta.titre,source:'bibliotheque_lecons'};try{if(typeof hibouTrackEvent==='function')hibouTrackEvent(p);else if(parent&&parent!==window&&typeof parent.hibouTrackEvent==='function')parent.hibouTrackEvent(p);else if(parent&&parent!==window)parent.postMessage({type:'hibou:lesson-completed',detail:p},'*')}catch(e){}btn.textContent='✅ Leçon enregistrée';btn.disabled=true;btn.style.background='#2e8b57'}
};
