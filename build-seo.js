import fs from 'fs';
import path from 'path';

// Post-build script to generate static HTML pages for SEO

const distDir = path.resolve('./dist');
const dataFile = path.resolve('./data.json');

if (!fs.existsSync(distDir)) {
  console.error("No dist folder found. Run build first.");
  process.exit(1);
}

if (!fs.existsSync(dataFile)) {
  console.error("No data.json found. Run scraper first.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const baseHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

const languages = [
  {
    code: 'fi',
    locale: 'fi_FI',
    siteTitle: 'Sata ratikkafaktaa',
    siteHeadingHtml: 'Sata <span style="white-space: nowrap;">ratikka<span class="logo-highlight">faktaa</span></span>',
    homeDescription: 'Turun ratikasta liikkuu vaihtoehtoisia totuuksia – me jaamme faktoja. Vapaaehtoisvoimin. Ei kaupungin, raitiotieallianssin tai grynderien ylläpitämä.',
    introHtml: 'Turun ratikasta liikkuu vaihtoehtoisia totuuksia – me jaamme faktoja. Lainattu <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer">@sataratikkafaktaa</a>-tililtä, jota ylläpidetään vapaaehtoisvoimin, ei kaupungin, raitiotieallianssin tai grynderien toimesta.',
    factPrefix: 'Fakta',
    backText: 'Takaisin etusivulle',
    footerHtml: 'Faktat on lainattu Instagramin <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="Sata ratikkafaktaa (avautuu uuteen ikkunaan)">Sata ratikkafaktaa</a> -tililtä.'
  },
  {
    code: 'en',
    locale: 'en_US',
    siteTitle: '100 tram facts',
    siteHeadingHtml: '100 tram <span class="logo-highlight">facts</span>',
    homeDescription: 'Facts about Turku tramway.',
    introHtml: 'Alternative truths circulate about the Turku tramway – we share facts. Sourced from the <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer">@sataratikkafaktaa</a> account, maintained by volunteers, not by the city, the tramway alliance, or developers.',
    factPrefix: 'Fact',
    backText: 'Back to front page',
    footerHtml: 'Facts are sourced from the Instagram account <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="Sata ratikkafaktaa (opens in a new window)">Sata ratikkafaktaa</a>.'
  },
  {
    code: 'sv',
    locale: 'sv_SE',
    siteTitle: '100 spårvägsfakta',
    siteHeadingHtml: '100 <span style="white-space: nowrap;">spårvägs<span class="logo-highlight">fakta</span></span>',
    homeDescription: 'Fakta om Åbo spårväg.',
    introHtml: 'Alternativa sanningar cirkulerar om Åbo spårväg – vi delar fakta. Hämtade från kontot <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer">@sataratikkafaktaa</a>, som drivs ideellt, inte av staden, spårvägsalliansen eller byggherrar.',
    factPrefix: 'Fakta',
    backText: 'Tillbaka till framsidan',
    footerHtml: 'Fakta är hämtade från Instagram-kontot <a href="https://instagram.com/sataratikkafaktaa" target="_blank" rel="noopener noreferrer" aria-label="Sata ratikkafaktaa (öppnas i ett nytt fönster)">Sata ratikkafaktaa</a>.'
  }
];

// Also copy data.json to dist so client JS can fetch it on navigation
fs.copyFileSync(dataFile, path.join(distDir, 'data.json'));

// Replace root index.html with a redirect to /fi/
const rootRedirectHtml = `<!DOCTYPE html>
<html lang="fi">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0;url=/fi/" />
    <link rel="canonical" href="https://ratikkafaktat.fi/fi/" />
    <title>Sata ratikkafaktaa</title>
  </head>
  <body>
    <p>Siirrytään sivulle <a href="/fi/">/fi/</a>...</p>
  </body>
</html>
`;
fs.writeFileSync(path.join(distDir, 'index.html'), rootRedirectHtml);
console.log('Root index.html replaced with redirect to /fi/');

function buildAlternateLinks(pathSuffix) {
  return languages
    .map(lang => `<link rel="alternate" hreflang="${lang.code}" href="https://ratikkafaktat.fi/${lang.code}/${pathSuffix}" />`)
    .join('\n    ');
}

function cleanSeoTags(html) {
  return html
    .replace(/<title>.*?<\/title>/g, '')
    .replace(/<meta name="description".*?>/g, '')
    .replace(/<meta name="keywords".*?>/g, '')
    .replace(/<meta property="og:.*?".*?>/g, '')
    .replace(/<meta name="twitter:.*?".*?>/g, '')
    .replace(/<meta name="geo\..*?".*?>/g, '')
    .replace(/<meta name="ICBM".*?>/g, '')
    .replace(/<link id="canonical-link".*?>/g, '')
    .replace(/<link rel="alternate" hreflang.*?>/g, '')
    .replace(/<meta property="og:url".*?>/g, '')
    .replace(/<script id="schema-base".*?<\/script>/sg, '');
}

languages.forEach(lang => {
  const dirPath = path.join(distDir, lang.code);
  fs.mkdirSync(dirPath, { recursive: true });

  const indexSeoTags = `
    <title>${lang.siteTitle}</title>
    <meta name="description" content="${escapeHtml(lang.homeDescription)}" />
    <meta name="keywords" content="Raitiovaunu, Ratikka, Faktoja, Turku, Joukkoliikenne" />
    <meta property="og:title" content="${lang.siteTitle}" />
    <meta property="og:description" content="${escapeHtml(lang.homeDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${lang.locale}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${lang.siteTitle}" />
    <meta name="twitter:description" content="${escapeHtml(lang.homeDescription)}" />
    <meta name="geo.region" content="FI" />
    <meta name="geo.placename" content="Turku" />
    <meta name="geo.position" content="60.4518;22.2666" />
    <meta name="ICBM" content="60.4518, 22.2666" />
    <link id="canonical-link" rel="canonical" href="https://ratikkafaktat.fi/${lang.code}/" />
    ${buildAlternateLinks('')}
    <meta property="og:url" content="https://ratikkafaktat.fi/${lang.code}/" />
  `;

  const gridHtml = data.map((fact, i) => {
    const localized = getLocalizedFact(fact, lang.code);
    const delay = i * 0.03;
    return `
      <li style="opacity: 0; transform: translateY(20px); animation: backdropIn 0.5s ease forwards ${delay}s;">
        <a class="fact-card-wrapper" href="/${lang.code}/fakta/${fact.number}">
          <div class="fact-card" role="article">
            <div class="fact-date">${lang.factPrefix} #${fact.number}</div>
            <h3 class="fact-title">${escapeHtml(localized.title)}</h3>
            <p class="fact-excerpt">${escapeHtml(localized.content)}</p>
            <div class="fact-number" aria-hidden="true">${fact.number}</div>
          </div>
        </a>
      </li>
    `;
  }).join('');

  const cleanBaseHtml = cleanSeoTags(baseHtml)
    .replace('<html lang="fi">', `<html lang="${lang.code}">`)
    .replace(`id="lang-${lang.code}" href="/${lang.code}/"`, `id="lang-${lang.code}" href="/${lang.code}/" class="active" aria-current="true"`);

  const langIndexHtml = cleanBaseHtml
    .replace('<!-- VITE_INJECT_SEO -->', indexSeoTags)
    .replace('<h1 id="site-name">Sata <span style="white-space: nowrap;">ratikka<span class="logo-highlight">faktaa</span></span></h1>', `<h1 id="site-name">${lang.siteHeadingHtml}</h1>`)
    .replace(/<p id="footer-text">[\s\S]*?<\/p>/, `<p id="footer-text">${lang.footerHtml}</p>`)
    .replace('<!-- VITE_INJECT_INTRO -->', lang.introHtml)
    .replace('<!-- VITE_INJECT_LIST -->', gridHtml);
  fs.writeFileSync(path.join(dirPath, 'index.html'), langIndexHtml);
});

data.forEach(fact => {
  languages.forEach(lang => {
    const localized = getLocalizedFact(fact, lang.code);
    const detailContent = lang.code === 'fi' ? (fact.longContent || localized.content) : localized.content;
    const detailContentHtml = renderParagraphsHtml(detailContent);
    const dirPath = path.join(distDir, lang.code, 'fakta', String(fact.number));
    fs.mkdirSync(dirPath, { recursive: true });

    const seoTitle = `${lang.factPrefix} ${fact.number}: ${localized.title}`;
    const seoDesc = localized.content.replace(/"/g, '&quot;');
    const factAlternateLinks = languages
      .map(l => `<link rel="alternate" hreflang="${l.code}" href="https://ratikkafaktat.fi/${l.code}/fakta/${fact.number}" />`)
      .join('\n    ');

    const seoTags = `
    <title>${seoTitle}</title>
    <meta name="description" content="${seoDesc}" />
    <meta name="keywords" content="Raitiovaunu, Ratikka, Faktoja, Turku, Joukkoliikenne, ${escapeHtml(localized.title).replace(/,/g, '')}" />
    <meta property="og:title" content="${seoTitle}" />
    <meta property="og:description" content="${seoDesc}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="${lang.locale}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${seoTitle}" />
    <meta name="twitter:description" content="${seoDesc}" />
    <meta name="geo.region" content="FI" />
    <meta name="geo.placename" content="Turku" />
    <meta name="geo.position" content="60.4518;22.2666" />
    <meta name="ICBM" content="60.4518, 22.2666" />
    <link id="canonical-link" rel="canonical" href="https://ratikkafaktat.fi/${lang.code}/fakta/${fact.number}" />
    ${factAlternateLinks}
    <meta property="og:url" content="https://ratikkafaktat.fi/${lang.code}/fakta/${fact.number}" />
    <script id="schema-base" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": "https://ratikkafaktat.fi/${lang.code}/fakta/${fact.number}/#article",
          "headline": "${seoTitle}",
          "articleBody": "${seoDesc}",
          "url": "https://ratikkafaktat.fi/${lang.code}/fakta/${fact.number}",
          "publisher": {
            "@id": "https://ratikkafaktat.fi/#organization"
          }
        }
      ]
    }
    </script>
  `;

    const resourcesHtml = fact.resources?.map(r => `
    <li>
      <a href="${escapeHtml(r.url)}" class="resource-link" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(r.title)} (avautuu uuteen ikkunaan)">
        ${escapeHtml(r.title)}
      </a>
    </li>
  `).join('') || '<li>Ei lisätietolinkkejä.</li>';

    const gridHtml = data.map((f, i) => {
      const loc = getLocalizedFact(f, lang.code);
      const delay = i * 0.03;
      return `
        <li style="opacity: 0; transform: translateY(20px); animation: backdropIn 0.5s ease forwards ${delay}s;">
          <a class="fact-card-wrapper" href="/${lang.code}/fakta/${f.number}">
            <div class="fact-card" role="article">
              <div class="fact-date">${lang.factPrefix} #${f.number}</div>
              <h3 class="fact-title">${escapeHtml(loc.title)}</h3>
              <p class="fact-excerpt">${escapeHtml(loc.content)}</p>
              <div class="fact-number" aria-hidden="true">${f.number}</div>
            </div>
          </a>
        </li>
      `;
    }).join('');

    const cleanBaseHtml = cleanSeoTags(baseHtml).replace('<html lang="fi">', `<html lang="${lang.code}">`);

    const pageHtml = cleanBaseHtml
      .replace('<!-- VITE_INJECT_SEO -->', seoTags)
      .replace('<div id="view-list" class="view-section active">', '<div id="view-list" class="view-section">')
      .replace('<div id="view-detail" class="view-section detail-view">', '<div id="view-detail" class="view-section detail-view active">')
      .replace('href="/" id="back-btn"', `href="/${lang.code}/" id="back-btn"`)
      .replace('Takaisin etusivulle', lang.backText)
      .replace(`id="lang-${lang.code}" href="/${lang.code}/"`, `id="lang-${lang.code}" href="/${lang.code}/fakta/${fact.number}" class="active" aria-current="true"`)
      .replace('id="lang-fi" href="/fi/"', `id="lang-fi" href="/fi/fakta/${fact.number}"`)
      .replace('id="lang-en" href="/en/"', `id="lang-en" href="/en/fakta/${fact.number}"`)
      .replace('id="lang-sv" href="/sv/"', `id="lang-sv" href="/sv/fakta/${fact.number}"`)
      .replace('<h1 id="site-name">Sata <span style="white-space: nowrap;">ratikka<span class="logo-highlight">faktaa</span></span></h1>', `<h1 id="site-name">${lang.siteHeadingHtml}</h1>`)
      .replace(/<p id="footer-text">[\s\S]*?<\/p>/, `<p id="footer-text">${lang.footerHtml}</p>`)
      .replace('<h1 id="detail-title"></h1>', `<h1 id="detail-title">${escapeHtml(localized.title)}</h1>`)
      .replace('<!-- VITE_INJECT_DETAIL_NUMBER -->', `#${fact.number}`)
      .replace('<!-- VITE_INJECT_DETAIL_CONTENT -->', detailContentHtml)
      .replace('<!-- VITE_INJECT_DETAIL_LINKS -->', resourcesHtml)
      .replace('<!-- VITE_INJECT_LIST -->', gridHtml);

    fs.writeFileSync(path.join(dirPath, 'index.html'), pageHtml);
  });
});

console.log(`Successfully generated ${data.length * languages.length} static SEO HTML pages!`);

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function getLocalizedFact(fact, languageCode) {
  const fi = fact?.translations?.fi || {};
  const localized = fact?.translations?.[languageCode] || {};
  return {
    title: localized.title || fi.title || '',
    content: localized.content || fi.content || ''
  };
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

// Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /data.json
Sitemap: https://ratikkafaktat.fi/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
console.log('Generated robots.txt');

// Generate sitemap.xml
const today = new Date().toISOString().split('T')[0];
let sitemapUrls = `  <url>
    <loc>https://ratikkafaktat.fi/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

languages.forEach(lang => {
  sitemapUrls += `
  <url>
    <loc>https://ratikkafaktat.fi/${lang.code}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
});

data.forEach(fact => {
  languages.forEach(lang => {
    sitemapUrls += `
  <url>
    <loc>https://ratikkafaktat.fi/${lang.code}/fakta/${fact.number}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
console.log('Generated sitemap.xml');

// Generate FAQ JSON-LD and inject into index.html
const faqItems = data.map(fact => ({
  "@type": "Question",
  "name": `Fakta ${fact.number}: ${fact?.translations?.fi?.title || ''}`,
  "acceptedAnswer": {
    "@type": "Answer",
    "text": fact?.translations?.fi?.content || ''
  }
}));

const faqSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems
}, null, 2);

const indexPath = path.join(distDir, 'fi', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');
const faqScriptTag = `<script type="application/ld+json">${faqSchema}</script>`;
indexHtml = indexHtml.replace('</head>', `${faqScriptTag}\n  </head>`);
fs.writeFileSync(indexPath, indexHtml);
console.log('Injected FAQ schema into fi/index.html');
