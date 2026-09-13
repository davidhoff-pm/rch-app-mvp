// Service amélioré pour récupérer les actualités RSS de l'AFA (Association François Aupetit)
// https://www.afa.asso.fr/feed

import { XMLParser } from 'fast-xml-parser';

export const RSS_FEED_URL = 'https://www.afa.asso.fr/feed';

// Configuration du parser XML
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreDeclaration: true,
  parseTagValue: false,
  trimValues: true,
  cdataPropName: '#cdata',
};

/**
 * Décode les entités HTML dans une chaîne de caractères
 * @param {string} str La chaîne contenant des entités HTML
 * @returns {string} La chaîne avec les entités décodées
 */
const decodeHtmlEntities = (str) => {
  if (!str) return str;

  // Créer un élément temporaire pour utiliser le décodage natif du navigateur
  if (typeof window !== 'undefined' && window.document) {
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
      return textarea.value;
    } catch (e) {
      // Fallback sur le décodage manuel
    }
  }

  // Fallback pour React Native ou autres environnements
  return str
    .replace(/&#8217;/g, "'") // Apostrophe courbe
    .replace(/&#8211;/g, '–') // Tiret cadratin
    .replace(/&#8212;/g, '—') // Tiret long
    .replace(/&#8220;/g, '"') // Guillemet ouvrant
    .replace(/&#8221;/g, '"') // Guillemet fermant
    .replace(/&#8230;/g, '…') // Points de suspension
    .replace(/&amp;/g, '&') // Ampersand
    .replace(/&lt;/g, '<') // Moins que
    .replace(/&gt;/g, '>') // Plus que
    .replace(/&quot;/g, '"') // Guillemet
    .replace(/&#39;/g, "'"); // Apostrophe droite
};

/**
 * Nettoie le texte HTML pour ne garder que le texte
 * @param {string} html HTML à nettoyer
 * @returns {string} Texte nettoyé
 */
const stripHtml = (html) => {
  if (!html) return '';

  // Supprimer les balises HTML
  let text = html.replace(/<[^>]+>/g, '');

  // Décoder les entités HTML
  text = decodeHtmlEntities(text);

  // Nettoyer les espaces multiples
  text = text.replace(/\s+/g, ' ').trim();

  return text;
};

/**
 * Formate la date RSS en format lisible
 * @param {string} dateStr Date au format RSS
 * @returns {string} Date formatée
 */
const formatRSSDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch (error) {
    console.warn('Erreur lors du formatage de la date:', error);
    return 'Date inconnue';
  }
};

/**
 * Extrait le texte d'un champ qui peut être CDATA ou texte simple
 * @param {*} field Champ à extraire
 * @returns {string} Texte extrait
 */
const extractText = (field) => {
  if (!field) return '';

  // Si c'est déjà une string
  if (typeof field === 'string') return field;

  // Si c'est un objet avec CDATA
  if (field['#cdata']) return field['#cdata'];

  // Si c'est un objet avec #text
  if (field['#text']) return field['#text'];

  // Si c'est un objet, essayer de le convertir en string
  if (typeof field === 'object') {
    return JSON.stringify(field);
  }

  return '';
};

/**
 * Parse le flux RSS en utilisant fast-xml-parser
 * @param {string} xmlText XML du flux RSS
 * @returns {Array} Liste des articles
 */
export const parseRSSFeed = (xmlText) => {
  try {

    const parser = new XMLParser(parserOptions);
    const result = parser.parse(xmlText);

    // Extraire les items du RSS
    const items = result?.rss?.channel?.item || [];
    const itemsArray = Array.isArray(items) ? items : [items];


    // Transformer les items en format utilisable
    const articles = itemsArray.slice(0, 3).map((item) => {
      const title = extractText(item.title);
      const link = extractText(item.link);
      const pubDate = extractText(item.pubDate);
      const description = extractText(item.description || item['content:encoded']);

      return {
        title: decodeHtmlEntities(title),
        link: link.trim(),
        pubDate,
        description: stripHtml(description).substring(0, 150) + (description.length > 150 ? '...' : ''),
        formattedDate: formatRSSDate(pubDate),
      };
    });

    return articles.filter((article) => article.title && article.link);
  } catch (error) {
    console.error('❌ Erreur lors du parsing RSS:', error);
    return [];
  }
};

/**
 * Prétraite la réponse d'un proxy pour extraire le XML brut
 * @param {string} responseText Réponse du proxy
 * @returns {string} XML brut
 */
const getRawXML = (responseText) => {
  const base64Prefix = 'data:application/rss+xml; charset=UTF-8;base64,';

  // Vérifier si c'est une réponse encodée en Base64
  if (responseText.trim().startsWith(base64Prefix)) {

    try {
      const base64Data = responseText.trim().substring(base64Prefix.length);
      const decodedXML = atob(base64Data);
      return decodedXML;
    } catch (e) {
      console.error('❌ Erreur lors du décodage Base64:', e);
      throw new Error('Le décodage Base64 a échoué');
    }
  }

  // Sinon, c'est du XML brut
  return responseText;
};

/**
 * Récupère les articles RSS via CORS proxy
 * @returns {Promise<Array>} Liste des articles
 */
export const fetchRSSFeed = async () => {
  try {

    // Mode web : utiliser des proxies CORS
    if (typeof window !== 'undefined') {
      // Liste de proxies CORS à essayer
      const proxies = [
        'https://api.allorigins.win/raw?url=', // Endpoint /raw pour éviter l'encodage Base64
        'https://api.allorigins.win/get?url=', // Fallback vers /get
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
      ];

      for (let i = 0; i < proxies.length; i++) {
        try {

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

          const proxyUrl = proxies[i] + encodeURIComponent(RSS_FEED_URL);

          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json, text/plain, */*',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const responseText = await response.text();

            // Prétraiter la réponse pour décoder Base64 si nécessaire
            const rawXML = getRawXML(responseText);

            // Parser le XML
            const articles = parseRSSFeed(rawXML);

            if (articles.length > 0) {
              return articles;
            } else {
              console.warn(`⚠️ Proxy ${i + 1} : aucun article trouvé, essai du suivant...`);
              continue;
            }
          }
        } catch (proxyError) {
          if (proxyError.name === 'AbortError') {
            console.warn(`⏱️ Proxy ${i + 1} : timeout après 10 secondes`);
          } else {
            console.warn(`❌ Proxy ${i + 1} échoué:`, proxyError.message);
          }
          continue; // Essayer le proxy suivant
        }
      }

      console.warn('⚠️ Tous les proxies ont échoué, utilisation des données de fallback');
      return getMockRSSData();
    }

    // Mode React Native : retourner des données de test
    return getMockRSSData();
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du RSS:', error);
    return getMockRSSData();
  }
};

/**
 * Données de fallback en cas d'échec
 * @returns {Array} Articles de test
 */
const getMockRSSData = () => {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

  return [
    {
      title: "Les 24h à vélo d'Axel pour soutenir l'afa Crohn RCH !",
      link: 'https://www.afa.asso.fr/les-24h-a-velo-daxel-pour-soutenir-lafa-crohn-rch/',
      pubDate: twoDaysAgo.toUTCString(),
      description: "Axel relève un défi sportif exceptionnel pour sensibiliser aux MICI et soutenir la recherche...",
      formattedDate: 'Il y a 2 jours',
    },
    {
      title: 'Nouvelle rencontre conviviale à Chatel Guyon',
      link: 'https://www.afa.asso.fr/nouvelle-rencontre-conviviale-a-chatel-guyon/',
      pubDate: eightDaysAgo.toUTCString(),
      description:
        "L'AFA organise une nouvelle rencontre entre patients et familles pour échanger sur la vie avec les MICI...",
      formattedDate: 'Il y a 8 jours',
    },
    {
      title: 'À deux, on va plus loin : Charlotte et Elise relèvent le défi pour la recherche MICI',
      link: 'https://www.afa.asso.fr/les-jumelles-relevent-le-defi-pour-la-recherche-mici/',
      pubDate: twelveDaysAgo.toUTCString(),
      description: "Les jumelles Charlotte et Elise s'engagent ensemble pour soutenir la recherche sur les MICI...",
      formattedDate: 'Il y a 12 jours',
    },
  ];
};
