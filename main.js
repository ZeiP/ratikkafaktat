let factsData = [];
const supportedLanguages = new Set(['fi', 'en', 'sv']);
const languageOrder = ['fi', 'en', 'sv'];

const siteTexts = {
  fi: {
    siteTitle: '100 ratikkafaktaa',
    siteHeadingHtml: '100 ratikka<span class="logo-highlight">faktaa</span>',
    homeDescription: 'Turun ratikasta liikkuu vaihtoehtoisia totuuksia – me jaamme faktoja. Vapaaehtoisvoimin. Ei kaupungin, raitiotieallianssin tai grynderien ylläpitämä.',
    factPrefix: 'Fakta',
    backHref: '/fi/',
    footerHtml: 'Faktat on lainattu Instagramin <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="100 ratikkafaktaa (avautuu uuteen ikkunaan)">100 ratikkafaktaa</a> -tililtä.'
  },
  en: {
    siteTitle: '100 tram facts',
    siteHeadingHtml: '100 tram <span class="logo-highlight">facts</span>',
    homeDescription: 'Facts about Turku tramway.',
    factPrefix: 'Fact',
    backHref: '/en/',
    footerHtml: 'Facts are sourced from the Instagram account <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="100 ratikkafaktaa (opens in a new window)">100 ratikkafaktaa</a>.'
  },
  sv: {
    siteTitle: '100 spårvägsfakta',
    siteHeadingHtml: '100 spårvägs<span class="logo-highlight">fakta</span>',
    homeDescription: 'Fakta om Åbo spårväg.',
    factPrefix: 'Fakta',
    backHref: '/sv/',
    footerHtml: 'Fakta är hämtade från Instagram-kontot <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="100 ratikkafaktaa (öppnas i ett nytt fönster)">100 ratikkafaktaa</a>.'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const factsGrid = document.getElementById('facts-grid');
  const viewList = document.getElementById('view-list');
  const viewDetail = document.getElementById('view-detail');
  
  const detailNumber = document.getElementById('detail-number');
  const detailContent = document.getElementById('detail-content');
  const resourcesList = document.getElementById('resources-list');
  const backBtn = document.getElementById('back-btn');
  const siteNameEl = document.getElementById('site-name');
  const footerTextEl = document.getElementById('footer-text');
  const languageLinks = {
    fi: document.getElementById('lang-fi'),
    en: document.getElementById('lang-en'),
    sv: document.getElementById('lang-sv')
  };

  let currentRoute = parseRoute(window.location.pathname);
  let renderedGridLanguage = null;

  // Handle client side navigation back to root
  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({}, '', `/${currentRoute.language}/`);
    renderRoute();
  });

  try {
    const response = await fetch('/data.json');
    factsData = await response.json();
    
    // Sort logic (newest facts first was handled in scraper, just to be safe here)
    factsData.sort((a, b) => b.number - a.number);
    
    renderFactsGrid(currentRoute.language);

    // Run router once data is loaded
    renderRoute();

  } catch (error) {
    console.error('Error fetching data:', error);
    if(factsGrid.children.length === 0) {
      factsGrid.innerHTML = '<li><p>Faktoja ei voitu ladata. Yritä myöhemmin uudelleen.</p></li>';
    }
  }

  window.addEventListener('popstate', renderRoute);

  function renderRoute() {
    currentRoute = parseRoute(window.location.pathname);

    if (currentRoute.redirectPath) {
      history.replaceState({}, '', currentRoute.redirectPath);
      currentRoute = parseRoute(currentRoute.redirectPath);
    }

    const language = currentRoute.language;
    const text = siteTexts[language] || siteTexts.fi;
    const label = text.factPrefix || 'Fakta';

    updateLanguageSwitcher(currentRoute, factsData.find(f => f.number === currentRoute.factNumber), languageLinks);
    backBtn.setAttribute('href', text.backHref || '/fi/');
    if (siteNameEl) {
      siteNameEl.innerHTML = text.siteHeadingHtml;
    }
    if (footerTextEl) {
      footerTextEl.innerHTML = text.footerHtml;
    }

    if (typeof currentRoute.factNumber === 'number') {
      const fact = factsData.find(f => f.number === currentRoute.factNumber);
      if (fact) {
        showDetail(fact, language, label);
      } else {
        showList(language);
      }
    } else {
      showList(language);
    }
  }

  function renderFactsGrid(language) {
    if (renderedGridLanguage === language && factsGrid.children.length > 0 && !factsGrid.innerHTML.includes('VITE_INJECT_LIST')) {
      return;
    }

    const label = siteTexts[language]?.factPrefix || 'Fakta';
    factsGrid.innerHTML = '';
    let delay = 0;

    factsData.forEach((fact) => {
      const localized = getLocalizedFact(fact, language);
      const li = document.createElement('li');
      li.style.opacity = '0';
      li.style.transform = 'translateY(20px)';
      li.style.animation = `backdropIn 0.5s ease forwards ${delay}s`;
      delay += 0.03;

      const a = document.createElement('a');
      a.className = 'fact-card-wrapper';
      a.href = `/${language}/fakta/${fact.number}`;
      
      a.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState({}, '', `/${language}/fakta/${fact.number}`);
        renderRoute();
        window.scrollTo(0, 0);
      });

      const card = document.createElement('div');
      card.className = 'fact-card';
      card.setAttribute('role', 'article');
      
      const dateEl = document.createElement('div');
      dateEl.className = 'fact-date';
      dateEl.textContent = `${label} #${fact.number}`;
      
      const titleEl = document.createElement('h3');
      titleEl.className = 'fact-title';
      titleEl.textContent = localized.title;
      
      const contentEl = document.createElement('p');
      contentEl.className = 'fact-excerpt';
      contentEl.textContent = localized.content;

      const numberBg = document.createElement('div');
      numberBg.className = 'fact-number';
      numberBg.textContent = fact.number;
      numberBg.setAttribute('aria-hidden', 'true');

      card.appendChild(dateEl);
      card.appendChild(titleEl);
      card.appendChild(contentEl);
      card.appendChild(numberBg);
      
      a.appendChild(card);
      li.appendChild(a);
      factsGrid.appendChild(li);
    });

    renderedGridLanguage = language;
  }

  function showList(language) {
    const text = siteTexts[language] || siteTexts.fi;
    
    viewList.style.display = 'block';
    viewDetail.classList.remove('active');
    document.title = text.siteTitle;
    updateMeta('description', text.homeDescription);
    updateMeta('og:title', text.siteTitle, true);
    updateMeta('twitter:title', text.siteTitle);
    updateMeta('twitter:description', text.homeDescription);
    updateLink('canonical-link', `https://ratikkafaktat.fi/${language}/`);
  }

  function showDetail(fact, language, label) {
    const localized = getLocalizedFact(fact, language);
    viewList.style.display = 'none';
    viewDetail.classList.add('active');
    const detailText = language === 'fi' ? (fact.longContent || localized.content) : localized.content;
    const detailHtml = renderParagraphsHtml(detailText);
    
    let fullTitle = `${label} ${fact.number}: ${localized.title}`;
    document.title = fullTitle;
    updateMeta('description', localized.content);
    updateMeta('og:title', fullTitle, true);
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', localized.content);
    updateLink('canonical-link', `https://ratikkafaktat.fi/${language}/fakta/${fact.number}`);

    // Only update DOM if not already pre-rendered accurately
    if (normalizeWhitespace(detailContent.textContent) !== normalizeWhitespace(detailText)) {
      detailNumber.textContent = `#${fact.number}`;
      document.getElementById('detail-title').textContent = localized.title;
      detailContent.innerHTML = detailHtml;
      
      resourcesList.innerHTML = '';
      if (fact.resources && fact.resources.length > 0) {
        fact.resources.forEach(res => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = res.url;
          a.className = 'resource-link';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.setAttribute('aria-label', res.title + ' (avautuu uuteen ikkunaan)');
          
          const titleSpan = document.createElement('span');
          titleSpan.textContent = res.title;
          a.appendChild(titleSpan);
          
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '20');
          svg.setAttribute('height', '20');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('aria-hidden', 'true');
          svg.style.opacity = '0.5';
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14');
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(path);
          a.appendChild(svg);
          
          li.appendChild(a);
          resourcesList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'Ei lisätietolinkkejä.';
        resourcesList.appendChild(li);
      }
    }
  }

  function updateMeta(name, content, isProperty = false) {
    let selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let el = document.querySelector(selector);
    if (el) {
      el.setAttribute('content', content);
    }
  }

  function updateLink(id, href) {
    let el = document.getElementById(id);
    if (el) el.setAttribute('href', href);
  }
});

