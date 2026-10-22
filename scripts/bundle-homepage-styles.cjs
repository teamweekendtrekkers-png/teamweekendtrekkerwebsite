'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Bundle at deployment so the source styles remain editable in their original files.
function bundleHomepageStyles(root) {
 const file = path.join(root, 'index.html');
 let html = fs.readFileSync(file, 'utf8');
 const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(css\/[^"]+)"[^>]*>/g)];
 if (!links.length) return null;
 if (links.length === 1 && /^css\/homepage-bundle-[a-f0-9]{12}\.css$/.test(links[0][1])) return links[0][1];
 const contents = links.map(match => {
  const relative = match[1].split('?')[0];
  if (!/^css\/[A-Za-z0-9_-]+\.css$/.test(relative)) throw new Error('Invalid stylesheet path');
  const css = fs.readFileSync(path.join(root, relative), 'utf8');
  if (/@import\b/i.test(css)) throw new Error('Resolve CSS imports before bundling: ' + relative);
  return '/* ' + relative + ' */\n' + css.replace(/^\uFEFF/, '').replace(/@charset\s+"[^"]+"\s*;/gi, '');
 }).join('\n');
 const digest = crypto.createHash('sha256').update(contents).digest('hex').slice(0, 12);
 const output = 'css/homepage-bundle-' + digest + '.css';
 fs.writeFileSync(path.join(root, output), contents);
 html = html.replace(links[0][0], '<link rel="stylesheet" href="' + output + '">');
 for (const match of links.slice(1)) html = html.replace(match[0], '');
 fs.writeFileSync(file, html);
 return output;
}
module.exports = { bundleHomepageStyles };
