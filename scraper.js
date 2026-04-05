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
          const content = stripEmojis(existingFact?.content || shortTitle);
          
          let longContent = existingFact?.longContent || null;
          // Merge text from faktatekstit.txt if found as long description
          if (textFactMap[number]) {
            longContent = textFactMap[number];
          } else if (longContent) {
            longContent = stripEmojis(longContent);
          }
          
          const factLinks = items
            .filter(i => i.parent && i.parent.id === group.id)
            .map(i => ({ title: i.title.trim(), url: i.url }));
            
          const scrapedFact = {
            id: group.id,
            number: number,
            title: shortTitle,
            content: content,
            longContent: longContent,
            link: `https://linktr.ee/sataratikkafaktaa`,
            resources: factLinks
          };

          // Keep any manual/custom fields already present in data.json
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
            content: stripEmojis(existingFact.content || ''),
            longContent: existingFact.longContent ? stripEmojis(existingFact.longContent) : existingFact.longContent
          });
        });

        // Add a few fallback facts if none found
        if (facts.length === 0) {
            console.log('No facts parsed! Returning mock error or empty array.');
        }

        facts.sort((a, b) => b.number - a.number); // newest first usually makes sense
        
        fs.writeFileSync('./data.json', JSON.stringify(facts, null, 2));
        console.log(`Saved ${facts.length} facts to data.json`);
        resolve();
      });
    }).on('error', reject);
  });
}

fetchLinktreeData().catch(console.error);
