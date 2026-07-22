/*
 * Maître Hibou — Journal élève modulaire V25.7.63
 * Objectif : une seule porte d'entrée pour le parcours élève : window.hibouTrackEvent(...)
 * L'index.html ne doit plus contenir de moteur lourd pour « Mon parcours récent ».
 */
(function () {
  'use strict';

  if (window.__hibouJournalEleveV25763) return;
  window.__hibouJournalEleveV25763 = true;

  var VERSION = 'V25.7.63';
  var API = 'https://script.google.com/macros/s/AKfycbxz1vYS24sv-c3XVja12geWEXIQl6bQyBoQKBx5kg_fwQaj80_Oc7Y34yeBSRN4lF1f/exec';
  var LAST_PREFIX = 'hibou_journal_last_';
  var HISTORY_PREFIX = 'hibou_journal_history_';
  var QUEUE_KEY = 'hibou_journal_queue_v25713';
  var RECORD_QUEUE_KEY = 'hibou_records_calcul_queue_v25713';
  var DEFAULT_TEXT = 'Ta prochaine réussite apparaîtra ici.';
  var MAX_HISTORY = 20;
  var isRendering = false;
  var isFlushingEvents = false;
  var isFlushingRecords = false;
  var DEDUPE_MS = 30000;
  var RECENT_ID_KEY = 'hibou_journal_recent_event_ids_v25763';
  var RECENT_ID_TTL = 90000;
  var recentSignatures = {};

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"']/g, function (char) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char];
    });
  }

  function normalizeKey(value) {
    return clean(value).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function capitalizeName(value) {
    value = clean(value);
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  function readJson(key, fallback) {
    try {
      var raw = storageGet(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    storageSet(key, JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    var date = iso ? new Date(iso) : new Date();
    if (isNaN(date)) date = new Date();
    return date.toLocaleDateString('fr-FR');
  }

  function formatHour(iso) {
    var date = iso ? new Date(iso) : new Date();
    if (isNaN(date)) date = new Date();
    return date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  }

  function getDevice() {
    return /Android|iPad|Tablet|Mobile/i.test(navigator.userAgent || '') ? 'tablette' : 'pc';
  }

  function getCurrentName() {
    var candidates = [];

    try { candidates.push(window.prenomActuel); } catch (error) {}
    try { candidates.push(window.currentStudentName); } catch (error) {}
    try { candidates.push(window.__hibouCurrentStudent); } catch (error) {}
    try { candidates.push((document.getElementById('eleveNom') || {}).textContent); } catch (error) {}
    try {
      var dataStudent = document.querySelector('[data-current-student]');
      if (dataStudent) candidates.push(dataStudent.getAttribute('data-current-student'));
    } catch (error) {}

    ['hibou_current_student', 'hibou_prenom', 'hibou_last_prenom', 'elevePrenom', 'maitre_hibou_prenom', 'hibou_student_name'].forEach(function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        if (raw.charAt(0) === '{') {
          var obj = JSON.parse(raw);
          candidates.push(obj.prenom || obj.name || obj.eleve || obj.student);
        } else {
          candidates.push(raw);
        }
      } catch (error) {}
    });

    for (var i = 0; i < candidates.length; i++) {
      var name = clean(candidates[i]);
      if (name && !/^(jo|eleve|élève|undefined|null|prenom|prénom)$/i.test(name)) {
        return capitalizeName(name);
      }
    }
    return '';
  }

  function lastKey(name) {
    return LAST_PREFIX + normalizeKey(name);
  }

  function historyKey(name) {
    return HISTORY_PREFIX + normalizeKey(name);
  }

  function getLastEvent(name) {
    name = clean(name) || getCurrentName();
    return name ? readJson(lastKey(name), null) : null;
  }

  function getEventHistory(name) {
    name = clean(name) || getCurrentName();
    return name ? readJson(historyKey(name), []) : [];
  }

  function iconFor(type, subject) {
    var text = normalizeKey((type || '') + ' ' + (subject || ''));
    if (/question/.test(text)) return '💬';
    if (/ceinture|validee|medaille/.test(text)) return '🏅';
    if (/entrainement|record|calcul|math/.test(text)) return '🧮';
    if (/bilan/.test(text)) return '✅';
    if (/francais|grammaire|ecrit/.test(text)) return '📖';
    if (/anglais/.test(text)) return '🇬🇧';
    if (/sciences/.test(text)) return '🔬';
    if (/histoire/.test(text)) return '🏛️';
    if (/geographie/.test(text)) return '🌍';
    return '⭐';
  }

  function medalFromScore(score, total, explicitLevel) {
    var explicit = clean(explicitLevel).replace(/^🥇\s*/, '').replace(/^🥈\s*/, '').replace(/^🥉\s*/, '');
    if (explicit) return explicit;
    score = Number(score);
    total = Number(total) || 20;
    if (!isFinite(score)) return '';
    var scaled = total === 20 ? score : Math.round((score / total) * 20);
    if (scaled >= 19) return 'Or';
    if (scaled >= 17) return 'Argent';
    if (scaled >= 15) return 'Bronze';
    return '';
  }

  function makeDisplay(event) {
    if (!event) return DEFAULT_TEXT;
    if (event.affichage && !event.__rebuildDisplay) return clean(event.affichage);
    var title = clean(event.titre || event.title || event.texte || event.text || 'Activité terminée');
    var detail = clean(event.detail || event.details || '');
    var type = clean(event.type);
    var score = event.score !== '' && event.score != null ? Number(event.score) : null;
    var total = event.total !== '' && event.total != null ? Number(event.total) : null;

    if (type === 'ceinture_validee') {
      var level = medalFromScore(score, total, event.niveau || event.medaille || event.medal);
      var points = score != null && total ? score + '/' + total : '';
      var parts = [level, points].filter(Boolean).join(' — ');
      return title + (parts ? ' — ' + parts : (detail ? ' — ' + detail : ''));
    }
    return title + (detail ? ' — ' + detail : '');
  }

  function stableEventSignature(event) {
    return [
      normalizeKey(event.prenom),
      normalizeKey(event.type),
      normalizeKey(event.matiere),
      normalizeKey(event.domaine),
      normalizeKey(event.titre),
      normalizeKey(event.detail),
      String(event.score == null ? '' : event.score),
      String(event.total == null ? '' : event.total)
    ].join('|');
  }

  function eventId(event) {
    var signature = stableEventSignature(event);
    var now = Date.now();
    var recent = readJson(RECENT_ID_KEY, {});
    var entry = recent && recent[signature];
    if (entry && clean(entry.id) && now - Number(entry.time || 0) < RECENT_ID_TTL) {
      return clean(entry.id);
    }

    var randomPart = '';
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        randomPart = window.crypto.randomUUID();
      }
    } catch (error) {}
    if (!randomPart) randomPart = now.toString(36) + '-' + Math.random().toString(36).slice(2, 10);

    var id = 'mh-' + normalizeKey(event.prenom) + '-' + normalizeKey(event.type) + '-' + randomPart;
    recent = recent && typeof recent === 'object' ? recent : {};
    recent[signature] = {id: id, time: now};
    Object.keys(recent).forEach(function (key) {
      if (now - Number((recent[key] || {}).time || 0) > RECENT_ID_TTL * 2) delete recent[key];
    });
    writeJson(RECENT_ID_KEY, recent);
    return id;
  }

  function normalizeEvent(raw) {
    raw = raw || {};
    var name = clean(raw.prenom || raw.name || raw.eleve || raw.student) || getCurrentName();
    if (!name) return null;

    var type = normalizeKey(raw.type || raw.kind || 'activite_terminee');
    if (type === 'entrainement') type = 'entrainement_termine';
    if (type === 'ceinture') type = 'ceinture_validee';
    if (type === 'question') type = 'question_posee';
    if (type === 'bilan') type = 'bilan_reussi';

    var iso = clean(raw.date_iso || raw.dateIso || raw.date) || nowIso();
    var score = raw.score == null || raw.score === '' ? '' : Number(raw.score);
    var total = raw.total == null || raw.total === '' ? '' : Number(raw.total);
    var timeSeconds = raw.temps_secondes == null || raw.temps_secondes === '' ? '' : Math.max(1, Math.round(Number(raw.temps_secondes) || 1));

    var event = {
      version: VERSION,
      date_iso: iso,
      date: formatDate(iso),
      heure: formatHour(iso),
      prenom: capitalizeName(name),
      type: type,
      matiere: clean(raw.matiere || raw.subject || ''),
      domaine: clean(raw.domaine || raw.domain || ''),
      titre: clean(raw.titre || raw.title || raw.texte || raw.text || 'Activité terminée'),
      detail: clean(raw.detail || raw.details || ''),
      score: score,
      total: total,
      niveau: medalFromScore(score, total, raw.niveau || raw.medaille || raw.medal),
      temps_secondes: timeSeconds,
      source: clean(raw.source || 'maitre_hibou_v25_7_13'),
      appareil: clean(raw.appareil || getDevice()),
      id_evenement: clean(raw.id_evenement || raw.event_id || raw.id || '')
    };

    event.id_evenement = event.id_evenement || eventId(event);
    event.affichage = makeDisplay(event);
    return event;
  }

  function isValidEvent(event) {
    return !!(event && clean(event.prenom) && clean(event.type) && clean(event.titre) && clean(event.date_iso));
  }

  function saveLocal(event) {
    if (!isValidEvent(event)) return;
    writeJson(lastKey(event.prenom), event);
    var history = getEventHistory(event.prenom);
    history.unshift(event);
    var seen = {};
    history = history.filter(function (item) {
      var id = clean(item && item.id_evenement);
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, MAX_HISTORY);
    writeJson(historyKey(event.prenom), history);
  }

  function readQueue(key) {
    var queue = readJson(key, []);
    return Array.isArray(queue) ? queue : [];
  }

  function writeQueue(key, queue) {
    writeJson(key, Array.isArray(queue) ? queue : []);
  }

  function enqueueEvent(event) {
    var queue = readQueue(QUEUE_KEY);
    var id = clean(event && event.id_evenement);
    if (id && queue.some(function (item) { return clean(item && item.id_evenement) === id; })) return;
    queue.push(event);
    writeQueue(QUEUE_KEY, queue.slice(-100));
  }

  function enqueueRecord(event) {
    if (event.type !== 'entrainement_termine' || normalizeKey(event.matiere) !== 'maths') return;
    var queue = readQueue(RECORD_QUEUE_KEY);
    queue.push(event);
    writeQueue(RECORD_QUEUE_KEY, queue.slice(-100));
  }

  function addJsonp(url, onSuccess, onFailure) {
    var callbackName = '__hibouJournalCb_' + Date.now() + '_' + String(Math.random()).slice(2);
    var done = false;
    var script = document.createElement('script');
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var timeout = setTimeout(function () { finish(false); }, 12000);

    function finish(ok, payload) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
      try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (error) {}
      if (ok) onSuccess && onSuccess(payload);
      else onFailure && onFailure(payload);
    }

    window[callbackName] = function (payload) {
      finish(!!(payload && payload.ok !== false), payload);
    };

    script.onerror = function () { finish(false); };
    script.src = url + sep + 'callback=' + encodeURIComponent(callbackName) + '&_=' + Date.now();
    document.head.appendChild(script);
  }

  function eventParams(event) {
    var result = '';
    if (/ceinture_validee|bilan_reussi|termine/.test(event.type || '')) result = 'réussi';
    return {
      action: 'enregistrer_parcours',
      event_id: event.id_evenement,
      id: event.id_evenement,
      date: event.date_iso,
      heure: event.heure,
      prenom: event.prenom,
      texte: event.affichage,
      type: event.type,
      matiere: event.matiere,
      activite: clean(event.domaine || event.titre),
      domaine: event.domaine,
      titre: event.titre,
      detail: event.detail,
      score: event.score,
      total: event.total,
      resultat: result,
      medaille: event.niveau,
      niveau: event.niveau,
      temps_secondes: event.temps_secondes,
      source: event.source,
      appareil: event.appareil,
      version: event.version
    };
  }

  function recordParams(event) {
    return {
      action: 'enregistrer_record',
      prenom: event.prenom,
      ceinture: clean(event.domaine || event.titre || 'Maths'),
      score: event.score,
      total: event.total,
      temps_secondes: event.temps_secondes,
      temps_moyen: event.total ? Math.round((Number(event.temps_secondes || 0) / Number(event.total || 1)) * 10) / 10 : '',
      appareil: event.appareil
    };
  }

  function buildUrl(params) {
    var query = Object.keys(params).filter(function (key) {
      return params[key] !== undefined && params[key] !== null && params[key] !== '';
    }).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    return API + '?' + query;
  }

  function flushEvents() {
    if (isFlushingEvents) return;
    var queue = readQueue(QUEUE_KEY);
    if (!queue.length) return;
    isFlushingEvents = true;
    var event = queue.shift();

    addJsonp(buildUrl(eventParams(event)), function () {
      writeQueue(QUEUE_KEY, queue);
      isFlushingEvents = false;
      flushEvents();
    }, function () {
      queue.unshift(event);
      writeQueue(QUEUE_KEY, queue.slice(0, 100));
      isFlushingEvents = false;
    });
  }

  function flushRecords() {
    if (isFlushingRecords) return;
    var queue = readQueue(RECORD_QUEUE_KEY);
    if (!queue.length) return;
    isFlushingRecords = true;
    var event = queue.shift();

    addJsonp(buildUrl(recordParams(event)), function () {
      writeQueue(RECORD_QUEUE_KEY, queue);
      isFlushingRecords = false;
      flushRecords();
    }, function () {
      queue.unshift(event);
      writeQueue(RECORD_QUEUE_KEY, queue.slice(0, 100));
      isFlushingRecords = false;
    });
  }

  function renderRecentEvent(name) {
    name = clean(name) || getCurrentName();
    var card = document.getElementById('bandeauLastCard');
    if (!card) return;

    var event = getLastEvent(name);
    var text = isValidEvent(event) ? event.affichage : DEFAULT_TEXT;
    var icon = isValidEvent(event) ? iconFor(event.type, event.matiere) : '🧭';

    isRendering = true;
    card.innerHTML = '<span class="bandeau-info-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="bandeau-info-text"><span class="bandeau-info-label">Mon parcours récent</span>' +
      '<span id="bandeauLastText">' + escapeHtml(text) + '</span></span>';
    card.classList.add('mh-journal-eleve');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('title', 'Voir mon parcours');
    card.setAttribute('aria-label', 'Mon parcours récent. Voir mes progrès.');
    isRendering = false;
  }

  function renderProfileJournal(name) {
    name = clean(name) || getCurrentName();
    var body = document.querySelector('#studentProfileLifeInnerV23417 .profile-life-v23417-body');
    if (!body) return;

    var card = body.querySelector('.mh-journal-popup-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'profile-life-v23417-card wide mh-journal-popup-card';
      body.insertBefore(card, body.firstChild);
    }

    var event = getLastEvent(name);
    var history = getEventHistory(name).slice(0, 5);
    var html = '<h3>🧭 Mon parcours</h3>';
    if (isValidEvent(event)) {
      html += '<div class="mh-journal-last-row"><span>' + iconFor(event.type, event.matiere) + '</span><div>' +
        escapeHtml(event.affichage) + '<small>' + escapeHtml(event.date + ' à ' + event.heure) + '</small></div></div>';
    } else {
      html += '<div class="mh-journal-last-row"><span>🧭</span><div>' + DEFAULT_TEXT + '</div></div>';
    }

    if (history.length) {
      html += '<h4 style="margin:12px 0 6px">Dernières traces</h4><div class="mh-journal-history">' + history.map(function (item) {
        return '<div class="mh-journal-history-row"><span>' + iconFor(item.type, item.matiere) + '</span><div>' +
          escapeHtml(item.affichage) + '<small>' + escapeHtml(item.date + ' à ' + item.heure) + '</small></div></div>';
      }).join('') + '</div>';
    }
    card.innerHTML = html;
  }

  function signatureFor(event) {
    return [normalizeKey(event.prenom), normalizeKey(event.type), normalizeKey(event.matiere), normalizeKey(event.titre), normalizeKey(event.detail), String(event.score), String(event.total)].join('|');
  }

  function isDuplicateLiveEvent(event) {
    var signature = signatureFor(event);
    var now = Date.now();
    var previous = recentSignatures[signature] || 0;
    recentSignatures[signature] = now;
    return previous && (now - previous) < DEDUPE_MS;
  }

  function trackEvent(raw) {
    var event = normalizeEvent(raw);
    if (!event) return null;
    if (isDuplicateLiveEvent(event)) return event;
    saveLocal(event);
    renderRecentEvent(event.prenom);
    renderProfileJournal(event.prenom);
    enqueueEvent(event);
    enqueueRecord(event);
    flushEvents();
    flushRecords();
    return event;
  }

  function parseTrainingScore(scoreText) {
    var text = clean(scoreText);
    var match = text.match(/(\d+)\s*\/\s*(\d+)/);
    var time = text.match(/(\d{1,2}):(\d{2})/);
    return {
      score: match ? Number(match[1]) : '',
      total: match ? Number(match[2]) : '',
      timeSeconds: time ? Number(time[1]) * 60 + Number(time[2]) : '',
      detail: text.replace(/^Score\s*/i, '')
    };
  }

  function recordTraining(subject, label, scoreText) {
    var parsed = parseTrainingScore(scoreText);
    return trackEvent({
      type: 'entrainement_termine',
      matiere: capitalizeName(subject || 'Maths'),
      domaine: 'Calcul mental',
      titre: 'Entraînement ' + capitalizeName(subject || 'maths') + ' : ' + clean(label || 'calcul'),
      detail: parsed.detail,
      score: parsed.score,
      total: parsed.total,
      temps_secondes: parsed.timeSeconds,
      source: 'entrainement_' + normalizeKey(subject || 'maths')
    });
  }

  function legacyMedalText(text) {
    text = clean(text);
    return /^(🥇|🥈|🥉)?\s*(or|argent|bronze)\s*[·-]/i.test(text) || /Je sais .*validée\s*\(\d+\/20\)/i.test(text);
  }

  function recordSuccess(text, type, meta) {
    meta = meta || {};
    type = normalizeKey(type || 'activite_terminee');
    var fullText = clean(text);

    if (type === 'entrainement') {
      var parsed = parseTrainingScore(fullText);
      var detectedSubject = meta.matiere || meta.subject || '';
      if (!detectedSubject) {
        if (/fran[cç]ais|grammaire|conjugaison|orthographe|lecture/i.test(fullText)) detectedSubject = 'Français';
        else if (/math|calcul|nombre|ceinture/i.test(fullText)) detectedSubject = 'Maths';
        else detectedSubject = 'Activité';
      }
      var subjectKey = normalizeKey(detectedSubject);
      var titlePart = fullText.replace(/^[🧮📖✍️✅⭐🏅\s]+/, '').split('—')[0].trim() || 'Entraînement terminé';
      var detailPart = fullText.indexOf('—') >= 0 ? fullText.split('—').slice(1).join('—').trim() : parsed.detail;
      return trackEvent({
        type: 'entrainement_termine',
        matiere: capitalizeName(detectedSubject),
        domaine: meta.domaine || (subjectKey === 'maths' ? 'Calcul mental' : subjectKey === 'francais' ? 'Grammaire' : ''),
        titre: titlePart,
        detail: meta.detail || detailPart,
        score: meta.score != null ? meta.score : parsed.score,
        total: meta.total != null ? meta.total : parsed.total,
        temps_secondes: meta.temps_secondes != null ? meta.temps_secondes : parsed.timeSeconds,
        source: meta.source || ('entrainement_' + subjectKey)
      });
    }

    if (type === 'ceinture') {
      var parsedBeltScore = fullText.match(/(\d+)\s*\/\s*(\d+)/);
      var looksLikeLiveBelt = /ceinture/i.test(fullText) && /valid/i.test(fullText) && !!parsedBeltScore;

      // Ancien appel automatique des compteurs/médailles : on l'ignore, sauf vraie phrase de ceinture validée.
      if (!meta.actionReelle && !meta.live && !meta.force && !looksLikeLiveBelt) {
        if (legacyMedalText(fullText)) return null;
        return null;
      }

      var belt = meta.belt || {};
      var color = clean(belt.colorName || belt.ceinture || meta.ceinture || '');
      if (!color) {
        var colorMatch = fullText.match(/ceinture\s+([^:—\-]+?)\s+(maths|fran[cç]ais)?\s*valid/i);
        color = clean(colorMatch && colorMatch[1]);
      }
      var label = clean(belt.label || meta.label || '');
      var subject = meta.matiere || meta.subject || (/fran[cç]ais/i.test(fullText) ? 'Français' : 'Maths');
      return trackEvent({
        type: 'ceinture_validee',
        matiere: subject,
        domaine: meta.domaine || (normalizeKey(subject) === 'maths' ? 'Calcul mental' : 'Grammaire'),
        titre: 'Ceinture ' + (color || '') + ' ' + subject + ' validée',
        detail: label,
        score: meta.score != null ? meta.score : (parsedBeltScore ? Number(parsedBeltScore[1]) : ''),
        total: meta.total != null ? meta.total : (parsedBeltScore ? Number(parsedBeltScore[2]) : ''),
        niveau: meta.niveau || meta.medaille || meta.medal,
        source: meta.source || ('ceinture_' + normalizeKey(subject))
      });
    }

    return trackEvent({
      type: type || 'activite_terminee',
      matiere: meta.matiere || meta.subject || '',
      domaine: meta.domaine || '',
      titre: fullText || 'Activité terminée',
      detail: meta.detail || '',
      score: meta.score,
      total: meta.total,
      niveau: meta.niveau,
      source: meta.source || 'ancien_module'
    });
  }

  function recordQuestion(subject, questionText) {
    var shortQuestion = clean(questionText);
    if (shortQuestion.length > 80) shortQuestion = shortQuestion.slice(0, 77) + '...';
    return trackEvent({
      type: 'question_posee',
      matiere: subject || 'Curiosité',
      domaine: 'Boîte à questions',
      titre: 'Question posée',
      detail: shortQuestion,
      source: 'boite_questions'
    });
  }

  function normalizeQuestionBridgePayload(raw) {
    raw = raw || {};
    var detail = raw.detail || raw.payload || raw.data || raw;
    if (detail && detail.detail && typeof detail.detail === 'object') detail = detail.detail;
    var name = clean(detail.prenom || detail.eleve || detail.name || detail.student) || getCurrentName();
    var subject = clean(detail.matiere || detail.subject || detail.domaine || detail.domain || 'Curiosité');
    var question = clean(detail.questionCorrigee || detail.question_corrigee || detail.question || detail.texte || detail.text || detail.detail || detail.questionOriginale || detail.question_originale || '');
    if (!name) return null;
    if (!question) question = subject ? 'Question en ' + subject : 'Question de curiosité';
    return {
      prenom: name,
      type: 'question_posee',
      matiere: subject || 'Curiosité',
      domaine: 'Boîte à questions',
      titre: 'Question posée',
      detail: question,
      source: clean(detail.source || 'boite_questions'),
      id_evenement: clean(detail.id_evenement || detail.event_id || detail.id || '')
    };
  }

  function receiveQuestionBridgePayload(raw) {
    var event = normalizeQuestionBridgePayload(raw);
    if (!event) return null;
    return trackEvent(event);
  }

  function readQuestionBridgeEvent() {
    var keys = ['hibou_question_event_v25713', 'hibou_question_event', 'hibou_question_journal_event'];
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        var payload = JSON.parse(raw);
        if (payload && payload.__hibouJournalReadV25713) continue;
        payload.__hibouJournalReadV25713 = true;
        localStorage.setItem(keys[i], JSON.stringify(payload));
        receiveQuestionBridgePayload(payload);
      } catch (error) {}
    }
  }

  function finalizeMentalRecord(data) {
    data = data || {};
    var score = data.score == null ? '' : Number(data.score);
    var total = data.total == null ? 10 : Number(data.total);
    var seconds = data.seconds == null ? data.temps_secondes : data.seconds;
    seconds = seconds == null || seconds === '' ? '' : Math.max(1, Math.round(Number(seconds) || 1));
    return trackEvent({
      type: 'entrainement_termine',
      matiere: 'Maths',
      domaine: clean(data.label || data.ceinture || 'Calcul mental'),
      titre: 'Entraînement maths : ' + clean(data.label || data.ceinture || 'calcul mental'),
      detail: (score !== '' && total ? score + '/' + total : '') + (seconds ? ' en ' + formatShortSeconds(seconds) : ''),
      score: score,
      total: total,
      temps_secondes: seconds,
      source: 'calcul_mental'
    });
  }

  function formatShortSeconds(seconds) {
    seconds = Math.max(1, Math.round(Number(seconds) || 1));
    var minutes = Math.floor(seconds / 60);
    var remaining = seconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(remaining).padStart(2, '0');
  }

  function bindPublicApi() {
    window.hibouTrackEvent = trackEvent;
    window.hibouGetLastEvent = getLastEvent;
    window.hibouGetEventHistory = getEventHistory;
    window.hibouRenderRecentEvent = renderRecentEvent;
    window.hibouRecordTrainingSuccess = recordTraining;
    window.hibouRecordSuccess = recordSuccess;
    window.hibouRecordQuestionSuccess = recordQuestion;
    window.hibouReceiveQuestionEvent = receiveQuestionBridgePayload;
    window.hibouFinalizeMentalRecord = finalizeMentalRecord;
    window.hibouFinalizeMentalRecordV25627 = finalizeMentalRecord;

    ['25219', '25220', '25221', '25222', '25223', '25224', '25225', '25226', '25227', '25228', '25229', '25230', '25632', '25636', '25637', '25638', '25639', '25640', '25641', '25642', '25643', '25644', '25645', '25646', '2570', '2571', '2572', '2573', '2574', '2575', '2576', '2577', '2578', '2579', '25710', '25711', '25712', '25713'].forEach(function (version) {
      window['hibouRecordTrainingSuccessV' + version] = recordTraining;
      window['hibouRecordSuccessV' + version] = recordSuccess;
    });
  }

  function bindCard() {
    var card = document.getElementById('bandeauLastCard');
    if (!card || card.__hibouJournalBound) return;
    card.__hibouJournalBound = true;
    card.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window.openStudentProfileLifeV23417 === 'function') {
        window.openStudentProfileLifeV23417();
        setTimeout(function () { renderProfileJournal(getCurrentName()); }, 80);
      } else if (typeof window.openProgressPopup === 'function') {
        window.openProgressPopup();
      }
    }, true);
  }

  function wrapProfilePopup() {
    var original = window.openStudentProfileLifeV23417;
    if (typeof original !== 'function' || original.__hibouJournalWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      setTimeout(function () {
        renderProfileJournal(getCurrentName());
        renderRecentEvent(getCurrentName());
      }, 80);
      return result;
    };
    wrapped.__hibouJournalWrapped = true;
    window.openStudentProfileLifeV23417 = wrapped;
  }

  function readQuestionJournalLatest() {
    try {
      var rows = JSON.parse(localStorage.getItem('hibou_question_journal') || '[]');
      return Array.isArray(rows) ? rows[0] : null;
    } catch (error) { return null; }
  }

  function wrapQuestionBoxSave() {
    var original = window.questionBoxSave;
    if (typeof original !== 'function' || original.__hibouJournalWrapped) return;
    var wrapped = function () {
      var before = readQuestionJournalLatest();
      var beforeKey = before ? clean(before.date + '|' + before.questionCorrigee + '|' + before.questionOriginale) : '';
      var result = original.apply(this, arguments);
      setTimeout(function () {
        var after = readQuestionJournalLatest();
        if (!after) return;
        var afterKey = clean(after.date + '|' + after.questionCorrigee + '|' + after.questionOriginale);
        if (afterKey && afterKey !== beforeKey) {
          recordQuestion(after.subject || after.matiere || 'Boîte à questions', after.questionCorrigee || after.questionOriginale || after.question || '');
        }
      }, 40);
      return result;
    };
    wrapped.__hibouJournalWrapped = true;
    window.questionBoxSave = wrapped;
  }

  function wrapLegacyQuestionLogger() {
    var original = window.logQuestionToJournal;
    if (typeof original !== 'function' || original.__hibouJournalWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      try {
        if (result && result.questionCorrigee && !/bloqu/i.test(result.status || '')) {
          recordQuestion(result.subject || 'Boîte à questions', result.questionCorrigee || result.questionOriginale || result.question);
        }
      } catch (error) {}
      return result;
    };
    wrapped.__hibouJournalWrapped = true;
    window.logQuestionToJournal = wrapped;
  }

  function bindEvents() {
    window.addEventListener('message', function (event) {
      var data = event && event.data;
      if (!data || typeof data !== 'object') return;
      var type = clean(data.type || data.eventType || data.kind);
      if (['hibou_question_posee', 'hibou:question-added', 'question_posee', 'boite_question_posee'].indexOf(type) === -1) return;
      receiveQuestionBridgePayload(data);
    });
    window.addEventListener('storage', function (event) {
      if (!event || ['hibou_question_event_v25713', 'hibou_question_event', 'hibou_question_journal_event'].indexOf(event.key) === -1) return;
      readQuestionBridgeEvent();
    });
    document.addEventListener('hibou:question-bridge', function (event) {
      receiveQuestionBridgePayload((event && event.detail) || {});
    });
    setInterval(readQuestionBridgeEvent, 1800);
    readQuestionBridgeEvent();
    document.addEventListener('hibou:question-added', function (event) {
      var detail = (event && event.detail) || {};
      recordQuestion(detail.matiere || detail.subject || '', detail.questionCorrigee || detail.question || detail.text || '');
    });
    window.addEventListener('hibou:question-added', function (event) {
      var detail = (event && event.detail) || {};
      recordQuestion(detail.matiere || detail.subject || '', detail.questionCorrigee || detail.question || detail.text || '');
    });
    window.addEventListener('hibou:track-event', function (event) {
      var detail = (event && event.detail) || {};
      trackEvent(detail);
    });
    document.addEventListener('hibou:track-event', function (event) {
      var detail = (event && event.detail) || {};
      trackEvent(detail);
    });
    window.addEventListener('hibou:bilan-updated', function (event) {
      var detail = (event && event.detail) || {};
      var result = detail.result || {};
      if (!result || result.__hibouJournalLogged) return;
      result.__hibouJournalLogged = true;
      if (result.score != null && result.total != null) {
        trackEvent({
          type: 'bilan_reussi',
          matiere: capitalizeName(detail.subject || result.subject || ''),
          domaine: 'Bilan',
          titre: 'Bilan ' + capitalizeName(detail.subject || result.subject || '') + ' terminé',
          detail: result.score + '/' + result.total,
          score: result.score,
          total: result.total,
          source: 'bilan_' + normalizeKey(detail.subject || result.subject || '')
        });
      }
    });
  }

  function boot() {
    try { document.title = '🦉 Maître Hibou ' + VERSION; } catch (error) {}
    bindPublicApi();
    bindCard();
    wrapProfilePopup();
    wrapQuestionBoxSave();
    wrapLegacyQuestionLogger();
    renderRecentEvent(getCurrentName());
    renderProfileJournal(getCurrentName());
    flushEvents();
    flushRecords();
  }

  bindPublicApi();
  bindEvents();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', boot);
  window.addEventListener('online', function () { flushEvents(); flushRecords(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) boot(); });
})();
