Maître Hibou V25.7.54 — synchronisation hybride contrôlée

- Enregistrement local immédiat conservé.
- Envoi distant groupé par lots de 25 éléments maximum.
- Une seule requête POST active à la fois.
- Nouvelle tentative progressive après erreur ; aucune boucle d'appels rapides.
- Synchronisation manuelle depuis l'espace enseignant.
- Actualisation contrôlée de la liste des élèves.
- Actualisation automatique de la liste au maximum une fois toutes les 6 heures.
- Configuration locale de l'URL Apps Script et de TABLET_DEVICE_KEY.
- API_TOKEN administrateur non intégré dans les fichiers publics.
- Les données restent localement en attente en cas d'échec réseau.

IMPORTANT : installer aussi le Code.gs V2.1 fourni et créer la propriété de script TABLET_DEVICE_KEY.