function normalizeWhitespace(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

function escapeHtml(unsafe = '') {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderParagraphsHtml(text = '') {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return '';
  }

  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

function parseRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { language: 'fi', factNumber: null, redirectPath: '/fi/' };
  }

  const first = segments[0];
  if (!supportedLanguages.has(first)) {
    if (first === 'fakta' && /^\d+$/.test(segments[1] || '')) {
      return { language: 'fi', factNumber: Number.parseInt(segments[1], 10), redirectPath: `/fi/fakta/${segments[1]}` };
    }
    return { language: 'fi', factNumber: null, redirectPath: '/fi/' };
  }

  const language = first;
  if (segments.length === 1) {
    return { language, factNumber: null, redirectPath: null };
  }

  if (segments.length >= 3 && segments[1] === 'fakta' && /^\d+$/.test(segments[2])) {
    return { language, factNumber: Number.parseInt(segments[2], 10), redirectPath: null };
  }

  return { language, factNumber: null, redirectPath: `/${language}/` };
}

function updateLanguageSwitcher(route, fact, links) {
  languageOrder.forEach(lang => {
    const link = links[lang];
    if (!link) return;
    const href = fact ? `/${lang}/fakta/${fact.number}` : `/${lang}/`;
    link.setAttribute('href', href);
    const isActive = route.language === lang;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function getLocalizedFact(fact, language) {
  const fi = fact?.translations?.fi || {};
  const localized = fact?.translations?.[language] || {};
  return {
    title: localized.title || fi.title || '',
    content: localized.content || fi.content || ''
  };
}
