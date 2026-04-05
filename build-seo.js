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

// Also copy data.json to dist so client JS can fetch it on navigation
fs.copyFileSync(dataFile, path.join(distDir, 'data.json'));

data.forEach(fact => {
  const dirPath = path.join(distDir, 'fakta', String(fact.number));
  fs.mkdirSync(dirPath, { recursive: true });

  let seoTitle = `Fakta ${fact.number}: ${fact.title}`;
  let seoDesc = fact.content.replace(/"/g, '&quot;');
  
  let seoTags = `
    <title>${seoTitle}</title>
    <meta name="description" content="${seoDesc}" />
    <meta name="keywords" content="Raitiovaunu, Ratikka, Faktoja, Turku, Joukkoliikenne, ${escapeHtml(fact.title).replace(/,/g, '')}" />
    <meta property="og:title" content="${seoTitle}" />
    <meta property="og:description" content="${seoDesc}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="fi_FI" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${seoTitle}" />
    <meta name="twitter:description" content="${seoDesc}" />
    <meta name="geo.region" content="FI" />
    <meta name="geo.placename" content="Turku" />
    <meta name="geo.position" content="60.4518;22.2666" />
    <meta name="ICBM" content="60.4518, 22.2666" />
    <link id="canonical-link" rel="canonical" href="https://ratikkafaktat.fi/fakta/${fact.number}" />
    <link rel="alternate" hreflang="fi" href="https://ratikkafaktat.fi/fakta/${fact.number}" />
    <meta property="og:url" content="https://ratikkafaktat.fi/fakta/${fact.number}" />
    <script id="schema-base" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": "https://ratikkafaktat.fi/fakta/${fact.number}/#article",
          "headline": "${seoTitle}",
          "articleBody": "${seoDesc}",
          "url": "https://ratikkafaktat.fi/fakta/${fact.number}",
          "publisher": {
            "@id": "https://ratikkafaktat.fi/#organization"
          }
        }
      ]
    }
    </script>
  `;

  // Pre-render list just in case (though it hides it)
  // Pre-render detail
  let resourcesHtml = fact.resources?.map(r => `
    <li>
      <a href="${escapeHtml(r.url)}" class="resource-link" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(r.title)} (avautuu uuteen ikkunaan)">
        ${escapeHtml(r.title)}
      </a>
    </li>
  `).join('') || '<li>Ei lisätietolinkkejä.</li>';
  
  let cleanBaseHtml = baseHtml
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

  let pageHtml = cleanBaseHtml
    .replace('<!-- VITE_INJECT_SEO -->', seoTags)
    .replace('<div id="view-list" class="view-section active">', '<div id="view-list" class="view-section">')
    .replace('<div id="view-detail" class="view-section detail-view">', '<div id="view-detail" class="view-section detail-view active">')
    .replace('<h1 id="detail-title"></h1>', `<h1 id="detail-title">${escapeHtml(fact.title)}</h1>`)
    .replace('<!-- VITE_INJECT_DETAIL_NUMBER -->', `#${fact.number}`)
    .replace('<!-- VITE_INJECT_DETAIL_CONTENT -->', escapeHtml(fact.content))
    .replace('<!-- VITE_INJECT_DETAIL_LINKS -->', resourcesHtml);

  // Fix asset paths because we are 2 levels deep (/fakta/1)
  // Change href="/assets/..." to href="/assets/..." Since we use absolute paths in Vite (with base='/') it should be fine.
  // Wait, if it's hosted in a subdirectory (like github pages without custom domain), base might need to be resolved.
  // Assuming it's root domain:

  fs.writeFileSync(path.join(dirPath, 'index.html'), pageHtml);
});

console.log(`Successfully generated ${data.length} static SEO HTML pages!`);

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
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
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;

data.forEach(fact => {
  sitemapUrls += `
  <url>
    <loc>https://ratikkafaktat.fi/fakta/${fact.number}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
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
  "name": `Fakta ${fact.number}: ${fact.title}`,
  "acceptedAnswer": {
    "@type": "Answer",
    "text": fact.content
  }
}));

const faqSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems
}, null, 2);

const indexPath = path.join(distDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');
const faqScriptTag = `<script type="application/ld+json">${faqSchema}</script>`;
indexHtml = indexHtml.replace('</head>', `${faqScriptTag}\n  </head>`);
fs.writeFileSync(indexPath, indexHtml);
console.log('Injected FAQ schema into index.html');
