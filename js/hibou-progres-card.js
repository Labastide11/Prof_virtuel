/* Maître Hibou V25.7.62 — Carte centrale consolidée */
(function(){
'use strict';if(window.__hibouProgressCardV25761)return;window.__hibouProgressCardV25761=true;
var VERSION='V25.7.62',latest=null,timer=null;
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_');}
function current(){return window.hibouStudentSystem?window.hibouStudentSystem.currentName():'';}
function rank(v){v=clean(v);return /or|🥇/i.test(v)?3:/argent|🥈/i.test(v)?2:/bronze|🥉/i.test(v)?1:0;}
function medalLabel(r){return r===3?'Or':r===2?'Argent':r===1?'Bronze':'';}
function bestBelts(snap){var rows=(snap&&snap.competences)||[];var best={};rows.forEach(function(r){var k=norm(r.skill_id||r.skillId||r.competence||r.texte);if(!k)return;var rr=rank(r.medaille||r.medal||r.rank);if(!best[k]||rr>best[k].rank)best[k]={rank:rr,row:r};});return Object.keys(best).map(function(k){return best[k].row;});}
function count(rows){var c={or:0,argent:0,bronze:0};rows.forEach(function(r){var x=rank(r.medaille||r.medal||r.rank);if(x===3)c.or++;else if(x===2)c.argent++;else if(x===1)c.bronze++;});return c;}
function domain(r){var d=norm((r.domaine||r.matiere||'')+' '+(r.skill_id||''));return /grammaire|francais/.test(d)?'Français':'Maths';}
function summary(rows,d){var list=rows.filter(function(r){return domain(r)===d;});if(!list.length)return'Aucune ceinture validée';return list.slice(0,3).map(function(r){return '🏅 '+clean(r.competence||r.texte||r.skill_id);}).join(' · ')+(list.length>3?' +'+(list.length-3):'');}
function render(){var card=document.querySelector('.v21-profile-card'),stats=card&&card.querySelector('.v21-stats'),head=card&&card.querySelector('.v21-profile-head');if(!card||!stats||!head)return;var name=current()||'Élève';var belts=bestBelts(latest||{}),m=count(belts),hist=window.hibouGetEventHistory?window.hibouGetEventHistory(name):[];var successes=hist.filter(function(e){return e.resultat==='reussite';}).slice(0,3);var errors=hist.filter(function(e){return e.resultat==='erreur';}).slice(0,1);var h=head.querySelector('h3');if(h)h.textContent=name;
var html='<div class="v2576-progress-scroll"><section class="v2576-section"><div class="v2576-section-title">🏅 Mes médailles</div><div class="v2576-medal-grid">'+tile('or','Or',m.or)+tile('argent','Argent',m.argent)+tile('bronze','Bronze',m.bronze)+'</div></section>'+
'<section class="v2576-section"><div class="v2576-section-title">🎗️ Mes ceintures</div><div class="v2576-lines"><div class="v2576-line"><strong>Maths :</strong><span>'+esc(summary(belts,'Maths'))+'</span></div><div class="v2576-line"><strong>Français :</strong><span>'+esc(summary(belts,'Français'))+'</span></div></div></section>'+
'<section class="v2576-section"><div class="v2576-section-title">⭐ Mes dernières réussites</div><div class="v2576-skills">'+(successes.length?successes.map(function(e){return'<span class="v2576-skill">'+esc(e.affichage)+'</span>';}).join(''):'<span class="v2576-empty">Aucune réussite enregistrée.</span>')+'</div></section>'+
(errors.length?'<section class="v2576-section"><div class="v2576-section-title">🎯 À reprendre</div><div class="v2576-skills"><span class="v2576-skill">'+esc(errors[0].affichage)+'</span></div></section>':'')+'</div><button class="v21-change-student-btn" onclick="changerEleve()" type="button">👤 Changer d’élève / Donner la tablette</button>';
stats.innerHTML=html;card.classList.add('v2576-progress-card','hibou-progress-consolidated-clickable');card.classList.remove('profile-life-v23417-clickable');card.onclick=function(e){if(e.target.closest('button,a,input,select,textarea'))return;if(typeof window.openHibouProgressConsolidatedV25762==='function')window.openHibouProgressConsolidatedV25762(e);};}
function tile(k,l,n){return'<div class="v2576-medal-tile '+k+'"><img src="images/medaille_'+k+'.jpg" alt="Médaille '+l+'"><div class="v2576-medal-count">'+n+'</div><div class="v2576-medal-label">'+l+'</div></div>';}
function schedule(){clearTimeout(timer);timer=setTimeout(render,30);}
document.addEventListener('hibou:student-snapshot',function(e){latest=e.detail&&e.detail.snapshot;schedule();});['hibou:student-event','hibou:student-changed','hibou:belts-updated'].forEach(function(t){document.addEventListener(t,schedule);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(function(){if(window.hibouRefreshStudent)window.hibouRefreshStudent(false);},600);});else schedule();
window.addEventListener('load',function(){schedule();});window.refreshHibouProgressCardV25761=schedule;
})();
