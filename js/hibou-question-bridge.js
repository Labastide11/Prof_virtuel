/*
 * Maître Hibou — Pont Boîte à questions → Journal élève V25.7.66
 * À charger dans boite_questions.html, après le code qui enregistre la question.
 * Fonction à appeler uniquement après enregistrement réel dans le journal des questions :
 *   window.hibouQuestionBridgeNotify({ prenom, matiere, questionCorrigee });
 */
(function () {
  'use strict';
  if (window.__hibouQuestionBridgeV25713) return;
  window.__hibouQuestionBridgeV25713 = true;

  var EVENT_KEY = getParam('eventKey') || 'hibou_question_event_v25713';
  var SESSION_KEY = getParam('sessionKey') || 'hibou_question_session_v25713';
  var PARENT_ORIGIN = getParam('parentOrigin') || '*';

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function getParam(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (error) { return ''; }
  }

  function getSessionName() {
    var candidates = [getParam('prenom')];
    try {
      var session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      candidates.push(session.prenom || session.eleve || session.name || '');
    } catch (error) {}
    for (var i = 0; i < candidates.length; i++) {
      var name = clean(candidates[i]);
      if (name) return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    return '';
  }

  function eventId(payload) {
    return [
      clean(payload.prenom || getSessionName()).toLowerCase(),
      'question',
      Date.now(),
      String(Math.random()).slice(2, 7)
    ].join('-');
  }

  function normalize(payload) {
    payload = payload || {};
    var prenom = clean(payload.prenom || payload.eleve || payload.name || getSessionName());
    var matiere = clean(payload.matiere || payload.subject || payload.domaine || 'Curiosité');
    var question = clean(payload.questionCorrigee || payload.question_corrigee || payload.question || payload.texte || payload.text || payload.detail || payload.questionOriginale || '');
    return {
      type: 'hibou_question_posee',
      event_id: clean(payload.event_id || payload.id_evenement || payload.id || '') || eventId({ prenom: prenom }),
      prenom: prenom,
      matiere: matiere || 'Curiosité',
      questionCorrigee: question,
      question: question,
      source: 'boite_questions',
      date_iso: new Date().toISOString()
    };
  }

  function notify(payload) {
    var event = normalize(payload);
    if (!event.prenom) return false;

    try { localStorage.setItem(EVENT_KEY, JSON.stringify(event)); } catch (error) {}

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(event, PARENT_ORIGIN === '*' ? '*' : PARENT_ORIGIN);
      }
    } catch (error) {}

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(event, PARENT_ORIGIN === '*' ? '*' : PARENT_ORIGIN);
      }
    } catch (error) {}

    try {
      window.dispatchEvent(new CustomEvent('hibou:question-bridge-sent', { detail: event }));
    } catch (error) {}

    return true;
  }

  window.hibouQuestionBridgeNotify = notify;

  // Compatibilité : si la page séparée émet déjà un événement interne après sauvegarde,
  // le pont le retransmet automatiquement vers la page principale.
  ['hibou:question-added', 'hibou:question-saved', 'hibou:question-validée', 'hibou:question-validee'].forEach(function (name) {
    window.addEventListener(name, function (event) { notify((event && event.detail) || {}); });
    document.addEventListener(name, function (event) { notify((event && event.detail) || {}); });
  });
})();
