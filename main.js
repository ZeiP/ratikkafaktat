let factsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const factsGrid = document.getElementById('facts-grid');
  const viewList = document.getElementById('view-list');
  const viewDetail = document.getElementById('view-detail');
  
  const detailNumber = document.getElementById('detail-number');
  const detailContent = document.getElementById('detail-content');
  const resourcesList = document.getElementById('resources-list');
  const backBtn = document.getElementById('back-btn');

  // Handle client side navigation back to root
  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({}, '', '/');
    renderRoute();
  });

  try {
    const response = await fetch('/data.json');
    factsData = await response.json();
    
    // Sort logic (newest facts first was handled in scraper, just to be safe here)
    factsData.sort((a, b) => b.number - a.number);
    
    // Only render grid dynamically if it's not pre-rendered by SSG
    if (factsGrid.children.length === 0 || factsGrid.innerHTML.includes('VITE_INJECT_LIST')) {
      factsGrid.innerHTML = '';
      
      let delay = 0;
      factsData.forEach((fact) => {
        const li = document.createElement('li');
        li.style.opacity = '0';
        li.style.transform = 'translateY(20px)';
        li.style.animation = `backdropIn 0.5s ease forwards ${delay}s`;
        delay += 0.03;

        const a = document.createElement('a');
        a.className = 'fact-card-wrapper';
        a.href = `/fakta/${fact.number}`;
        
        a.addEventListener('click', (e) => {
          // Allow normal link behavior if not matching our SPA setup, but prevent for SPA
          e.preventDefault();
          history.pushState({}, '', `/fakta/${fact.number}`);
          renderRoute();
          window.scrollTo(0, 0);
        });

        const card = document.createElement('div');
        card.className = 'fact-card';
        card.setAttribute('role', 'article');
        
        const dateEl = document.createElement('div');
        dateEl.className = 'fact-date';
        dateEl.textContent = 'Fakta #' + fact.number;
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'fact-title';
        titleEl.textContent = fact.title;
        
        const contentEl = document.createElement('p');
        contentEl.className = 'fact-excerpt';
        contentEl.textContent = fact.content;

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
    }

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
    const path = window.location.pathname;
    const match = path.match(/^\/fakta\/(\d+)\/?$/);
    
    if (match) {
      const num = parseInt(match[1], 10);
      const fact = factsData.find(f => f.number === num);
      if (fact) {
        showDetail(fact);
      } else {
        showList(); // not found
      }
    } else {
      showList();
    }
  }

  function showList() {
    viewList.style.display = 'block';
    viewDetail.classList.remove('active');
    document.title = '100 ratikkafaktaa';
    updateMeta('description', 'Turun ratikasta liikkuu vaihtoehtoisia totuuksia – me jaamme faktoja. Vapaaehtoisvoimin. Ei kaupungin, raitiotieallianssin tai grynderien ylläpitämä.');
    updateMeta('og:title', '100 ratikkafaktaa', true);
    updateMeta('twitter:title', '100 ratikkafaktaa');
    updateMeta('twitter:description', 'Turun ratikasta liikkuu vaihtoehtoisia totuuksia – me jaamme faktoja. Vapaaehtoisvoimin. Ei kaupungin, raitiotieallianssin tai grynderien ylläpitämä.');
    updateLink('canonical-link', 'https://ratikkafaktat.fi/');
  }

  function showDetail(fact) {
    viewList.style.display = 'none';
    viewDetail.classList.add('active');
    
    let fullTitle = `Fakta ${fact.number}: ${fact.title}`;
    document.title = fullTitle;
    updateMeta('description', fact.content);
    updateMeta('og:title', fullTitle, true);
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', fact.content);
    updateLink('canonical-link', `https://ratikkafaktat.fi/fakta/${fact.number}`);

    // Only update DOM if not already pre-rendered accurately
    if (!detailContent.innerHTML.includes(fact.content)) {
      detailNumber.textContent = `#${fact.number}`;
      document.getElementById('detail-title').textContent = fact.title;
      detailContent.textContent = fact.content;
      
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
