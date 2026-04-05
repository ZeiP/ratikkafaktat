import fs from 'fs';
import https from 'https';

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
        
        // Parse faktatekstit.txt if exists
        let textFactMap = {};
        if (fs.existsSync('./faktatekstit.txt')) {
          const fileContent = fs.readFileSync('./faktatekstit.txt', 'utf-8');
          const blocks = fileContent.split(/\n\s*\n/);
          blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 2) {
              const numMatch = lines[0].match(/^(\d+)\./);
              if (numMatch) {
                 const num = parseInt(numMatch[1], 10);
                 const text = lines.slice(1).join(' ').trim();
                 textFactMap[num] = text;
              }
            }
          });
        }
        
        const facts = groups.map(group => {
          // Typically text looks like "Fakta 040: Usean vuoden investointi"
          const titleParts = group.title.split(':');
          let numMatch = group.title.match(/(\d+)/);
          let number = numMatch ? parseInt(numMatch[1], 10) : group.id;
          
          let shortTitle = titleParts.length > 1 ? titleParts.slice(1).join(':').trim() : group.title;
          let content = shortTitle;
          
          // Merge text from faktatekstit.txt if found
          if (textFactMap[number]) {
            content = textFactMap[number];
          }
          
          const factLinks = items
            .filter(i => i.parent && i.parent.id === group.id)
            .map(i => ({ title: i.title.trim(), url: i.url }));
            
          return {
            id: group.id,
            number: number,
            title: shortTitle,
            content: content,
            link: `https://linktr.ee/sataratikkafaktaa`,
            resources: factLinks
          };
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
