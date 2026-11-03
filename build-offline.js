// Jana satu fail HTML (offline, tanpa pelayan): node build-offline.js
const fs = require('fs');
const r = f => fs.readFileSync(__dirname + '/public/' + f, 'utf8');
let html = r('index.html');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${r('style.css')}\n</style>`);
html = html.replace('<script src="shared.js"></script>', () => `<script>\n${r('shared.js')}\n</script>`);
html = html.replace('<script src="game.js"></script>', () => `<script>\n${r('game.js')}\n</script>`);
// Mod online tidak perlu dalam versi offline
html = html.replace(/\s*<div class="card">\s*<h2>Online<\/h2>[\s\S]*?<p class="err" id="menuErr"><\/p>\s*<\/div>/,
  '\n      <p class="err" id="menuErr"></p>');
fs.writeFileSync(__dirname + '/tarik-tali-matematik.html', html);
console.log('Siap: tarik-tali-matematik.html (' + html.length + ' bait)');
