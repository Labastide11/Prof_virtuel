/* Maître Hibou V25.7.62 — Popup Mes progrès consolidée */
(function(){
'use strict';
if(window.__hibouProgressPopupV25762)return;window.__hibouProgressPopupV25762=true;
var latest=null, overlay=null;
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_');}
function current(){return window.hibouStudentSystem?window.hibouStudentSystem.currentName():'';}
function rank(v){v=clean(v);return /or|🥇/i.test(v)?3:/argent|🥈/i.test(v)?2:/bronze|🥉/i.test(v)?1:0;}
function formatDate(v){var d=new Date(v||'');if(isNaN(d))return clean(v);return d.toLocaleDateString('fr-FR')+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
function icon(e){if(e.resultat==='erreur')return'❌';if(e.type==='ceinture_validee'||e.categorie==='ceinture')return'🏅';if(/question/.test(e.type||''))return'💬';if(/record/.test((e.type||'')+' '+(e.categorie||'')))return'⏱️';if(/entrainement/.test(e.type||''))return'🧮';return e.resultat==='reussite'?'✅':'🧭';}
function bestBelts(){var rows=(latest&&latest.competences)||[],best={};rows.forEach(function(r){var k=norm(r.skill_id||r.skillId||r.competence||r.texte||r.activite);if(!k)return;var rr=rank(r.medaille||r.medal||r.rank);if(!best[k]||rr>best[k].rank)best[k]={rank:rr,row:r};});return Object.keys(best).map(function(k){return best[k].row;}).sort(function(a,b){return String(b.date||b.date_iso||'').localeCompare(String(a.date||a.date_iso||''));});}
function history(){var n=current();return window.hibouGetEventHistory?window.hibouGetEventHistory(n):[];}
function counts(belts){var c={or:0,argent:0,bronze:0};belts.forEach(function(r){var x=rank(r.medaille||r.medal||r.rank);if(x===3)c.or++;else if(x===2)c.argent++;else if(x===1)c.bronze++;});return c;}
function eventText(e){return clean(e.affichage||e.texte||e.titre||e.activite||'Activité');}
function eventDate(e){return e.date_iso||e.date||'';}
function listHtml(rows,empty){if(!rows.length)return'<div class="hcp-empty">'+esc(empty)+'</div>';return rows.map(function(e){return'<article class="hcp-event '+(e.resultat==='erreur'?'is-error':'')+'"><span class="hcp-event-icon">'+icon(e)+'</span><div><strong>'+esc(eventText(e))+'</strong><small>'+esc(formatDate(eventDate(e)))+(e.source?' · '+esc(e.source):'')+'</small></div></article>';}).join('');}
function ensure(){if(overlay&&document.body.contains(overlay))return overlay;overlay=document.createElement('div');overlay.id='hibouProgressConsolidatedOverlayV25762';overlay.className='hcp-overlay hidden';overlay.innerHTML='<div class="hcp-dialog" role="dialog" aria-modal="true" aria-label="Mes progrès"><button class="hcp-close" type="button" aria-label="Fermer">×</button><div id="hibouProgressConsolidatedBodyV25762"></div></div>';document.body.appendChild(overlay);overlay.querySelector('.hcp-close').onclick=close;overlay.onclick=function(e){if(e.target===overlay)close();};return overlay;}
function render(){ensure();var n=current()||'Élève',h=history(),belts=bestBelts(),m=counts(belts),success=h.filter(function(e){return e.resultat==='reussite';}).slice(0,3),resume=h.filter(function(e){return e.resultat==='erreur';}).slice(0,3),recent=h.slice(0,20);var body=document.getElementById('hibouProgressConsolidatedBodyV25762');if(!body)return;
body.innerHTML='<header class="hcp-header"><div class="hcp-owl">🦉</div><div><span class="hcp-chip">📊 Mes progrès</span><h2>'+esc(n)+'</h2><p>Mon parcours réel dans Maître Hibou</p></div></header>'+
'<section class="hcp-medals"><div><b>'+m.or+'</b><span>🥇 Or</span></div><div><b>'+m.argent+'</b><span>🥈 Argent</span></div><div><b>'+m.bronze+'</b><span>🥉 Bronze</span></div><div><b>'+h.length+'</b><span>🧭 activités</span></div></section>'+
'<div class="hcp-grid"><section class="hcp-card"><h3>⭐ Mes 3 dernières réussites</h3>'+listHtml(success,'Aucune réussite enregistrée pour le moment.')+'</section><section class="hcp-card"><h3>🎯 À reprendre</h3>'+listHtml(resume,'Aucune activité à reprendre.')+'</section></div>'+
'<section class="hcp-card hcp-belts"><h3>🏅 Mes ceintures validées</h3>'+(belts.length?belts.map(function(r){return'<div class="hcp-belt"><strong>'+esc(r.competence||r.texte||r.activite||r.skill_id)+'</strong><span>'+esc(r.medaille||'')+(r.validations?' · '+esc(r.validations):'')+(r.date?' · '+esc(formatDate(r.date)):'')+'</span></div>';}).join(''):'<div class="hcp-empty">Aucune ceinture validée.</div>')+'</section>'+
'<section class="hcp-card hcp-history"><h3>🕘 Mon historique récent</h3>'+listHtml(recent,'Aucune activité enregistrée.')+'</section>';
}
function open(ev){if(ev&&ev.preventDefault)ev.preventDefault();render();ensure().classList.remove('hidden');document.body.classList.add('hibou-progress-popup-open');try{if(window.hibouRefreshStudent)window.hibouRefreshStudent(true).then(function(){render();});}catch(e){}}
function close(){if(overlay)overlay.classList.add('hidden');document.body.classList.remove('hibou-progress-popup-open');}
function removeLegacy(){document.querySelectorAll('#studentProfileLifeOverlayV23417').forEach(function(x){x.remove();});}
window.openHibouProgressConsolidatedV25762=open;window.closeHibouProgressConsolidatedV25762=close;
// Compatibilité : toute ancienne tentative d'ouverture mène à la popup consolidée.
window.openStudentProfileLifeV23417=open;window.closeStudentProfileLifeV23417=close;
document.addEventListener('hibou:student-snapshot',function(e){latest=e.detail&&e.detail.snapshot;if(overlay&&!overlay.classList.contains('hidden'))render();});
['hibou:student-event','hibou:student-changed','hibou:belts-updated'].forEach(function(t){document.addEventListener(t,function(){if(overlay&&!overlay.classList.contains('hidden'))render();});});
var mo=new MutationObserver(removeLegacy);mo.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacy);else removeLegacy();
})();
