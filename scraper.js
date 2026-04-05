import fs from 'fs';
import https from 'https';

function stripEmojis(text = '') {
  return text
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '')
    .replace(/[\uFE0E\uFE0F\u200D]/gu, '')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseLongDescriptionsFromFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;

  const sourceText = fs.readFileSync(filePath, 'utf-8');
  const factBlockRegex = /Fakta\s+(\d+)\/100\s*\n([\s\S]*?)(?=\n\s*Fakta\s+\d+\/100|\s*$)/gi;

  for (const match of sourceText.matchAll(factBlockRegex)) {
    const number = Number.parseInt(match[1], 10);
    const rawText = (match[2] || '').trim();
    if (!Number.isNaN(number) && rawText) {
      map[number] = stripEmojis(rawText);
    }
  }

  return map;
}

function parseLocalizedFactsFromFile(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;

  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  let current = null;

  function commitCurrent() {
    if (!current || Number.isNaN(current.number)) return;
    const content = stripEmojis(current.descriptionLines.join(' ').replace(/\s+/g, ' ').trim());
    map[current.number] = {
      title: stripEmojis(current.title),
      content
    };
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (headingMatch) {
      commitCurrent();
      current = {
        number: Number.parseInt(headingMatch[1], 10),
        title: headingMatch[2].trim(),
        descriptionLines: []
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line) {
      current.descriptionLines.push(line);
    }
  }

  commitCurrent();
  return map;
}

function normalizeResources(resources) {
  if (!Array.isArray(resources)) return [];
  return resources
    .filter(r => r && typeof r === 'object')
    .map(r => ({
      title: String(r.title || '').trim(),
      url: String(r.url || '').trim()
    }))
    .filter(r => r.title && r.url);
}

function normalizeFactForOutput(fact) {
  return {
    id: fact.id,
    number: Number.parseInt(fact.number, 10),
    longContent: fact.longContent || null,
    link: fact.link || 'https://linktr.ee/sataratikkafaktaa',
    resources: normalizeResources(fact.resources),
    translations: {
      fi: {
        title: stripEmojis(fact?.translations?.fi?.title || ''),
        content: stripEmojis(fact?.translations?.fi?.content || '')
      },
      en: {
        title: stripEmojis(fact?.translations?.en?.title || ''),
        content: stripEmojis(fact?.translations?.en?.content || '')
      },
      sv: {
        title: stripEmojis(fact?.translations?.sv?.title || ''),
        content: stripEmojis(fact?.translations?.sv?.content || '')
      }
    }
  };
}

async function fetchLinktreeData() {
  console.log('Fetching Linktree data...');
  return new Promise((resolve, reject) => {
    https.get('https://linktr.ee/sataratikkafaktaa', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const match = body.match(/id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (!match) {
          return reject(new Error('NEXT_DATA not found in response'));
        }
        
        let data;
        try {
          data = JSON.parse(match[1]);
        } catch (parseErr) {
          return reject(new Error('Failed to parse NEXT_DATA JSON: ' + parseErr.message));
        }
        
        if (!data?.props?.pageProps?.account?.links) {
          return reject(new Error('Unexpected Linktree data structure: props.pageProps.account.links not found'));
        }
        const links = data.props.pageProps.account.links;
        
        // Find facts (folders/groups)
        const groups = links.filter(l => l.type === 'GROUP');
        const items = links.filter(l => l.type === 'CLASSIC');
        
        // Parse long descriptions from faktatekstit.txt
        const textFactMap = parseLongDescriptionsFromFile('./faktatekstit.txt');
        const enFactMap = parseLocalizedFactsFromFile('./faktat-en.txt');
        const svFactMap = parseLocalizedFactsFromFile('./faktat-sv.txt');
        
        const existingFacts = [];
        const existingFactsByNumber = {};
        if (fs.existsSync('./data.json')) {
          try {
            const parsed = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
            if (Array.isArray(parsed)) {
              parsed.forEach(f => {
                if (f && typeof f === 'object') {
                  existingFacts.push(f);
                }
              });
            }
            existingFacts.forEach(f => {
              const number = Number.parseInt(f.number, 10);
              if (!Number.isNaN(number)) {
                existingFactsByNumber[number] = f;
              }
            });
          } catch {
            // ignore invalid existing data.json
          }
        }

        const facts = groups.map(group => {
          // Typically text looks like "Fakta 040: Usean vuoden investointi"
          const titleParts = group.title.split(':');
          let numMatch = group.title.match(/(\d+)/);
          let number = numMatch ? parseInt(numMatch[1], 10) : group.id;
          
          let shortTitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : group.title;
          const existingFact = existingFactsByNumber[number];
          const content = stripEmojis(existingFact?.translations?.fi?.content || existingFact?.content || shortTitle);
          
          let longContent = existingFact?.longContent || null;
          // Merge text from faktatekstit.txt if found as long description
          if (textFactMap[number]) {
            longContent = textFactMap[number];
          } else if (longContent) {
            longContent = stripEmojis(longContent);
          }

          const existingTranslations = existingFact?.translations || {};
          const fiTranslation = existingTranslations.fi || {};
          const enTranslation = existingTranslations.en || {};
          const svTranslation = existingTranslations.sv || {};

          const translations = {
            fi: {
              title: stripEmojis(fiTranslation.title || shortTitle),
              content: stripEmojis(fiTranslation.content || content)
            },
            en: {
              title: enFactMap[number]?.title || enTranslation.title || shortTitle,
              content: enFactMap[number]?.content || stripEmojis(enTranslation.content || content)
            },
            sv: {
              title: svFactMap[number]?.title || svTranslation.title || shortTitle,
              content: svFactMap[number]?.content || stripEmojis(svTranslation.content || content)
            }
          };
          
          const factLinks = items
            .filter(i => i.parent && i.parent.id === group.id)
            .map(i => ({ title: i.title.trim(), url: i.url }));
            
          const scrapedFact = {
            id: group.id,
            number: number,
            longContent: longContent,
            translations,
            link: `https://linktr.ee/sataratikkafaktaa`,
            resources: factLinks
          };

          return {
            ...(existingFact || {}),
            ...scrapedFact,
            // If Linktree has no resources for this group, keep existing resources
            resources: factLinks.length > 0 ? factLinks : (existingFact?.resources || [])
          };
        });

        // Keep facts that exist in data.json even if Linktree temporarily misses them
        const scrapedNumbers = new Set(facts.map(f => f.number));
        existingFacts.forEach(existingFact => {
          const number = Number.parseInt(existingFact.number, 10);
          if (Number.isNaN(number) || scrapedNumbers.has(number)) {
            return;
          }
          facts.push({
            ...existingFact,
            number,
            longContent: existingFact.longContent ? stripEmojis(existingFact.longContent) : existingFact.longContent,
            translations: {
              fi: {
                title: stripEmojis(existingFact?.translations?.fi?.title || existingFact.title || ''),
                content: stripEmojis(existingFact?.translations?.fi?.content || existingFact.content || '')
              },
              en: {
                title: enFactMap[number]?.title || existingFact?.translations?.en?.title || existingFact.title || '',
                content: enFactMap[number]?.content || stripEmojis(existingFact?.translations?.en?.content || existingFact.content || '')
              },
              sv: {
                title: svFactMap[number]?.title || existingFact?.translations?.sv?.title || existingFact.title || '',
                content: svFactMap[number]?.content || stripEmojis(existingFact?.translations?.sv?.content || existingFact.content || '')
              }
            }
          });
        });

        // Add a few fallback facts if none found
        if (facts.length === 0) {
            console.log('No facts parsed! Returning mock error or empty array.');
        }

        facts.sort((a, b) => b.number - a.number); // newest first usually makes sense

        const normalizedFacts = facts
          .map(normalizeFactForOutput)
          .filter(f => Number.isInteger(f.number) && f.number >= 0)
          .sort((a, b) => b.number - a.number);

        fs.writeFileSync('./data.json', JSON.stringify(normalizedFacts, null, 2));
        console.log(`Saved ${normalizedFacts.length} facts to data.json`);
        resolve();
      });
    }).on('error', reject);
  });
}

fetchLinktreeData().catch(console.error);
